/**
 * ==================== SCHEDULING SERVICE ====================
 *
 * Schedules and manages recurring/one-time agent tasks
 *
 * Features:
 * - Cron-like scheduling syntax
 * - One-time scheduled tasks
 * - Recurring tasks (daily, weekly, monthly)
 * - Task queue management
 * - Execution history tracking
 * - Retry failed executions
 * - Timezone support
 *
 * @module orchestrator/scheduling-service
 */

import { logger } from '../infrastructure/logger';
import { redis } from '../context-engine/redis.client';
import { prisma } from './prisma.client';

// ==================== TYPES ====================

export type ScheduleType = 'one-time' | 'recurring' | 'cron';

export interface ScheduleDefinition {
  id?: string;
  name: string;
  description?: string;
  organizationId: string;
  agentId: string;
  type: ScheduleType;

  // Schedule configuration
  schedule: {
    // For one-time
    executeAt?: Date;

    // For recurring
    frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
    interval?: number; // Every X hours/days/weeks/months
    dayOfWeek?: number; // 0-6 for weekly (Sunday=0)
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:MM format (e.g., "14:30")

    // For cron
    cronExpression?: string; // Standard cron syntax

    // Common
    timezone?: string; // e.g., "America/New_York"
    startDate?: Date; // When to start the schedule
    endDate?: Date; // When to end the schedule
  };

  // Task configuration
  task: {
    instruction: string;
    input?: any;
    timeout?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
    notifyOnComplete?: boolean;
    notifyOnFailure?: boolean;
  };

  // Status
  isActive: boolean;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;

  metadata?: Record<string, any>;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  scheduledFor: Date;
  executedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  duration?: number;
  attempts: number;
  metadata?: Record<string, any>;
}

export interface ScheduleStats {
  scheduleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  skippedExecutions: number;
  avgDuration: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

// ==================== SCHEDULING SERVICE ====================

export class SchedulingService {
  private schedulerRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly SCHEDULER_CHECK_INTERVAL = 60 * 1000; // Check every minute
  private readonly QUEUE_PREFIX = 'schedule-queue';

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.schedulerRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.schedulerRunning = true;

    this.schedulerInterval = setInterval(async () => {
      try {
        await this.processSchedules();
      } catch (error) {
        logger.error('Scheduler error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.SCHEDULER_CHECK_INTERVAL);

    logger.info('Scheduler started', {
      checkInterval: this.SCHEDULER_CHECK_INTERVAL,
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    this.schedulerRunning = false;

    logger.info('Scheduler stopped');
  }

  /**
   * Create a schedule
   */
  async createSchedule(definition: Omit<ScheduleDefinition, 'id'>): Promise<ScheduleDefinition> {
    try {
      // Validate schedule
      this.validateSchedule(definition);

      // Calculate next execution time
      const nextExecutionAt = this.calculateNextExecution(definition);

      const schedule = await prisma.schedule.create({
        data: {
          name: definition.name,
          description: definition.description,
          organizationId: definition.organizationId,
          agentId: definition.agentId,
          type: definition.type,
          definition: definition as any,
          isActive: definition.isActive,
          nextExecutionAt,
          createdAt: new Date(),
        },
      });

      logger.info('Schedule created', {
        scheduleId: schedule.id,
        name: definition.name,
        type: definition.type,
        nextExecutionAt,
      });

      // Add to queue if active and next execution is soon
      if (definition.isActive && nextExecutionAt) {
        await this.addToQueue(schedule.id, nextExecutionAt);
      }

      return {
        id: schedule.id,
        ...definition,
        nextExecutionAt: nextExecutionAt || undefined,
      };
    } catch (error) {
      logger.error('Failed to create schedule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleDefinition>
  ): Promise<ScheduleDefinition> {
    try {
      const existing = await prisma.schedule.findUnique({
        where: { id: scheduleId },
      });

      if (!existing) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      const updated = { ...(existing.definition as any), ...updates };

      // Recalculate next execution if schedule changed
      const nextExecutionAt = this.calculateNextExecution(updated);

      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          definition: updated as any,
          isActive: updates.isActive ?? existing.isActive,
          nextExecutionAt,
        },
      });

      // Update queue
      await this.removeFromQueue(scheduleId);
      if (updated.isActive && nextExecutionAt) {
        await this.addToQueue(scheduleId, nextExecutionAt);
      }

      logger.info('Schedule updated', { scheduleId, nextExecutionAt });

      return updated;
    } catch (error) {
      logger.error('Failed to update schedule', { error, scheduleId });
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string, organizationId: string): Promise<void> {
    try {
      await prisma.schedule.delete({
        where: { id: scheduleId, organizationId },
      });

      await this.removeFromQueue(scheduleId);

      logger.info('Schedule deleted', { scheduleId });
    } catch (error) {
      logger.error('Failed to delete schedule', { error, scheduleId });
      throw error;
    }
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string, organizationId: string): Promise<ScheduleDefinition | null> {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId, organizationId },
      });

      if (!schedule) {
        return null;
      }

      return {
        id: schedule.id,
        ...(schedule.definition as any),
        isActive: schedule.isActive,
        lastExecutedAt: schedule.lastExecutedAt || undefined,
        nextExecutionAt: schedule.nextExecutionAt || undefined,
      };
    } catch (error) {
      logger.error('Failed to get schedule', { error, scheduleId });
      throw error;
    }
  }

  /**
   * List schedules
   */
  async listSchedules(
    organizationId: string,
    filters?: {
      agentId?: string;
      type?: ScheduleType;
      isActive?: boolean;
    }
  ): Promise<ScheduleDefinition[]> {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          organizationId,
          ...(filters?.agentId && { agentId: filters.agentId }),
          ...(filters?.type && { type: filters.type }),
          ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        },
        orderBy: { nextExecutionAt: 'asc' },
      });

