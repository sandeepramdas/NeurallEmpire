/**
 * ==================== CONTEXT ENGINE ORCHESTRATOR ====================
 *
 * Main orchestrator that builds rich context for agent executions
 *
 * Features:
 * - Session context management
 * - User preferences integration
 * - Connector data integration
 * - Context building and enrichment
 * - Context caching and optimization
 *
 * @module context-engine/context-orchestrator
 */

import { PrismaClient } from '@prisma/client';
import { sessionMemoryService, SessionData } from './session-memory.service';
import { userPreferencesService, UserPreferences } from './user-preferences.service';
import { redis } from './redis.client';
import { logger } from '../infrastructure/logger';
import { connectorService } from '../services/connector.service';
import { ragOrchestrator } from '../rag-system/rag.orchestrator';
import { semanticSearchService } from '../rag-system/semantic-search.service';

const prisma = new PrismaClient();

export interface AgentContext {
  // Session information
  session: {
    id: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: Date;
    }>;
    context: Record<string, any>;
    metadata: {
      messageCount: number;
      totalTokens: number;
      totalCost: number;
    };
  };

  // User information
  user: {
    id: string;
    organizationId: string;
    preferences: UserPreferences;
    insights?: {
      mostUsedAgents: Array<{ id: string; name: string }>;
      preferredModels: Array<{ model: string }>;
    };
  };

  // Agent information
  agent: {
    id: string;
    name: string;
    config: Record<string, any>;
    tools: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };

  // Connector data
  connectors?: Array<{
    id: string;
    name: string;
    type: string;
    schema?: any;
    recentData?: any;
  }>;

  // Knowledge base context
  knowledge?: Array<{
    id: string;
    content: string;
    relevance: number;
    source: string;
  }>;

  // Metadata
  metadata: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

export interface ContextBuildOptions {
  includeHistory?: boolean;
  historyLimit?: number;
  includeConnectors?: boolean;
  includeKnowledge?: boolean;
  knowledgeQuery?: string;
  includeInsights?: boolean;
}

export interface ContextUpdateInput {
  sessionId: string;
  userId: string;
  organizationId: string;
  updates: Record<string, any>;
}

export class ContextOrchestrator {
  private readonly CONTEXT_CACHE_TTL = 60 * 5; // 5 minutes

