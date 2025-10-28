/**
 * ==================== WORKFLOW ENGINE ====================
 *
 * Orchestrates complex multi-step workflows with tool execution
 *
 * Features:
 * - Sequential and parallel task execution
 * - Conditional branching based on results
 * - Error handling and retry logic
 * - State management with rollback
 * - Workflow templates
 * - Real-time execution tracking
 *
 * @module orchestrator/workflow-engine
 */

import { logger } from '../infrastructure/logger';
import { toolRegistry, ToolExecutionContext } from './tool.system';
import { redis } from '../context-engine/redis.client';
import { prisma } from './prisma.client';
import ivm from 'isolated-vm';

// ==================== TYPES ====================

export type WorkflowNodeType = 'tool' | 'condition' | 'parallel' | 'wait' | 'transform';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: {
    // For 'tool' nodes
    toolId?: string;
    toolInput?: any;

    // For 'condition' nodes
    condition?: {
      field: string;
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';
      value: any;
    };

    // For 'parallel' nodes
    parallelNodes?: string[]; // Node IDs to execute in parallel

    // For 'wait' nodes
    waitSeconds?: number;

    // For 'transform' nodes
    transform?: {
      operation: 'map' | 'filter' | 'reduce' | 'merge';
      script?: string; // JavaScript expression
    };

    // Common
    retryOnFailure?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
  next?: {
    onSuccess?: string; // Next node ID
    onFailure?: string; // Next node ID on failure
    onConditionTrue?: string; // For condition nodes
    onConditionFalse?: string; // For condition nodes
  };
  metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  organizationId: string;
  nodes: WorkflowNode[];
  startNodeId: string;
  variables?: Record<string, any>; // Global workflow variables
  config?: {
    timeout?: number; // Overall workflow timeout
    maxRetries?: number;
    rollbackOnFailure?: boolean;
  };
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
  };
}

export interface WorkflowExecutionState {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentNodeId?: string;
  nodeStates: Map<string, NodeExecutionState>;
  variables: Record<string, any>; // Runtime variables
  results: Map<string, any>; // Results from each node
  errors: Array<{ nodeId: string; error: string; timestamp: Date }>;
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  state: WorkflowExecutionState;
  results: Map<string, any>;
  errors: Array<{ nodeId: string; error: string }>;
  duration: number;
  nodesExecuted: number;
  nodesSkipped: number;
  nodesFailed: number;
}

// ==================== WORKFLOW ENGINE ====================

export class WorkflowEngine {
  private readonly EXECUTION_CACHE_TTL = 60 * 60; // 1 hour

