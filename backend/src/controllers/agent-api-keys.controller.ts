import { Request, Response } from 'express';
import { z } from 'zod';
import { agentAPIKeyService } from '@/services/agent-api-key.service';
import { logger } from '@/infrastructure/logger';

/**
 * Agent API Keys Controller
 * Manages API keys for agent integrations
 */

// Validation schemas
const createAPIKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
  rateLimit: z.number().min(1).max(10000).optional(),
  expiresAt: z.string().datetime().optional(),
  ipWhitelist: z.array(z.string().ip()).optional()
});

const updateAPIKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  rateLimit: z.number().min(1).max(10000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  ipWhitelist: z.array(z.string().ip()).optional(),
  isActive: z.boolean().optional()
});

export class AgentAPIKeysController {
  /**
   * Create a new API key
   * POST /api/agents/:agentId/api-keys
   */
  async createAPIKey(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Validate request body
      const validatedData = createAPIKeySchema.parse(req.body);

      // Create API key
      const apiKey = await agentAPIKeyService.createAPIKey({
        organizationId,
        agentId,
        name: validatedData.name,
        permissions: validatedData.permissions,
        rateLimit: validatedData.rateLimit,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        ipWhitelist: validatedData.ipWhitelist
      });

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: apiKey,
        warning: 'Save this key securely. It will not be shown again.'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Create API key error:', error);
      res.status(500).json({ error: error.message || 'Failed to create API key' });
    }
  }

  /**
   * List all API keys for an agent
   * GET /api/agents/:agentId/api-keys
   */
  async listAPIKeys(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const organizationId = (req as any).user.organizationId;

      const apiKeys = await agentAPIKeyService.listAPIKeys(agentId, organizationId);

      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error: any) {
      logger.error('List API keys error:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  }

  /**
   * Update an API key
   * PUT /api/agents/:agentId/api-keys/:keyId
   */
  async updateAPIKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Validate request body
      const validatedData = updateAPIKeySchema.parse(req.body);

      // Convert expiresAt string to Date if provided
      const updates: any = { ...validatedData };
      if (validatedData.expiresAt !== undefined) {
        updates.expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null;
      }

      const apiKey = await agentAPIKeyService.updateAPIKey(
        keyId,
        organizationId,
        updates
      );

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: apiKey
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Update API key error:', error);
      res.status(500).json({ error: error.message || 'Failed to update API key' });
    }
  }

  /**
   * Revoke an API key
   * DELETE /api/agents/:agentId/api-keys/:keyId
   */
  async revokeAPIKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const organizationId = (req as any).user.organizationId;

      await agentAPIKeyService.revokeAPIKey(keyId, organizationId);

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error: any) {
      logger.error('Revoke API key error:', error);
      res.status(500).json({ error: error.message || 'Failed to revoke API key' });
    }
  }

  /**
   * Regenerate an API key
   * POST /api/agents/:agentId/api-keys/:keyId/regenerate
   */
  async regenerateAPIKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const organizationId = (req as any).user.organizationId;

      const apiKey = await agentAPIKeyService.regenerateAPIKey(keyId, organizationId);

      res.json({
        success: true,
        message: 'API key regenerated successfully',
        data: apiKey,
        warning: 'Save this key securely. It will not be shown again.'
      });
    } catch (error: any) {
      logger.error('Regenerate API key error:', error);
      res.status(500).json({ error: error.message || 'Failed to regenerate API key' });
    }
  }

  /**
   * Get API key usage statistics
   * GET /api/agents/:agentId/api-keys/:keyId/usage
   */
  async getAPIKeyUsage(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const organizationId = (req as any).user.organizationId;
      const days = parseInt(req.query.days as string) || 7;

      const usage = await agentAPIKeyService.getAPIKeyUsage(keyId, organizationId, days);

      res.json({
        success: true,
        data: usage
      });
    } catch (error: any) {
      logger.error('Get API key usage error:', error);
      res.status(500).json({ error: error.message || 'Failed to get API key usage' });
    }
  }
}

export const agentAPIKeysController = new AgentAPIKeysController();
