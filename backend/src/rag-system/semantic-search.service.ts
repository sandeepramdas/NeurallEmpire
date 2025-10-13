/**
 * ==================== SEMANTIC SEARCH SERVICE ====================
 *
 * Service for semantic search using vector similarity
 *
 * Features:
 * - Vector similarity search
 * - Hybrid search (keyword + semantic)
 * - Result ranking and filtering
 * - Query rewriting
 * - Search analytics
 *
 * @module rag-system/semantic-search-service
 */

import { PrismaClient } from '@prisma/client';
import { pineconeClient } from './pinecone.client';
import { embeddingsService } from './embeddings.service';
import { knowledgeBaseService } from './knowledge-base.service';
import { logger } from '../infrastructure/logger';

const prisma = new PrismaClient();

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  type?: string;
  source?: string;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  includeContent?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  content?: string;
  title?: string;
  type: string;
  source?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  relevanceReason?: string;
}

export interface HybridSearchOptions extends SearchOptions {
  semanticWeight?: number; // 0-1, weight of semantic vs keyword
  keywordFields?: string[]; // fields to search with keywords
}

export interface SearchAnalytics {
  query: string;
  organizationId: string;
  userId?: string;
  resultsCount: number;
  topScore: number;
  duration: number;
  timestamp: Date;
}

export class SemanticSearchService {
  private readonly DEFAULT_TOP_K = 10;
  private readonly DEFAULT_MIN_SCORE = 0.7;
  private readonly DEFAULT_NAMESPACE = 'knowledge';

