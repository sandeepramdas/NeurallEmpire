import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

interface CostBreakdown {
  modelId: string;
  modelName: string;
  provider: string;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  apiCalls: number;
}

interface BudgetAlert {
  id: string;
  organizationId: string;
  alertType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  threshold: number;
  currentSpend: number;
  percentageUsed: number;
  isTriggered: boolean;
  triggeredAt?: Date;
}

const createBudgetAlertSchema = z.object({
  alertType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  threshold: z.number().positive(),
  notifyEmails: z.array(z.string().email()).optional(),
  enabled: z.boolean().default(true),
});

const updateBudgetAlertSchema = createBudgetAlertSchema.partial();

export class CostTrackingController {
  /**
   * Get cost overview for organization
   */
  async getCostOverview(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { period = '30d' } = req.query;

      // Calculate date range
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all model configs with cost info
      const configs = await prisma.aIModelConfig.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        include: {
          provider: {
            select: {
              name: true,
              displayName: true,
              icon: true,
              color: true,
            },
          },
        },
      });

      // Get diet plans (as proxy for API usage)
      const dietPlans = await prisma.patientDietPlan.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          aiModelConfigId: true,
          createdAt: true,
        },
      });

      // Calculate costs per model
      const costBreakdown: CostBreakdown[] = configs.map((config) => {
        const modelPlans = dietPlans.filter((p) => p.aiModelConfigId === config.id);
        const apiCalls = modelPlans.length;

        // Estimate tokens based on typical diet plan generation
        // Average: 1500 prompt tokens + 3000 completion tokens per plan
        const avgPromptTokens = 1500;
        const avgCompletionTokens = 3000;
        const promptTokens = apiCalls * avgPromptTokens;
        const completionTokens = apiCalls * avgCompletionTokens;
        const totalTokens = promptTokens + completionTokens;

        // Calculate cost
        const promptCost = (config.costPerPromptToken || 0) * promptTokens;
        const completionCost = (config.costPerCompletionToken || 0) * completionTokens;
        const totalCost = promptCost + completionCost;

        return {
          modelId: config.id,
          modelName: config.displayName,
          provider: config.provider.displayName,
          totalCost: parseFloat(totalCost.toFixed(4)),
          promptTokens,
          completionTokens,
          totalTokens,
          apiCalls,
        };
      });

      // Calculate totals
      const totalCost = costBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
      const totalApiCalls = costBreakdown.reduce((sum, item) => sum + item.apiCalls, 0);
      const totalTokens = costBreakdown.reduce((sum, item) => sum + item.totalTokens, 0);

      // Generate daily cost chart data
      const chartData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayPlans = dietPlans.filter((p) => {
          const planDate = p.createdAt.toISOString().split('T')[0];
          return planDate === dateStr;
        });

        let dayCost = 0;
        dayPlans.forEach((plan) => {
          const config = configs.find((c) => c.id === plan.aiModelConfigId);
          if (config) {
            const promptCost = (config.costPerPromptToken || 0) * 1500;
            const completionCost = (config.costPerCompletionToken || 0) * 3000;
            dayCost += promptCost + completionCost;
          }
        });

        chartData.push({
          date: dateStr,
          cost: parseFloat(dayCost.toFixed(4)),
          calls: dayPlans.length,
        });
      }

      res.json({
        success: true,
        data: {
          overview: {
            totalCost: parseFloat(totalCost.toFixed(4)),
            totalApiCalls,
            totalTokens,
            period,
            averageCostPerCall: totalApiCalls > 0 ? parseFloat((totalCost / totalApiCalls).toFixed(4)) : 0,
          },
          costByModel: costBreakdown.filter(c => c.totalCost > 0),
          chartData,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching cost overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cost overview',
      });
    }
  }

  /**
   * Get budget alerts for organization
   */
  async getBudgetAlerts(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      // TODO: Fetch from database when BudgetAlert model is added to schema
      // For now, return mock data structure
      const alerts: BudgetAlert[] = [];

      res.json({
        success: true,
        alerts,
      });
    } catch (error: any) {
      logger.error('Error fetching budget alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch budget alerts',
      });
    }
  }

  /**
   * Create a new budget alert
   */
  async createBudgetAlert(req: Request, res: Response) {
    try {
      const validatedData = createBudgetAlertSchema.parse(req.body);
      const organizationId = (req as any).user.organizationId;
      const userId = (req as any).user.id;

      // TODO: Create in database when BudgetAlert model is added to schema
      // For now, return mock response
      res.status(201).json({
        success: true,
        message: 'Budget alert created successfully',
        alert: {
          id: 'temp-id',
          ...validatedData,
          organizationId,
          createdBy: userId,
        },
      });
    } catch (error: any) {
      logger.error('Error creating budget alert:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create budget alert',
      });
    }
  }

  /**
   * Update an existing budget alert
   */
  async updateBudgetAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateBudgetAlertSchema.parse(req.body);
      const organizationId = (req as any).user.organizationId;

      // TODO: Update in database when BudgetAlert model is added to schema
      // For now, return mock response
      res.json({
        success: true,
        message: 'Budget alert updated successfully',
        alert: {
          id,
          ...validatedData,
          organizationId,
        },
      });
    } catch (error: any) {
      logger.error('Error updating budget alert:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update budget alert',
      });
    }
  }

  /**
   * Delete a budget alert
   */
  async deleteBudgetAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // TODO: Delete from database when BudgetAlert model is added to schema
      // For now, return mock response
      res.json({
        success: true,
        message: 'Budget alert deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting budget alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete budget alert',
      });
    }
  }

  /**
   * Get cost projections
   */
  async getCostProjections(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      // Get last 30 days of usage
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const dietPlans = await prisma.patientDietPlan.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        select: {
          aiModelConfigId: true,
          createdAt: true,
        },
      });

      // Calculate average daily usage
      const avgDailyUsage = dietPlans.length / 30;

      // Get model configs for cost calculation
      const configs = await prisma.aIModelConfig.findMany({
        where: { organizationId, deletedAt: null },
      });

      // Calculate average cost per API call
      let totalCost = 0;
      dietPlans.forEach(() => {
        // Use average cost across all models
        const avgPromptCost = configs.reduce((sum, c) => sum + (c.costPerPromptToken || 0), 0) / Math.max(configs.length, 1);
        const avgCompletionCost = configs.reduce((sum, c) => sum + (c.costPerCompletionToken || 0), 0) / Math.max(configs.length, 1);
        totalCost += (avgPromptCost * 1500) + (avgCompletionCost * 3000);
      });

      const avgCostPerCall = dietPlans.length > 0 ? totalCost / dietPlans.length : 0;

      // Project costs
      const projections = {
        next7Days: parseFloat((avgDailyUsage * 7 * avgCostPerCall).toFixed(4)),
        next30Days: parseFloat((avgDailyUsage * 30 * avgCostPerCall).toFixed(4)),
        next90Days: parseFloat((avgDailyUsage * 90 * avgCostPerCall).toFixed(4)),
      };

      res.json({
        success: true,
        projections,
        insights: {
          avgDailyUsage: parseFloat(avgDailyUsage.toFixed(2)),
          avgCostPerCall: parseFloat(avgCostPerCall.toFixed(4)),
          trend: avgDailyUsage > 10 ? 'increasing' : avgDailyUsage > 5 ? 'stable' : 'low',
        },
      });
    } catch (error: any) {
      logger.error('Error calculating projections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate cost projections',
      });
    }
  }
}

export const costTrackingController = new CostTrackingController();
