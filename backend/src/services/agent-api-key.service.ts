import { prisma } from '@/server';
import { logger } from '@/infrastructure/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Agent API Key Service
 * Manages API keys for agent integrations
 */

interface CreateAPIKeyData {
  organizationId: string;
  agentId: string;
  name: string;
  permissions?: string[];
  rateLimit?: number;
  expiresAt?: Date;
  ipWhitelist?: string[];
}

interface ValidateAPIKeyResult {
  valid: boolean;
  apiKey?: any;
  agent?: any;
  error?: string;
}

export class AgentAPIKeyService {
  /**
   * Generate a secure API key
   */
  generateAPIKey(): { key: string; prefix: string; hashedKey: string } {
    // Generate random key: neurall_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const key = `neurall_live_${randomBytes}`;

    // First 8 characters for identification
    const prefix = key.substring(0, 16);

    // Hash the key for storage
    const hashedKey = bcrypt.hashSync(key, 10);

    return { key, prefix, hashedKey };
  }

  /**
   * Create a new API key for an agent
   */
  async createAPIKey(data: CreateAPIKeyData) {
    try {
      // Verify agent exists and belongs to organization
      const agent = await prisma.agent.findFirst({
        where: {
          id: data.agentId,
          organizationId: data.organizationId
        }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Generate secure API key
      const { key, prefix, hashedKey } = this.generateAPIKey();

      // Store in database
      const apiKey = await prisma.agentAPIKey.create({
        data: {
          organizationId: data.organizationId,
          agentId: data.agentId,
          name: data.name,
          key, // Store plaintext temporarily for return only
          hashedKey,
          prefix,
          permissions: data.permissions || ['execute'],
          rateLimit: data.rateLimit || 100,
          expiresAt: data.expiresAt,
          ipWhitelist: data.ipWhitelist || [],
          isActive: true
        }
      });

      logger.info(`API key created for agent ${data.agentId}`);

      // Return the key (only time it's shown to user)
      return {
        ...apiKey,
        key // Plaintext key - only returned once
      };
    } catch (error: any) {
      logger.error('Create API key error:', error);
      throw new Error(error.message || 'Failed to create API key');
    }
  }

  /**
   * Validate an API key
   */
  async validateAPIKey(key: string): Promise<ValidateAPIKeyResult> {
    try {
      // Extract prefix
      const prefix = key.substring(0, 16);

      // Find API key by prefix
      const apiKey = await prisma.agentAPIKey.findFirst({
        where: {
          prefix,
          isActive: true
        },
        include: {
          agent: true,
          organization: true
        }
      });

      if (!apiKey) {
        return {
          valid: false,
          error: 'Invalid API key'
        };
      }

      // Check if key matches hash
      const isValid = await bcrypt.compare(key, apiKey.hashedKey);

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid API key'
        };
      }

      // Check expiration
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        return {
          valid: false,
          error: 'API key expired'
        };
      }

      // Check if agent is active
      if (apiKey.agent.status !== 'ACTIVE') {
        return {
          valid: false,
          error: 'Agent is not active'
        };
      }

      // Update last used timestamp
      await prisma.agentAPIKey.update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 }
        }
      });

      return {
        valid: true,
        apiKey,
        agent: apiKey.agent
      };
    } catch (error: any) {
      logger.error('Validate API key error:', error);
      return {
        valid: false,
        error: 'API key validation failed'
      };
    }
  }

  /**
   * Check rate limit for an API key
   */
  async checkRateLimit(apiKeyId: string, ipAddress?: string): Promise<boolean> {
    try {
      const apiKey = await prisma.agentAPIKey.findUnique({
        where: { id: apiKeyId }
      });

      if (!apiKey) return false;

      // Check IP whitelist
      if (apiKey.ipWhitelist.length > 0 && ipAddress) {
        if (!apiKey.ipWhitelist.includes(ipAddress)) {
          logger.warn(`IP ${ipAddress} not whitelisted for API key ${apiKeyId}`);
          return false;
        }
      }

      // Get usage in last minute
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentUsage = await prisma.agentAPIUsageLog.count({
        where: {
          apiKeyId,
          timestamp: {
            gte: oneMinuteAgo
          }
        }
      });

      // Check rate limit
      if (recentUsage >= apiKey.rateLimit) {
        logger.warn(`Rate limit exceeded for API key ${apiKeyId}: ${recentUsage}/${apiKey.rateLimit}`);
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error('Check rate limit error:', error);
      return false;
    }
  }

  /**
   * Log API usage
   */
  async logAPIUsage(data: {
    apiKeyId: string;
    agentId: string;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  }) {
    try {
      await prisma.agentAPIUsageLog.create({
        data: {
          apiKeyId: data.apiKeyId,
          agentId: data.agentId,
          method: data.method,
          endpoint: data.endpoint,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestSize: data.requestSize,
          responseSize: data.responseSize,
          errorMessage: data.errorMessage
        }
      });
    } catch (error: any) {
      logger.error('Log API usage error:', error);
      // Don't throw - logging failure shouldn't break the request
    }
  }

  /**
   * List API keys for an agent
   */
  async listAPIKeys(agentId: string, organizationId: string) {
    try {
      const apiKeys = await prisma.agentAPIKey.findMany({
        where: {
          agentId,
          organizationId
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          permissions: true,
          rateLimit: true,
          usageCount: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          ipWhitelist: true,
          createdAt: true,
          updatedAt: true
          // Don't return key or hashedKey
        },
        orderBy: { createdAt: 'desc' }
      });

      return apiKeys;
    } catch (error: any) {
      logger.error('List API keys error:', error);
      throw new Error('Failed to list API keys');
    }
  }

  /**
   * Update API key
   */
  async updateAPIKey(
    apiKeyId: string,
    organizationId: string,
    updates: {
      name?: string;
      permissions?: string[];
      rateLimit?: number;
      expiresAt?: Date | null;
      ipWhitelist?: string[];
      isActive?: boolean;
    }
  ) {
    try {
      // Verify ownership
      const apiKey = await prisma.agentAPIKey.findFirst({
        where: {
          id: apiKeyId,
          organizationId
        }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const updated = await prisma.agentAPIKey.update({
        where: { id: apiKeyId },
        data: updates
      });

      logger.info(`API key ${apiKeyId} updated`);
      return updated;
    } catch (error: any) {
      logger.error('Update API key error:', error);
      throw new Error(error.message || 'Failed to update API key');
    }
  }

  /**
   * Revoke (delete) API key
   */
  async revokeAPIKey(apiKeyId: string, organizationId: string) {
    try {
      // Verify ownership
      const apiKey = await prisma.agentAPIKey.findFirst({
        where: {
          id: apiKeyId,
          organizationId
        }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Soft delete - mark as inactive
      await prisma.agentAPIKey.update({
        where: { id: apiKeyId },
        data: { isActive: false }
      });

      logger.info(`API key ${apiKeyId} revoked`);
      return { success: true };
    } catch (error: any) {
      logger.error('Revoke API key error:', error);
      throw new Error(error.message || 'Failed to revoke API key');
    }
  }

  /**
   * Regenerate API key
   */
  async regenerateAPIKey(apiKeyId: string, organizationId: string) {
    try {
      // Verify ownership
      const apiKey = await prisma.agentAPIKey.findFirst({
        where: {
          id: apiKeyId,
          organizationId
        }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Generate new key
      const { key, prefix, hashedKey } = this.generateAPIKey();

      // Update database
      const updated = await prisma.agentAPIKey.update({
        where: { id: apiKeyId },
        data: {
          key,
          hashedKey,
          prefix,
          usageCount: 0,
          lastUsedAt: null
        }
      });

      logger.info(`API key ${apiKeyId} regenerated`);

      return {
        ...updated,
        key // Return new key (only time it's shown)
      };
    } catch (error: any) {
      logger.error('Regenerate API key error:', error);
      throw new Error(error.message || 'Failed to regenerate API key');
    }
  }

  /**
   * Get API key usage statistics
   */
  async getAPIKeyUsage(apiKeyId: string, organizationId: string, days: number = 7) {
    try {
      // Verify ownership
      const apiKey = await prisma.agentAPIKey.findFirst({
        where: {
          id: apiKeyId,
          organizationId
        }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get usage logs
      const logs = await prisma.agentAPIUsageLog.findMany({
        where: {
          apiKeyId,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Calculate statistics
      const totalRequests = logs.length;
      const successfulRequests = logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
      const failedRequests = totalRequests - successfulRequests;
      const avgResponseTime = logs.length > 0
        ? logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length
        : 0;

      // Group by day
      const requestsByDay: Record<string, number> = {};
      logs.forEach(log => {
        const day = log.timestamp.toISOString().split('T')[0];
        requestsByDay[day] = (requestsByDay[day] || 0) + 1;
      });

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        requestsByDay,
        recentLogs: logs.slice(0, 50)
      };
    } catch (error: any) {
      logger.error('Get API key usage error:', error);
      throw new Error('Failed to get API key usage');
    }
  }
}

export const agentAPIKeyService = new AgentAPIKeyService();
