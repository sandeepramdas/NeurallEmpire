import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';

/**
 * CSRF Protection Middleware (Simplified)
 * Protects against Cross-Site Request Forgery attacks
 */

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production';

// Configure CSRF protection with correct field names
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => COOKIE_SECRET,
  cookieName: '__Host-neurallempire.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Use the correct field name from the package
  getCsrfTokenFromRequest: (req) => {
    // Check header first
    const headerToken = req.headers['x-csrf-token'] as string;
    if (headerToken) return headerToken;

    // Then check body
    if (req.body && req.body._csrf) {
      return req.body._csrf;
    }

    return '';
  },
});

/**
 * CSRF protection middleware
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Route to get CSRF token
 */
export const getCsrfToken = (req: Request, res: Response): void => {
  const token = generateToken(req, res);
  res.json({
    success: true,
    csrfToken: token,
  });
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
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf') || err.message?.includes('CSRF')) {
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
export const conditionalCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip CSRF for requests with valid Authorization header (API calls)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Apply CSRF protection for browser-based requests
  return doubleCsrfProtection(req, res, next);
};
