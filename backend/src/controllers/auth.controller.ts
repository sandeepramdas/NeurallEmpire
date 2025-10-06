import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/server';
import { AuthenticatedRequest, RegisterData, LoginData, ApiResponse, AuthUser } from '@/types';
import { createSubdomainDNS } from '@/services/cloudflare.service';
import { config } from '@/config/env';

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;

// Strong password validation
const strongPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (!@#$%^&* etc.)');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: strongPasswordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationSlug: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Helper function to generate JWT
const generateToken = (userId: string, organizationId: string, role: string): string => {
  const payload = { userId, organizationId, role };
  const secret = JWT_SECRET as string;
  const options = { expiresIn: JWT_EXPIRES_IN } as SignOptions;
  return jwt.sign(payload, secret, options);
};

// Helper function to create organization slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const register = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const { email, password, firstName, lastName, organizationName, organizationSlug } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Generate organization slug if not provided
    let slug = organizationSlug;
    if (!slug && organizationName) {
      slug = createSlug(organizationName);
    } else if (!slug) {
      slug = createSlug(email.split('@')[0]!);
    }

    // Check if organization slug is available
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: 'Organization name/slug already taken',
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create organization and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization with trial period
      const organization = await tx.organization.create({
        data: {
          name: organizationName || `${firstName || email.split('@')[0]}'s Organization`,
          slug,
          status: 'ACTIVE',  // Organizations are active immediately
          planType: 'TRIAL',
          billingEmail: email,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
          maxUsers: 5,
          maxAgents: 10,
          maxWorkflows: 20,
          maxApiCalls: 10000,
        },
      });

      // Create user as owner with enhanced fields
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: req.body.phone || null,
          role: 'OWNER',
          status: 'ACTIVE',
          organizationId: organization.id,
          emailVerified: false,
          canCreateAgents: true,
          canManageWorkflows: true,
          canViewAnalytics: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
        },
      });

      // Create UserOrganization membership entry for multi-org support
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER',
          isOwner: true,
          status: 'ACTIVE',
        },
      });

      // Update organization's current users count
      await tx.organization.update({
        where: { id: organization.id },
        data: { currentUsers: 1 },
      });

      return { user, organization };
    });

    // Create Cloudflare subdomain DNS record (non-blocking)
    createSubdomainDNS(slug!)
      .then(async (cloudflareResult) => {
        if (cloudflareResult.success) {
          // Update subdomain record in database
          await prisma.subdomainRecord.create({
            data: {
              organizationId: result.organization.id,
              subdomain: slug!,
              fullDomain: `${slug}.neurallempire.com`,
              recordValue: 'www.neurallempire.com',
              externalRecordId: cloudflareResult.recordId || null,
              status: 'ACTIVE',
            },
          }).catch(err => console.error('Error creating subdomain record:', err));

          console.log(`✅ Subdomain created: ${slug}.neurallempire.com`);
        } else {
          console.error(`❌ Failed to create subdomain: ${cloudflareResult.error}`);
        }
      })
      .catch(err => console.error('Cloudflare DNS creation error:', err));

    // Generate JWT token
    const token = generateToken(result.user.id, result.user.organizationId, result.user.role);

    const response: ApiResponse<{
      user: AuthUser;
      organization: { id: string; name: string; slug: string };
      token: string;
    }> = {
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          organizationId: result.user.organizationId,
          firstName: result.user.firstName || undefined,
          lastName: result.user.lastName || undefined,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        token,
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const { email, password } = validationResult.data;

    // Find user with organization data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            trialEndsAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: `Account is ${user.status.toLowerCase()}`,
      });
    }

    // Check if organization exists
    if (!user.organization) {
      return res.status(403).json({
        success: false,
        error: 'No organization associated with this account',
      });
    }

    // Check organization status
    if (['SUSPENDED', 'BANNED', 'CANCELLED'].includes(user.organization.status)) {
      return res.status(403).json({
        success: false,
        error: `Organization access restricted: ${user.organization.status.toLowerCase()}`,
      });
    }

    // Check trial expiry
    if (user.organization.status === 'TRIAL' && user.organization.trialEndsAt) {
      if (new Date() > new Date(user.organization.trialEndsAt)) {
        await prisma.organization.update({
          where: { id: user.organization.id },
          data: { status: 'SUSPENDED', statusReason: 'Trial expired' }
        });
        return res.status(403).json({
          success: false,
          error: 'Trial period has expired. Please upgrade your plan.',
        });
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash || '');

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.organizationId, user.role);

    // Update last login and create session
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: req.ip || null,
          loginCount: { increment: 1 }
        },
      });

      // Create session record
      await tx.session.create({
        data: {
          userId: user.id,
          token,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      });

      // Log audit event
      await tx.auditLog.create({
        data: {
          action: 'LOGIN',
          resourceType: 'USER',
          resourceId: user.id,
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        }
      });
    });

    const response: ApiResponse<{
      user: AuthUser;
      organization: { id: string; name: string; slug: string };
      token: string;
    }> = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          avatar: user.avatar || undefined,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
        token,
      },
    };

    return res.json(response);
  } catch (error) {
    console.error('Login error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body?.email,
    });
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        organizationId: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

export const joinOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const joinSchema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organizationSlug: z.string().min(1, 'Organization slug is required'),
    });

    const validationResult = joinSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const { email, password, firstName, lastName, organizationSlug } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Find the organization
    const organization = await prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    if (organization.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Organization is not active',
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user as regular user (not owner)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'MEMBER',
        organizationId: organization.id,
        emailVerified: false,
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.organizationId, user.role);

    const response: ApiResponse<{
      user: AuthUser;
      organization: { id: string; name: string; slug: string };
      token: string;
    }> = {
      success: true,
      message: 'Successfully joined organization',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        token,
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Join organization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to join organization',
    });
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    // In a more advanced implementation, you might want to:
    // 1. Blacklist the token
    // 2. Remove session from database
    // 3. Clear cookies

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};