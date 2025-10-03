import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
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
  Star,
  Clock,
  Menu,
  X
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    console.log('Theme changed to:', newTheme);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/agents', label: 'AI Agents', icon: Bot },
    { path: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
    { path: '/dashboard/workflows', label: 'Workflows', icon: Workflow },
    { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
    { path: '/dashboard/integrations', label: 'Integrations', icon: Puzzle },
    { path: '/dashboard/templates', label: 'Templates', icon: FileText },
    { path: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { path: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
    { path: '/dashboard/docs', label: 'Knowledge Base', icon: BookOpen },
    { path: '/dashboard/api-playground', label: 'API Playground', icon: Code },
    { path: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-neural-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-sm border-r border-neutral-200 h-screen sticky top-0 transition-all duration-300 ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40' : 'hidden lg:block'
        }`}>
          <div className="p-6 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-2xl font-display font-bold text-neural-900">
                🧠 Dashboard
              </h2>
            )}
            {sidebarCollapsed && (
              <h2 className="text-2xl">🧠</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md hover:bg-neutral-100 text-neutral-600"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Recent & Favorites Section */}
          {!sidebarCollapsed && (
            <div className="px-3 mb-4">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2">
                Quick Access
              </div>
              <div className="space-y-1">
                <Link
                  to="/dashboard"
                  className="flex items-center px-3 py-2 rounded-md text-sm text-neutral-600 hover:bg-neutral-100"
                >
                  <Star className="w-4 h-4 mr-3 text-yellow-500" />
                  Favorites
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center px-3 py-2 rounded-md text-sm text-neutral-600 hover:bg-neutral-100"
                >
                  <Clock className="w-4 h-4 mr-3 text-blue-500" />
                  Recent
                </Link>
              </div>
            </div>
          )}

          <nav className="mt-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <div className="px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-indigo-600' : ''}`} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                    {active && !sidebarCollapsed && (
                      <div className="ml-auto w-1 h-6 bg-indigo-600 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Profile & Organization Switcher */}
          <div className={`absolute bottom-0 ${sidebarCollapsed ? 'w-20' : 'w-64'} p-4 border-t border-neutral-200 transition-all duration-300`}>
            {!sidebarCollapsed ? (
              <div className="space-y-3">
                {/* Organization Switcher */}
                <OrganizationSwitcher
                  currentOrganization={user?.organization ? {
                    id: user.organization.id,
                    name: user.organization.name,
                    slug: user.organization.slug
                  } : undefined}
                />

                {/* User Profile */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user?.firstName || user?.email}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user?.role}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    title="Logout"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Organization Header */}
          <OrganizationHeader onThemeChange={handleThemeChange} />

          <main className="flex-1 p-8 overflow-auto">
            <Breadcrumbs />
            <Outlet />

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Product</h3>
                  <ul className="space-y-2">
                    <li><Link to="/dashboard/agents" className="text-sm text-gray-600 hover:text-indigo-600">AI Agents</Link></li>
                    <li><Link to="/dashboard/campaigns" className="text-sm text-gray-600 hover:text-indigo-600">Campaigns</Link></li>
                    <li><Link to="/dashboard/workflows" className="text-sm text-gray-600 hover:text-indigo-600">Workflows</Link></li>
                    <li><Link to="/dashboard/integrations" className="text-sm text-gray-600 hover:text-indigo-600">Integrations</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Resources</h3>
                  <ul className="space-y-2">
                    <li><Link to="/dashboard/docs" className="text-sm text-gray-600 hover:text-indigo-600">Documentation</Link></li>
                    <li><Link to="/dashboard/api-playground" className="text-sm text-gray-600 hover:text-indigo-600">API Reference</Link></li>
                    <li><Link to="/dashboard/templates" className="text-sm text-gray-600 hover:text-indigo-600">Templates</Link></li>
                    <li><a href="https://blog.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-indigo-600">Blog</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Support</h3>
                  <ul className="space-y-2">
                    <li><Link to="/dashboard/support" className="text-sm text-gray-600 hover:text-indigo-600">Help Center</Link></li>
                    <li><a href="https://status.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-indigo-600">System Status</a></li>
                    <li><a href="https://community.neurallempire.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-indigo-600">Community</a></li>
                    <li><a href="mailto:support@neurallempire.com" className="text-sm text-gray-600 hover:text-indigo-600">Contact Support</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Legal</h3>
                  <ul className="space-y-2">
                    <li><a href="/privacy" className="text-sm text-gray-600 hover:text-indigo-600">Privacy Policy</a></li>
                    <li><a href="/terms" className="text-sm text-gray-600 hover:text-indigo-600">Terms of Service</a></li>
                    <li><a href="/security" className="text-sm text-gray-600 hover:text-indigo-600">Security</a></li>
                    <li><a href="/cookies" className="text-sm text-gray-600 hover:text-indigo-600">Cookie Policy</a></li>
                  </ul>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-500">© 2025 NeurallEmpire. All rights reserved.</p>
                <div className="flex items-center space-x-2">
                  <a href="https://status.neurallempire.com" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-gray-500 hover:text-indigo-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
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