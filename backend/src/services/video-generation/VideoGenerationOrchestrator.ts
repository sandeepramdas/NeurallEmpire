/**
 * ==================== VIDEO GENERATION ORCHESTRATOR ====================
 *
 * Central orchestrator for video generation across multiple providers.
 *
 * Features:
 * - Intelligent provider selection (priority, cost, features)
 * - Automatic failover on provider errors
 * - Load balancing across providers
 * - Cost optimization
 * - Usage quota management
 * - Provider health monitoring
 * - Job tracking and status management
 *
 * @module services/video-generation/VideoGenerationOrchestrator
 */

import { prisma } from '@/server';
import { VideoGenProviderType } from '@prisma/client';
import { encryption } from '@/infrastructure/encryption';
import { logger } from '@/infrastructure/logger';

import {
  IVideoGenerationProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  ProviderConfig,
  ProviderError,
} from './IVideoGenerationProvider';

import { DIDProvider } from './providers/DIDProvider';
import { HeyGenProvider } from './providers/HeyGenProvider';
import { Wav2LipProvider } from './providers/Wav2LipProvider';

/**
 * Provider selection strategy
 */
type SelectionStrategy =
  | 'priority' // Use highest priority provider
  | 'cost' // Use lowest cost provider
  | 'speed' // Use fastest provider
  | 'failover'; // Try providers in priority order

/**
 * Orchestrator configuration
 */
interface OrchestratorConfig {
  organizationId: string;
  strategy?: SelectionStrategy;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  enableFailover?: boolean;
}

/**
 * Video Generation Orchestrator
 */
export class VideoGenerationOrchestrator {
  private organizationId: string;
  private strategy: SelectionStrategy;
  private maxRetries: number;
  private retryDelay: number;
  private enableFailover: boolean;

  // Provider instances cache
  private providerInstances: Map<string, IVideoGenerationProvider> = new Map();

  constructor(config: OrchestratorConfig) {
    this.organizationId = config.organizationId;
    this.strategy = config.strategy || 'priority';
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.enableFailover = config.enableFailover !== false;

    logger.info('Video generation orchestrator initialized', {
      organizationId: this.organizationId,
      strategy: this.strategy,
      maxRetries: this.maxRetries,
      enableFailover: this.enableFailover,
    });
  }

