/**
 * ==================== EMBEDDINGS SERVICE ====================
 *
 * Service for generating text embeddings using OpenAI
 *
 * Features:
 * - Text embedding generation
 * - Batch processing
 * - Caching for performance
 * - Multiple model support
 * - Cost tracking
 *
 * @module rag-system/embeddings-service
 */

import OpenAI from 'openai';
import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';
import crypto from 'crypto';

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokens: number;
  cached: boolean;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    text: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  totalTokens: number;
  cost: number;
}

export class EmbeddingsService {
  private client: OpenAI | null = null;
  private isInitialized: boolean = false;

  // Model configurations
  private readonly MODEL_CONFIG = {
    'text-embedding-3-small': {
      dimensions: 1536,
      costPer1kTokens: 0.00002, // $0.00002 per 1K tokens
      maxTokens: 8191,
    },
    'text-embedding-3-large': {
      dimensions: 3072,
      costPer1kTokens: 0.00013, // $0.00013 per 1K tokens
      maxTokens: 8191,
    },
    'text-embedding-ada-002': {
      dimensions: 1536,
      costPer1kTokens: 0.0001, // $0.0001 per 1K tokens
      maxTokens: 8191,
    },
  };

  private readonly DEFAULT_MODEL = 'text-embedding-3-small';
  private readonly DEFAULT_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
  private readonly MAX_BATCH_SIZE = 100; // OpenAI limit

  /**
   * Initialize OpenAI client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      this.client = new OpenAI({
        apiKey,
      });

      this.isInitialized = true;

      logger.info('Embeddings service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize embeddings service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.client || !this.isInitialized) {
      throw new Error('Embeddings service not initialized. Call initialize() first.');
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    this.ensureInitialized();

    const {
      model = this.DEFAULT_MODEL,
      dimensions,
      cache = true,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = options;

    try {
      // Check cache first
      if (cache) {
        const cached = await this.getCachedEmbedding(text, model, dimensions);
        if (cached) {
          return cached;
        }
      }

      // Prepare request
      const requestParams: any = {
        model,
        input: text,
      };

      // Add dimensions if specified (only for text-embedding-3 models)
      if (dimensions && model.startsWith('text-embedding-3')) {
        requestParams.dimensions = dimensions;
      }

      // Generate embedding
      const response = await this.client!.embeddings.create(requestParams);

      const embedding = response.data[0].embedding;
      const tokens = response.usage.total_tokens;

      const result: EmbeddingResult = {
        embedding,
        model,
        dimensions: dimensions || this.MODEL_CONFIG[model].dimensions,
        tokens,
        cached: false,
      };

      // Cache result
      if (cache) {
        await this.cacheEmbedding(text, model, dimensions, result, cacheTTL);
      }

      logger.debug('Embedding generated', {
        model,
        textLength: text.length,
        tokens,
        dimensions: result.dimensions,
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    this.ensureInitialized();

    const { model = this.DEFAULT_MODEL, dimensions, cache = true } = options;

    try {
      const embeddings: BatchEmbeddingResult['embeddings'] = [];
      let totalTokens = 0;

      // Process in batches (OpenAI has a limit)
      for (let i = 0; i < texts.length; i += this.MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + this.MAX_BATCH_SIZE);

        // Check cache for each text
        const uncachedIndices: number[] = [];
        const uncachedTexts: string[] = [];

        for (let j = 0; j < batch.length; j++) {
          const globalIndex = i + j;
          const text = batch[j];

          if (cache) {
            const cached = await this.getCachedEmbedding(text, model, dimensions);
            if (cached) {
              embeddings.push({
                text,
                embedding: cached.embedding,
                index: globalIndex,
              });
              totalTokens += cached.tokens;
              continue;
            }
          }

          uncachedIndices.push(globalIndex);
          uncachedTexts.push(text);
        }

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
          const requestParams: any = {
            model,
            input: uncachedTexts,
          };

          if (dimensions && model.startsWith('text-embedding-3')) {
            requestParams.dimensions = dimensions;
          }

          const response = await this.client!.embeddings.create(requestParams);

          for (let j = 0; j < response.data.length; j++) {
            const embedding = response.data[j].embedding;
            const text = uncachedTexts[j];
            const index = uncachedIndices[j];

            embeddings.push({
              text,
              embedding,
              index,
            });

            // Cache individual embedding
            if (cache) {
              const result: EmbeddingResult = {
                embedding,
                model,
                dimensions: dimensions || this.MODEL_CONFIG[model].dimensions,
                tokens: Math.ceil(text.length / 4), // Rough estimate
                cached: false,
              };

              await this.cacheEmbedding(text, model, dimensions, result, this.DEFAULT_CACHE_TTL);
            }
          }

          totalTokens += response.usage.total_tokens;
        }
      }

      // Sort by original index
      embeddings.sort((a, b) => a.index - b.index);

      // Calculate cost
      const cost = this.calculateCost(totalTokens, model);

      logger.info('Batch embeddings generated', {
        model,
        textCount: texts.length,
        totalTokens,
        cost,
      });

      return {
        embeddings,
        model,
        totalTokens,
        cost,
      };
    } catch (error) {
      logger.error('Failed to generate batch embeddings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
        textCount: texts.length,
      });
      throw error;
    }
  }

  /**
   * Calculate embedding cost
   */
  private calculateCost(tokens: number, model: string): number {
    const config = this.MODEL_CONFIG[model as keyof typeof this.MODEL_CONFIG];
    if (!config) {
      return 0;
    }

    return (tokens / 1000) * config.costPer1kTokens;
  }

