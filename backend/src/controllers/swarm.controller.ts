import { Response } from 'express';
import { swarmService } from '@/services/swarm.service';
import { AuthenticatedRequest } from '@/types';
import { SwarmType, SwarmRole } from '@prisma/client';
import { logger } from '@/infrastructure/logger';

export class SwarmController {
  async createSwarm(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { organizationId } = req.user;
      const { name, description, coordinatorType, configuration } = req.body;

      if (!name || !coordinatorType) {
        return res.status(400).json({
          success: false,
          message: 'Name and coordinator type are required',
        });
      }

      if (!Object.values(SwarmType).includes(coordinatorType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinator type',
        });
      }

      const swarm = await swarmService.createSwarm(organizationId, {
        name,
        description,
        coordinatorType,
        configuration,
      });

      return res.status(201).json({
        success: true,
        data: swarm,
        message: 'Swarm created successfully',
      });
    } catch (error) {
      logger.error('Error creating swarm:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create swarm',
      });
    }
  }

  async listSwarms(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { organizationId } = req.user;
      const swarms = await swarmService.listSwarms(organizationId);

      return res.json({
        success: true,
        data: swarms,
      });
    } catch (error) {
      logger.error('Error listing swarms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list swarms',
      });
    }
  }

  async getSwarm(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const swarm = await swarmService.getSwarmStatus(id!);

      return res.json({
        success: true,
        data: swarm,
      });
    } catch (error) {
      logger.error('Error getting swarm:', error);

      if (error instanceof Error && error.message === 'Swarm not found') {
        return res.status(404).json({
          success: false,
          message: 'Swarm not found',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to get swarm',
      });
    }
  }

  async addAgentToSwarm(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { agentId, role, priority } = req.body;

      if (!agentId || !role) {
        return res.status(400).json({
          success: false,
          message: 'Agent ID and role are required',
        });
      }

      if (!Object.values(SwarmRole).includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role',
        });
      }

      const member = await swarmService.addAgentToSwarm(id!, {
        agentId,
        role,
        priority: priority || 0,
      });

      return res.json({
        success: true,
        data: member,
        message: 'Agent added to swarm successfully',
      });
    } catch (error) {
      logger.error('Error adding agent to swarm:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: error.message,
          });
        }
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            success: false,
            message: 'Agent is already a member of this swarm',
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to add agent to swarm',
      });
    }
  }

  async removeAgentFromSwarm(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { id, agentId } = req.params;

      await swarmService.removeAgentFromSwarm(id!, agentId!);

      return res.json({
        success: true,
        message: 'Agent removed from swarm successfully',
      });
    } catch (error) {
      logger.error('Error removing agent from swarm:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove agent from swarm',
      });
    }
  }

  async executeSwarm(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { input } = req.body;

      const result = await swarmService.executeSwarm(id!, input);

      return res.json({
        success: true,
        data: result,
        message: 'Swarm executed successfully',
      });
    } catch (error) {
      logger.error('Error executing swarm:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            message: error.message,
          });
        }
        if (error.message.includes('no members')) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to execute swarm',
      });
    }
  }

  async getSwarmTypes(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const swarmTypes = Object.values(SwarmType).map(type => ({
        value: type,
        label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: this.getSwarmTypeDescription(type),
      }));

      return res.json({
        success: true,
        data: swarmTypes,
      });
    } catch (error) {
      logger.error('Error getting swarm types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get swarm types',
      });
    }
  }

  async getSwarmRoles(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const swarmRoles = Object.values(SwarmRole).map(role => ({
        value: role,
        label: role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: this.getSwarmRoleDescription(role),
      }));

      return res.json({
        success: true,
        data: swarmRoles,
      });
    } catch (error) {
      logger.error('Error getting swarm roles:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get swarm roles',
      });
    }
  }

  private getSwarmTypeDescription(type: SwarmType): string {
    const descriptions: Record<SwarmType, string> = {
      [SwarmType.SEQUENTIAL]: 'Agents execute one after another, each using the output of the previous agent',
      [SwarmType.PARALLEL]: 'All agents execute simultaneously with the same input',
      [SwarmType.COLLABORATIVE]: 'Agents work together, sharing data and coordinating tasks',
      [SwarmType.HIERARCHICAL]: 'Agents execute in a parent-child hierarchy structure',
    };

    return descriptions[type] || 'Custom coordination pattern';
  }

  private getSwarmRoleDescription(role: SwarmRole): string {
    const descriptions: Record<SwarmRole, string> = {
      [SwarmRole.LEADER]: 'Coordinates and leads other agents in the swarm',
      [SwarmRole.WORKER]: 'Performs the main tasks and processing work',
      [SwarmRole.COORDINATOR]: 'Manages workflow and coordinates tasks',
      [SwarmRole.SPECIALIST]: 'Performs specialized tasks with expert knowledge',
    };

    return descriptions[role] || 'Custom agent role';
  }
}