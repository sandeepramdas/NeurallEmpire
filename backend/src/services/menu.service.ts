/**
 * Menu Service
 * Dynamic menu generation with permission and role-based filtering
 * Returns personalized menus based on user's permissions and roles
 */

import { prisma } from '@/server';
import { MenuItem } from '@prisma/client';
import { rbacService } from './rbac.service';

interface MenuItemWithChildren extends MenuItem {
  children?: MenuItemWithChildren[];
}

interface UserMenuContext {
  userId: string;
  companyId: string;
  permissions: string[];
  roles: string[];
}

class MenuService {
  /**
   * Get all menus for a user (permission and role filtered)
   */
  async getUserMenus(userId: string, companyId: string): Promise<MenuItemWithChildren[]> {
    try {
      // Get user permissions and roles
      const permissions = await rbacService.getUserPermissions(userId, companyId);
      const userRoles = await rbacService.getUserRoles(userId, companyId);
      const roleCodes = userRoles.map(r => r.code);

      const context: UserMenuContext = {
        userId,
        companyId,
        permissions,
        roles: roleCodes,
      };

      // Get all active menus
      const allMenus = await prisma.menuItem.findMany({
        where: {
          isActive: true,
          parentId: null, // Only root level menus
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      // Build menu tree with children
      const menusWithChildren = await Promise.all(
        allMenus.map(async (menu) => {
          const children = await this.getMenuChildren(menu.id);
          return {
            ...menu,
            children,
          };
        })
      );

      // Filter menus based on permissions and roles
      const filteredMenus = this.filterMenus(menusWithChildren, context);

      return filteredMenus;
    } catch (error) {
      console.error('Error getting user menus:', error);
      return [];
    }
  }

  /**
   * Get children of a menu item recursively
   */
  private async getMenuChildren(parentId: string): Promise<MenuItemWithChildren[]> {
    try {
      const children = await prisma.menuItem.findMany({
        where: {
          parentId,
          isActive: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      // Recursively get children of children
      return await Promise.all(
        children.map(async (child) => {
          const grandChildren = await this.getMenuChildren(child.id);
          return {
            ...child,
            children: grandChildren.length > 0 ? grandChildren : undefined,
          };
        })
      );
    } catch (error) {
      console.error('Error getting menu children:', error);
      return [];
    }
  }

  /**
   * Filter menus based on user permissions and roles
   */
  private filterMenus(
    menus: MenuItemWithChildren[],
    context: UserMenuContext
  ): MenuItemWithChildren[] {
    return menus
      .filter(menu => this.canAccessMenu(menu, context))
      .map(menu => ({
        ...menu,
        children: menu.children
          ? this.filterMenus(menu.children, context)
          : undefined,
      }))
      .filter(menu => {
        // Remove parent if all children are filtered out (except separators)
        if (menu.isSeparator) return true;
        if (!menu.children || menu.children.length === 0) {
          // Keep if it has a route (is a clickable menu)
          return !!menu.route;
        }
        return menu.children.length > 0;
      });
  }

  /**
   * Check if user can access a menu item
   */
  private canAccessMenu(menu: MenuItem, context: UserMenuContext): boolean {
    // Separators are always visible
    if (menu.isSeparator) {
      return true;
    }

    // Check if menu is active
    if (!menu.isActive || !menu.showInSidebar) {
      return false;
    }

    // Parse permissions and roles required
    const permissionsRequired = this.parseJsonField(menu.permissionsRequired);
    const rolesRequired = this.parseJsonField(menu.rolesRequired);

    // Check role requirements
    if (rolesRequired && rolesRequired.length > 0) {
      const hasRole = rolesRequired.some(role => context.roles.includes(role));
      if (!hasRole) {
        return false;
      }
    }

    // Check permission requirements
    if (permissionsRequired && permissionsRequired.length > 0) {
      const hasPermission = rbacService.hasPermission(
        context.permissions,
        permissionsRequired
      );
      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parse JSON field safely
   */
  private parseJsonField(field: any): string[] {
    if (Array.isArray(field)) {
      return field;
    }
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Get all menus (admin only)
   */
  async getAllMenus(): Promise<MenuItemWithChildren[]> {
    try {
      const rootMenus = await prisma.menuItem.findMany({
        where: {
          parentId: null,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      return await Promise.all(
        rootMenus.map(async (menu) => {
          const children = await this.getMenuChildren(menu.id);
          return {
            ...menu,
            children,
          };
        })
      );
    } catch (error) {
      console.error('Error getting all menus:', error);
      return [];
    }
  }

  /**
   * Get menu by ID
   */
  async getMenuById(menuId: string): Promise<MenuItem | null> {
    try {
      return await prisma.menuItem.findUnique({
        where: { id: menuId },
      });
    } catch (error) {
      console.error('Error getting menu by ID:', error);
      return null;
    }
  }

  /**
   * Create a new menu item
   */
  async createMenu(data: {
    name: string;
    label: string;
    icon?: string;
    route?: string;
    component?: string;
    parentId?: string;
    module?: string;
    permissionsRequired?: string[];
    rolesRequired?: string[];
    orderIndex?: number;
    showInSidebar?: boolean;
    isSeparator?: boolean;
    badge?: string;
    badgeColor?: string;
  }, createdBy: string): Promise<MenuItem> {
    try {
      const menu = await prisma.menuItem.create({
        data: {
          name: data.name,
          label: data.label,
          icon: data.icon,
          route: data.route,
          component: data.component,
          parentId: data.parentId,
          module: data.module,
          permissionsRequired: data.permissionsRequired || [],
          rolesRequired: data.rolesRequired || [],
          orderIndex: data.orderIndex || 0,
          showInSidebar: data.showInSidebar ?? true,
          isSeparator: data.isSeparator ?? false,
          isActive: true,
          badge: data.badge,
          badgeColor: data.badgeColor,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_MENU',
          resourceType: 'MENU_ITEM',
          resourceId: menu.id,
          userId: createdBy,
          newValues: {
            name: menu.name,
            label: menu.label,
            route: menu.route,
          },
        },
      });

      return menu;
    } catch (error) {
      console.error('Error creating menu:', error);
      throw error;
    }
  }

  /**
   * Update a menu item
   */
  async updateMenu(
    menuId: string,
    data: Partial<{
      name: string;
      label: string;
      icon: string;
      route: string;
      component: string;
      permissionsRequired: string[];
      rolesRequired: string[];
      orderIndex: number;
      showInSidebar: boolean;
      isActive: boolean;
      badge: string;
      badgeColor: string;
    }>,
    updatedBy: string
  ): Promise<MenuItem> {
    try {
      const existingMenu = await prisma.menuItem.findUnique({
        where: { id: menuId },
      });

      if (!existingMenu) {
        throw new Error('Menu item not found');
      }

      const menu = await prisma.menuItem.update({
        where: { id: menuId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_MENU',
          resourceType: 'MENU_ITEM',
          resourceId: menuId,
          userId: updatedBy,
          oldValues: {
            label: existingMenu.label,
            route: existingMenu.route,
          },
          newValues: {
            label: menu.label,
            route: menu.route,
          },
        },
      });

      return menu;
    } catch (error) {
      console.error('Error updating menu:', error);
      throw error;
    }
  }

  /**
   * Delete a menu item
   */
  async deleteMenu(menuId: string, deletedBy: string): Promise<void> {
    try {
      const menu = await prisma.menuItem.findUnique({
        where: { id: menuId },
        include: {
          children: true,
        },
      });

      if (!menu) {
        throw new Error('Menu item not found');
      }

      if (menu.children.length > 0) {
        throw new Error('Cannot delete menu with children. Delete children first.');
      }

      await prisma.menuItem.delete({
        where: { id: menuId },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_MENU',
          resourceType: 'MENU_ITEM',
          resourceId: menuId,
          userId: deletedBy,
          oldValues: {
            name: menu.name,
            label: menu.label,
          },
        },
      });
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw error;
    }
  }

  /**
   * Reorder menu items
   */
  async reorderMenus(
    menuUpdates: Array<{ id: string; orderIndex: number }>,
    updatedBy: string
  ): Promise<void> {
    try {
      await Promise.all(
        menuUpdates.map(update =>
          prisma.menuItem.update({
            where: { id: update.id },
            data: { orderIndex: update.orderIndex },
          })
        )
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'REORDER_MENUS',
          resourceType: 'MENU_ITEM',
          userId: updatedBy,
          newValues: {
            updates: menuUpdates,
          },
        },
      });
    } catch (error) {
      console.error('Error reordering menus:', error);
      throw error;
    }
  }

  /**
   * Get menu breadcrumbs for a route
   */
  async getMenuBreadcrumbs(route: string): Promise<MenuItem[]> {
    try {
      // Find menu item by route
      const menuItem = await prisma.menuItem.findFirst({
        where: { route },
      });

      if (!menuItem) {
        return [];
      }

      // Build breadcrumb trail
      const breadcrumbs: MenuItem[] = [menuItem];

      let currentParentId = menuItem.parentId;
      while (currentParentId) {
        const parent = await prisma.menuItem.findUnique({
          where: { id: currentParentId },
        });

        if (parent) {
          breadcrumbs.unshift(parent);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      return breadcrumbs;
    } catch (error) {
      console.error('Error getting menu breadcrumbs:', error);
      return [];
    }
  }

  /**
   * Search menus
   */
  async searchMenus(query: string, userId?: string, companyId?: string): Promise<MenuItem[]> {
    try {
      const menus = await prisma.menuItem.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { label: { contains: query, mode: 'insensitive' } },
            { route: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
          showInSidebar: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      // If user context provided, filter by permissions
      if (userId && companyId) {
        const permissions = await rbacService.getUserPermissions(userId, companyId);
        const userRoles = await rbacService.getUserRoles(userId, companyId);
        const roleCodes = userRoles.map(r => r.code);

        const context: UserMenuContext = {
          userId,
          companyId,
          permissions,
          roles: roleCodes,
        };

        return menus.filter(menu => this.canAccessMenu(menu, context));
      }

      return menus;
    } catch (error) {
      console.error('Error searching menus:', error);
      return [];
    }
  }

  /**
   * Get menus by module
   */
  async getMenusByModule(module: string): Promise<MenuItem[]> {
    try {
      return await prisma.menuItem.findMany({
        where: {
          module,
          isActive: true,
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });
    } catch (error) {
      console.error('Error getting menus by module:', error);
      return [];
    }
  }

  /**
   * Toggle menu visibility
   */
  async toggleMenuVisibility(menuId: string, updatedBy: string): Promise<MenuItem> {
    try {
      const menu = await prisma.menuItem.findUnique({
        where: { id: menuId },
      });

      if (!menu) {
        throw new Error('Menu item not found');
      }

      const updated = await prisma.menuItem.update({
        where: { id: menuId },
        data: {
          isActive: !menu.isActive,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'TOGGLE_MENU_VISIBILITY',
          resourceType: 'MENU_ITEM',
          resourceId: menuId,
          userId: updatedBy,
          oldValues: { isActive: menu.isActive },
          newValues: { isActive: updated.isActive },
        },
      });

      return updated;
    } catch (error) {
      console.error('Error toggling menu visibility:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const menuService = new MenuService();
export default menuService;
