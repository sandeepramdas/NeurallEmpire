import { Request, Response } from 'express';
import { agentService } from '@/services/agent.service';
import { AuthenticatedRequest } from '@/types';
import { AgentType, AgentStatus } from '@prisma/client';

export class AgentController {
  async createAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { name, type, description, configuration, triggers, actions, capabilities } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name and type are required',
        });
      }

      if (!Object.values(AgentType).includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid agent type',
        });
      }

      const agent = await agentService.createAgent(organizationId, {
        name,
        type,
        description,
        configuration: configuration || {},
        triggers,
        actions,
        capabilities,
      });

      res.status(201).json({
        success: true,
        data: agent,
        message: 'Agent created successfully',
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create agent',
      });
    }
  }

  async listAgents(req: AuthenticatedRequest, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { type, status, isActive } = req.query;

      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const agents = await agentService.listAgents(organizationId, filters);

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error listing agents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list agents',
      });
    }
  }

  async getAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const agent = await agentService.getAgentStatus(id);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error getting agent:', error);

      if (error instanceof Error && error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          message: 'Agent not found',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get agent',
      });
    }
  }

  async updateAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const agent = await agentService.updateAgent(id, updates);

      res.json({
        success: true,
        data: agent,
        message: 'Agent updated successfully',
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update agent',
      });
    }
  }

  async startAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await agentService.startAgent(id);

      res.json({
        success: true,
        data: { started: result },
        message: 'Agent started successfully',
      });
    } catch (error) {
      console.error('Error starting agent:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start agent',
      });
    }
  }

  async stopAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await agentService.stopAgent(id);

      res.json({
        success: true,
        data: { stopped: result },
        message: 'Agent stopped successfully',
      });
    } catch (error) {
      console.error('Error stopping agent:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop agent',
      });
    }
  }

  async executeAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { input } = req.body;

      const result = await agentService.executeAgent(id, input);

      res.json({
        success: true,
        data: result,
        message: 'Agent executed successfully',
      });
    } catch (error) {
      console.error('Error executing agent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute agent',
      });
    }
  }

  async getAgentExecutions(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // This would typically be a separate service method
      const { prisma } = await import('@/server');

      const executions = await prisma.agentExecution.findMany({
        where: { agentId: id },
        orderBy: { startedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });

      const total = await prisma.agentExecution.count({
        where: { agentId: id },
      });

      res.json({
        success: true,
        data: {
          executions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Error getting agent executions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get agent executions',
      });
    }
  }

  async getAgentTypes(req: Request, res: Response) {
    try {
      const agentTypes = Object.values(AgentType).map(type => ({
        value: type,
        label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        description: this.getAgentTypeDescription(type),
      }));

      res.json({
        success: true,
        data: agentTypes,
      });
    } catch (error) {
      console.error('Error getting agent types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get agent types',
      });
    }
  }

  private getAgentTypeDescription(type: AgentType): string {
    const descriptions: Record<AgentType, string> = {
      [AgentType.LEAD_GENERATOR]: 'Automatically finds and qualifies potential customers',
      [AgentType.EMAIL_MARKETER]: 'Creates and sends targeted email campaigns',
      [AgentType.SOCIAL_MEDIA]: 'Manages social media presence and engagement',
      [AgentType.CONTENT_CREATOR]: 'Generates blog posts, articles, and marketing content',
      [AgentType.ANALYTICS]: 'Analyzes data and provides business insights',
      [AgentType.CUSTOMER_SERVICE]: 'Handles customer inquiries and support tickets',
      [AgentType.SALES]: 'Manages sales pipeline and customer relationships',
      [AgentType.SEO_OPTIMIZER]: 'Optimizes content and website for search engines',
      [AgentType.WORKFLOW_AUTOMATION]: 'Automates business processes and workflows',
      [AgentType.DATA_PROCESSING]: 'Processes and transforms large datasets',
      [AgentType.INTEGRATION_AGENT]: 'Connects and synchronizes different systems',
      [AgentType.MONITORING_AGENT]: 'Monitors system health and performance',
      [AgentType.RESEARCH_AGENT]: 'Conducts market research and competitive analysis',
      [AgentType.CUSTOM]: 'Custom agent with user-defined functionality',
    };

    return descriptions[type] || 'Custom agent functionality';
  }
}