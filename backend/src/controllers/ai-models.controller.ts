import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { encrypt, decrypt, generateApiKeyPreview } from '../utils/encryption';
import { modelTesterService } from '../services/model-tester.service';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

// Validation schemas
const createModelConfigSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  apiKey: z.string().min(1),
  maxTokens: z.number().int().min(1).default(4000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  costPerPromptToken: z.number().optional(),
  costPerCompletionToken: z.number().optional(),
  monthlyUsageLimit: z.number().int().optional(),
  isDefault: z.boolean().default(false),
  capabilities: z.record(z.boolean()).optional(),
  supportedTasks: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const updateModelConfigSchema = createModelConfigSchema.partial();

const testModelSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  apiKey: z.string(),
});

const createProviderSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  apiBaseUrl: z.string().url(),
  apiDocUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  supportsStreaming: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsFunctionCalling: z.boolean().default(false),
  maxTokensLimit: z.number().int().optional(),
  orderIndex: z.number().int().default(0),
});

const updateProviderSchema = createProviderSchema.partial().extend({
  code: z.string().min(1).optional(),
});

export class AIModelsController {
  /**
   * Get all AI model providers
   */
  async getProviders(req: Request, res: Response) {
    try {
      const providers = await prisma.aIModelProvider.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      });

      res.json({
        success: true,
        providers,
      });
    } catch (error: any) {
      logger.error('Error fetching providers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI providers',
      });
    }
  }

  /**
   * Get organization's AI model configurations
   */
  async getModelConfigs(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const configs = await prisma.aIModelConfig.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        include: {
          provider: {
            select: {
              code: true,
              name: true,
              displayName: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Remove encrypted API keys from response, keep only preview
      const sanitizedConfigs = configs.map(config => {
        const { apiKeyEncrypted, ...rest } = config;
        return rest;
      });

      res.json({
        success: true,
        configs: sanitizedConfigs,
      });
    } catch (error: any) {
      logger.error('Error fetching model configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch model configurations',
      });
    }
  }

  /**
   * Get a single model configuration by ID
   */
  async getModelConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const config = await prisma.aIModelConfig.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
        include: {
          provider: true,
        },
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
      }

      // Remove encrypted API key
      const { apiKeyEncrypted, ...sanitizedConfig } = config;

      res.json({
        success: true,
        config: sanitizedConfig,
      });
    } catch (error: any) {
      logger.error('Error fetching model config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch model configuration',
      });
    }
  }

  /**
   * Create a new AI model configuration
   */
  async createModelConfig(req: Request, res: Response) {
    try {
      const validatedData = createModelConfigSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify provider exists (check by code OR by id)
      let provider = await prisma.aIModelProvider.findUnique({
        where: { code: validatedData.providerId },
      });

      // If not found by code, try by ID
      if (!provider) {
        provider = await prisma.aIModelProvider.findUnique({
          where: { id: validatedData.providerId },
        });
      }

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'AI provider not found',
        });
      }

      // Check if this model already exists for this organization
      const existingConfig = await prisma.aIModelConfig.findUnique({
        where: {
          organizationId_modelId: {
            organizationId,
            modelId: validatedData.modelId,
          },
        },
      });

      if (existingConfig && !existingConfig.deletedAt) {
        return res.status(409).json({
          success: false,
          error: 'This model is already configured for your organization',
        });
      }

      // Encrypt API key
      const apiKeyEncrypted = encrypt(validatedData.apiKey);
      const apiKeyPreview = generateApiKeyPreview(validatedData.apiKey);

      // If this is set as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.aIModelConfig.updateMany({
          where: {
            organizationId,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      // Create model config
      const { apiKey, providerId, ...configData } = validatedData;
      const modelConfig = await prisma.aIModelConfig.create({
        data: {
          ...configData,
          providerId: provider.id, // Use the actual database ID
          organizationId,
          apiKeyEncrypted,
          apiKeyPreview,
          createdBy: userId,
          capabilities: validatedData.capabilities || {},
        } as any,
        include: {
          provider: {
            select: {
              code: true,
              name: true,
              displayName: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Log creation
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'CREATE',
          resourceType: 'AI_MODEL_CONFIG',
          resourceId: modelConfig.id,
          metadata: {
            modelId: modelConfig.modelId,
            provider: provider.name,
          },
        },
      }).catch(err => logger.error('Audit log error:', err));

      // Remove encrypted API key from response
      const { apiKeyEncrypted: _, ...sanitizedConfig } = modelConfig;

      res.status(201).json({
        success: true,
        config: sanitizedConfig,
      });
    } catch (error: any) {
      logger.error('Error creating model config:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create model configuration',
      });
    }
  }

  /**
   * Update an existing AI model configuration
   */
  async updateModelConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateModelConfigSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify config exists and belongs to organization
      const existingConfig = await prisma.aIModelConfig.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existingConfig) {
        return res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
      }

      // Prepare update data
      const updateData: any = { ...validatedData };
      delete updateData.apiKey; // Don't include API key in spread
      delete updateData.providerId; // Don't update providerId directly

      // If providerId is being changed, lookup the provider and use its database ID
      if (validatedData.providerId) {
        let provider = await prisma.aIModelProvider.findUnique({
          where: { code: validatedData.providerId },
        });

        if (!provider) {
          provider = await prisma.aIModelProvider.findUnique({
            where: { id: validatedData.providerId },
          });
        }

        if (provider) {
          updateData.providerId = provider.id;
        }
      }

      // If API key is being updated, encrypt it
      if (validatedData.apiKey) {
        updateData.apiKeyEncrypted = encrypt(validatedData.apiKey);
        updateData.apiKeyPreview = generateApiKeyPreview(validatedData.apiKey);
      }

      // If setting as default, unset other defaults
      if (validatedData.isDefault === true) {
        await prisma.aIModelConfig.updateMany({
          where: {
            organizationId,
            isDefault: true,
            id: { not: id },
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      // Update config
      const updatedConfig = await prisma.aIModelConfig.update({
        where: { id },
        data: updateData,
        include: {
          provider: {
            select: {
              code: true,
              name: true,
              displayName: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'UPDATE',
          resourceType: 'AI_MODEL_CONFIG',
          resourceId: updatedConfig.id,
          metadata: {
            modelId: updatedConfig.modelId,
            changes: Object.keys(validatedData),
          },
        },
      }).catch(err => logger.error('Audit log error:', err));

      // Remove encrypted API key from response
      const { apiKeyEncrypted: _, ...sanitizedConfig } = updatedConfig;

      res.json({
        success: true,
        config: sanitizedConfig,
      });
    } catch (error: any) {
      logger.error('Error updating model config:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update model configuration',
      });
    }
  }

  /**
   * Delete (soft delete) an AI model configuration
   */
  async deleteModelConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify config exists and belongs to organization
      const existingConfig = await prisma.aIModelConfig.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!existingConfig) {
        return res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
      }

      // Check if this is the default model
      if (existingConfig.isDefault) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the default model. Please set another model as default first.',
        });
      }

      // Soft delete
      await prisma.aIModelConfig.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Log deletion
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'DELETE',
          resourceType: 'AI_MODEL_CONFIG',
          resourceId: id,
          metadata: {
            modelId: existingConfig.modelId,
          },
        },
      }).catch(err => logger.error('Audit log error:', err));

      res.json({
        success: true,
        message: 'Model configuration deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting model config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete model configuration',
      });
    }
  }

  /**
   * Test an AI model connection (before saving)
   */
  async testModelConnection(req: Request, res: Response) {
    try {
      const validatedData = testModelSchema.parse(req.body);

      // Get provider info
      const provider = await prisma.aIModelProvider.findUnique({
        where: { id: validatedData.providerId },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      logger.info(`🧪 Testing ${provider.name} connection with model: ${validatedData.modelId}`);

      // Perform real API test
      const testResult = await modelTesterService.testProvider(
        provider.code,
        validatedData.apiKey,
        validatedData.modelId
      );

      res.json({
        success: true,
        ...testResult,
        provider: {
          code: provider.code,
          name: provider.name,
        },
      });
    } catch (error: any) {
      logger.error('Error testing model:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to test model connection',
        message: error.message,
      });
    }
  }

  /**
   * Get usage statistics for a model
   */
  async getModelUsageStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const config = await prisma.aIModelConfig.findFirst({
        where: {
          id,
          organizationId,
          deletedAt: null,
        },
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
      }

      // Get usage stats from diet plans (extend this for other features)
      const dietPlansCount = await prisma.patientDietPlan.count({
        where: { aiModelConfigId: id },
      });

      res.json({
        success: true,
        stats: {
          currentMonthUsage: config.currentMonthUsage,
          monthlyUsageLimit: config.monthlyUsageLimit,
          lastUsedAt: config.lastUsedAt,
          dietPlansGenerated: dietPlansCount,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage statistics',
      });
    }
  }

  // ==================== PROVIDER MANAGEMENT (Admin Only) ====================

  /**
   * Create a new AI model provider
   */
  async createProvider(req: Request, res: Response) {
    try {
      const validatedData = createProviderSchema.parse(req.body);

      // Check if code already exists
      const existing = await prisma.aIModelProvider.findUnique({
        where: { code: validatedData.code },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Provider code already exists',
        });
      }

      const provider = await prisma.aIModelProvider.create({
        data: validatedData as any,
      });

      res.status(201).json({
        success: true,
        provider,
        message: 'Provider created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating provider:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create provider',
      });
    }
  }

  /**
   * Update an existing AI model provider
   */
  async updateProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateProviderSchema.parse(req.body);

      // Check if provider exists
      const existing = await prisma.aIModelProvider.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      // If updating code, check if new code already exists
      if (validatedData.code && validatedData.code !== existing.code) {
        const codeExists = await prisma.aIModelProvider.findUnique({
          where: { code: validatedData.code },
        });

        if (codeExists) {
          return res.status(400).json({
            success: false,
            error: 'Provider code already exists',
          });
        }
      }

      const provider = await prisma.aIModelProvider.update({
        where: { id },
        data: validatedData,
      });

      res.json({
        success: true,
        provider,
        message: 'Provider updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating provider:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update provider',
      });
    }
  }

  /**
   * Delete an AI model provider
   */
  async deleteProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if provider exists
      const existing = await prisma.aIModelProvider.findUnique({
        where: { id },
        include: {
          _count: {
            select: { models: true },
          },
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      // Check if provider has associated configs
      if ((existing as any)._count?.models > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete provider. It has ${(existing as any)._count.models} associated model configuration(s).`,
        });
      }

      await prisma.aIModelProvider.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Provider deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete provider',
      });
    }
  }
}
