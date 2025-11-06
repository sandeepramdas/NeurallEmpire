/**
 * ==================== WAV2LIP VIDEO GENERATION PROVIDER ====================
 *
 * Wav2Lip self-hosted integration.
 * Open-source lip-sync solution that can be hosted on your own infrastructure.
 *
 * Features:
 * - Self-hosted (full control)
 * - No usage limits
 * - High-quality lip-sync
 * - Cost-effective at scale
 * - GPU acceleration support
 *
 * GitHub: https://github.com/Rudrabha/Wav2Lip
 *
 * @module services/video-generation/providers/Wav2LipProvider
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
 * Wav2Lip specific configuration
 */
interface Wav2LipConfig {
  // Processing options
  gpu_id?: number; // GPU device ID (-1 for CPU)
  batch_size?: number; // Batch size for processing
  quality?: 'low' | 'medium' | 'high';

  // Model options
  model?: 'wav2lip' | 'wav2lip_gan'; // GAN model for better quality

  // Video options
  fps?: number; // Frames per second
  pads?: [number, number, number, number]; // Face padding [top, bottom, left, right]
  face_det_batch_size?: number;
  wav2lip_batch_size?: number;

  // Advanced
  resize_factor?: number; // 1, 2, 4
  crop?: [number, number, number, number]; // Crop coordinates
  box?: [number, number, number, number]; // Face box
  rotate?: boolean; // Rotate video
  nosmooth?: boolean; // Don't smooth face detections
}

/**
 * Wav2Lip Provider Implementation
 * Expects a running Wav2Lip service (Flask/FastAPI)
 */
export class Wav2LipProvider extends BaseVideoGenerationProvider {
  readonly type = VideoGenProviderType.WAV2LIP;
  readonly name = 'Wav2Lip';

  private client?: AxiosInstance;

