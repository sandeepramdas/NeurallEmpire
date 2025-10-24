import { prisma } from '@/server';
import { SwarmType, SwarmRole, AgentStatus, ExecutionStatus } from '@prisma/client';
import { EventEmitter } from 'events';
import { agentService } from './agent.service';
import { logger } from '@/infrastructure/logger';

export interface SwarmConfig {
  name: string;
  description?: string;
  coordinatorType: SwarmType;
  configuration?: any;
}

export interface SwarmMemberConfig {
  agentId: string;
  role: SwarmRole;
  priority: number;
}

export interface SwarmExecutionContext {
  swarmId: string;
  input?: any;
  sharedData?: Map<string, any>;
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

  async executeSwarm(swarmId: string, input?: any): Promise<any> {
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

  private async executeSequential(swarm: any, context: SwarmExecutionContext): Promise<any> {
    const results: any[] = [];
    let currentInput = context.input;

    for (const member of swarm.members) {
      if (member.agent.status !== AgentStatus.READY && member.agent.status !== AgentStatus.RUNNING) {
        logger.warn(`Skipping agent ${member.agentId} - not ready (status: ${member.agent.status})`);
        continue;
      }

      try {
        logger.info(`Executing agent ${member.agentId} (${member.role}) in sequential mode`);

        const agentResult = await agentService.executeAgent(member.agentId, {
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
          if (agentResult.output.sharedData) {
            Object.entries(agentResult.output.sharedData).forEach(([key, value]) => {
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

  private async executeParallel(swarm: any, context: SwarmExecutionContext): Promise<any> {
    const promises = swarm.members
      .filter((member: any) =>
        member.agent.status === AgentStatus.READY || member.agent.status === AgentStatus.RUNNING
      )
      .map(async (member: any) => {
        try {
          logger.info(`Executing agent ${member.agentId} (${member.role}) in parallel mode`);

          const agentResult = await agentService.executeAgent(member.agentId, {
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


  private async executeCollaborative(swarm: any, context: SwarmExecutionContext): Promise<any> {
    const results: any[] = [];
    const coordinators = swarm.members.filter((m: any) => m.role === SwarmRole.COORDINATOR);
    const workers = swarm.members.filter((m: any) => m.role === SwarmRole.WORKER);
    const leaders = swarm.members.filter((m: any) => m.role === SwarmRole.LEADER);

    // Phase 1: Coordinators plan and distribute work
    if (coordinators.length > 0) {
      for (const coordinator of coordinators) {
        try {
          const planResult = await agentService.executeAgent(coordinator.agentId, {
            ...context.input,
            phase: 'planning',
            workers: workers.map((w: any) => ({ id: w.agentId, capabilities: w.agent.capabilities })),
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
    const workPlan = context.sharedData!.get('workPlan') || {};
    const workerPromises = workers.map(async (worker: any) => {
      try {
        const assignedTask = workPlan[worker.agentId] || context.input;

        const workResult = await agentService.executeAgent(worker.agentId, {
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

  private async executeHierarchical(swarm: any, context: SwarmExecutionContext): Promise<any> {
    // Build hierarchy tree
    const hierarchy = this.buildHierarchy(swarm.members);
    const results: any[] = [];

    // Execute from top to bottom
    await this.executeHierarchyLevel(hierarchy, context, results);

    return {
      executionType: 'hierarchical',
      results,
      sharedData: Object.fromEntries(context.sharedData!),
    };
  }

  private buildHierarchy(members: any[]): any {
    const nodeMap = new Map();
    const roots: any[] = [];

    // Create nodes
    members.forEach(member => {
      nodeMap.set(member.agentId, {
        ...member,
        children: [],
      });
    });

    // Build parent-child relationships
    members.forEach(member => {
      const node = nodeMap.get(member.agentId);
      if (member.agent.parentAgentId && nodeMap.has(member.agent.parentAgentId)) {
        const parent = nodeMap.get(member.agent.parentAgentId);
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private async executeHierarchyLevel(nodes: any[], context: SwarmExecutionContext, results: any[]): Promise<void> {
    // Execute all nodes at this level in parallel
    const promises = nodes.map(async (node) => {
      try {
        const agentResult = await agentService.executeAgent(node.agentId, {
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
        if (node.children && node.children.length > 0) {
          await this.executeHierarchyLevel(node.children, context, results);
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

  private async evaluateConditions(member: any, context: SwarmExecutionContext, previousResults: any[]): Promise<boolean> {
    // Default condition evaluation - can be extended
    const config = member.agent.configuration || {};
    const conditions = config.executionConditions || {};

    // Check if previous agents succeeded
    if (conditions.requirePreviousSuccess) {
      const hasFailures = previousResults.some(r => r.error || (r.result && !r.result.success));
      if (hasFailures) return false;
    }

    // Check shared data conditions
    if (conditions.requiredData) {
      for (const key of conditions.requiredData) {
        if (!context.sharedData!.has(key)) return false;
      }
    }

    // Check role-based conditions
    if (conditions.roleConditions) {
      const roleCondition = conditions.roleConditions[member.role];
      if (roleCondition && !this.evaluateRoleCondition(roleCondition, context, previousResults)) {
        return false;
      }
    }

    return true;
  }

  private evaluateRoleCondition(condition: any, context: SwarmExecutionContext, previousResults: any[]): boolean {
    // Implement role-specific condition logic
    switch (condition.type) {
      case 'threshold':
        const metric = this.extractMetric(previousResults, condition.metric);
        return metric >= condition.value;

      case 'dependency':
        return previousResults.some(r =>
          r.agentId === condition.agentId && r.result?.success
        );

      default:
        return true;
    }
  }

  private extractMetric(results: any[], metricName: string): number {
    // Extract specific metrics from previous results
    let total = 0;
    let count = 0;

    results.forEach(result => {
      if (result.result?.output && result.result.output[metricName] !== undefined) {
        total += Number(result.result.output[metricName]) || 0;
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