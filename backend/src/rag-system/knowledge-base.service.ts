/**
 * ==================== KNOWLEDGE BASE SERVICE ====================
 *
 * Service for managing knowledge base entries with vector embeddings
 *
 * Features:
 * - Create/update/delete knowledge entries
 * - Automatic embedding generation
 * - Vector storage in Pinecone
 * - Metadata management
 * - Bulk operations
 *
 * @module rag-system/knowledge-base-service
 */

import { PrismaClient } from '@prisma/client';
import { pineconeClient } from './pinecone.client';
import { embeddingsService } from './embeddings.service';
import { logger } from '../infrastructure/logger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export interface CreateKnowledgeInput {
  organizationId: string;
  content: string;
  type: 'document' | 'code' | 'conversation' | 'entity' | 'custom';
  title?: string;
  source?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  createdBy: string;
}

export interface UpdateKnowledgeInput {
  content?: string;
  title?: string;
  source?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface KnowledgeEntry {
  id: string;
  organizationId: string;
  content: string;
  type: string;
  title?: string;
  source?: string;
  metadata: Record<string, any>;
  tags: string[];
  embedding?: number[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkCreateInput {
  entries: CreateKnowledgeInput[];
  batchSize?: number;
}

export class KnowledgeBaseService {
  private readonly DEFAULT_NAMESPACE = 'knowledge';

  /**
   * Create knowledge entry
   */
  async createKnowledge(input: CreateKnowledgeInput): Promise<KnowledgeEntry> {
    try {
      const {
        organizationId,
        content,
        type,
        title,
        source,
        metadata = {},
        tags = [],
        createdBy,
      } = input;

      // Generate embedding
      logger.debug('Generating embedding for knowledge entry', {
        organizationId,
        contentLength: content.length,
      });

      const embeddingResult = await embeddingsService.generateEmbedding(content);

      // Create database entry
      const knowledgeEntry = await prisma.knowledgeBaseEntry.create({
        data: {
          id: uuidv4(),
          organizationId,
          content,
          type,
          title,
          source,
          metadata: metadata as any,
          tags,
          createdBy,
        },
      });

      // Store in vector database
      await pineconeClient.upsert(
        [
          {
            id: knowledgeEntry.id,
            values: embeddingResult.embedding,
            metadata: {
              organizationId,
              type,
              title: title || '',
              source: source || '',
              contentPreview: content.substring(0, 500),
              tags,
              createdBy,
              createdAt: knowledgeEntry.createdAt.toISOString(),
              ...metadata,
            },
          },
        ],
        { namespace: this.getNamespace(organizationId) }
      );

      logger.info('Knowledge entry created', {
        id: knowledgeEntry.id,
        organizationId,
        type,
        tokens: embeddingResult.tokens,
      });

      return {
        id: knowledgeEntry.id,
        organizationId: knowledgeEntry.organizationId,
        content: knowledgeEntry.content,
        type: knowledgeEntry.type,
        title: knowledgeEntry.title || undefined,
        source: knowledgeEntry.source || undefined,
        metadata: knowledgeEntry.metadata as Record<string, any>,
        tags: knowledgeEntry.tags as string[],
        embedding: embeddingResult.embedding,
        createdBy: knowledgeEntry.createdBy,
        createdAt: knowledgeEntry.createdAt,
        updatedAt: knowledgeEntry.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to create knowledge entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: input.organizationId,
      });
      throw error;
    }
  }

  /**
   * Bulk create knowledge entries
   */
  async bulkCreateKnowledge(input: BulkCreateInput): Promise<{
    created: number;
    failed: number;
    entries: KnowledgeEntry[];
  }> {
    const { entries, batchSize = 50 } = input;

    let created = 0;
    let failed = 0;
    const createdEntries: KnowledgeEntry[] = [];

    try {
      // Process in batches
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);

        // Generate embeddings in batch
        const contents = batch.map((e) => e.content);
        const embeddingsResult = await embeddingsService.generateBatchEmbeddings(contents);

        // Create database entries
        for (let j = 0; j < batch.length; j++) {
          try {
            const entry = batch[j];
            const embedding = embeddingsResult.embeddings[j].embedding;

            const knowledgeEntry = await prisma.knowledgeBaseEntry.create({
              data: {
                id: uuidv4(),
                organizationId: entry.organizationId,
                content: entry.content,
                type: entry.type,
                title: entry.title,
                source: entry.source,
                metadata: (entry.metadata || {}) as any,
                tags: entry.tags || [],
                createdBy: entry.createdBy,
              },
            });

            // Store in vector database
            await pineconeClient.upsert(
              [
                {
                  id: knowledgeEntry.id,
                  values: embedding,
                  metadata: {
                    organizationId: entry.organizationId,
                    type: entry.type,
                    title: entry.title || '',
                    source: entry.source || '',
                    contentPreview: entry.content.substring(0, 500),
                    tags: entry.tags || [],
                    createdBy: entry.createdBy,
                    createdAt: knowledgeEntry.createdAt.toISOString(),
                    ...(entry.metadata || {}),
                  },
                },
              ],
              { namespace: this.getNamespace(entry.organizationId) }
            );

            createdEntries.push({
              id: knowledgeEntry.id,
              organizationId: knowledgeEntry.organizationId,
              content: knowledgeEntry.content,
              type: knowledgeEntry.type,
              title: knowledgeEntry.title || undefined,
              source: knowledgeEntry.source || undefined,
              metadata: knowledgeEntry.metadata as Record<string, any>,
              tags: knowledgeEntry.tags as string[],
              embedding,
              createdBy: knowledgeEntry.createdBy,
              createdAt: knowledgeEntry.createdAt,
              updatedAt: knowledgeEntry.updatedAt,
            });

            created++;
          } catch (error) {
            logger.error('Failed to create knowledge entry in batch', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
          }
        }

        logger.info('Knowledge batch processed', {
          batchIndex: i / batchSize,
          batchSize: batch.length,
          created,
          failed,
        });
      }

      logger.info('Bulk knowledge creation completed', {
        total: entries.length,
        created,
        failed,
      });

      return {
        created,
        failed,
        entries: createdEntries,
      };
    } catch (error) {
      logger.error('Failed to bulk create knowledge entries', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalEntries: entries.length,
      });
      throw error;
    }
  }

