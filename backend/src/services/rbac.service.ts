/**
 * RBAC Service
 * Role-Based Access Control with granular permission management
 * Handles permission checking, role assignment, and access control
 */

import { prisma } from '@/server';
import { Permission, Role } from '@prisma/client';

interface UserPermissions {
  userId: string;
  companyId: string;
  permissions: string[];
  roles: Role[];
}

interface CreateRoleDTO {
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  priority?: number;
}

interface UpdateRoleDTO {
  name?: string;
  description?: string;
  permissions?: string[];
  priority?: number;
}

class RBACService {
  /**
   * Get all permissions for a user in a specific company
   */
  async getUserPermissions(userId: string, companyId: string): Promise<string[]> {
    try {
      // Get user's company access with role
      const userAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        include: {
          role: true,
        },
      });

      if (!userAccess) {
        return [];
      }

      const permissionsSet = new Set<string>();

      // 1. Add permissions from role
      if (userAccess.role) {
        const rolePermissions = userAccess.role.permissions as string[];
        rolePermissions.forEach(p => permissionsSet.add(p));
      }

      // 2. Add override permissions (user-specific for this company)
      const overridePermissions = userAccess.permissions as string[];
      overridePermissions.forEach(p => permissionsSet.add(p));

      // 3. Check if user is super admin (has all permissions)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      });

      if (user?.isSuperAdmin) {
        // Super admin gets all permissions
        const allPermissions = await prisma.permission.findMany({
          select: { code: true },
        });
        allPermissions.forEach(p => permissionsSet.add(p.code));
      }

