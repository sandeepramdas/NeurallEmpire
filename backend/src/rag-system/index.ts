/**
 * ==================== RAG SYSTEM ====================
 *
 * Centralized export for RAG (Retrieval-Augmented Generation) system
 *
 * @module rag-system
 */

// Clients
export {
  pineconeClient,
  PineconeClient,
  type VectorRecord,
  type QueryOptions,
  type QueryResult,
  type UpsertOptions,
} from './pinecone.client';

// Services
export {
  embeddingsService,
  EmbeddingsService,
  type EmbeddingOptions,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embeddings.service';

export {
  knowledgeBaseService,
  KnowledgeBaseService,
  type CreateKnowledgeInput,
  type UpdateKnowledgeInput,
  type KnowledgeEntry,
  type BulkCreateInput,
} from './knowledge-base.service';

export {
  semanticSearchService,
  SemanticSearchService,
  type SearchOptions,
  type SearchResult,
  type HybridSearchOptions,
  type SearchAnalytics,
} from './semantic-search.service';

export {
  ragOrchestrator,
  RAGOrchestrator,
  type RAGOptions,
  type RAGContext,
  type ConversationMemory,
} from './rag.orchestrator';
