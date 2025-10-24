import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

export class UsageAnalyticsController {
  /**
   * Get organization-wide usage dashboard
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { period = '30d' } = req.query;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Get all AI model configs for this organization
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

      // Get diet plans usage
      const dietPlans = await prisma.patientDietPlan.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          aiModelConfigId: true,
          createdAt: true,
        },
      });

      // Calculate metrics
      const totalApiCalls = configs.reduce((sum, config) => sum + config.currentMonthUsage, 0);
      const totalModels = configs.length;
      const activeModels = configs.filter(c => c.isActive).length;

      // Group usage by model
      const usageByModel = configs.map(config => {
        const modelDietPlans = dietPlans.filter(dp => dp.aiModelConfigId === config.id);
        return {
          modelId: config.id,
          modelName: config.displayName,
          provider: config.provider.displayName,
          providerIcon: config.provider.icon,
          providerColor: config.provider.color,
          apiCalls: config.currentMonthUsage,
          dietPlansGenerated: modelDietPlans.length,
          lastUsedAt: config.lastUsedAt,
        };
      });

      // Calculate daily usage for charts
      const dailyUsage: Record<string, number> = {};
      dietPlans.forEach(dp => {
        const date = dp.createdAt.toISOString().split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + 1;
      });

      const chartData = Object.entries(dailyUsage)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date,
          count,
        }));

      res.json({
        success: true,
        data: {
          overview: {
            totalApiCalls,
            totalModels,
            activeModels,
            period,
          },
          usageByModel: usageByModel.sort((a, b) => b.apiCalls - a.apiCalls),
          chartData,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching usage dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage dashboard',
      });
    }
  }

  /**
   * Get detailed model usage statistics
   */
  async getModelUsage(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { modelId } = req.params;
      const { period = '30d' } = req.query;

      const config = await prisma.aIModelConfig.findFirst({
        where: {
          id: modelId,
          organizationId,
          deletedAt: null,
        },
        include: {
          provider: true,
        },
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Model configuration not found',
        });
      }

      // Calculate date range
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Get usage from diet plans
      const dietPlans = await prisma.patientDietPlan.findMany({
        where: {
          aiModelConfigId: modelId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          patientName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      // Calculate daily usage
      const dailyUsage: Record<string, number> = {};
      dietPlans.forEach(dp => {
        const date = dp.createdAt.toISOString().split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + 1;
      });

      const chartData = Object.entries(dailyUsage)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date,
          count,
        }));

      res.json({
        success: true,
        data: {
          model: {
            id: config.id,
            displayName: config.displayName,
            modelId: config.modelId,
            provider: config.provider.displayName,
            currentMonthUsage: config.currentMonthUsage,
            monthlyUsageLimit: config.monthlyUsageLimit,
            lastUsedAt: config.lastUsedAt,
          },
          usage: {
            totalCalls: dietPlans.length,
            period,
          },
          chartData,
          recentActivity: dietPlans.slice(0, 10).map(dp => ({
            id: dp.id,
            description: `Diet plan for ${dp.patientName}`,
            timestamp: dp.createdAt,
          })),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching model usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch model usage',
      });
    }
  }

  /**
   * Get cost analytics
   */
  async getCostAnalytics(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { period = '30d' } = req.query;

      const configs = await prisma.aIModelConfig.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        include: {
          provider: true,
        },
      });

      // Calculate estimated costs (this is a placeholder - you'd need actual token counts)
      const costByModel = configs.map(config => {
        const estimatedCost = config.currentMonthUsage * 0.01; // Placeholder calculation
        return {
          modelName: config.displayName,
          provider: config.provider.displayName,
          usage: config.currentMonthUsage,
          estimatedCost: estimatedCost.toFixed(2),
        };
      });

      const totalCost = costByModel.reduce((sum, m) => sum + parseFloat(m.estimatedCost), 0);

      res.json({
        success: true,
        data: {
          totalCost: totalCost.toFixed(2),
          currency: 'USD',
          period,
          costByModel: costByModel.sort((a, b) => parseFloat(b.estimatedCost) - parseFloat(a.estimatedCost)),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching cost analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cost analytics',
      });
    }
  }
}

export const usageAnalyticsController = new UsageAnalyticsController();
