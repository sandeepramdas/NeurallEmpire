/**
 * Permissions & Roles Seed Data
 * Creates comprehensive permission system and default roles
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== PERMISSION DEFINITIONS ====================

export const PERMISSIONS = [
  // ===== COMPANY PERMISSIONS =====
  {
    module: 'company',
    action: 'create',
    resource: 'companies',
    code: 'company:create:companies',
    description: 'Create new companies',
    category: 'Company Management',
    isAdminOnly: true,
  },
  {
    module: 'company',
    action: 'read',
    resource: 'companies',
    code: 'company:read:companies',
    description: 'View company information',
    category: 'Company Management',
  },
  {
    module: 'company',
    action: 'update',
    resource: 'companies',
    code: 'company:update:companies',
    description: 'Update company settings',
    category: 'Company Management',
    isAdminOnly: true,
  },
  {
    module: 'company',
    action: 'delete',
    resource: 'companies',
    code: 'company:delete:companies',
    description: 'Delete companies',
    category: 'Company Management',
    isAdminOnly: true,
  },
  {
    module: 'company',
    action: 'switch',
    resource: 'companies',
    code: 'company:switch:companies',
    description: 'Switch between companies',
    category: 'Company Management',
  },

  // ===== USER PERMISSIONS =====
  {
    module: 'users',
    action: 'create',
    resource: 'users',
    code: 'users:create:users',
    description: 'Create new users',
    category: 'User Management',
    isAdminOnly: true,
  },
  {
    module: 'users',
    action: 'read',
    resource: 'users',
    code: 'users:read:users',
    description: 'View user information',
    category: 'User Management',
  },
  {
    module: 'users',
    action: 'update',
    resource: 'users',
    code: 'users:update:users',
    description: 'Update user information',
    category: 'User Management',
    isAdminOnly: true,
  },
  {
    module: 'users',
    action: 'delete',
    resource: 'users',
    code: 'users:delete:users',
    description: 'Delete users',
    category: 'User Management',
    isAdminOnly: true,
  },
  {
    module: 'users',
    action: 'invite',
    resource: 'users',
    code: 'users:invite:users',
    description: 'Invite new users',
    category: 'User Management',
    isAdminOnly: true,
  },

  // ===== ROLE PERMISSIONS =====
  {
    module: 'roles',
    action: 'create',
    resource: 'roles',
    code: 'roles:create:roles',
    description: 'Create custom roles',
    category: 'Role Management',
    isAdminOnly: true,
  },
  {
    module: 'roles',
    action: 'read',
    resource: 'roles',
    code: 'roles:read:roles',
    description: 'View roles',
    category: 'Role Management',
  },
  {
    module: 'roles',
    action: 'update',
    resource: 'roles',
    code: 'roles:update:roles',
    description: 'Update roles',
    category: 'Role Management',
    isAdminOnly: true,
  },
  {
    module: 'roles',
    action: 'delete',
    resource: 'roles',
    code: 'roles:delete:roles',
    description: 'Delete roles',
    category: 'Role Management',
    isAdminOnly: true,
  },
  {
    module: 'roles',
    action: 'assign',
    resource: 'roles',
    code: 'roles:assign:roles',
    description: 'Assign roles to users',
    category: 'Role Management',
    isAdminOnly: true,
  },

  // ===== ACCOUNTING PERMISSIONS =====

  // Chart of Accounts
  {
    module: 'accounting',
    action: 'create',
    resource: 'accounts',
    code: 'accounting:create:accounts',
    description: 'Create accounts in chart of accounts',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'read',
    resource: 'accounts',
    code: 'accounting:read:accounts',
    description: 'View chart of accounts',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'update',
    resource: 'accounts',
    code: 'accounting:update:accounts',
    description: 'Update accounts',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'delete',
    resource: 'accounts',
    code: 'accounting:delete:accounts',
    description: 'Delete accounts',
    category: 'Accounting',
  },

  // Transactions
  {
    module: 'accounting',
    action: 'create',
    resource: 'transactions',
    code: 'accounting:create:transactions',
    description: 'Create transactions',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'read',
    resource: 'transactions',
    code: 'accounting:read:transactions',
    description: 'View transactions',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'update',
    resource: 'transactions',
    code: 'accounting:update:transactions',
    description: 'Update transactions',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'delete',
    resource: 'transactions',
    code: 'accounting:delete:transactions',
    description: 'Delete transactions',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'approve',
    resource: 'transactions',
    code: 'accounting:approve:transactions',
    description: 'Approve transactions',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'post',
    resource: 'transactions',
    code: 'accounting:post:transactions',
    description: 'Post transactions to ledger',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'reverse',
    resource: 'transactions',
    code: 'accounting:reverse:transactions',
    description: 'Reverse posted transactions',
    category: 'Accounting',
  },

  // Customers
  {
    module: 'accounting',
    action: 'create',
    resource: 'customers',
    code: 'accounting:create:customers',
    description: 'Create customers',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'read',
    resource: 'customers',
    code: 'accounting:read:customers',
    description: 'View customers',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'update',
    resource: 'customers',
    code: 'accounting:update:customers',
    description: 'Update customers',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'delete',
    resource: 'customers',
    code: 'accounting:delete:customers',
    description: 'Delete customers',
    category: 'Accounting',
  },

  // Vendors
  {
    module: 'accounting',
    action: 'create',
    resource: 'vendors',
    code: 'accounting:create:vendors',
    description: 'Create vendors',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'read',
    resource: 'vendors',
    code: 'accounting:read:vendors',
    description: 'View vendors',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'update',
    resource: 'vendors',
    code: 'accounting:update:vendors',
    description: 'Update vendors',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'delete',
    resource: 'vendors',
    code: 'accounting:delete:vendors',
    description: 'Delete vendors',
    category: 'Accounting',
  },

  // Reports
  {
    module: 'accounting',
    action: 'read',
    resource: 'reports',
    code: 'accounting:read:reports',
    description: 'View accounting reports',
    category: 'Accounting',
  },
  {
    module: 'accounting',
    action: 'export',
    resource: 'reports',
    code: 'accounting:export:reports',
    description: 'Export accounting reports',
    category: 'Accounting',
  },

  // ===== AGENT PERMISSIONS =====
  {
    module: 'agents',
    action: 'create',
    resource: 'agents',
    code: 'agents:create:agents',
    description: 'Create AI agents',
    category: 'AI Agents',
  },
  {
    module: 'agents',
    action: 'read',
    resource: 'agents',
    code: 'agents:read:agents',
    description: 'View AI agents',
    category: 'AI Agents',
  },
  {
    module: 'agents',
    action: 'update',
    resource: 'agents',
    code: 'agents:update:agents',
    description: 'Update AI agents',
    category: 'AI Agents',
  },
  {
    module: 'agents',
    action: 'delete',
    resource: 'agents',
    code: 'agents:delete:agents',
    description: 'Delete AI agents',
    category: 'AI Agents',
  },
  {
    module: 'agents',
    action: 'execute',
    resource: 'agents',
    code: 'agents:execute:agents',
    description: 'Execute/run AI agents',
    category: 'AI Agents',
  },

  // ===== WORKFLOW PERMISSIONS =====
  {
    module: 'workflows',
    action: 'create',
    resource: 'workflows',
    code: 'workflows:create:workflows',
    description: 'Create workflows',
    category: 'Workflows',
  },
  {
    module: 'workflows',
    action: 'read',
    resource: 'workflows',
    code: 'workflows:read:workflows',
    description: 'View workflows',
    category: 'Workflows',
  },
  {
    module: 'workflows',
    action: 'update',
    resource: 'workflows',
    code: 'workflows:update:workflows',
    description: 'Update workflows',
    category: 'Workflows',
  },
  {
    module: 'workflows',
    action: 'delete',
    resource: 'workflows',
    code: 'workflows:delete:workflows',
    description: 'Delete workflows',
    category: 'Workflows',
  },
  {
    module: 'workflows',
    action: 'execute',
    resource: 'workflows',
    code: 'workflows:execute:workflows',
    description: 'Execute workflows',
    category: 'Workflows',
  },

  // ===== ANALYTICS PERMISSIONS =====
  {
    module: 'analytics',
    action: 'read',
    resource: 'dashboards',
    code: 'analytics:read:dashboards',
    description: 'View analytics dashboards',
    category: 'Analytics',
  },
  {
    module: 'analytics',
    action: 'export',
    resource: 'data',
    code: 'analytics:export:data',
    description: 'Export analytics data',
    category: 'Analytics',
  },

  // ===== SETTINGS PERMISSIONS =====
  {
    module: 'settings',
    action: 'read',
    resource: 'organization',
    code: 'settings:read:organization',
    description: 'View organization settings',
    category: 'Settings',
  },
  {
    module: 'settings',
    action: 'update',
    resource: 'organization',
    code: 'settings:update:organization',
    description: 'Update organization settings',
    category: 'Settings',
    isAdminOnly: true,
  },
  {
    module: 'settings',
    action: 'read',
    resource: 'billing',
    code: 'settings:read:billing',
    description: 'View billing information',
    category: 'Settings',
    isAdminOnly: true,
  },
  {
    module: 'settings',
    action: 'update',
    resource: 'billing',
    code: 'settings:update:billing',
    description: 'Update billing information',
    category: 'Settings',
    isAdminOnly: true,
  },

  // ===== AUDIT LOG PERMISSIONS =====
  {
    module: 'audit',
    action: 'read',
    resource: 'logs',
    code: 'audit:read:logs',
    description: 'View audit logs',
    category: 'Audit',
    isAdminOnly: true,
  },
  {
    module: 'audit',
    action: 'export',
    resource: 'logs',
    code: 'audit:export:logs',
    description: 'Export audit logs',
    category: 'Audit',
    isAdminOnly: true,
  },
];

// ==================== DEFAULT ROLES ====================

export const DEFAULT_ROLES = [
  {
    code: 'OWNER',
    name: 'Owner',
    description: 'Full access to all features - organization owner',
    isSystem: true,
    isDefault: false,
    priority: 100,
    permissions: PERMISSIONS.map(p => p.code), // All permissions
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Administrative access - can manage users, companies, and settings',
    isSystem: true,
    isDefault: false,
    priority: 90,
    permissions: PERMISSIONS.filter(p =>
      !p.code.includes('settings:update:billing') &&
      !p.code.includes('settings:update:organization')
    ).map(p => p.code),
  },
  {
    code: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Full accounting access - manage accounts, transactions, reports',
    isSystem: true,
    isDefault: false,
    priority: 70,
    permissions: [
      // Company access
      'company:read:companies',
      'company:switch:companies',
      // Accounting - Full access
      'accounting:create:accounts',
      'accounting:read:accounts',
      'accounting:update:accounts',
      'accounting:delete:accounts',
      'accounting:create:transactions',
      'accounting:read:transactions',
      'accounting:update:transactions',
      'accounting:delete:transactions',
      'accounting:approve:transactions',
      'accounting:post:transactions',
      'accounting:reverse:transactions',
      'accounting:create:customers',
      'accounting:read:customers',
      'accounting:update:customers',
      'accounting:delete:customers',
      'accounting:create:vendors',
      'accounting:read:vendors',
      'accounting:update:vendors',
      'accounting:delete:vendors',
      'accounting:read:reports',
      'accounting:export:reports',
      // Limited user access
      'users:read:users',
      // Analytics
      'analytics:read:dashboards',
      'analytics:export:data',
    ],
  },
  {
    code: 'BOOKKEEPER',
    name: 'Bookkeeper',
    description: 'Basic accounting access - create and update transactions',
    isSystem: true,
    isDefault: false,
    priority: 60,
    permissions: [
      'company:read:companies',
      'company:switch:companies',
      'accounting:read:accounts',
      'accounting:create:transactions',
      'accounting:read:transactions',
      'accounting:update:transactions',
      'accounting:read:customers',
      'accounting:create:customers',
      'accounting:update:customers',
      'accounting:read:vendors',
      'accounting:create:vendors',
      'accounting:update:vendors',
      'accounting:read:reports',
      'users:read:users',
    ],
  },
  {
    code: 'MANAGER',
    name: 'Manager',
    description: 'Managerial access - view reports, manage agents and workflows',
    isSystem: true,
    isDefault: false,
    priority: 65,
    permissions: [
      'company:read:companies',
      'company:switch:companies',
      // Accounting - Read only
      'accounting:read:accounts',
      'accounting:read:transactions',
      'accounting:read:customers',
      'accounting:read:vendors',
      'accounting:read:reports',
      'accounting:export:reports',
      // Agents & Workflows
      'agents:create:agents',
      'agents:read:agents',
      'agents:update:agents',
      'agents:delete:agents',
      'agents:execute:agents',
      'workflows:create:workflows',
      'workflows:read:workflows',
      'workflows:update:workflows',
      'workflows:delete:workflows',
      'workflows:execute:workflows',
      // Analytics
      'analytics:read:dashboards',
      'analytics:export:data',
      // Users - Read only
      'users:read:users',
    ],
  },
  {
    code: 'ANALYST',
    name: 'Analyst',
    description: 'Analyst access - view reports and analytics',
    isSystem: true,
    isDefault: false,
    priority: 50,
    permissions: [
      'company:read:companies',
      'company:switch:companies',
      'accounting:read:accounts',
      'accounting:read:transactions',
      'accounting:read:customers',
      'accounting:read:vendors',
      'accounting:read:reports',
      'accounting:export:reports',
      'analytics:read:dashboards',
      'analytics:export:data',
      'users:read:users',
    ],
  },
  {
    code: 'MEMBER',
    name: 'Member',
    description: 'Basic member access - view only',
    isSystem: true,
    isDefault: true,
    priority: 40,
    permissions: [
      'company:read:companies',
      'company:switch:companies',
      'accounting:read:accounts',
      'accounting:read:transactions',
      'accounting:read:reports',
      'agents:read:agents',
      'workflows:read:workflows',
      'analytics:read:dashboards',
      'users:read:users',
    ],
  },
  {
    code: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access - can only view basic information',
    isSystem: true,
    isDefault: false,
    priority: 30,
    permissions: [
      'company:read:companies',
      'accounting:read:accounts',
      'accounting:read:reports',
      'users:read:users',
    ],
  },
];

// ==================== SEED FUNCTION ====================

export async function seedPermissionsAndRoles() {
  console.log('🌱 Seeding permissions and roles...');

  try {
    // Seed Permissions
    console.log('📝 Creating permissions...');
    for (const permission of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: permission,
        create: permission,
      });
    }
    console.log(`✅ Created ${PERMISSIONS.length} permissions`);

    // Seed Default Roles (for each organization)
    // Note: This will be called per-organization during onboarding
    console.log('✅ Permissions seeded successfully');
    console.log('💡 Roles will be created per-organization during setup');

    return { permissions: PERMISSIONS.length, roles: DEFAULT_ROLES.length };
  } catch (error) {
    console.error('❌ Error seeding permissions and roles:', error);
    throw error;
  }
}

// Export for use in other seed files
export { prisma };
