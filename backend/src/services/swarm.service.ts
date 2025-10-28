import { prisma } from '@/server';
import { SwarmType, SwarmRole, AgentStatus, ExecutionStatus } from '@prisma/client';
import { EventEmitter } from 'events';
import { agentService } from './agent.service';
import { logger } from '@/infrastructure/logger';

export interface SwarmConfig {
  name: string;
  description?: string;
  coordinatorType: SwarmType;
  configuration?: Record<string, unknown>;
}

export interface SwarmMemberConfig {
  agentId: string;
  role: SwarmRole;
  priority: number;
}

export interface SwarmExecutionContext {
  swarmId: string;
  input?: Record<string, unknown>;
  sharedData?: Map<string, unknown>;
  executionId: string;
}

class SwarmService extends EventEmitter {
  private activeSwarms = new Map<string, SwarmExecutionContext>();

  async createSwarm(organizationId: string, config: SwarmConfig) {
    try {
      const swarm = await prisma.agentSwarm.create({
        data: {
          organizationId,
          creatorId: organizationId, // Temporary - should be passed in
          name: config.name,
          description: config.description,
          type: config.coordinatorType,
          configuration: config.configuration as any,
        },
      });

      this.emit('swarmCreated', { swarmId: swarm.id, organizationId });
      return swarm;
    } catch (error) {
      logger.error('Failed to create swarm:', error);
      throw new Error('Failed to create swarm');
    }
  }

  async addAgentToSwarm(swarmId: string, memberConfig: SwarmMemberConfig) {
    try {
      // Check if agent exists and belongs to the same organization
      const swarm = await prisma.agentSwarm.findUnique({
        where: { id: swarmId },
      });

      if (!swarm) {
        throw new Error('Swarm not found');
      }

      const agent = await prisma.agent.findFirst({
        where: {
          id: memberConfig.agentId,
          organizationId: swarm.organizationId,
        },
      });

      if (!agent) {
        throw new Error('Agent not found or does not belong to the same organization');
      }

      const member = await prisma.swarmMember.create({
        data: {
          swarmId,
          agentId: memberConfig.agentId,
          role: memberConfig.role,
        },
      });

      this.emit('agentAddedToSwarm', { swarmId, agentId: memberConfig.agentId });
      return member;
    } catch (error) {
      logger.error('Failed to add agent to swarm:', error);
      throw error;
    }
  }

  async removeAgentFromSwarm(swarmId: string, agentId: string) {
    try {
      await prisma.swarmMember.delete({
        where: {
          swarmId_agentId: {
            swarmId,
            agentId,
          },
        },
      });

      this.emit('agentRemovedFromSwarm', { swarmId, agentId });
      return true;
    } catch (error) {
      logger.error('Failed to remove agent from swarm:', error);
      throw error;
    }
  }

