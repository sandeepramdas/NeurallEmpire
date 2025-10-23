/**
 * ==================== USAGE ANALYTICS ROUTES ====================
 *
 * API endpoints for usage analytics and dashboards
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { usageAnalyticsController } from '../controllers/usage-analytics.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/usage-analytics/dashboard
 * Get organization-wide usage dashboard
 */
router.get('/dashboard', (req, res) => usageAnalyticsController.getDashboard(req, res));

/**
 * GET /api/usage-analytics/models/:modelId
 * Get detailed usage for a specific model
 */
router.get('/models/:modelId', (req, res) => usageAnalyticsController.getModelUsage(req, res));

/**
 * GET /api/usage-analytics/costs
 * Get cost analytics
 */
router.get('/costs', (req, res) => usageAnalyticsController.getCostAnalytics(req, res));

export default router;
