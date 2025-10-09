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

// Import payment & webhook routes
import paymentsRoutes from './payments';
import webhooksRoutes from './webhooks';

// Import V2 feature routes
import entitiesRoutes from './entities';
import hierarchyRoutes from './hierarchy';
import codeArtifactsRoutes from './code-artifacts';

// Import healthcare routes
import dietPlansRoutes from './diet-plans';

// Import infrastructure routes
import settingsRoutes from '../modules/system-settings/routes/settings.routes';
import filesRoutes from '../modules/files/routes/files.routes';
import analyticsRoutes from '../modules/analytics/routes/analytics.routes';

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

// V2 Feature routes (require authentication)
router.use('/entities', authenticate, entitiesRoutes);
router.use('/hierarchy', authenticate, hierarchyRoutes);
router.use('/code-artifacts', authenticate, codeArtifactsRoutes);

// Healthcare routes (require authentication)
router.use('/diet-plans', authenticate, dietPlansRoutes);

// Admin routes (require admin authentication)
router.use('/admin', authenticate, adminRoutes);

// Payment & webhook routes
router.use('/payments', paymentsRoutes);
router.use('/webhooks', webhooksRoutes);

// Infrastructure routes (require authentication)
router.use('/settings', settingsRoutes);
router.use('/files', filesRoutes);
router.use('/analytics', analyticsRoutes);

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
      },
      entities: {
        GET: {
          '/entities': 'List all entity definitions',
          '/entities/:id': 'Get entity definition details',
          '/entities/:id/ddl': 'Get entity DDL/SQL'
        },
        POST: {
          '/entities': 'Create new entity definition',
          '/entities/:id/activate': 'Activate entity and create database table',
          '/entities/validate-schema': 'Validate entity schema'
        },
        DELETE: {
          '/entities/:id': 'Delete entity definition'
        }
      },
      hierarchy: {
        GET: {
          '/hierarchy/tree/:orgId?': 'Get organization hierarchy tree',
          '/hierarchy/descendants/:orgId?': 'Get organization descendants',
          '/hierarchy/ancestors/:orgId?': 'Get organization ancestors',
          '/hierarchy/children/:orgId?': 'Get direct children',
          '/hierarchy/stats': 'Get hierarchy statistics',
          '/hierarchy/check-access/:orgId': 'Check organization access'
        },
        POST: {
          '/hierarchy/set-parent/:orgId?': 'Set parent organization'
        }
      },
      codeArtifacts: {
        GET: {
          '/code-artifacts': 'List all code artifacts',
          '/code-artifacts/:id': 'Get code artifact details',
          '/code-artifacts/:id/versions': 'Get artifact version history',
          '/code-artifacts/stats': 'Get code artifacts statistics'
        },
        POST: {
          '/code-artifacts': 'Create new code artifact',
          '/code-artifacts/:id/review': 'Review code artifact',
          '/code-artifacts/:id/deploy': 'Deploy code artifact',
          '/code-artifacts/:id/versions': 'Create new artifact version',
          '/code-artifacts/validate-code': 'Validate code syntax'
        }
      },
      settings: {
        GET: {
          '/settings': 'Get all settings',
          '/settings/public': 'Get public settings',
          '/settings/:key': 'Get specific setting',
          '/settings/:key/details': 'Get setting details',
          '/settings/category/:category': 'Get settings by category',
          '/settings/features/:featureName': 'Check feature flag'
        },
        PUT: {
          '/settings/:key': 'Create or update setting'
        },
        POST: {
          '/settings/bulk-update': 'Bulk update settings',
          '/settings/:key/reset': 'Reset setting to default',
          '/settings/features/:featureName/enable': 'Enable feature',
          '/settings/features/:featureName/disable': 'Disable feature'
        },
        DELETE: {
          '/settings/:key': 'Delete setting'
        }
      },
      files: {
        GET: {
          '/files': 'List all files',
          '/files/:fileId': 'Get file details',
          '/files/:fileId/download': 'Get download URL',
          '/files/storage/usage': 'Get storage usage'
        },
        POST: {
          '/files/upload': 'Upload file'
        },
        DELETE: {
          '/files/:fileId': 'Delete file'
        }
      },
      analytics: {
        GET: {
          '/analytics/dashboard': 'Get dashboard summary',
          '/analytics/events': 'Get analytics events',
          '/analytics/event-counts': 'Get event counts',
          '/analytics/user-activity/:userId': 'Get user activity',
          '/analytics/page-views': 'Get page views'
        },
        POST: {
          '/analytics/track': 'Track analytics event',
          '/analytics/funnel': 'Get funnel data'
        }
      }
    }
  });
});

export default router;