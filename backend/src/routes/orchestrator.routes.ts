/**
 * ==================== ORCHESTRATOR API ROUTES ====================
 *
 * API endpoints for the agent orchestrator system
 *
 * Sections:
 * - Tools
 * - Tool Permissions
 * - Workflows
 * - Multi-Agent Collaboration
 * - Scheduling
 * - Marketplace
 *
 * @module routes/orchestrator-routes
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { logger } from '../infrastructure/logger';

// Lazy-load services to avoid blocking server startup
// Services are only loaded when routes are actually hit
const getToolRegistry = () => require('../orchestrator/tool.system').toolRegistry;
const getToolPermissionsService = () => require('../orchestrator/tool-permissions.service').toolPermissionsService;
const getWorkflowEngine = () => require('../orchestrator/workflow.engine').workflowEngine;
const getMultiAgentCoordinator = () => require('../orchestrator/multi-agent.coordinator').multiAgentCoordinator;
const getSchedulingService = () => require('../orchestrator/scheduling.service').schedulingService;
const getMarketplaceService = () => require('../orchestrator/marketplace.service').marketplaceService;

// Import types (these don't cause instantiation)
import type { ToolExecutionContext } from '../orchestrator/tool.system';
import type { ToolPermissionAction } from '../orchestrator/tool-permissions.service';

const router = express.Router();

// ==================== MIDDLEWARE ====================

// Extract user info from auth token
const getUserInfo = (req: Request) => ({
  userId: (req as any).user?.userId || '',
  organizationId: (req as any).user?.organizationId || '',
});

// ==================== TOOLS ====================

/**
 * GET /api/orchestrator/tools
 * List available tools
 */
router.get('/tools', authenticate, async (req: Request, res: Response) => {
  try {
    const { category, tags, search } = req.query;

    const tools = getToolRegistry().listTools({
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      search: search as string,
    });

    res.json({
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        version: t.version,
        tags: t.metadata.tags,
        author: t.metadata.author,
      })),
      total: tools.length,
    });
  } catch (error) {
    logger.error('Failed to list tools', { error });
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

/**
 * GET /api/orchestrator/tools/:toolId
 * Get tool details
 */
router.get('/tools/:toolId', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId } = req.params;

    const tool = getToolRegistry().getTool(toolId);

    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    res.json({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      version: tool.version,
      config: tool.config,
      metadata: tool.metadata,
    });
  } catch (error) {
    logger.error('Failed to get tool', { error });
    res.status(500).json({ error: 'Failed to get tool' });
  }
});

/**
 * POST /api/orchestrator/tools/:toolId/execute
 * Execute a tool
 */
router.post('/tools/:toolId/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId } = req.params;
    const { input, agentId, sessionId, metadata } = req.body;
    const { userId, organizationId } = getUserInfo(req);

    // Check permissions
    const permissionCheck = await getToolPermissionsService().checkPermission(
      toolId,
      userId,
      organizationId,
      'execute'
    );

    if (!permissionCheck.allowed) {
      return res.status(403).json({
        error: 'Permission denied',
        reason: permissionCheck.reason,
      });
    }

    // Build execution context
    const context: ToolExecutionContext = {
      userId,
      organizationId,
      agentId: agentId || 'user-direct',
      sessionId,
      permissions: ['execute'],
      metadata,
    };

    // Execute tool
    const result = await getToolRegistry().execute(toolId, input, context);

    res.json(result);
  } catch (error) {
    logger.error('Failed to execute tool', { error });
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

/**
 * GET /api/orchestrator/tools/:toolId/stats
 * Get tool usage statistics
 */
router.get('/tools/:toolId/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId } = req.params;
    const { organizationId } = getUserInfo(req);

    const stats = await getToolRegistry().getToolStats(toolId, organizationId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get tool stats', { error });
    res.status(500).json({ error: 'Failed to get tool stats' });
  }
});

// ==================== TOOL PERMISSIONS ====================

