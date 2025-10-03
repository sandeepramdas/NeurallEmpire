import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import OrganizationHeader from '@/components/OrganizationHeader';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [, setTheme] = useState<'light' | 'dark' | 'auto'>('light');

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    // Implement theme logic here
    // TODO: Apply theme to document root
    document.documentElement.setAttribute('data-theme', newTheme);
    console.log('Theme changed to:', newTheme);
  };

  return (
    <div className="min-h-screen bg-neural-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-neutral-200 h-screen sticky top-0">
          <div className="p-6">
            <h2 className="text-2xl font-display font-bold text-neural-900">
              🧠 Dashboard
            </h2>
          </div>
          <nav className="mt-6">
            <div className="px-3 space-y-1">
              <a href="/dashboard" className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-100">
                Dashboard
              </a>
              <a href="/dashboard/agents" className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-100">
                AI Agents
              </a>
              <a href="/dashboard/campaigns" className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-100">
                Campaigns
              </a>
              <a href="/dashboard/analytics" className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-100">
                Analytics
              </a>
              <a href="/dashboard/settings" className="block px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-100">
                Settings
              </a>
            </div>
          </nav>

          {/* User Profile & Organization Switcher */}
          <div className="absolute bottom-0 w-64 p-4 border-t border-neutral-200">
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
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Enhanced Organization Header */}
          <OrganizationHeader onThemeChange={handleThemeChange} />

          <main className="flex-1 p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;