/**
 * ==================== MULTI-AGENT COORDINATOR ====================
 *
 * Coordinates multiple AI agents working together on complex tasks
 *
 * Features:
 * - Agent collaboration patterns (sequential, parallel, hierarchical)
 * - Agent-to-agent communication
 * - Work distribution and load balancing
 * - Consensus building
 * - Conflict resolution
 * - Shared context management
 *
 * @module orchestrator/multi-agent-coordinator
 */

import { logger } from '../infrastructure/logger';
import { redis } from '../context-engine/redis.client';
import { contextOrchestrator } from '../context-engine/context.orchestrator';
import { prisma } from './prisma.client';

// ==================== TYPES ====================

export type CollaborationPattern = 'sequential' | 'parallel' | 'hierarchical' | 'consensus' | 'debate';

export interface AgentTask {
  agentId: string;
  taskId: string;
  instruction: string;
  input: any;
  dependsOn?: string[]; // Task IDs this task depends on
  priority?: number; // 1-10, higher = more important
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface AgentCollaboration {
  id: string;
  organizationId: string;
  pattern: CollaborationPattern;
  name: string;
  description?: string;
  coordinatorAgentId?: string; // For hierarchical pattern
  tasks: AgentTask[];
  sharedContext: Record<string, any>;
  config: {
    timeout?: number; // Overall collaboration timeout
    requireConsensus?: boolean; // For consensus pattern
    consensusThreshold?: number; // 0-1, percentage agreement needed
    allowConflicts?: boolean;
    maxIterations?: number; // For debate pattern
  };
  metadata?: Record<string, any>;
}

export interface CollaborationState {
  collaborationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentIteration: number;
  taskStates: Map<string, TaskState>;
  agentStates: Map<string, AgentState>;
  communications: AgentCommunication[];
  consensusResults?: ConsensusResult;
  sharedContext: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  results: Map<string, any>;
  errors: Array<{ agentId: string; taskId: string; error: string; timestamp: Date }>;
}

export interface TaskState {
  taskId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  attempts: number;
}

export interface AgentState {
  agentId: string;
  status: 'idle' | 'busy' | 'waiting' | 'failed';
  currentTaskId?: string;
  tasksCompleted: number;
  tasksFailed: number;
  lastActivity?: Date;
}

export interface AgentCommunication {
  id: string;
  fromAgentId: string;
  toAgentId: string; // or 'all' for broadcast
  type: 'request' | 'response' | 'notification' | 'query' | 'feedback';
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConsensusResult {
  agreed: boolean;
  agreement: any; // The agreed-upon result
  votes: Map<string, any>; // Agent votes
  confidence: number; // 0-1
  iterations: number;
  timestamp: Date;
}

export interface CollaborationResult {
  success: boolean;
  collaborationId: string;
  pattern: CollaborationPattern;
  results: Map<string, any>; // Results by task ID
  consensusResult?: ConsensusResult;
  communications: AgentCommunication[];
  duration: number;
  tasksCompleted: number;
  tasksFailed: number;
  agentStats: Map<string, { completed: number; failed: number }>;
}

// ==================== MULTI-AGENT COORDINATOR ====================

export class MultiAgentCoordinator {
  private readonly STATE_CACHE_TTL = 60 * 60; // 1 hour

