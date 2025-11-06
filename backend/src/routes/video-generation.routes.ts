/**
 * ==================== VIDEO GENERATION ROUTES ====================
 *
 * RESTful API routes for video generation operations.
 *
 * @module routes/video-generation
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { videoGenerationController } from '../controllers/video-generation.controller';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   POST /api/video-generation/generate
 * @desc    Generate a video from avatar image and audio/text
 * @access  Private (Authenticated users)
 * @body    {
 *   avatarImageUrl: string (required),
 *   audioUrl?: string,
 *   text?: string,
 *   voice?: string,
 *   duration?: number,
 *   resolution?: string,
 *   format?: string,
 *   fps?: number,
 *   lipSync?: boolean,
 *   eyeMovement?: boolean,
 *   emotions?: string[],
 *   background?: string,
 *   providerType?: VideoGenProviderType,
 *   providerConfig?: object,
 *   webhookUrl?: string,
 *   metadata?: object
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     jobId: string,
 *     status: 'processing' | 'completed' | 'failed' | 'queued',
 *     videoUrl?: string,
 *     estimatedCompletion?: Date,
 *     provider: string
 *   }
 * }
 */
router.post(
  '/generate',
  videoGenerationController.generateVideo.bind(videoGenerationController)
);

/**
 * @route   POST /api/video-generation/status
 * @desc    Check the status of a video generation job
 * @access  Private (Authenticated users)
 * @body    {
 *   jobId: string (required),
 *   providerType?: VideoGenProviderType
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     jobId: string,
 *     status: 'processing' | 'completed' | 'failed' | 'queued',
 *     videoUrl?: string,
 *     duration?: number,
 *     processingTime?: number,
 *     error?: string
 *   }
 * }
 */
router.post(
  '/status',
  videoGenerationController.checkStatus.bind(videoGenerationController)
);

/**
 * @route   POST /api/video-generation/cancel
 * @desc    Cancel a video generation job
 * @access  Private (Authenticated users)
 * @body    {
 *   jobId: string (required),
 *   providerType?: VideoGenProviderType
 * }
 * @returns {
 *   success: boolean,
 *   message: string
 * }
 */
router.post(
  '/cancel',
  videoGenerationController.cancelJob.bind(videoGenerationController)
);

/**
 * @route   POST /api/video-generation/estimate-cost
 * @desc    Estimate the cost of video generation
 * @access  Private (Authenticated users)
 * @body    {
 *   avatarImageUrl: string (required),
 *   duration?: number,
 *   resolution?: string,
 *   providerType?: VideoGenProviderType
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     estimatedCost: number,
 *     currency: string
 *   }
 * }
 */
router.post(
  '/estimate-cost',
  videoGenerationController.estimateCost.bind(videoGenerationController)
);

export default router;
