import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

const createTTSConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  provider: z.enum(['ELEVENLABS', 'OPENAI_TTS', 'GOOGLE_TTS', 'AZURE_TTS', 'AWS_POLLY', 'PLAY_HT', 'RESEMBLE_AI', 'MURF_AI']),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  voiceGender: z.string().default('neutral'),
  language: z.string().default('en-US'),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(0.5).max(2.0).default(1.0),
  stability: z.number().min(0).max(1).default(0.5),
  similarity: z.number().min(0).max(1).default(0.75),
  apiKey: z.string().optional(),
  isDefault: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export class TTSConfigController {
  async getConfigs(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const configs = await prisma.tTSConfig.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          provider: true,
          voiceName: true,
          voiceGender: true,
          language: true,
          speed: true,
          pitch: true,
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
      logger.error('Error fetching TTS configs:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch TTS configurations' });
    }
  }

  async createConfig(req: Request, res: Response) {
    try {
      const validatedData = createTTSConfigSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // If setting as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.tTSConfig.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Generate API key preview if provided
      const apiKeyPreview = validatedData.apiKey
        ? `...${validatedData.apiKey.slice(-4)}`
        : undefined;

      const config = await prisma.tTSConfig.create({
        data: {
          ...validatedData,
          organizationId,
          userId,
          apiKeyPreview,
        },
      });

      logger.info(`TTS config created: ${config.id}`);

      // Remove sensitive API key from response
      const { apiKey, ...sanitizedConfig } = config;

      res.status(201).json({ success: true, config: sanitizedConfig });
    } catch (error: any) {
      logger.error('Error creating TTS config:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ success: false, error: 'Failed to create TTS configuration' });
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createTTSConfigSchema.partial().parse(req.body);
      const organizationId = (req as any).user.organizationId;

      const existing = await prisma.tTSConfig.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Configuration not found' });
      }

      if (validatedData.isDefault) {
        await prisma.tTSConfig.updateMany({
          where: { organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const apiKeyPreview = validatedData.apiKey
        ? `...${validatedData.apiKey.slice(-4)}`
        : existing.apiKeyPreview;

      const config = await prisma.tTSConfig.update({
        where: { id },
        data: { ...validatedData, apiKeyPreview },
      });

      const { apiKey, ...sanitizedConfig } = config;
      res.json({ success: true, config: sanitizedConfig });
    } catch (error: any) {
      logger.error('Error updating TTS config:', error);
      res.status(500).json({ success: false, error: 'Failed to update configuration' });
    }
  }

  async deleteConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const existing = await prisma.tTSConfig.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Configuration not found' });
      }

      await prisma.tTSConfig.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ success: true, message: 'Configuration deleted' });
    } catch (error: any) {
      logger.error('Error deleting TTS config:', error);
      res.status(500).json({ success: false, error: 'Failed to delete configuration' });
    }
  }
}

export const ttsConfigController = new TTSConfigController();
