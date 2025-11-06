/**
 * ==================== D-ID VIDEO GENERATION PROVIDER ====================
 *
 * D-ID Creative Reality Studio integration.
 * Best for photo-to-video with realistic lip-sync and facial animations.
 *
 * Features:
 * - High-quality lip-sync
 * - Natural facial expressions
 * - Multiple languages support
 * - HD video output
 * - Fast processing (~30-60 seconds)
 *
 * API Documentation: https://docs.d-id.com/reference/api-overview
 *
 * @module services/video-generation/providers/DIDProvider
 */

import axios, { AxiosInstance } from 'axios';
import { VideoGenProviderType } from '@prisma/client';
import {
  BaseVideoGenerationProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  ProviderHealthCheck,
  ProviderConfig,
  ProviderError,
} from '../IVideoGenerationProvider';
import { logger } from '@/infrastructure/logger';

/**
 * D-ID API Configuration
 */
const DID_API_BASE_URL = 'https://api.d-id.com';
const DID_API_VERSION = 'v1';

/**
 * D-ID specific configuration
 */
interface DIDConfig {
  // Driver options
  driver_expressions?: {
    expressions?: Array<{
      start_frame: number;
      expression: 'neutral' | 'happy' | 'serious' | 'surprise';
      intensity: number; // 0-1
    }>;
  };

  // Speech options
  fluent?: boolean; // More natural speech
  pad_audio?: number; // Padding in seconds

  // Video options
  result_format?: 'mp4' | 'gif' | 'wav';
  crop?: {
    type: 'wide' | 'square' | 'vertical';
  };

  // Advanced
  face?: {
    detection_threshold?: number; // 0-1
    detection_confidence?: number; // 0-1
    mask_confidence?: number; // 0-1
    top_p?: number; // 0-1
  };

  // Stitch - merge multiple clips
  stitch?: boolean;
}

/**
 * D-ID Provider Implementation
 */
export class DIDProvider extends BaseVideoGenerationProvider {
  readonly type = VideoGenProviderType.D_ID;
  readonly name = 'D-ID';

  private client?: AxiosInstance;

  /**
   * Initialize D-ID client
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!this.config?.apiKey) {
      throw new Error('D-ID API key is required');
    }

    // Create authenticated axios instance
    this.client = axios.create({
      baseURL: this.config.apiUrl || DID_API_BASE_URL,
      headers: {
        'Authorization': `Basic ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout
    });

    logger.info('D-ID provider initialized', {
      providerId: this.config.id,
      baseUrl: this.config.apiUrl || DID_API_BASE_URL,
    });
  }

  /**
   * Generate video using D-ID API
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Build D-ID API request
      const didRequest: any = {
        source_url: request.avatarImageUrl,
      };

      // Audio or Text input
      if (request.audioUrl) {
        didRequest.script = {
          type: 'audio',
          audio_url: request.audioUrl,
        };
      } else if (request.text) {
        didRequest.script = {
          type: 'text',
          input: request.text,
          provider: {
            type: 'microsoft', // Default TTS provider
            voice_id: request.voice || 'en-US-JennyNeural',
          },
        };
      } else {
        throw new ProviderError(
          'Either audioUrl or text must be provided',
          this.type,
          'MISSING_INPUT',
          false
        );
      }

      // Add D-ID specific config
      const didConfig = (this.config?.config as DIDConfig) || {};
      if (didConfig.driver_expressions) {
        didRequest.driver_expressions = didConfig.driver_expressions;
      }
      if (didConfig.fluent !== undefined) {
        didRequest.config = { fluent: didConfig.fluent };
      }
      if (didConfig.result_format) {
        didRequest.config = { ...didRequest.config, result_format: didConfig.result_format };
      }

      // Merge provider-specific config from request
      if (request.providerConfig) {
        didRequest.config = { ...didRequest.config, ...request.providerConfig };
      }

      logger.info('Creating D-ID video', {
        providerId: this.config?.id,
        avatarUrl: request.avatarImageUrl,
        hasAudio: !!request.audioUrl,
        hasText: !!request.text,
      });

      // Create talk (video generation job)
      const response = await this.client!.post('/talks', didRequest);

      const jobId = response.data.id;
      const status = response.data.status;

      logger.info('D-ID video job created', {
        jobId,
        status,
        providerId: this.config?.id,
      });

      // If job is already done (rare), return video URL
      if (status === 'done' && response.data.result_url) {
        const processingTime = Date.now() - startTime;
        const duration = response.data.duration || request.duration;
        const cost = await this.estimateCost(request);

        return {
          success: true,
          status: 'completed',
          videoUrl: response.data.result_url,
          duration,
          jobId,
          processingTime,
          cost,
          provider: this.type,
          providerJobId: jobId,
        };
      }

      // Job is processing, return pending status
      return {
        success: true,
        status: 'processing',
        jobId,
        provider: this.type,
        providerJobId: jobId,
        estimatedCompletion: new Date(Date.now() + (this.config?.avgProcessingTime || 45) * 1000),
      };
    } catch (error: any) {
      logger.error('D-ID video generation failed', {
        error: error.message,
        providerId: this.config?.id,
        response: error.response?.data,
      });

      throw new ProviderError(
        error.response?.data?.error || error.message || 'Video generation failed',
        this.type,
        error.response?.data?.error_code || 'GENERATION_FAILED',
        error.response?.status >= 500 // Retry on server errors
      );
    }
  }

  /**
   * Check D-ID job status
   */
  async checkJobStatus(jobId: string): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const response = await this.client!.get(`/talks/${jobId}`);

