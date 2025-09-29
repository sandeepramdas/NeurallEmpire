import React from 'react';
import { useAuthStore } from '@/store/authStore';

const Dashboard: React.FC = () => {
  const { user, organization } = useAuthStore();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neural-900">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-neutral-600 mt-2">
          Organization: {organization?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-neural-900 mb-2">Total Agents</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-neural-900 mb-2">Active Campaigns</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-neural-900 mb-2">Total Leads</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-neural-900 mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-purple-600">$0</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-semibold text-neural-900 mb-4">
          🎉 Your SaaS Platform is Ready!
        </h2>
        <p className="text-neutral-600 mb-4">
          Your NeurallEmpire has been successfully transformed into a modern SaaS platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">✅ Backend Ready</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• TypeScript + Express server</li>
              <li>• Multi-tenant architecture</li>
              <li>• JWT authentication</li>
              <li>• Prisma database schema</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">✅ Frontend Ready</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• React 18 + TypeScript</li>
              <li>• Tailwind CSS + Modern UI</li>
              <li>• Zustand state management</li>
              <li>• React Router v6</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;