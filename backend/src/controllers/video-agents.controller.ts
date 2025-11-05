import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

// Validation schemas
const createVideoAgentSchema = z.object({
  agentId: z.string().min(1),

  // Avatar Configuration
  avatarType: z.enum(['REALISTIC_3D', 'CARTOON', 'ANIME', 'PROFESSIONAL', 'CUSTOM', 'STATIC_IMAGE', 'VIDEO_LOOP']).default('REALISTIC_3D'),
  avatarGender: z.string().optional(),
  avatarStyle: z.string().optional(),
  avatarImageUrl: z.string().url().optional(),
  avatarVideoUrl: z.string().url().optional(),

  // Voice Configuration
  voiceProvider: z.enum(['ELEVENLABS', 'OPENAI_TTS', 'GOOGLE_TTS', 'AZURE_TTS', 'AWS_POLLY', 'PLAY_HT', 'RESEMBLE_AI', 'MURF_AI']).default('ELEVENLABS'),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  voiceGender: z.string().optional(),
  voiceLanguage: z.string().default('en-US'),
  voiceSpeed: z.number().min(0.5).max(2.0).default(1.0),
  voicePitch: z.number().min(0.5).max(2.0).default(1.0),
  voiceStability: z.number().min(0).max(1).default(0.5),
  voiceSimilarity: z.number().min(0).max(1).default(0.75),

  // STT Configuration
  sttProvider: z.enum(['OPENAI_WHISPER', 'GOOGLE_STT', 'AZURE_STT', 'AWS_TRANSCRIBE', 'ASSEMBLY_AI', 'DEEPGRAM']).default('OPENAI_WHISPER'),
  sttLanguage: z.string().default('en'),
  sttModel: z.string().default('whisper-1'),

  // Interaction Settings
  enableVideo: z.boolean().default(true),
  enableVoice: z.boolean().default(true),
  enableText: z.boolean().default(true),
  enableEmotions: z.boolean().default(true),
  emotionIntensity: z.number().min(0).max(1).default(0.7),

  // Conversation Settings
  conversationMode: z.string().default('interactive'),
  responseDelay: z.number().int().min(0).max(5000).default(500),
  idleAnimation: z.boolean().default(true),
  backgroundMusic: z.string().url().optional(),
  backgroundImage: z.string().url().optional(),
});

const updateVideoAgentSchema = createVideoAgentSchema.partial();