/**
 * POST /api/orchestrator/permissions/grant
 * Grant tool permission
 */
router.post('/permissions/grant', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId, targetType, targetId, actions, conditions } = req.body;
    const { organizationId } = getUserInfo(req);

    const permission = await getToolPermissionsService().grantPermission(
      toolId,
      organizationId,
      targetType,
      targetId,
      actions,
      conditions
    );

    res.json(permission);
  } catch (error) {
    logger.error('Failed to grant permission', { error });
    res.status(500).json({ error: 'Failed to grant permission' });
  }
});

/**
 * DELETE /api/orchestrator/permissions/:permissionId
 * Revoke tool permission
 */
router.delete('/permissions/:permissionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { permissionId } = req.params;
    const { organizationId } = getUserInfo(req);

    await getToolPermissionsService().revokePermission(permissionId, organizationId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to revoke permission', { error });
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

/**
 * GET /api/orchestrator/permissions/check
 * Check tool permission
 */
router.get('/permissions/check', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId, action } = req.query;
    const { userId, organizationId } = getUserInfo(req);

    const result = await getToolPermissionsService().checkPermission(
      toolId as string,
      userId,
      organizationId,
      (action as ToolPermissionAction) || 'execute'
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to check permission', { error });
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

/**
 * GET /api/orchestrator/tools/:toolId/permissions
 * List tool permissions
 */
router.get('/tools/:toolId/permissions', authenticate, async (req: Request, res: Response) => {
  try {
    const { toolId } = req.params;
    const { organizationId } = getUserInfo(req);

    const permissions = await getToolPermissionsService().listToolPermissions(toolId, organizationId);

    res.json({ permissions });
  } catch (error) {
    logger.error('Failed to list tool permissions', { error });
    res.status(500).json({ error: 'Failed to list tool permissions' });
  }
});

// ==================== WORKFLOWS ====================

/**
 * POST /api/orchestrator/workflows
 * Create a workflow
 */
router.post('/workflows', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const workflowDef = { ...req.body, organizationId };

    const workflow = await getWorkflowEngine().createWorkflow(workflowDef);

    res.status(201).json(workflow);
  } catch (error) {
    logger.error('Failed to create workflow', { error });
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * GET /api/orchestrator/workflows
 * List workflows
 */
router.get('/workflows', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);

    const workflows = await getWorkflowEngine().listWorkflows(organizationId);

    res.json({ workflows });
  } catch (error) {
    logger.error('Failed to list workflows', { error });
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

/**
 * GET /api/orchestrator/workflows/:workflowId
 * Get workflow details
 */
router.get('/workflows/:workflowId', authenticate, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { organizationId } = getUserInfo(req);

    const workflow = await getWorkflowEngine().getWorkflow(workflowId, organizationId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    logger.error('Failed to get workflow', { error });
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

/**
 * POST /api/orchestrator/workflows/:workflowId/execute
 * Execute a workflow
 */
router.post('/workflows/:workflowId/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { variables, agentId } = req.body;
    const { userId, organizationId } = getUserInfo(req);

    const context: ToolExecutionContext = {
      userId,
      organizationId,
      agentId: agentId || 'user-direct',
      permissions: ['execute'],
    };

    const result = await getWorkflowEngine().executeWorkflow(workflowId, context, variables);

    res.json(result);
  } catch (error) {
    logger.error('Failed to execute workflow', { error });
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * GET /api/orchestrator/workflows/executions/:executionId
 * Get workflow execution state
 */
router.get('/workflows/executions/:executionId', authenticate, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    const state = await getWorkflowEngine().getExecutionState(executionId);

    if (!state) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json(state);
  } catch (error) {
    logger.error('Failed to get execution state', { error });
    res.status(500).json({ error: 'Failed to get execution state' });
  }
});

// ==================== MULTI-AGENT COLLABORATION ====================

/**
 * POST /api/orchestrator/collaborations
 * Create agent collaboration
 */
router.post('/collaborations', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const collaborationDef = { ...req.body, organizationId };

    const collaboration = await getMultiAgentCoordinator().createCollaboration(collaborationDef);

    res.status(201).json(collaboration);
  } catch (error) {
    logger.error('Failed to create collaboration', { error });
    res.status(500).json({ error: 'Failed to create collaboration' });
  }
});

/**
 * GET /api/orchestrator/collaborations/:collaborationId
 * Get collaboration details
 */
router.get('/collaborations/:collaborationId', authenticate, async (req: Request, res: Response) => {
  try {
    const { collaborationId } = req.params;
    const { organizationId } = getUserInfo(req);

    const collaboration = await getMultiAgentCoordinator().getCollaboration(collaborationId, organizationId);

    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration not found' });
    }

    res.json(collaboration);
  } catch (error) {
    logger.error('Failed to get collaboration', { error });
    res.status(500).json({ error: 'Failed to get collaboration' });
  }
});

/**
 * POST /api/orchestrator/collaborations/:collaborationId/execute
 * Execute collaboration
 */
router.post('/collaborations/:collaborationId/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { collaborationId } = req.params;
    const { userId, organizationId } = getUserInfo(req);

    const result = await getMultiAgentCoordinator().executeCollaboration(
      collaborationId,
      userId,
      organizationId
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to execute collaboration', { error });
    res.status(500).json({ error: 'Failed to execute collaboration' });
  }
});

/**
 * GET /api/orchestrator/collaborations/:collaborationId/state
 * Get collaboration state
 */
router.get('/collaborations/:collaborationId/state', authenticate, async (req: Request, res: Response) => {
  try {
    const { collaborationId } = req.params;

    const state = await getMultiAgentCoordinator().getCollaborationState(collaborationId);

    if (!state) {
      return res.status(404).json({ error: 'Collaboration state not found' });
    }

    res.json(state);
  } catch (error) {
    logger.error('Failed to get collaboration state', { error });
    res.status(500).json({ error: 'Failed to get collaboration state' });
  }
});

// ==================== SCHEDULING ====================

/**
 * POST /api/orchestrator/schedules
 * Create a schedule
 */
router.post('/schedules', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const scheduleDef = { ...req.body, organizationId };

    const schedule = await getSchedulingService().createSchedule(scheduleDef);

    res.status(201).json(schedule);
  } catch (error) {
    logger.error('Failed to create schedule', { error });
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

/**
 * GET /api/orchestrator/schedules
 * List schedules
 */
router.get('/schedules', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const { agentId, type, isActive } = req.query;

    const schedules = await getSchedulingService().listSchedules(organizationId, {
      agentId: agentId as string,
      type: type as any,
      isActive: isActive === 'true',
    });

    res.json({ schedules });
  } catch (error) {
    logger.error('Failed to list schedules', { error });
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

/**
 * GET /api/orchestrator/schedules/:scheduleId
 * Get schedule details
 */
router.get('/schedules/:scheduleId', authenticate, async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { organizationId } = getUserInfo(req);

    const schedule = await getSchedulingService().getSchedule(scheduleId, organizationId);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Failed to get schedule', { error });
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

/**
 * PATCH /api/orchestrator/schedules/:scheduleId
 * Update schedule
 */
router.patch('/schedules/:scheduleId', authenticate, async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await getSchedulingService().updateSchedule(scheduleId, req.body);

    res.json(schedule);
  } catch (error) {
    logger.error('Failed to update schedule', { error });
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/orchestrator/schedules/:scheduleId
 * Delete schedule
 */
router.delete('/schedules/:scheduleId', authenticate, async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { organizationId } = getUserInfo(req);

    await getSchedulingService().deleteSchedule(scheduleId, organizationId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete schedule', { error });
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

/**
 * GET /api/orchestrator/schedules/:scheduleId/stats
 * Get schedule statistics
 */
router.get('/schedules/:scheduleId/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;

    const stats = await getSchedulingService().getScheduleStats(scheduleId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get schedule stats', { error });
    res.status(500).json({ error: 'Failed to get schedule stats' });
  }
});

// ==================== MARKETPLACE ====================

/**
 * POST /api/orchestrator/marketplace/publish
 * Publish item to marketplace
 */
router.post('/marketplace/publish', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const item = { ...req.body, authorOrganizationId: organizationId };

    const published = await getMarketplaceService().publishItem(item);

    res.status(201).json(published);
  } catch (error) {
    logger.error('Failed to publish marketplace item', { error });
    res.status(500).json({ error: 'Failed to publish marketplace item' });
  }
});

/**
 * GET /api/orchestrator/marketplace
 * Browse marketplace
 */
router.get('/marketplace', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, category, tags, author, isOfficial, search, sort, limit, offset } = req.query;

    const result = await getMarketplaceService().browseItems({
      type: type as any,
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      author: author as string,
      isOfficial: isOfficial === 'true',
      search: search as string,
      sort: sort as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to browse marketplace', { error });
    res.status(500).json({ error: 'Failed to browse marketplace' });
  }
});

/**
 * GET /api/orchestrator/marketplace/:itemId
 * Get marketplace item
 */
router.get('/marketplace/:itemId', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    const item = await getMarketplaceService().getItem(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Marketplace item not found' });
    }

    res.json(item);
  } catch (error) {
    logger.error('Failed to get marketplace item', { error });
    res.status(500).json({ error: 'Failed to get marketplace item' });
  }
});

/**
 * POST /api/orchestrator/marketplace/:itemId/install
 * Install marketplace item
 */
router.post('/marketplace/:itemId/install', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { config } = req.body;
    const { userId, organizationId } = getUserInfo(req);

    const installation = await getMarketplaceService().installItem(
      itemId,
      organizationId,
      userId,
      config
    );

    res.status(201).json(installation);
  } catch (error) {
    logger.error('Failed to install marketplace item', { error });
    res.status(500).json({ error: 'Failed to install marketplace item' });
  }
});

