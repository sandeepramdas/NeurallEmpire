import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

// Admin authentication middleware check
export const requireSuperAdmin = (req: any, res: Response, next: any) => {
  if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

export class AdminController {
  // Get all organizations with filtering and pagination
  async getOrganizations(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const planType = req.query.planType as string;
      const search = req.query.search as string;

      const where: any = {};
      if (status) where.status = status;
      if (planType) where.planType = planType;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { billingEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: {
              select: {
                users: true,
                agents: true,
                workflows: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.organization.count({ where })
      ]);

      res.json({
        success: true,
        data: organizations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get organizations error:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  }

  // Update organization status (activate/suspend/ban)
  async updateOrganizationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, statusReason } = req.body;
      const adminId = (req as any).admin.id;

      const validStatuses = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'BANNED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const organization = await prisma.organization.findUnique({
        where: { id }
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Update organization
      const updated = await prisma.organization.update({
        where: { id },
        data: {
          status,
          statusReason,
          statusChangedAt: new Date(),
          statusChangedBy: adminId
        }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminId,
          action: `UPDATE_ORG_STATUS_${status}`,
          targetType: 'ORGANIZATION',
          targetId: id,
          reason: statusReason,
          metadata: {
            previousStatus: organization.status,
            newStatus: status
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'UPDATE_STATUS',
          resourceType: 'ORGANIZATION',
          resourceId: id,
          oldValues: {
            status: organization.status
          } as any,
          newValues: {
            status: status
          } as any,
          metadata: { reason: statusReason }
        }
      });

      res.json({
        success: true,
        message: `Organization status updated to ${status}`,
        data: updated
      });
    } catch (error) {
      logger.error('Update organization status error:', error);
      res.status(500).json({ error: 'Failed to update organization status' });
    }
  }

  // Update organization plan and limits
  async updateOrganizationPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        planType,
        maxUsers,
        maxAgents,
        maxWorkflows,
        maxApiCalls,
        storageLimit
      } = req.body;

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          planType,
          maxUsers,
          maxAgents,
          maxWorkflows,
          maxApiCalls,
          storageLimit
        }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminId: (req as any).admin.id,
          action: 'UPDATE_ORG_PLAN',
          targetType: 'ORGANIZATION',
          targetId: id,
          metadata: req.body
        }
      });

      res.json({
        success: true,
        message: 'Organization plan updated',
        data: organization
      });
    } catch (error) {
      logger.error('Update organization plan error:', error);
      res.status(500).json({ error: 'Failed to update organization plan' });
    }
  }

  // Get all users across organizations
  async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const organizationId = req.query.organizationId as string;
      const search = req.query.search as string;

      const where: any = {};
      if (status) where.status = status;
      if (organizationId) where.organizationId = organizationId;
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      // Remove sensitive data
      const sanitizedUsers = users.map(user => {
        const { passwordHash, mfaSecret, ...userData } = user;
        return userData;
      });

      res.json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Update user status (activate/suspend/lock)
  async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, statusReason } = req.body;
      const adminId = (req as any).admin.id;

      const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'LOCKED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user
      const updated = await prisma.user.update({
        where: { id },
        data: {
          status,
          statusReason
        }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          adminId,
          action: `UPDATE_USER_STATUS_${status}`,
          targetType: 'USER',
          targetId: id,
          reason: statusReason,
          metadata: {
            previousStatus: user.status,
            newStatus: status
          }
        }
      });

      res.json({
        success: true,
        message: `User status updated to ${status}`,
        data: updated
      });
    } catch (error) {
      logger.error('Update user status error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  // Get platform statistics
  async getPlatformStats(req: Request, res: Response) {
    try {
      const [
        totalOrgs,
        activeOrgs,
        totalUsers,
        activeUsers,
        totalAgents,
        totalWorkflows,
        totalExecutions,
        revenueData
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.agent.count(),
        prisma.agentWorkflow.count(),
        prisma.agentInteraction.count(),
        prisma.organization.groupBy({
          by: ['planType'],
          _count: { id: true }
        })
      ]);

      const stats = {
        organizations: {
          total: totalOrgs,
          active: activeOrgs,
          suspended: await prisma.organization.count({ where: { status: 'SUSPENDED' } }),
          trial: await prisma.organization.count({ where: { status: 'TRIAL' } })
        },
        users: {
          total: totalUsers,
          active: activeUsers
        },
        agents: {
          total: totalAgents,
          active: await prisma.agent.count({ where: { status: 'ACTIVE' } })
        },
        workflows: {
          total: totalWorkflows,
          active: await prisma.agentWorkflow.count({ where: { status: 'ACTIVE' } })
        },
        executions: {
          total: totalExecutions,
          today: await prisma.agentInteraction.count({
            where: {
              startedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          })
        },
        revenue: revenueData
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get platform stats error:', error);
      res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
  }

  // Get audit logs
  async getAuditLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string;
      const resource = req.query.resource as string;
      const userId = req.query.userId as string;
      const adminId = req.query.adminId as string;

      const where: any = {};
      if (action) where.action = action;
      if (resource) where.resource = resource;
      if (userId) where.userId = userId;
      if (adminId) where.adminId = adminId;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            },
            admin: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            },
            organization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  // Create platform admin
  async createAdmin(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      const existingAdmin = await prisma.platformAdmin.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const admin = await prisma.platformAdmin.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: role || 'SUPPORT',
          permissions: {} // Default empty permissions
        }
      });

      res.json({
        success: true,
        message: 'Admin created successfully',
        data: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        }
      });
    } catch (error) {
      logger.error('Create admin error:', error);
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }
}

export const adminController = new AdminController();