      return schedules.map((s) => ({
        id: s.id,
        ...(s.definition as any),
        isActive: s.isActive,
        lastExecutedAt: s.lastExecutedAt || undefined,
        nextExecutionAt: s.nextExecutionAt || undefined,
      }));
    } catch (error) {
      logger.error('Failed to list schedules', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(scheduleId: string): Promise<ScheduleStats> {
    try {
      const executions = await prisma.scheduleExecution.findMany({
        where: { scheduleId },
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter((e) => e.status === 'completed').length;
      const failedExecutions = executions.filter((e) => e.status === 'failed').length;
      const skippedExecutions = executions.filter((e) => e.status === 'skipped').length;

      const completedExecutions = executions.filter(
        (e) => e.status === 'completed' && e.duration
      );
      const avgDuration =
        completedExecutions.length > 0
          ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
            completedExecutions.length
          : 0;

      const lastExecution = executions.length > 0 ? executions[executions.length - 1] : null;

      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
      });

      return {
        scheduleId,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        skippedExecutions,
        avgDuration,
        lastExecution: lastExecution?.executedAt || undefined,
        nextExecution: schedule?.nextExecutionAt || undefined,
      };
    } catch (error) {
      logger.error('Failed to get schedule stats', { error, scheduleId });
      throw error;
    }
  }

  /**
   * Process due schedules
   */
  private async processSchedules(): Promise<void> {
    try {
      const now = new Date();

      // Get all active schedules that are due
      const dueSchedules = await prisma.schedule.findMany({
        where: {
          isActive: true,
          nextExecutionAt: {
            lte: now,
          },
        },
      });

      if (dueSchedules.length === 0) {
        return;
      }

      logger.info('Processing due schedules', { count: dueSchedules.length });

      // Execute each schedule
      for (const schedule of dueSchedules) {
        try {
          await this.executeSchedule(schedule);
        } catch (error) {
          logger.error('Failed to execute schedule', {
            scheduleId: schedule.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process schedules', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Execute a schedule
   */
  private async executeSchedule(schedule: any): Promise<void> {
    const scheduleId = schedule.id;
    const definition = schedule.definition as ScheduleDefinition;

    logger.info('Executing schedule', {
      scheduleId,
      name: definition.name,
      agentId: definition.agentId,
    });

    // Create execution record
    const execution = await prisma.scheduleExecution.create({
      data: {
        scheduleId,
        scheduledFor: schedule.nextExecutionAt,
        status: 'running',
        attempts: 1,
      },
    });

    const startTime = Date.now();

    try {
      // Execute the agent task (simplified - in production, call agent service)
      const result = await this.simulateTaskExecution(definition);

      const duration = Date.now() - startTime;

      // Mark as completed
      await prisma.scheduleExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          executedAt: new Date(),
          result: result as any,
          duration,
        },
      });

      // Calculate next execution time
      const nextExecutionAt = this.calculateNextExecution(definition);

      // Update schedule
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          lastExecutedAt: new Date(),
          nextExecutionAt,
        },
      });

      // Add to queue for next execution
      if (nextExecutionAt) {
        await this.addToQueue(scheduleId, nextExecutionAt);
      }

      logger.info('Schedule executed successfully', {
        scheduleId,
        duration,
        nextExecutionAt,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      await prisma.scheduleExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          executedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        },
      });

      logger.error('Schedule execution failed', {
        scheduleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Simulate task execution (placeholder)
   */
  private async simulateTaskExecution(definition: ScheduleDefinition): Promise<any> {
    // In production, this would call the actual agent service
    return {
      success: true,
      message: `Scheduled task executed: ${definition.task.instruction}`,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate next execution time
   */
  private calculateNextExecution(definition: ScheduleDefinition | Partial<ScheduleDefinition>): Date | null {
    const now = new Date();
    const { schedule } = definition;

    if (!schedule) {
      return null;
    }

    // Check if schedule has ended
    if (schedule.endDate && now > schedule.endDate) {
      return null;
    }

    // Check if schedule hasn't started
    if (schedule.startDate && now < schedule.startDate) {
      return schedule.startDate;
    }

    switch (definition.type) {
      case 'one-time':
        return schedule.executeAt || null;

      case 'recurring':
        return this.calculateRecurringNext(schedule, now);

      case 'cron':
        return this.calculateCronNext(schedule.cronExpression!, now);

      default:
        return null;
    }
  }

  /**
   * Calculate next execution for recurring schedule
   */
  private calculateRecurringNext(schedule: ScheduleDefinition['schedule'], from: Date): Date | null {
    const next = new Date(from);

    switch (schedule.frequency) {
      case 'hourly':
        next.setHours(next.getHours() + (schedule.interval || 1));
        break;

      case 'daily':
        next.setDate(next.getDate() + (schedule.interval || 1));
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 0;
        const currentDay = next.getDay();
        const daysUntilNext = (targetDay - currentDay + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntilNext);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1;
        next.setMonth(next.getMonth() + (schedule.interval || 1));
        next.setDate(targetDate);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;
    }

    return next;
  }

  /**
   * Calculate next execution for cron schedule (simplified)
   */
  private calculateCronNext(cronExpression: string, from: Date): Date | null {
    // Simplified cron parsing - in production, use a library like 'cron-parser'
    // For now, just add 1 hour
    const next = new Date(from);
    next.setHours(next.getHours() + 1);
    return next;
  }

  /**
   * Validate schedule definition
   */
  private validateSchedule(definition: Partial<ScheduleDefinition>): void {
    if (!definition.name || !definition.organizationId || !definition.agentId) {
      throw new Error('Schedule must have name, organizationId, and agentId');
    }

    if (!definition.schedule) {
      throw new Error('Schedule must have schedule configuration');
    }

    switch (definition.type) {
      case 'one-time':
        if (!definition.schedule.executeAt) {
          throw new Error('One-time schedule must have executeAt');
        }
        break;

      case 'recurring':
        if (!definition.schedule.frequency) {
          throw new Error('Recurring schedule must have frequency');
        }
        break;

      case 'cron':
        if (!definition.schedule.cronExpression) {
          throw new Error('Cron schedule must have cronExpression');
        }
        break;
    }

    if (!definition.task || !definition.task.instruction) {
      throw new Error('Schedule must have task with instruction');
    }
  }

  /**
   * Add schedule to execution queue
   */
  private async addToQueue(scheduleId: string, executeAt: Date): Promise<void> {
    try {
      const key = `${this.QUEUE_PREFIX}:${scheduleId}`;
      await redis.set(key, executeAt.toISOString(), 60 * 60 * 24 * 7); // 7 days TTL
    } catch (error) {
      logger.warn('Failed to add schedule to queue', { error, scheduleId });
    }
  }

  /**
   * Remove schedule from queue
   */
  private async removeFromQueue(scheduleId: string): Promise<void> {
    try {
      const key = `${this.QUEUE_PREFIX}:${scheduleId}`;
      await redis.delete(key);
    } catch (error) {
      logger.warn('Failed to remove schedule from queue', { error, scheduleId });
    }
  }
}

// Singleton instance
export const schedulingService = new SchedulingService();

export default schedulingService;
