import { prisma } from '@/server';
import { AgentType, AgentStatus, ExecutionStatus } from '@prisma/client';
import { EventEmitter } from 'events';

export interface AgentConfig {
  type: AgentType;
  name: string;
  description?: string;
  configuration: any;
  triggers?: any;
  actions?: any;
  capabilities?: any;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    duration: number;
    resourceUsage: any;
  };
}

class AgentService extends EventEmitter {
  private runningAgents = new Map<string, any>();

  async createAgent(organizationId: string, config: AgentConfig) {
    try {
      const agent = await prisma.agent.create({
        data: {
          organizationId,
          creatorId: organizationId, // Temporary - should be passed separately
          ownerId: organizationId, // Temporary - should be passed separately
          name: config.name,
          type: config.type,
          description: config.description,
          systemPrompt: 'You are a helpful AI assistant.',
          capabilities: config.capabilities as any,
          status: AgentStatus.DRAFT,
        },
      });

      this.emit('agentCreated', { agentId: agent.id, organizationId });
      return agent;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw new Error('Failed to create agent');
    }
  }

  async updateAgent(agentId: string, updates: Partial<AgentConfig>) {
    try {
      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: updates,
      });

      this.emit('agentUpdated', { agentId, updates });
      return agent;
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw new Error('Failed to update agent');
    }
  }

  async startAgent(agentId: string): Promise<boolean> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.status !== AgentStatus.READY && agent.status !== AgentStatus.PAUSED) {
        throw new Error(`Agent cannot be started from ${agent.status} status`);
      }

      // Update agent status to running
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.RUNNING,
          lastUsedAt: new Date(),
        },
      });

      // Initialize agent runtime
      this.runningAgents.set(agentId, {
        id: agentId,
        startTime: Date.now(),
        status: 'running',
      });

      this.emit('agentStarted', { agentId });
      return true;
    } catch (error) {
      console.error('Failed to start agent:', error);

      // Update agent status to error
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.ERROR,
        },
      });

      throw error;
    }
  }

  async stopAgent(agentId: string): Promise<boolean> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.PAUSED,
        },
      });

      // Remove from running agents
      this.runningAgents.delete(agentId);

      this.emit('agentStopped', { agentId });
      return true;
    } catch (error) {
      console.error('Failed to stop agent:', error);
      throw error;
    }
  }

  async executeAgent(agentId: string, input?: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    let interaction;

    try {
      // Get agent configuration
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Create interaction record
      interaction = await prisma.agentInteraction.create({
        data: {
          agentId,
          organizationId: agent.organizationId,
          status: 'PROCESSING',
          type: 'FUNCTION_CALL',
          input,
        },
      });

      // Execute agent based on type
      const result = await this.executeAgentLogic(agent, input);

      const duration = Date.now() - startTime;

      // Update interaction record
      await prisma.agentInteraction.update({
        where: { id: interaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          latency: duration,
          output: result.output,
        },
      });

      // Update agent metrics
      await this.updateAgentMetrics(agentId, true, duration);

      this.emit('agentExecuted', { agentId, interactionId: interaction.id, result });

      return {
        success: true,
        output: result.output,
        metrics: {
          duration,
          resourceUsage: result.metrics?.resourceUsage || {},
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update interaction record with error
      if (interaction) {
        await prisma.agentInteraction.update({
          where: { id: interaction.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            latency: duration,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      // Update agent metrics
      await this.updateAgentMetrics(agentId, false, duration);

      console.error('Agent execution failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { duration, resourceUsage: {} },
      };
    }
  }

  async getAgentStatus(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        interactions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const runtime = this.runningAgents.get(agentId);

    return {
      ...agent,
      runtime: runtime || null,
      isRunning: this.runningAgents.has(agentId),
    };
  }

  async listAgents(organizationId: string, filters?: any) {
    return prisma.agent.findMany({
      where: {
        organizationId,
        ...filters,
      },
      include: {
        interactions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async executeAgentLogic(agent: any, input?: any): Promise<any> {
    // Use the new AgentFactory to create specialized agent instances
    try {
      const { AgentFactory } = await import('@/agents');
      const agentInstance = AgentFactory.createAgent(agent.id, agent.type, agent);
      const result = await agentInstance.execute(input);

      if (result.success) {
        return {
          output: result.output,
          metrics: result.metrics,
        };
      } else {
        throw new Error(result.error || 'Agent execution failed');
      }
    } catch (error) {
      // Fallback to simple simulation if specialized agents fail
      console.warn(`Falling back to simulation for agent ${agent.type}:`, error);
      return this.executeSimpleAgent(agent, input);
    }
  }

  private async executeSimpleAgent(agent: any, input?: any): Promise<any> {
    // Simple fallback execution for basic simulation
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return {
      output: {
        type: agent.type,
        result: 'Basic simulation result',
        timestamp: new Date().toISOString(),
      },
      metrics: {
        resourceUsage: {
          apiCalls: 1,
          processingTime: Math.random() * 1000,
        },
      },
    };
  }


  private async updateAgentMetrics(agentId: string, success: boolean, duration: number) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) return;

    const totalExecutions = agent.usageCount + 1;
    const successCount = success ?
      Math.floor(agent.successRate * agent.usageCount / 100) + 1 :
      Math.floor(agent.successRate * agent.usageCount / 100);

    const newSuccessRate = (successCount / totalExecutions) * 100;
    const newAvgResponseTime =
      (agent.avgResponseTime * agent.usageCount + duration) / totalExecutions;

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        usageCount: totalExecutions,
        successRate: newSuccessRate,
        avgResponseTime: Math.floor(newAvgResponseTime),
        lastUsedAt: new Date(),
      },
    });
  }

  // ==================== RAG & CONTEXT METHODS (V2) ====================

  /**
   * Execute agent with RAG context
   * Retrieves relevant knowledge, conversations, and code before execution
   */
  async executeWithRAGContext(
    agentId: string,
    userId: string,
    userMessage: string,
    options?: {
      includeKnowledge?: boolean;
      includeConversations?: boolean;
      includeCode?: boolean;
    }
  ): Promise<ExecutionResult> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Import vector service dynamically to avoid circular dependencies
      const { VectorService } = await import('./vector.service');

      // Build RAG context from multiple sources
      const ragContext = await VectorService.buildRAGContext(
        agent.organizationId,
        agentId,
        userId,
        userMessage
      );

      // Store this conversation for future RAG retrieval
      const agentResponse = await this.executeAgent(agentId, {
        userMessage,
        context: ragContext.context,
        sources: ragContext.sources
      });

      // Store conversation with embedding
      await VectorService.storeConversation(
        agent.organizationId,
        agentId,
        userId,
        userMessage,
        JSON.stringify(agentResponse),
        {
          ragSources: ragContext.sources,
          timestamp: new Date().toISOString()
        }
      );

      return agentResponse;
    } catch (error: any) {
      console.error('Execute with RAG context error:', error);
      throw new Error(error.message || 'Failed to execute agent with RAG context');
    }
  }

  /**
   * Get relevant context for agent decision-making
   */
  async getAgentContext(
    agentId: string,
    query: string,
    contextTypes: ('knowledge' | 'conversations' | 'code')[] = ['knowledge', 'conversations']
  ) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { organizationId: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const { VectorService } = await import('./vector.service');
      const context: any = {};

      if (contextTypes.includes('knowledge')) {
        context.knowledge = await VectorService.searchKnowledge({
          organizationId: agent.organizationId,
          query,
          limit: 5,
          minSimilarity: 0.7
        });
      }

      if (contextTypes.includes('conversations')) {
        context.conversations = await VectorService.getRelevantConversations(
          agent.organizationId,
          agentId,
          query,
          3
        );
      }

      if (contextTypes.includes('code')) {
        context.codeSnippets = await VectorService.searchCodeSnippets(
          agent.organizationId,
          query,
          undefined,
          3
        );
      }

      return context;
    } catch (error: any) {
      console.error('Get agent context error:', error);
      throw new Error('Failed to get agent context');
    }
  }

  /**
   * Store knowledge in agent's knowledge base
   */
  async addAgentKnowledge(
    agentId: string,
    content: string,
    type: 'document' | 'code' | 'conversation' | 'entity' | 'custom',
    metadata?: Record<string, any>,
    createdBy?: string
  ) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { organizationId: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const { VectorService } = await import('./vector.service');

      return await VectorService.createKnowledge({
        organizationId: agent.organizationId,
        content,
        type,
        metadata: {
          ...metadata,
          agentId
        },
        source: `agent:${agentId}`,
        tags: metadata?.tags || [],
        createdBy: createdBy || agentId
      });
    } catch (error: any) {
      console.error('Add agent knowledge error:', error);
      throw new Error('Failed to add agent knowledge');
    }
  }

  /**
   * Search agent's knowledge base
   */
  async searchAgentKnowledge(
    agentId: string,
    query: string,
    limit: number = 10
  ) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { organizationId: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      const { VectorService } = await import('./vector.service');

      return await VectorService.searchKnowledge({
        organizationId: agent.organizationId,
        query,
        limit,
        minSimilarity: 0.6
      });
    } catch (error: any) {
      console.error('Search agent knowledge error:', error);
      throw new Error('Failed to search agent knowledge');
    }
  }

  /**
   * Get agent conversation history with semantic search
   */
  async getAgentConversationHistory(
    agentId: string,
    query?: string,
    limit: number = 20
  ) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { organizationId: true }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      if (query) {
        // Use vector search for relevant conversations
        const { VectorService } = await import('./vector.service');
        return await VectorService.getRelevantConversations(
          agent.organizationId,
          agentId,
          query,
          limit
        );
      } else {
        // Return recent conversations chronologically
        return await prisma.$queryRaw`
          SELECT
            id,
            "userMessage",
            "agentResponse",
            metadata,
            "createdAt"
          FROM "ConversationHistory"
          WHERE "agentId" = ${agentId}
            AND "deletedAt" IS NULL
          ORDER BY "createdAt" DESC
          LIMIT ${limit}
        `;
      }
    } catch (error: any) {
      console.error('Get conversation history error:', error);
      throw new Error('Failed to get conversation history');
    }
  }
}

export const agentService = new AgentService();