  /**
   * Update knowledge entry
   */
  async updateKnowledge(
    id: string,
    organizationId: string,
    input: UpdateKnowledgeInput
  ): Promise<KnowledgeEntry> {
    try {
      // Get existing entry
      const existing = await prisma.knowledgeBaseEntry.findUnique({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new Error(`Knowledge entry ${id} not found`);
      }

      const { content, title, source, metadata, tags } = input;

      // If content changed, regenerate embedding
      let newEmbedding: number[] | undefined;
      if (content && content !== existing.content) {
        logger.debug('Content changed, regenerating embedding', { id });

        const embeddingResult = await embeddingsService.generateEmbedding(content);
        newEmbedding = embeddingResult.embedding;
      }

      // Update database
      const updated = await prisma.knowledgeBaseEntry.update({
        where: { id, organizationId },
        data: {
          content: content || existing.content,
          title: title !== undefined ? title : existing.title,
          source: source !== undefined ? source : existing.source,
          metadata: metadata !== undefined ? (metadata as any) : existing.metadata,
          tags: tags !== undefined ? tags : existing.tags,
          updatedAt: new Date(),
        },
      });

      // Update vector database if embedding changed
      if (newEmbedding) {
        await pineconeClient.upsert(
          [
            {
              id: updated.id,
              values: newEmbedding,
              metadata: {
                organizationId: updated.organizationId,
                type: updated.type,
                title: updated.title || '',
                source: updated.source || '',
                contentPreview: updated.content.substring(0, 500),
                tags: updated.tags,
                createdBy: updated.createdBy,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
                ...(updated.metadata as Record<string, any>),
              },
            },
          ],
          { namespace: this.getNamespace(organizationId) }
        );
      }

      logger.info('Knowledge entry updated', {
        id,
        organizationId,
        embeddingRegenerated: !!newEmbedding,
      });

      return {
        id: updated.id,
        organizationId: updated.organizationId,
        content: updated.content,
        type: updated.type,
        title: updated.title || undefined,
        source: updated.source || undefined,
        metadata: updated.metadata as Record<string, any>,
        tags: updated.tags as string[],
        embedding: newEmbedding,
        createdBy: updated.createdBy,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to update knowledge entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Delete knowledge entry
   */
  async deleteKnowledge(id: string, organizationId: string): Promise<void> {
    try {
      // Delete from database
      await prisma.knowledgeBaseEntry.delete({
        where: { id, organizationId },
      });

      // Delete from vector database
      await pineconeClient.deleteByIds([id], this.getNamespace(organizationId));

      logger.info('Knowledge entry deleted', { id, organizationId });
    } catch (error) {
      logger.error('Failed to delete knowledge entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get knowledge entry by ID
   */
  async getKnowledge(id: string, organizationId: string): Promise<KnowledgeEntry | null> {
    try {
      const entry = await prisma.knowledgeBaseEntry.findUnique({
        where: { id, organizationId },
      });

      if (!entry) {
        return null;
      }

      return {
        id: entry.id,
        organizationId: entry.organizationId,
        content: entry.content,
        type: entry.type,
        title: entry.title || undefined,
        source: entry.source || undefined,
        metadata: entry.metadata as Record<string, any>,
        tags: entry.tags as string[],
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to get knowledge entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * List knowledge entries
   */
  async listKnowledge(
    organizationId: string,
    options: {
      type?: string;
      source?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ entries: KnowledgeEntry[]; total: number }> {
    try {
      const { type, source, tags, limit = 50, offset = 0 } = options;

      const where: any = { organizationId };

      if (type) {
        where.type = type;
      }

      if (source) {
        where.source = source;
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      const [entries, total] = await Promise.all([
        prisma.knowledgeBaseEntry.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.knowledgeBaseEntry.count({ where }),
      ]);

      return {
        entries: entries.map((e) => ({
          id: e.id,
          organizationId: e.organizationId,
          content: e.content,
          type: e.type,
          title: e.title || undefined,
          source: e.source || undefined,
          metadata: e.metadata as Record<string, any>,
          tags: e.tags as string[],
          createdBy: e.createdBy,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        total,
      };
    } catch (error) {
      logger.error('Failed to list knowledge entries', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get knowledge statistics
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const total = await prisma.knowledgeBaseEntry.count({
        where: { organizationId },
      });

      // Group by type
      const typeGroups = await prisma.knowledgeBaseEntry.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true,
      });

      const byType: Record<string, number> = {};
      typeGroups.forEach((g) => {
        byType[g.type] = g._count;
      });

      // Group by source
      const sourceGroups = await prisma.knowledgeBaseEntry.groupBy({
        by: ['source'],
        where: { organizationId, source: { not: null } },
        _count: true,
      });

      const bySource: Record<string, number> = {};
      sourceGroups.forEach((g) => {
        if (g.source) {
          bySource[g.source] = g._count;
        }
      });

      // Recent entries (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCount = await prisma.knowledgeBaseEntry.count({
        where: {
          organizationId,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      return {
        total,
        byType,
        bySource,
        recentCount,
      };
    } catch (error) {
      logger.error('Failed to get knowledge stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get namespace for organization
   */
  private getNamespace(organizationId: string): string {
    return `${this.DEFAULT_NAMESPACE}-${organizationId}`;
  }
}

// Singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();

export default knowledgeBaseService;
