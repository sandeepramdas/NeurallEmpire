/**
 * ==================== PINECONE CLIENT ====================
 *
 * Pinecone vector database client for semantic search
 *
 * Features:
 * - Index management
 * - Vector upsert/query/delete operations
 * - Namespace management
 * - Batch operations
 * - Error handling and retry logic
 *
 * @module rag-system/pinecone-client
 */

import { Pinecone, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { logger } from '../infrastructure/logger';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: RecordMetadata;
}

export interface QueryOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
  namespace?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: RecordMetadata;
}

export interface UpsertOptions {
  namespace?: string;
  batchSize?: number;
}

export class PineconeClient {
  private client: Pinecone | null = null;
  private indexName: string;
  private dimension: number;
  private metric: 'cosine' | 'euclidean' | 'dotproduct';
  private isInitialized: boolean = false;

  constructor(
    indexName: string = process.env.PINECONE_INDEX_NAME || 'neurallempire-v3',
    dimension: number = 1536, // OpenAI text-embedding-3-small dimension
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ) {
    this.indexName = indexName;
    this.dimension = dimension;
    this.metric = metric;
  }

  /**
   * Initialize Pinecone client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const apiKey = process.env.PINECONE_API_KEY;

      if (!apiKey) {
        throw new Error('PINECONE_API_KEY environment variable is not set');
      }

      // Initialize Pinecone client
      this.client = new Pinecone({
        apiKey,
      });

      // Check if index exists, create if not
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some((idx) => idx.name === this.indexName);

      if (!indexExists) {
        logger.info('Creating Pinecone index', {
          indexName: this.indexName,
          dimension: this.dimension,
          metric: this.metric,
        });

        await this.client.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: this.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: process.env.PINECONE_REGION || 'us-east-1',
            },
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      this.isInitialized = true;

      logger.info('Pinecone client initialized successfully', {
        indexName: this.indexName,
      });
    } catch (error) {
      logger.error('Failed to initialize Pinecone client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(maxAttempts: number = 30, delayMs: number = 2000): Promise<void> {
    if (!this.client) {
      throw new Error('Pinecone client not initialized');
    }

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const indexDescription = await this.client.describeIndex(this.indexName);

        if (indexDescription.status?.ready) {
          logger.info('Pinecone index is ready', { indexName: this.indexName });
          return;
        }

        logger.debug('Waiting for Pinecone index to be ready', {
          indexName: this.indexName,
          attempt: i + 1,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        logger.warn('Error checking index status', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    throw new Error(`Index ${this.indexName} did not become ready after ${maxAttempts} attempts`);
  }

  /**
   * Get index instance
   */
  private getIndex() {
    if (!this.client || !this.isInitialized) {
      throw new Error('Pinecone client not initialized. Call initialize() first.');
    }

    return this.client.index(this.indexName);
  }