  /**
   * Create a collaboration
   */
  async createCollaboration(
    collaboration: Omit<AgentCollaboration, 'id'>
  ): Promise<AgentCollaboration> {
    try {
      const created = await prisma.agentCollaboration.create({
        data: {
          organizationId: collaboration.organizationId,
          pattern: collaboration.pattern,
          name: collaboration.name,
          description: collaboration.description,
          definition: collaboration as any,
          status: 'pending',
          createdAt: new Date(),
        },
      });

      logger.info('Agent collaboration created', {
        collaborationId: created.id,
        pattern: collaboration.pattern,
        agentCount: new Set(collaboration.tasks.map((t) => t.agentId)).size,
        taskCount: collaboration.tasks.length,
      });

      return {
        id: created.id,
        ...collaboration,
      };
    } catch (error) {
      logger.error('Failed to create collaboration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute a collaboration
   */
  async executeCollaboration(
    collaborationId: string,
    userId: string,
    organizationId: string
  ): Promise<CollaborationResult> {
    const startTime = Date.now();

    try {
      // Load collaboration
      const collaboration = await this.getCollaboration(collaborationId, organizationId);
      if (!collaboration) {
        throw new Error(`Collaboration ${collaborationId} not found`);
      }

      // Initialize state
      const state: CollaborationState = {
        collaborationId,
        status: 'running',
        currentIteration: 0,
        taskStates: new Map(),
        agentStates: new Map(),
        communications: [],
        sharedContext: { ...collaboration.sharedContext },
        startTime: new Date(),
        results: new Map(),
        errors: [],
      };

      // Initialize task states
      collaboration.tasks.forEach((task) => {
        state.taskStates.set(task.taskId, {
          taskId: task.taskId,
          agentId: task.agentId,
          status: 'pending',
          attempts: 0,
        });
      });

      // Initialize agent states
      const agentIds = new Set(collaboration.tasks.map((t) => t.agentId));
      agentIds.forEach((agentId) => {
        state.agentStates.set(agentId, {
          agentId,
          status: 'idle',
          tasksCompleted: 0,
          tasksFailed: 0,
        });
      });

      await this.cacheState(collaborationId, state);

      logger.info('Collaboration execution started', {
        collaborationId,
        pattern: collaboration.pattern,
        agentCount: agentIds.size,
        taskCount: collaboration.tasks.length,
      });

      // Execute based on pattern
      let result: CollaborationResult;

      switch (collaboration.pattern) {
        case 'sequential':
          result = await this.executeSequential(collaboration, state, userId);
          break;

        case 'parallel':
          result = await this.executeParallel(collaboration, state, userId);
          break;

        case 'hierarchical':
          result = await this.executeHierarchical(collaboration, state, userId);
          break;

        case 'consensus':
          result = await this.executeConsensus(collaboration, state, userId);
          break;

        case 'debate':
          result = await this.executeDebate(collaboration, state, userId);
          break;

        default:
          throw new Error(`Unknown collaboration pattern: ${collaboration.pattern}`);
      }

      state.status = 'completed';
      state.endTime = new Date();

      await this.cacheState(collaborationId, state);

      const duration = Date.now() - startTime;

      logger.info('Collaboration execution completed', {
        collaborationId,
        pattern: collaboration.pattern,
        duration,
        tasksCompleted: result.tasksCompleted,
      });

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Collaboration execution failed', {
        collaborationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  }

  /**
   * Execute sequential pattern - agents work one after another
   */
  private async executeSequential(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    userId: string
  ): Promise<CollaborationResult> {
    const results = new Map<string, any>();

    for (const task of collaboration.tasks) {
      try {
        const result = await this.executeAgentTask(task, state, userId, collaboration.organizationId);
        results.set(task.taskId, result);

        // Update shared context with result
        state.sharedContext[`task_${task.taskId}_result`] = result;
      } catch (error) {
        state.errors.push({
          agentId: task.agentId,
          taskId: task.taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });

        throw error;
      }
    }

    return this.buildCollaborationResult(collaboration, state, results);
  }

  /**
   * Execute parallel pattern - all agents work simultaneously
   */
  private async executeParallel(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    userId: string
  ): Promise<CollaborationResult> {
    const promises = collaboration.tasks.map((task) =>
      this.executeAgentTask(task, state, userId, collaboration.organizationId)
        .then((result) => ({ taskId: task.taskId, result }))
        .catch((error) => ({
          taskId: task.taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
    );

    const outcomes = await Promise.all(promises);

    const results = new Map<string, any>();

    outcomes.forEach((outcome) => {
      if ('error' in outcome) {
        const task = collaboration.tasks.find((t) => t.taskId === outcome.taskId)!;
        state.errors.push({
          agentId: task.agentId,
          taskId: outcome.taskId,
          error: outcome.error,
          timestamp: new Date(),
        });
      } else {
        results.set(outcome.taskId, outcome.result);
      }
    });

    return this.buildCollaborationResult(collaboration, state, results);
  }

  /**
   * Execute hierarchical pattern - coordinator agent delegates to worker agents
   */
  private async executeHierarchical(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    userId: string
  ): Promise<CollaborationResult> {
    if (!collaboration.coordinatorAgentId) {
      throw new Error('Hierarchical pattern requires a coordinator agent');
    }

    // Step 1: Coordinator plans the work
    const coordinatorTask: AgentTask = {
      agentId: collaboration.coordinatorAgentId,
      taskId: 'coordinator_planning',
      instruction: `Plan how to delegate the following tasks: ${collaboration.tasks.map((t) => t.instruction).join('; ')}`,
      input: {
        tasks: collaboration.tasks,
        sharedContext: state.sharedContext,
      },
    };

    const plan = await this.executeAgentTask(
      coordinatorTask,
      state,
      userId,
      collaboration.organizationId
    );

    // Step 2: Execute worker tasks based on plan
    const workerTasks = collaboration.tasks.filter(
      (t) => t.agentId !== collaboration.coordinatorAgentId
    );

    const results = new Map<string, any>();
    results.set('coordinator_planning', plan);

    for (const task of workerTasks) {
      const result = await this.executeAgentTask(task, state, userId, collaboration.organizationId);
      results.set(task.taskId, result);

      // Report back to coordinator
      await this.sendCommunication(
        task.agentId,
        collaboration.coordinatorAgentId,
        'notification',
        { taskId: task.taskId, result },
        state
      );
    }

    // Step 3: Coordinator reviews and synthesizes results
    const synthesisTask: AgentTask = {
      agentId: collaboration.coordinatorAgentId,
      taskId: 'coordinator_synthesis',
      instruction: 'Review and synthesize the results from all worker agents',
      input: {
        workerResults: Object.fromEntries(results),
      },
    };

    const synthesis = await this.executeAgentTask(
      synthesisTask,
      state,
      userId,
      collaboration.organizationId
    );
    results.set('coordinator_synthesis', synthesis);

    return this.buildCollaborationResult(collaboration, state, results);
  }

  /**
   * Execute consensus pattern - agents vote on decisions
   */
  private async executeConsensus(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    userId: string
  ): Promise<CollaborationResult> {
    const votes = new Map<string, any>();

    // Each agent provides their answer/vote
    const promises = collaboration.tasks.map(async (task) => {
      const result = await this.executeAgentTask(task, state, userId, collaboration.organizationId);
      votes.set(task.agentId, result);
      return { agentId: task.agentId, vote: result };
    });

    await Promise.all(promises);

    // Calculate consensus
    const consensusResult = this.calculateConsensus(
      votes,
      collaboration.config.consensusThreshold || 0.7
    );

    state.consensusResults = consensusResult;

    const results = new Map<string, any>();
    results.set('consensus', consensusResult);

    return {
      ...this.buildCollaborationResult(collaboration, state, results),
      consensusResult,
    };
  }

  /**
   * Execute debate pattern - agents debate iteratively to reach agreement
   */
  private async executeDebate(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    userId: string
  ): Promise<CollaborationResult> {
    const maxIterations = collaboration.config.maxIterations || 3;
    const results = new Map<string, any>();
    const debateHistory: Array<{ iteration: number; responses: Map<string, any> }> = [];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      state.currentIteration = iteration;

      const iterationResponses = new Map<string, any>();

      // Each agent responds, seeing previous responses
      for (const task of collaboration.tasks) {
        const enhancedInput = {
          ...task.input,
          iteration,
          previousResponses: iteration > 0 ? debateHistory[iteration - 1].responses : undefined,
          sharedContext: state.sharedContext,
        };

        const enhancedTask: AgentTask = {
          ...task,
          input: enhancedInput,
        };

        const result = await this.executeAgentTask(
          enhancedTask,
          state,
          userId,
          collaboration.organizationId
        );

        iterationResponses.set(task.agentId, result);

        // Broadcast to other agents
        await this.sendCommunication(task.agentId, 'all', 'response', result, state);
      }

      debateHistory.push({
        iteration,
        responses: iterationResponses,
      });

      // Check if consensus reached
      const consensusResult = this.calculateConsensus(
        iterationResponses,
        collaboration.config.consensusThreshold || 0.7
      );

      if (consensusResult.agreed) {
        results.set('debate_result', consensusResult.agreement);
        state.consensusResults = consensusResult;
        break;
      }
    }

    // If no consensus after max iterations, use voting
    if (!state.consensusResults?.agreed) {
      const lastIteration = debateHistory[debateHistory.length - 1];
      state.consensusResults = this.calculateConsensus(
        lastIteration.responses,
        0.5 // Lower threshold for final vote
      );
      results.set('debate_result', state.consensusResults.agreement);
    }

    results.set('debate_history', debateHistory);

    return this.buildCollaborationResult(collaboration, state, results);
  }

  /**
   * Execute a single agent task
   */
  private async executeAgentTask(
    task: AgentTask,
    state: CollaborationState,
    userId: string,
    organizationId: string
  ): Promise<any> {
    const taskState = state.taskStates.get(task.taskId)!;
    const agentState = state.agentStates.get(task.agentId)!;

    taskState.status = 'running';
    taskState.startTime = new Date();
    taskState.attempts++;

    agentState.status = 'busy';
    agentState.currentTaskId = task.taskId;
    agentState.lastActivity = new Date();

    await this.cacheState(state.collaborationId, state);

    try {
      // Build context for this agent
      const agentContext = await contextOrchestrator.buildAgentContext(
        organizationId,
        task.agentId,
        userId,
        task.instruction,
        {
          sharedContext: state.sharedContext,
          taskId: task.taskId,
          collaborationId: state.collaborationId,
        }
      );

      // Execute agent (simplified - in production, call agent service)
      const result = await this.simulateAgentExecution(task, agentContext);

      taskState.status = 'completed';
      taskState.endTime = new Date();
      taskState.duration = taskState.endTime.getTime() - taskState.startTime!.getTime();
      taskState.result = result;

      agentState.status = 'idle';
      agentState.currentTaskId = undefined;
      agentState.tasksCompleted++;

      await this.cacheState(state.collaborationId, state);

      return result;
    } catch (error) {
      taskState.status = 'failed';
      taskState.error = error instanceof Error ? error.message : 'Unknown error';

      agentState.status = 'failed';
      agentState.tasksFailed++;

      await this.cacheState(state.collaborationId, state);

      throw error;
    }
  }

  /**
   * Simulate agent execution (placeholder for actual agent service call)
   */
  private async simulateAgentExecution(task: AgentTask, context: any): Promise<any> {
    // In production, this would call the actual agent service
    // For now, return a simulated result
    return {
      success: true,
      result: `Agent ${task.agentId} completed task: ${task.instruction}`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate consensus from votes
   */
  private calculateConsensus(
    votes: Map<string, any>,
    threshold: number
  ): ConsensusResult {
    const voteArray = Array.from(votes.values());

    // Count similar votes (simplified - in production, use semantic similarity)
    const voteCounts = new Map<string, number>();
    voteArray.forEach((vote) => {
      const voteStr = JSON.stringify(vote);
      voteCounts.set(voteStr, (voteCounts.get(voteStr) || 0) + 1);
    });

    // Find majority vote
    let maxCount = 0;
    let majorityVote: any = null;

    voteCounts.forEach((count, voteStr) => {
      if (count > maxCount) {
        maxCount = count;
        majorityVote = JSON.parse(voteStr);
      }
    });

    const confidence = maxCount / voteArray.length;
    const agreed = confidence >= threshold;

    return {
      agreed,
      agreement: majorityVote,
      votes,
      confidence,
      iterations: 1,
      timestamp: new Date(),
    };
  }

  /**
   * Send communication between agents
   */
  private async sendCommunication(
    fromAgentId: string,
    toAgentId: string,
    type: AgentCommunication['type'],
    content: any,
    state: CollaborationState
  ): Promise<void> {
    const communication: AgentCommunication = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      fromAgentId,
      toAgentId,
      type,
      content,
      timestamp: new Date(),
    };

    state.communications.push(communication);

    await this.cacheState(state.collaborationId, state);

    logger.info('Agent communication sent', {
      collaborationId: state.collaborationId,
      fromAgentId,
      toAgentId,
      type,
    });
  }

  /**
   * Build collaboration result
   */
  private buildCollaborationResult(
    collaboration: AgentCollaboration,
    state: CollaborationState,
    results: Map<string, any>
  ): CollaborationResult {
    const tasksCompleted = Array.from(state.taskStates.values()).filter(
      (s) => s.status === 'completed'
    ).length;

    const tasksFailed = Array.from(state.taskStates.values()).filter(
      (s) => s.status === 'failed'
    ).length;

    const agentStats = new Map<string, { completed: number; failed: number }>();
    state.agentStates.forEach((agentState, agentId) => {
      agentStats.set(agentId, {
        completed: agentState.tasksCompleted,
        failed: agentState.tasksFailed,
      });
    });

    return {
      success: tasksFailed === 0,
      collaborationId: collaboration.id,
      pattern: collaboration.pattern,
      results,
      communications: state.communications,
      duration: 0, // Will be set by caller
      tasksCompleted,
      tasksFailed,
      agentStats,
    };
  }

  /**
   * Get collaboration
   */
  async getCollaboration(
    collaborationId: string,
    organizationId: string
  ): Promise<AgentCollaboration | null> {
    try {
      const collaboration = await prisma.agentCollaboration.findUnique({
        where: { id: collaborationId, organizationId },
      });

      if (!collaboration) {
        return null;
      }

      return collaboration.definition as AgentCollaboration;
    } catch (error) {
      logger.error('Failed to get collaboration', { error, collaborationId });
      throw error;
    }
  }

  /**
   * Cache collaboration state
   */
  private async cacheState(collaborationId: string, state: CollaborationState): Promise<void> {
    try {
      const serializable = {
        ...state,
        taskStates: Object.fromEntries(state.taskStates),
        agentStates: Object.fromEntries(state.agentStates),
        results: Object.fromEntries(state.results),
      };

      await redis.setJSON(`collab-state:${collaborationId}`, serializable, this.STATE_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache collaboration state', { error, collaborationId });
    }
  }

  /**
   * Get collaboration state
   */
  async getCollaborationState(collaborationId: string): Promise<CollaborationState | null> {
    try {
      return await redis.getJSON<CollaborationState>(`collab-state:${collaborationId}`);
    } catch (error) {
      logger.error('Failed to get collaboration state', { error, collaborationId });
      return null;
    }
  }
}

// Singleton instance
export const multiAgentCoordinator = new MultiAgentCoordinator();

export default multiAgentCoordinator;
