/**
 * Menu Routes
 * API endpoints for dynamic menu management
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireRole } from '@/middleware/rbac';
import { requireCompanyContext } from '@/middleware/company-context';
import { menuService } from '@/services/menu.service';

const router = Router();

/**
 * GET /api/menus
 * Get user's menus (filtered by permissions)
 */
router.get(
  '/',
  authenticate,
  requireCompanyContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const menus = await menuService.getUserMenus(req.user!.id, req.companyId!);

      res.json({
        success: true,
        data: menus,
      });
    } catch (error: any) {
      console.error('Error fetching menus:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch menus',
      });
    }
  }
);

/**
 * GET /api/menus/all
 * Get all menus (admin only)
 */
router.get(
  '/all',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const menus = await menuService.getAllMenus();

      res.json({
        success: true,
        data: menus,
      });
    } catch (error: any) {
      console.error('Error fetching all menus:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch menus',
      });
    }
  }
);

/**
 * GET /api/menus/:menuId
 * Get menu by ID
 */
router.get(
  '/:menuId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { menuId } = req.params;

      const menu = await menuService.getMenuById(menuId);

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: 'Menu not found',
        });
      }

      res.json({
        success: true,
        data: menu,
      });
    } catch (error: any) {
      console.error('Error fetching menu:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch menu',
      });
    }
  }
);

/**
 * POST /api/menus
 * Create a new menu item (admin only)
 */
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        label,
        icon,
        route,
        component,
        parentId,
        module,
        permissionsRequired,
        rolesRequired,
        orderIndex,
        showInSidebar,
        isSeparator,
        badge,
        badgeColor,
      } = req.body;

      if (!name || !label) {
        return res.status(400).json({
          success: false,
          error: 'name and label are required',
        });
      }

      const menu = await menuService.createMenu(
        {
          name,
          label,
          icon,
          route,
          component,
          parentId,
          module,
          permissionsRequired,
          rolesRequired,
          orderIndex,
          showInSidebar,
          isSeparator,
          badge,
          badgeColor,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: menu,
        message: 'Menu created successfully',
      });
    } catch (error: any) {
      console.error('Error creating menu:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create menu',
      });
    }
  }
);

/**
 * PUT /api/menus/:menuId
 * Update a menu item
 */
router.put(
  '/:menuId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { menuId } = req.params;
      const updates = req.body;

      const menu = await menuService.updateMenu(menuId, updates, req.user!.id);

      res.json({
        success: true,
        data: menu,
        message: 'Menu updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating menu:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update menu',
      });
    }
  }
);

/**
 * DELETE /api/menus/:menuId
 * Delete a menu item
 */
router.delete(
  '/:menuId',
  authenticate,
  requireRole(['OWNER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { menuId } = req.params;

      await menuService.deleteMenu(menuId, req.user!.id);

      res.json({
        success: true,
        message: 'Menu deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting menu:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete menu',
      });
    }
  }
);

/**
 * POST /api/menus/reorder
 * Reorder menu items
 */
router.post(
  '/reorder',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          error: 'updates must be an array',
        });
      }

      await menuService.reorderMenus(updates, req.user!.id);

      res.json({
        success: true,
        message: 'Menus reordered successfully',
      });
    } catch (error: any) {
      console.error('Error reordering menus:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reorder menus',
      });
    }
  }
);

/**
 * GET /api/menus/search
 * Search menus
 */
router.get(
  '/search',
  authenticate,
  requireCompanyContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      const menus = await menuService.searchMenus(q, req.user!.id, req.companyId!);

      res.json({
        success: true,
        data: menus,
      });
    } catch (error: any) {
      console.error('Error searching menus:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search menus',
      });
    }
  }
);

/**
 * GET /api/menus/breadcrumbs
 * Get breadcrumbs for a route
 */
router.get(
  '/breadcrumbs',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { route } = req.query;

      if (!route || typeof route !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Route query parameter is required',
        });
      }

      const breadcrumbs = await menuService.getMenuBreadcrumbs(route);

      res.json({
        success: true,
        data: breadcrumbs,
      });
    } catch (error: any) {
      console.error('Error fetching breadcrumbs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch breadcrumbs',
      });
    }
  }
);

/**
 * GET /api/menus/module/:module
 * Get menus by module
 */
router.get(
  '/module/:module',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { module } = req.params;

      const menus = await menuService.getMenusByModule(module);

      res.json({
        success: true,
        data: menus,
      });
    } catch (error: any) {
      console.error('Error fetching menus by module:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch menus',
      });
    }
  }
);

/**
 * POST /api/menus/:menuId/toggle
 * Toggle menu visibility
 */
router.post(
  '/:menuId/toggle',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { menuId } = req.params;

      const menu = await menuService.toggleMenuVisibility(menuId, req.user!.id);

      res.json({
        success: true,
        data: menu,
        message: 'Menu visibility toggled successfully',
      });
    } catch (error: any) {
      console.error('Error toggling menu visibility:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to toggle menu visibility',
      });
    }
  }
);

export default router;
