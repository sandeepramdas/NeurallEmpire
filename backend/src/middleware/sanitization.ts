import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Input Sanitization Middleware
 * Protects against XSS attacks by sanitizing user input
 */

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Escape HTML to prevent XSS
    return validator.escape(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Error in sanitization middleware:', error);
    next(error);
  }
};

/**
 * Validate and sanitize specific field types
 */
export const sanitizers = {
  /**
   * Sanitize email
   */
  email: (email: string): string => {
    return validator.normalizeEmail(email) || '';
  },

  /**
   * Sanitize URL
   */
  url: (url: string): string => {
    return validator.isURL(url) ? validator.trim(url) : '';
  },

  /**
   * Sanitize subdomain/slug
   */
  subdomain: (subdomain: string): string => {
    // Only allow alphanumeric and hyphens, lowercase
    return subdomain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Sanitize organization name
   */
  organizationName: (name: string): string => {
    // Allow letters, numbers, spaces, and common punctuation
    return validator.escape(name.trim());
  },

  /**
   * Sanitize phone number
   */
  phone: (phone: string): string => {
    // Remove all non-numeric characters except + at the start
    return phone.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
  },

  /**
   * Sanitize currency amount
   */
  currency: (amount: string): number => {
    // Remove currency symbols and convert to number
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Sanitize account code (alphanumeric only)
   */
  accountCode: (code: string): string => {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  /**
   * Sanitize boolean input
   */
  boolean: (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return !!value;
  },

  /**
   * Sanitize JSON input
   */
  json: (value: string): any => {
    try {
      const parsed = JSON.parse(value);
      return sanitizeObject(parsed);
    } catch {
      return null;
    }
  },
};

/**
 * Validation helpers
 */
export const validators = {
  /**
   * Validate email format
   */
  isEmail: (email: string): boolean => {
    return validator.isEmail(email);
  },

  /**
   * Validate URL format
   */
  isURL: (url: string): boolean => {
    return validator.isURL(url);
  },

  /**
   * Validate subdomain format
   */
  isValidSubdomain: (subdomain: string): boolean => {
    // 3-63 characters, alphanumeric and hyphens, no leading/trailing hyphens
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
    return subdomainRegex.test(subdomain);
  },

  /**
   * Validate UUID format
   */
  isUUID: (uuid: string): boolean => {
    return validator.isUUID(uuid);
  },

  /**
   * Validate date format
   */
  isDate: (date: string): boolean => {
    return validator.isISO8601(date);
  },

  /**
   * Validate phone number
   */
  isPhone: (phone: string): boolean => {
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
  },

  /**
   * Validate currency amount
   */
  isCurrency: (amount: string): boolean => {
    return validator.isCurrency(amount, {
      allow_negatives: true,
      digits_after_decimal: [2],
    });
  },

  /**
   * Check for SQL injection patterns
   */
  isSQLSafe: (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(--|\;|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
    ];
    return !sqlPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Check for XSS patterns
   */
  isXSSSafe: (input: string): boolean => {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/gi,
      /<iframe[^>]*>.*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    return !xssPatterns.some(pattern => pattern.test(input));
  },
};
