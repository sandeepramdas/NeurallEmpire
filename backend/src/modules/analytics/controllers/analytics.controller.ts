import { Request, Response } from 'express';
import AnalyticsService from '../services/analytics.service';
import { captureException } from '@/config/sentry';

export class AnalyticsController {
  /**
   * Track event
   * POST /api/analytics/track
   */
  static async trackEvent(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.id;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const {
        eventName,
        eventType,
        sessionId,
        category,
        action,
        label,
        value,
        properties,
        pageUrl,
        pagePath,
        pageTitle,
        referrer,
        duration,
        source,
        medium,
        campaign,
      } = req.body;

      if (!eventName || !eventType) {
        return res.status(400).json({
          success: false,
          message: 'eventName and eventType are required',
        });
      }

      await AnalyticsService.trackEvent({
        eventName,
        eventType,
        organizationId,
        userId,
        sessionId,
        category,
        action,
        label,
        value,
        properties,
        pageUrl,
        pagePath,
        pageTitle,
        referrer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        duration,
        source,
        medium,
        campaign,
      });

      res.status(201).json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error: any) {
      console.error('Error tracking event:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to track event',
      });
    }
  }

  /**
   * Get events
   * GET /api/analytics/events
   */
  static async getEvents(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const {
        startDate,
        endDate,
        eventName,
        eventType,
        category,
        userId,
        sessionId,
      } = req.query;

      const filter = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        eventName: eventName as string,
        eventType: eventType as string,
        category: category as string,
        userId: userId as string,
        sessionId: sessionId as string,
      };

      const events = await AnalyticsService.getEvents(organizationId, filter);

      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error: any) {
      console.error('Error getting events:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get events',
      });
    }
  }

  /**
   * Get event counts
   * GET /api/analytics/event-counts
   */
  static async getEventCounts(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { startDate, endDate } = req.query;

      const filter = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const counts = await AnalyticsService.getEventCounts(organizationId, filter);

      res.json({
        success: true,
        data: counts,
      });
    } catch (error: any) {
      console.error('Error getting event counts:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get event counts',
      });
    }
  }

  /**
   * Get user activity
   * GET /api/analytics/user-activity/:userId
   */
  static async getUserActivity(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { userId } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { startDate, endDate } = req.query;

      const filter = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const activity = await AnalyticsService.getUserActivity(organizationId, userId, filter);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      console.error('Error getting user activity:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user activity',
      });
    }
  }

  /**
   * Get page views
   * GET /api/analytics/page-views
   */
  static async getPageViews(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { startDate, endDate } = req.query;

      const filter = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const pageViews = await AnalyticsService.getPageViews(organizationId, filter);

      res.json({
        success: true,
        data: pageViews,
      });
    } catch (error: any) {
      console.error('Error getting page views:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get page views',
      });
    }
  }

  /**
   * Get funnel data
   * POST /api/analytics/funnel
   */
  static async getFunnelData(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { funnelSteps, startDate, endDate } = req.body;

      if (!Array.isArray(funnelSteps) || funnelSteps.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'funnelSteps must be a non-empty array of event names',
        });
      }

      const filter = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const funnelData = await AnalyticsService.getFunnelData(organizationId, funnelSteps, filter);

      res.json({
        success: true,
        data: funnelData,
      });
    } catch (error: any) {
      console.error('Error getting funnel data:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get funnel data',
      });
    }
  }

  /**
   * Get dashboard summary
   * GET /api/analytics/dashboard
   */
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const days = parseInt(req.query.days as string) || 7;

      const summary = await AnalyticsService.getDashboardSummary(organizationId, days);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Error getting dashboard summary:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard summary',
      });
    }
  }
}

export default AnalyticsController;
