/**
 * ==================== TOOL SYSTEM ====================
 *
 * Comprehensive tool system for agent orchestration
 *
 * Features:
 * - Tool definition and registration
 * - Tool execution with validation
 * - Permission management
 * - Usage tracking
 * - Error handling and retry logic
 *
 * @module orchestrator/tool-system
 */

import { z } from 'zod';
import { logger } from '../infrastructure/logger';
import { prisma } from './prisma.client';

// ==================== TYPES ====================

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'communication' | 'automation' | 'analysis' | 'integration' | 'custom';
  version: string;

  // Input/Output schemas
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;

  // Execution function
  execute: (input: any, context: ToolExecutionContext) => Promise<any>;

  // Configuration
  config: {
    timeout?: number;
    retryable?: boolean;
    maxRetries?: number;
    rateLimit?: {
      requests: number;
      windowMs: number;
    };
    requiresApproval?: boolean;
  };

  // Metadata
  metadata: {
    author?: string;
    tags?: string[];
    documentation?: string;
    examples?: Array<{ input: any; output: any; description: string }>;
  };
}

export interface ToolExecutionContext {
  userId: string;
  organizationId: string;
  agentId: string;
  sessionId?: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    toolId: string;
    toolName: string;
    executionId: string;
    duration: number;
    retryCount: number;
    timestamp: Date;
  };
}

export interface ToolUsageStats {
  toolId: string;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  lastUsed: Date;
}

