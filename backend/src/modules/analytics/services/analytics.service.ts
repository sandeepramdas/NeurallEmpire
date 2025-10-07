import { prisma } from '@/server';
import { captureException } from '@/config/sentry';

export interface TrackEventOptions {
  eventName: string;
  eventType: string;
  organizationId: string;
  userId?: string;
  sessionId?: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  pageUrl?: string;
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  duration?: number;
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  eventName?: string;
  eventType?: string;
  category?: string;
  userId?: string;
  sessionId?: string;
}

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  static async trackEvent(options: TrackEventOptions): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventName: options.eventName,
          eventType: options.eventType,
          organizationId: options.organizationId,
          userId: options.userId,
          sessionId: options.sessionId,
          category: options.category,
          action: options.action,
          label: options.label,
          value: options.value,
          properties: options.properties,
          pageUrl: options.pageUrl,
          pagePath: options.pagePath,
          pageTitle: options.pageTitle,
          referrer: options.referrer,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
          duration: options.duration,
          source: options.source,
          medium: options.medium,
          campaign: options.campaign,
        },
      });

      console.log(`📊 Event tracked: ${options.eventName}`);
    } catch (error: any) {
      console.error('❌ Error tracking event:', error);
      captureException(error, { eventOptions: options });
      // Don't throw - analytics should never break the app
    }
  }

  /**
   * Get events for an organization
   */
  static async getEvents(organizationId: string, filter?: AnalyticsFilter) {
    try {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          organizationId,
          ...(filter?.startDate && {
            timestamp: {
              gte: filter.startDate,
              ...(filter?.endDate && { lte: filter.endDate }),
            },
          }),
          ...(filter?.eventName && { eventName: filter.eventName }),
          ...(filter?.eventType && { eventType: filter.eventType }),
          ...(filter?.category && { category: filter.category }),
          ...(filter?.userId && { userId: filter.userId }),
          ...(filter?.sessionId && { sessionId: filter.sessionId }),
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 1000, // Limit to prevent huge queries
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return events;
    } catch (error: any) {
      console.error('❌ Error getting events:', error);
      captureException(error, { organizationId, filter });
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * Get event counts grouped by event name
   */
  static async getEventCounts(organizationId: string, filter?: AnalyticsFilter) {
    try {
      const events = await prisma.analyticsEvent.groupBy({
        by: ['eventName', 'eventType'],
        where: {
          organizationId,
          ...(filter?.startDate && {
            timestamp: {
              gte: filter.startDate,
              ...(filter?.endDate && { lte: filter.endDate }),
            },
          }),
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      return events.map(e => ({
        eventName: e.eventName,
        eventType: e.eventType,
        count: e._count.id,
      }));
    } catch (error: any) {
      console.error('❌ Error getting event counts:', error);
      captureException(error, { organizationId, filter });
      throw new Error(`Failed to get event counts: ${error.message}`);
    }
  }

  /**
   * Get user activity metrics
   */
  static async getUserActivity(organizationId: string, userId: string, filter?: AnalyticsFilter) {
    try {
      const events = await prisma.analyticsEvent.findMany({
        where: {
          organizationId,
          userId,
          ...(filter?.startDate && {
            timestamp: {
              gte: filter.startDate,
              ...(filter?.endDate && { lte: filter.endDate }),
            },
          }),
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 100,
      });

      const totalEvents = events.length;
      const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size;
      const categories = events.reduce((acc, e) => {
        if (e.category) {
          acc[e.category] = (acc[e.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEvents,
        uniqueSessions,
        eventsByCategory: categories,
        recentEvents: events.slice(0, 10),
      };
    } catch (error: any) {
      console.error('❌ Error getting user activity:', error);
      captureException(error, { organizationId, userId, filter });
      throw new Error(`Failed to get user activity: ${error.message}`);
    }
  }

  /**
   * Get page view analytics
   */
  static async getPageViews(organizationId: string, filter?: AnalyticsFilter) {
    try {
      const pageViews = await prisma.analyticsEvent.groupBy({
        by: ['pagePath'],
        where: {
          organizationId,
          eventType: 'page_view',
          pagePath: { not: null },
          ...(filter?.startDate && {
            timestamp: {
              gte: filter.startDate,
              ...(filter?.endDate && { lte: filter.endDate }),
            },
          }),
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 50,
      });

      return pageViews.map(pv => ({
        path: pv.pagePath,
        views: pv._count.id,
      }));
    } catch (error: any) {
      console.error('❌ Error getting page views:', error);
      captureException(error, { organizationId, filter });
      throw new Error(`Failed to get page views: ${error.message}`);
    }
  }

  /**
   * Get conversion funnel data
   */
  static async getFunnelData(
    organizationId: string,
    funnelSteps: string[],
    filter?: AnalyticsFilter
  ) {
    try {
      const results = await Promise.all(
        funnelSteps.map(async (eventName) => {
          const count = await prisma.analyticsEvent.count({
            where: {
              organizationId,
              eventName,
              ...(filter?.startDate && {
                timestamp: {
                  gte: filter.startDate,
                  ...(filter?.endDate && { lte: filter.endDate }),
                },
              }),
            },
          });

          return {
            step: eventName,
            count,
          };
        })
      );

      // Calculate conversion rates
      const firstStepCount = results[0]?.count || 1;
      return results.map((step, index) => ({
        ...step,
        conversionRate: index === 0 ? 100 : (step.count / firstStepCount) * 100,
        dropoffRate: index === 0 ? 0 : ((results[index - 1].count - step.count) / results[index - 1].count) * 100,
      }));
    } catch (error: any) {
      console.error('❌ Error getting funnel data:', error);
      captureException(error, { organizationId, funnelSteps, filter });
      throw new Error(`Failed to get funnel data: ${error.message}`);
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  static async getDashboardSummary(organizationId: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalEvents, uniqueUsers, uniqueSessions, topEvents, pageViews] = await Promise.all([
        // Total events
        prisma.analyticsEvent.count({
          where: {
            organizationId,
            timestamp: { gte: startDate },
          },
        }),

        // Unique users
        prisma.analyticsEvent.findMany({
          where: {
            organizationId,
            timestamp: { gte: startDate },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),

        // Unique sessions
        prisma.analyticsEvent.findMany({
          where: {
            organizationId,
            timestamp: { gte: startDate },
            sessionId: { not: null },
          },
          select: { sessionId: true },
          distinct: ['sessionId'],
        }),

        // Top events
        this.getEventCounts(organizationId, { startDate }),

        // Page views
        this.getPageViews(organizationId, { startDate }),
      ]);

      return {
        totalEvents,
        uniqueUsers: uniqueUsers.length,
        uniqueSessions: uniqueSessions.length,
        topEvents: topEvents.slice(0, 10),
        topPages: pageViews.slice(0, 10),
        period: `Last ${days} days`,
      };
    } catch (error: any) {
      console.error('❌ Error getting dashboard summary:', error);
      captureException(error, { organizationId, days });
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
  }

  /**
   * Track page view
   */
  static async trackPageView(
    organizationId: string,
    userId: string | undefined,
    sessionId: string,
    pageUrl: string,
    pagePath: string,
    pageTitle?: string,
    referrer?: string,
    userAgent?: string
  ): Promise<void> {
    await this.trackEvent({
      eventName: 'page_view',
      eventType: 'page_view',
      organizationId,
      userId,
      sessionId,
      category: 'navigation',
      pageUrl,
      pagePath,
      pageTitle,
      referrer,
      userAgent,
    });
  }

  /**
   * Track user action
   */
  static async trackAction(
    eventName: string,
    organizationId: string,
    userId: string | undefined,
    sessionId: string,
    category: string,
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      eventName,
      eventType: 'user_action',
      organizationId,
      userId,
      sessionId,
      category,
      action,
      label,
      value,
      properties,
    });
  }
}

export default AnalyticsService;
