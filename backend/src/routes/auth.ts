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
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

export default router;