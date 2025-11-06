/**
 * ==================== HEYGEN VIDEO GENERATION PROVIDER ====================
 *
 * HeyGen AI Avatar integration.
 * Best for professional AI avatars and enterprise-grade video generation.
 *
 * Features:
 * - Professional AI avatars
 * - Multi-language support
 * - Custom voice cloning
 * - Background customization
 * - High-quality output
 *
 * API Documentation: https://docs.heygen.com/reference/api-overview
 *
 * @module services/video-generation/providers/HeyGenProvider
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
 * HeyGen API Configuration
 */
const HEYGEN_API_BASE_URL = 'https://api.heygen.com';
const HEYGEN_API_VERSION = 'v2';

/**
 * HeyGen specific configuration
 */
interface HeyGenConfig {
  // Video options
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3';
  background?: string; // Background image URL or color
  quality?: 'low' | 'medium' | 'high';

  // Avatar options
  avatar_style?: 'normal' | 'circle';
  avatar_position?: 'center' | 'left' | 'right';

  // Voice options
  voice_id?: string;
  voice_speed?: number; // 0.5 - 2.0
  voice_emotion?: 'friendly' | 'professional' | 'excited' | 'calm';

  // Advanced
  test?: boolean; // Test mode (free)
  caption?: boolean; // Add captions
  caption_language?: string;
}

/**
 * HeyGen Provider Implementation
 */
export class HeyGenProvider extends BaseVideoGenerationProvider {
  readonly type = VideoGenProviderType.HEYGEN;
  readonly name = 'HeyGen';

  private client?: AxiosInstance;

  /**
   * Initialize HeyGen client
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!this.config?.apiKey) {
      throw new Error('HeyGen API key is required');
    }

    // Create authenticated axios instance
    this.client = axios.create({
      baseURL: this.config.apiUrl || HEYGEN_API_BASE_URL,
      headers: {
        'X-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout
    });

    logger.info('HeyGen provider initialized', {
      providerId: this.config.id,
      baseUrl: this.config.apiUrl || HEYGEN_API_BASE_URL,
    });
  }

  /**
   * Generate video using HeyGen API
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Build HeyGen API request
      const heygenRequest: any = {
        video_inputs: [
          {
            character: {
              type: 'photo_avatar',
              photo_url: request.avatarImageUrl,
              avatar_style: 'normal',
            },
            voice: {
              type: request.audioUrl ? 'audio' : 'text',
            },
          },
        ],
      };

      // Audio or Text input
      if (request.audioUrl) {
        heygenRequest.video_inputs[0].voice.audio_url = request.audioUrl;
      } else if (request.text) {
        heygenRequest.video_inputs[0].voice.input_text = request.text;
        heygenRequest.video_inputs[0].voice.voice_id = request.voice || 'en-US-AriaNeural';
      } else {
        throw new ProviderError(
          'Either audioUrl or text must be provided',
          this.type,
          'MISSING_INPUT',
          false
        );
      }

      // Add HeyGen specific config
      const heygenConfig = (this.config?.config as HeyGenConfig) || {};
      if (heygenConfig.aspect_ratio) {
        heygenRequest.aspect_ratio = heygenConfig.aspect_ratio;
      }
      if (heygenConfig.background || request.background) {
        heygenRequest.video_inputs[0].background = request.background || heygenConfig.background;
      }
      if (heygenConfig.test) {
        heygenRequest.test = true;
      }
      if (heygenConfig.quality) {
        heygenRequest.quality = heygenConfig.quality;
      }

      // Merge provider-specific config from request
      if (request.providerConfig) {
        Object.assign(heygenRequest, request.providerConfig);
      }

      logger.info('Creating HeyGen video', {
        providerId: this.config?.id,
        avatarUrl: request.avatarImageUrl,
        hasAudio: !!request.audioUrl,
        hasText: !!request.text,
      });

      // Create video generation request
      const response = await this.client!.post('/v2/video/generate', heygenRequest);

      const jobId = response.data.video_id;

      logger.info('HeyGen video job created', {
        jobId,
        providerId: this.config?.id,
      });

      // HeyGen returns job ID, video is processing
      return {
        success: true,
        status: 'processing',
        jobId,
        provider: this.type,
        providerJobId: jobId,
        estimatedCompletion: new Date(Date.now() + (this.config?.avgProcessingTime || 120) * 1000),
      };
    } catch (error: any) {
      logger.error('HeyGen video generation failed', {
        error: error.message,
        providerId: this.config?.id,
        response: error.response?.data,
      });

      throw new ProviderError(
        error.response?.data?.message || error.message || 'Video generation failed',
        this.type,
        error.response?.data?.code || 'GENERATION_FAILED',
        error.response?.status >= 500
      );
    }
  }

  /**
   * Check HeyGen job status
   */
  async checkJobStatus(jobId: string): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const response = await this.client!.get(`/v1/video_status.get?video_id=${jobId}`);

