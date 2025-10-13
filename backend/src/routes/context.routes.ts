/**
 * ==================== CONTEXT ENGINE ROUTES ====================
 *
 * API routes for context engine operations
 *
 * Endpoints:
 * - Session management
 * - User preferences
 * - Interaction tracking
 * - Context building
 *
 * @module routes/context
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { contextOrchestrator } from '../context-engine/context.orchestrator';
import { sessionMemoryService } from '../context-engine/session-memory.service';
import { userPreferencesService } from '../context-engine/user-preferences.service';
import { logger } from '../infrastructure/logger';
import { AppError, ValidationError, NotFoundError } from '../infrastructure/errors';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const CreateSessionSchema = z.object({
  agentId: z.string().min(1),
  initialContext: z.record(z.any()).optional(),
});

const AddMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1),
  metadata: z
    .object({
      model: z.string().optional(),
      tokens: z.number().optional(),
      cost: z.number().optional(),
      toolCalls: z.array(z.any()).optional(),
      components: z.array(z.any()).optional(),
    })
    .optional(),
});

const UpdateContextSchema = z.object({
  updates: z.record(z.any()),
});

const BuildContextSchema = z.object({
  agentId: z.string().min(1),
  options: z
    .object({
      includeHistory: z.boolean().optional(),
      historyLimit: z.number().optional(),
      includeConnectors: z.boolean().optional(),
      includeKnowledge: z.boolean().optional(),
      knowledgeQuery: z.string().optional(),
      includeInsights: z.boolean().optional(),
    })
    .optional(),
});

const UpdatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  uiMode: z.enum(['compact', 'comfortable', 'spacious']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  defaultView: z.string().optional(),
  favoriteViews: z.array(z.string()).optional(),
  pinnedAgents: z.array(z.string()).optional(),
  pinnedConnectors: z.array(z.string()).optional(),
  shortcuts: z.record(z.string()).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      desktop: z.boolean().optional(),
      channels: z.array(z.string()).optional(),
    })
    .optional(),
  canvasSettings: z
    .object({
      autoSave: z.boolean().optional(),
      gridSnap: z.boolean().optional(),
      defaultLayout: z.string().optional(),
    })
    .optional(),
  agentDefaults: z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
});

const TrackInteractionSchema = z.object({
  type: z.enum(['view', 'action', 'agent_execution', 'canvas_interaction', 'connector_usage']),
  resource: z.string(),
  resourceId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const TogglePinSchema = z.object({
  resourceType: z.enum(['agent', 'connector']),
  resourceId: z.string().min(1),
});

const SetShortcutSchema = z.object({
  key: z.string().min(1),
  action: z.string().min(1),
});

// ==================== MIDDLEWARE ====================

/**
 * Extract user from request (assumes auth middleware has set req.user)
 */
function getUserFromRequest(req: Request): { userId: string; organizationId: string } {
  const user = (req as any).user;

  if (!user || !user.userId || !user.organizationId) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  return {
    userId: user.userId,
    organizationId: user.organizationId,
  };
}

// ==================== SESSION ROUTES ====================

