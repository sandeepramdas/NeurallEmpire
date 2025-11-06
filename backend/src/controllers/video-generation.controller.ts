/**
 * ==================== VIDEO GENERATION CONTROLLER ====================
 *
 * Main API controller for video generation requests.
 * Uses the orchestrator to manage provider selection and execution.
 *
 * @module controllers/video-generation
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse } from '@/types';
import { logger } from '@/infrastructure/logger';
import { createOrchestrator } from '@/services/video-generation/VideoGenerationOrchestrator';
import { VideoGenProviderType } from '@prisma/client';

// Validation schemas
const generateVideoSchema = z.object({
  // Source
  avatarImageUrl: z.string().url('Avatar image URL must be valid'),
  avatarType: z.enum(['REALISTIC', 'CARTOON', 'CUSTOM']).optional(),

  // Audio/Text input
  audioUrl: z.string().url().optional(),
  text: z.string().optional(),
  voice: z.string().optional(),

  // Video settings
  duration: z.number().positive().optional(),
  resolution: z.string().optional(),
  format: z.string().optional(),
  fps: z.number().positive().optional(),

  // Animation settings
  lipSync: z.boolean().optional(),
  eyeMovement: z.boolean().optional(),
  emotions: z.array(z.string()).optional(),
  background: z.string().optional(),

  // Provider selection
  providerType: z.nativeEnum(VideoGenProviderType).optional(),
  providerConfig: z.record(z.any()).optional(),

  // Webhook
  webhookUrl: z.string().url().optional(),

  // Metadata
  metadata: z.record(z.any()).optional(),
}).refine(
  (data) => data.audioUrl || data.text,
  {
    message: 'Either audioUrl or text must be provided',
    path: ['audioUrl'],
  }
);

const checkStatusSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  providerType: z.nativeEnum(VideoGenProviderType).optional(),
});

const cancelJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  providerType: z.nativeEnum(VideoGenProviderType).optional(),
});

const estimateCostSchema = z.object({
  avatarImageUrl: z.string().url('Avatar image URL must be valid'),
  duration: z.number().positive().optional(),
  resolution: z.string().optional(),
  providerType: z.nativeEnum(VideoGenProviderType).optional(),
});

/**
 * Video Generation Controller
 */
export class VideoGenerationController {
  /**
   * Generate a video
   * POST /api/video-generation/generate
   */
  async generateVideo(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request
      const validatedData = generateVideoSchema.parse(req.body);

      logger.info('Video generation requested', {
        organizationId,
        userId: req.user?.id,
        hasAudio: !!validatedData.audioUrl,
        hasText: !!validatedData.text,
        providerType: validatedData.providerType,
      });

      // Create orchestrator
      const orchestrator = createOrchestrator(organizationId);

      // Generate video
      const response = await orchestrator.generateVideo({
        avatarImageUrl: validatedData.avatarImageUrl,
        avatarType: validatedData.avatarType,
        audioUrl: validatedData.audioUrl,
        text: validatedData.text,
        voice: validatedData.voice,
        duration: validatedData.duration,
        resolution: validatedData.resolution,
        format: validatedData.format,
        fps: validatedData.fps,
        lipSync: validatedData.lipSync,
        eyeMovement: validatedData.eyeMovement,
        emotions: validatedData.emotions,
        background: validatedData.background,
        providerConfig: validatedData.providerConfig,
        webhookUrl: validatedData.webhookUrl,
        metadata: validatedData.metadata,
      });

      logger.info('Video generation initiated', {
        organizationId,
        jobId: response.jobId,
        status: response.status,
        provider: response.provider,
      });

      return res.status(202).json({
        success: true,
        data: response,
      } as ApiResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Video generation failed', {
        error: error.message,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Video generation failed',
      } as ApiResponse);
    }
  }

  /**
   * Check video generation job status
   * POST /api/video-generation/status
   */
  async checkStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request
      const validatedData = checkStatusSchema.parse(req.body);

      logger.debug('Checking video job status', {
        organizationId,
        jobId: validatedData.jobId,
        providerType: validatedData.providerType,
      });

      // Create orchestrator
      const orchestrator = createOrchestrator(organizationId);

      // Check status
      const response = await orchestrator.checkJobStatus(
        validatedData.jobId,
        validatedData.providerType
      );

      return res.json({
        success: true,
        data: response,
      } as ApiResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Status check failed', {
        error: error.message,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Status check failed',
      } as ApiResponse);
    }
  }

  /**
   * Cancel video generation job
   * POST /api/video-generation/cancel
   */
  async cancelJob(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request
      const validatedData = cancelJobSchema.parse(req.body);

      logger.info('Cancelling video job', {
        organizationId,
        jobId: validatedData.jobId,
        providerType: validatedData.providerType,
      });

      // Create orchestrator
      const orchestrator = createOrchestrator(organizationId);

      // Cancel job
      const cancelled = await orchestrator.cancelJob(
        validatedData.jobId,
        validatedData.providerType
      );

      if (cancelled) {
        return res.json({
          success: true,
          message: 'Job cancelled successfully',
        } as ApiResponse);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Failed to cancel job',
        } as ApiResponse);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Job cancellation failed', {
        error: error.message,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Job cancellation failed',
      } as ApiResponse);
    }
  }

  /**
   * Estimate cost for video generation
   * POST /api/video-generation/estimate-cost
   */
  async estimateCost(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Organization not found',
        } as ApiResponse);
      }

      // Validate request
      const validatedData = estimateCostSchema.parse(req.body);

      logger.debug('Estimating video cost', {
        organizationId,
        duration: validatedData.duration,
        providerType: validatedData.providerType,
      });

      // Create orchestrator
      const orchestrator = createOrchestrator(organizationId);

      // Estimate cost
      const cost = await orchestrator.estimateCost(
        {
          avatarImageUrl: validatedData.avatarImageUrl,
          duration: validatedData.duration,
          resolution: validatedData.resolution,
        },
        validatedData.providerType
      );

      return res.json({
        success: true,
        data: {
          estimatedCost: cost,
          currency: 'USD',
        },
      } as ApiResponse);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        } as ApiResponse);
      }

      logger.error('Cost estimation failed', {
        error: error.message,
        organizationId: req.user?.organizationId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Cost estimation failed',
      } as ApiResponse);
    }
  }
}

// Export singleton instance
export const videoGenerationController = new VideoGenerationController();
