import { Request, Response } from 'express';
import { prisma } from '@/server';
import { z } from 'zod';
import organizationService from '@/services/organization.service';
import { logger } from '@/infrastructure/logger';

// Validation schemas
const setParentSchema = z.object({
  parentId: z.string().nullable(),
});

export class HierarchyController {
  /**
   * Get organization hierarchy tree
   */
  async getHierarchyTree(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Use current organization if not specified
      const targetOrgId = orgId || organizationId;

      // Check access permission
      const hasAccess = await organizationService.userHasOrganizationAccess(
        (req as any).user.id,
        targetOrgId,
        true // inherit access from parent
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const tree = await organizationService.getOrganizationHierarchyTree(targetOrgId);

      return res.json(tree);
    } catch (error: any) {
      logger.error('Get hierarchy tree error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch hierarchy tree' });
    }
  }

  /**
   * Get descendants of an organization
   */
  async getDescendants(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { maxDepth } = req.query;
      const organizationId = (req as any).user.organizationId;

      const targetOrgId = orgId || organizationId;

      // Check access
      const hasAccess = await organizationService.userHasOrganizationAccess(
        (req as any).user.id,
        targetOrgId,
        true
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const descendants = await organizationService.getOrganizationDescendants(
        targetOrgId,
        maxDepth ? parseInt(maxDepth as string) : undefined
      );

      return res.json(descendants);
    } catch (error: any) {
      logger.error('Get descendants error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch descendants' });
    }
  }

  /**
   * Get ancestors of an organization
   */
  async getAncestors(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const organizationId = (req as any).user.organizationId;

      const targetOrgId = orgId || organizationId;

      // Check access
      const hasAccess = await organizationService.userHasOrganizationAccess(
        (req as any).user.id,
        targetOrgId,
        true
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const ancestors = await organizationService.getOrganizationAncestors(targetOrgId);

      return res.json(ancestors);
    } catch (error: any) {
      logger.error('Get ancestors error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch ancestors' });
    }
  }

  /**
   * Get direct children of an organization
   */
  async getChildren(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const organizationId = (req as any).user.organizationId;

      const targetOrgId = orgId || organizationId;

      // Check access
      const hasAccess = await organizationService.userHasOrganizationAccess(
        (req as any).user.id,
        targetOrgId,
        true
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const children = await organizationService.getOrganizationChildren(targetOrgId);

      return res.json(children);
    } catch (error: any) {
      logger.error('Get children error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch children' });
    }
  }

  /**
   * Set parent organization
   */
  async setParent(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const validatedData = setParentSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const targetOrgId = orgId || organizationId;

      // Check if user has admin access to this organization
      const userOrg = await prisma.userOrganization.findFirst({
        where: {
          userId,
          organizationId: targetOrgId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!userOrg) {
        return res.status(403).json({
          error: 'Only organization owners/admins can modify hierarchy',
        });
      }

      // Set parent
      await organizationService.setOrganizationParent(
        targetOrgId,
        validatedData.parentId,
        userId
      );

      return res.json({
        success: true,
        message: 'Parent organization set successfully',
      });
    } catch (error: any) {
      logger.error('Set parent error:', error);
      return res.status(500).json({ error: error.message || 'Failed to set parent' });
    }
  }

  /**
   * Check if user has access to organization (via hierarchy)
   */
  async checkAccess(req: Request, res: Response) {
    try {
      const { orgId } = req.params;
      const { inheritAccess } = req.query;
      const userId = (req as any).user.id;

      const hasAccess = await organizationService.userHasOrganizationAccess(
        userId,
        orgId,
        inheritAccess === 'true'
      );

      return res.json({
        hasAccess,
        userId,
        organizationId: orgId,
        inheritAccess: inheritAccess === 'true',
      });
    } catch (error: any) {
      logger.error('Check access error:', error);
      return res.status(500).json({ error: error.message || 'Failed to check access' });
    }
  }

  /**
   * Get hierarchy statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      // Get tree
      const tree = await organizationService.getOrganizationHierarchyTree(organizationId);

      // Calculate stats
      const countNodes = (node: any): number => {
        return 1 + (node.children?.reduce((sum: number, child: any) => sum + countNodes(child), 0) || 0);
      };

      const maxDepth = (node: any, current: number = 0): number => {
        if (!node.children || node.children.length === 0) return current;
        return Math.max(...node.children.map((child: any) => maxDepth(child, current + 1)));
      };

      const countByType = (node: any, type: string): number => {
        const currentCount = node.type === type ? 1 : 0;
        return currentCount + (node.children?.reduce((sum: number, child: any) => sum + countByType(child, type), 0) || 0);
      };

      const stats = {
        totalNodes: countNodes(tree),
        maxDepth: maxDepth(tree),
        subsidiaries: countByType(tree, 'subsidiary'),
        divisions: countByType(tree, 'division'),
        departments: countByType(tree, 'department'),
        teams: countByType(tree, 'team'),
      };

      return res.json(stats);
    } catch (error: any) {
      logger.error('Get stats error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get statistics' });
    }
  }
}

export const hierarchyController = new HierarchyController();
