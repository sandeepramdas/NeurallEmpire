/**
 * RBAC Middleware
 * Permission-based access control middleware
 * Checks if user has required permissions before allowing access to routes
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';
import { rbacService } from '@/services/rbac.service';

/**
 * Check if user has specific permission(s)
 * Usage: requirePermission('accounting:create:transactions')
 * Usage: requirePermission(['accounting:create:transactions', 'accounting:read:accounts'])
 */
export const requirePermission = (required: string | string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      if (!req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company context required',
        });
      }

      // Super admins bypass all permission checks
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Get user permissions if not already loaded
      let permissions = req.permissions;
      if (!permissions) {
        permissions = await rbacService.getUserPermissions(req.user.id, req.companyId);
        req.permissions = permissions;
      }

      // Check if user has required permission(s)
      const hasPermission = rbacService.hasPermission(permissions, required);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: Array.isArray(required) ? required : [required],
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

/**
 * Check if user has ANY of the specified permissions
 * Usage: requireAnyPermission(['accounting:create:transactions', 'accounting:update:transactions'])
 */
export const requireAnyPermission = (required: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      if (!req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company context required',
        });
      }

      // Super admins bypass all permission checks
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Get user permissions if not already loaded
      let permissions = req.permissions;
      if (!permissions) {
        permissions = await rbacService.getUserPermissions(req.user.id, req.companyId);
        req.permissions = permissions;
      }

      // Check if user has ANY of the required permissions
      const hasPermission = rbacService.hasAnyPermission(permissions, required);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

/**
 * Check if user has specific role(s)
 * Usage: requireRole('OWNER')
 * Usage: requireRole(['OWNER', 'ADMIN'])
 */
export const requireRole = (required: string | string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      if (!req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company context required',
        });
      }

      // Super admins bypass all role checks
      if (req.user.isSuperAdmin) {
        return next();
      }

      // Get user roles if not already loaded
      let roles = req.roles;
      if (!roles) {
        const userRoles = await rbacService.getUserRoles(req.user.id, req.companyId);
        roles = userRoles.map(r => r.code);
        req.roles = roles;
      }

      // Check if user has required role(s)
      const requiredRoles = Array.isArray(required) ? required : [required];
      const hasRole = requiredRoles.some(role => roles?.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient role',
          required: requiredRoles,
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Role check failed',
      });
    }
  };
};

/**
 * Require super admin access
 */
export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required',
    });
  }

  next();
};

/**
 * Check if user owns the resource or has admin role
 * Usage: requireOwnerOrAdmin((req) => req.params.userId)
 */
export const requireOwnerOrAdmin = (getResourceOwnerId: (req: AuthenticatedRequest) => string) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Super admins can access everything
      if (req.user.isSuperAdmin) {
        return next();
      }

      const resourceOwnerId = getResourceOwnerId(req);

      // Allow if user owns the resource
      if (req.user.id === resourceOwnerId) {
        return next();
      }

      // Check if user has admin or owner role
      if (req.companyId) {
        const hasAdminRole = await rbacService.hasRole(req.user.id, req.companyId, ['OWNER', 'ADMIN']);
        if (hasAdminRole) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    } catch (error) {
      console.error('Owner/admin check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Access check failed',
      });
    }
  };
};

/**
 * Attach user permissions and roles to request (useful for conditional logic in controllers)
 */
export const loadPermissionsAndRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.companyId) {
      return next();
    }

    // Skip if already loaded
    if (req.permissions && req.roles) {
      return next();
    }

    // Load permissions
    if (!req.permissions) {
      req.permissions = await rbacService.getUserPermissions(req.user.id, req.companyId);
    }

    // Load roles
    if (!req.roles) {
      const userRoles = await rbacService.getUserRoles(req.user.id, req.companyId);
      req.roles = userRoles.map(r => r.code);
    }

    next();
  } catch (error) {
    console.error('Error loading permissions and roles:', error);
    next(); // Don't block request on error
  }
};