      const status = response.data.status;
      const resultUrl = response.data.result_url;

      logger.debug('D-ID job status checked', {
        jobId,
        status,
        hasResult: !!resultUrl,
      });

      // Map D-ID status to our status
      let mappedStatus: VideoGenerationResponse['status'];
      if (status === 'done') {
        mappedStatus = 'completed';
      } else if (status === 'started' || status === 'created') {
        mappedStatus = 'processing';
      } else if (status === 'error' || status === 'rejected') {
        mappedStatus = 'failed';
      } else {
        mappedStatus = 'queued';
      }

      if (mappedStatus === 'completed' && resultUrl) {
        return {
          success: true,
          status: 'completed',
          videoUrl: resultUrl,
          duration: response.data.duration,
          jobId,
          provider: this.type,
          providerJobId: jobId,
          metadata: {
            created_at: response.data.created_at,
            started_at: response.data.started_at,
          },
        };
      }

      if (mappedStatus === 'failed') {
        return {
          success: false,
          status: 'failed',
          jobId,
          provider: this.type,
          providerJobId: jobId,
          error: response.data.error || 'Video generation failed',
          errorCode: 'GENERATION_FAILED',
          retryable: false,
        };
      }

      // Still processing
      return {
        success: true,
        status: mappedStatus,
        jobId,
        provider: this.type,
        providerJobId: jobId,
      };
    } catch (error: any) {
      logger.error('D-ID status check failed', {
        error: error.message,
        jobId,
        response: error.response?.data,
      });

      throw new ProviderError(
        error.response?.data?.error || error.message || 'Status check failed',
        this.type,
        'STATUS_CHECK_FAILED',
        true
      );
    }
  }

  /**
   * Cancel D-ID job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.client!.delete(`/talks/${jobId}`);

      logger.info('D-ID job cancelled', { jobId });

      return true;
    } catch (error: any) {
      logger.error('D-ID job cancellation failed', {
        error: error.message,
        jobId,
      });

      return false;
    }
  }

  /**
   * Check D-ID health
   */
  async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Check credits/quota
      const response = await this.client!.get('/credits');

      const responseTime = Date.now() - startTime;

      logger.debug('D-ID health check passed', {
        responseTime,
        credits: response.data,
      });

      return {
        healthy: true,
        status: 'healthy',
        responseTime,
        message: 'D-ID API is operational',
        lastChecked: new Date(),
        quotaRemaining: response.data.remaining,
        quotaLimit: response.data.total,
        apiVersion: DID_API_VERSION,
        capabilities: this.getCapabilities(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error('D-ID health check failed', {
        error: error.message,
        responseTime,
      });

      return {
        healthy: false,
        status: 'down',
        responseTime,
        message: error.message || 'D-ID API is unavailable',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Estimate cost for D-ID video generation
   */
  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // D-ID pricing (as of 2024):
    // - Basic: $0.03 per video credit
    // - Each video = 1 credit
    // - HD videos may cost more credits

    const baseCredits = 1;
    const resolution = request.resolution || this.config?.maxResolution || '720p';

    // HD/4K costs more
    let credits = baseCredits;
    if (resolution === '1080p') {
      credits = 1.5;
    } else if (resolution === '4K') {
      credits = 2;
    }

    // Custom cost per minute from config
    if (this.config?.costPerMinute && request.duration) {
      return (request.duration / 60) * this.config.costPerMinute;
    }

    // Default: $0.03 per credit
    return credits * 0.03;
  }

  /**
   * Validate D-ID configuration
   */
  async validateConfig(config: ProviderConfig): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (config.apiKey && !config.apiKey.includes(':')) {
      errors.push('D-ID API key should be in format "username:password" for Basic auth');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get D-ID capabilities
   */
  getCapabilities(): string[] {
    return [
      'lip_sync',
      'facial_expressions',
      'head_movement',
      'eye_blink',
      'text_to_speech',
      'audio_input',
      'hd_output',
      'multi_language',
      'custom_emotions',
      'fast_processing',
    ];
  }

  /**
   * Get D-ID config schema
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        driver_expressions: {
          type: 'object',
          description: 'Control facial expressions',
          properties: {
            expressions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start_frame: { type: 'number' },
                  expression: { type: 'string', enum: ['neutral', 'happy', 'serious', 'surprise'] },
                  intensity: { type: 'number', minimum: 0, maximum: 1 },
                },
              },
            },
          },
        },
        fluent: {
          type: 'boolean',
          description: 'Enable more natural speech',
          default: true,
        },
        pad_audio: {
          type: 'number',
          description: 'Audio padding in seconds',
          default: 0,
        },
        result_format: {
          type: 'string',
          enum: ['mp4', 'gif', 'wav'],
          default: 'mp4',
        },
        crop: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['wide', 'square', 'vertical'] },
          },
        },
      },
    };
  }
}