  /**
   * Create a workflow definition
   */
  async createWorkflow(definition: Omit<WorkflowDefinition, 'id'>): Promise<WorkflowDefinition> {
    try {
      // Validate workflow
      this.validateWorkflow(definition as WorkflowDefinition);

      const workflow = await prisma.workflow.create({
        data: {
          name: definition.name,
          description: definition.description,
          version: definition.version,
          organizationId: definition.organizationId,
          definition: definition as any,
          isActive: true,
          createdAt: new Date(),
        },
      });

      logger.info('Workflow created', {
        workflowId: workflow.id,
        name: workflow.name,
        organizationId: workflow.organizationId,
      });

      return {
        id: workflow.id,
        ...definition,
      } as WorkflowDefinition;
    } catch (error) {
      logger.error('Failed to create workflow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflow: definition.name,
      });
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    context: ToolExecutionContext,
    initialVariables?: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Load workflow definition
      const workflow = await this.getWorkflow(workflowId, context.organizationId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Initialize execution state
      const state: WorkflowExecutionState = {
        workflowId,
        executionId,
        status: 'running',
        currentNodeId: workflow.startNodeId,
        nodeStates: new Map(),
        variables: { ...workflow.variables, ...initialVariables },
        results: new Map(),
        errors: [],
        startTime: new Date(),
      };

      // Initialize node states
      workflow.nodes.forEach((node) => {
        state.nodeStates.set(node.id, {
          nodeId: node.id,
          status: 'pending',
          attempts: 0,
        });
      });

      // Cache initial state
      await this.cacheExecutionState(executionId, state);

      // Log workflow start
      await this.logWorkflowExecution(workflowId, context, 'started', executionId);

      logger.info('Workflow execution started', {
        workflowId,
        executionId,
        workflowName: workflow.name,
      });

      // Execute workflow
      await this.executeNode(workflow, state, workflow.startNodeId, context);

      // Mark as completed
      state.status = 'completed';
      state.endTime = new Date();

      const duration = Date.now() - startTime;

      // Calculate statistics
      const nodesExecuted = Array.from(state.nodeStates.values()).filter(
        (s) => s.status === 'completed'
      ).length;
      const nodesSkipped = Array.from(state.nodeStates.values()).filter(
        (s) => s.status === 'skipped'
      ).length;
      const nodesFailed = Array.from(state.nodeStates.values()).filter(
        (s) => s.status === 'failed'
      ).length;

      // Log workflow completion
      await this.logWorkflowExecution(workflowId, context, 'completed', executionId, duration);

      logger.info('Workflow execution completed', {
        workflowId,
        executionId,
        duration,
        nodesExecuted,
      });

      return {
        success: true,
        executionId,
        state,
        results: state.results,
        errors: state.errors,
        duration,
        nodesExecuted,
        nodesSkipped,
        nodesFailed,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      // Log workflow failure
      await this.logWorkflowExecution(
        workflowId,
        context,
        'failed',
        executionId,
        duration,
        error
      );

      throw error;
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    workflow: WorkflowDefinition,
    state: WorkflowExecutionState,
    nodeId: string,
    context: ToolExecutionContext
  ): Promise<any> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    const nodeState = state.nodeStates.get(nodeId)!;
    nodeState.status = 'running';
    nodeState.startTime = new Date();
    state.currentNodeId = nodeId;

    await this.cacheExecutionState(state.executionId, state);

    logger.info('Executing workflow node', {
      workflowId: workflow.id,
      executionId: state.executionId,
      nodeId,
      nodeType: node.type,
      nodeName: node.name,
    });

    try {
      let result: any;

      switch (node.type) {
        case 'tool':
          result = await this.executeTool(node, state, context);
          break;

        case 'condition':
          result = await this.executeCondition(node, state);
          break;

        case 'parallel':
          result = await this.executeParallel(workflow, node, state, context);
          break;

        case 'wait':
          result = await this.executeWait(node);
          break;

        case 'transform':
          result = await this.executeTransform(node, state);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Mark node as completed
      nodeState.status = 'completed';
      nodeState.endTime = new Date();
      nodeState.duration = nodeState.endTime.getTime() - nodeState.startTime!.getTime();
      nodeState.result = result;

      // Store result
      state.results.set(nodeId, result);

      await this.cacheExecutionState(state.executionId, state);

      logger.info('Workflow node completed', {
        workflowId: workflow.id,
        executionId: state.executionId,
        nodeId,
        duration: nodeState.duration,
      });

      // Determine next node
      const nextNodeId = this.getNextNodeId(node, result);

      if (nextNodeId) {
        return await this.executeNode(workflow, state, nextNodeId, context);
      }

      return result;
    } catch (error) {
      nodeState.status = 'failed';
      nodeState.endTime = new Date();
      nodeState.error = error instanceof Error ? error.message : 'Unknown error';

      state.errors.push({
        nodeId,
        error: nodeState.error,
        timestamp: new Date(),
      });

      await this.cacheExecutionState(state.executionId, state);

      logger.error('Workflow node failed', {
        workflowId: workflow.id,
        executionId: state.executionId,
        nodeId,
        error: nodeState.error,
      });

      // Check if we should continue to failure path
      if (node.next?.onFailure) {
        return await this.executeNode(workflow, state, node.next.onFailure, context);
      }

      // Check if we should retry
      if (
        node.config.retryOnFailure &&
        nodeState.attempts < (node.config.maxRetries || 3)
      ) {
        nodeState.attempts++;
        nodeState.status = 'pending';

        logger.info('Retrying workflow node', {
          workflowId: workflow.id,
          executionId: state.executionId,
          nodeId,
          attempt: nodeState.attempts,
        });

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * Math.pow(2, nodeState.attempts - 1), 10000))
        );

        return await this.executeNode(workflow, state, nodeId, context);
      }

      throw error;
    }
  }

  /**
   * Execute a tool node
   */
  private async executeTool(
    node: WorkflowNode,
    state: WorkflowExecutionState,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!node.config.toolId) {
      throw new Error(`Tool node ${node.id} missing toolId`);
    }

    // Resolve tool input from variables
    const toolInput = this.resolveVariables(node.config.toolInput || {}, state.variables);

    // Execute tool
    const result = await toolRegistry.execute(node.config.toolId, toolInput, context);

    if (!result.success) {
      throw new Error(result.error?.message || 'Tool execution failed');
    }

    return result.output;
  }

  /**
   * Execute a condition node
   */
  private async executeCondition(node: WorkflowNode, state: WorkflowExecutionState): Promise<boolean> {
    if (!node.config.condition) {
      throw new Error(`Condition node ${node.id} missing condition config`);
    }

    const { field, operator, value } = node.config.condition;

    // Get field value from state
    const fieldValue = this.getFieldValue(field, state);

    // Evaluate condition
    let result = false;

    switch (operator) {
      case 'equals':
        result = fieldValue === value;
        break;
      case 'notEquals':
        result = fieldValue !== value;
        break;
      case 'greaterThan':
        result = fieldValue > value;
        break;
      case 'lessThan':
        result = fieldValue < value;
        break;
      case 'contains':
        result = String(fieldValue).includes(String(value));
        break;
      case 'exists':
        result = fieldValue !== undefined && fieldValue !== null;
        break;
    }

    return result;
  }

  /**
   * Execute parallel nodes
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    state: WorkflowExecutionState,
    context: ToolExecutionContext
  ): Promise<any[]> {
    if (!node.config.parallelNodes || node.config.parallelNodes.length === 0) {
      throw new Error(`Parallel node ${node.id} missing parallelNodes config`);
    }

    const promises = node.config.parallelNodes.map((nodeId) =>
      this.executeNode(workflow, state, nodeId, context)
    );

    return await Promise.all(promises);
  }

  /**
   * Execute wait node
   */
  private async executeWait(node: WorkflowNode): Promise<void> {
    const waitSeconds = node.config.waitSeconds || 1;
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }

  /**
   * Execute transform node
   */
  private async executeTransform(node: WorkflowNode, state: WorkflowExecutionState): Promise<any> {
    if (!node.config.transform) {
      throw new Error(`Transform node ${node.id} missing transform config`);
    }

    const { operation, script } = node.config.transform;

    // Get input data from previous results
    const inputData = Array.from(state.results.values());

    switch (operation) {
      case 'map':
        if (!script) throw new Error('Transform node missing script');
        return inputData.map((item) => this.executeSandboxed(script, { item }));

      case 'filter':
        if (!script) throw new Error('Transform node missing script');
        return inputData.filter((item) => this.executeSandboxed(script, { item }));

      case 'reduce':
        if (!script) throw new Error('Transform node missing script');
        return inputData.reduce((acc, item) => this.executeSandboxed(script, { acc, item }), {});

      case 'merge':
        return Object.assign({}, ...inputData);

      default:
        throw new Error(`Unknown transform operation: ${operation}`);
    }
  }

  /**
   * Execute code in a sandboxed environment using isolated-vm
   * Prevents code injection attacks by isolating script execution
   */
  private executeSandboxed(script: string, context: Record<string, any>): any {
    try {
      // Create an isolated VM instance with memory limit
      const isolate = new ivm.Isolate({ memoryLimit: 8 });

      // Create a new context within the isolate
      const vmContext = isolate.createContextSync();

      // Transfer context variables into the isolated environment
      const jail = vmContext.global;
      jail.setSync('global', jail.derefInto());

      // Set up context variables
      for (const [key, value] of Object.entries(context)) {
        // Create a safe copy of the value
        const safeValue = JSON.parse(JSON.stringify(value));
        jail.setSync(key, new ivm.ExternalCopy(safeValue).copyInto());
      }

      // Compile and execute the script with a timeout (1 second)
      const compiledScript = isolate.compileScriptSync(script);
      const result = compiledScript.runSync(vmContext, { timeout: 1000 });

      // Copy the result back to the main context
      if (result && typeof result.copy === 'function') {
        return result.copy();
      }

      return result;
    } catch (error) {
      logger.error('Sandboxed script execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        script: script.substring(0, 100), // Log first 100 chars only
      });
      throw new Error(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get next node ID based on node result
   */
  private getNextNodeId(node: WorkflowNode, result: any): string | undefined {
    if (node.type === 'condition') {
      return result ? node.next?.onConditionTrue : node.next?.onConditionFalse;
    }

    return node.next?.onSuccess;
  }

  /**
   * Resolve variables in object
   */
  private resolveVariables(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      // Replace {{variable}} syntax
      return obj.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveVariables(item, variables));
    }

    if (typeof obj === 'object' && obj !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveVariables(value, variables);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * Get field value from state
   */
  private getFieldValue(field: string, state: WorkflowExecutionState): any {
    // Support dot notation: results.node1.data
    const parts = field.split('.');
    let value: any = state;

    for (const part of parts) {
      if (part === 'results') {
        // Convert Map to object
        value = Object.fromEntries(state.results);
      } else if (part === 'variables') {
        value = state.variables;
      } else {
        value = value?.[part];
      }
    }

    return value;
  }

  /**
   * Get workflow definition
   */
  async getWorkflow(workflowId: string, organizationId: string): Promise<WorkflowDefinition | null> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId, organizationId },
      });

      if (!workflow) {
        return null;
      }

      return workflow.definition as unknown as WorkflowDefinition;
    } catch (error) {
      logger.error('Failed to get workflow', { error, workflowId });
      throw error;
    }
  }

  /**
   * List workflows
   */
  async listWorkflows(organizationId: string): Promise<WorkflowDefinition[]> {
    try {
      const workflows = await prisma.workflow.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return workflows.map((w) => w.definition as unknown as WorkflowDefinition);
    } catch (error) {
      logger.error('Failed to list workflows', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get workflow execution state
   */
  async getExecutionState(executionId: string): Promise<WorkflowExecutionState | null> {
    try {
      return await redis.getJSON<WorkflowExecutionState>(`workflow-exec:${executionId}`);
    } catch (error) {
      logger.error('Failed to get execution state', { error, executionId });
      return null;
    }
  }

  /**
   * Validate workflow definition
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.name || !workflow.startNodeId || !workflow.nodes) {
      throw new Error('Invalid workflow: missing required fields');
    }

    if (workflow.nodes.length === 0) {
      throw new Error('Invalid workflow: no nodes defined');
    }

    const startNode = workflow.nodes.find((n) => n.id === workflow.startNodeId);
    if (!startNode) {
      throw new Error(`Invalid workflow: start node ${workflow.startNodeId} not found`);
    }

    // Validate all nodes
    workflow.nodes.forEach((node) => {
      if (!node.id || !node.type || !node.name) {
        throw new Error(`Invalid node: missing required fields`);
      }

      // Validate next references
      if (node.next) {
        const nextIds = [
          node.next.onSuccess,
          node.next.onFailure,
          node.next.onConditionTrue,
          node.next.onConditionFalse,
        ].filter(Boolean);

        nextIds.forEach((nextId) => {
          if (!workflow.nodes.find((n) => n.id === nextId)) {
            throw new Error(`Invalid node ${node.id}: next node ${nextId} not found`);
          }
        });
      }
    });
  }

  /**
   * Cache execution state
   */
  private async cacheExecutionState(
    executionId: string,
    state: WorkflowExecutionState
  ): Promise<void> {
    try {
      // Convert Maps to objects for JSON serialization
      const serializable = {
        ...state,
        nodeStates: Object.fromEntries(state.nodeStates),
        results: Object.fromEntries(state.results),
      };

      await redis.setJSON(`workflow-exec:${executionId}`, serializable, this.EXECUTION_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache execution state', { error, executionId });
    }
  }

  /**
   * Log workflow execution
   */
  private async logWorkflowExecution(
    workflowId: string,
    context: ToolExecutionContext,
    status: 'started' | 'completed' | 'failed',
    executionId: string,
    duration?: number,
    error?: any
  ): Promise<void> {
    try {
      // Map lowercase status to ExecutionStatus enum
      const executionStatus = status === 'started' ? 'RUNNING' : status === 'completed' ? 'COMPLETED' : 'FAILED';

      await prisma.workflowExecution.create({
        data: {
          workflowId,
          userId: context.userId,
          organizationId: context.organizationId,
          agentId: context.agentId,
          status: executionStatus as any,
          duration: duration || 0,
          errorMessage: error ? (error instanceof Error ? error.message : String(error)) : null,
          executedAt: new Date(),
        } as any,
      });
    } catch (error) {
      logger.error('Failed to log workflow execution', { error, workflowId, executionId });
    }
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `wf_exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Singleton instance
export const workflowEngine = new WorkflowEngine();

export default workflowEngine;