      return Array.from(permissionsSet);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userPermissions: string[], required: string | string[]): boolean {
    const requiredPerms = Array.isArray(required) ? required : [required];

    // Check if user has ALL required permissions
    return requiredPerms.every(perm => userPermissions.includes(perm));
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  hasAnyPermission(userPermissions: string[], required: string[]): boolean {
    return required.some(perm => userPermissions.includes(perm));
  }

  /**
   * Get user's roles for a company
   */
  async getUserRoles(userId: string, companyId: string): Promise<Role[]> {
    try {
      const userAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        include: {
          role: true,
        },
      });

      return userAccess?.role ? [userAccess.role] : [];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, companyId: string, roleCodes: string[]): Promise<boolean> {
    const roles = await this.getUserRoles(userId, companyId);
    return roles.some(role => roleCodes.includes(role.code));
  }

  /**
   * Assign role to user for a company
   */
  async assignRole(
    userId: string,
    companyId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      // Verify role belongs to the same organization as company
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          organization: {
            include: {
              companies: {
                where: { id: companyId },
              },
            },
          },
        },
      });

      if (!role || role.organization.companies.length === 0) {
        throw new Error('Role not found or does not belong to company organization');
      }

      // Update or create user company access
      await prisma.userCompanyAccess.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        update: {
          roleId,
          updatedAt: new Date(),
        },
        create: {
          userId,
          companyId,
          roleId,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'ASSIGN_ROLE',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId: assignedBy,
          companyId,
          newValues: {
            userId,
            companyId,
            roleId,
            roleName: role.name,
          },
        },
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Remove role from user for a company
   */
  async removeRole(userId: string, companyId: string, removedBy: string): Promise<void> {
    try {
      const userAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!userAccess) {
        throw new Error('User does not have access to this company');
      }

      await prisma.userCompanyAccess.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          roleId: null,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'REMOVE_ROLE',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId: removedBy,
          companyId,
          oldValues: {
            roleId: userAccess.roleId,
          },
        },
      });
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }

  /**
   * Create a custom role
   */
  async createRole(
    organizationId: string,
    data: CreateRoleDTO,
    createdBy: string
  ): Promise<Role> {
    try {
      // Validate permissions exist
      const validPermissions = await prisma.permission.findMany({
        where: {
          code: { in: data.permissions },
        },
      });

      if (validPermissions.length !== data.permissions.length) {
        throw new Error('Some permissions do not exist');
      }

      const role = await prisma.role.create({
        data: {
          organizationId,
          name: data.name,
          code: data.code.toUpperCase(),
          description: data.description,
          permissions: data.permissions,
          priority: data.priority || 50,
          isSystem: false,
          isDefault: false,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_ROLE',
          resourceType: 'ROLE',
          resourceId: role.id,
          userId: createdBy,
          organizationId,
          newValues: {
            name: role.name,
            code: role.code,
            permissions: data.permissions,
          },
        },
      });

      return role;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    data: UpdateRoleDTO,
    updatedBy: string
  ): Promise<Role> {
    try {
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!existingRole) {
        throw new Error('Role not found');
      }

      if (existingRole.isSystem) {
        throw new Error('Cannot update system roles');
      }

      // Validate permissions if provided
      if (data.permissions) {
        const validPermissions = await prisma.permission.findMany({
          where: {
            code: { in: data.permissions },
          },
        });

        if (validPermissions.length !== data.permissions.length) {
          throw new Error('Some permissions do not exist');
        }
      }

      const role = await prisma.role.update({
        where: { id: roleId },
        data: {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          priority: data.priority,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_ROLE',
          resourceType: 'ROLE',
          resourceId: role.id,
          userId: updatedBy,
          organizationId: existingRole.organizationId,
          oldValues: {
            name: existingRole.name,
            permissions: existingRole.permissions,
          },
          newValues: {
            name: role.name,
            permissions: role.permissions,
          },
        },
      });

      return role;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          userAccess: true,
        },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.isSystem) {
        throw new Error('Cannot delete system roles');
      }

      if (role.userAccess.length > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      await prisma.role.delete({
        where: { id: roleId },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_ROLE',
          resourceType: 'ROLE',
          resourceId: roleId,
          userId: deletedBy,
          organizationId: role.organizationId,
          oldValues: {
            name: role.name,
            code: role.code,
          },
        },
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for an organization
   */
  async getOrganizationRoles(organizationId: string): Promise<Role[]> {
    try {
      return await prisma.role.findMany({
        where: { organizationId },
        orderBy: [
          { priority: 'desc' },
          { name: 'asc' },
        ],
      });
    } catch (error) {
      console.error('Error getting organization roles:', error);
      return [];
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role | null> {
    try {
      return await prisma.role.findUnique({
        where: { id: roleId },
      });
    } catch (error) {
      console.error('Error getting role:', error);
      return null;
    }
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await prisma.permission.findMany({
        orderBy: [
          { module: 'asc' },
          { resource: 'asc' },
          { action: 'asc' },
        ],
      });
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  }

  /**
   * Get permissions grouped by module
   */
  async getPermissionsByModule(): Promise<Record<string, Permission[]>> {
    try {
      const permissions = await this.getAllPermissions();

      const grouped: Record<string, Permission[]> = {};

      permissions.forEach(permission => {
        if (!grouped[permission.module]) {
          grouped[permission.module] = [];
        }
        grouped[permission.module].push(permission);
      });

      return grouped;
    } catch (error) {
      console.error('Error getting permissions by module:', error);
      return {};
    }
  }

  /**
   * Grant specific permissions to user for a company (override)
   */
  async grantPermissions(
    userId: string,
    companyId: string,
    permissions: string[],
    grantedBy: string
  ): Promise<void> {
    try {
      const userAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!userAccess) {
        throw new Error('User does not have access to this company');
      }

      const currentPermissions = userAccess.permissions as string[];
      const updatedPermissions = Array.from(new Set([...currentPermissions, ...permissions]));

      await prisma.userCompanyAccess.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          permissions: updatedPermissions,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'GRANT_PERMISSIONS',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId: grantedBy,
          companyId,
          oldValues: { permissions: currentPermissions },
          newValues: { permissions: updatedPermissions },
        },
      });
    } catch (error) {
      console.error('Error granting permissions:', error);
      throw error;
    }
  }

  /**
   * Revoke specific permissions from user for a company
   */
  async revokePermissions(
    userId: string,
    companyId: string,
    permissions: string[],
    revokedBy: string
  ): Promise<void> {
    try {
      const userAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!userAccess) {
        throw new Error('User does not have access to this company');
      }

      const currentPermissions = userAccess.permissions as string[];
      const updatedPermissions = currentPermissions.filter(p => !permissions.includes(p));

      await prisma.userCompanyAccess.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          permissions: updatedPermissions,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'REVOKE_PERMISSIONS',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId: revokedBy,
          companyId,
          oldValues: { permissions: currentPermissions },
          newValues: { permissions: updatedPermissions },
        },
      });
    } catch (error) {
      console.error('Error revoking permissions:', error);
      throw error;
    }
  }

  /**
   * Seed default roles for an organization
   */
  async seedDefaultRoles(organizationId: string): Promise<Role[]> {
    try {
      // @ts-ignore - Importing from outside rootDir
      const { DEFAULT_ROLES } = await import('../../prisma/seeds/permissions.seed');

      const createdRoles: Role[] = [];

      for (const roleData of DEFAULT_ROLES) {
        const role = await prisma.role.upsert({
          where: {
            organizationId_code: {
              organizationId,
              code: roleData.code,
            },
          },
          update: {
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions,
            priority: roleData.priority,
            isDefault: roleData.isDefault,
          },
          create: {
            organizationId,
            name: roleData.name,
            code: roleData.code,
            description: roleData.description,
            permissions: roleData.permissions,
            priority: roleData.priority,
            isSystem: roleData.isSystem,
            isDefault: roleData.isDefault,
          },
        });

        createdRoles.push(role);
      }

      console.log(`✅ Seeded ${createdRoles.length} default roles for organization ${organizationId}`);
      return createdRoles;
    } catch (error) {
      console.error('Error seeding default roles:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const rbacService = new RBACService();
export default rbacService;
