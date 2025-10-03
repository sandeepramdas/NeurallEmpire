import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  FileText,
  Plus,
  Download,
  Share2,
  Calendar,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Clock,
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  Mail,
  Eye,
  Edit,
  Trash2,
  Play,
  X,
  Check,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'agents' | 'campaigns' | 'api' | 'users' | 'revenue';
  chartType: 'line' | 'bar' | 'pie' | 'table';
  dateRange: string;
  schedule?: string;
  lastRun: string;
  createdBy: string;
  isTemplate?: boolean;
}

interface ReportMetric {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
}

const Reports: React.FC = () => {
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Report Builder State
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedDimension, setSelectedDimension] = useState('time');
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'pie' | 'table'>('bar');

  const reports: Report[] = [
    {
      id: '1',
      name: 'Monthly Performance Report',
      description: 'Comprehensive overview of all key metrics for the month',
      type: 'agents',
      chartType: 'line',
      dateRange: 'Last 30 days',
      schedule: 'Monthly',
      lastRun: '2025-10-01',
      createdBy: 'System',
      isTemplate: true,
    },
    {
      id: '2',
      name: 'Campaign Engagement Analysis',
      description: 'Detailed analysis of campaign performance and user engagement',
      type: 'campaigns',
      chartType: 'bar',
      dateRange: 'Last 7 days',
      schedule: 'Weekly',
      lastRun: '2025-10-03',
      createdBy: user?.email || 'You',
    },
    {
      id: '3',
      name: 'API Usage Statistics',
      description: 'API endpoint usage, response times, and error rates',
      type: 'api',
      chartType: 'table',
      dateRange: 'Last 30 days',
      lastRun: '2025-10-04',
      createdBy: user?.email || 'You',
    },
    {
      id: '4',
      name: 'User Growth Report',
      description: 'Track user acquisition and retention metrics',
      type: 'users',
      chartType: 'line',
      dateRange: 'Last 90 days',
      schedule: 'Monthly',
      lastRun: '2025-10-01',
      createdBy: 'System',
      isTemplate: true,
    },
    {
      id: '5',
      name: 'Revenue Analytics',
      description: 'Financial metrics and revenue trends',
      type: 'revenue',
      chartType: 'bar',
      dateRange: 'Last 30 days',
      lastRun: '2025-10-02',
      createdBy: user?.email || 'You',
    },
    {
      id: '6',
      name: 'Agent Performance Breakdown',
      description: 'Detailed performance metrics for all agents',
      type: 'agents',
      chartType: 'pie',
      dateRange: 'Last 7 days',
      lastRun: '2025-10-04',
      createdBy: user?.email || 'You',
    },
  ];

  const templates: Report[] = reports.filter((r) => r.isTemplate);

  const metrics: ReportMetric[] = [
    { id: 'agents_created', name: 'Agents Created', category: 'Agents', icon: Users },
    { id: 'agents_active', name: 'Active Agents', category: 'Agents', icon: Zap },
    { id: 'campaigns_sent', name: 'Campaigns Sent', category: 'Campaigns', icon: Mail },
    { id: 'campaigns_opened', name: 'Campaign Opens', category: 'Campaigns', icon: Eye },
    { id: 'api_calls', name: 'API Calls', category: 'API', icon: Zap },
    { id: 'api_errors', name: 'API Errors', category: 'API', icon: TrendingUp },
    { id: 'users_new', name: 'New Users', category: 'Users', icon: Users },
    { id: 'users_active', name: 'Active Users', category: 'Users', icon: Users },
    { id: 'revenue_total', name: 'Total Revenue', category: 'Revenue', icon: DollarSign },
    { id: 'revenue_mrr', name: 'Monthly Recurring Revenue', category: 'Revenue', icon: DollarSign },
  ];

  const filteredReports =
    filterType === 'all' ? reports : reports.filter((report) => report.type === filterType);

  const handleCreateReport = () => {
    console.log('Creating report:', {
      name: reportName,
      description: reportDescription,
      metrics: selectedMetrics,
      dimension: selectedDimension,
      chartType: selectedChartType,
    });
    setIsCreateModalOpen(false);
    // Reset form
    setReportName('');
    setReportDescription('');
    setSelectedMetrics([]);
    setSelectedDimension('time');
    setSelectedChartType('bar');
  };

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    console.log(`Exporting report as ${format}`);
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'agents':
        return 'bg-blue-100 text-blue-700';
      case 'campaigns':
        return 'bg-purple-100 text-purple-700';
      case 'api':
        return 'bg-green-100 text-green-700';
      case 'users':
        return 'bg-yellow-100 text-yellow-700';
      case 'revenue':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'line':
        return LineChart;
      case 'bar':
        return BarChart3;
      case 'pie':
        return PieChart;
      case 'table':
        return Table;
      default:
        return BarChart3;
    }
  };

  // Mock chart data visualization
  const renderMockChart = (chartType: string) => {
    const ChartIcon = getChartIcon(chartType);
    return (
      <div className="h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center border border-indigo-100">
        <div className="text-center">
          <ChartIcon className="w-16 h-16 text-indigo-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart Visualization
          </p>
          <p className="text-gray-400 text-xs mt-1">Sample data would render here</p>
        </div>
      </div>
    );
  };

  if (selectedReport) {
    const ChartIcon = getChartIcon(selectedReport.chartType);

    return (
      <div className="max-w-7xl mx-auto">
        {/* Report Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSelectedReport(null)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedReport.name}</h1>
              <p className="text-gray-600 mt-1">{selectedReport.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center">
                <ChartIcon className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-600">Chart Type:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">{selectedReport.chartType}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-600">Date Range:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedReport.dateRange}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-600">Last Run:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(selectedReport.lastRun).toLocaleDateString()}
                </span>
              </div>
              {selectedReport.schedule && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Schedule:</span>
                  <span className="ml-2 font-medium text-gray-900">{selectedReport.schedule}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Data</h2>
          {renderMockChart(selectedReport.chartType)}
        </div>

        {/* Report Table */}
        {selectedReport.chartType !== 'table' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Agents</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1,234</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+12.5%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Active Campaigns</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">567</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+8.3%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">API Calls</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">98,765</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+15.7%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Create custom reports and analyze your data</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </button>
        </div>
      </div>

      {/* Pre-built Templates */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pre-built Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const ChartIcon = getChartIcon(template.chartType);
            return (
              <button
                key={template.id}
                onClick={() => setSelectedReport(template)}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 text-left hover:shadow-md transition-all border border-indigo-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <ChartIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                    {template.type}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {template.dateRange}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="agents">Agents</option>
                <option value="campaigns">Campaigns</option>
                <option value="api">API</option>
                <option value="users">Users</option>
                <option value="revenue">Revenue</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chart
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => {
                const ChartIcon = getChartIcon(report.chartType);
                return (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                          <div className="text-sm text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <ChartIcon className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="capitalize">{report.chartType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.dateRange}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.schedule || 'On-demand'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.lastRun).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="View report"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Download report"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {!report.isTemplate && (
                          <>
                            <button className="text-gray-600 hover:text-gray-900 transition-colors" title="Edit">
                              <Edit className="w-5 h-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Reports Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-600" />
          Scheduled Reports
        </h2>
        <div className="space-y-3">
          {reports
            .filter((r) => r.schedule)
            .map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    <p className="text-xs text-gray-500">
                      Runs {report.schedule?.toLowerCase()} • Next run:{' '}
                      {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center">
                    <Play className="w-4 h-4 mr-1" />
                    Run Now
                  </button>
                  <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Create Report Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                  Create Custom Report
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="e.g., Monthly Performance Summary"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of what this report covers..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chart Type */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Chart Type</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
                    { type: 'line', icon: LineChart, label: 'Line Chart' },
                    { type: 'pie', icon: PieChart, label: 'Pie Chart' },
                    { type: 'table', icon: Table, label: 'Table' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedChartType(type as any)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        selectedChartType === type
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mx-auto mb-2 ${selectedChartType === type ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${selectedChartType === type ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Metrics</h3>
                <div className="grid grid-cols-2 gap-2">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;
                    const isSelected = selectedMetrics.includes(metric.id);
                    return (
                      <button
                        key={metric.id}
                        onClick={() => toggleMetric(metric.id)}
                        className={`flex items-center p-3 border rounded-lg transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                            isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {metric.name}
                          </p>
                          <p className="text-xs text-gray-500">{metric.category}</p>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dimension Selector */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Group By</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: 'time', label: 'Time' },
                    { value: 'user', label: 'User' },
                    { value: 'organization', label: 'Organization' },
                    { value: 'type', label: 'Type' },
                  ].map((dimension) => (
                    <button
                      key={dimension.value}
                      onClick={() => setSelectedDimension(dimension.value)}
                      className={`px-4 py-2 border rounded-lg transition-all ${
                        selectedDimension === dimension.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {dimension.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReport}
                  disabled={!reportName || selectedMetrics.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
