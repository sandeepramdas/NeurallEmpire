import { Router } from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard summary
router.get('/dashboard', AnalyticsController.getDashboardSummary);

// Event tracking
router.post('/track', AnalyticsController.trackEvent);

// Event retrieval
router.get('/events', AnalyticsController.getEvents);
router.get('/event-counts', AnalyticsController.getEventCounts);

// User activity
router.get('/user-activity/:userId', AnalyticsController.getUserActivity);

// Page views
router.get('/page-views', AnalyticsController.getPageViews);

// Funnel analysis
router.post('/funnel', AnalyticsController.getFunnelData);

export default router;