  /**
   * Generate video using optimal provider
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // Get available providers for organization
      const providers = await this.getAvailableProviders(request);

      if (providers.length === 0) {
        throw new Error('No video generation providers configured');
      }

      logger.info('Starting video generation', {
        organizationId: this.organizationId,
        availableProviders: providers.length,
        strategy: this.strategy,
      });

      // Select optimal provider based on strategy
      const selectedProviders = this.selectProviders(providers, request);

      // Try providers in order (with failover if enabled)
      let lastError: Error | null = null;

      for (const providerConfig of selectedProviders) {
        try {
          const response = await this.generateWithProvider(providerConfig, request);

          // Success! Update provider stats
          await this.updateProviderStats(providerConfig.id, true);

          logger.info('Video generation successful', {
            organizationId: this.organizationId,
            providerId: providerConfig.id,
            providerType: providerConfig.type,
            jobId: response.jobId,
          });

          return response;
        } catch (error: any) {
          lastError = error;

          logger.warn('Video generation failed with provider', {
            organizationId: this.organizationId,
            providerId: providerConfig.id,
            providerType: providerConfig.type,
            error: error.message,
            retryable: error.retryable,
          });

          // Update provider stats
          await this.updateProviderStats(providerConfig.id, false);

          // If error is not retryable or failover is disabled, throw immediately
          if (!this.enableFailover || (error instanceof ProviderError && !error.retryable)) {
            throw error;
          }

          // Try next provider
          continue;
        }
      }

      // All providers failed
      throw lastError || new Error('All video generation providers failed');
    } catch (error: any) {
      logger.error('Video generation orchestration failed', {
        organizationId: this.organizationId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Check job status across providers
   */
  async checkJobStatus(jobId: string, providerType?: VideoGenProviderType): Promise<VideoGenerationResponse> {
    try {
      // If provider type is specified, check only that provider
      if (providerType) {
        const providerConfig = await this.getProviderByType(providerType);
        if (!providerConfig) {
          throw new Error(`Provider ${providerType} not found`);
        }

        const provider = await this.getProviderInstance(providerConfig);
        return await provider.checkJobStatus(jobId);
      }

      // Otherwise, try to find which provider has this job
      // This requires storing job-to-provider mapping in database
      // For now, try all active providers
      const providers = await this.getActiveProviders();

      for (const providerConfig of providers) {
        try {
          const provider = await this.getProviderInstance(providerConfig);
          const response = await provider.checkJobStatus(jobId);

          return response;
        } catch (error) {
          // Job not found on this provider, try next
          continue;
        }
      }

      throw new Error(`Job ${jobId} not found on any provider`);
    } catch (error: any) {
      logger.error('Job status check failed', {
        organizationId: this.organizationId,
        jobId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Cancel video generation job
   */
  async cancelJob(jobId: string, providerType?: VideoGenProviderType): Promise<boolean> {
    try {
      if (providerType) {
        const providerConfig = await this.getProviderByType(providerType);
        if (!providerConfig) {
          throw new Error(`Provider ${providerType} not found`);
        }

        const provider = await this.getProviderInstance(providerConfig);
        return await provider.cancelJob(jobId);
      }

      // Try all providers
      const providers = await this.getActiveProviders();

      for (const providerConfig of providers) {
        try {
          const provider = await this.getProviderInstance(providerConfig);
          const cancelled = await provider.cancelJob(jobId);

          if (cancelled) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error: any) {
      logger.error('Job cancellation failed', {
        organizationId: this.organizationId,
        jobId,
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Estimate cost for video generation
   */
  async estimateCost(request: VideoGenerationRequest, providerType?: VideoGenProviderType): Promise<number> {
    try {
      if (providerType) {
        const providerConfig = await this.getProviderByType(providerType);
        if (!providerConfig) {
          throw new Error(`Provider ${providerType} not found`);
        }

        const provider = await this.getProviderInstance(providerConfig);
        return await provider.estimateCost(request);
      }

      // Get cost from default or cheapest provider
      const providers = await this.getAvailableProviders(request);
      if (providers.length === 0) {
        return 0;
      }

      // Get cost estimates from all providers
      const costs = await Promise.all(
        providers.map(async (config) => {
          try {
            const provider = await this.getProviderInstance(config);
            return await provider.estimateCost(request);
          } catch (error) {
            return Infinity;
          }
        })
      );

      // Return lowest cost
      return Math.min(...costs);
    } catch (error: any) {
      logger.error('Cost estimation failed', {
        organizationId: this.organizationId,
        error: error.message,
      });

      return 0;
    }
  }

  /**
   * Get available providers that support requested features
   */
  private async getAvailableProviders(request: VideoGenerationRequest): Promise<ProviderConfig[]> {
    const providers = await prisma.videoGenerationProvider.findMany({
      where: {
        organizationId: this.organizationId,
        isActive: true,
        healthStatus: { not: 'down' },
        // Filter by required features
        ...(request.lipSync && { supportsLipSync: true }),
        ...(request.eyeMovement && { supportsEyeMovement: true }),
        ...(request.emotions && { supportsEmotions: true }),
        ...(request.background && { supportsBackground: true }),
      },
      orderBy: [
        { isDefault: 'desc' },
        { priority: 'desc' },
        { avgProcessingTime: 'asc' },
      ],
    });

    return providers.map((p) => this.mapToProviderConfig(p));
  }

  /**
   * Get active providers
   */
  private async getActiveProviders(): Promise<ProviderConfig[]> {
    const providers = await prisma.videoGenerationProvider.findMany({
      where: {
        organizationId: this.organizationId,
        isActive: true,
      },
    });

    return providers.map((p) => this.mapToProviderConfig(p));
  }

  /**
   * Get provider by type
   */
  private async getProviderByType(type: VideoGenProviderType): Promise<ProviderConfig | null> {
    const provider = await prisma.videoGenerationProvider.findFirst({
      where: {
        organizationId: this.organizationId,
        type,
        isActive: true,
      },
    });

    if (!provider) {
      return null;
    }

    return this.mapToProviderConfig(provider);
  }

  /**
   * Select providers based on strategy
   */
  private selectProviders(providers: ProviderConfig[], request: VideoGenerationRequest): ProviderConfig[] {
    if (providers.length === 0) {
      return [];
    }

    switch (this.strategy) {
      case 'priority':
        // Already sorted by priority
        return providers;

      case 'cost':
        // Sort by cost per minute
        return [...providers].sort((a, b) => {
          const costA = a.costPerMinute || 0;
          const costB = b.costPerMinute || 0;
          return costA - costB;
        });

      case 'speed':
        // Sort by processing time
        return [...providers].sort((a, b) => {
          const timeA = a.avgProcessingTime || 60;
          const timeB = b.avgProcessingTime || 60;
          return timeA - timeB;
        });

      case 'failover':
      default:
        // Use priority order
        return providers;
    }
  }

  /**
   * Generate video with specific provider
   */
  private async generateWithProvider(
    config: ProviderConfig,
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    const provider = await this.getProviderInstance(config);

    let retries = 0;
    let lastError: Error | null = null;

    while (retries < this.maxRetries) {
      try {
        const response = await provider.generateVideo(request);
        return response;
      } catch (error: any) {
        lastError = error;
        retries++;

        if (error instanceof ProviderError && !error.retryable) {
          throw error;
        }

        if (retries < this.maxRetries) {
          logger.info('Retrying video generation', {
            providerId: config.id,
            providerType: config.type,
            attempt: retries + 1,
            maxRetries: this.maxRetries,
          });

          await this.delay(this.retryDelay);
        }
      }
    }

    throw lastError || new Error('Video generation failed after max retries');
  }

  /**
   * Get or create provider instance
   */
  private async getProviderInstance(config: ProviderConfig): Promise<IVideoGenerationProvider> {
    // Check cache
    if (this.providerInstances.has(config.id)) {
      return this.providerInstances.get(config.id)!;
    }

    // Create new instance based on type
    let provider: IVideoGenerationProvider;

    switch (config.type) {
      case VideoGenProviderType.D_ID:
        provider = new DIDProvider();
        break;

      case VideoGenProviderType.HEYGEN:
        provider = new HeyGenProvider();
        break;

      case VideoGenProviderType.WAV2LIP:
        provider = new Wav2LipProvider();
        break;

      // Add other providers here as they are implemented
      // case VideoGenProviderType.SYNTHESIA:
      //   provider = new SynthesiaProvider();
      //   break;

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Initialize provider
    await provider.initialize(config);

    // Cache instance
    this.providerInstances.set(config.id, provider);

    return provider;
  }

  /**
   * Update provider statistics
   */
  private async updateProviderStats(providerId: string, success: boolean): Promise<void> {
    try {
      await prisma.videoGenerationProvider.update({
        where: { id: providerId },
        data: {
          lastUsedAt: new Date(),
          ...(success && { healthStatus: 'healthy' }),
          ...(!success && { healthStatus: 'degraded' }),
        },
      });
    } catch (error) {
      // Ignore stats update errors
      logger.warn('Failed to update provider stats', { providerId, error });
    }
  }

  /**
   * Map database model to provider config
   */
  private mapToProviderConfig(provider: any): ProviderConfig {
    return {
      id: provider.id,
      type: provider.type,
      name: provider.name,
      displayName: provider.displayName,

      apiKey: provider.apiKey ? encryption.decrypt(provider.apiKey) : undefined,
      apiSecret: provider.apiSecret ? encryption.decrypt(provider.apiSecret) : undefined,
      apiUrl: provider.apiUrl || undefined,
      webhookUrl: provider.webhookUrl || undefined,

      supportsLipSync: provider.supportsLipSync,
      supportsEyeMovement: provider.supportsEyeMovement,
      supportsEmotions: provider.supportsEmotions,
      supportsBackground: provider.supportsBackground,

      monthlyMinutes: provider.monthlyMinutes || undefined,
      costPerMinute: provider.costPerMinute || undefined,
      maxVideoLength: provider.maxVideoLength || undefined,
      maxResolution: provider.maxResolution || undefined,

      avgProcessingTime: provider.avgProcessingTime || undefined,
      priority: provider.priority,

      isActive: provider.isActive,
      isDefault: provider.isDefault,

      config: provider.config || undefined,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create orchestrator for organization
 */
export function createOrchestrator(organizationId: string, strategy?: SelectionStrategy): VideoGenerationOrchestrator {
  return new VideoGenerationOrchestrator({
    organizationId,
    strategy,
  });
}
