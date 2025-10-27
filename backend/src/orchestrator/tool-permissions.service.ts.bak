/**
 * ==================== TOOL PERMISSIONS SERVICE ====================
 *
 * Manages permissions for tool execution
 *
 * Features:
 * - Role-based access control (RBAC)
 * - Permission inheritance
 * - Tool-level and organization-level permissions
 * - Permission caching
 * - Audit logging
 *
 * @module orchestrator/tool-permissions-service
 */

import { redis } from '../context-engine/redis.client';
import { logger } from '../infrastructure/logger';
import { prisma } from './prisma.client';

export type ToolPermissionAction = 'execute' | 'view' | 'configure' | 'approve' | 'admin';

export interface ToolPermission {
  id: string;
  toolId: string;
  roleId?: string;
  userId?: string;
  organizationId: string;
  actions: ToolPermissionAction[];
  conditions?: {
    maxExecutionsPerDay?: number;
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    allowedHours?: number[]; // 0-23
    requiresApproval?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  limitations?: {
    executionsToday?: number;
    maxExecutionsPerDay?: number;
    requiresApproval?: boolean;
  };
}

export class ToolPermissionsService {
  private readonly CACHE_TTL = 60 * 10; // 10 minutes

  /**
   * Grant permission to a user or role
   */
  async grantPermission(
    toolId: string,
    organizationId: string,
    targetType: 'user' | 'role',
    targetId: string,
    actions: ToolPermissionAction[],
    conditions?: ToolPermission['conditions']
  ): Promise<ToolPermission> {
    try {
      const permission = await prisma.toolPermission.create({
        data: {
          toolId,
          organizationId,
          ...(targetType === 'user' ? { userId: targetId } : { roleId: targetId }),
          actions: actions as any,
          conditions: conditions as any,
        },
      });

      // Clear cache
      await this.clearPermissionCache(organizationId, targetId);

      logger.info('Tool permission granted', {
        toolId,
        organizationId,
        targetType,
        targetId,
        actions,
      });

      return {
        id: permission.id,
        toolId: permission.toolId,
        roleId: permission.roleId || undefined,
        userId: permission.userId || undefined,
        organizationId: permission.organizationId,
        actions: permission.actions as ToolPermissionAction[],
        conditions: permission.conditions as any,
      };
    } catch (error) {
      logger.error('Failed to grant tool permission', {
        error: error instanceof Error ? error.message : 'Unknown error',
        toolId,
        organizationId,
        targetType,
        targetId,
      });
      throw error;
    }
  }

