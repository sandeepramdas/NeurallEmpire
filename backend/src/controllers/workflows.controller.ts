import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getPaginationParams, createPaginatedResponse } from '@/utils/pagination';

const prisma = new PrismaClient();

// Workflow creation schema
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  triggerType: z.enum(['MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK']).optional(),
  triggerConfig: z.any().optional(),
  schedule: z.string().optional(), // Cron expression
  definition: z.any() // Workflow definition as JSON (includes nodes, edges, etc.)
});

export class WorkflowsController {
  // Create a new workflow
  async createWorkflow(req: Request, res: Response) {
    try {
      const validatedData = createWorkflowSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Check organization limits
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: { workflows: true }
          }
        }
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (org._count.workflows >= org.maxWorkflows) {
        return res.status(403).json({
          error: `Workflow limit reached. Your plan allows ${org.maxWorkflows} workflows.`
        });
      }

      // Create workflow
      const workflow = await prisma.agentWorkflow.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          category: validatedData.category,
          triggerType: validatedData.triggerType || 'MANUAL',
          triggerConfig: validatedData.triggerConfig as any,
          schedule: validatedData.schedule,
          definition: validatedData.definition as any,
          organizationId,
          creatorId: userId,
          status: 'DRAFT'
        }
      });

      // Update organization workflow count
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentWorkflows: { increment: 1 } }
      });

      // Log creation
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'CREATE',
          resourceType: 'WORKFLOW',
          resourceId: workflow.id,
          metadata: { workflowName: workflow.name }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create workflow error:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  }

  // Get all workflows for organization
  async getWorkflows(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const status = req.query.status as string;

      // Parse pagination parameters
      const { page, limit, skip, take } = getPaginationParams(req);

      const where: any = { organizationId };
      if (status) where.status = status;

      // Get total count for pagination
      const total = await prisma.agentWorkflow.count({ where });

      // Get paginated workflows
      const workflows = await prisma.agentWorkflow.findMany({
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
              executions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      // Return paginated response
      res.json(createPaginatedResponse(workflows, total, page, limit));
    } catch (error) {
      console.error('Get workflows error:', error);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  }

  // Get single workflow
  async getWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const workflow = await prisma.agentWorkflow.findFirst({
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
          executions: {
            take: 10,
            orderBy: { startedAt: 'desc' }
          }
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  }

  // Update workflow
  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      const workflow = await prisma.agentWorkflow.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Update workflow
      const updated = await prisma.agentWorkflow.update({
        where: { id },
        data: {
          name: req.body.name,
          description: req.body.description,
          category: req.body.category,
          triggerType: req.body.triggerType,
          triggerConfig: req.body.triggerConfig,
          schedule: req.body.schedule,
          definition: req.body.definition,
          updatedAt: new Date()
        }
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'UPDATE',
          resourceType: 'WORKFLOW',
          resourceId: id,
          oldValues: workflow as any,
          newValues: req.body as any
        }
      });

      res.json({
        success: true,
        message: 'Workflow updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }

  // Activate/deactivate workflow
  async updateWorkflowStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, isActive } = req.body;
      const organizationId = (req as any).user.organizationId;

      const validStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const workflow = await prisma.agentWorkflow.update({
        where: { id },
        data: {
          status: status || undefined
        }
      });

      res.json({
        success: true,
        message: 'Workflow status updated',
        data: workflow
      });
    } catch (error) {
      console.error('Update workflow status error:', error);
      res.status(500).json({ error: 'Failed to update workflow status' });
    }
  }

  // Execute workflow
  async executeWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { input } = req.body;
      const organizationId = (req as any).user.organizationId;

      const workflow = await prisma.agentWorkflow.findFirst({
        where: {
          id,
          organizationId,
          status: 'ACTIVE'
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Active workflow not found' });
      }

      // Create workflow execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: id,
          status: 'RUNNING',
          input: input as any,
          variables: {} as any
        }
      });

      // Here you would actually execute the workflow
      // This involves orchestrating multiple agent executions

      // Simulate workflow execution
      setTimeout(async () => {
        try {
          // Parse workflow definition to get agents
          const definition = workflow.definition as any;
          const nodes = definition?.nodes || [];

          // Process each node
          for (const node of nodes) {
            if (node.agentId) {
              // Execute agent
              await prisma.agentInteraction.create({
                data: {
                  agentId: node.agentId,
                  organizationId,
                  type: 'WORKFLOW',
                  status: 'COMPLETED',
                  input: input as any,
                  output: { result: 'Processed' } as any,
                  latency: 500
                }
              });
            }
          }

          // Update workflow execution
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              output: { result: 'Workflow completed successfully' } as any
            }
          });

          // Update workflow stats
          await prisma.agentWorkflow.update({
            where: { id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date()
            }
          });
        } catch (error) {
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'FAILED',
              error: 'Workflow execution failed',
              completedAt: new Date()
            }
          });

          await prisma.agentWorkflow.update({
            where: { id },
            data: {
              executionCount: { increment: 1 }
            }
          });
        }
      }, 2000);

      res.json({
        success: true,
        message: 'Workflow execution started',
        data: {
          executionId: execution.id,
          status: 'RUNNING'
        }
      });
    } catch (error) {
      console.error('Execute workflow error:', error);
      res.status(500).json({ error: 'Failed to execute workflow' });
    }
  }

  // Get workflow executions
  async getWorkflowExecutions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const workflow = await prisma.agentWorkflow.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const executions = await prisma.workflowExecution.findMany({
        where: { workflowId: id },
        orderBy: { startedAt: 'desc' },
        take: 50
      });

      res.json({
        success: true,
        data: executions
      });
    } catch (error) {
      console.error('Get workflow executions error:', error);
      res.status(500).json({ error: 'Failed to fetch workflow executions' });
    }
  }

  // Delete workflow
  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const workflow = await prisma.agentWorkflow.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Soft delete - mark as archived
      await prisma.agentWorkflow.update({
        where: { id },
        data: {
          status: 'ARCHIVED'
        }
      });

      // Update organization workflow count
      await prisma.organization.update({
        where: { id: organizationId },
        data: { currentWorkflows: { decrement: 1 } }
      });

      res.json({
        success: true,
        message: 'Workflow archived successfully'
      });
    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  // Create workflow from template
  async createFromTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
      const { name } = req.body;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const template = await prisma.workflowTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const templateData = template.template as any;

      // Create workflow from template
      const workflow = await prisma.agentWorkflow.create({
        data: {
          name: name || templateData.name,
          description: templateData.description,
          category: templateData.category,
          triggerType: templateData.triggerType || 'MANUAL',
          triggerConfig: templateData.triggerConfig,
          definition: templateData.definition,
          organizationId,
          creatorId: userId,
          status: 'DRAFT'
        }
      });

      // Update template usage count
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { useCount: { increment: 1 } }
      });

      res.status(201).json({
        success: true,
        message: 'Workflow created from template',
        data: workflow
      });
    } catch (error) {
      console.error('Create from template error:', error);
      res.status(500).json({ error: 'Failed to create workflow from template' });
    }
  }
}

export const workflowsController = new WorkflowsController();