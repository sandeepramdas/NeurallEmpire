import { Router } from 'express';
import { register, login, getProfile, logout, joinOrganization } from '@/controllers/auth.controller';
import { authenticate, optionalAuth } from '@/middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and organization
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/join
 * @desc    Join an existing organization
 * @access  Public
 */
router.post('/join', joinOrganization);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

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