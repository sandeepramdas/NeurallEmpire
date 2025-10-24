/**
 * Roles Routes
 * API endpoints for role and permission management
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireRole } from '@/middleware/rbac';
import { requireCompanyContext } from '@/middleware/company-context';
import { rbacService } from '@/services/rbac.service';
import { logger } from '@/infrastructure/logger';

const router = Router();

/**
 * GET /api/roles
 * Get all roles for organization
 */
router.get(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roles = await rbacService.getOrganizationRoles(req.user!.organizationId);

      res.json({
        success: true,
        data: roles,
      });
    } catch (error: any) {
      logger.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch roles',
      });
    }
  }
);

/**
 * GET /api/roles/:roleId
 * Get role by ID
 */
router.get(
  '/:roleId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roleId } = req.params;

      const role = await rbacService.getRoleById(roleId);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Role not found',
        });
      }

      // Verify role belongs to user's organization
      if (role.organizationId !== req.user!.organizationId && !req.user!.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: role,
      });
    } catch (error: any) {
      logger.error('Error fetching role:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch role',
      });
    }
  }
);

/**
 * POST /api/roles
 * Create a custom role
 */
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, code, description, permissions, priority } = req.body;

      if (!name || !code || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'name, code, and permissions are required',
        });
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'permissions must be a non-empty array',
        });
      }

      const role = await rbacService.createRole(
        req.user!.organizationId,
        {
          name,
          code,
          description,
          permissions,
          priority,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating role:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create role',
      });
    }
  }
);

/**
 * PUT /api/roles/:roleId
 * Update a role
 */
router.put(
  '/:roleId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roleId } = req.params;
      const updates = req.body;

      const role = await rbacService.updateRole(roleId, updates, req.user!.id);

      res.json({
        success: true,
        data: role,
        message: 'Role updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating role:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update role',
      });
    }
  }
);

/**
 * DELETE /api/roles/:roleId
 * Delete a role
 */
router.delete(
  '/:roleId',
  authenticate,
  requireRole(['OWNER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roleId } = req.params;

      await rbacService.deleteRole(roleId, req.user!.id);

      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting role:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete role',
      });
    }
  }
);

/**
 * GET /api/roles/permissions/all
 * Get all available permissions
 */
router.get(
  '/permissions/all',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const permissions = await rbacService.getAllPermissions();

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error: any) {
      logger.error('Error fetching permissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch permissions',
      });
    }
  }
);

/**
 * GET /api/roles/permissions/by-module
 * Get permissions grouped by module
 */
router.get(
  '/permissions/by-module',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const permissions = await rbacService.getPermissionsByModule();

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error: any) {
      logger.error('Error fetching permissions by module:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch permissions',
      });
    }
  }
);

/**
 * POST /api/roles/assign
 * Assign role to user for a company
 */
router.post(
  '/assign',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, roleId } = req.body;

      if (!userId || !roleId || !req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'userId, roleId, and companyId are required',
        });
      }

      await rbacService.assignRole(
        userId,
        req.companyId,
        roleId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Role assigned successfully',
      });
    } catch (error: any) {
      logger.error('Error assigning role:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to assign role',
      });
    }
  }
);

/**
 * DELETE /api/roles/assign
 * Remove role from user for a company
 */
router.delete(
  '/assign',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId || !req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'userId and companyId are required',
        });
      }

      await rbacService.removeRole(userId, req.companyId, req.user!.id);

      res.json({
        success: true,
        message: 'Role removed successfully',
      });
    } catch (error: any) {
      logger.error('Error removing role:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to remove role',
      });
    }
  }
);

/**
 * GET /api/roles/user/:userId
 * Get user's roles for current company
 */
router.get(
  '/user/:userId',
  authenticate,
  requireCompanyContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Allow users to see their own roles, or admins to see any user's roles
      if (userId !== req.user!.id) {
        const hasAdminRole = await rbacService.hasRole(
          req.user!.id,
          req.companyId!,
          ['OWNER', 'ADMIN']
        );

        if (!hasAdminRole && !req.user!.isSuperAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
      }

      const roles = await rbacService.getUserRoles(userId, req.companyId!);

      res.json({
        success: true,
        data: roles,
      });
    } catch (error: any) {
      logger.error('Error fetching user roles:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user roles',
      });
    }
  }
);

/**
 * GET /api/roles/user/:userId/permissions
 * Get user's permissions for current company
 */
router.get(
  '/user/:userId/permissions',
  authenticate,
  requireCompanyContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Allow users to see their own permissions, or admins to see any user's permissions
      if (userId !== req.user!.id) {
        const hasAdminRole = await rbacService.hasRole(
          req.user!.id,
          req.companyId!,
          ['OWNER', 'ADMIN']
        );

        if (!hasAdminRole && !req.user!.isSuperAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
      }

      const permissions = await rbacService.getUserPermissions(userId, req.companyId!);

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error: any) {
      logger.error('Error fetching user permissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user permissions',
      });
    }
  }
);

/**
 * POST /api/roles/permissions/grant
 * Grant specific permissions to user (override)
 */
router.post(
  '/permissions/grant',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, permissions } = req.body;

      if (!userId || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'userId and permissions array are required',
        });
      }

      await rbacService.grantPermissions(
        userId,
        req.companyId!,
        permissions,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Permissions granted successfully',
      });
    } catch (error: any) {
      logger.error('Error granting permissions:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to grant permissions',
      });
    }
  }
);

/**
 * POST /api/roles/permissions/revoke
 * Revoke specific permissions from user
 */
router.post(
  '/permissions/revoke',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, permissions } = req.body;

      if (!userId || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'userId and permissions array are required',
        });
      }

      await rbacService.revokePermissions(
        userId,
        req.companyId!,
        permissions,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Permissions revoked successfully',
      });
    } catch (error: any) {
      logger.error('Error revoking permissions:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to revoke permissions',
      });
    }
  }
);

/**
 * POST /api/roles/seed-defaults
 * Seed default roles for organization (owner only)
 */
router.post(
  '/seed-defaults',
  authenticate,
  requireRole(['OWNER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roles = await rbacService.seedDefaultRoles(req.user!.organizationId);

      res.json({
        success: true,
        data: roles,
        message: 'Default roles seeded successfully',
      });
    } catch (error: any) {
      logger.error('Error seeding default roles:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to seed default roles',
      });
    }
  }
);

export default router;
