/**
 * ==================== RAG SYSTEM ROUTES ====================
 *
 * API routes for RAG (Retrieval-Augmented Generation) system
 *
 * Endpoints:
 * - Knowledge base management
 * - Semantic search
 * - Context retrieval
 * - Analytics
 *
 * @module routes/rag
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { knowledgeBaseService } from '../rag-system/knowledge-base.service';
import { semanticSearchService } from '../rag-system/semantic-search.service';
import { ragOrchestrator } from '../rag-system/rag.orchestrator';
import { embeddingsService } from '../rag-system/embeddings.service';
import { pineconeClient } from '../rag-system/pinecone.client';
import { logger } from '../infrastructure/logger';
import { AppError, ValidationError, NotFoundError } from '../infrastructure/errors';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const CreateKnowledgeSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['document', 'code', 'conversation', 'entity', 'custom']),
  title: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

const BulkCreateKnowledgeSchema = z.object({
  entries: z.array(CreateKnowledgeSchema),
  batchSize: z.number().optional(),
});

const UpdateKnowledgeSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  topK: z.number().optional(),
  minScore: z.number().min(0).max(1).optional(),
  type: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  includeContent: z.boolean().optional(),
});

const HybridSearchSchema = SearchSchema.extend({
  semanticWeight: z.number().min(0).max(1).optional(),
  keywordFields: z.array(z.string()).optional(),
});

const RetrieveContextSchema = z.object({
  query: z.string().min(1),
  topK: z.number().optional(),
  minScore: z.number().min(0).max(1).optional(),
  includeTypes: z.array(z.string()).optional(),
  excludeTypes: z.array(z.string()).optional(),
  includeSources: z.array(z.string()).optional(),
  excludeSources: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  useCache: z.boolean().optional(),
});

const StoreConversationSchema = z.object({
  agentId: z.string(),
  userMessage: z.string().min(1),
  agentResponse: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

// ==================== MIDDLEWARE ====================

function getUserFromRequest(req: Request): { userId: string; organizationId: string } {
  const user = (req as any).user;

  if (!user || !user.userId || !user.organizationId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  return {
    userId: user.userId,
    organizationId: user.organizationId,
  };
}

// ==================== KNOWLEDGE BASE ROUTES ====================

/**
 * POST /api/rag/knowledge
 * Create knowledge entry
 */
