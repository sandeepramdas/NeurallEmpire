import { Router } from 'express';
import { authenticate } from '../middleware/auth';

// Import all route modules
import authRoutes from './auth';
import agentsRoutes from './agents';
import workflowsRoutes from './workflows';
import adminRoutes from './admin';
import marketplaceRoutes from './marketplace';
import organizationRoutes from './organization';

// Import multi-company & accounting routes
import companiesRoutes from './companies';
import rolesRoutes from './roles';
import menusRoutes from './menus';
import accountingRoutes from './accounting';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NeurallEmpire API',
    version: '2.0.0'
  });
});

// Test error endpoint for Sentry (development/testing only)
router.get('/test-sentry', (req, res) => {
  throw new Error('Test error for Sentry monitoring - this is intentional');
});

// Public routes
router.use('/auth', authRoutes);
router.use('/marketplace/public', marketplaceRoutes);

// Protected routes (require authentication)
router.use('/agents', authenticate, agentsRoutes);
router.use('/workflows', authenticate, workflowsRoutes);
router.use('/organization', authenticate, organizationRoutes);

// Multi-company routes
router.use('/companies', companiesRoutes);
router.use('/roles', rolesRoutes);
router.use('/menus', menusRoutes);

// Accounting routes
router.use('/accounting', accountingRoutes);

// Admin routes (require admin authentication)
router.use('/admin', authenticate, adminRoutes);

// API documentation
router.get('/', (req, res) => {
  res.json({
    message: 'NeurallEmpire API v2.0',
    endpoints: {
      auth: {
        POST: {
          '/auth/signup': 'Register new organization',
          '/auth/login': 'Login to account',
          '/auth/logout': 'Logout from account',
          '/auth/profile': 'Get user profile'
        }
      },
      agents: {
        GET: {
          '/agents': 'List all agents',
          '/agents/:id': 'Get agent details',
          '/agents/:id/metrics': 'Get agent metrics'
        },
        POST: {
          '/agents': 'Create new agent',
          '/agents/:id/execute': 'Execute agent'
        },
        PUT: {
          '/agents/:id': 'Update agent',
          '/agents/:id/status': 'Update agent status'
        },
        DELETE: {
          '/agents/:id': 'Delete agent'
        }
      },
      workflows: {
        GET: {
          '/workflows': 'List all workflows',
          '/workflows/:id': 'Get workflow details',
          '/workflows/:id/executions': 'Get workflow executions'
        },
        POST: {
          '/workflows': 'Create new workflow',
          '/workflows/:id/execute': 'Execute workflow',
          '/workflows/template/:templateId': 'Create from template'
        },
        PUT: {
          '/workflows/:id': 'Update workflow',
          '/workflows/:id/status': 'Update workflow status'
        },
        DELETE: {
          '/workflows/:id': 'Delete workflow'
        }
      },
      organization: {
        GET: {
          '/organization': 'Get organization details',
          '/organization/users': 'List organization users',
          '/organization/usage': 'Get usage metrics',
          '/organization/billing': 'Get billing info'
        },
        PUT: {
          '/organization': 'Update organization',
          '/organization/users/:id': 'Update user role'
        }
      },
      admin: {
        GET: {
          '/admin/organizations': 'List all organizations',
          '/admin/users': 'List all users',
          '/admin/stats': 'Get platform statistics',
          '/admin/audit': 'Get audit logs'
        },
        PUT: {
          '/admin/organizations/:id/status': 'Update organization status',
          '/admin/organizations/:id/plan': 'Update organization plan',
          '/admin/users/:id/status': 'Update user status'
        },
        POST: {
          '/admin/admins': 'Create new admin'
        }
      }
    }
  });
});

export default router;