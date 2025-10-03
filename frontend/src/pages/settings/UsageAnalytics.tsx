import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  Database,
  DollarSign,
  Activity,
  Zap,
} from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: React.ElementType;
}

interface APIEndpoint {
  endpoint: string;
  requests: number;
  avgResponseTime: string;
  errorRate: string;
  lastUsed: string;
}

interface TopUser {
  id: string;
  name: string;
  email: string;
  requests: number;
  lastActive: string;
}

type DateRange = '7' | '30' | '90';

const UsageAnalytics: React.FC = () => {
  const { } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>('30');

  // Mock metrics data
  const metrics: Metric[] = [
    {
      label: 'Total Requests',
      value: '1,234,567',
      change: 12.5,
      trend: 'up',
      icon: Activity,
    },
    {
      label: 'Active Users',
      value: '2,456',
      change: 8.3,
      trend: 'up',
      icon: Users,
    },
    {
      label: 'Storage Used',
      value: '45.2 GB',
      change: -3.2,
      trend: 'down',
      icon: Database,
    },
    {
      label: 'Total Costs',
      value: '$3,245.80',
      change: 15.7,
      trend: 'up',
      icon: DollarSign,
    },
  ];

  // Mock API endpoint usage data
  const apiEndpoints: APIEndpoint[] = [
    {
      endpoint: '/api/v1/users',
      requests: 125000,
      avgResponseTime: '45ms',
      errorRate: '0.12%',
      lastUsed: '2 minutes ago',
    },
    {
      endpoint: '/api/v1/organizations',
      requests: 98500,
      avgResponseTime: '62ms',
      errorRate: '0.08%',
      lastUsed: '5 minutes ago',
    },
    {
      endpoint: '/api/v1/auth/login',
      requests: 87300,
      avgResponseTime: '120ms',
      errorRate: '1.2%',
      lastUsed: '1 minute ago',
    },
    {
      endpoint: '/api/v1/data/export',
      requests: 45200,
      avgResponseTime: '890ms',
      errorRate: '0.05%',
      lastUsed: '10 minutes ago',
    },
    {
      endpoint: '/api/v1/analytics',
      requests: 32100,
      avgResponseTime: '250ms',
      errorRate: '0.15%',
      lastUsed: '3 minutes ago',
    },
  ];

  // Mock top users data
  const topUsers: TopUser[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      requests: 45230,
      lastActive: '5 minutes ago',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      requests: 38750,
      lastActive: '15 minutes ago',
    },
    {
      id: '3',
      name: 'Robert Johnson',
      email: 'robert.j@example.com',
      requests: 32100,
      lastActive: '1 hour ago',
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      requests: 28900,
      lastActive: '2 hours ago',
    },
    {
      id: '5',
      name: 'Michael Brown',
      email: 'michael.b@example.com',
      requests: 25600,
      lastActive: '3 hours ago',
    },
  ];

  const handleExportData = (format: 'csv' | 'pdf') => {
    console.log(`Exporting data as ${format}`);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7':
        return 'Last 7 Days';
      case '30':
        return 'Last 30 Days';
      case '90':
        return 'Last 90 Days';
      default:
        return 'Last 30 Days';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage & Analytics</h1>
            <p className="text-gray-600 mt-2">Monitor your organization's usage and performance metrics</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1">
              <Calendar className="w-4 h-4 text-gray-500 ml-2" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-transparent border-0 focus:ring-0 cursor-pointer"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
            {/* Export Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleExportData('csv')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => handleExportData('pdf')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <div
                  className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    metric.trend === 'up'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500 mt-1">vs previous period</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Request Volume Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
              Request Volume
            </h3>
            <span className="text-sm text-gray-500">{getDateRangeLabel()}</span>
          </div>
          <div className="h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center border border-indigo-100">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-indigo-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Request Volume Chart</p>
              <p className="text-gray-400 text-xs mt-1">Chart visualization would render here</p>
            </div>
          </div>
        </div>

        {/* Response Time Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-indigo-600" />
              Response Time
            </h3>
            <span className="text-sm text-gray-500">{getDateRangeLabel()}</span>
          </div>
          <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center border border-green-100">
            <div className="text-center">
              <Zap className="w-16 h-16 text-green-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Response Time Chart</p>
              <p className="text-gray-400 text-xs mt-1">Chart visualization would render here</p>
            </div>
          </div>
        </div>

        {/* Error Rate Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-600" />
              Error Rate
            </h3>
            <span className="text-sm text-gray-500">{getDateRangeLabel()}</span>
          </div>
          <div className="h-64 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center border border-red-100">
            <div className="text-center">
              <Activity className="w-16 h-16 text-red-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Error Rate Chart</p>
              <p className="text-gray-400 text-xs mt-1">Chart visualization would render here</p>
            </div>
          </div>
        </div>

        {/* Storage Usage Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="w-5 h-5 mr-2 text-indigo-600" />
              Storage Usage
            </h3>
            <span className="text-sm text-gray-500">{getDateRangeLabel()}</span>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border border-blue-100">
            <div className="text-center">
              <Database className="w-16 h-16 text-blue-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Storage Usage Chart</p>
              <p className="text-gray-400 text-xs mt-1">Chart visualization would render here</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoint Usage Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          API Endpoint Usage
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Endpoint</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Avg Response</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Error Rate</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Last Used</th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map((endpoint, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <code className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {endpoint.endpoint}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {endpoint.requests.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{endpoint.avgResponseTime}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-sm font-medium ${
                        parseFloat(endpoint.errorRate) < 0.5
                          ? 'text-green-600'
                          : parseFloat(endpoint.errorRate) < 1
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {endpoint.errorRate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{endpoint.lastUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users by Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Top Users by Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Requests</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user, index) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {user.requests.toLocaleString()}
                      </span>
                      <div className="ml-2 flex-1 max-w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{
                              width: `${(user.requests / topUsers[0].requests) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{user.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