  /**
   * Initialize Wav2Lip client
   */
  async initialize(config: ProviderConfig): Promise<void> {
    await super.initialize(config);

    if (!this.config?.apiUrl) {
      throw new Error('Wav2Lip API URL is required (self-hosted endpoint)');
    }

    // Create axios instance
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      timeout: 300000, // 5 minutes (Wav2Lip can be slow)
    });

    logger.info('Wav2Lip provider initialized', {
      providerId: this.config.id,
      baseUrl: this.config.apiUrl,
    });
  }

  /**
   * Generate video using Wav2Lip
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      if (!request.audioUrl) {
        throw new ProviderError(
          'Wav2Lip requires pre-recorded audio (audioUrl)',
          this.type,
          'MISSING_AUDIO',
          false
        );
      }

      // Build Wav2Lip API request
      const wav2lipRequest: any = {
        face: request.avatarImageUrl, // Can be image or video URL
        audio: request.audioUrl,
      };

      // Add Wav2Lip specific config
      const wav2lipConfig = (this.config?.config as Wav2LipConfig) || {};
      if (wav2lipConfig.gpu_id !== undefined) {
        wav2lipRequest.gpu_id = wav2lipConfig.gpu_id;
      }
      if (wav2lipConfig.quality) {
        wav2lipRequest.quality = wav2lipConfig.quality;
      }
      if (wav2lipConfig.model) {
        wav2lipRequest.model = wav2lipConfig.model;
      }
      if (wav2lipConfig.fps) {
        wav2lipRequest.fps = wav2lipConfig.fps;
      }

      // Merge provider-specific config from request
      if (request.providerConfig) {
        Object.assign(wav2lipRequest, request.providerConfig);
      }

      logger.info('Creating Wav2Lip video', {
        providerId: this.config?.id,
        avatarUrl: request.avatarImageUrl,
        audioUrl: request.audioUrl,
      });

      // Submit generation request
      const response = await this.client!.post('/generate', wav2lipRequest);

      const jobId = response.data.job_id || response.data.task_id;

      // If synchronous processing (rare for Wav2Lip)
      if (response.data.video_url) {
        const processingTime = Date.now() - startTime;
        const cost = await this.estimateCost(request);

        return {
          success: true,
          status: 'completed',
          videoUrl: response.data.video_url,
          duration: response.data.duration,
          jobId,
          processingTime,
          cost,
          provider: this.type,
          providerJobId: jobId,
        };
      }

      logger.info('Wav2Lip video job created', {
        jobId,
        providerId: this.config?.id,
      });

      // Job is processing asynchronously
      return {
        success: true,
        status: 'processing',
        jobId,
        provider: this.type,
        providerJobId: jobId,
        estimatedCompletion: new Date(Date.now() + (this.config?.avgProcessingTime || 180) * 1000),
      };
    } catch (error: any) {
      logger.error('Wav2Lip video generation failed', {
        error: error.message,
        providerId: this.config?.id,
        response: error.response?.data,
      });

      throw new ProviderError(
        error.response?.data?.error || error.message || 'Video generation failed',
        this.type,
        error.response?.data?.error_code || 'GENERATION_FAILED',
        error.response?.status >= 500
      );
    }
  }

  /**
   * Check Wav2Lip job status
   */
  async checkJobStatus(jobId: string): Promise<VideoGenerationResponse> {
    this.ensureInitialized();

    try {
      const response = await this.client!.get(`/status/${jobId}`);

      const status = response.data.status;
      const videoUrl = response.data.video_url || response.data.result_url;

      logger.debug('Wav2Lip job status checked', {
        jobId,
        status,
        hasResult: !!videoUrl,
      });

      // Map Wav2Lip status to our status
      let mappedStatus: VideoGenerationResponse['status'];
      if (status === 'completed' || status === 'success' || status === 'done') {
        mappedStatus = 'completed';
      } else if (status === 'processing' || status === 'running') {
        mappedStatus = 'processing';
      } else if (status === 'failed' || status === 'error') {
        mappedStatus = 'failed';
      } else if (status === 'pending' || status === 'queued') {
        mappedStatus = 'queued';
      } else {
        mappedStatus = 'processing';
      }

      if (mappedStatus === 'completed' && videoUrl) {
        return {
          success: true,
          status: 'completed',
          videoUrl,
          duration: response.data.duration,
          jobId,
          provider: this.type,
          providerJobId: jobId,
          processingTime: response.data.processing_time,
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
        metadata: {
          progress: response.data.progress || 0,
        },
      };
    } catch (error: any) {
      logger.error('Wav2Lip status check failed', {
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
   * Cancel Wav2Lip job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.client!.delete(`/cancel/${jobId}`);

      logger.info('Wav2Lip job cancelled', { jobId });

      return true;
    } catch (error: any) {
      logger.error('Wav2Lip job cancellation failed', {
        error: error.message,
        jobId,
      });

      return false;
    }
  }

  /**
   * Check Wav2Lip health
   */
  async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Check health endpoint
      const response = await this.client!.get('/health');

      const responseTime = Date.now() - startTime;

      logger.debug('Wav2Lip health check passed', {
        responseTime,
        status: response.data,
      });

      return {
        healthy: response.data.status === 'ok' || response.data.healthy === true,
        status: response.data.status === 'ok' ? 'healthy' : 'degraded',
        responseTime,
        message: 'Wav2Lip service is operational',
        lastChecked: new Date(),
        capabilities: this.getCapabilities(),
        apiVersion: response.data.version,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      logger.error('Wav2Lip health check failed', {
        error: error.message,
        responseTime,
      });

      return {
        healthy: false,
        status: 'down',
        responseTime,
        message: error.message || 'Wav2Lip service is unavailable',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Estimate cost for Wav2Lip video generation
   * Since Wav2Lip is self-hosted, cost is based on compute resources
   */
  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // For self-hosted, cost is compute time
    // Estimate based on video duration and GPU usage

    const duration = request.duration || 60;
    const minutes = duration / 60;

    // Custom cost per minute from config (e.g., GPU compute cost)
    if (this.config?.costPerMinute) {
      return minutes * this.config.costPerMinute;
    }

    // Default: ~$0.05 per minute (estimated GPU compute cost)
    // Much cheaper than cloud services at scale
    return minutes * 0.05;
  }

  /**
   * Validate Wav2Lip configuration
   */
  async validateConfig(config: ProviderConfig): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!config.apiUrl) {
      errors.push('API URL is required (self-hosted endpoint)');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get Wav2Lip capabilities
   */
  getCapabilities(): string[] {
    return [
      'lip_sync',
      'audio_input',
      'self_hosted',
      'no_usage_limits',
      'gpu_acceleration',
      'batch_processing',
      'high_quality',
      'cost_effective',
    ];
  }

  /**
   * Get Wav2Lip config schema
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        gpu_id: {
          type: 'number',
          description: 'GPU device ID (-1 for CPU)',
          default: 0,
        },
        batch_size: {
          type: 'number',
          description: 'Batch size for processing',
          default: 128,
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Output quality',
          default: 'high',
        },
        model: {
          type: 'string',
          enum: ['wav2lip', 'wav2lip_gan'],
          description: 'Model to use (GAN for better quality)',
          default: 'wav2lip_gan',
        },
        fps: {
          type: 'number',
          description: 'Frames per second',
          default: 25,
        },
        pads: {
          type: 'array',
          items: { type: 'number' },
          description: 'Face padding [top, bottom, left, right]',
          default: [0, 10, 0, 0],
        },
        resize_factor: {
          type: 'number',
          enum: [1, 2, 4],
          description: 'Resize factor for processing',
          default: 1,
        },
        nosmooth: {
          type: 'boolean',
          description: "Don't smooth face detections",
          default: false,
        },
      },
    };
  }
}
