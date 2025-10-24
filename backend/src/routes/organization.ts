import { Router, Request, Response } from 'express';
import { prisma } from '@/server';
import { logger } from '@/infrastructure/logger';

const router = Router();

// Get organization details
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            agents: true,
            workflows: true
          }
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    logger.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization
router.put('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userRole = (req as any).user.role;

    // Only owners and admins can update organization
    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, description, logo, industry, size } = req.body;

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        description,
        logo,
        industry,
        size
      }
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Get organization users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        department: true,
        title: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Invite user to organization
router.post('/users/invite', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userRole = (req as any).user.role;

    // Only owners and admins can invite users
    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { email, role, department, title } = req.body;

    // Check organization user limit
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org._count.users >= org.maxUsers) {
      return res.status(403).json({
        error: `User limit reached. Your plan allows ${org.maxUsers} users.`
      });
    }

    // Here you would send an invitation email
    // For now, we'll just return a success message

    res.json({
      success: true,
      message: `Invitation sent to ${email}`
    });
  } catch (error) {
    logger.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Update user role
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userRole = (req as any).user.role;
    const { id } = req.params;
    const { role, department, title, permissions } = req.body;

    // Only owners can update user roles
    if (userRole !== 'OWNER') {
      return res.status(403).json({ error: 'Only owners can update user roles' });
    }

    // Check if user belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Prevent owner from changing their own role
    if (user.role === 'OWNER' && role !== 'OWNER') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role,
        department,
        title,
        permissions
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updated
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Remove user from organization
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userRole = (req as any).user.role;
    const { id } = req.params;

    // Only owners can remove users
    if (userRole !== 'OWNER') {
      return res.status(403).json({ error: 'Only owners can remove users' });
    }

    // Check if user belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Prevent owner from removing themselves
    if (user.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    // Soft delete user
    await prisma.user.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date()
      }
    });

    // Update organization user count
    await prisma.organization.update({
      where: { id: organizationId },
      data: { currentUsers: { decrement: 1 } }
    });

    res.json({
      success: true,
      message: 'User removed from organization'
    });
  } catch (error) {
    logger.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// Get organization usage metrics
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [organization, todayMetrics, monthMetrics] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          maxUsers: true,
          maxAgents: true,
          maxWorkflows: true,
          maxApiCalls: true,
          storageLimit: true,
          currentUsers: true,
          currentAgents: true,
          currentWorkflows: true,
          apiCallsThisMonth: true,
          storageUsed: true
        }
      }),
      // Usage metrics query - temporarily returning null
      Promise.resolve(null),
      Promise.resolve([])
    ]);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const usage = {
      current: {
        users: {
          used: organization.currentUsers,
          limit: organization.maxUsers,
          percentage: (organization.currentUsers / organization.maxUsers) * 100
        },
        agents: {
          used: organization.currentAgents,
          limit: organization.maxAgents,
          percentage: (organization.currentAgents / organization.maxAgents) * 100
        },
        workflows: {
          used: organization.currentWorkflows,
          limit: organization.maxWorkflows,
          percentage: (organization.currentWorkflows / organization.maxWorkflows) * 100
        },
        apiCalls: {
          used: organization.apiCallsThisMonth,
          limit: organization.maxApiCalls,
          percentage: (organization.apiCallsThisMonth / organization.maxApiCalls) * 100
        },
        storage: {
          used: Number(organization.storageUsed),
          limit: Number(organization.storageLimit),
          percentage: (Number(organization.storageUsed) / Number(organization.storageLimit)) * 100
        }
      },
      today: todayMetrics,
      monthly: monthMetrics
    };

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    logger.error('Get usage metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch usage metrics' });
  }
});

// Get billing information
router.get('/billing', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;

    const [organization, subscription, invoices] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          planType: true,
          billingEmail: true,
          trialEndsAt: true
        }
      }),
      prisma.subscription.findFirst({
        where: {
          organizationId,
          status: { in: ['ACTIVE', 'TRIALING'] }
        }
      }),
      prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        organization,
        subscription,
        invoices
      }
    });
  } catch (error) {
    logger.error('Get billing info error:', error);
    res.status(500).json({ error: 'Failed to fetch billing information' });
  }
});

export default router;