/**
 * POST /api/context/sessions
 * Create a new session
 */
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const input = CreateSessionSchema.parse(req.body);

    const sessionId = await contextOrchestrator.createSession(
      userId,
      organizationId,
      input.agentId,
      input.initialContext
    );

    res.status(201).json({
      success: true,
      data: { sessionId },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/context/sessions/:sessionId
 * Get session data
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const { sessionId } = req.params;

    const session = await sessionMemoryService.getSession(sessionId);

    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }

    // Verify ownership
    if (session.userId !== userId || session.organizationId !== organizationId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/context/sessions/:sessionId
 * End session
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);
    const { sessionId } = req.params;

    const session = await sessionMemoryService.getSession(sessionId);

    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }

    // Verify ownership
    if (session.userId !== userId || session.organizationId !== organizationId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    await contextOrchestrator.endSession(sessionId);

    res.json({
      success: true,
      message: 'Session ended',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/context/sessions/:sessionId/messages
 * Add message to session
 */
router.post(
  '/sessions/:sessionId/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, organizationId } = getUserFromRequest(req);
      const { sessionId } = req.params;

      const input = AddMessageSchema.parse(req.body);

      const session = await sessionMemoryService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      // Verify ownership
      if (session.userId !== userId || session.organizationId !== organizationId) {
        throw new AppError('Forbidden', 403, 'FORBIDDEN');
      }

      await contextOrchestrator.addMessage(
        sessionId,
        input.role,
        input.content,
        input.metadata
      );

      res.status(201).json({
        success: true,
        message: 'Message added',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Invalid input', error.errors));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /api/context/sessions/:sessionId/history
 * Get message history
 */
router.get(
  '/sessions/:sessionId/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, organizationId } = getUserFromRequest(req);
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const session = await sessionMemoryService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      // Verify ownership
      if (session.userId !== userId || session.organizationId !== organizationId) {
        throw new AppError('Forbidden', 403, 'FORBIDDEN');
      }

      const history = await sessionMemoryService.getHistory(sessionId, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/context/sessions/:sessionId/context
 * Update session context
 */
router.patch(
  '/sessions/:sessionId/context',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, organizationId } = getUserFromRequest(req);
      const { sessionId } = req.params;

      const input = UpdateContextSchema.parse(req.body);

      const session = await sessionMemoryService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      // Verify ownership
      if (session.userId !== userId || session.organizationId !== organizationId) {
        throw new AppError('Forbidden', 403, 'FORBIDDEN');
      }

      await contextOrchestrator.updateContext({
        sessionId,
        userId,
        organizationId,
        updates: input.updates,
      });

      res.json({
        success: true,
        message: 'Context updated',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Invalid input', error.errors));
      } else {
        next(error);
      }
    }
  }
);

/**
 * GET /api/context/sessions/:sessionId/stats
 * Get session statistics
 */
router.get(
  '/sessions/:sessionId/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, organizationId } = getUserFromRequest(req);
      const { sessionId } = req.params;

      const session = await sessionMemoryService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      // Verify ownership
      if (session.userId !== userId || session.organizationId !== organizationId) {
        throw new AppError('Forbidden', 403, 'FORBIDDEN');
      }

      const stats = await contextOrchestrator.getContextStats(sessionId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/context/sessions/:sessionId/refresh
 * Refresh session TTL
 */
router.post(
  '/sessions/:sessionId/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, organizationId } = getUserFromRequest(req);
      const { sessionId } = req.params;

      const session = await sessionMemoryService.getSession(sessionId);

      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      // Verify ownership
      if (session.userId !== userId || session.organizationId !== organizationId) {
        throw new AppError('Forbidden', 403, 'FORBIDDEN');
      }

      await contextOrchestrator.refreshSession(sessionId);

      res.json({
        success: true,
        message: 'Session refreshed',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CONTEXT BUILDING ROUTES ====================

/**
 * POST /api/context/build
 * Build agent context
 */
router.post('/build', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const input = BuildContextSchema.parse(req.body);
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('sessionId query parameter is required');
    }

    const context = await contextOrchestrator.buildContext(
      sessionId,
      userId,
      organizationId,
      input.agentId,
      input.options
    );

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// ==================== USER PREFERENCES ROUTES ====================

/**
 * GET /api/context/preferences
 * Get user preferences
 */
router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const preferences = await userPreferencesService.getUserPreferences(userId, organizationId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/context/preferences
 * Update user preferences
 */
router.patch('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const updates = UpdatePreferencesSchema.parse(req.body);

    const preferences = await userPreferencesService.updatePreferences(
      userId,
      organizationId,
      updates
    );

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/context/preferences/pin
 * Toggle pin for resource
 */
router.post('/preferences/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const input = TogglePinSchema.parse(req.body);

    await userPreferencesService.togglePin(
      userId,
      organizationId,
      input.resourceType,
      input.resourceId
    );

    res.json({
      success: true,
      message: 'Pin toggled',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * POST /api/context/preferences/shortcuts
 * Set keyboard shortcut
 */
router.post('/preferences/shortcuts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const input = SetShortcutSchema.parse(req.body);

    await userPreferencesService.setShortcut(userId, organizationId, input.key, input.action);

    res.json({
      success: true,
      message: 'Shortcut set',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

/**
 * GET /api/context/preferences/insights
 * Get adaptive insights
 */
router.get('/preferences/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const insights = await userPreferencesService.getAdaptiveInsights(userId, organizationId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== INTERACTION TRACKING ROUTES ====================

/**
 * POST /api/context/interactions
 * Track user interaction
 */
router.post('/interactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    const input = TrackInteractionSchema.parse(req.body);

    await userPreferencesService.trackInteraction({
      userId,
      organizationId,
      type: input.type,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata: input.metadata,
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Interaction tracked',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid input', error.errors));
    } else {
      next(error);
    }
  }
});

// ==================== UTILITY ROUTES ====================

/**
 * DELETE /api/context/cache
 * Clear user's cache
 */
router.delete('/cache', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = getUserFromRequest(req);

    await userPreferencesService.clearCache(userId, organizationId);

    res.json({
      success: true,
      message: 'Cache cleared',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ERROR HANDLER ====================

router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Context API error', {
    error: error.message,
    path: req.path,
    method: req.method,
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export default router;
