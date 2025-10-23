/**
 * ==================== JWT BLACKLIST SERVICE ====================
 *
 * Manages blacklisted JWT tokens using Redis
 *
 * Features:
 * - Token invalidation on logout
 * - Automatic expiry based on JWT expiration
 * - Revoke all user tokens
 * - Check token validity
 *
 * @module services/jwt-blacklist
 */

import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';
import jwt from 'jsonwebtoken';

export class JwtBlacklistService {
  private readonly BLACKLIST_PREFIX = 'jwt-blacklist:';
  private readonly USER_TOKENS_PREFIX = 'user-tokens:';

  /**
   * Blacklist a JWT token
   * @param token - The JWT token to blacklist
   * @param expiresAt - Optional expiration timestamp (defaults to token exp claim)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      // Decode token to get expiration
      const decoded = jwt.decode(token) as any;

      if (!decoded || !decoded.exp) {
        logger.warn('Cannot blacklist token without expiration');
        return;
      }

      // Calculate TTL (time until token naturally expires)
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      // Only blacklist if token hasn't expired yet
      if (ttl > 0) {
        const key = `${this.BLACKLIST_PREFIX}${token}`;
        await redis.set(key, '1', ttl);

        logger.info('Token blacklisted', {
          userId: decoded.userId,
          ttl,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to blacklist token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.BLACKLIST_PREFIX}${token}`;
      return await redis.exists(key);
    } catch (error) {
      logger.error('Failed to check blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fail open - if Redis is down, allow access
      // This prevents total service outage
      return false;
    }
  }

  /**
   * Blacklist all tokens for a specific user
   * Useful for forced logout or account compromise
   * @param userId - The user ID
   * @param ttl - Time to live in seconds (default 24 hours)
   */
  async blacklistAllUserTokens(userId: string, ttl: number = 86400): Promise<void> {
    try {
      const key = `${this.USER_TOKENS_PREFIX}${userId}`;
      await redis.set(key, '1', ttl);

      logger.info('All user tokens blacklisted', {
        userId,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to blacklist user tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * Check if all tokens for a user are blacklisted
   * @param userId - The user ID
   * @returns true if all user tokens are blacklisted
   */
  async areAllUserTokensBlacklisted(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_TOKENS_PREFIX}${userId}`;
      return await redis.exists(key);
    } catch (error) {
      logger.error('Failed to check user token blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      // Fail open
      return false;
    }
  }

  /**
   * Remove a user from the global blacklist
   * @param userId - The user ID
   */
  async removeUserBlacklist(userId: string): Promise<void> {
    try {
      const key = `${this.USER_TOKENS_PREFIX}${userId}`;
      await redis.delete(key);

      logger.info('User removed from blacklist', { userId });
    } catch (error) {
      logger.error('Failed to remove user from blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * Get blacklist statistics
   */
  async getStatistics(): Promise<{
    totalBlacklistedTokens: number;
    totalBlacklistedUsers: number;
  }> {
    try {
      const tokenKeys = await redis.keys(`${this.BLACKLIST_PREFIX}*`);
      const userKeys = await redis.keys(`${this.USER_TOKENS_PREFIX}*`);

      return {
        totalBlacklistedTokens: tokenKeys.length,
        totalBlacklistedUsers: userKeys.length,
      };
    } catch (error) {
      logger.error('Failed to get blacklist statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalBlacklistedTokens: 0,
        totalBlacklistedUsers: 0,
      };
    }
  }

  /**
   * Clean up expired entries (Redis does this automatically, but this can be used for manual cleanup)
   */
  async cleanup(): Promise<void> {
    // Redis handles expiry automatically via TTL
    // This method is here for potential manual cleanup or monitoring
    logger.info('Blacklist cleanup requested (Redis handles expiry automatically)');
  }
}

// Singleton instance
export const jwtBlacklistService = new JwtBlacklistService();

export default jwtBlacklistService;
