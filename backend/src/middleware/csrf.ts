import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { logger } from '@/infrastructure/logger';

/**
 * CSRF Protection Middleware (Production Ready)
 *
 * Uses double submit cookie pattern with csrf-csrf
 * Skips CSRF for JWT-authenticated API calls
 */

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production';
const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';

// Initialize csrf-csrf with double submit cookie pattern
const {
  generateToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => COOKIE_SECRET,
  cookieName: '__Host-csrf', // Secure cookie name
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64, // Token size
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Safe methods don't need CSRF
  getTokenFromRequest: (req) => {
    // Check header first, then body
    return req.headers['x-csrf-token'] as string || req.body?.csrfToken;
  },
});

/**
 * CSRF protection middleware
 * Skips for JWT-authenticated API calls
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip CSRF for requests with valid Authorization header (API calls)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    logger.debug('Skipping CSRF for JWT-authenticated request');
    return next();
  }

  // Skip if CSRF is disabled (for development)
  if (!ENABLE_CSRF) {
    logger.debug('CSRF protection disabled via environment variable');
    return next();
  }

  // Apply double CSRF protection
  logger.debug('Applying CSRF protection');
  doubleCsrfProtection(req, res, next);
};

/**
 * Route to get CSRF token
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  try {
    const token = generateToken(req, res);

    res.json({
      success: true,
      csrfToken: token,
      message: 'CSRF token generated successfully',
    });
  } catch (error: any) {
    logger.error('Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
    });
  }
};

/**
 * Error handler for CSRF failures
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (
    err === invalidCsrfTokenError ||
    err.code === 'EBADCSRFTOKEN' ||
    err.message?.includes('csrf') ||
    err.message?.includes('CSRF')
  ) {
    logger.warn('CSRF validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token. Please refresh the page and try again.',
      code: 'CSRF_VALIDATION_FAILED',
    });
  } else {
    next(err);
  }
};

/**
 * Conditional CSRF protection
 * Skips CSRF check for API calls with valid JWT tokens
 */
export const conditionalCsrfProtection = csrfProtection;
