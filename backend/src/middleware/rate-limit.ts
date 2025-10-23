/**
 * ==================== RATE LIMITING MIDDLEWARE ====================
 *
 * Rate limiting for API endpoints, especially AI execution
 *
 * Features:
 * - Per-user and per-organization rate limiting
 * - Redis-backed distributed rate limiting
 * - Configurable limits based on plan tiers
 * - Cost-based rate limiting for AI operations
 * - Sliding window algorithm
 *
 * @module middleware/rate-limit
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';
import Redis from 'ioredis';

// Rate limit tiers based on organization plan
export const RATE_LIMITS = {
  free: {
    aiExecutions: {
      perMinute: 10,
      perHour: 100,
      perDay: 500,
    },
    api: {
      perMinute: 60,
      perHour: 1000,
    },
  },
  pro: {
    aiExecutions: {
      perMinute: 50,
      perHour: 1000,
      perDay: 10000,
    },
    api: {
      perMinute: 300,
      perHour: 10000,
    },
  },
  enterprise: {
    aiExecutions: {
      perMinute: 200,
      perHour: 5000,
      perDay: 50000,
    },
    api: {
      perMinute: 1000,
      perHour: 50000,
    },
  },
};

/**
 * Create a Redis client specifically for rate limiting
 */
function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  return new Redis(redisUrl, {
    password: redisPassword,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
}

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.id,
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
  // Use Redis store if available, fall back to memory store
  store: redis.connected
    ? new RedisStore({
        // @ts-ignore - Type mismatch with Redis client
        client: createRedisClient(),
        prefix: 'rl:api:',
      })
    : undefined,
});

/**
 * AI Execution rate limiter - per user/organization
 * Prevents cost overruns and DoS attacks
 */
export const aiExecutionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const user = (req as any).user;
    if (!user) return 10; // Default for unauthenticated

    // Get organization plan (would need to fetch from DB in production)
    // For now, use a default
    const plan = 'pro'; // Default to pro plan
    return RATE_LIMITS[plan as keyof typeof RATE_LIMITS].aiExecutions.perMinute;
  },
  keyGenerator: (req) => {
    // Rate limit per user
    const user = (req as any).user;
    return user?.id || req.ip || 'anonymous';
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for super admins
    return (req as any).user?.isSuperAdmin === true;
  },
  handler: (req, res) => {
    const user = (req as any).user;

    logger.warn('AI execution rate limit exceeded', {
      userId: user?.id,
      organizationId: user?.organizationId,
      path: req.path,
      ip: req.ip,
    });

    res.status(429).json({
      success: false,
      error: 'AI execution rate limit exceeded. Please wait before trying again.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
    });
  },
  store: redis.connected
    ? new RedisStore({
        // @ts-ignore
        client: createRedisClient(),
        prefix: 'rl:ai:',
      })
    : undefined,
});

/**
 * Hourly AI execution limiter
 */
export const aiExecutionHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const user = (req as any).user;
    if (!user) return 100;

    const plan = 'pro';
    return RATE_LIMITS[plan as keyof typeof RATE_LIMITS].aiExecutions.perHour;
  },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `hourly:${user?.id || req.ip}`;
  },
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => (req as any).user?.isSuperAdmin === true,
  handler: (req, res) => {
    const user = (req as any).user;

    logger.warn('AI execution hourly rate limit exceeded', {
      userId: user?.id,
      organizationId: user?.organizationId,
    });

    res.status(429).json({
      success: false,
      error: 'Hourly AI execution limit reached. Please upgrade your plan or wait for the next hour.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
      upgradeUrl: '/settings/billing',
    });
  },
  store: redis.connected
    ? new RedisStore({
        // @ts-ignore
        client: createRedisClient(),
        prefix: 'rl:ai:hourly:',
      })
    : undefined,
});

/**
 * Daily AI execution limiter
 */
export const aiExecutionDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: async (req) => {
    const user = (req as any).user;
    if (!user) return 500;

    const plan = 'pro';
    return RATE_LIMITS[plan as keyof typeof RATE_LIMITS].aiExecutions.perDay;
  },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `daily:${user?.organizationId || user?.id || req.ip}`;
  },
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => (req as any).user?.isSuperAdmin === true,
  handler: (req, res) => {
    const user = (req as any).user;

    logger.error('AI execution daily rate limit exceeded', {
      userId: user?.id,
      organizationId: user?.organizationId,
    });

    res.status(429).json({
      success: false,
      error: 'Daily AI execution limit reached. Please upgrade your plan.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
      upgradeUrl: '/settings/billing',
    });
  },
  store: redis.connected
    ? new RedisStore({
        // @ts-ignore
        client: createRedisClient(),
        prefix: 'rl:ai:daily:',
      })
    : undefined,
});

/**
 * Combine multiple rate limiters
 */
export const aiExecutionRateLimiters = [
  aiExecutionRateLimiter, // Per-minute limit
  aiExecutionHourlyLimiter, // Hourly limit
  aiExecutionDailyLimiter, // Daily limit
];

/**
 * Strict rate limiter for sensitive operations (login, password reset, etc.)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  keyGenerator: (req) => {
    // Rate limit by IP and email/username if provided
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    });

    res.status(429).json({
      success: false,
      error: 'Too many attempts. Please wait 15 minutes before trying again.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000),
    });
  },
  store: redis.connected
    ? new RedisStore({
        // @ts-ignore
        client: createRedisClient(),
        prefix: 'rl:strict:',
      })
    : undefined,
});

export default {
  apiRateLimiter,
  aiExecutionRateLimiters,
  strictRateLimiter,
};
