/**
 * ==================== VIDEO GENERATION PROVIDER INTERFACE ====================
 *
 * Base interface for all video generation providers.
 * Defines common methods that all providers must implement.
 *
 * Supported providers:
 * - D-ID: Photo-to-video with realistic lip-sync
 * - HeyGen: Professional AI avatars
 * - Synthesia: Enterprise-grade video generation
 * - Wav2Lip: Self-hosted lip-sync solution
 * - SadTalker: Advanced facial animation
 * - LivePortrait: Real-time portrait reenactment
 * - Murf.ai: Voice-focused generation
 * - Custom: User-defined integrations
 *
 * @module services/video-generation/IVideoGenerationProvider
 */

import { VideoGenProviderType } from '@prisma/client';

/**
 * Video generation request parameters
 */
export interface VideoGenerationRequest {
  // Source image/avatar
  avatarImageUrl: string;
  avatarType?: 'REALISTIC' | 'CARTOON' | 'CUSTOM';

  // Audio input
  audioUrl?: string; // Pre-recorded audio URL
  text?: string; // Text to convert to speech
  voice?: string; // Voice ID/name for TTS

  // Video settings
  duration?: number; // Video duration in seconds
  resolution?: string; // '720p', '1080p', '4K'
  format?: string; // 'mp4', 'webm', 'mov'
  fps?: number; // Frames per second (24, 30, 60)

  // Animation settings
  lipSync?: boolean; // Enable lip-sync
  eyeMovement?: boolean; // Enable eye movement
  emotions?: string[]; // Facial emotions to include
  background?: string; // Background image/video URL or color

  // Provider-specific options
  providerConfig?: Record<string, any>;

  // Webhook for async processing
  webhookUrl?: string;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Video generation response
 */
export interface VideoGenerationResponse {
  success: boolean;
  status: 'processing' | 'completed' | 'failed' | 'queued';

  // Video output
  videoUrl?: string; // Final video URL
  thumbnailUrl?: string; // Video thumbnail
  duration?: number; // Actual video duration

  // Processing info
  jobId?: string; // Provider's job/task ID
  processingTime?: number; // Time taken in milliseconds
  estimatedCompletion?: Date; // For async jobs

  // Cost tracking
  cost?: number; // Cost in USD
  creditsUsed?: number; // Provider credits consumed

  // Error handling
  error?: string;
  errorCode?: string;
  retryable?: boolean;

  // Provider info
  provider: VideoGenProviderType;
  providerJobId?: string;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Provider health check response
 */
export interface ProviderHealthCheck {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  responseTime: number; // in milliseconds
  message?: string;
  lastChecked: Date;

  // Provider-specific status
  quotaRemaining?: number; // Remaining quota/credits
  quotaLimit?: number; // Total quota/credits
  quotaResetDate?: Date; // When quota resets
  apiVersion?: string; // Provider API version
  capabilities?: string[]; // Available features
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: string;
  type: VideoGenProviderType;
  name: string;
  displayName: string;

  // Authentication
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  webhookUrl?: string;

  // Features
  supportsLipSync: boolean;
  supportsEyeMovement: boolean;
  supportsEmotions: boolean;
  supportsBackground: boolean;

  // Limits
  monthlyMinutes?: number;
  costPerMinute?: number;
  maxVideoLength?: number;
  maxResolution?: string;

  // Performance
  avgProcessingTime?: number;
  priority: number;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Provider-specific config
  config?: Record<string, any>;
}

/**
 * Video Generation Provider Interface
 *
 * All video generation providers must implement this interface.
 */
export interface IVideoGenerationProvider {
  /**
   * Provider type
   */
  readonly type: VideoGenProviderType;

  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Initialize the provider with configuration
   * @param config Provider configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Generate a video from avatar image and audio/text
   * @param request Video generation request
   * @returns Video generation response
   */
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;

  /**
   * Check the status of an ongoing video generation job
   * @param jobId Provider's job ID
   * @returns Current job status
   */
  checkJobStatus(jobId: string): Promise<VideoGenerationResponse>;

  /**
   * Cancel an ongoing video generation job
   * @param jobId Provider's job ID
   * @returns Cancellation success
   */
  cancelJob(jobId: string): Promise<boolean>;

  /**
   * Check provider health and availability
   * @returns Health check results
   */
  checkHealth(): Promise<ProviderHealthCheck>;

  /**
   * Estimate cost for video generation
   * @param request Video generation request
   * @returns Estimated cost in USD
   */
  estimateCost(request: VideoGenerationRequest): Promise<number>;

  /**
   * Validate configuration
   * @param config Provider configuration
   * @returns Validation result
   */
  validateConfig(config: ProviderConfig): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Get provider capabilities
   * @returns List of supported features
   */
  getCapabilities(): string[];

  /**
   * Get provider-specific configuration schema
   * @returns JSON schema for provider config
   */
  getConfigSchema(): Record<string, any>;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BaseVideoGenerationProvider implements IVideoGenerationProvider {
  protected config?: ProviderConfig;

  abstract readonly type: VideoGenProviderType;
  abstract readonly name: string;

  /**
   * Initialize provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid provider configuration: ${validation.errors?.join(', ')}`);
    }
    this.config = config;
  }

  /**
   * Check if provider is initialized
   */
  protected ensureInitialized(): void {
    if (!this.config) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
  }

  /**
   * Default implementation - subclasses should override
   */
  abstract generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  abstract checkJobStatus(jobId: string): Promise<VideoGenerationResponse>;
  abstract cancelJob(jobId: string): Promise<boolean>;
  abstract checkHealth(): Promise<ProviderHealthCheck>;
  abstract estimateCost(request: VideoGenerationRequest): Promise<number>;
  abstract validateConfig(config: ProviderConfig): Promise<{ valid: boolean; errors?: string[] }>;
  abstract getCapabilities(): string[];
  abstract getConfigSchema(): Record<string, any>;
}

/**
 * Provider factory error
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: VideoGenProviderType,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