      const status = response.data.status;
      const videoUrl = response.data.video_url;

      logger.debug('HeyGen job status checked', {
        jobId,
        status,
        hasResult: !!videoUrl,
      });

      // Map HeyGen status to our status
      let mappedStatus: VideoGenerationResponse['status'];
      if (status === 'completed') {
        mappedStatus = 'completed';
      } else if (status === 'processing' || status === 'pending') {
        mappedStatus = 'processing';
      } else if (status === 'failed') {
        mappedStatus = 'failed';
      } else {
        mappedStatus = 'queued';
      }

      if (mappedStatus === 'completed' && videoUrl) {
        return {
          success: true,
          status: 'completed',
          videoUrl,
          thumbnailUrl: response.data.thumbnail_url,
          duration: response.data.duration,
          jobId,
          provider: this.type,
          providerJobId: jobId,
          metadata: {
            callback_id: response.data.callback_id,
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
      logger.error('HeyGen status check failed', {
        error: error.message,
        jobId,
        response: error.response?.data,
      });

      throw new ProviderError(
        error.response?.data?.message || error.message || 'Status check failed',
        this.type,
        'STATUS_CHECK_FAILED',
        true
      );
    }
  }

  /**
   * Cancel HeyGen job (not supported)
   */
  async cancelJob(jobId: string): Promise<boolean> {
    logger.warn('HeyGen does not support job cancellation', { jobId });
    return false;
  }

  /**
   * Check HeyGen health
   */
  async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Check remaining quota
      const response = await this.client!.get('/v1/user.remaining_quota');

      const responseTime = Date.now() - startTime;

      logger.debug('HeyGen health check passed', {
        responseTime,
        quota: response.data,
      });

      return {
        healthy: true,
        status: 'healthy',
        responseTime,
        message: 'HeyGen API is operational',
        lastChecked: new Date(),
        quotaRemaining: response.data.remaining_credits,
        quotaLimit: response.data.total_credits,
        apiVersion: HEYGEN_API_VERSION,
        capabilities: this.getCapabilities(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error('HeyGen health check failed', {
        error: error.message,
        responseTime,
      });

      return {
        healthy: false,
        status: 'down',
        responseTime,
        message: error.message || 'HeyGen API is unavailable',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Estimate cost for HeyGen video generation
   */
  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // HeyGen pricing (as of 2024):
    // - Creator: $24/month for 15 credits
    // - Business: $120/month for 90 credits
    // - Enterprise: Custom pricing
    // - Each credit = 1 minute of video

    const duration = request.duration || 60; // Default 60 seconds
    const minutes = duration / 60;

    // Custom cost per minute from config
    if (this.config?.costPerMinute) {
      return minutes * this.config.costPerMinute;
    }

    // Default: ~$1.60 per credit/minute (Business plan)
    return minutes * 1.6;
  }

  /**
   * Validate HeyGen configuration
   */
  async validateConfig(config: ProviderConfig): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get HeyGen capabilities
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
      'custom_backgrounds',
      'voice_cloning',
      'professional_avatars',
    ];
  }

  /**
   * Get HeyGen config schema
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        aspect_ratio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:3'],
          description: 'Video aspect ratio',
          default: '16:9',
        },
        background: {
          type: 'string',
          description: 'Background image URL or color',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Video quality',
          default: 'high',
        },
        avatar_style: {
          type: 'string',
          enum: ['normal', 'circle'],
          default: 'normal',
        },
        avatar_position: {
          type: 'string',
          enum: ['center', 'left', 'right'],
          default: 'center',
        },
        voice_id: {
          type: 'string',
          description: 'Voice ID for text-to-speech',
        },
        voice_speed: {
          type: 'number',
          minimum: 0.5,
          maximum: 2.0,
          description: 'Voice speed multiplier',
          default: 1.0,
        },
        voice_emotion: {
          type: 'string',
          enum: ['friendly', 'professional', 'excited', 'calm'],
          description: 'Voice emotion',
        },
        test: {
          type: 'boolean',
          description: 'Test mode (free, adds watermark)',
          default: false,
        },
        caption: {
          type: 'boolean',
          description: 'Add captions to video',
          default: false,
        },
      },
    };
  }
}
