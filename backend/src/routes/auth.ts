import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getProfile, logout, joinOrganization } from '@/controllers/auth.controller';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router();

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts per IP
  skipSuccessfulRequests: true, // only count failed attempts
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limit for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 registrations per IP per hour
  message: {
    success: false,
    error: 'Too many accounts created. Please try again later.',
  },
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and organization
 * @access  Public
 */
router.post('/register', registerLimiter, register);

/**
 * @route   POST /api/auth/join
 * @desc    Join an existing organization
 * @access  Public
 */
router.post('/join', authLimiter, joinOrganization);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   GET /api/auth/organizations
 * @desc    Get all organizations user belongs to
 * @access  Private
 */
router.get('/organizations', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { prisma } = await import('@/server');

    // Get user's primary organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.organization) {
      return res.status(404).json({
        success: false,
        error: 'No organization found for user',
      });
    }

    // For now, return the user's primary organization
    // In the future, this can be extended to support multi-org membership via UserOrganization table
    const organizations = [{
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
      planType: user.organization.planType,
      status: user.organization.status,
      role: user.role,
      memberCount: user.organization._count.members,
      createdAt: user.organization.createdAt,
    }];

    res.json({
      success: true,
      data: organizations,
    });
  } catch (error: any) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch organizations',
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

export default router;