export class VideoAgentsController {
  /**
   * Get all video agents for organization
   */
  async getVideoAgents(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const videoAgents = await prisma.videoAgent.findMany({
        where: { organizationId, isActive: true },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              description: true,
              avatar: true,
              status: true,
              type: true,
            },
          },
          sessions: {
            take: 5,
            orderBy: { startedAt: 'desc' },
            select: {
              id: true,
              startedAt: true,
              duration: true,
              messageCount: true,
              userRating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        videoAgents,
      });
    } catch (error: any) {
      logger.error('Error fetching video agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video agents',
      });
    }
  }

  /**
   * Get a single video agent by ID
   */
  async getVideoAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const videoAgent = await prisma.videoAgent.findFirst({
        where: { id, organizationId },
        include: {
          agent: true,
          sessions: {
            take: 10,
            orderBy: { startedAt: 'desc' },
          },
        },
      });

      if (!videoAgent) {
        return res.status(404).json({
          success: false,
          error: 'Video agent not found',
        });
      }

      res.json({
        success: true,
        videoAgent,
      });
    } catch (error: any) {
      logger.error('Error fetching video agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch video agent',
      });
    }
  }

  /**
   * Create a new video agent
   */
  async createVideoAgent(req: Request, res: Response) {
    try {
      const validatedData = createVideoAgentSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify agent exists and belongs to organization
      const agent = await prisma.agent.findFirst({
        where: {
          id: validatedData.agentId,
          organizationId,
        },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Check if video agent already exists for this agent
      const existingVideoAgent = await prisma.videoAgent.findUnique({
        where: { agentId: validatedData.agentId },
      });

      if (existingVideoAgent) {
        return res.status(409).json({
          success: false,
          error: 'Video agent already exists for this agent',
        });
      }

      // Create video agent
      const videoAgent = await prisma.videoAgent.create({
        data: {
          ...validatedData,
          organizationId,
          userId,
        },
        include: {
          agent: true,
        },
      });

      logger.info(`Video agent created: ${videoAgent.id} for agent ${agent.name}`);

      res.status(201).json({
        success: true,
        videoAgent,
      });
    } catch (error: any) {
      logger.error('Error creating video agent:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create video agent',
      });
    }
  }

  /**
   * Update a video agent
   */
  async updateVideoAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateVideoAgentSchema.parse(req.body);
      const organizationId = (req as any).user.organizationId;

      // Verify video agent exists and belongs to organization
      const existingAgent = await prisma.videoAgent.findFirst({
        where: { id, organizationId },
      });

      if (!existingAgent) {
        return res.status(404).json({
          success: false,
          error: 'Video agent not found',
        });
      }

      // Update video agent
      const videoAgent = await prisma.videoAgent.update({
        where: { id },
        data: validatedData,
        include: {
          agent: true,
        },
      });

      logger.info(`Video agent updated: ${videoAgent.id}`);

      res.json({
        success: true,
        videoAgent,
      });
    } catch (error: any) {
      logger.error('Error updating video agent:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update video agent',
      });
    }
  }

  /**
   * Delete a video agent
   */
  async deleteVideoAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Verify video agent exists and belongs to organization
      const existingAgent = await prisma.videoAgent.findFirst({
        where: { id, organizationId },
      });

      if (!existingAgent) {
        return res.status(404).json({
          success: false,
          error: 'Video agent not found',
        });
      }

      // Soft delete by setting isActive to false
      await prisma.videoAgent.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info(`Video agent deleted: ${id}`);

      res.json({
        success: true,
        message: 'Video agent deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting video agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete video agent',
      });
    }
  }

  /**
   * Switch TTS or Avatar configuration at runtime
   */
  async switchConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { ttsConfigId, avatarConfigId } = req.body;
      const organizationId = (req as any).user.organizationId;

      // Verify video agent exists and belongs to organization
      const existingAgent = await prisma.videoAgent.findFirst({
        where: { id, organizationId },
      });

      if (!existingAgent) {
        return res.status(404).json({
          success: false,
          error: 'Video agent not found',
        });
      }

      // Update config IDs
      const updateData: any = {};
      if (ttsConfigId) {
        // Verify TTS config exists and belongs to organization
        const ttsConfig = await prisma.tTSConfig.findFirst({
          where: { id: ttsConfigId, organizationId },
        });

        if (!ttsConfig) {
          return res.status(404).json({
            success: false,
            error: 'TTS configuration not found',
          });
        }

        updateData.ttsConfigId = ttsConfigId;

        // Update usage tracking
        await prisma.tTSConfig.update({
          where: { id: ttsConfigId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }

      if (avatarConfigId) {
        // Verify avatar config exists and belongs to organization
        const avatarConfig = await prisma.avatarConfig.findFirst({
          where: { id: avatarConfigId, organizationId },
        });

        if (!avatarConfig) {
          return res.status(404).json({
            success: false,
            error: 'Avatar configuration not found',
          });
        }

        updateData.avatarConfigId = avatarConfigId;

        // Update usage tracking
        await prisma.avatarConfig.update({
          where: { id: avatarConfigId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }

      // Update video agent
      const videoAgent = await prisma.videoAgent.update({
        where: { id },
        data: updateData,
        include: {
          agent: true,
          ttsConfig: true,
          avatarConfig: true,
        },
      });

      logger.info(`Video agent config switched: ${videoAgent.id}`);

      res.json({
        success: true,
        videoAgent,
        message: 'Configuration switched successfully',
      });
    } catch (error: any) {
      logger.error('Error switching config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to switch configuration',
      });
    }
  }

  /**
   * Get video agent analytics
   */
  async getVideoAgentAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const videoAgent = await prisma.videoAgent.findFirst({
        where: { id, organizationId },
        include: {
          sessions: {
            orderBy: { startedAt: 'desc' },
          },
        },
      });

      if (!videoAgent) {
        return res.status(404).json({
          success: false,
          error: 'Video agent not found',
        });
      }

      // Calculate analytics
      const totalSessions = videoAgent.sessions.length;
      const totalDuration = videoAgent.sessions.reduce((sum, s) => sum + s.duration, 0);
      const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
      const totalMessages = videoAgent.sessions.reduce((sum, s) => sum + s.messageCount, 0);
      const avgMessages = totalSessions > 0 ? totalMessages / totalSessions : 0;

      const ratings = videoAgent.sessions.filter(s => s.userRating !== null).map(s => s.userRating!);
      const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

      res.json({
        success: true,
        analytics: {
          totalConversations: videoAgent.totalConversations,
          totalMessages: videoAgent.totalMessages,
          totalSessions,
          avgSessionDuration: avgDuration,
          avgMessagesPerSession: avgMessages,
          avgRating,
          satisfactionScore: videoAgent.satisfactionScore,
          lastUsedAt: videoAgent.lastUsedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching video agent analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
      });
    }
  }
}

export const videoAgentsController = new VideoAgentsController();