  async executeSwarm(swarmId: string, input?: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const swarm = await prisma.agentSwarm.findUnique({
        where: { id: swarmId },
        include: {
          members: {
            include: {
              agent: true,
            },
            orderBy: [
              { createdAt: 'asc' },
            ],
          },
        },
      });

      if (!swarm) {
        throw new Error('Swarm not found');
      }

      if (swarm.members.length === 0) {
        throw new Error('Swarm has no members');
      }

      const executionId = `swarm_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const context: SwarmExecutionContext = {
        swarmId,
        input,
        sharedData: new Map(),
        executionId,
      };

      this.activeSwarms.set(swarmId, context);

      let result;

      switch (swarm.type) {
        case SwarmType.SEQUENTIAL:
          result = await this.executeSequential(swarm, context);
          break;
        case SwarmType.PARALLEL:
          result = await this.executeParallel(swarm, context);
          break;
        case SwarmType.COLLABORATIVE:
          result = await this.executeCollaborative(swarm, context);
          break;
        case SwarmType.HIERARCHICAL:
          result = await this.executeHierarchical(swarm, context);
          break;
        default:
          throw new Error(`Unsupported swarm type: ${swarm.type}`);
      }

      // Clean up
      this.activeSwarms.delete(swarmId);

      this.emit('swarmExecuted', { swarmId, executionId, result });

      return result;
    } catch (error) {
      // Clean up on error
      this.activeSwarms.delete(swarmId);

      logger.error('Swarm execution failed:', error);
      throw error;
    }
  }

  private async executeSequential(swarm: Record<string, unknown>, context: SwarmExecutionContext): Promise<Record<string, unknown>> {
    const results: Record<string, unknown>[] = [];
    let currentInput = context.input;
    const members = (swarm.members as Record<string, unknown>[]) || [];

    for (const member of members) {
      const agent = member.agent as Record<string, unknown>;
      if (agent.status !== AgentStatus.READY && agent.status !== AgentStatus.RUNNING) {
        logger.warn(`Skipping agent ${member.agentId} - not ready (status: ${agent.status})`);
        continue;
      }

      try {
        logger.info(`Executing agent ${member.agentId} (${member.role}) in sequential mode`);

        const agentResult = await agentService.executeAgent(member.agentId as string, {
          ...currentInput,
          swarmContext: {
            swarmId: context.swarmId,
            executionId: context.executionId,
            previousResults: results,
            sharedData: Object.fromEntries(context.sharedData!),
          },
        });

        results.push({
          agentId: member.agentId,
          role: member.role,
          result: agentResult,
          timestamp: new Date(),
        });

        // Use output as input for next agent
        if (agentResult.success && agentResult.output) {
          currentInput = agentResult.output;

          // Update shared data if agent provides it
          const output = agentResult.output as Record<string, unknown>;
          if (output.sharedData) {
            const sharedData = output.sharedData as Record<string, unknown>;
            Object.entries(sharedData).forEach(([key, value]) => {
              context.sharedData!.set(key, value);
            });
          }
        }

      } catch (error) {
        logger.error(`Agent ${member.agentId} failed in sequential execution:`, error);
        results.push({
          agentId: member.agentId,
          role: member.role,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return {
      executionType: 'sequential',
      results,
      finalOutput: currentInput,
      sharedData: Object.fromEntries(context.sharedData!),
    };
  }

  private async executeParallel(swarm: Record<string, unknown>, context: SwarmExecutionContext): Promise<Record<string, unknown>> {
    const members = (swarm.members as Record<string, unknown>[]) || [];
    const promises = members
      .filter((member: Record<string, unknown>) => {
        const agent = member.agent as Record<string, unknown>;
        return agent.status === AgentStatus.READY || agent.status === AgentStatus.RUNNING;
      })
      .map(async (member: Record<string, unknown>) => {
        try {
          logger.info(`Executing agent ${member.agentId} (${member.role}) in parallel mode`);

          const agentResult = await agentService.executeAgent(member.agentId as string, {
            ...context.input,
            swarmContext: {
              swarmId: context.swarmId,
              executionId: context.executionId,
              sharedData: Object.fromEntries(context.sharedData!),
            },
          });

          return {
            agentId: member.agentId,
            role: member.role,
            result: agentResult,
            timestamp: new Date(),
          };
        } catch (error) {
          logger.error(`Agent ${member.agentId} failed in parallel execution:`, error);
          return {
            agentId: member.agentId,
            role: member.role,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          };
        }
      });

    const results = await Promise.allSettled(promises);
    const finalResults = results.map(result =>
      result.status === 'fulfilled' ? result.value : { error: 'Promise rejected' }
    );

    return {
      executionType: 'parallel',
      results: finalResults,
      sharedData: Object.fromEntries(context.sharedData!),
    };
  }


  private async executeCollaborative(swarm: Record<string, unknown>, context: SwarmExecutionContext): Promise<Record<string, unknown>> {
    const results: Record<string, unknown>[] = [];
    const members = (swarm.members as Record<string, unknown>[]) || [];
    const coordinators = members.filter((m: Record<string, unknown>) => m.role === SwarmRole.COORDINATOR);
    const workers = members.filter((m: Record<string, unknown>) => m.role === SwarmRole.WORKER);
    const leaders = members.filter((m: Record<string, unknown>) => m.role === SwarmRole.LEADER);

    // Phase 1: Coordinators plan and distribute work
    if (coordinators.length > 0) {
      for (const coordinator of coordinators) {
        try {
          const planResult = await agentService.executeAgent(coordinator.agentId as string, {
            ...context.input,
            phase: 'planning',
            workers: workers.map((w: Record<string, unknown>) => {
              const agent = w.agent as Record<string, unknown>;
              return { id: w.agentId, capabilities: agent.capabilities };
            }),
            swarmContext: {
              swarmId: context.swarmId,
              executionId: context.executionId,
              role: 'coordinator',
            },
          });

          results.push({
            agentId: coordinator.agentId,
            role: coordinator.role,
            phase: 'planning',
            result: planResult,
            timestamp: new Date(),
          });

          if (planResult.success && planResult.output?.workPlan) {
            context.sharedData!.set('workPlan', planResult.output.workPlan);
          }
        } catch (error) {
          logger.error(`Coordinator ${coordinator.agentId} failed:`, error);
        }
      }
    }

    // Phase 2: Workers execute assigned tasks
    const workPlan = (context.sharedData!.get('workPlan') as Record<string, unknown>) || {};
    const workerPromises = workers.map(async (worker: Record<string, unknown>) => {
      try {
        const agentId = worker.agentId as string;
        const assignedTask = (workPlan[agentId] as Record<string, unknown>) || context.input;

        const workResult = await agentService.executeAgent(agentId, {
          ...assignedTask,
          phase: 'execution',
          swarmContext: {
            swarmId: context.swarmId,
            executionId: context.executionId,
            role: 'worker',
            sharedData: Object.fromEntries(context.sharedData!),
          },
        });

        return {
          agentId: worker.agentId,
          role: worker.role,
          phase: 'execution',
          result: workResult,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          agentId: worker.agentId,
          role: worker.role,
          phase: 'execution',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    });

    const workerResults = await Promise.allSettled(workerPromises);
    results.push(...workerResults.map(r => r.status === 'fulfilled' ? r.value : { error: 'Promise rejected' }));

    return {
      executionType: 'collaborative',
      results,
      sharedData: Object.fromEntries(context.sharedData!),
    };
  }

  private async executeHierarchical(swarm: Record<string, unknown>, context: SwarmExecutionContext): Promise<Record<string, unknown>> {
    // Build hierarchy tree
    const members = (swarm.members as Record<string, unknown>[]) || [];
    const hierarchy = this.buildHierarchy(members);
    const results: Record<string, unknown>[] = [];

    // Execute from top to bottom
    await this.executeHierarchyLevel(hierarchy, context, results);

    return {
      executionType: 'hierarchical',
      results,
      sharedData: Object.fromEntries(context.sharedData!),
    };
  }

  private buildHierarchy(members: Record<string, unknown>[]): Record<string, unknown>[] {
    const nodeMap = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    // Create nodes
    members.forEach(member => {
      const agentId = member.agentId as string;
      nodeMap.set(agentId, {
        ...member,
        children: [],
      });
    });

    // Build parent-child relationships
    members.forEach(member => {
      const agentId = member.agentId as string;
      const agent = member.agent as Record<string, unknown>;
      const node = nodeMap.get(agentId);
      if (agent.parentAgentId && nodeMap.has(agent.parentAgentId as string)) {
        const parent = nodeMap.get(agent.parentAgentId as string);
        (parent!.children as Record<string, unknown>[]).push(node!);
      } else {
        roots.push(node!);
      }
    });

    return roots;
  }

  private async executeHierarchyLevel(nodes: Record<string, unknown>[], context: SwarmExecutionContext, results: Record<string, unknown>[]): Promise<void> {
    // Execute all nodes at this level in parallel
    const promises = nodes.map(async (node) => {
      try {
        const agentResult = await agentService.executeAgent(node.agentId as string, {
          ...context.input,
          swarmContext: {
            swarmId: context.swarmId,
            executionId: context.executionId,
            hierarchyLevel: node.level || 0,
            sharedData: Object.fromEntries(context.sharedData!),
          },
        });

        results.push({
          agentId: node.agentId,
          role: node.role,
          level: node.level || 0,
          result: agentResult,
          timestamp: new Date(),
        });

        // Execute children after parent completes
        if (node.children && (node.children as Record<string, unknown>[]).length > 0) {
          await this.executeHierarchyLevel(node.children as Record<string, unknown>[], context, results);
        }

      } catch (error) {
        logger.error(`Hierarchical agent ${node.agentId} failed:`, error);
        results.push({
          agentId: node.agentId,
          role: node.role,
          level: node.level || 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    });

    await Promise.all(promises);
  }

  private async evaluateConditions(member: Record<string, unknown>, context: SwarmExecutionContext, previousResults: Record<string, unknown>[]): Promise<boolean> {
    // Default condition evaluation - can be extended
    const agent = member.agent as Record<string, unknown>;
    const config = (agent.configuration as Record<string, unknown>) || {};
    const conditions = (config.executionConditions as Record<string, unknown>) || {};

    // Check if previous agents succeeded
    if (conditions.requirePreviousSuccess) {
      const hasFailures = previousResults.some(r => r.error || (r.result && !(r.result as any).success));
      if (hasFailures) return false;
    }

    // Check shared data conditions
    if (conditions.requiredData) {
      const requiredData = conditions.requiredData as string[];
      for (const key of requiredData) {
        if (!context.sharedData!.has(key)) return false;
      }
    }

    // Check role-based conditions
    if (conditions.roleConditions) {
      const roleConditions = conditions.roleConditions as Record<string, unknown>;
      const roleCondition = roleConditions[member.role as string];
      if (roleCondition && !this.evaluateRoleCondition(roleCondition as Record<string, unknown>, context, previousResults)) {
        return false;
      }
    }

    return true;
  }

  private evaluateRoleCondition(condition: Record<string, unknown>, context: SwarmExecutionContext, previousResults: Record<string, unknown>[]): boolean {
    // Implement role-specific condition logic
    switch (condition.type) {
      case 'threshold':
        const metric = this.extractMetric(previousResults, condition.metric as string);
        return metric >= (condition.value as number);

      case 'dependency':
        return previousResults.some(r => {
          const result = r.result as Record<string, unknown>;
          return r.agentId === condition.agentId && result?.success;
        });

      default:
        return true;
    }
  }

  private extractMetric(results: Record<string, unknown>[], metricName: string): number {
    // Extract specific metrics from previous results
    let total = 0;
    let count = 0;

    results.forEach(result => {
      const resultData = result.result as Record<string, unknown>;
      const output = resultData?.output as Record<string, unknown>;
      if (output && output[metricName] !== undefined) {
        total += Number(output[metricName]) || 0;
        count++;
      }
    });

    return count > 0 ? total / count : 0;
  }

  async getSwarmStatus(swarmId: string) {
    const swarm = await prisma.agentSwarm.findUnique({
      where: { id: swarmId },
      include: {
        members: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!swarm) {
      throw new Error('Swarm not found');
    }

    const activeContext = this.activeSwarms.get(swarmId);

    return {
      ...swarm,
      activeExecution: activeContext || null,
      memberCount: swarm.members.length,
      activeMembers: swarm.members.filter(m => m.agent.isActive).length,
    };
  }

  async listSwarms(organizationId: string) {
    return prisma.agentSwarm.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export const swarmService = new SwarmService();