import { Router } from 'express';
import { prisma } from '@/server';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { logger } from '@/infrastructure/logger';

const router = Router();

/**
 * @route   POST /api/admin/activity-logs
 * @desc    Store frontend activity logs
 * @access  Public (with optional auth)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'logs must be a non-empty array',
      });
    }

    // Store logs in audit log table
    const auditLogs = logs.map((log: any) => ({
      action: `FRONTEND_${log.type}`,
      resourceType: 'ACTIVITY_LOG',
      resourceId: log.id,
      userId: req.user?.id || log.userId || null,
      organizationId: req.user?.organizationId || log.organizationId || null,
      metadata: {
        action: log.action,
        details: log.details,
        url: log.url,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        timestamp: log.timestamp,
      },
    }));

    // Batch insert
    await prisma.auditLog.createMany({
      data: auditLogs,
    });

    res.json({
      success: true,
      count: logs.length,
    });
  } catch (error: any) {
    logger.error('Error storing activity logs:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to store activity logs',
    });
  }
});

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get activity logs (admin only)
 * @access  Private (admin)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      userId,
      action,
      sessionId,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (userId) where.userId = userId as string;
    if (action) where.action = { contains: action as string };
    if (sessionId) where.metadata = { path: ['sessionId'], equals: sessionId };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      logs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    logger.error('Error fetching activity logs:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
    });
  }
});

/**
 * @route   GET /api/admin/activity-logs/sessions
 * @desc    Get all session IDs with activity
 * @access  Private (admin)
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await prisma.auditLog.findMany({
      where: {
        metadata: {
          path: ['sessionId'],
          not: null,
        },
      },
      select: {
        metadata: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by session ID
    const sessionMap = new Map<string, any>();

    sessions.forEach((log) => {
      const sessionId = (log.metadata as any)?.sessionId;
      if (!sessionId) return;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          firstSeen: log.createdAt,
          lastSeen: log.createdAt,
          userId: log.userId,
          activityCount: 0,
        });
      }

      const session = sessionMap.get(sessionId)!;
      session.activityCount++;
      if (log.createdAt > session.lastSeen) {
        session.lastSeen = log.createdAt;
      }
      if (log.createdAt < session.firstSeen) {
        session.firstSeen = log.createdAt;
      }
    });

    res.json({
      success: true,
      sessions: Array.from(sessionMap.values()),
    });
  } catch (error: any) {
    logger.error('Error fetching sessions:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
    });
  }
});

export default router;
