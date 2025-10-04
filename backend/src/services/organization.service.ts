/**
 * Organization Management Service
 * Handles multi-organization operations: creation, switching, invites, membership
 */

import { prisma } from '@/server';
import crypto from 'crypto';
import { config } from '@/config/env';
import jwt from 'jsonwebtoken';

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
    console.error('Create organization error:', error);
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
    console.error('Get user organizations error:', error);
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
      { expiresIn: config.JWT_EXPIRES_IN }
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
    console.error('Switch organization error:', error);
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

    // TODO: Send invite email
    console.log('📧 Send invite email to:', email);
    console.log('📧 Invite link:', `${config.FRONTEND_URL}/accept-invite/${inviteToken}`);

    return {
      success: true,
      invite,
    };
  } catch (error: any) {
    console.error('Invite user error:', error);
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
    console.error('Accept invite error:', error);
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
    console.error('Get pending invites error:', error);
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
    console.error('Leave organization error:', error);
    return {
      success: false,
      error: error.message || 'Failed to leave organization',
    };
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
};
