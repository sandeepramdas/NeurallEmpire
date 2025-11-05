import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

const createAvatarConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatarType: z.enum(['REALISTIC_3D', 'PROFESSIONAL', 'CARTOON', 'ANIME', 'CUSTOM']),
  gender: z.string().default('neutral'),
  style: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  modelUrl: z.string().url().optional(),
  provider: z.string().optional(),
  providerId: z.string().optional(),
  apiKey: z.string().optional(),
  skinTone: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  outfit: z.string().optional(),
  background: z.string().optional(),
  isDefault: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export class AvatarConfigController {
  async getConfigs(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const configs = await prisma.avatarConfig.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          avatarType: true,
          gender: true,
          style: true,
          imageUrl: true,
          videoUrl: true,
          modelUrl: true,
          provider: true,
          providerId: true,
          skinTone: true,
          hairColor: true,
          eyeColor: true,
          outfit: true,
          background: true,
          isDefault: true,
          usageCount: true,
          lastUsedAt: true,
          tags: true,
          createdAt: true,
          apiKeyPreview: true, // Show preview only
        },
      });

      res.json({ success: true, configs });
    } catch (error: any) {
      logger.error('Error fetching avatar configs:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch avatar configurations' });
    }
  }

  async createConfig(req: Request, res: Response) {
    try {
      const validatedData = createAvatarConfigSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // If setting as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.avatarConfig.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Generate API key preview if provided
      const apiKeyPreview = validatedData.apiKey
        ? `...${validatedData.apiKey.slice(-4)}`
        : undefined;

      const config = await prisma.avatarConfig.create({
        data: {
          ...validatedData,
          organizationId,
          userId,
          apiKeyPreview,
        },
      });

      logger.info(`Avatar config created: ${config.id}`);

      // Remove sensitive API key from response
      const { apiKey, ...sanitizedConfig } = config;

      res.status(201).json({ success: true, config: sanitizedConfig });
    } catch (error: any) {
      logger.error('Error creating avatar config:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ success: false, error: 'Failed to create avatar configuration' });
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createAvatarConfigSchema.partial().parse(req.body);
      const organizationId = (req as any).user.organizationId;

      const existing = await prisma.avatarConfig.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Configuration not found' });
      }

      if (validatedData.isDefault) {
        await prisma.avatarConfig.updateMany({
          where: { organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const apiKeyPreview = validatedData.apiKey
        ? `...${validatedData.apiKey.slice(-4)}`
        : existing.apiKeyPreview;

      const config = await prisma.avatarConfig.update({
        where: { id },
        data: { ...validatedData, apiKeyPreview },
      });

      const { apiKey, ...sanitizedConfig } = config;
      res.json({ success: true, config: sanitizedConfig });
    } catch (error: any) {
      logger.error('Error updating avatar config:', error);
      res.status(500).json({ success: false, error: 'Failed to update configuration' });
    }
  }

  async deleteConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const existing = await prisma.avatarConfig.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Configuration not found' });
      }

      await prisma.avatarConfig.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ success: true, message: 'Configuration deleted' });
    } catch (error: any) {
      logger.error('Error deleting avatar config:', error);
      res.status(500).json({ success: false, error: 'Failed to delete configuration' });
    }
  }
}

export const avatarConfigController = new AvatarConfigController();
