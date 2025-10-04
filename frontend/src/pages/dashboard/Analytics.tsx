import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
  Download,
  Calendar,
  ArrowUpRight,
  BarChart3,
  PieChart,
  LineChart,
  Clock
} from 'lucide-react';

type DateRange = '7D' | '30D' | '90D' | '1Y' | 'Custom';

interface MetricCard {
  title: string;
  value: string;
  trend: number;
  icon: React.ElementType;
  color: string;
}

interface TopAgent {
  name: string;
  runs: number;
  successRate: number;
}

interface TopCampaign {
  name: string;
  sent: number;
  responseRate: number;
}

interface Activity {
  type: 'agent' | 'campaign' | 'user';
  message: string;
  time: string;
}

const Analytics: React.FC = () => {
  const { organization } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>('30D');

  // Mock data for metrics
  const metrics: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      trend: 12.5,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Active Users',
      value: '2,834',
      trend: 8.2,
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'API Calls Today',
      value: '12,458',
      trend: -3.1,
      icon: Activity,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      trend: 5.7,
      icon: Target,
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  // Mock data for top agents
  const topAgents: TopAgent[] = [
    { name: 'Customer Support Bot', runs: 1245, successRate: 98.5 },
    { name: 'Lead Qualifier', runs: 987, successRate: 95.2 },
    { name: 'Email Responder', runs: 756, successRate: 97.8 },
    { name: 'Data Analyzer', runs: 623, successRate: 92.1 },
    { name: 'Content Generator', runs: 512, successRate: 94.6 }
  ];

  // Mock data for top campaigns
  const topCampaigns: TopCampaign[] = [
    { name: 'Spring Product Launch', sent: 5420, responseRate: 24.3 },
    { name: 'Customer Re-engagement', sent: 3890, responseRate: 18.7 },
    { name: 'Newsletter Q1 2025', sent: 3245, responseRate: 31.2 },
    { name: 'Abandoned Cart Recovery', sent: 2156, responseRate: 42.8 },
    { name: 'New Feature Announcement', sent: 1987, responseRate: 28.4 }
  ];

  // Mock data for recent activity
  const recentActivity: Activity[] = [
    { type: 'agent', message: 'Customer Support Bot completed 45 interactions', time: '2 minutes ago' },
    { type: 'campaign', message: 'Spring Product Launch sent to 234 leads', time: '15 minutes ago' },
    { type: 'user', message: '3 new users signed up', time: '32 minutes ago' },
    { type: 'agent', message: 'Lead Qualifier processed 89 new leads', time: '1 hour ago' },
    { type: 'campaign', message: 'Newsletter Q1 2025 achieved 31% open rate', time: '2 hours ago' },
    { type: 'user', message: 'Premium plan upgraded by 2 users', time: '3 hours ago' },
    { type: 'agent', message: 'Email Responder handled 156 emails', time: '4 hours ago' }
  ];

  const dateRanges: DateRange[] = ['7D', '30D', '90D', '1Y', 'Custom'];

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'agent':
        return <Activity className="w-4 h-4" />;
      case 'campaign':
        return <Target className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'agent':
        return 'bg-blue-100 text-blue-600';
      case 'campaign':
        return 'bg-purple-100 text-purple-600';
      case 'user':
        return 'bg-green-100 text-green-600';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-neural-900">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 mt-2">
            {organization?.name} - Performance Overview
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neutral-500" />
          <div className="flex bg-neutral-100 rounded-lg p-1">
            {dateRanges.map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white text-neural-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.trend > 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendIcon className="w-4 h-4" />
                  {Math.abs(metric.trend)}%
                </div>
              </div>
              <h3 className="text-neutral-600 text-sm font-medium mb-1">
                {metric.title}
              </h3>
              <p className="text-3xl font-bold text-neural-900">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-neural-900">
                Revenue Over Time
              </h2>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg border-2 border-dashed border-primary-200">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-primary-400 mx-auto mb-2" />
              <p className="text-neutral-600 text-sm">Line Chart Placeholder</p>
              <p className="text-neutral-500 text-xs mt-1">Revenue trend visualization</p>
            </div>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-neural-900">
                User Growth
              </h2>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="text-neutral-600 text-sm">Area Chart Placeholder</p>
              <p className="text-neutral-500 text-xs mt-1">User growth visualization</p>
            </div>
          </div>
        </div>

        {/* Agent Usage Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-neural-900">
                Agent Usage
              </h2>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <p className="text-neutral-600 text-sm">Bar Chart Placeholder</p>
              <p className="text-neutral-500 text-xs mt-1">Agent usage by type</p>
            </div>
          </div>
        </div>

        {/* Campaign Performance Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-neural-900">
                Campaign Performance
              </h2>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border-2 border-dashed border-orange-200">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-orange-400 mx-auto mb-2" />
              <p className="text-neutral-600 text-sm">Pie Chart Placeholder</p>
              <p className="text-neutral-500 text-xs mt-1">Campaign distribution</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Agents */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neural-900">
              Top Performing Agents
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Agent Name
                  </th>
                  <th className="text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Runs
                  </th>
                  <th className="text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topAgents.map((agent, index) => (
                  <tr key={index} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 text-sm text-neural-900 font-medium">
                      {agent.name}
                    </td>
                    <td className="py-3 text-sm text-neutral-600 text-right">
                      {agent.runs.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {agent.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neural-900">
              Top Performing Campaigns
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Campaign Name
                  </th>
                  <th className="text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Sent
                  </th>
                  <th className="text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider pb-3">
                    Response Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topCampaigns.map((campaign, index) => (
                  <tr key={index} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 text-sm text-neural-900 font-medium">
                      {campaign.name}
                    </td>
                    <td className="py-3 text-sm text-neutral-600 text-right">
                      {campaign.sent.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {campaign.responseRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neural-900">
              Recent Activity
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neural-900 font-medium">
                    {activity.message}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span className="text-xs text-neutral-500">
                      {activity.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="card">
          <h2 className="text-lg font-semibold text-neural-900 mb-6">
            Export Data
          </h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-neural-900">Export to CSV</p>
                  <p className="text-xs text-neutral-500">Download as spreadsheet</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-neural-900">Export to PDF</p>
                  <p className="text-xs text-neutral-500">Download as document</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-neural-900">Export to Excel</p>
                  <p className="text-xs text-neutral-500">Download as workbook</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600" />
            </button>
          </div>

          <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="text-sm font-semibold text-primary-900 mb-2">
              Scheduled Reports
            </h3>
            <p className="text-xs text-primary-700 mb-3">
              Get analytics delivered to your email automatically
            </p>
            <button className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              Set Up Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
