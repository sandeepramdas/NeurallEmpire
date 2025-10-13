/**
 * ==================== RAG SYSTEM TESTS ====================
 *
 * Unit and integration tests for the RAG system
 *
 * @module rag-system/__tests__/rag-system.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { embeddingsService } from '../embeddings.service';
import { knowledgeBaseService } from '../knowledge-base.service';
import { semanticSearchService } from '../semantic-search.service';
import { ragOrchestrator } from '../rag.orchestrator';

describe('RAG System', () => {
  const TEST_ORG_ID = 'test-org-rag-123';
  const TEST_USER_ID = 'test-user-rag-123';

  // ==================== EMBEDDINGS SERVICE TESTS ====================

  describe('EmbeddingsService', () => {
    test('should generate embedding for text', async () => {
      const text = 'This is a test document about machine learning.';

      const result = await embeddingsService.generateEmbedding(text);

      expect(result).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.embedding.length).toBeGreaterThan(0);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.cached).toBe(false);
    });

    test('should use cache for duplicate embeddings', async () => {
      const text = 'Another test about artificial intelligence.';

      // First call - not cached
      const result1 = await embeddingsService.generateEmbedding(text);
      expect(result1.cached).toBe(false);

      // Second call - should be cached
      const result2 = await embeddingsService.generateEmbedding(text);
      expect(result2.cached).toBe(true);
      expect(result2.embedding).toEqual(result1.embedding);
    });

    test('should generate batch embeddings', async () => {
      const texts = [
        'First document',
        'Second document',
        'Third document',
      ];

      const result = await embeddingsService.generateBatchEmbeddings(texts);

      expect(result).toBeDefined();
      expect(result.embeddings).toBeDefined();
      expect(result.embeddings.length).toBe(3);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);

      result.embeddings.forEach((emb, idx) => {
        expect(emb.text).toBe(texts[idx]);
        expect(emb.embedding).toBeDefined();
        expect(Array.isArray(emb.embedding)).toBe(true);
      });
    });

    test('should estimate tokens and cost', () => {
      const text = 'This is a test text for token estimation.';

      const tokens = embeddingsService.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);

      const cost = embeddingsService.estimateCost(text);
      expect(cost).toBeGreaterThan(0);
    });

    test('should list available models', () => {
      const models = embeddingsService.listModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('text-embedding-3-small');
    });
  });

  // ==================== KNOWLEDGE BASE SERVICE TESTS ====================

  describe('KnowledgeBaseService', () => {
    let testKnowledgeId: string;

    afterEach(async () => {
      // Cleanup
      if (testKnowledgeId) {
        try {
          await knowledgeBaseService.deleteKnowledge(testKnowledgeId, TEST_ORG_ID);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    });

    test('should create knowledge entry', async () => {
      const entry = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'Machine learning is a subset of artificial intelligence.',
        type: 'document',
        title: 'Introduction to Machine Learning',
        source: 'test',
        metadata: { category: 'AI' },
        tags: ['machine-learning', 'ai'],
        createdBy: TEST_USER_ID,
      });

      testKnowledgeId = entry.id;

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.content).toContain('Machine learning');
      expect(entry.type).toBe('document');
      expect(entry.title).toBe('Introduction to Machine Learning');
      expect(entry.tags).toContain('machine-learning');
      expect(entry.embedding).toBeDefined();
      expect(Array.isArray(entry.embedding)).toBe(true);
    });

    test('should get knowledge entry', async () => {
      // Create entry
      const created = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'Test content for retrieval',
        type: 'document',
        createdBy: TEST_USER_ID,
      });

      testKnowledgeId = created.id;

      // Retrieve entry
      const retrieved = await knowledgeBaseService.getKnowledge(created.id, TEST_ORG_ID);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.content).toBe(created.content);
    });

    test('should update knowledge entry', async () => {
      // Create entry
      const created = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'Original content',
        type: 'document',
        createdBy: TEST_USER_ID,
      });

      testKnowledgeId = created.id;

      // Update entry
      const updated = await knowledgeBaseService.updateKnowledge(
        created.id,
        TEST_ORG_ID,
        {
          content: 'Updated content',
          title: 'Updated Title',
        }
      );

      expect(updated.content).toBe('Updated content');
      expect(updated.title).toBe('Updated Title');
      expect(updated.embedding).toBeDefined(); // Should regenerate embedding
    });

    test('should list knowledge entries', async () => {
      // Create multiple entries
      const entry1 = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'First entry',
        type: 'document',
        tags: ['test'],
        createdBy: TEST_USER_ID,
      });

      const entry2 = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'Second entry',
        type: 'code',
        tags: ['test'],
        createdBy: TEST_USER_ID,
      });

      // List entries
      const result = await knowledgeBaseService.listKnowledge(TEST_ORG_ID, {
        tags: ['test'],
        limit: 10,
      });

      expect(result.entries.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);

      // Cleanup
      await knowledgeBaseService.deleteKnowledge(entry1.id, TEST_ORG_ID);
      await knowledgeBaseService.deleteKnowledge(entry2.id, TEST_ORG_ID);
    });

    test('should get knowledge statistics', async () => {
      const stats = await knowledgeBaseService.getStats(TEST_ORG_ID);

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.byType).toBe('object');
    });
  });

  // ==================== SEMANTIC SEARCH SERVICE TESTS ====================

  describe('SemanticSearchService', () => {
    let testEntryId: string;

    beforeEach(async () => {
      // Create test entry for searching
      const entry = await knowledgeBaseService.createKnowledge({
        organizationId: TEST_ORG_ID,
        content: 'Deep learning is a type of machine learning based on artificial neural networks.',
        type: 'document',
        title: 'Deep Learning Basics',
        tags: ['deep-learning', 'neural-networks'],
        createdBy: TEST_USER_ID,
      });

      testEntryId = entry.id;
    });

    afterEach(async () => {
      // Cleanup
      if (testEntryId) {
        try {
          await knowledgeBaseService.deleteKnowledge(testEntryId, TEST_ORG_ID);
        } catch (error) {
          // Ignore errors
        }
      }
    });

    test('should perform semantic search', async () => {
      const query = 'What is deep learning?';

      const results = await semanticSearchService.search(query, TEST_ORG_ID, {
        topK: 5,
        minScore: 0.5,
        includeContent: true,
      });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult.id).toBeDefined();
        expect(firstResult.score).toBeGreaterThan(0);
        expect(firstResult.score).toBeLessThanOrEqual(1);
        expect(firstResult.content).toBeDefined();
      }
    });

    test('should filter search by type', async () => {
      const query = 'neural networks';

      const results = await semanticSearchService.search(query, TEST_ORG_ID, {
        topK: 5,
        type: 'document',
        minScore: 0.5,
      });

      expect(Array.isArray(results)).toBe(true);

      results.forEach((result) => {
        expect(result.type).toBe('document');
      });
    });

    test('should search for similar entries', async () => {
      const results = await semanticSearchService.searchSimilar(testEntryId, TEST_ORG_ID, {
        topK: 3,
        minScore: 0.5,
      });

      expect(Array.isArray(results)).toBe(true);

      // Should not include the original entry
      results.forEach((result) => {
        expect(result.id).not.toBe(testEntryId);
      });
    });
  });

  // ==================== RAG ORCHESTRATOR TESTS ====================

  describe('RAGOrchestrator', () => {
    let testEntryIds: string[] = [];

    beforeEach(async () => {
      // Create multiple test entries
      const entries = [
        {
          content: 'Python is a high-level programming language.',
          type: 'document' as const,
          title: 'Python Programming',
        },
        {
          content: 'JavaScript is used for web development.',
          type: 'document' as const,
          title: 'JavaScript Basics',
        },
        {
          content: 'React is a JavaScript library for building user interfaces.',
          type: 'code' as const,
          title: 'React Framework',
        },
      ];

      for (const entryData of entries) {
        const entry = await knowledgeBaseService.createKnowledge({
          organizationId: TEST_ORG_ID,
          ...entryData,
          createdBy: TEST_USER_ID,
        });
        testEntryIds.push(entry.id);
      }
    });

    afterEach(async () => {
      // Cleanup
      for (const id of testEntryIds) {
        try {
          await knowledgeBaseService.deleteKnowledge(id, TEST_ORG_ID);
        } catch (error) {
          // Ignore errors
        }
      }
      testEntryIds = [];
    });

    test('should retrieve RAG context', async () => {
      const query = 'Tell me about programming languages';

      const context = await ragOrchestrator.retrieveContext(query, TEST_ORG_ID, {
        topK: 5,
        minScore: 0.5,
      });

      expect(context).toBeDefined();
      expect(context.query).toBe(query);
      expect(Array.isArray(context.results)).toBe(true);
      expect(typeof context.context).toBe('string');
      expect(Array.isArray(context.sources)).toBe(true);
      expect(context.metadata).toBeDefined();
      expect(context.metadata.totalResults).toBeGreaterThanOrEqual(0);
      expect(context.metadata.retrievalTime).toBeGreaterThan(0);
    });

    test('should filter RAG context by type', async () => {
      const query = 'web frameworks';

      const context = await ragOrchestrator.retrieveContext(query, TEST_ORG_ID, {
        topK: 5,
        includeTypes: ['code'],
      });

      expect(context.results.every((r) => r.type === 'code')).toBe(true);
    });

    test('should cache RAG context', async () => {
      const query = 'programming concepts';

      // First call - not cached
      const context1 = await ragOrchestrator.retrieveContext(query, TEST_ORG_ID, {
        topK: 3,
        useCache: true,
      });
      expect(context1.metadata.cached).toBe(false);

      // Second call - should be cached
      const context2 = await ragOrchestrator.retrieveContext(query, TEST_ORG_ID, {
        topK: 3,
        useCache: true,
      });
      expect(context2.metadata.cached).toBe(true);
    });

    test('should store conversation', async () => {
      const agentId = 'test-agent-123';
      const userMessage = 'What is Python?';
      const agentResponse = 'Python is a high-level programming language.';

      await ragOrchestrator.storeConversation(
        TEST_ORG_ID,
        agentId,
        TEST_USER_ID,
        userMessage,
        agentResponse
      );

      // Search for the stored conversation
      const results = await semanticSearchService.search(userMessage, TEST_ORG_ID, {
        topK: 1,
        type: 'conversation',
      });

      expect(results.length).toBeGreaterThan(0);

      // Cleanup
      if (results[0]) {
        await knowledgeBaseService.deleteKnowledge(results[0].id, TEST_ORG_ID);
      }
    });

    test('should get RAG statistics', async () => {
      const stats = await ragOrchestrator.getStats(TEST_ORG_ID);

      expect(stats).toBeDefined();
      expect(typeof stats.knowledgeEntries).toBe('number');
      expect(typeof stats.conversationEntries).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });

    test('should clear RAG cache', async () => {
      // Create cached entry
      await ragOrchestrator.retrieveContext('test query', TEST_ORG_ID, {
        useCache: true,
      });

      // Clear cache
      await ragOrchestrator.clearCache(TEST_ORG_ID);

      // Cache should be empty
      const stats = await ragOrchestrator.getStats(TEST_ORG_ID);
      expect(stats.cacheSize).toBe(0);
    });
  });
});
