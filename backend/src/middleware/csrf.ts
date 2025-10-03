import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production';

// Configure CSRF protection
const {
  generateToken, // Use this to create a CSRF token
  doubleCsrfProtection, // Use this middleware to protect routes
} = doubleCsrf({
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
  getTokenFromRequest: (req) => {
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
 * Middleware to add CSRF token to response
 * Use this on routes that render forms
 */
export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction): void => {
  const token = generateToken(req, res);
  res.locals.csrfToken = token;
  next();
};

/**
 * CSRF protection middleware
 * Apply this to all state-changing routes (POST, PUT, DELETE, PATCH)
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Route to get CSRF token
 * Frontend can call this to get a token before making requests
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
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
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
 * Optional: Exempt certain routes from CSRF protection
 */
export const csrfExempt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Mark request as exempt from CSRF
  (req as any).csrfExempt = true;
  next();
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