  /**
   * Semantic search using vector similarity
   */
  async search(
    query: string,
    organizationId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      const {
        topK = this.DEFAULT_TOP_K,
        minScore = this.DEFAULT_MIN_SCORE,
        type,
        source,
        tags,
        dateRange,
        includeContent = true,
      } = options;

      // Generate query embedding
      logger.debug('Generating query embedding', {
        query: query.substring(0, 100),
        organizationId,
      });

      const embeddingResult = await embeddingsService.generateEmbedding(query);

      // Build filter
      const filter: Record<string, any> = {
        organizationId,
      };

      if (type) {
        filter.type = type;
      }

      if (source) {
        filter.source = source;
      }

      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      if (dateRange) {
        if (dateRange.start) {
          filter.createdAt = { ...filter.createdAt, $gte: dateRange.start.toISOString() };
        }
        if (dateRange.end) {
          filter.createdAt = { ...filter.createdAt, $lte: dateRange.end.toISOString() };
        }
      }

      // Query vector database
      const namespace = this.getNamespace(organizationId);
      const vectorResults = await pineconeClient.query(embeddingResult.embedding, {
        topK: topK * 2, // Get more results to filter
        filter,
        includeMetadata: true,
        namespace,
      });

      // Filter by minimum score
      const filteredResults = vectorResults.filter((r) => r.score >= minScore);

      // If includeContent, fetch full content from database
      let results: SearchResult[];

      if (includeContent && filteredResults.length > 0) {
        const ids = filteredResults.map((r) => r.id);

        const entries = await prisma.knowledgeBaseEntry.findMany({
          where: {
            id: { in: ids },
            organizationId,
          },
        });

        const entryMap = new Map(entries.map((e) => [e.id, e]));

        results = filteredResults
          .map((r) => {
            const entry = entryMap.get(r.id);
            if (!entry) return null;

            return {
              id: r.id,
              score: r.score,
              content: entry.content,
              title: entry.title || undefined,
              type: entry.type,
              source: entry.source || undefined,
              tags: entry.tags as string[],
              metadata: entry.metadata as Record<string, any>,
              createdAt: entry.createdAt,
              relevanceReason: this.generateRelevanceReason(r.score, entry.type),
            };
          })
          .filter((r): r is SearchResult => r !== null);
      } else {
        results = filteredResults.map((r) => ({
          id: r.id,
          score: r.score,
          title: (r.metadata?.title as string) || undefined,
          type: (r.metadata?.type as string) || 'unknown',
          source: (r.metadata?.source as string) || undefined,
          tags: (r.metadata?.tags as string[]) || [],
          metadata: (r.metadata || {}) as Record<string, any>,
          createdAt: new Date(r.metadata?.createdAt as string),
          relevanceReason: this.generateRelevanceReason(r.score, r.metadata?.type as string),
        }));
      }

      // Limit to topK
      results = results.slice(0, topK);

      const duration = Date.now() - startTime;

      logger.info('Semantic search completed', {
        query: query.substring(0, 100),
        organizationId,
        resultsCount: results.length,
        topScore: results[0]?.score || 0,
        duration,
      });

      return results;
    } catch (error) {
      logger.error('Failed to perform semantic search', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Hybrid search (keyword + semantic)
   */
  async hybridSearch(
    query: string,
    organizationId: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        semanticWeight = 0.7,
        keywordFields = ['content', 'title'],
        ...searchOptions
      } = options;

      // Perform semantic search
      const semanticResults = await this.search(query, organizationId, {
        ...searchOptions,
        includeContent: true,
      });

      // Perform keyword search in database
      const keywordResults = await this.keywordSearch(query, organizationId, keywordFields, {
        limit: searchOptions.topK || this.DEFAULT_TOP_K,
        type: searchOptions.type,
        source: searchOptions.source,
        tags: searchOptions.tags,
      });

      // Combine and re-rank results
      const combined = this.combineResults(
        semanticResults,
        keywordResults,
        semanticWeight
      );

      logger.info('Hybrid search completed', {
        query: query.substring(0, 100),
        organizationId,
        semanticCount: semanticResults.length,
        keywordCount: keywordResults.length,
        combinedCount: combined.length,
      });

      return combined;
    } catch (error) {
      logger.error('Failed to perform hybrid search', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Keyword search in database
   */
  private async keywordSearch(
    query: string,
    organizationId: string,
    fields: string[],
    options: {
      limit?: number;
      type?: string;
      source?: string;
      tags?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { limit = this.DEFAULT_TOP_K, type, source, tags } = options;

      const where: any = {
        organizationId,
        OR: fields.map((field) => ({
          [field]: {
            contains: query,
            mode: 'insensitive',
          },
        })),
      };

      if (type) {
        where.type = type;
      }

      if (source) {
        where.source = source;
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      const entries = await prisma.knowledgeBaseEntry.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return entries.map((e) => ({
        id: e.id,
        score: 0.5, // Placeholder score for keyword matches
        content: e.content,
        title: e.title || undefined,
        type: e.type,
        source: e.source || undefined,
        tags: e.tags as string[],
        metadata: e.metadata as Record<string, any>,
        createdAt: e.createdAt,
        relevanceReason: 'Keyword match',
      }));
    } catch (error) {
      logger.error('Failed to perform keyword search', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.substring(0, 100),
        organizationId,
      });
      return [];
    }
  }

  /**
   * Combine semantic and keyword results
   */
  private combineResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results with weighted score
    semanticResults.forEach((r) => {
      resultMap.set(r.id, {
        ...r,
        score: r.score * semanticWeight,
        relevanceReason: `Semantic match (${(r.score * 100).toFixed(0)}%)`,
      });
    });

    // Add keyword results with weighted score
    keywordResults.forEach((r) => {
      const existing = resultMap.get(r.id);
      if (existing) {
        // Combine scores
        existing.score += r.score * (1 - semanticWeight);
        existing.relevanceReason = 'Semantic + Keyword match';
      } else {
        resultMap.set(r.id, {
          ...r,
          score: r.score * (1 - semanticWeight),
        });
      }
    });

    // Sort by combined score
    const combined = Array.from(resultMap.values()).sort((a, b) => b.score - a.score);

    return combined;
  }

  /**
   * Search by similarity to existing entry
   */
  async searchSimilar(
    entryId: string,
    organizationId: string,
    options: Omit<SearchOptions, 'includeContent'> = {}
  ): Promise<SearchResult[]> {
    try {
      const { topK = this.DEFAULT_TOP_K, minScore = this.DEFAULT_MIN_SCORE } = options;

      // Get the entry's embedding from vector database
      const namespace = this.getNamespace(organizationId);
      const results = await pineconeClient.queryById(entryId, {
        topK: topK + 1, // +1 to exclude the entry itself
        namespace,
        includeMetadata: true,
      });

      // Filter out the original entry and apply min score
      const filtered = results.filter((r) => r.id !== entryId && r.score >= minScore);

      // Fetch full entries from database
      if (filtered.length === 0) {
        return [];
      }

      const ids = filtered.map((r) => r.id);
      const entries = await prisma.knowledgeBaseEntry.findMany({
        where: {
          id: { in: ids },
          organizationId,
        },
      });

      const entryMap = new Map(entries.map((e) => [e.id, e]));

      const searchResults: SearchResult[] = filtered
        .map((r) => {
          const entry = entryMap.get(r.id);
          if (!entry) return null;

          return {
            id: r.id,
            score: r.score,
            content: entry.content,
            title: entry.title || undefined,
            type: entry.type,
            source: entry.source || undefined,
            tags: entry.tags as string[],
            metadata: entry.metadata as Record<string, any>,
            createdAt: entry.createdAt,
            relevanceReason: `Similar to original (${(r.score * 100).toFixed(0)}% match)`,
          };
        })
        .filter((r): r is SearchResult => r !== null);

      logger.info('Similar search completed', {
        entryId,
        organizationId,
        resultsCount: searchResults.length,
      });

      return searchResults;
    } catch (error) {
      logger.error('Failed to search similar entries', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entryId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Generate relevance reason
   */
  private generateRelevanceReason(score: number, type?: string): string {
    const percentage = (score * 100).toFixed(0);

    if (score >= 0.9) {
      return `Highly relevant ${type || 'content'} (${percentage}% match)`;
    } else if (score >= 0.8) {
      return `Very relevant ${type || 'content'} (${percentage}% match)`;
    } else if (score >= 0.7) {
      return `Relevant ${type || 'content'} (${percentage}% match)`;
    } else {
      return `Potentially relevant ${type || 'content'} (${percentage}% match)`;
    }
  }

  /**
   * Get namespace for organization
   */
  private getNamespace(organizationId: string): string {
    return `${this.DEFAULT_NAMESPACE}-${organizationId}`;
  }

  /**
   * Track search analytics
   */
  async trackSearch(analytics: SearchAnalytics): Promise<void> {
    try {
      await prisma.searchAnalytics.create({
        data: {
          query: analytics.query,
          organizationId: analytics.organizationId,
          userId: analytics.userId,
          resultsCount: analytics.resultsCount,
          topScore: analytics.topScore,
          duration: analytics.duration,
          timestamp: analytics.timestamp,
        },
      });
    } catch (error) {
      logger.warn('Failed to track search analytics', { error });
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<{
    totalSearches: number;
    avgResultsCount: number;
    avgScore: number;
    avgDuration: number;
    topQueries: Array<{ query: string; count: number }>;
  }> {
    try {
      const { startDate, endDate, limit = 10 } = options;

      const where: any = { organizationId };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [stats, topQueries] = await Promise.all([
        prisma.searchAnalytics.aggregate({
          where,
          _count: true,
          _avg: {
            resultsCount: true,
            topScore: true,
            duration: true,
          },
        }),
        prisma.searchAnalytics.groupBy({
          by: ['query'],
          where,
          _count: true,
          orderBy: {
            _count: {
              query: 'desc',
            },
          },
          take: limit,
        }),
      ]);

      return {
        totalSearches: stats._count || 0,
        avgResultsCount: stats._avg.resultsCount || 0,
        avgScore: stats._avg.topScore || 0,
        avgDuration: stats._avg.duration || 0,
        topQueries: topQueries.map((q) => ({
          query: q.query,
          count: q._count,
        })),
      };
    } catch (error) {
      logger.error('Failed to get search analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }
}

// Singleton instance
export const semanticSearchService = new SemanticSearchService();

export default semanticSearchService;
