/**
 * ==================== RAG ORCHESTRATOR ====================
 *
 * Main orchestrator for Retrieval-Augmented Generation (RAG)
 *
 * Features:
 * - Context retrieval for agent queries
 * - Multi-source context aggregation
 * - Relevance scoring and ranking
 * - Source citation
 * - Context caching
 *
 * @module rag-system/rag-orchestrator
 */

import { semanticSearchService, SearchResult } from './semantic-search.service';
import { knowledgeBaseService } from './knowledge-base.service';
import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';

export interface RAGOptions {
  topK?: number;
  minScore?: number;
  includeTypes?: string[];
  excludeTypes?: string[];
  includeSources?: string[];
  excludeSources?: string[];
  tags?: string[];
  useCache?: boolean;
  cacheTTL?: number;
}

export interface RAGContext {
  query: string;
  results: SearchResult[];
  context: string;
  sources: Array<{
    id: string;
    title?: string;
    type: string;
    source?: string;
    score: number;
    excerpt: string;
  }>;
  metadata: {
    totalResults: number;
    avgScore: number;
    retrievalTime: number;
    cached: boolean;
  };
}

export interface ConversationMemory {
  userMessage: string;
  agentResponse: string;
  timestamp: Date;
  score: number;
}

export class RAGOrchestrator {
  private readonly DEFAULT_TOP_K = 5;
  private readonly DEFAULT_MIN_SCORE = 0.7;
  private readonly DEFAULT_CACHE_TTL = 60 * 10; // 10 minutes
  private readonly MAX_CONTEXT_LENGTH = 4000; // characters

