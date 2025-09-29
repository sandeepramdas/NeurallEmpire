import React from 'react';
import { Outlet } from 'react-router-dom';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-neural-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-neutral-200">
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
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;