/**
 * Organization Management Service
 * Handles multi-organization operations: creation, switching, invites, membership
 */

import { prisma } from '@/server';
import crypto from 'crypto';
import { config } from '@/config/env';
import jwt from 'jsonwebtoken';
import { logger } from '@/infrastructure/logger';
import { EmailService } from '@/infrastructure/email/email.service';

interface CreateOrganizationDTO {
  name: string;
  slug?: string;
  userId: string;
  industry?: string;
  size?: string;
}

interface SwitchOrganizationDTO {
  userId: string;
  organizationId: string;
}

interface InviteUserDTO {
  organizationId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedByUserId: string;
}

/**
 * Create slug from organization name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Ensure slug is unique
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(data: CreateOrganizationDTO) {
  try {
    const { name, slug: providedSlug, userId, industry, size } = data;

    // Generate slug
    const baseSlug = providedSlug || createSlug(name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        industry,
        size,
        status: 'TRIAL',
        planType: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      },
    });

    // Add user as owner in UserOrganization
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId: organization.id,
        role: 'OWNER',
        isOwner: true,
        status: 'ACTIVE',
      },
    });

    // Update user's primary organization
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    // Update organization's current users count
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        currentUsers: 1,
      },
    });

    return {
      success: true,
      organization,
    };
  } catch (error: any) {
    logger.error('Create organization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create organization',
    };
  }
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(userId: string) {
  try {
    const memberships = await prisma.userOrganization.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            status: true,
            planType: true,
            currentUsers: true,
            maxUsers: true,
          },
        },
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    const organizations = memberships.map(m => ({
      ...m.organization,
      membership: {
        role: m.role,
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
        lastAccessedAt: m.lastAccessedAt,
      },
    }));

    return {
      success: true,
      organizations,
    };
  } catch (error: any) {
    logger.error('Get user organizations error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch organizations',
    };
  }
}

/**
 * Switch to a different organization
 */
export async function switchOrganization(data: SwitchOrganizationDTO) {
  try {
    const { userId, organizationId } = data;

    // Check if user is a member of this organization
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      return {
        success: false,
        error: 'You are not a member of this organization',
      };
    }

    if (membership.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Your membership in this organization is not active',
      };
    }

    // Update user's primary organization
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role: membership.role,
      },
    });

    // Update last accessed time
    await prisma.userOrganization.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: {
        lastAccessedAt: new Date(),
      },
    });

    // Generate new JWT token with updated organization context
    const token = jwt.sign(
      {
        userId: membership.user.id,
        organizationId,
        role: membership.role,
        email: membership.user.email,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    return {
      success: true,
      organization: membership.organization,
      token,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        role: membership.role,
      },
    };
  } catch (error: any) {
    logger.error('Switch organization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to switch organization',
    };
  }
}

/**
 * Invite user to organization
 */
export async function inviteUserToOrganization(data: InviteUserDTO) {
  try {
    const { organizationId, email, role, invitedByUserId } = data;

    // Check if inviter has permission
    const inviterMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: invitedByUserId,
          organizationId,
        },
      },
    });

    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      return {
        success: false,
        error: 'You do not have permission to invite users',
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Check if already a member
    if (existingUser) {
      const existingMembership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
          },
        },
      });

      if (existingMembership) {
        return {
          success: false,
          error: 'User is already a member of this organization',
        };
      }
    }

    // Check for pending invite
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organizationId,
        email,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      return {
        success: false,
        error: 'An invite for this email already exists',
      };
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite
    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        invitedByUserId,
        email,
        role,
        inviteToken,
        expiresAt,
        status: 'PENDING',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send invite email
    try {
      await EmailService.sendOrganizationInvite(
        email,
        invite.organization.name,
        inviteToken,
        organizationId
      );
      logger.info('📧 Invite email sent to:', email);
    } catch (emailError: any) {
      logger.error('📧 Failed to send invite email:', emailError);
      // Don't fail the invite if email fails - the invite is still created
    }

    return {
      success: true,
      invite,
    };
  } catch (error: any) {
    logger.error('Invite user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send invite',
    };
  }
}

/**
 * Accept organization invite
 */
