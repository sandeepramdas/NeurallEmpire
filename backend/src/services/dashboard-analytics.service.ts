import { prisma } from '@/server';
import { logger } from '@/infrastructure/logger';

/**
 * Dashboard Analytics Service
 * Provides comprehensive analytics for the main dashboard
 */

export interface DashboardStats {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalWorkflows: number;
    totalUsers: number;
  };
  usage: {
    agentExecutionsToday: number;
    agentExecutionsThisMonth: number;
    apiCallsToday: number;
    totalTokensUsed: number;
  };
  performance: {
    avgAgentResponseTime: number;
    avgSuccessRate: number;
    totalCostThisMonth: number;
  };
  growth: {
    agentsGrowth: number; // percentage
    usersGrowth: number;
    executionsGrowth: number;
  };
}

export interface ChartData {
  agentExecutionsTrend: Array<{ date: string; count: number }>;
  agentPerformance: Array<{ name: string; successRate: number; runs: number }>;
  modelUsage: Array<{ model: string; count: number; percentage: number }>;
  hourlyActivity: Array<{ hour: string; executions: number }>;
}

export interface RecentActivity {
  type: 'agent_created' | 'agent_executed' | 'workflow_executed' | 'user_joined';
  message: string;
  timestamp: Date;
  userId?: string;
  agentId?: string;
}