  /**
   * Build complete context for agent execution
   */
  async buildContext(
    sessionId: string,
    userId: string,
    organizationId: string,
    agentId: string,
    options: ContextBuildOptions = {}
  ): Promise<AgentContext> {
    const {
      includeHistory = true,
      historyLimit = 10,
      includeConnectors = false,
      includeKnowledge = false,
      knowledgeQuery = '',
      includeInsights = false,
    } = options;

    logger.info('Building agent context', {
      sessionId,
      userId,
      agentId,
      options,
    });

    const startTime = Date.now();

    try {
      // Fetch all required data in parallel
      const [session, preferences, agent, connectorData, insights] = await Promise.all([
        // Session data
        sessionMemoryService.getSession(sessionId),

        // User preferences
        userPreferencesService.getUserPreferences(userId, organizationId),

        // Agent configuration
        this.getAgentConfig(agentId, organizationId),

        // Connector data (if requested)
        includeConnectors ? this.getConnectorData(agentId, organizationId) : Promise.resolve([]),

        // Adaptive insights (if requested)
        includeInsights
          ? userPreferencesService.getAdaptiveInsights(userId, organizationId)
          : Promise.resolve(null),
      ]);

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Build message history
      const messages = includeHistory
        ? await sessionMemoryService.getHistory(sessionId, historyLimit)
        : [];

      // Get knowledge base context (if requested)
      const knowledge = includeKnowledge && knowledgeQuery
        ? await this.getKnowledgeContext(organizationId, agentId, knowledgeQuery)
        : undefined;

      // Build agent context
      const context: AgentContext = {
        session: {
          id: session.sessionId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          context: session.context,
          metadata: {
            messageCount: session.metadata.totalMessages,
            totalTokens: session.metadata.totalTokens,
            totalCost: session.metadata.totalCost,
          },
        },
        user: {
          id: userId,
          organizationId,
          preferences,
          insights: includeInsights && insights
            ? {
                mostUsedAgents: insights.mostUsedAgents.map((a) => ({
                  id: a.id,
                  name: a.name,
                })),
                preferredModels: insights.preferredModels.map((m) => ({
                  model: m.model,
                })),
              }
            : undefined,
        },
        agent: {
          id: agent.id,
          name: agent.name,
          config: agent.config,
          tools: agent.tools,
        },
        connectors: connectorData.length > 0 ? connectorData : undefined,
        knowledge,
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          version: '3.0',
        },
      };

      const duration = Date.now() - startTime;
      logger.info('Context built successfully', {
        sessionId,
        agentId,
        duration,
        componentsIncluded: {
          history: includeHistory,
          connectors: includeConnectors && connectorData.length > 0,
          knowledge: includeKnowledge && knowledge !== undefined,
          insights: includeInsights && insights !== null,
        },
      });

      // Cache context for quick access
      await this.cacheContext(sessionId, agentId, context);

      return context;
    } catch (error) {
      logger.error('Failed to build context', {
        sessionId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update session context
   */
  async updateContext(input: ContextUpdateInput): Promise<void> {
    const { sessionId, userId, organizationId, updates } = input;

    await sessionMemoryService.updateContext(sessionId, updates);

    logger.info('Session context updated', {
      sessionId,
      userId,
      updatedKeys: Object.keys(updates),
    });

    // Invalidate cached context
    await this.invalidateContextCache(sessionId);
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    metadata?: {
      model?: string;
      tokens?: number;
      cost?: number;
      toolCalls?: any[];
      components?: any[];
    }
  ): Promise<void> {
    await sessionMemoryService.addMessage(sessionId, {
      role,
      content,
      metadata,
    });

    // Track interaction
    const session = await sessionMemoryService.getSession(sessionId);
    if (session && role === 'user') {
      await userPreferencesService.trackInteraction({
        userId: session.userId,
        organizationId: session.organizationId,
        type: 'agent_execution',
        resource: 'agent',
        resourceId: session.agentId || 'unknown',
        metadata: { messageLength: content.length },
        timestamp: new Date(),
      });
    }

    // Invalidate cached context
    await this.invalidateContextCache(sessionId);
  }

  /**
   * Get agent configuration
   */
  private async getAgentConfig(
    agentId: string,
    organizationId: string
  ): Promise<{
    id: string;
    name: string;
    config: Record<string, any>;
    tools: Array<{ id: string; name: string; type: string }>;
  } | null> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId, organizationId },
      include: {
        tools: {
          include: {
            tool: true,
          },
        },
      } as any,
    });

    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      config: {
        systemPrompt: agent.systemPrompt,
        modelConfig: (agent as any).modelConfig,
        capabilities: agent.capabilities,
      },
      tools: ((agent as any).tools || []).map((at: any) => ({
        id: at.tool.id,
        name: at.tool.name,
        type: at.tool.type,
      })),
    };
  }

  /**
   * Get connector data for agent
   */
  private async getConnectorData(
    agentId: string,
    organizationId: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      schema?: any;
      recentData?: any;
    }>
  > {
    // Get connectors linked to agent
    const agentConnectors = await (prisma as any).agentConnector.findMany({
      where: { agentId },
      include: { connector: true },
    });

    if (agentConnectors.length === 0) {
      return [];
    }

    // Load each connector and get schema
    const connectorPromises = agentConnectors.map(async (ac) => {
      try {
        const connector = ac.connector;

        // Get schema (cached)
        let schema: any = null;
        try {
          schema = await connectorService.getConnectorSchema(connector.id, organizationId);
        } catch (error) {
          logger.warn('Failed to get connector schema', {
            connectorId: connector.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        return {
          id: connector.id,
          name: connector.name,
          type: connector.type,
          schema,
          recentData: undefined, // Can be enhanced later
        };
      } catch (error) {
        logger.error('Failed to load connector data', {
          connectorId: ac.connectorId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    });

    const results = await Promise.all(connectorPromises);
    return results.filter((r) => r !== null) as any[];
  }

  /**
   * Get knowledge context from RAG system
   */
  private async getKnowledgeContext(
    organizationId: string,
    agentId: string,
    query: string
  ): Promise<
    Array<{
      id: string;
      content: string;
      relevance: number;
      source: string;
    }>
  > {
    try {
      logger.debug('Retrieving knowledge context via RAG', {
        organizationId,
        agentId,
        query: query.substring(0, 100),
      });

      // Use RAG system for semantic search
      const ragContext = await ragOrchestrator.retrieveContext(query, organizationId, {
        topK: 5,
        minScore: 0.7,
        useCache: true,
      });

      // Map RAG results to knowledge context format
      return ragContext.results.map((result) => ({
        id: result.id,
        content: result.content || '',
        relevance: result.score,
        source: result.source || result.type,
      }));
    } catch (error) {
      logger.error('Failed to retrieve knowledge context via RAG', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        agentId,
      });

      // Fallback to basic database query
      const entries = await prisma.knowledgeBaseEntry.findMany({
        where: {
          organizationId,
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return entries.map((entry) => ({
        id: entry.id,
        content: entry.content,
        relevance: 0.5,
        source: entry.source || 'knowledge_base',
      }));
    }
  }

  /**
   * Cache context
   */
  private async cacheContext(
    sessionId: string,
    agentId: string,
    context: AgentContext
  ): Promise<void> {
    const key = this.getContextCacheKey(sessionId, agentId);
    await redis.setJSON(key, context, this.CONTEXT_CACHE_TTL);
  }

  /**
   * Get cached context
   */
  async getCachedContext(sessionId: string, agentId: string): Promise<AgentContext | null> {
    const key = this.getContextCacheKey(sessionId, agentId);
    return await redis.getJSON<AgentContext>(key);
  }

  /**
   * Invalidate context cache
   */
  private async invalidateContextCache(sessionId: string): Promise<void> {
    // Delete all cached contexts for this session
    const pattern = `context:${sessionId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.deleteMany(keys);
    }
  }

  /**
   * Get context cache key
   */
  private getContextCacheKey(sessionId: string, agentId: string): string {
    return `context:${sessionId}:${agentId}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get context statistics
   */
  async getContextStats(sessionId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    totalCost: number;
    contextSize: number;
    lastActivity: Date;
  }> {
    const session = await sessionMemoryService.getSession(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const stats = await sessionMemoryService.getSessionStats(sessionId);

    return {
      messageCount: stats.messageCount,
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      contextSize: JSON.stringify(session.context).length,
      lastActivity: session.metadata.lastActivity,
    };
  }

  /**
   * Enrich context with real-time data
   */
  async enrichContext(
    context: AgentContext,
    enrichmentType: 'connector_data' | 'knowledge_search' | 'user_insights',
    params?: Record<string, any>
  ): Promise<AgentContext> {
    logger.info('Enriching context', {
      sessionId: context.session.id,
      enrichmentType,
      params,
    });

    switch (enrichmentType) {
      case 'connector_data':
        // Add real-time connector data
        if (params?.connectorId) {
          try {
            const queryResult = await connectorService.queryConnector(
              params.connectorId,
              context.user.organizationId,
              params.query || { operation: 'read', limit: 10 }
            );

            // Add to context
            const connectorIndex = context.connectors?.findIndex(
              (c) => c.id === params.connectorId
            );
            if (connectorIndex !== undefined && connectorIndex >= 0 && context.connectors) {
              context.connectors[connectorIndex].recentData = queryResult.data;
            }
          } catch (error) {
            logger.error('Failed to enrich with connector data', { error });
          }
        }
        break;

      case 'knowledge_search':
        // Add knowledge base results
        if (params?.query) {
          const knowledge = await this.getKnowledgeContext(
            context.user.organizationId,
            context.agent.id,
            params.query
          );
          context.knowledge = knowledge;
        }
        break;

      case 'user_insights':
        // Add user insights
        const insights = await userPreferencesService.getAdaptiveInsights(
          context.user.id,
          context.user.organizationId
        );
        context.user.insights = {
          mostUsedAgents: insights.mostUsedAgents.map((a) => ({
            id: a.id,
            name: a.name,
          })),
          preferredModels: insights.preferredModels.map((m) => ({
            model: m.model,
          })),
        };
        break;
    }

    return context;
  }

  /**
   * Create session with agent context
   */
  async createSession(
    userId: string,
    organizationId: string,
    agentId: string,
    initialContext?: Record<string, any>
  ): Promise<string> {
    const sessionId = await sessionMemoryService.createSession(
      userId,
      organizationId,
      agentId
    );

    // Add initial context if provided
    if (initialContext) {
      await sessionMemoryService.updateContext(sessionId, initialContext);
    }

    // Track session creation
    await userPreferencesService.trackInteraction({
      userId,
      organizationId,
      type: 'agent_execution',
      resource: 'session',
      resourceId: sessionId,
      metadata: { agentId },
      timestamp: new Date(),
    });

    logger.info('Session created with agent context', {
      sessionId,
      userId,
      agentId,
    });

    return sessionId;
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    await sessionMemoryService.deleteSession(sessionId);
    await this.invalidateContextCache(sessionId);

    logger.info('Session ended', { sessionId });
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string): Promise<void> {
    await sessionMemoryService.refreshSession(sessionId);
  }
}

// Singleton instance
export const contextOrchestrator = new ContextOrchestrator();
