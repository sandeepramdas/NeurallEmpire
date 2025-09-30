import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Workflow creation schema
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['SEQUENTIAL', 'PARALLEL', 'CONDITIONAL', 'LOOP', 'EVENT_DRIVEN', 'SCHEDULED']),
  trigger: z.object({
    type: z.string(),
    conditions: z.any()
  }),
  schedule: z.string().optional(), // Cron expression
  nodes: z.array(z.object({
    agentId: z.string(),
    nodeType: z.string(),
    order: z.number(),
    config: z.any(),
    condition: z.any().optional(),
    inputMapping: z.any().optional(),
    outputMapping: z.any().optional()
  }))
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

      // Create workflow with nodes in transaction
      const workflow = await prisma.$transaction(async (tx) => {
        // Create workflow
        const workflow = await tx.agentWorkflow.create({
          data: {
            name: validatedData.name,
            description: validatedData.description,
            type: validatedData.type,
            trigger: validatedData.trigger as any,
            schedule: validatedData.schedule,
            config: {} as any,
            organizationId,
            createdById: userId,
            status: 'DRAFT'
          }
        });

        // Create workflow nodes
        if (validatedData.nodes && validatedData.nodes.length > 0) {
          await tx.agentWorkflowNode.createMany({
            data: validatedData.nodes.map(node => ({
              workflowId: workflow.id,
              agentId: node.agentId,
              nodeType: node.nodeType,
              order: node.order,
              position: { x: node.order * 200, y: 100 } as any,
              config: node.config as any,
              condition: node.condition as any,
              inputMapping: node.inputMapping as any,
              outputMapping: node.outputMapping as any
            }))
          });
        }

        return workflow;
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
          resource: 'WORKFLOW',
          resourceId: workflow.id,
          metadata: { workflowName: workflow.name, workflowType: workflow.type }
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
      const type = req.query.type as string;

      const where: any = { organizationId };
      if (status) where.status = status;
      if (type) where.type = type;

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
          nodes: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  status: true
                }
              }
            },
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              executions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: workflows
      });
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
          nodes: {
            include: {
              agent: true
            },
            orderBy: { order: 'asc' }
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

      // Update workflow and nodes in transaction
      const updated = await prisma.$transaction(async (tx) => {
        // Update workflow
        const updatedWorkflow = await tx.agentWorkflow.update({
          where: { id },
          data: {
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            trigger: req.body.trigger,
            schedule: req.body.schedule,
            config: req.body.config,
            version: { increment: 1 },
            updatedAt: new Date()
          }
        });

        // Update nodes if provided
        if (req.body.nodes) {
          // Delete existing nodes
          await tx.agentWorkflowNode.deleteMany({
            where: { workflowId: id }
          });

          // Create new nodes
          await tx.agentWorkflowNode.createMany({
            data: req.body.nodes.map((node: any) => ({
              workflowId: id,
              agentId: node.agentId,
              nodeType: node.nodeType,
              order: node.order,
              position: node.position || { x: node.order * 200, y: 100 },
              config: node.config,
              condition: node.condition,
              inputMapping: node.inputMapping,
              outputMapping: node.outputMapping
            }))
          });
        }

        return updatedWorkflow;
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'UPDATE',
          resource: 'WORKFLOW',
          resourceId: id,
          changes: req.body
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

      const validStatuses = ['DRAFT', 'TESTING', 'PUBLISHED', 'ACTIVE', 'PAUSED', 'ERROR', 'ARCHIVED'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const workflow = await prisma.agentWorkflow.update({
        where: { id },
        data: {
          status: status || undefined,
          isActive: isActive !== undefined ? isActive : undefined
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
          status: 'ACTIVE',
          isActive: true
        },
        include: {
          nodes: {
            include: {
              agent: true
            },
            orderBy: { order: 'asc' }
          }
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
          // Process each node based on workflow type
          for (const node of workflow.nodes) {
            // Execute agent
            await prisma.agentExecution.create({
              data: {
                agentId: node.agentId,
                triggeredBy: 'WORKFLOW',
                triggerId: execution.id,
                status: 'COMPLETED',
                input: input as any,
                output: { result: 'Processed' } as any,
                duration: 500
              }
            });
          }

          // Update workflow execution
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              output: { result: 'Workflow completed successfully' } as any,
              duration: 2000
            }
          });

          // Update workflow stats
          await prisma.agentWorkflow.update({
            where: { id },
            data: {
              totalRuns: { increment: 1 },
              successfulRuns: { increment: 1 },
              lastRunAt: new Date()
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
              totalRuns: { increment: 1 },
              failedRuns: { increment: 1 }
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

      // Soft delete
      await prisma.agentWorkflow.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          deletedAt: new Date()
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
          type: templateData.type,
          trigger: templateData.trigger,
          config: templateData.config,
          organizationId,
          createdById: userId,
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