import { Request, Response } from 'express';
import { dashboardAnalyticsService } from '@/services/dashboard-analytics.service';
import { logger } from '@/infrastructure/logger';

/**
 * Dashboard Analytics Controller
 * Provides analytics data for the main dashboard
 */

export class DashboardAnalyticsController {
  /**
   * Get comprehensive dashboard statistics
   * GET /api/dashboard/stats
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const stats = await dashboardAnalyticsService.getDashboardStats(organizationId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Get dashboard stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard statistics',
        message: error.message
      });
    }
  }

  /**
   * Get chart data for visualizations
   * GET /api/dashboard/charts?days=7
   */
  async getChartData(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const days = parseInt(req.query.days as string) || 7;

      const chartData = await dashboardAnalyticsService.getChartData(organizationId, days);

      res.json({
        success: true,
        data: chartData
      });
    } catch (error: any) {
      logger.error('Get chart data error:', error);
      res.status(500).json({
        error: 'Failed to fetch chart data',
        message: error.message
      });
    }
  }

  /**
   * Get recent activity feed
   * GET /api/dashboard/activity?limit=10
   */
  async getRecentActivity(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const limit = parseInt(req.query.limit as string) || 10;

      const activity = await dashboardAnalyticsService.getRecentActivity(organizationId, limit);

      res.json({
        success: true,
        data: activity
      });
    } catch (error: any) {
      logger.error('Get recent activity error:', error);
      res.status(500).json({
        error: 'Failed to fetch recent activity',
        message: error.message
      });
    }
  }
}

export const dashboardAnalyticsController = new DashboardAnalyticsController();
