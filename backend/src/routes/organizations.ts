/**
 * Organization Management Routes
 * Multi-organization support: creation, switching, invites, membership
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '@/middleware/auth';
import organizationService from '@/services/organization.service';
import { z } from 'zod';

const router = Router();

// Rate limiting for organization operations
const orgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 org operations per hour
  message: {
    success: false,
    error: 'Too many organization operations. Please try again later.',
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/organizations
 * Get all organizations user is a member of
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await organizationService.getUserOrganizations(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch organizations',
    });
  }
});

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post('/', orgLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validation schema
    const schema = z.object({
      name: z.string().min(2, 'Organization name must be at least 2 characters'),
      slug: z.string().optional(),
      industry: z.string().optional(),
      size: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const result = await organizationService.createOrganization({
      ...validated,
      userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Create organization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create organization',
    });
  }
});

/**
 * POST /api/organizations/switch
 * Switch to a different organization
 */
router.post('/switch', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const schema = z.object({
      organizationId: z.string().cuid(),
    });

    const { organizationId } = schema.parse(req.body);

    const result = await organizationService.switchOrganization({
      userId,
      organizationId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Switch organization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to switch organization',
    });
  }
});

/**
 * POST /api/organizations/invite
 * Invite a user to the organization
 */
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const schema = z.object({
      email: z.string().email('Invalid email address'),
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
    });

    const { email, role } = schema.parse(req.body);

    const result = await organizationService.inviteUserToOrganization({
      organizationId,
      email,
      role,
      invitedByUserId: userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send invite',
    });
  }
});

/**
 * GET /api/organizations/invites
 * Get pending invites for current user
 */
router.get('/invites', async (req: Request, res: Response) => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await organizationService.getUserPendingInvites(userEmail);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Get invites error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invites',
    });
  }
});

/**
 * POST /api/organizations/invites/:token/accept
 * Accept an organization invite
 */
router.post('/invites/:token/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await organizationService.acceptOrganizationInvite(token, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept invite',
    });
  }
});

/**
 * POST /api/organizations/:id/leave
 * Leave an organization
 */
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id: organizationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await organizationService.leaveOrganization(userId, organizationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Leave organization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave organization',
    });
  }
});

export default router;