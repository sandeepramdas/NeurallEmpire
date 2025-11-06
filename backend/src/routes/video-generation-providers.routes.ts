/**
 * ==================== VIDEO GENERATION PROVIDERS ROUTES ====================
 *
 * RESTful API routes for managing video generation provider configurations.
 * Supports D-ID, HeyGen, Synthesia, Wav2Lip, and custom providers.
 *
 * @module routes/video-generation-providers
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { videoGenerationProvidersController } from '../controllers/video-generation-providers.controller';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * @route   POST /api/video-generation-providers
 * @desc    Create a new video generation provider configuration
 * @access  Private (Authenticated users)
 * @body    {
 *   name: string,
 *   type: VideoGenProviderType,
 *   displayName: string,
 *   description?: string,
 *   logoUrl?: string,
 *   apiKey?: string,
 *   apiSecret?: string,
 *   apiUrl?: string,
 *   webhookUrl?: string,
 *   config?: object,
 *   supportsLipSync?: boolean,
 *   supportsEyeMovement?: boolean,
 *   supportsEmotions?: boolean,
 *   supportsBackground?: boolean,
 *   monthlyMinutes?: number,
 *   costPerMinute?: number,
 *   maxVideoLength?: number,
 *   maxResolution?: string,
 *   avgProcessingTime?: number,
 *   priority?: number,
 *   isActive?: boolean,
 *   isDefault?: boolean
 * }
 */
router.post(
  '/',
  videoGenerationProvidersController.createProvider.bind(videoGenerationProvidersController)
);

/**
 * @route   GET /api/video-generation-providers
 * @desc    Get all video generation providers for the organization
 * @access  Private (Authenticated users)
 * @query   {
 *   type?: VideoGenProviderType,
 *   isActive?: boolean,
 *   isDefault?: boolean
 * }
 */
router.get(
  '/',
  videoGenerationProvidersController.listProviders.bind(videoGenerationProvidersController)
);

/**
 * @route   GET /api/video-generation-providers/:id
 * @desc    Get a specific video generation provider by ID
 * @access  Private (Authenticated users)
 */
router.get(
  '/:id',
  videoGenerationProvidersController.getProvider.bind(videoGenerationProvidersController)
);

/**
 * @route   PUT /api/video-generation-providers/:id
 * @desc    Update a video generation provider configuration
 * @access  Private (Authenticated users)
 * @body    Partial of create body (any field can be updated)
 */
router.put(
  '/:id',
  videoGenerationProvidersController.updateProvider.bind(videoGenerationProvidersController)
);

/**
 * @route   DELETE /api/video-generation-providers/:id
 * @desc    Delete a video generation provider
 * @access  Private (Authenticated users)
 */
router.delete(
  '/:id',
  videoGenerationProvidersController.deleteProvider.bind(videoGenerationProvidersController)
);

/**
 * @route   POST /api/video-generation-providers/:id/test
 * @desc    Test video generation provider connection and health
 * @access  Private (Authenticated users)
 */
router.post(
  '/:id/test',
  videoGenerationProvidersController.testProvider.bind(videoGenerationProvidersController)
);

/**
 * @route   GET /api/video-generation-providers/:id/credentials
 * @desc    Get decrypted provider credentials (admin only)
 * @access  Private (Admin/Owner only)
 */
router.get(
  '/:id/credentials',
  videoGenerationProvidersController.getProviderCredentials.bind(videoGenerationProvidersController)
);

export default router;
