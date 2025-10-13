/**
 * ==================== BUILT-IN TOOLS ====================
 *
 * Pre-built tools that ship with the platform
 *
 * Categories:
 * - Data tools (database queries, API calls)
 * - Communication tools (email, notifications)
 * - Analysis tools (data analysis, reporting)
 * - Integration tools (third-party services)
 *
 * @module orchestrator/built-in-tools
 */

import { z } from 'zod';
import { ToolDefinition, toolRegistry } from './tool.system';
import { logger } from '../infrastructure/logger';

// Lazy-import services to avoid blocking module load with PrismaClient instantiation
const getConnectorService = () => require('../services/connector.service').connectorService;
const getKnowledgeBaseService = () => require('../rag-system/knowledge-base.service').knowledgeBaseService;
const getSemanticSearchService = () => require('../rag-system/semantic-search.service').semanticSearchService;

// ==================== DATA TOOLS ====================

/**
 * Database Query Tool
 */
export const databaseQueryTool: ToolDefinition = {
  id: 'tool_database_query',
  name: 'Database Query',
  description: 'Execute queries on connected databases',
  category: 'data',
  version: '1.0.0',

  inputSchema: z.object({
    connectorId: z.string(),
    operation: z.enum(['read', 'count', 'aggregate']),
    resource: z.string(),
    filters: z.record(z.any()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),

  outputSchema: z.object({
    data: z.array(z.any()),
    metadata: z.object({
      total: z.number().optional(),
      hasMore: z.boolean().optional(),
    }),
  }),

  async execute(input, context) {
    const connectorService = getConnectorService();
    const result = await connectorService.queryConnector(
      input.connectorId,
      context.organizationId,
      {
        operation: input.operation,
        resource: input.resource,
        filters: input.filters,
        limit: input.limit,
        offset: input.offset,
      }
    );

    return result;
  },

  config: {
    timeout: 30000,
    retryable: true,
    maxRetries: 2,
    rateLimit: {
      requests: 100,
      windowMs: 60000, // 100 requests per minute
    },
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['database', 'query', 'data'],
    documentation: 'Query data from connected databases',
    examples: [
      {
        input: {
          connectorId: 'conn_123',
          operation: 'read',
          resource: 'users',
          limit: 10,
        },
        output: {
          data: [{ id: 1, name: 'John' }],
          metadata: { total: 100, hasMore: true },
        },
        description: 'Fetch first 10 users from database',
      },
    ],
  },
};

/**
 * API Call Tool
 */
export const apiCallTool: ToolDefinition = {
  id: 'tool_api_call',
  name: 'API Call',
  description: 'Make HTTP API calls to external services',
  category: 'integration',
  version: '1.0.0',

  inputSchema: z.object({
    connectorId: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    endpoint: z.string(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    params: z.record(z.string()).optional(),
  }),

  outputSchema: z.object({
    status: z.number(),
    data: z.any(),
    headers: z.record(z.string()).optional(),
  }),

  async execute(input, context) {
    const connectorService = getConnectorService();
    const result = await connectorService.executeAction(
      input.connectorId,
      context.organizationId,
      context.userId,
      {
        operation: input.method.toLowerCase(),
        resource: input.endpoint,
        data: input.body,
        metadata: {
          headers: input.headers,
          params: input.params,
        },
      }
    );

    return {
      status: 200,
      data: result.data,
    };
  },

  config: {
    timeout: 30000,
    retryable: true,
    maxRetries: 3,
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['api', 'http', 'integration'],
    documentation: 'Make HTTP requests to external APIs',
  },
};

// ==================== KNOWLEDGE TOOLS ====================

/**
 * Knowledge Search Tool
 */
export const knowledgeSearchTool: ToolDefinition = {
  id: 'tool_knowledge_search',
  name: 'Knowledge Search',
  description: 'Search the knowledge base using semantic search',
  category: 'data',
  version: '1.0.0',

  inputSchema: z.object({
    query: z.string(),
    topK: z.number().optional().default(5),
    minScore: z.number().optional().default(0.7),
    type: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),

  outputSchema: z.object({
    results: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        score: z.number(),
        type: z.string(),
        title: z.string().optional(),
        source: z.string().optional(),
      })
    ),
    metadata: z.object({
      count: z.number(),
      avgScore: z.number(),
    }),
  }),

  async execute(input, context) {
    const semanticSearchService = getSemanticSearchService();
    const results = await semanticSearchService.search(input.query, context.organizationId, {
      topK: input.topK,
      minScore: input.minScore,
      type: input.type,
      tags: input.tags,
      includeContent: true,
    });

    const avgScore =
      results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;

    return {
      results: results.map((r) => ({
        id: r.id,
        content: r.content || '',
        score: r.score,
        type: r.type,
        title: r.title,
        source: r.source,
      })),
      metadata: {
        count: results.length,
        avgScore,
      },
    };
  },

  config: {
    timeout: 15000,
    retryable: true,
    maxRetries: 2,
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['knowledge', 'search', 'rag'],
    documentation: 'Search the knowledge base with AI-powered semantic search',
  },
};

/**
 * Knowledge Create Tool
 */
export const knowledgeCreateTool: ToolDefinition = {
  id: 'tool_knowledge_create',
  name: 'Knowledge Create',
  description: 'Add new entries to the knowledge base',
  category: 'data',
  version: '1.0.0',

  inputSchema: z.object({
    content: z.string(),
    type: z.enum(['document', 'code', 'conversation', 'entity', 'custom']),
    title: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
  }),

  outputSchema: z.object({
    id: z.string(),
    content: z.string(),
    type: z.string(),
  }),

  async execute(input, context) {
    const knowledgeBaseService = getKnowledgeBaseService();
    const entry = await knowledgeBaseService.createKnowledge({
      organizationId: context.organizationId,
      content: input.content,
      type: input.type,
      title: input.title,
      source: input.source,
      tags: input.tags || [],
      metadata: input.metadata,
      createdBy: context.userId,
    });

    return {
      id: entry.id,
      content: entry.content,
      type: entry.type,
    };
  },

  config: {
    timeout: 20000,
    retryable: false,
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['knowledge', 'create', 'data'],
    documentation: 'Create new knowledge base entries with automatic embeddings',
  },
};

// ==================== ANALYSIS TOOLS ====================

/**
 * Data Analysis Tool
 */
export const dataAnalysisTool: ToolDefinition = {
  id: 'tool_data_analysis',
  name: 'Data Analysis',
  description: 'Perform statistical analysis on datasets',
  category: 'analysis',
  version: '1.0.0',

  inputSchema: z.object({
    data: z.array(z.record(z.any())),
    operations: z.array(
      z.enum(['count', 'sum', 'average', 'min', 'max', 'groupBy', 'filter'])
    ),
    field: z.string().optional(),
    groupByField: z.string().optional(),
    filterCondition: z.record(z.any()).optional(),
  }),

  outputSchema: z.object({
    results: z.record(z.any()),
    summary: z.object({
      totalRecords: z.number(),
      operationsPerformed: z.array(z.string()),
    }),
  }),

  async execute(input) {
    const { data, operations, field, groupByField, filterCondition } = input;

    let processedData = [...data];
    const results: Record<string, any> = {};

    // Filter
    if (operations.includes('filter') && filterCondition) {
      processedData = processedData.filter((item) => {
        return Object.entries(filterCondition).every(
          ([key, value]) => item[key] === value
        );
      });
      results.filteredCount = processedData.length;
    }

    // Count
    if (operations.includes('count')) {
      results.count = processedData.length;
    }

    // Sum
    if (operations.includes('sum') && field) {
      results.sum = processedData.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
    }

    // Average
    if (operations.includes('average') && field) {
      const sum = processedData.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
      results.average = processedData.length > 0 ? sum / processedData.length : 0;
    }

    // Min/Max
    if (operations.includes('min') && field) {
      const values = processedData.map((item) => Number(item[field])).filter((v) => !isNaN(v));
      results.min = values.length > 0 ? Math.min(...values) : null;
    }

    if (operations.includes('max') && field) {
      const values = processedData.map((item) => Number(item[field])).filter((v) => !isNaN(v));
      results.max = values.length > 0 ? Math.max(...values) : null;
    }

    // Group By
    if (operations.includes('groupBy') && groupByField) {
      const grouped: Record<string, any[]> = {};
      processedData.forEach((item) => {
        const key = String(item[groupByField]);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
      results.groupBy = Object.entries(grouped).map(([key, items]) => ({
        key,
        count: items.length,
      }));
    }

    return {
      results,
      summary: {
        totalRecords: processedData.length,
        operationsPerformed: operations,
      },
    };
  },

  config: {
    timeout: 60000, // 1 minute for large datasets
    retryable: false,
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['analysis', 'statistics', 'data'],
    documentation: 'Perform statistical operations on datasets',
  },
};

// ==================== UTILITY TOOLS ====================

/**
 * Text Transform Tool
 */
export const textTransformTool: ToolDefinition = {
  id: 'tool_text_transform',
  name: 'Text Transform',
  description: 'Transform and manipulate text',
  category: 'custom',
  version: '1.0.0',

  inputSchema: z.object({
    text: z.string(),
    operations: z.array(
      z.enum([
        'uppercase',
        'lowercase',
        'trim',
        'reverse',
        'slugify',
        'capitalize',
        'wordCount',
        'extract_emails',
        'extract_urls',
      ])
    ),
  }),

  outputSchema: z.object({
    result: z.any(),
    operations: z.array(z.string()),
  }),

  async execute(input) {
    let result: any = input.text;

    for (const operation of input.operations) {
      switch (operation) {
        case 'uppercase':
          result = result.toUpperCase();
          break;
        case 'lowercase':
          result = result.toLowerCase();
          break;
        case 'trim':
          result = result.trim();
          break;
        case 'reverse':
          result = result.split('').reverse().join('');
          break;
        case 'slugify':
          result = result
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          break;
        case 'capitalize':
          result = result
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          break;
        case 'wordCount':
          result = result.split(/\s+/).length;
          break;
        case 'extract_emails':
          result = result.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
          break;
        case 'extract_urls':
          result = result.match(/https?:\/\/[^\s]+/g) || [];
          break;
      }
    }

    return {
      result,
      operations: input.operations,
    };
  },

  config: {
    timeout: 5000,
    retryable: false,
  },

  metadata: {
    author: 'NeurallEmpire',
    tags: ['text', 'transform', 'utility'],
    documentation: 'Perform various text transformations',
  },
};

// ==================== REGISTER ALL BUILT-IN TOOLS ====================

export function registerBuiltInTools(): void {
  const tools = [
    databaseQueryTool,
    apiCallTool,
    knowledgeSearchTool,
    knowledgeCreateTool,
    dataAnalysisTool,
    textTransformTool,
  ];

  tools.forEach((tool) => {
    try {
      toolRegistry.register(tool);
      logger.info('Built-in tool registered', { toolId: tool.id, toolName: tool.name });
    } catch (error) {
      logger.error('Failed to register built-in tool', {
        toolId: tool.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  logger.info('All built-in tools registered', { count: tools.length });
}

// NOTE: Call registerBuiltInTools() explicitly after server initialization
// Removed auto-registration to prevent blocking on module import