export class DashboardAnalyticsService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Overview Stats
      const [
        totalAgents,
        activeAgents,
        totalWorkflows,
        totalUsers
      ] = await Promise.all([
        prisma.agent.count({ where: { organizationId, isActive: true } }),
        prisma.agent.count({ where: { organizationId, status: 'ACTIVE' } }),
        prisma.agentWorkflow.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId } })
      ]);

      // Usage Stats
      const [
        executionsToday,
        executionsThisMonth,
        executionsLastMonth
      ] = await Promise.all([
        prisma.agentInteraction.count({
          where: {
            organizationId,
            startedAt: { gte: startOfToday }
          }
        }),
        prisma.agentInteraction.count({
          where: {
            organizationId,
            startedAt: { gte: startOfMonth }
          }
        }),
        prisma.agentInteraction.count({
          where: {
            organizationId,
            startedAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          }
        })
      ]);

      // Performance Stats
      const agents = await prisma.agent.findMany({
        where: { organizationId },
        select: {
          avgResponseTime: true,
          successRate: true,
          usageCount: true
        }
      });

      const avgResponseTime = agents.length > 0
        ? agents.reduce((sum, a) => sum + a.avgResponseTime, 0) / agents.length
        : 0;

      const avgSuccessRate = agents.length > 0
        ? agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length
        : 0;

      // Calculate cost (simplified - you can enhance this)
      const interactions = await prisma.agentInteraction.findMany({
        where: {
          organizationId,
          startedAt: { gte: startOfMonth },
          cost: { not: null }
        },
        select: { cost: true }
      });

      const totalCost = interactions.reduce((sum, i) => sum + (i.cost || 0), 0);

      // Calculate token usage from JSON field
      const interactionsWithTokens = await prisma.agentInteraction.findMany({
        where: {
          organizationId,
          startedAt: { gte: startOfMonth },
          tokens: { not: null }
        },
        select: { tokens: true }
      });

      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      interactionsWithTokens.forEach((interaction) => {
        const tokens = interaction.tokens as any;
        if (tokens) {
          // Support different token field structures
          const prompt = tokens.prompt || tokens.promptTokens || tokens.input || 0;
          const completion = tokens.completion || tokens.completionTokens || tokens.output || 0;
          const total = tokens.total || tokens.totalTokens || (prompt + completion);

          promptTokens += prompt;
          completionTokens += completion;
          totalTokens += total;
        }
      });

      // Growth calculations
      const agentsLastMonth = await prisma.agent.count({
        where: {
          organizationId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        }
      });

      const agentsThisMonth = await prisma.agent.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      });

      const usersLastMonth = await prisma.user.count({
        where: {
          organizationId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        }
      });

      const usersThisMonth = await prisma.user.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      });

      // Calculate growth percentages
      const agentsGrowth = agentsLastMonth > 0
        ? ((agentsThisMonth - agentsLastMonth) / agentsLastMonth) * 100
        : 100;

      const usersGrowth = usersLastMonth > 0
        ? ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100
        : 100;

      const executionsGrowth = executionsLastMonth > 0
        ? ((executionsThisMonth - executionsLastMonth) / executionsLastMonth) * 100
        : 100;

      return {
        overview: {
          totalAgents,
          activeAgents,
          totalWorkflows,
          totalUsers
        },
        usage: {
          agentExecutionsToday: executionsToday,
          agentExecutionsThisMonth: executionsThisMonth,
          apiCallsToday: executionsToday, // Simplified
          totalTokensUsed: totalTokens,
          promptTokens,
          completionTokens
        },
        performance: {
          avgAgentResponseTime: Math.round(avgResponseTime),
          avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
          totalCostThisMonth: Math.round(totalCost * 100) / 100
        },
        growth: {
          agentsGrowth: Math.round(agentsGrowth * 10) / 10,
          usersGrowth: Math.round(usersGrowth * 10) / 10,
          executionsGrowth: Math.round(executionsGrowth * 10) / 10
        }
      };
    } catch (error: any) {
      logger.error('Get dashboard stats error:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get chart data for visualizations
   */
  async getChartData(organizationId: string, days: number = 7): Promise<ChartData> {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Agent Executions Trend (last N days)
      const executions = await prisma.agentInteraction.findMany({
        where: {
          organizationId,
          startedAt: { gte: startDate }
        },
        select: {
          startedAt: true
        }
      });

      // Group by date
      const executionsByDate: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        executionsByDate[dateStr] = 0;
      }

      executions.forEach(exec => {
        const dateStr = exec.startedAt.toISOString().split('T')[0];
        if (executionsByDate[dateStr] !== undefined) {
          executionsByDate[dateStr]++;
        }
      });

      const agentExecutionsTrend = Object.entries(executionsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top Agent Performance
      const agents = await prisma.agent.findMany({
        where: { organizationId },
        select: {
          name: true,
          successRate: true,
          usageCount: true
        },
        orderBy: { usageCount: 'desc' },
        take: 5
      });

      const agentPerformance = agents.map(agent => ({
        name: agent.name.length > 20 ? agent.name.substring(0, 20) + '...' : agent.name,
        successRate: agent.successRate,
        runs: agent.usageCount
      }));

      // Model Usage Distribution
      const agentsWithModels = await prisma.agent.findMany({
        where: { organizationId },
        select: { model: true }
      });

      const modelCounts: Record<string, number> = {};
      agentsWithModels.forEach(agent => {
        const model = agent.model || 'unknown';
        modelCounts[model] = (modelCounts[model] || 0) + 1;
      });

      const total = agentsWithModels.length || 1;
      const modelUsage = Object.entries(modelCounts).map(([model, count]) => ({
        model,
        count,
        percentage: Math.round((count / total) * 100)
      }));

      // Hourly Activity (last 24 hours)
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentExecutions = await prisma.agentInteraction.findMany({
        where: {
          organizationId,
          startedAt: { gte: last24Hours }
        },
        select: { startedAt: true }
      });

      const hourlyActivity: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        const hour = (now.getHours() - i + 24) % 24;
        hourlyActivity[`${hour}:00`] = 0;
      }

      recentExecutions.forEach(exec => {
        const hour = exec.startedAt.getHours();
        hourlyActivity[`${hour}:00`] = (hourlyActivity[`${hour}:00`] || 0) + 1;
      });

      return {
        agentExecutionsTrend,
        agentPerformance,
        modelUsage,
        hourlyActivity: Object.entries(hourlyActivity)
          .map(([hour, executions]) => ({ hour, executions }))
          .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
      };
    } catch (error: any) {
      logger.error('Get chart data error:', error);
      throw new Error('Failed to fetch chart data');
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(organizationId: string, limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent agent creations
      const recentAgents = await prisma.agent.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          creator: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      recentAgents.forEach(agent => {
        activities.push({
          type: 'agent_created',
          message: `${agent.creator.firstName} ${agent.creator.lastName} created agent "${agent.name}"`,
          timestamp: agent.createdAt,
          agentId: agent.id
        });
      });

      // Get recent executions
      const recentExecutions = await prisma.agentInteraction.findMany({
        where: { organizationId },
        select: {
          startedAt: true,
          agent: { select: { name: true } },
          status: true
        },
        orderBy: { startedAt: 'desc' },
        take: 5
      });

      recentExecutions.forEach(exec => {
        activities.push({
          type: 'agent_executed',
          message: `Agent "${exec.agent.name}" executed - ${exec.status}`,
          timestamp: exec.startedAt
        });
      });

      // Get recent user joins
      const recentUsers = await prisma.user.findMany({
        where: { organizationId },
        select: {
          firstName: true,
          lastName: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      recentUsers.forEach(user => {
        activities.push({
          type: 'user_joined',
          message: `${user.firstName} ${user.lastName} joined the organization`,
          timestamp: user.createdAt
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error: any) {
      logger.error('Get recent activity error:', error);
      throw new Error('Failed to fetch recent activity');
    }
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();
