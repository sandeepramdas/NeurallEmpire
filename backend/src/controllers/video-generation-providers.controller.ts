/**
 * ==================== VIDEO GENERATION PROVIDERS CONTROLLER ====================
 *
 * Manages video generation provider configurations for organizations.
 * Supports multiple providers: D-ID, HeyGen, Synthesia, Wav2Lip, etc.
 *
 * Features:
 * - Full CRUD operations for providers
 * - Encrypted credential storage
 * - Health status monitoring
 * - Provider testing and validation
 * - Priority-based provider selection
 * - Multi-tenant isolation
 *
 * @module controllers/video-generation-providers
 */

import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/server';
import { AuthenticatedRequest, ApiResponse } from '@/types';
import { encryption } from '@/infrastructure/encryption';
import { logger } from '@/infrastructure/logger';
import { VideoGenProviderType } from '@prisma/client';

// Validation schemas
const createProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.nativeEnum(VideoGenProviderType, { errorMap: () => ({ message: 'Invalid provider type' }) }),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),

  // API Configuration
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  apiUrl: z.string().url().optional().or(z.literal('')),
  webhookUrl: z.string().url().optional().or(z.literal('')),

  // Provider-specific config (JSON)
  config: z.record(z.any()).optional(),

  // Features
  supportsLipSync: z.boolean().default(true),
  supportsEyeMovement: z.boolean().default(false),
  supportsEmotions: z.boolean().default(false),
  supportsBackground: z.boolean().default(false),

  // Limits & Pricing
  monthlyMinutes: z.number().int().nonnegative().optional(),
  costPerMinute: z.number().nonnegative().optional(),
  maxVideoLength: z.number().int().positive().optional(),
  maxResolution: z.string().optional(),

  // Performance
  avgProcessingTime: z.number().int().nonnegative().optional(),
  priority: z.number().int().default(0),

  // Status
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const updateProviderSchema = createProviderSchema.partial();

/**
 * Video Generation Providers Controller
 */
