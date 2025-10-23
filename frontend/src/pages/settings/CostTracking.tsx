import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Activity,
  Zap,
  RefreshCw,
  Target,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/services/api';

interface CostOverview {
  totalCost: number;
  totalApiCalls: number;
  totalTokens: number;
  period: string;
  averageCostPerCall: number;
}

interface CostByModel {
  modelId: string;
  modelName: string;
  provider: string;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  apiCalls: number;
}

interface ChartDataPoint {
  date: string;
  cost: number;
  calls: number;
}

interface CostProjections {
  next7Days: number;
  next30Days: number;
  next90Days: number;
}

interface ProjectionInsights {
  avgDailyUsage: number;
  avgCostPerCall: number;
  trend: 'increasing' | 'stable' | 'low';
}

const CostTracking: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const [costOverview, setCostOverview] = useState<CostOverview | null>(null);
  const [costByModel, setCostByModel] = useState<CostByModel[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [projections, setProjections] = useState<CostProjections | null>(null);
  const [insights, setInsights] = useState<ProjectionInsights | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, projectionsRes] = await Promise.all([
        api.get(`/cost-tracking/overview?period=${period}`),
        api.get('/cost-tracking/projections'),
      ]);

      if (overviewRes.data.success) {
        const data = overviewRes.data.data;
        setCostOverview(data.overview);
        setCostByModel(data.costByModel || []);
        setChartData(data.chartData || []);
      }

      if (projectionsRes.data.success) {
        setProjections(projectionsRes.data.projections);
        setInsights(projectionsRes.data.insights);
      }
    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  const pieData = costByModel.slice(0, 6).map((model) => ({
    name: model.modelName,
    value: model.totalCost,
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">
            Cost Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor AI model costs, set budget alerts, and optimize spending
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</h3>
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(costOverview?.totalCost || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Across all AI models
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">API Calls</h3>
            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {costOverview?.totalApiCalls.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total requests made
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cost/Call</h3>
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(costOverview?.averageCostPerCall || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Per API request
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</h3>
            <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {((costOverview?.totalTokens || 0) / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tokens processed
          </p>
        </div>
      </div>

      {/* Projections */}
      {projections && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Cost Projections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Next 7 Days</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(projections.next7Days)}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-900/50">
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Next 30 Days</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(projections.next30Days)}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900/50">
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Next 90 Days</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {formatCurrency(projections.next90Days)}
              </p>
            </div>
          </div>
          {insights && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">Insights</p>
                <p>
                  Average daily usage: <strong>{insights.avgDailyUsage.toFixed(1)} calls/day</strong> •
                  Trend: <strong className={
                    insights.trend === 'increasing' ? 'text-orange-600 dark:text-orange-400' :
                    insights.trend === 'stable' ? 'text-green-600 dark:text-green-400' :
                    'text-blue-600 dark:text-blue-400'
                  }>{insights.trend}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daily Cost Trend
            </h2>
            <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" opacity={0.3} />
              <XAxis
                dataKey="date"
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <YAxis className="text-gray-600 dark:text-gray-400" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)',
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Distribution Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cost by Model
            </h2>
            <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)',
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Cost Breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Detailed Cost Breakdown
          </h2>
          <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  API Calls
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost/Call
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {costByModel.map((model) => (
                <tr
                  key={model.modelId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {model.modelName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                    {model.apiCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                    {(model.totalTokens / 1000).toFixed(1)}K
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(model.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(model.apiCalls > 0 ? model.totalCost / model.apiCalls : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {costByModel.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No cost data available for this period</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Start using AI models to track costs here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostTracking;
