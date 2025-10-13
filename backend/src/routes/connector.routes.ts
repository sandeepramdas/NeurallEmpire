/**
 * ==================== CONNECTOR ROUTES ====================
 *
 * API endpoints for connector management
 *
 * Routes:
 * POST   /api/connectors              - Create connector
 * GET    /api/connectors              - List connectors
 * GET    /api/connectors/:id          - Get connector
 * PUT    /api/connectors/:id          - Update connector
 * DELETE /api/connectors/:id          - Delete connector
 * POST   /api/connectors/:id/test     - Test connection
 * GET    /api/connectors/:id/schema   - Get schema
 * POST   /api/connectors/:id/query    - Query data
 * POST   /api/connectors/:id/execute  - Execute action
 * GET    /api/connectors/:id/stats    - Get statistics
 *
 * @module routes/connector
 */

import { Router, Request, Response } from 'express';
import { connectorService } from '../services/connector.service';
import {
  CreateConnectorSchema,
  QueryParamsSchema,
  ActionSchema,
} from '../connectors/types';
import { asyncHandler } from '../infrastructure/errors';
import { z } from 'zod';

const router = Router();

// ==================== MIDDLEWARE ====================

/**
 * Ensure user is authenticated
 * This assumes you have auth middleware that sets req.user
 */
function requireAuth(req: any, res: Response, next: any) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'AUTH_REQUIRED' },
    });
  }
  next();
}

/**
 * Ensure organization context
 */
function requireOrganization(req: any, res: Response, next: any) {
  if (!req.user?.organizationId) {
    return res.status(403).json({
      success: false,
      error: { message: 'Organization context required', code: 'ORG_REQUIRED' },
    });
  }
  next();
}

// Apply middleware to all routes
router.use(requireAuth);
router.use(requireOrganization);

// ==================== ROUTES ====================

/**
 * POST /api/connectors
 * Create a new connector
 */
router.post(
  '/',
  asyncHandler(async (req: any, res: Response) => {
    // Validate input
    const input = CreateConnectorSchema.parse(req.body);

    // Create connector
    const connector = await connectorService.createConnector(
      req.user.organizationId,
      req.user.id,
      input
    );

    res.status(201).json({
      success: true,
      data: connector,
    });
  })
);

/**
 * GET /api/connectors
 * List all connectors for organization
 */
router.get(
  '/',
  asyncHandler(async (req: any, res: Response) => {
    const { type, status, enabled } = req.query;

    const filters: any = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (enabled !== undefined) filters.enabled = enabled === 'true';

    const connectors = await connectorService.listConnectors(
      req.user.organizationId,
      filters
    );

    res.json({
      success: true,
      data: connectors,
      metadata: {
        total: connectors.length,
      },
    });
  })
);

/**
 * GET /api/connectors/:id
 * Get connector by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: any, res: Response) => {
    const connector = await connectorService.getConnector(
      req.params.id,
      req.user.organizationId
    );

    res.json({
      success: true,
      data: connector,
    });
  })
);

/**
 * PUT /api/connectors/:id
 * Update connector
 */
router.put(
  '/:id',
  asyncHandler(async (req: any, res: Response) => {
    // Validate partial input
    const updates = req.body;

    const connector = await connectorService.updateConnector(
      req.params.id,
      req.user.organizationId,
      req.user.id,
      updates
    );

    res.json({
      success: true,
      data: connector,
    });
  })
);

/**
 * DELETE /api/connectors/:id
 * Delete connector
 */
router.delete(
  '/:id',
  asyncHandler(async (req: any, res: Response) => {
    await connectorService.deleteConnector(
      req.params.id,
      req.user.organizationId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Connector deleted successfully',
    });
  })
);

/**
 * POST /api/connectors/:id/test
 * Test connector connection
 */
router.post(
  '/:id/test',
  asyncHandler(async (req: any, res: Response) => {
    const result = await connectorService.testConnector(
      req.params.id,
      req.user.organizationId
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/connectors/:id/schema
 * Get connector schema
 */
router.get(
  '/:id/schema',
  asyncHandler(async (req: any, res: Response) => {
    const schema = await connectorService.getConnectorSchema(
      req.params.id,
      req.user.organizationId
    );

    res.json({
      success: true,
      data: schema,
    });
  })
);

/**
 * POST /api/connectors/:id/query
 * Query data from connector
 */
router.post(
  '/:id/query',
  asyncHandler(async (req: any, res: Response) => {
    // Validate query params
    const params = QueryParamsSchema.parse(req.body);

    const result = await connectorService.queryConnector(
      req.params.id,
      req.user.organizationId,
      params
    );

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
      performance: result.performance,
    });
  })
);

/**
 * POST /api/connectors/:id/execute
 * Execute action on connector
 */
router.post(
  '/:id/execute',
  asyncHandler(async (req: any, res: Response) => {
    // Validate action
    const action = ActionSchema.parse(req.body);

    const result = await connectorService.executeAction(
      req.params.id,
      req.user.organizationId,
      req.user.id,
      action
    );

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      metadata: result.metadata,
    });
  })
);

/**
 * GET /api/connectors/:id/stats
 * Get connector statistics
 */
router.get(
  '/:id/stats',
  asyncHandler(async (req: any, res: Response) => {
    const stats = await connectorService.getConnectorStats(
      req.params.id,
      req.user.organizationId
    );

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/connectors/:id/queries
 * Get query history for connector
 */
router.get(
  '/:id/queries',
  asyncHandler(async (req: any, res: Response) => {
    const { limit = '50', offset = '0' } = req.query;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const queries = await prisma.connectorQuery.findMany({
      where: {
        connectorId: req.params.id,
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.connectorQuery.count({
      where: {
        connectorId: req.params.id,
      },
    });

    res.json({
      success: true,
      data: queries,
      metadata: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  })
);

/**
 * GET /api/connectors/:id/audit-logs
 * Get audit logs for connector
 */
router.get(
  '/:id/audit-logs',
  asyncHandler(async (req: any, res: Response) => {
    const { limit = '50', offset = '0' } = req.query;

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const logs = await prisma.connectorAuditLog.findMany({
      where: {
        connectorId: req.params.id,
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.connectorAuditLog.count({
      where: {
        connectorId: req.params.id,
      },
    });

    res.json({
      success: true,
      data: logs,
      metadata: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  })
);

export default router;