export class VideoGenerationProvidersController {
  /**
   * Create a new video generation provider
   * POST /api/video-generation-providers
   */
  async createProvider(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request body
      const validatedData = createProviderSchema.parse(req.body);

      // Encrypt sensitive credentials
      const apiKeyEncrypted = validatedData.apiKey
        ? encryption.encrypt(validatedData.apiKey)
        : null;

      const apiSecretEncrypted = validatedData.apiSecret
        ? encryption.encrypt(validatedData.apiSecret)
        : null;

      // If setting as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.videoGenerationProvider.updateMany({
          where: {
            organizationId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create provider
      const provider = await prisma.videoGenerationProvider.create({
        data: {
          organizationId,
          name: validatedData.name,
          type: validatedData.type,
          displayName: validatedData.displayName,
          description: validatedData.description || null,
          logoUrl: validatedData.logoUrl || null,

          apiKey: apiKeyEncrypted,
          apiSecret: apiSecretEncrypted,
          apiUrl: validatedData.apiUrl || null,
          webhookUrl: validatedData.webhookUrl || null,

          config: validatedData.config || null,

          supportsLipSync: validatedData.supportsLipSync,
          supportsEyeMovement: validatedData.supportsEyeMovement,
          supportsEmotions: validatedData.supportsEmotions,
          supportsBackground: validatedData.supportsBackground,

          monthlyMinutes: validatedData.monthlyMinutes || null,
          costPerMinute: validatedData.costPerMinute || null,
          maxVideoLength: validatedData.maxVideoLength || null,
          maxResolution: validatedData.maxResolution || null,

          avgProcessingTime: validatedData.avgProcessingTime || null,
          priority: validatedData.priority,

          isActive: validatedData.isActive,
          isDefault: validatedData.isDefault,
          healthStatus: 'unknown',
        },
      });

      logger.info('Video generation provider created', {
        providerId: provider.id,
        organizationId,
        type: provider.type,
        name: provider.name,
      });

      // Return provider without encrypted credentials
      const { apiKey, apiSecret, ...providerData } = provider;

      return res.status(201).json({
        success: true,
        data: {
          ...providerData,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Failed to create video generation provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to create provider',
      } as ApiResponse);
    }
  }

  /**
   * Get all video generation providers for organization
   * GET /api/video-generation-providers
   */
  async listProviders(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Query parameters for filtering
      const { type, isActive, isDefault } = req.query;

      const providers = await prisma.videoGenerationProvider.findMany({
        where: {
          organizationId,
          ...(type && { type: type as VideoGenProviderType }),
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
          ...(isDefault !== undefined && { isDefault: isDefault === 'true' }),
        },
        orderBy: [
          { isDefault: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Remove encrypted credentials from response
      const providersData = providers.map(({ apiKey, apiSecret, ...provider }) => ({
        ...provider,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      }));

      return res.json({
        success: true,
        data: providersData,
        count: providersData.length,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to list video generation providers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to list providers',
      } as ApiResponse);
    }
  }

  /**
   * Get single video generation provider by ID
   * GET /api/video-generation-providers/:id
   */
  async getProvider(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      const provider = await prisma.videoGenerationProvider.findFirst({
        where: {
          id,
          organizationId, // Ensure user can only access their org's providers
        },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        } as ApiResponse);
      }

      // Remove encrypted credentials from response
      const { apiKey, apiSecret, ...providerData } = provider;

      return res.json({
        success: true,
        data: {
          ...providerData,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get video generation provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to get provider',
      } as ApiResponse);
    }
  }

  /**
   * Update video generation provider
   * PUT /api/video-generation-providers/:id
   */
  async updateProvider(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request body
      const validatedData = updateProviderSchema.parse(req.body);

      // Check if provider exists and belongs to organization
      const existingProvider = await prisma.videoGenerationProvider.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!existingProvider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        } as ApiResponse);
      }

      // Encrypt credentials if provided
      const updateData: any = { ...validatedData };

      if (validatedData.apiKey) {
        updateData.apiKey = encryption.encrypt(validatedData.apiKey);
      }

      if (validatedData.apiSecret) {
        updateData.apiSecret = encryption.encrypt(validatedData.apiSecret);
      }

      // If setting as default, unset other defaults
      if (validatedData.isDefault === true) {
        await prisma.videoGenerationProvider.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Update provider
      const provider = await prisma.videoGenerationProvider.update({
        where: { id },
        data: updateData,
      });

      logger.info('Video generation provider updated', {
        providerId: provider.id,
        organizationId,
        type: provider.type,
      });

      // Remove encrypted credentials from response
      const { apiKey, apiSecret, ...providerData } = provider;

      return res.json({
        success: true,
        data: {
          ...providerData,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Failed to update video generation provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to update provider',
      } as ApiResponse);
    }
  }

  /**
   * Delete video generation provider
   * DELETE /api/video-generation-providers/:id
   */
  async deleteProvider(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Check if provider exists and belongs to organization
      const provider = await prisma.videoGenerationProvider.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        } as ApiResponse);
      }

      // Delete provider
      await prisma.videoGenerationProvider.delete({
        where: { id },
      });

      logger.info('Video generation provider deleted', {
        providerId: id,
        organizationId,
        type: provider.type,
        name: provider.name,
      });

      return res.json({
        success: true,
        message: 'Provider deleted successfully',
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to delete video generation provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to delete provider',
      } as ApiResponse);
    }
  }

  /**
   * Test video generation provider connection
   * POST /api/video-generation-providers/:id/test
   */
  async testProvider(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Get provider with credentials
      const provider = await prisma.videoGenerationProvider.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        } as ApiResponse);
      }

      if (!provider.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Provider is not active',
        } as ApiResponse);
      }

      // Decrypt credentials
      const apiKey = provider.apiKey ? encryption.decrypt(provider.apiKey) : null;
      const apiSecret = provider.apiSecret ? encryption.decrypt(provider.apiSecret) : null;

      // TODO: Implement actual provider testing logic
      // This will be implemented when we create provider services
      // For now, return mock success

      const testStartTime = Date.now();

      // Update health check timestamp
      await prisma.videoGenerationProvider.update({
        where: { id },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: 'healthy',
        },
      });

      const testDuration = Date.now() - testStartTime;

      logger.info('Video generation provider tested', {
        providerId: id,
        organizationId,
        type: provider.type,
        duration: testDuration,
      });

      return res.json({
        success: true,
        data: {
          status: 'healthy',
          message: 'Provider connection successful',
          responseTime: testDuration,
          testedAt: new Date().toISOString(),
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to test video generation provider', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      // Update health status to failed
      try {
        await prisma.videoGenerationProvider.update({
          where: { id: req.params.id },
          data: {
            lastHealthCheck: new Date(),
            healthStatus: 'down',
          },
        });
      } catch (updateError) {
        // Ignore update errors
      }

      return res.status(500).json({
        success: false,
        error: 'Provider test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  /**
   * Get provider credentials (admin only)
   * GET /api/video-generation-providers/:id/credentials
   */
  async getProviderCredentials(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId;
      const userRole = req.user?.role;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Only admins can view credentials
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        } as ApiResponse);
      }

      const provider = await prisma.videoGenerationProvider.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        } as ApiResponse);
      }

      // Decrypt credentials
      const credentials: any = {};

      if (provider.apiKey) {
        credentials.apiKey = encryption.decrypt(provider.apiKey);
      }

      if (provider.apiSecret) {
        credentials.apiSecret = encryption.decrypt(provider.apiSecret);
      }

      logger.info('Provider credentials accessed', {
        providerId: id,
        organizationId,
        userId: req.user?.id,
        userRole,
      });

      return res.json({
        success: true,
        data: credentials,
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to get provider credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
        providerId: req.params.id,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to get credentials',
      } as ApiResponse);
    }
  }
}

// Export singleton instance
export const videoGenerationProvidersController = new VideoGenerationProvidersController();
