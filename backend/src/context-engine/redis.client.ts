/**
 * ==================== REDIS CLIENT ====================
 *
 * Redis client wrapper for session management and caching
 *
 * Features:
 * - Connection pooling
 * - Auto-reconnect
 * - Error handling
 * - Typed operations
 *
 * @module context-engine/redis
 */

import Redis from 'ioredis';
import { logger } from '../infrastructure/logger';

class RedisClient {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisPassword = process.env.REDIS_PASSWORD;

      // Main client
      this.client = new Redis(redisUrl, {
        password: redisPassword,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          // Stop retrying after 3 attempts
          if (times > 3) {
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: false, // Don't block on ready check
        enableOfflineQueue: true,
        lazyConnect: true, // Don't connect immediately
      });

      // Subscriber client (for pub/sub)
      this.subscriber = new Redis(redisUrl, {
        password: redisPassword,
        lazyConnect: true,
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('✓ Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        // Suppress connection errors - gracefully degrade
        if (!error.message.includes('ECONNREFUSED')) {
          logger.warn('Redis error (degraded mode):', error.message);
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Try to connect without blocking
      this.client.connect().catch(() => {
        logger.warn('⚠ Redis unavailable - running in degraded mode');
        this.isConnected = false;
      });

      logger.info('Redis client initialized (async)');
    } catch (error) {
      logger.warn('Redis unavailable - continuing without cache');
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isConnected = false;
    logger.info('Redis client disconnected');
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if client is connected (returns false if not, doesn't throw)
   */
  private ensureConnected(): boolean {
    return !!(this.client && this.isConnected);
  }

  // ==================== KEY-VALUE OPERATIONS ====================

  /**
   * Set a key-value pair
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.ensureConnected()) return; // Gracefully degrade

    try {
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      logger.warn('Redis set failed', { key });
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.ensureConnected()) return null; // Gracefully degrade

    try {
      return await this.client!.get(key);
    } catch (error) {
      logger.warn('Redis get failed', { key });
      return null;
    }
  }

  /**
   * Set JSON object
   */
  async setJSON<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Get JSON object
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse JSON from Redis', { key, error });
      return null;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    if (!this.ensureConnected()) return;

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.warn('Redis delete failed', { key });
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0 || !this.ensureConnected()) return;

    try {
      await this.client!.del(...keys);
    } catch (error) {
      logger.warn('Redis deleteMany failed');
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.ensureConnected()) return false;

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.ensureConnected()) return;

    try {
      await this.client!.expire(key, ttlSeconds);
    } catch (error) {
      logger.warn('Redis expire failed', { key });
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    this.ensureConnected();
    return await this.client!.ttl(key);
  }

  // ==================== HASH OPERATIONS ====================

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    this.ensureConnected();
    await this.client!.hset(key, field, value);
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    this.ensureConnected();
    return await this.client!.hget(key, field);
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    this.ensureConnected();
    return await this.client!.hgetall(key);
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<void> {
    this.ensureConnected();
    await this.client!.hdel(key, field);
  }

  /**
   * Set multiple hash fields
   */
  async hmset(key: string, data: Record<string, string>): Promise<void> {
    this.ensureConnected();
    await this.client!.hmset(key, data);
  }

  // ==================== LIST OPERATIONS ====================

  /**
   * Push to list (left/start)
   */
  async lpush(key: string, value: string): Promise<void> {
    this.ensureConnected();
    await this.client!.lpush(key, value);
  }

  /**
   * Push to list (right/end)
   */
  async rpush(key: string, value: string): Promise<void> {
    this.ensureConnected();
    await this.client!.rpush(key, value);
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    this.ensureConnected();
    return await this.client!.lrange(key, start, stop);
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    this.ensureConnected();
    return await this.client!.llen(key);
  }

  /**
   * Trim list
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    this.ensureConnected();
    await this.client!.ltrim(key, start, stop);
  }

  // ==================== SET OPERATIONS ====================

  /**
   * Add to set
   */
  async sadd(key: string, member: string): Promise<void> {
    this.ensureConnected();
    await this.client!.sadd(key, member);
  }

  /**
   * Get all set members
   */
  async smembers(key: string): Promise<string[]> {
    this.ensureConnected();
    return await this.client!.smembers(key);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    this.ensureConnected();
    const result = await this.client!.sismember(key, member);
    return result === 1;
  }

  /**
   * Remove from set
   */
  async srem(key: string, member: string): Promise<void> {
    this.ensureConnected();
    await this.client!.srem(key, member);
  }

  // ==================== PATTERN OPERATIONS ====================

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.ensureConnected()) return [];

    try {
      return await this.client!.keys(pattern);
    } catch (error) {
      logger.warn('Redis keys failed');
      return [];
    }
  }

  /**
   * Scan keys (safer than keys() for large datasets)
   */
  async scan(cursor: string, pattern: string, count: number = 100): Promise<{
    cursor: string;
    keys: string[];
  }> {
    if (!this.ensureConnected()) return { cursor: '0', keys: [] };

    try {
      const [newCursor, keys] = await this.client!.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count
      );
      return { cursor: newCursor, keys };
    } catch (error) {
      logger.warn('Redis scan failed');
      return { cursor: '0', keys: [] };
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    this.ensureConnected();
    return await this.client!.incr(key);
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    this.ensureConnected();
    return await this.client!.decr(key);
  }

  /**
   * Increment by amount
   */
  async incrby(key: string, amount: number): Promise<number> {
    this.ensureConnected();
    return await this.client!.incrby(key, amount);
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    this.ensureConnected();
    return await this.client!.ping();
  }

  /**
   * Flush database (USE WITH CAUTION)
   */
  async flushdb(): Promise<void> {
    this.ensureConnected();
    await this.client!.flushdb();
    logger.warn('Redis database flushed');
  }

  // ==================== PUB/SUB OPERATIONS ====================

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<void> {
    this.ensureConnected();
    await this.client!.publish(channel, message);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Subscriber not initialized');
    }

    await this.subscriber.subscribe(channel);

    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        handler(message);
      }
    });
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Subscriber not initialized');
    }

    await this.subscriber.unsubscribe(channel);
  }
}

// Singleton instance
export const redis = new RedisClient();

// Export the class
export { RedisClient };

// Auto-connect on module load
redis.connect().catch((error) => {
  logger.error('Failed to auto-connect Redis', { error });
});

export default redis;
