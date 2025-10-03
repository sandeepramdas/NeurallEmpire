/**
 * Menu Items Seed Data
 * Creates comprehensive dynamic menu system with permission-based access
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== MENU STRUCTURE ====================

export const MENU_ITEMS = [
  // ===== MAIN DASHBOARD =====
  {
    name: 'dashboard',
    label: 'Dashboard',
    icon: 'HomeIcon',
    route: '/dashboard',
    component: 'Dashboard',
    orderIndex: 1,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'dashboard',
    permissionsRequired: [],
    rolesRequired: [],
    children: [],
  },

  // ===== COMPANY MANAGEMENT =====
  {
    name: 'companies',
    label: 'Companies',
    icon: 'BuildingOfficeIcon',
    route: '/companies',
    component: 'Companies',
    orderIndex: 2,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'company',
    permissionsRequired: ['company:read:companies'],
    rolesRequired: [],
    children: [
      {
        name: 'companies-list',
        label: 'All Companies',
        icon: 'ListBulletIcon',
        route: '/companies',
        component: 'CompaniesList',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['company:read:companies'],
        rolesRequired: [],
      },
      {
        name: 'companies-create',
        label: 'New Company',
        icon: 'PlusIcon',
        route: '/companies/new',
        component: 'CompanyCreate',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['company:create:companies'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
      {
        name: 'companies-settings',
        label: 'Company Settings',
        icon: 'Cog6ToothIcon',
        route: '/companies/settings',
        component: 'CompanySettings',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['company:update:companies'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
    ],
  },

  // ===== ACCOUNTING =====
  {
    name: 'accounting',
    label: 'Accounting',
    icon: 'CalculatorIcon',
    route: '/accounting',
    component: null,
    orderIndex: 3,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'accounting',
    permissionsRequired: ['accounting:read:accounts'],
    rolesRequired: [],
    children: [
      {
        name: 'chart-of-accounts',
        label: 'Chart of Accounts',
        icon: 'TableCellsIcon',
        route: '/accounting/chart-of-accounts',
        component: 'ChartOfAccounts',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:accounts'],
        rolesRequired: [],
      },
      {
        name: 'transactions',
        label: 'Transactions',
        icon: 'DocumentTextIcon',
        route: '/accounting/transactions',
        component: 'Transactions',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:transactions'],
        rolesRequired: [],
      },
      {
        name: 'journal-entries',
        label: 'Journal Entries',
        icon: 'DocumentDuplicateIcon',
        route: '/accounting/journal-entries',
        component: 'JournalEntries',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:transactions'],
        rolesRequired: [],
      },
      {
        name: 'customers',
        label: 'Customers',
        icon: 'UserGroupIcon',
        route: '/accounting/customers',
        component: 'Customers',
        orderIndex: 4,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:customers'],
        rolesRequired: [],
      },
      {
        name: 'vendors',
        label: 'Vendors',
        icon: 'TruckIcon',
        route: '/accounting/vendors',
        component: 'Vendors',
        orderIndex: 5,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:vendors'],
        rolesRequired: [],
      },
      {
        name: 'reports',
        label: 'Reports',
        icon: 'ChartBarIcon',
        route: '/accounting/reports',
        component: 'AccountingReports',
        orderIndex: 6,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:reports'],
        rolesRequired: [],
      },
    ],
  },

  // ===== AI AGENTS =====
  {
    name: 'agents',
    label: 'AI Agents',
    icon: 'CpuChipIcon',
    route: '/agents',
    component: null,
    orderIndex: 4,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'agents',
    badge: 'Elite 8',
    badgeColor: 'purple',
    permissionsRequired: ['agents:read:agents'],
    rolesRequired: [],
    children: [
      {
        name: 'agents-list',
        label: 'All Agents',
        icon: 'ListBulletIcon',
        route: '/agents',
        component: 'AgentsList',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['agents:read:agents'],
        rolesRequired: [],
      },
      {
        name: 'agents-create',
        label: 'Create Agent',
        icon: 'PlusIcon',
        route: '/agents/new',
        component: 'AgentCreate',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['agents:create:agents'],
        rolesRequired: [],
      },
      {
        name: 'agents-marketplace',
        label: 'Agent Marketplace',
        icon: 'ShoppingBagIcon',
        route: '/agents/marketplace',
        component: 'AgentMarketplace',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        badge: 'New',
        badgeColor: 'green',
        permissionsRequired: ['agents:read:agents'],
        rolesRequired: [],
      },
    ],
  },

  // ===== WORKFLOWS =====
  {
    name: 'workflows',
    label: 'Workflows',
    icon: 'PuzzlePieceIcon',
    route: '/workflows',
    component: null,
    orderIndex: 5,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'workflows',
    permissionsRequired: ['workflows:read:workflows'],
    rolesRequired: [],
    children: [
      {
        name: 'workflows-list',
        label: 'All Workflows',
        icon: 'ListBulletIcon',
        route: '/workflows',
        component: 'WorkflowsList',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['workflows:read:workflows'],
        rolesRequired: [],
      },
      {
        name: 'workflows-create',
        label: 'Create Workflow',
        icon: 'PlusIcon',
        route: '/workflows/new',
        component: 'WorkflowCreate',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['workflows:create:workflows'],
        rolesRequired: [],
      },
      {
        name: 'workflows-templates',
        label: 'Templates',
        icon: 'RectangleStackIcon',
        route: '/workflows/templates',
        component: 'WorkflowTemplates',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['workflows:read:workflows'],
        rolesRequired: [],
      },
    ],
  },

  // ===== ANALYTICS =====
  {
    name: 'analytics',
    label: 'Analytics',
    icon: 'ChartPieIcon',
    route: '/analytics',
    component: 'Analytics',
    orderIndex: 6,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'analytics',
    permissionsRequired: ['analytics:read:dashboards'],
    rolesRequired: [],
    children: [
      {
        name: 'analytics-overview',
        label: 'Overview',
        icon: 'PresentationChartLineIcon',
        route: '/analytics/overview',
        component: 'AnalyticsOverview',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['analytics:read:dashboards'],
        rolesRequired: [],
      },
      {
        name: 'analytics-agents',
        label: 'Agent Performance',
        icon: 'ChartBarIcon',
        route: '/analytics/agents',
        component: 'AgentAnalytics',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['analytics:read:dashboards'],
        rolesRequired: [],
      },
      {
        name: 'analytics-financial',
        label: 'Financial Reports',
        icon: 'CurrencyDollarIcon',
        route: '/analytics/financial',
        component: 'FinancialAnalytics',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['accounting:read:reports'],
        rolesRequired: [],
      },
    ],
  },

  // ===== SEPARATOR =====
  {
    name: 'separator-1',
    label: '',
    icon: null,
    route: null,
    component: null,
    orderIndex: 7,
    showInSidebar: true,
    isActive: true,
    isSeparator: true,
    module: null,
    permissionsRequired: [],
    rolesRequired: [],
    children: [],
  },

  // ===== TEAM =====
  {
    name: 'team',
    label: 'Team',
    icon: 'UsersIcon',
    route: '/team',
    component: null,
    orderIndex: 8,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'users',
    permissionsRequired: ['users:read:users'],
    rolesRequired: [],
    children: [
      {
        name: 'team-members',
        label: 'Members',
        icon: 'UserGroupIcon',
        route: '/team/members',
        component: 'TeamMembers',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['users:read:users'],
        rolesRequired: [],
      },
      {
        name: 'team-invite',
        label: 'Invite Members',
        icon: 'UserPlusIcon',
        route: '/team/invite',
        component: 'TeamInvite',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['users:invite:users'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
      {
        name: 'team-roles',
        label: 'Roles & Permissions',
        icon: 'ShieldCheckIcon',
        route: '/team/roles',
        component: 'TeamRoles',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['roles:read:roles'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
    ],
  },

  // ===== SETTINGS =====
  {
    name: 'settings',
    label: 'Settings',
    icon: 'Cog6ToothIcon',
    route: '/settings',
    component: null,
    orderIndex: 9,
    showInSidebar: true,
    isActive: true,
    isSeparator: false,
    module: 'settings',
    permissionsRequired: [],
    rolesRequired: [],
    children: [
      {
        name: 'settings-profile',
        label: 'Profile',
        icon: 'UserCircleIcon',
        route: '/settings/profile',
        component: 'ProfileSettings',
        orderIndex: 1,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: [],
        rolesRequired: [],
      },
      {
        name: 'settings-preferences',
        label: 'Preferences',
        icon: 'AdjustmentsHorizontalIcon',
        route: '/settings/preferences',
        component: 'PreferencesSettings',
        orderIndex: 2,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: [],
        rolesRequired: [],
      },
      {
        name: 'settings-organization',
        label: 'Organization',
        icon: 'BuildingOfficeIcon',
        route: '/settings/organization',
        component: 'OrganizationSettings',
        orderIndex: 3,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['settings:read:organization'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
      {
        name: 'settings-billing',
        label: 'Billing',
        icon: 'CreditCardIcon',
        route: '/settings/billing',
        component: 'BillingSettings',
        orderIndex: 4,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['settings:read:billing'],
        rolesRequired: ['OWNER'],
      },
      {
        name: 'settings-api',
        label: 'API Keys',
        icon: 'KeyIcon',
        route: '/settings/api',
        component: 'APISettings',
        orderIndex: 5,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['settings:read:organization'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
      {
        name: 'settings-audit',
        label: 'Audit Logs',
        icon: 'ClipboardDocumentListIcon',
        route: '/settings/audit',
        component: 'AuditLogs',
        orderIndex: 6,
        showInSidebar: true,
        isActive: true,
        permissionsRequired: ['audit:read:logs'],
        rolesRequired: ['ADMIN', 'OWNER'],
      },
    ],
  },
];

// ==================== SEED FUNCTION ====================

export async function seedMenuItems() {
  console.log('🌱 Seeding menu items...');

  try {
    let totalCreated = 0;

    for (const menuItem of MENU_ITEMS) {
      const { children, ...parentData } = menuItem;

      // Create parent menu item
      const parent = await prisma.menuItem.upsert({
        where: { name: menuItem.name },
        update: {
          ...parentData,
          permissionsRequired: JSON.stringify(menuItem.permissionsRequired),
          rolesRequired: JSON.stringify(menuItem.rolesRequired),
        },
        create: {
          ...parentData,
          permissionsRequired: JSON.stringify(menuItem.permissionsRequired),
          rolesRequired: JSON.stringify(menuItem.rolesRequired),
        },
      });

      totalCreated++;

      // Create children if any
      if (children && children.length > 0) {
        for (const child of children) {
          await prisma.menuItem.upsert({
            where: { name: child.name },
            update: {
              ...child,
              parentId: parent.id,
              permissionsRequired: JSON.stringify(child.permissionsRequired || []),
              rolesRequired: JSON.stringify(child.rolesRequired || []),
            },
            create: {
              ...child,
              parentId: parent.id,
              permissionsRequired: JSON.stringify(child.permissionsRequired || []),
              rolesRequired: JSON.stringify(child.rolesRequired || []),
            },
          });
          totalCreated++;
        }
      }
    }

    console.log(`✅ Created ${totalCreated} menu items`);
    return totalCreated;
  } catch (error) {
    console.error('❌ Error seeding menu items:', error);
    throw error;
  }
}

export { prisma };