// ==================== TOOL REGISTRY ====================

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executionQueue: Map<string, Promise<any>> = new Map();

  /**
   * Register a tool
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool ${tool.id} is already registered`);
    }

    // Validate tool definition
    this.validateToolDefinition(tool);

    this.tools.set(tool.id, tool);

    logger.info('Tool registered', {
      toolId: tool.id,
      toolName: tool.name,
      category: tool.category,
      version: tool.version,
    });
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): void {
    if (!this.tools.has(toolId)) {
      throw new Error(`Tool ${toolId} is not registered`);
    }

    this.tools.delete(toolId);

    logger.info('Tool unregistered', { toolId });
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * List all tools
   */
  listTools(filters?: {
    category?: string;
    tags?: string[];
    search?: string;
  }): ToolDefinition[] {
    let tools = Array.from(this.tools.values());

    if (filters?.category) {
      tools = tools.filter((t) => t.category === filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      tools = tools.filter((t) =>
        filters.tags!.some((tag) => t.metadata.tags?.includes(tag))
      );
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
      );
    }

    return tools;
  }

  /**
   * Execute a tool
   */
  async execute(
    toolId: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    let retryCount = 0;

    try {
      // Get tool definition
      const tool = this.getTool(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      // Validate input
      const validatedInput = tool.inputSchema.parse(input);

      // Check rate limiting
      await this.checkRateLimit(toolId, context.organizationId);

      // Check if requires approval
      if (tool.config.requiresApproval) {
        await this.checkApproval(toolId, context);
      }

      // Execute with retry logic
      let output: any;
      let lastError: Error | null = null;

      const maxRetries = tool.config.retryable ? tool.config.maxRetries || 3 : 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          retryCount = attempt;

          // Execute with timeout
          output = await this.executeWithTimeout(
            () => tool.execute(validatedInput, context),
            tool.config.timeout || 30000
          );

          // Validate output
          tool.outputSchema.parse(output);

          break; // Success
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxRetries && this.isRetryableError(error)) {
            logger.warn('Tool execution failed, retrying', {
              toolId,
              attempt,
              error: lastError.message,
            });

            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000))
            );
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      // Log execution
      await this.logExecution(toolId, context, true, duration, retryCount);

      logger.info('Tool executed successfully', {
        toolId,
        toolName: tool.name,
        executionId,
        duration,
        retryCount,
      });

      return {
        success: true,
        output,
        metadata: {
          toolId,
          toolName: tool.name,
          executionId,
          duration,
          retryCount,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log execution failure
      await this.logExecution(toolId, context, false, duration, retryCount, error);

      logger.error('Tool execution failed', {
        toolId,
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        retryCount,
      });

      const tool = this.getTool(toolId);

      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          toolId,
          toolName: tool?.name || 'Unknown',
          executionId,
          duration,
          retryCount,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Batch execute tools
   */
  async batchExecute(
    executions: Array<{
      toolId: string;
      input: any;
      context: ToolExecutionContext;
    }>
  ): Promise<ToolExecutionResult[]> {
    const promises = executions.map((exec) =>
      this.execute(exec.toolId, exec.input, exec.context)
    );

    return await Promise.all(promises);
  }

  /**
   * Get tool usage statistics
   */
  async getToolStats(
    toolId: string,
    organizationId: string
  ): Promise<ToolUsageStats> {
    const stats = await prisma.toolExecution.aggregate({
      where: {
        toolId,
        organizationId,
      },
      _count: true,
      _avg: {
        duration: true,
      },
    });

    const successCount = await prisma.toolExecution.count({
      where: {
        toolId,
        organizationId,
        success: true,
      },
    });

    const errorCount = await prisma.toolExecution.count({
      where: {
        toolId,
        organizationId,
        success: false,
      },
    });

    const lastExecution = await prisma.toolExecution.findFirst({
      where: {
        toolId,
        organizationId,
      },
      orderBy: {
        executedAt: 'desc',
      },
    });

    return {
      toolId,
      totalExecutions: stats._count || 0,
      successCount,
      errorCount,
      avgDuration: stats._avg.duration || 0,
      lastUsed: lastExecution?.executedAt || new Date(0),
    };
  }

  /**
   * Validate tool definition
   */
  private validateToolDefinition(tool: ToolDefinition): void {
    if (!tool.id || !tool.name || !tool.description) {
      throw new Error('Tool must have id, name, and description');
    }

    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error('Tool must have an execute function');
    }

    if (!tool.inputSchema || !tool.outputSchema) {
      throw new Error('Tool must have input and output schemas');
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and rate limits are retryable
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'RATE_LIMIT'];

    return (
      retryableCodes.some((code) => error.code === code) ||
      error.message?.includes('timeout') ||
      error.message?.includes('network')
    );
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(toolId: string, organizationId: string): Promise<void> {
    const tool = this.getTool(toolId);
    if (!tool?.config.rateLimit) {
      return;
    }

    const { requests, windowMs } = tool.config.rateLimit;
    const windowStart = new Date(Date.now() - windowMs);

    const recentExecutions = await prisma.toolExecution.count({
      where: {
        toolId,
        organizationId,
        executedAt: {
          gte: windowStart,
        },
      },
    });

    if (recentExecutions >= requests) {
      throw new Error(`Rate limit exceeded for tool ${toolId}`);
    }
  }

  /**
   * Check approval
   */
  private async checkApproval(
    toolId: string,
    context: ToolExecutionContext
  ): Promise<void> {
    // Check if user has approval permission
    if (!context.permissions.includes('tool:approve')) {
      throw new Error(`Tool ${toolId} requires approval`);
    }
  }

  /**
   * Log execution
   */
  private async logExecution(
    toolId: string,
    context: ToolExecutionContext,
    success: boolean,
    duration: number,
    retryCount: number,
    error?: any
  ): Promise<void> {
    try {
      await prisma.toolExecution.create({
        data: {
          toolId,
          userId: context.userId,
          organizationId: context.organizationId,
          agentId: context.agentId,
          sessionId: context.sessionId,
          success,
          duration,
          retryCount,
          errorMessage: error ? (error instanceof Error ? error.message : String(error)) : null,
          executedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log tool execution', { error });
    }
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get registry size
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools (use with caution)
   */
  clear(): void {
    this.tools.clear();
    logger.warn('Tool registry cleared');
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

export default toolRegistry;