export async function acceptOrganizationInvite(inviteToken: string, userId: string) {
  try {
    // Find invite
    const invite = await prisma.organizationInvite.findUnique({
      where: { inviteToken },
      include: {
        organization: true,
      },
    });

    if (!invite) {
      return {
        success: false,
        error: 'Invalid invite token',
      };
    }

    if (invite.status !== 'PENDING') {
      return {
        success: false,
        error: 'This invite has already been used or expired',
      };
    }

    if (new Date() > invite.expiresAt) {
      // Mark as expired
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });

      return {
        success: false,
        error: 'This invite has expired',
      };
    }

    // Check if user email matches
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invite.email) {
      return {
        success: false,
        error: 'This invite was sent to a different email address',
      };
    }

    // Check if already a member
    const existingMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId,
        },
      },
    });

    if (existingMembership) {
      // Mark invite as accepted anyway
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: userId,
        },
      });

      return {
        success: false,
        error: 'You are already a member of this organization',
      };
    }

    // Add user to organization
    await prisma.userOrganization.create({
      data: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
        isOwner: false,
        status: 'ACTIVE',
      },
    });

    // Update invite status
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      },
    });

    // Update organization user count
    await prisma.organization.update({
      where: { id: invite.organizationId },
      data: {
        currentUsers: { increment: 1 },
      },
    });

    return {
      success: true,
      organization: invite.organization,
    };
  } catch (error: any) {
    logger.error('Accept invite error:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept invite',
    };
  }
}

/**
 * Get pending invites for a user
 */
export async function getUserPendingInvites(email: string) {
  try {
    const invites = await prisma.organizationInvite.findMany({
      where: {
        email,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      invites,
    };
  } catch (error: any) {
    logger.error('Get pending invites error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch invites',
    };
  }
}

/**
 * Leave organization
 */
export async function leaveOrganization(userId: string, organizationId: string) {
  try {
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return {
        success: false,
        error: 'You are not a member of this organization',
      };
    }

    if (membership.isOwner) {
      // Check if there are other owners
      const otherOwners = await prisma.userOrganization.count({
        where: {
          organizationId,
          isOwner: true,
          userId: { not: userId },
        },
      });

      if (otherOwners === 0) {
        return {
          success: false,
          error: 'You cannot leave this organization as you are the only owner. Please transfer ownership first.',
        };
      }
    }

    // Remove membership
    await prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    // Update organization user count
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        currentUsers: { decrement: 1 },
      },
    });

    // If this was user's primary org, switch to another one
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (user?.organizationId === organizationId) {
      // Find another organization
      const otherMembership = await prisma.userOrganization.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
        },
      });

      if (otherMembership) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            organizationId: otherMembership.organizationId,
            role: otherMembership.role,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Successfully left organization',
    };
  } catch (error: any) {
    logger.error('Leave organization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to leave organization',
    };
  }
}

// ==================== HIERARCHY METHODS (V2) ====================

/**
 * Get all descendants of an organization (children, grandchildren, etc.)
 */
export async function getOrganizationDescendants(
  organizationId: string,
  maxDepth?: number
): Promise<any[]> {
  try {
    const results = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      level: number;
      depth_from_parent: number;
      type: string;
    }>>`
      SELECT
        o.id,
        o.name,
        o.slug,
        o.level,
        oc.depth as depth_from_parent,
        o.type
      FROM "OrganizationClosure" oc
      JOIN organizations o ON o.id = oc."descendantId"
      WHERE oc."ancestorId" = ${organizationId}
        AND oc."descendantId" != ${organizationId}
        ${maxDepth ? prisma.$queryRaw`AND oc.depth <= ${maxDepth}` : prisma.$queryRaw``}
        AND o."deletedAt" IS NULL
      ORDER BY oc.depth, o.name
    `;

    return results;
  } catch (error: any) {
    logger.error('Get descendants error:', error);
    throw new Error('Failed to get organization descendants');
  }
}

/**
 * Get all ancestors of an organization (parent, grandparent, etc.)
 */
export async function getOrganizationAncestors(
  organizationId: string
): Promise<any[]> {
  try {
    const results = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      level: number;
      depth_to_child: number;
      type: string;
    }>>`
      SELECT
        o.id,
        o.name,
        o.slug,
        o.level,
        oc.depth as depth_to_child,
        o.type
      FROM "OrganizationClosure" oc
      JOIN organizations o ON o.id = oc."ancestorId"
      WHERE oc."descendantId" = ${organizationId}
        AND oc."ancestorId" != ${organizationId}
        AND o."deletedAt" IS NULL
      ORDER BY oc.depth DESC
    `;

    return results;
  } catch (error: any) {
    logger.error('Get ancestors error:', error);
    throw new Error('Failed to get organization ancestors');
  }
}

/**
 * Get direct children of an organization
 */
export async function getOrganizationChildren(
  organizationId: string
): Promise<any[]> {
  try {
    const children = await prisma.organization.findMany({
      where: {
        parentId: organizationId,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        type: true,
        hierarchyPosition: true
      },
      orderBy: [
        { hierarchyPosition: 'asc' },
        { name: 'asc' }
      ]
    });

    return children;
  } catch (error: any) {
    logger.error('Get children error:', error);
    throw new Error('Failed to get organization children');
  }
}

