/**
 * Rate Limiter Utility for Connectors
 *
 * Implements sliding window rate limiting using Redis
 * Used to prevent connector API abuse and respect third-party rate limits
 */

import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstSize?: number; // Allow burst of requests
}

export class ConnectorRateLimiter {
  private readonly connectorId: string;
  private readonly config: RateLimitConfig;

  constructor(connectorId: string, config: RateLimitConfig) {
    this.connectorId = connectorId;
    this.config = config;
  }

  /**
   * Check if request is allowed under rate limits
   * @throws Error if rate limit exceeded
   */
  async checkRateLimit(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // If Redis is not connected, log warning and allow request
    if (!redis.connected) {
      logger.warn('Rate limiting disabled: Redis not connected', {
        connectorId: this.connectorId,
      });
      return;
    }

    try {
      // Check minute limit
      if (this.config.requestsPerMinute) {
        await this.checkLimit(
          'minute',
          this.config.requestsPerMinute,
          60,
          this.config.burstSize
        );
      }

      // Check hour limit
      if (this.config.requestsPerHour) {
        await this.checkLimit('hour', this.config.requestsPerHour, 3600);
      }

      // Check day limit
      if (this.config.requestsPerDay) {
        await this.checkLimit('day', this.config.requestsPerDay, 86400);
      }
    } catch (error: any) {
      if (error.message.includes('Rate limit exceeded')) {
        throw error; // Re-throw rate limit errors
      }

      // Log other errors but don't block requests
      logger.error('Rate limit check error', {
        connectorId: this.connectorId,
        error: error.message,
      });
    }
  }

  /**
   * Record a successful request (increment counters)
   */
  async recordRequest(): Promise<void> {
    if (!this.config.enabled || !redis.connected) {
      return;
    }

    const timestamp = Date.now();
    const promises: Promise<any>[] = [];

    // Record for each time window
    if (this.config.requestsPerMinute) {
      promises.push(this.recordInWindow('minute', timestamp, 60));
    }

    if (this.config.requestsPerHour) {
      promises.push(this.recordInWindow('hour', timestamp, 3600));
    }

    if (this.config.requestsPerDay) {
      promises.push(this.recordInWindow('day', timestamp, 86400));
    }

    try {
      await Promise.all(promises);
    } catch (error: any) {
      logger.error('Error recording rate limit request', {
        connectorId: this.connectorId,
        error: error.message,
      });
    }
  }

  /**
   * Check rate limit for a specific time window
   */
  private async checkLimit(
    window: 'minute' | 'hour' | 'day',
    maxRequests: number,
    windowSeconds: number,
    burstSize?: number
  ): Promise<void> {
    const key = this.getKey(window);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use sorted set to track requests in time window
    const client = redis.client!;

    // Remove old requests outside the window
    await client.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await client.zcard(key);

    // Check burst size first (if configured)
    if (burstSize && count >= burstSize) {
      throw new Error(
        `Rate limit exceeded: Burst limit of ${burstSize} requests per ${window}`
      );
    }

    // Check normal rate limit
    if (count >= maxRequests) {
      logger.warn('Connector rate limit exceeded', {
        connectorId: this.connectorId,
        window,
        count,
        limit: maxRequests,
      });

      throw new Error(
        `Rate limit exceeded: ${maxRequests} requests per ${window}`
      );
    }
  }

  /**
   * Record a request in a time window
   */
  private async recordInWindow(
    window: 'minute' | 'hour' | 'day',
    timestamp: number,
    windowSeconds: number
  ): Promise<void> {
    const key = this.getKey(window);
    const client = redis.client!;

    // Add current request to sorted set
    await client.zadd(key, timestamp, `${timestamp}-${Math.random()}`);

    // Set expiration to window size + buffer
    await client.expire(key, windowSeconds + 60);
  }

  /**
   * Get Redis key for rate limiting
   */
  private getKey(window: string): string {
    return `rl:connector:${this.connectorId}:${window}`;
  }

  /**
   * Get current rate limit stats
   */
  async getStats(): Promise<{
    minute?: number;
    hour?: number;
    day?: number;
  }> {
    if (!redis.connected) {
      return {};
    }

    const stats: any = {};

    try {
      const client = redis.client!;

      if (this.config.requestsPerMinute) {
        const key = this.getKey('minute');
        const now = Date.now();
        await client.zremrangebyscore(key, 0, now - 60000);
        stats.minute = await client.zcard(key);
      }

      if (this.config.requestsPerHour) {
        const key = this.getKey('hour');
        const now = Date.now();
        await client.zremrangebyscore(key, 0, now - 3600000);
        stats.hour = await client.zcard(key);
      }

      if (this.config.requestsPerDay) {
        const key = this.getKey('day');
        const now = Date.now();
        await client.zremrangebyscore(key, 0, now - 86400000);
        stats.day = await client.zcard(key);
      }
    } catch (error: any) {
      logger.error('Error getting rate limit stats', {
        connectorId: this.connectorId,
        error: error.message,
      });
    }

    return stats;
  }

  /**
   * Reset rate limits (useful for testing)
   */
  async reset(): Promise<void> {
    if (!redis.connected) {
      return;
    }

    try {
      const client = redis.client!;
      const keys = [
        this.getKey('minute'),
        this.getKey('hour'),
        this.getKey('day'),
      ];

      await Promise.all(keys.map((key) => client.del(key)));

      logger.info('Rate limits reset', { connectorId: this.connectorId });
    } catch (error: any) {
      logger.error('Error resetting rate limits', {
        connectorId: this.connectorId,
        error: error.message,
      });
    }
  }
}

export default ConnectorRateLimiter;