/**
 * DELETE /api/orchestrator/marketplace/:itemId/uninstall
 * Uninstall marketplace item
 */
router.delete('/marketplace/:itemId/uninstall', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { organizationId } = getUserInfo(req);

    await getMarketplaceService().uninstallItem(itemId, organizationId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to uninstall marketplace item', { error });
    res.status(500).json({ error: 'Failed to uninstall marketplace item' });
  }
});

/**
 * GET /api/orchestrator/marketplace/installed
 * List installed items
 */
router.get('/marketplace/installed', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = getUserInfo(req);
    const { type, status } = req.query;

    const installed = await getMarketplaceService().listInstalled(organizationId, {
      type: type as any,
      status: status as any,
    });

    res.json({ installed });
  } catch (error) {
    logger.error('Failed to list installed items', { error });
    res.status(500).json({ error: 'Failed to list installed items' });
  }
});

/**
 * POST /api/orchestrator/marketplace/:itemId/review
 * Add review
 */
router.post('/marketplace/:itemId/review', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { rating, title, comment } = req.body;
    const { userId, organizationId } = getUserInfo(req);

    const review = await getMarketplaceService().addReview(
      itemId,
      userId,
      organizationId,
      rating,
      title,
      comment
    );

    res.status(201).json(review);
  } catch (error) {
    logger.error('Failed to add review', { error });
    res.status(500).json({ error: 'Failed to add review' });
  }
});

/**
 * GET /api/orchestrator/marketplace/:itemId/stats
 * Get marketplace item stats
 */
router.get('/marketplace/:itemId/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    const stats = await getMarketplaceService().getStats(itemId);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get marketplace stats', { error });
    res.status(500).json({ error: 'Failed to get marketplace stats' });
  }
});

// ==================== EXPORT ====================

export default router;