router.post('/knowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const input = CreateKnowledgeSchema.parse(req.body);

    const entry = await knowledgeBaseService.createKnowledge({
      ...input,
      organizationId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/rag/knowledge/bulk
 * Bulk create knowledge entries
 */
router.post('/knowledge/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const input = BulkCreateKnowledgeSchema.parse(req.body);

    const entriesWithOrg = input.entries.map((e) => ({
      ...e,
      organizationId,
      createdBy: userId,
    }));

    const result = await knowledgeBaseService.bulkCreateKnowledge({
      entries: entriesWithOrg,
      batchSize: input.batchSize,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/rag/knowledge/:id
 * Get knowledge entry
 */
router.get('/knowledge/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const { id } = req.params;

    const entry = await knowledgeBaseService.getKnowledge(id, organizationId);

    if (!entry) {
      throw new NotFoundError('Knowledge entry', id);
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/rag/knowledge/:id
 * Update knowledge entry
 */
router.put('/knowledge/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const { id } = req.params;
    const input = UpdateKnowledgeSchema.parse(req.body);

    const entry = await knowledgeBaseService.updateKnowledge(id, organizationId, input);

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/rag/knowledge/:id
 * Delete knowledge entry
 */
router.delete('/knowledge/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const { id } = req.params;

    await knowledgeBaseService.deleteKnowledge(id, organizationId);

    res.json({
      success: true,
      message: 'Knowledge entry deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/knowledge
 * List knowledge entries
 */
router.get('/knowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);

    const { type, source, tags, limit, offset } = req.query;

    const result = await knowledgeBaseService.listKnowledge(organizationId, {
      type: type as string,
      source: source as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/knowledge/stats
 * Get knowledge statistics
 */
router.get('/knowledge-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);

    const stats = await knowledgeBaseService.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SEARCH ROUTES ====================

/**
 * POST /api/rag/search
 * Semantic search
 */
router.post('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const input = SearchSchema.parse(req.body);

    const startTime = Date.now();

    const results = await semanticSearchService.search(input.query, organizationId, {
      topK: input.topK,
      minScore: input.minScore,
      type: input.type,
      source: input.source,
      tags: input.tags,
      includeContent: input.includeContent,
    });

    const duration = Date.now() - startTime;

    // Track search analytics
    await semanticSearchService.trackSearch({
      query: input.query,
      organizationId,
      userId,
      resultsCount: results.length,
      topScore: results[0]?.score || 0,
      duration,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      data: {
        results,
        metadata: {
          count: results.length,
          duration,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/rag/search/hybrid
 * Hybrid search (semantic + keyword)
 */
router.post('/search/hybrid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const input = HybridSearchSchema.parse(req.body);

    const startTime = Date.now();

    const results = await semanticSearchService.hybridSearch(input.query, organizationId, {
      topK: input.topK,
      minScore: input.minScore,
      type: input.type,
      source: input.source,
      tags: input.tags,
      includeContent: input.includeContent,
      semanticWeight: input.semanticWeight,
      keywordFields: input.keywordFields,
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results,
        metadata: {
          count: results.length,
          duration,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/rag/search/similar/:id
 * Find similar entries
 */
router.get('/search/similar/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const { id } = req.params;
    const { topK, minScore } = req.query;

    const results = await semanticSearchService.searchSimilar(id, organizationId, {
      topK: topK ? parseInt(topK as string) : undefined,
      minScore: minScore ? parseFloat(minScore as string) : undefined,
    });

    res.json({
      success: true,
      data: {
        results,
        metadata: {
          count: results.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/search/analytics
 * Get search analytics
 */
router.get('/search/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const { startDate, endDate, limit } = req.query;

    const analytics = await semanticSearchService.getSearchAnalytics(organizationId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== CONTEXT RETRIEVAL ROUTES ====================

/**
 * POST /api/rag/context/retrieve
 * Retrieve context for agent query
 */
router.post('/context/retrieve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);
    const input = RetrieveContextSchema.parse(req.body);

    const context = await ragOrchestrator.retrieveContext(input.query, organizationId, {
      topK: input.topK,
      minScore: input.minScore,
      includeTypes: input.includeTypes,
      excludeTypes: input.excludeTypes,
      includeSources: input.includeSources,
      excludeSources: input.excludeSources,
      tags: input.tags,
      useCache: input.useCache,
    });

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/rag/context/store-conversation
 * Store conversation for future retrieval
 */
router.post('/context/store-conversation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const input = StoreConversationSchema.parse(req.body);

    await ragOrchestrator.storeConversation(
      organizationId,
      input.agentId,
      userId,
      input.userMessage,
      input.agentResponse,
      input.metadata
    );

    res.status(201).json({
      success: true,
      message: 'Conversation stored',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * DELETE /api/rag/context/cache
 * Clear RAG cache
 */
router.delete('/context/cache', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);

    await ragOrchestrator.clearCache(organizationId);

    res.json({
      success: true,
      message: 'RAG cache cleared',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/context/stats
 * Get RAG statistics
 */
router.get('/context/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);

    const stats = await ragOrchestrator.getStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== UTILITY ROUTES ====================

/**
 * GET /api/rag/embeddings/models
 * List available embedding models
 */
router.get('/embeddings/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = embeddingsService.listModels();

    const modelsWithConfig = models.map((model) => ({
      model,
      config: embeddingsService.getModelConfig(model),
    }));

    res.json({
      success: true,
      data: modelsWithConfig,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/embeddings/stats
 * Get embedding statistics
 */
router.get('/embeddings/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await embeddingsService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rag/vector-db/stats
 * Get vector database statistics
 */
router.get('/vector-db/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = getUserFromRequest(req);

    const namespace = `knowledge-${organizationId}`;
    const stats = await pineconeClient.getStats(namespace);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ERROR HANDLER ====================

router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('RAG API error', {
    error: error.message,
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export default router;