/**
 * Set parent organization (create hierarchy relationship)
 */
export async function setOrganizationParent(
  organizationId: string,
  parentId: string | null,
  userId: string
): Promise<void> {
  try {
    // Prevent circular references
    if (parentId) {
      const descendants = await getOrganizationDescendants(organizationId);
      if (descendants.some(d => d.id === parentId)) {
        throw new Error('Cannot set parent: would create circular reference');
      }
    }

    // Calculate new level and path
    let newLevel = 0;
    let newPath = organizationId;
    let ancestorIds: string[] = [];

    if (parentId) {
      const parent = await prisma.organization.findUnique({
        where: { id: parentId },
        select: { level: true, path: true, ancestorIds: true }
      });

      if (!parent) {
        throw new Error('Parent organization not found');
      }

      newLevel = parent.level + 1;
      newPath = parent.path ? `${parent.path}.${organizationId}` : `${parentId}.${organizationId}`;
      ancestorIds = [...(parent.ancestorIds || []), parentId];
    }

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        parentId,
        level: newLevel,
        path: newPath,
        ancestorIds,
        updatedAt: new Date()
      }
    });

    // Refresh the closure table
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY "OrganizationClosure"`;

    // Update all descendants' levels and paths recursively
    await updateDescendantHierarchy(organizationId);

  } catch (error: any) {
    logger.error('Set parent error:', error);
    throw new Error(error.message || 'Failed to set organization parent');
  }
}

/**
 * Update hierarchy info for all descendants (recursive)
 */
async function updateDescendantHierarchy(organizationId: string): Promise<void> {
  const children = await prisma.organization.findMany({
    where: { parentId: organizationId }
  });

  for (const child of children) {
    const parent = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { level: true, path: true, ancestorIds: true }
    });

    if (parent) {
      await prisma.organization.update({
        where: { id: child.id },
        data: {
          level: parent.level + 1,
          path: parent.path ? `${parent.path}.${child.id}` : `${organizationId}.${child.id}`,
          ancestorIds: [...(parent.ancestorIds || []), organizationId]
        }
      });

      // Recursive update for grandchildren
      await updateDescendantHierarchy(child.id);
    }
  }
}

/**
 * Check if user has access to organization (including via hierarchy)
 */
export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string,
  inheritAccess: boolean = true
): Promise<boolean> {
  try {
    if (!inheritAccess) {
      // Direct access only
      const access = await prisma.userOrganization.findFirst({
        where: {
          userId,
          organizationId,
          status: 'ACTIVE'
        }
      });
      return !!access;
    } else {
      // Check access to org or any ancestor
      const result = await prisma.$queryRaw<Array<{ has_access: boolean }>>`
        SELECT EXISTS(
          SELECT 1
          FROM "user_organizations" uo
          JOIN "OrganizationClosure" oc
            ON oc."ancestorId" = uo."organizationId"
          WHERE uo."userId" = ${userId}
            AND oc."descendantId" = ${organizationId}
            AND uo.status = 'ACTIVE'
        ) as has_access
      `;

      return result[0]?.has_access || false;
    }
  } catch (error: any) {
    logger.error('Check access error:', error);
    return false;
  }
}

/**
 * Get organization hierarchy tree (for visualization)
 */
export async function getOrganizationHierarchyTree(
  rootOrganizationId: string
): Promise<any> {
  try {
    const root = await prisma.organization.findUnique({
      where: { id: rootOrganizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        type: true
      }
    });

    if (!root) {
      throw new Error('Root organization not found');
    }

    // Build tree recursively
    const buildTree = async (orgId: string): Promise<any> => {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          level: true,
          type: true
        }
      });

      const children = await prisma.organization.findMany({
        where: {
          parentId: orgId,
          deletedAt: null
        },
        orderBy: [
          { hierarchyPosition: 'asc' },
          { name: 'asc' }
        ]
      });

      return {
        ...org,
        children: await Promise.all(children.map(child => buildTree(child.id)))
      };
    };

    return buildTree(rootOrganizationId);
  } catch (error: any) {
    logger.error('Get hierarchy tree error:', error);
    throw new Error('Failed to get organization hierarchy tree');
  }
}

export default {
  createOrganization,
  getUserOrganizations,
  switchOrganization,
  inviteUserToOrganization,
  acceptOrganizationInvite,
  getUserPendingInvites,
  leaveOrganization,
  // V2: Hierarchy methods
  getOrganizationDescendants,
  getOrganizationAncestors,
  getOrganizationChildren,
  setOrganizationParent,
  userHasOrganizationAccess,
  getOrganizationHierarchyTree,
};
