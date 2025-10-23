import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getPaginationParams, createPaginatedResponse } from '@/utils/pagination';

const prisma = new PrismaClient();

// Agent creation schema
const createAgentSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'LEAD_GENERATOR', 'EMAIL_MARKETER', 'SOCIAL_MEDIA', 'CONTENT_CREATOR',
    'ANALYTICS', 'CUSTOMER_SERVICE', 'SALES', 'SEO_OPTIMIZER',
    'CONVERSATIONAL', 'TASK_AUTOMATION', 'DATA_PROCESSOR', 'INTEGRATION',
    'EMAIL_MARKETING', 'WORKFLOW_AUTOMATION', 'DATA_PROCESSING',
    'INTEGRATION_AGENT', 'MONITORING_AGENT'
  ]),
  category: z.string(),
  description: z.string().optional(),
  config: z.object({
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(8000).optional(),
    model: z.string().optional(),
  }),
  capabilities: z.array(z.string()),
  triggers: z.array(z.object({
    type: z.string(),
    conditions: z.any()
  })).optional(),
});

export class AgentsController {
  // Create a new agent
  async createAgent(req: Request, res: Response) {
    try {
      const validatedData = createAgentSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Check organization limits
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: { agents: true }
          }
        }
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (org._count.agents >= org.maxAgents) {
        return res.status(403).json({
          error: `Agent limit reached. Your plan allows ${org.maxAgents} agents.`
        });
      }

      // Create slug from name
      const slug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

      // Create agent
      const agent = await prisma.agent.create({
        data: {
          name: validatedData.name,
          type: validatedData.type,
          category: validatedData.category,
          description: validatedData.description,
          capabilities: validatedData.capabilities as any,
          systemPrompt: validatedData.config.systemPrompt || 'You are a helpful AI assistant.',
          model: validatedData.config.model || 'gpt-4',
          temperature: validatedData.config.temperature || 0.7,
          maxTokens: validatedData.config.maxTokens || 2000,
          organizationId,
          creatorId: userId,
          ownerId: userId,
          status: 'DRAFT'
        }
      });

      // Update organization agent count
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentAgents: { increment: 1 } }
      });

      // Log creation
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'CREATE',
          resourceType: 'AGENT',
          resourceId: agent.id,
          metadata: { agentName: agent.name, agentType: agent.type }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: agent
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create agent error:', error);
      res.status(500).json({ error: 'Failed to create agent' });
    }
  }

  // Get all agents for organization
  async getAgents(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const isPublic = req.query.isPublic === 'true';

      // Parse pagination parameters
      const { page, limit, skip, take } = getPaginationParams(req);

      const where: any = { organizationId };
      if (status) where.status = status;
      if (type) where.type = type;
      if (isPublic !== undefined) where.isPublic = isPublic;

      // Get total count for pagination
      const total = await prisma.agent.count({ where });

      // Get paginated agents
      const agents = await prisma.agent.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              interactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      // Return paginated response
      res.json(createPaginatedResponse(agents, total, page, limit));
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  }

  // Get single agent
  async getAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          organizationId
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          interactions: {
            take: 10,
            orderBy: { startedAt: 'desc' }
          }
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  }

  // Update agent
  async updateAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const updated = await prisma.agent.update({
        where: { id },
        data: {
          ...req.body,
          updatedAt: new Date()
        }
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'UPDATE',
          resourceType: 'AGENT',
          resourceId: id,
          oldValues: agent as any,
          newValues: req.body as any
        }
      });

      res.json({
        success: true,
        message: 'Agent updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({ error: 'Failed to update agent' });
    }
  }

  // Activate/deactivate agent
  async updateAgentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = (req as any).user.organizationId;

      const validStatuses = ['DRAFT', 'TESTING', 'READY', 'ACTIVE', 'PAUSED', 'ERROR', 'MAINTENANCE', 'DEPRECATED', 'ARCHIVED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const agent = await prisma.agent.update({
        where: { id },
        data: { status }
      });

      res.json({
        success: true,
        message: `Agent status updated to ${status}`,
        data: agent
      });
    } catch (error) {
      console.error('Update agent status error:', error);
      res.status(500).json({ error: 'Failed to update agent status' });
    }
  }

  // Execute agent
  async executeAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { input } = req.body;
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          organizationId,
          status: 'ACTIVE'
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Active agent not found' });
      }

      // Create execution record
      const execution = await prisma.agentInteraction.create({
        data: {
          agentId: id,
          organizationId,
          userId,
          type: 'CHAT',
          status: 'PENDING',
          input: input as any
        }
      });

      // Here you would actually execute the agent
      // This is where you'd integrate with your AI service (OpenAI, etc.)

      // Simulate execution
      setTimeout(async () => {
        try {
          // Simulate AI processing
          const output = {
            response: `Agent ${agent.name} processed your request`,
            data: input,
            timestamp: new Date()
          };

          await prisma.agentInteraction.update({
            where: { id: execution.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              output: output as any,
              latency: 1500,
              tokens: { used: 150 } as any
            }
          });

          // Update agent metrics
          await prisma.agent.update({
            where: { id },
            data: {
              usageCount: { increment: 1 },
              lastUsedAt: new Date()
            }
          });
        } catch (error) {
          await prisma.agentInteraction.update({
            where: { id: execution.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Execution failed',
              completedAt: new Date()
            }
          });
        }
      }, 1000);

      res.json({
        success: true,
        message: 'Agent execution started',
        data: {
          executionId: execution.id,
          status: 'PENDING'
        }
      });
    } catch (error) {
      console.error('Execute agent error:', error);
      res.status(500).json({ error: 'Failed to execute agent' });
    }
  }

  // Get agent metrics
  async getAgentMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const period = req.query.period as string || 'DAY';
      const organizationId = (req as any).user.organizationId;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Metrics are now stored differently - skip for now
      const metrics: any[] = [];

      const executions = await prisma.agentInteraction.groupBy({
        by: ['status'],
        where: { agentId: id },
        _count: { id: true }
      });

      res.json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            status: agent.status
          },
          metrics,
          executions,
          summary: {
            usageCount: agent.usageCount,
            successRate: agent.successRate,
            avgResponseTime: agent.avgResponseTime
          }
        }
      });
    } catch (error) {
      console.error('Get agent metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch agent metrics' });
    }
  }

  // Delete agent
  async deleteAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Soft delete - mark as inactive
      await prisma.agent.update({
        where: { id },
        data: {
          isActive: false
        }
      });

      // Update organization agent count
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentAgents: { decrement: 1 } }
      });

      res.json({
        success: true,
        message: 'Agent archived successfully'
      });
    } catch (error) {
      console.error('Delete agent error:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  }
}

export const agentsController = new AgentsController();