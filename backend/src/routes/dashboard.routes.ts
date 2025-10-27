import { Router } from 'express';
import { dashboardAnalyticsController } from '@/controllers/dashboard-analytics.controller';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

/**
 * Dashboard Analytics Routes
 * All routes require authentication
 * Base path: /api/dashboard
 */

// Get comprehensive dashboard statistics
router.get(
  '/stats',
  authenticate,
  (req, res) => dashboardAnalyticsController.getDashboardStats(req, res)
);

// Get chart data for visualizations
router.get(
  '/charts',
  authenticate,
  (req, res) => dashboardAnalyticsController.getChartData(req, res)
);

// Get recent activity feed
router.get(
  '/activity',
  authenticate,
  (req, res) => dashboardAnalyticsController.getRecentActivity(req, res)
);

export default router;