  /**
   * Revoke permission
   */
  async revokePermission(permissionId: string, organizationId: string): Promise<void> {
    try {
      const permission = await prisma.toolPermission.findUnique({
        where: { id: permissionId, organizationId },
      });

      if (!permission) {
        throw new Error(`Permission ${permissionId} not found`);
      }

      await prisma.toolPermission.delete({
        where: { id: permissionId },
      });

      // Clear cache
      const targetId = permission.userId || permission.roleId;
      if (targetId) {
        await this.clearPermissionCache(organizationId, targetId);
      }

      logger.info('Tool permission revoked', {
        permissionId,
        organizationId,
        toolId: permission.toolId,
      });
    } catch (error) {
      logger.error('Failed to revoke tool permission', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissionId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Check if user has permission to execute tool
   */
  async checkPermission(
    toolId: string,
    userId: string,
    organizationId: string,
    action: ToolPermissionAction = 'execute'
  ): Promise<PermissionCheckResult> {
    try {
      // Check cache
      const cached = await this.getCachedPermission(toolId, userId, organizationId, action);
      if (cached !== null) {
        return cached;
      }

      // Get user's roles
      const userRoles = await prisma.userRole.findMany({
        where: { userId, organizationId },
        include: { role: true },
      });

      const roleIds = userRoles.map((ur) => ur.roleId);

      // Get permissions for user and their roles
      const permissions = await prisma.toolPermission.findMany({
        where: {
          toolId,
          organizationId,
          OR: [{ userId }, { roleId: { in: roleIds } }],
        },
      });

      if (permissions.length === 0) {
        const result: PermissionCheckResult = {
          allowed: false,
          reason: 'No permission found for this tool',
        };

        await this.cachePermission(toolId, userId, organizationId, action, result);
        return result;
      }

      // Check if any permission allows the action
      const allowedPermissions = permissions.filter((p) =>
        (p.actions as string[]).includes(action)
      );

      if (allowedPermissions.length === 0) {
        const result: PermissionCheckResult = {
          allowed: false,
          reason: `Action '${action}' not permitted`,
        };

        await this.cachePermission(toolId, userId, organizationId, action, result);
        return result;
      }

      // Check conditions
      for (const permission of allowedPermissions) {
        const conditionCheck = await this.checkConditions(
          permission,
          userId,
          organizationId
        );

        if (!conditionCheck.allowed) {
          return conditionCheck;
        }
      }

      // Get limitations from conditions
      const limitations: PermissionCheckResult['limitations'] = {};
      const permissionWithConditions = allowedPermissions.find((p) => p.conditions);

      if (permissionWithConditions?.conditions) {
        const conditions = permissionWithConditions.conditions as any;

        if (conditions.maxExecutionsPerDay) {
          const executionsToday = await this.getExecutionsToday(
            toolId,
            userId,
            organizationId
          );
          limitations.executionsToday = executionsToday;
          limitations.maxExecutionsPerDay = conditions.maxExecutionsPerDay;
        }

        if (conditions.requiresApproval) {
          limitations.requiresApproval = true;
        }
      }

      const result: PermissionCheckResult = {
        allowed: true,
        limitations,
      };

      await this.cachePermission(toolId, userId, organizationId, action, result);
      return result;
    } catch (error) {
      logger.error('Failed to check tool permission', {
        error: error instanceof Error ? error.message : 'Unknown error',
        toolId,
        userId,
        organizationId,
        action,
      });

      return {
        allowed: false,
        reason: 'Error checking permissions',
      };
    }
  }

  /**
   * Check permission conditions
   */
  private async checkConditions(
    permission: any,
    userId: string,
    organizationId: string
  ): Promise<PermissionCheckResult> {
    if (!permission.conditions) {
      return { allowed: true };
    }

    const conditions = permission.conditions as any;

    // Check max executions per day
    if (conditions.maxExecutionsPerDay) {
      const executionsToday = await this.getExecutionsToday(
        permission.toolId,
        userId,
        organizationId
      );

      if (executionsToday >= conditions.maxExecutionsPerDay) {
        return {
          allowed: false,
          reason: `Daily execution limit reached (${conditions.maxExecutionsPerDay})`,
          limitations: {
            executionsToday,
            maxExecutionsPerDay: conditions.maxExecutionsPerDay,
          },
        };
      }
    }

    // Check allowed days
    if (conditions.allowedDays && conditions.allowedDays.length > 0) {
      const today = new Date().getDay();
      if (!conditions.allowedDays.includes(today)) {
        return {
          allowed: false,
          reason: 'Tool not available on this day',
        };
      }
    }

    // Check allowed hours
    if (conditions.allowedHours && conditions.allowedHours.length > 0) {
      const currentHour = new Date().getHours();
      if (!conditions.allowedHours.includes(currentHour)) {
        return {
          allowed: false,
          reason: 'Tool not available at this hour',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get tool executions today
   */
  private async getExecutionsToday(
    toolId: string,
    userId: string,
    organizationId: string
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.toolExecution.count({
      where: {
        toolId,
        userId,
        organizationId,
        success: true,
        executedAt: {
          gte: today,
        },
      },
    });

    return count;
  }

  /**
   * List permissions for a tool
   */
  async listToolPermissions(
    toolId: string,
    organizationId: string
  ): Promise<ToolPermission[]> {
    try {
      const permissions = await prisma.toolPermission.findMany({
        where: {
          toolId,
          organizationId,
        },
      });

      return permissions.map((p) => ({
        id: p.id,
        toolId: p.toolId,
        roleId: p.roleId || undefined,
        userId: p.userId || undefined,
        organizationId: p.organizationId,
        actions: p.actions as ToolPermissionAction[],
        conditions: p.conditions as any,
      }));
    } catch (error) {
      logger.error('Failed to list tool permissions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        toolId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * List all tools user has access to
   */
  async listUserTools(
    userId: string,
    organizationId: string,
    action: ToolPermissionAction = 'execute'
  ): Promise<string[]> {
    try {
      // Get user's roles
      const userRoles = await prisma.userRole.findMany({
        where: { userId, organizationId },
      });

      const roleIds = userRoles.map((ur) => ur.roleId);

      // Get all permissions for user and their roles
      const permissions = await prisma.toolPermission.findMany({
        where: {
          organizationId,
          OR: [{ userId }, { roleId: { in: roleIds } }],
          actions: {
            has: action,
          },
        },
        select: {
          toolId: true,
        },
      });

      const toolIds = [...new Set(permissions.map((p) => p.toolId))];

      return toolIds;
    } catch (error) {
      logger.error('Failed to list user tools', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get permission cache key
   */
  private getPermissionCacheKey(
    toolId: string,
    userId: string,
    organizationId: string,
    action: string
  ): string {
    return `tool-perm:${organizationId}:${userId}:${toolId}:${action}`;
  }

  /**
   * Get cached permission
   */
  private async getCachedPermission(
    toolId: string,
    userId: string,
    organizationId: string,
    action: string
  ): Promise<PermissionCheckResult | null> {
    try {
      const key = this.getPermissionCacheKey(toolId, userId, organizationId, action);
      return await redis.getJSON<PermissionCheckResult>(key);
    } catch (error) {
      logger.warn('Failed to get cached permission', { error });
      return null;
    }
  }

  /**
   * Cache permission result
   */
  private async cachePermission(
    toolId: string,
    userId: string,
    organizationId: string,
    action: string,
    result: PermissionCheckResult
  ): Promise<void> {
    try {
      const key = this.getPermissionCacheKey(toolId, userId, organizationId, action);
      await redis.setJSON(key, result, this.CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache permission', { error });
    }
  }

  /**
   * Clear permission cache for user
   */
  private async clearPermissionCache(organizationId: string, userId: string): Promise<void> {
    try {
      const pattern = `tool-perm:${organizationId}:${userId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.deleteMany(keys);
      }
    } catch (error) {
      logger.warn('Failed to clear permission cache', { error });
    }
  }
}

// Singleton instance
export const toolPermissionsService = new ToolPermissionsService();

export default toolPermissionsService;
