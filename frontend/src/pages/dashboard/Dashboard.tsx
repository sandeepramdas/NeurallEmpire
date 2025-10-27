import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { dashboardService, DashboardStats, ChartData, RecentActivity } from '@/services/dashboard.service';
import {
  Activity,
  Bot,
  Users,
  Workflow,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Clock,
  Target,
  Calendar,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const { user, organization } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDays]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, chartsData, activityData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getChartData(selectedDays),
        dashboardService.getRecentActivity(10)
      ]);
      setStats(statsData);
      setChartData(chartsData);
      setActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {organization?.name} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.overview.totalAgents}
              </p>
              <div className="flex items-center mt-2">
                {stats.growth.agentsGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${stats.growth.agentsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(stats.growth.agentsGrowth).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Bot className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Agents</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.overview.activeAgents}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.overview.totalAgents > 0
                  ? `${Math.round((stats.overview.activeAgents / stats.overview.totalAgents) * 100)}% of total`
                  : '0% of total'}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Executions Today</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatNumber(stats.usage.agentExecutionsToday)}
              </p>
              <div className="flex items-center mt-2">
                {stats.growth.executionsGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${stats.growth.executionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(stats.growth.executionsGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost This Month</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(stats.performance.totalCostThisMonth)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.usage.agentExecutionsThisMonth} executions
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avg Response Time</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.performance.avgAgentResponseTime}ms
          </p>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((3000 - stats.performance.avgAgentResponseTime) / 30, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Success Rate</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.performance.avgSuccessRate}%
          </p>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${stats.performance.avgSuccessRate}%` }}
            ></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Members</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.overview.totalUsers}
          </p>
          <div className="flex items-center mt-2">
            {stats.growth.usersGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${stats.growth.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(stats.growth.usersGrowth).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">growth</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Executions Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Agent Executions Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData?.agentExecutionsTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Agent Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Agent Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData?.agentPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Bar dataKey="successRate" fill="#10b981" name="Success Rate (%)" />
              <Bar dataKey="runs" fill="#3b82f6" name="Total Runs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Usage Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Model Usage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData?.modelUsage || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.model}: ${entry.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData?.modelUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Activity
            </h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {activity.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`p-2 rounded-full ${
                  item.type === 'agent_created' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  item.type === 'agent_executed' ? 'bg-green-100 dark:bg-green-900/30' :
                  item.type === 'user_joined' ? 'bg-purple-100 dark:bg-purple-900/30' :
                  'bg-gray-100 dark:bg-gray-900/30'
                }`}>
                  {item.type === 'agent_created' && <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  {item.type === 'agent_executed' && <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />}
                  {item.type === 'user_joined' && <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                  {item.type === 'workflow_executed' && <Workflow className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{item.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(item.timestamp)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href={`/org/${organization?.slug}/agents`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <div>
              <p className="font-semibold">Create Agent</p>
              <p className="text-sm opacity-90">Build new AI agent</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href={`/org/${organization?.slug}/workflows`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-all"
          >
            <div>
              <p className="font-semibold">New Workflow</p>
              <p className="text-sm opacity-90">Automate tasks</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href={`/org/${organization?.slug}/analytics`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            <div>
              <p className="font-semibold">View Analytics</p>
              <p className="text-sm opacity-90">Detailed insights</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href={`/org/${organization?.slug}/settings`}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg text-white hover:from-orange-600 hover:to-orange-700 transition-all"
          >
            <div>
              <p className="font-semibold">Settings</p>
              <p className="text-sm opacity-90">Configure platform</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
