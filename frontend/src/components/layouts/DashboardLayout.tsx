import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import OrganizationHeader from '@/components/OrganizationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import FloatingActionButton from '@/components/FloatingActionButton';
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  BarChart3,
  Settings as SettingsIcon,
  Workflow,
  Puzzle,
  FileText,
  BookOpen,
  Code,
  FileBarChart,
  MessageSquare,
  Webhook,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Building2,
  Users,
  CreditCard,
  Key,
  Shield,
  Palette,
  BarChart2,
  Globe,
  Database,
  GitBranch,
  Rocket,
  ShoppingCart,
  Receipt,
  DollarSign,
  Apple,
  Heart,
  Sparkles,
  Video
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  children?: NavItem[];
}

const DashboardLayout: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'platform': true, // Expand Platform V2 by default
  });

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    console.log('Theme changed to:', newTheme);
  };

  const isActive = (path: string) => {
    // For relative paths, check if current pathname ends with the path
    // Exact match for dashboard root to avoid highlighting when on sub-pages
    if (path === 'dashboard') {
      return location.pathname.endsWith('/dashboard');
    }
    return location.pathname.includes(`/${path}`) || location.pathname.endsWith(`/${path}`);
  };

  const navItems: NavItem[] = [
    {
      path: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      path: 'automation',
      label: 'Automation',
      icon: Workflow,
      children: [
        { path: 'agents', label: 'AI Agents', icon: Bot },
        { path: 'agent-api-keys', label: 'Agent API Keys', icon: Key },
        { path: 'workflows', label: 'Workflows', icon: Workflow },
        { path: 'templates', label: 'Templates', icon: FileText },
      ],
    },
    {
      path: 'marketing',
      label: 'Marketing',
      icon: Megaphone,
      children: [
        { path: 'campaigns', label: 'Campaigns', icon: Megaphone },
        { path: 'messages', label: 'Messages', icon: MessageSquare },
      ],
    },
    {
      path: 'sales',
      label: 'Sales',
      icon: DollarSign,
      children: [
        { path: 'sales-order', label: 'Sales Order', icon: ShoppingCart },
        { path: 'sales-invoice', label: 'Sales Invoice', icon: Receipt },
      ],
    },
    {
      path: 'healthcare',
      label: 'Healthcare',
      icon: Heart,
      children: [
        { path: 'patient-diet-plan', label: 'Patient Diet Plan', icon: Apple },
      ],
    },
    {
      path: 'video-agents',
      label: 'Video AI Agents',
      icon: Video,
    },
    {
      path: 'insights',
      label: 'Analytics & Reports',
      icon: BarChart3,
      children: [
        { path: 'analytics', label: 'Analytics', icon: BarChart3 },
        { path: 'reports', label: 'Reports', icon: FileBarChart },
      ],
    },
    {
      path: 'developer',
      label: 'Developer',
      icon: Code,
      children: [
        { path: 'api-playground', label: 'API Playground', icon: Code },
        { path: 'webhooks', label: 'Webhooks', icon: Webhook },
        { path: 'integrations', label: 'Integrations', icon: Puzzle },
      ],
    },
    {
      path: 'docs',
      label: 'Knowledge Base',
      icon: BookOpen
    },
    {
      path: 'platform',
      label: 'Platform V2',
      icon: Rocket,
      children: [
        { path: 'entities', label: 'Entity Definitions', icon: Database },
        { path: 'hierarchy', label: 'Org Hierarchy', icon: GitBranch },
        { path: 'code-artifacts', label: 'Code Artifacts', icon: Code },
      ],
    },
    {
      path: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      children: [
        { path: 'settings/organization', label: 'Organization', icon: Building2 },
        { path: 'settings/team', label: 'Team Members', icon: Users },
        { path: 'settings/billing', label: 'Billing', icon: CreditCard },
        { path: 'settings/api-keys', label: 'API Keys', icon: Key },
        { path: 'settings/ai-models', label: 'AI Models', icon: Sparkles },
        { path: 'settings/providers', label: 'AI Providers', icon: Database },
        { path: 'settings/security', label: 'Security', icon: Shield },
        { path: 'settings/branding', label: 'Branding', icon: Palette },
        { path: 'settings/analytics', label: 'Usage Analytics', icon: BarChart2 },
        { path: 'settings/domains', label: 'Domains', icon: Globe },
      ],
    },
  ];

  const toggleSubmenu = (path: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-all"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-200" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />}
        </button>

        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-900 shadow-sm border-r border-neutral-200 dark:border-gray-800 h-screen sticky top-0 transition-all duration-300 flex flex-col ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40' : 'hidden lg:block'
        }`}>
          {/* Header: Organization Info */}
          <div className="p-4 border-b border-neutral-200 dark:border-gray-800">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 avatar-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {user?.organization?.name?.charAt(0) || 'N'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user?.organization?.name || 'NeurallEmpire'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.organization?.planType || 'FREE'} Plan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 avatar-gradient rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {user?.organization?.name?.charAt(0) || 'N'}
                  </span>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Navigation - with smooth scrolling */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 scroll-smooth"
            style={{
              maxHeight: 'calc(100vh - 180px)'
            }}
          >
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedMenus[item.path];

                if (hasChildren) {
                  return (
                    <div key={item.path} className="mb-1">
                      <button
                        onClick={() => toggleSubmenu(item.path)}
                        className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all ${
                          active
                            ? 'menu-active font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 font-medium'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'icon-active' : 'text-gray-500 dark:text-gray-400'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left text-sm">{item.label}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </button>
                      {!sidebarCollapsed && isExpanded && item.children && (
                        <div className="ml-4 mt-1 mb-2 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.path);
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={`flex items-center px-3 py-2 rounded-lg transition-all text-sm ${
                                  childActive
                                    ? 'menu-active-child font-semibold border-l-2 -ml-px'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                              >
                                <ChildIcon className={`w-4 h-4 mr-2.5 ${childActive ? 'icon-active' : 'text-gray-400 dark:text-gray-500'}`} />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all mb-1 ${
                      active
                        ? 'menu-active font-semibold shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 font-medium'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'icon-active' : 'text-gray-500 dark:text-gray-400'}`} />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                    {active && !sidebarCollapsed && (
                      <div className="ml-auto w-1.5 h-6 active-indicator rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Organization Header */}
          <OrganizationHeader onThemeChange={handleThemeChange} />

          <main className="flex-1 p-8 overflow-auto bg-gray-50 dark:bg-gray-900">
            <Breadcrumbs />
            <Outlet />

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Product</h3>
                  <ul className="space-y-2">
                    <li><Link to="agents" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">AI Agents</Link></li>
                    <li><Link to="campaigns" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Campaigns</Link></li>
                    <li><Link to="workflows" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Workflows</Link></li>
                    <li><Link to="integrations" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Integrations</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Resources</h3>
                  <ul className="space-y-2">
                    <li><Link to="docs" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Documentation</Link></li>
                    <li><Link to="api-playground" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">API Reference</Link></li>
                    <li><Link to="templates" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Templates</Link></li>
                    <li><a href="https://blog.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Blog</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Support</h3>
                  <ul className="space-y-2">
                    <li><Link to="support" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Help Center</Link></li>
                    <li><a href="https://status.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">System Status</a></li>
                    <li><a href="https://community.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Community</a></li>
                    <li><a href="mailto:support@neurallempire.com" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Contact Support</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Legal</h3>
                  <ul className="space-y-2">
                    <li><a href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Privacy Policy</a></li>
                    <li><a href="/terms" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Terms of Service</a></li>
                    <li><a href="/security" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Security</a></li>
                    <li><a href="/cookies" className="text-sm text-gray-600 dark:text-gray-400 link-hover transition-colors">Cookie Policy</a></li>
                  </ul>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 NeurallEmpire. All rights reserved.</p>
                <div className="flex items-center space-x-2">
                  <a href="https://status.neurallempire.com" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-500 dark:text-gray-400 link-hover transition-colors">
                    <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                    All Systems Operational
                  </a>
                </div>
              </div>
            </footer>
          </main>

          {/* Floating Action Button */}
          <FloatingActionButton />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;