  /**
   * Get cache key for embedding
   */
  private getCacheKey(text: string, model: string, dimensions?: number): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
    return `embedding:${model}:${dimensions || 'default'}:${hash}`;
  }

  /**
   * Get cached embedding
   */
  private async getCachedEmbedding(
    text: string,
    model: string,
    dimensions?: number
  ): Promise<EmbeddingResult | null> {
    try {
      const key = this.getCacheKey(text, model, dimensions);
      const cached = await redis.getJSON<EmbeddingResult>(key);

      if (cached) {
        logger.debug('Embedding cache hit', { model, textLength: text.length });
        return {
          ...cached,
          cached: true,
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to get cached embedding', { error });
      return null;
    }
  }

  /**
   * Cache embedding
   */
  private async cacheEmbedding(
    text: string,
    model: string,
    dimensions: number | undefined,
    result: EmbeddingResult,
    ttl: number
  ): Promise<void> {
    try {
      const key = this.getCacheKey(text, model, dimensions);
      await redis.setJSON(key, result, ttl);

      logger.debug('Embedding cached', { model, textLength: text.length });
    } catch (error) {
      logger.warn('Failed to cache embedding', { error });
    }
  }

  /**
   * Clear embedding cache
   */
  async clearCache(pattern: string = 'embedding:*'): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.deleteMany(keys);
        logger.info('Embedding cache cleared', { keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Failed to clear embedding cache', { error });
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<{
    cacheSize: number;
    modelsUsed: string[];
  }> {
    try {
      const keys = await redis.keys('embedding:*');

      const modelsSet = new Set<string>();
      for (const key of keys.slice(0, 100)) {
        // Sample first 100
        const parts = key.split(':');
        if (parts.length >= 2) {
          modelsSet.add(parts[1]);
        }
      }

      return {
        cacheSize: keys.length,
        modelsUsed: Array.from(modelsSet),
      };
    } catch (error) {
      logger.error('Failed to get embedding stats', { error });
      throw error;
    }
  }

  /**
   * Estimate tokens for text
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for text
   */
  estimateCost(text: string, model: string = this.DEFAULT_MODEL): number {
    const tokens = this.estimateTokens(text);
    return this.calculateCost(tokens, model);
  }

  /**
   * Get model configuration
   */
  getModelConfig(model: string) {
    return this.MODEL_CONFIG[model as keyof typeof this.MODEL_CONFIG];
  }

  /**
   * List available models
   */
  listModels(): string[] {
    return Object.keys(this.MODEL_CONFIG);
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const embeddingsService = new EmbeddingsService();

// Auto-initialize on module load
embeddingsService.initialize().catch((error) => {
  logger.error('Failed to auto-initialize embeddings service', { error });
});

export default embeddingsService;