  /**
   * Upsert vectors
   */
  async upsert(
    vectors: VectorRecord[],
    options: UpsertOptions = {}
  ): Promise<{ upsertedCount: number }> {
    const { namespace = 'default', batchSize = 100 } = options;

    try {
      const index = this.getIndex();
      let upsertedCount = 0;

      // Process in batches
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        const records: PineconeRecord[] = batch.map((v) => ({
          id: v.id,
          values: v.values,
          metadata: v.metadata,
        }));

        await index.namespace(namespace).upsert(records);
        upsertedCount += batch.length;

        logger.debug('Upserted vector batch', {
          namespace,
          batchSize: batch.length,
          totalUpserted: upsertedCount,
        });
      }

      logger.info('Vectors upserted successfully', {
        namespace,
        count: upsertedCount,
      });

      return { upsertedCount };
    } catch (error) {
      logger.error('Failed to upsert vectors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        vectorCount: vectors.length,
      });
      throw error;
    }
  }

  /**
   * Query vectors
   */
  async query(
    vector: number[],
    options: QueryOptions = {}
  ): Promise<QueryResult[]> {
    const {
      topK = 10,
      filter,
      includeMetadata = true,
      includeValues = false,
      namespace = 'default',
    } = options;

    try {
      const index = this.getIndex();

      const queryResponse = await index.namespace(namespace).query({
        vector,
        topK,
        filter,
        includeMetadata,
        includeValues,
      });

      const results: QueryResult[] = (queryResponse.matches || []).map((match) => ({
        id: match.id,
        score: match.score || 0,
        values: match.values,
        metadata: match.metadata,
      }));

      logger.debug('Vector query executed', {
        namespace,
        topK,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to query vectors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        topK,
      });
      throw error;
    }
  }

  /**
   * Query by ID
   */
  async queryById(
    id: string,
    options: Omit<QueryOptions, 'vector'> = {}
  ): Promise<QueryResult[]> {
    const { namespace = 'default', topK = 10 } = options;

    try {
      const index = this.getIndex();

      // First fetch the vector by ID
      const fetchResponse = await index.namespace(namespace).fetch([id]);
      const record = fetchResponse.records?.[id];

      if (!record || !record.values) {
        throw new Error(`Vector with ID ${id} not found`);
      }

      // Query using the fetched vector
      return await this.query(record.values, { ...options, namespace });
    } catch (error) {
      logger.error('Failed to query by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        namespace,
      });
      throw error;
    }
  }

  /**
   * Fetch vectors by IDs
   */
  async fetch(
    ids: string[],
    namespace: string = 'default'
  ): Promise<Map<string, VectorRecord>> {
    try {
      const index = this.getIndex();

      const fetchResponse = await index.namespace(namespace).fetch(ids);
      const records = new Map<string, VectorRecord>();

      if (fetchResponse.records) {
        for (const [id, record] of Object.entries(fetchResponse.records)) {
          if (record.values) {
            records.set(id, {
              id,
              values: record.values,
              metadata: record.metadata,
            });
          }
        }
      }

      logger.debug('Vectors fetched', {
        namespace,
        requestedCount: ids.length,
        fetchedCount: records.size,
      });

      return records;
    } catch (error) {
      logger.error('Failed to fetch vectors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        idsCount: ids.length,
      });
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteByIds(
    ids: string[],
    namespace: string = 'default'
  ): Promise<void> {
    try {
      const index = this.getIndex();

      await index.namespace(namespace).deleteMany(ids);

      logger.info('Vectors deleted', {
        namespace,
        count: ids.length,
      });
    } catch (error) {
      logger.error('Failed to delete vectors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        idsCount: ids.length,
      });
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(
    filter: Record<string, any>,
    namespace: string = 'default'
  ): Promise<void> {
    try {
      const index = this.getIndex();

      await index.namespace(namespace).deleteMany(filter);

      logger.info('Vectors deleted by filter', {
        namespace,
        filter,
      });
    } catch (error) {
      logger.error('Failed to delete vectors by filter', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        filter,
      });
      throw error;
    }
  }

  /**
   * Delete all vectors in namespace
   */
  async deleteAll(namespace: string = 'default'): Promise<void> {
    try {
      const index = this.getIndex();

      await index.namespace(namespace).deleteAll();

      logger.warn('All vectors deleted from namespace', { namespace });
    } catch (error) {
      logger.error('Failed to delete all vectors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        namespace,
      });
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(namespace?: string): Promise<{
    dimension: number;
    indexFullness: number;
    totalVectorCount: number;
    namespaces?: Record<string, { vectorCount: number }>;
  }> {
    try {
      const index = this.getIndex();

      const stats = await index.describeIndexStats();

      return {
        dimension: stats.dimension || this.dimension,
        indexFullness: stats.indexFullness || 0,
        totalVectorCount: stats.totalRecordCount || 0,
        namespaces: stats.namespaces,
      };
    } catch (error) {
      logger.error('Failed to get index stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * List namespaces
   */
  async listNamespaces(): Promise<string[]> {
    try {
      const stats = await this.getStats();

      if (!stats.namespaces) {
        return [];
      }

      return Object.keys(stats.namespaces);
    } catch (error) {
      logger.error('Failed to list namespaces', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if client is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get index name
   */
  get index(): string {
    return this.indexName;
  }
}

// Singleton instance
export const pineconeClient = new PineconeClient();

// Auto-initialize on module load
pineconeClient.initialize().catch((error) => {
  logger.error('Failed to auto-initialize Pinecone client', { error });
});

export default pineconeClient;