  /**
   * Retrieve context for agent query
   */
  async retrieveContext(
    query: string,
    organizationId: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    const startTime = Date.now();

    try {
      const {
        topK = this.DEFAULT_TOP_K,
        minScore = this.DEFAULT_MIN_SCORE,
        includeTypes,
        excludeTypes,
        includeSources,
        excludeSources,
        tags,
        useCache = true,
        cacheTTL = this.DEFAULT_CACHE_TTL,
      } = options;

      // Check cache first
      if (useCache) {
        const cached = await this.getCachedContext(query, organizationId, options);
        if (cached) {
          return cached;
        }
      }

      // Perform semantic search
      logger.debug('Retrieving RAG context', {
        query: query.substring(0, 100),
        organizationId,
        topK,
        minScore,
      });

      const searchResults = await semanticSearchService.search(query, organizationId, {
        topK,
        minScore,
        includeContent: true,
      });

      // Filter by type
      let filtered = searchResults;

      if (includeTypes && includeTypes.length > 0) {
        filtered = filtered.filter((r) => includeTypes.includes(r.type));
      }

      if (excludeTypes && excludeTypes.length > 0) {
        filtered = filtered.filter((r) => !excludeTypes.includes(r.type));
      }

      if (includeSources && includeSources.length > 0) {
        filtered = filtered.filter((r) => r.source && includeSources.includes(r.source));
      }

      if (excludeSources && excludeSources.length > 0) {
        filtered = filtered.filter((r) => !r.source || !excludeSources.includes(r.source));
      }

      if (tags && tags.length > 0) {
        filtered = filtered.filter((r) => r.tags.some((t) => tags.includes(t)));
      }

      // Build context string
      const context = this.buildContextString(filtered);

      // Build sources array
      const sources = filtered.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        source: r.source,
        score: r.score,
        excerpt: this.createExcerpt(r.content || '', 200),
      }));

      // Calculate metadata
      const avgScore = filtered.length > 0
        ? filtered.reduce((sum, r) => sum + r.score, 0) / filtered.length
        : 0;

      const retrievalTime = Date.now() - startTime;

      const ragContext: RAGContext = {
        query,
        results: filtered,
        context,
        sources,
        metadata: {
          totalResults: filtered.length,
          avgScore,
          retrievalTime,
          cached: false,
        },
      };

      // Cache result
      if (useCache) {
        await this.cacheContext(query, organizationId, options, ragContext, cacheTTL);
      }

      logger.info('RAG context retrieved', {
        query: query.substring(0, 100),
        organizationId,
        resultsCount: filtered.length,
        avgScore,
        retrievalTime,
      });

      return ragContext;
    } catch (error) {
      logger.error('Failed to retrieve RAG context', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Retrieve context with conversation memory
   */
  async retrieveContextWithMemory(
    query: string,
    organizationId: string,
    agentId: string,
    userId: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    options: RAGOptions = {}
  ): Promise<RAGContext & { conversationMemory: ConversationMemory[] }> {
    try {
      // Get knowledge context
      const knowledgeContext = await this.retrieveContext(query, organizationId, options);

      // Search for relevant past conversations
      const conversationMemory = await this.searchConversationMemory(
        query,
        organizationId,
        agentId,
        userId,
        5 // top 5 relevant conversations
      );

      logger.info('RAG context with memory retrieved', {
        query: query.substring(0, 100),
        organizationId,
        agentId,
        knowledgeResults: knowledgeContext.results.length,
        conversationMemory: conversationMemory.length,
      });

      return {
        ...knowledgeContext,
        conversationMemory,
      };
    } catch (error) {
      logger.error('Failed to retrieve RAG context with memory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Search conversation memory
   */
  private async searchConversationMemory(
    query: string,
    organizationId: string,
    agentId: string,
    userId: string,
    limit: number = 5
  ): Promise<ConversationMemory[]> {
    try {
      // Search for relevant conversations using semantic search
      const results = await semanticSearchService.search(query, organizationId, {
        topK: limit,
        minScore: 0.6,
        type: 'conversation',
        includeContent: true,
      });

      return results.map((r) => ({
        userMessage: r.metadata.userMessage || '',
        agentResponse: r.content || '',
        timestamp: r.createdAt,
        score: r.score,
      }));
    } catch (error) {
      logger.warn('Failed to search conversation memory', { error });
      return [];
    }
  }

  /**
   * Store conversation for future retrieval
   */
  async storeConversation(
    organizationId: string,
    agentId: string,
    userId: string,
    userMessage: string,
    agentResponse: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Combine user message and agent response for embedding
      const content = `User: ${userMessage}\n\nAssistant: ${agentResponse}`;

      await knowledgeBaseService.createKnowledge({
        organizationId,
        content,
        type: 'conversation',
        source: `agent:${agentId}`,
        metadata: {
          ...metadata,
          agentId,
          userId,
          userMessage,
          agentResponse,
        },
        tags: ['conversation', 'agent-interaction'],
        createdBy: userId,
      });

      logger.debug('Conversation stored', {
        organizationId,
        agentId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to store conversation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        agentId,
      });
    }
  }

  /**
   * Build context string from search results
   */
  private buildContextString(results: SearchResult[]): string {
    let context = '';
    let currentLength = 0;

    for (const result of results) {
      if (!result.content) continue;

      // Build section header
      const header = `\n--- ${result.type.toUpperCase()}${result.title ? `: ${result.title}` : ''} (Relevance: ${(result.score * 100).toFixed(0)}%) ---\n`;

      // Check if adding this result would exceed max length
      if (currentLength + header.length + result.content.length > this.MAX_CONTEXT_LENGTH) {
        // Truncate content to fit
        const remainingSpace = this.MAX_CONTEXT_LENGTH - currentLength - header.length - 3;
        if (remainingSpace > 100) {
          context += header + result.content.substring(0, remainingSpace) + '...';
        }
        break;
      }

      context += header + result.content + '\n';
      currentLength += header.length + result.content.length + 1;
    }

    return context.trim();
  }

  /**
   * Create excerpt from content
   */
  private createExcerpt(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get cache key
   */
  private getCacheKey(
    query: string,
    organizationId: string,
    options: RAGOptions
  ): string {
    const optionsStr = JSON.stringify({
      topK: options.topK,
      minScore: options.minScore,
      includeTypes: options.includeTypes,
      excludeTypes: options.excludeTypes,
      includeSources: options.includeSources,
      excludeSources: options.excludeSources,
      tags: options.tags,
    });

    const hash = require('crypto')
      .createHash('sha256')
      .update(query + optionsStr)
      .digest('hex')
      .substring(0, 16);

    return `rag:${organizationId}:${hash}`;
  }

  /**
   * Get cached context
   */
  private async getCachedContext(
    query: string,
    organizationId: string,
    options: RAGOptions
  ): Promise<RAGContext | null> {
    try {
      const key = this.getCacheKey(query, organizationId, options);
      const cached = await redis.getJSON<RAGContext>(key);

      if (cached) {
        logger.debug('RAG context cache hit', {
          query: query.substring(0, 100),
          organizationId,
        });

        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
          },
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to get cached RAG context', { error });
      return null;
    }
  }

  /**
   * Cache context
   */
  private async cacheContext(
    query: string,
    organizationId: string,
    options: RAGOptions,
    context: RAGContext,
    ttl: number
  ): Promise<void> {
    try {
      const key = this.getCacheKey(query, organizationId, options);
      await redis.setJSON(key, context, ttl);

      logger.debug('RAG context cached', {
        query: query.substring(0, 100),
        organizationId,
        ttl,
      });
    } catch (error) {
      logger.warn('Failed to cache RAG context', { error });
    }
  }

  /**
   * Clear cache for organization
   */
  async clearCache(organizationId: string): Promise<void> {
    try {
      const pattern = `rag:${organizationId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.deleteMany(keys);
        logger.info('RAG cache cleared', {
          organizationId,
          keysDeleted: keys.length,
        });
      }
    } catch (error) {
      logger.error('Failed to clear RAG cache', { error });
      throw error;
    }
  }

  /**
   * Get RAG statistics
   */
  async getStats(organizationId: string): Promise<{
    knowledgeEntries: number;
    conversationEntries: number;
    cacheSize: number;
  }> {
    try {
      const [knowledgeStats, cacheKeys] = await Promise.all([
        knowledgeBaseService.getStats(organizationId),
        redis.keys(`rag:${organizationId}:*`),
      ]);

      const conversationEntries = knowledgeStats.byType['conversation'] || 0;

      return {
        knowledgeEntries: knowledgeStats.total - conversationEntries,
        conversationEntries,
        cacheSize: cacheKeys.length,
      };
    } catch (error) {
      logger.error('Failed to get RAG stats', { error });
      throw error;
    }
  }
}

// Singleton instance
export const ragOrchestrator = new RAGOrchestrator();

export default ragOrchestrator;
