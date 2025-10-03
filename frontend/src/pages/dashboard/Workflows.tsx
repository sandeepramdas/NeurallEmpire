import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  X,
  FileText,
  Clock,
  Zap,
  GitBranch,
  CheckCircle,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Edit,
  Activity,
} from 'lucide-react';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  trigger: {
    type: 'webhook' | 'schedule' | 'event';
    value: string;
  };
  actions: number;
  executions: number;
  lastRun?: string;
  createdAt: string;
  successRate: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  triggers: number;
  actions: number;
  popular: boolean;
}

interface ExecutionHistory {
  id: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startTime: string;
  duration: string;
  triggeredBy: string;
}

const Workflows: React.FC = () => {
  const { } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<'webhook' | 'schedule' | 'event'>('webhook');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'history'>('workflows');

  // Mock workflows data
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    {
      id: '1',
      name: 'Lead Qualification Pipeline',
      description: 'Automatically qualify and route new leads based on score and engagement',
      status: 'active',
      trigger: { type: 'webhook', value: 'https://api.neurallempire.com/webhooks/leads' },
      actions: 5,
      executions: 1234,
      lastRun: '2025-10-04T10:30:00Z',
      createdAt: '2025-01-15',
      successRate: 98.5,
    },
    {
      id: '2',
      name: 'Campaign Performance Monitor',
      description: 'Track campaign metrics and send alerts when KPIs drop below threshold',
      status: 'active',
      trigger: { type: 'schedule', value: 'Every 6 hours' },
      actions: 3,
      executions: 892,
      lastRun: '2025-10-04T09:00:00Z',
      createdAt: '2025-02-10',
      successRate: 100,
    },
    {
      id: '3',
      name: 'Customer Onboarding Sequence',
      description: 'Multi-step onboarding flow with personalized email sequences',
      status: 'active',
      trigger: { type: 'event', value: 'customer.signup' },
      actions: 8,
      executions: 567,
      lastRun: '2025-10-04T08:15:00Z',
      createdAt: '2025-03-05',
      successRate: 95.2,
    },
    {
      id: '4',
      name: 'Daily Analytics Report',
      description: 'Compile and send daily performance reports to team',
      status: 'active',
      trigger: { type: 'schedule', value: 'Daily at 9:00 AM' },
      actions: 4,
      executions: 210,
      lastRun: '2025-10-04T09:00:00Z',
      createdAt: '2025-04-20',
      successRate: 99.5,
    },
    {
      id: '5',
      name: 'Slack Notification System',
      description: 'Send real-time notifications to Slack for important events',
      status: 'paused',
      trigger: { type: 'event', value: 'agent.error' },
      actions: 2,
      executions: 145,
      lastRun: '2025-09-28T14:20:00Z',
      createdAt: '2025-05-12',
      successRate: 87.3,
    },
    {
      id: '6',
      name: 'Lead Enrichment Workflow',
      description: 'Enrich lead data with third-party APIs and update CRM',
      status: 'draft',
      trigger: { type: 'webhook', value: 'Not configured' },
      actions: 6,
      executions: 0,
      createdAt: '2025-09-30',
      successRate: 0,
    },
    {
      id: '7',
      name: 'Weekly Team Summary',
      description: 'Generate and distribute weekly performance summaries',
      status: 'active',
      trigger: { type: 'schedule', value: 'Weekly on Monday 10:00 AM' },
      actions: 5,
      executions: 32,
      lastRun: '2025-09-30T10:00:00Z',
      createdAt: '2025-08-15',
      successRate: 96.8,
    },
  ]);

  // Mock workflow templates
  const templates: WorkflowTemplate[] = [
    {
      id: 't1',
      name: 'Lead Qualification',
      description: 'Automatically score and qualify incoming leads',
      category: 'Sales',
      icon: <Zap className="w-6 h-6" />,
      triggers: 1,
      actions: 4,
      popular: true,
    },
    {
      id: 't2',
      name: 'Customer Onboarding',
      description: 'Welcome new customers with automated email sequences',
      category: 'Marketing',
      icon: <CheckCircle className="w-6 h-6" />,
      triggers: 1,
      actions: 6,
      popular: true,
    },
    {
      id: 't3',
      name: 'Slack Alerts',
      description: 'Send notifications to Slack channels for important events',
      category: 'Communication',
      icon: <Activity className="w-6 h-6" />,
      triggers: 2,
      actions: 1,
      popular: true,
    },
    {
      id: 't4',
      name: 'Data Sync',
      description: 'Sync data between multiple platforms automatically',
      category: 'Integration',
      icon: <GitBranch className="w-6 h-6" />,
      triggers: 1,
      actions: 3,
      popular: false,
    },
    {
      id: 't5',
      name: 'Weekly Reports',
      description: 'Generate and email weekly performance reports',
      category: 'Analytics',
      icon: <FileText className="w-6 h-6" />,
      triggers: 1,
      actions: 2,
      popular: false,
    },
    {
      id: 't6',
      name: 'Campaign Monitor',
      description: 'Monitor campaign performance and trigger alerts',
      category: 'Marketing',
      icon: <Activity className="w-6 h-6" />,
      triggers: 1,
      actions: 3,
      popular: true,
    },
  ];

  // Mock execution history
  const executionHistory: ExecutionHistory[] = [
    {
      id: 'e1',
      workflowName: 'Lead Qualification Pipeline',
      status: 'success',
      startTime: '2025-10-04T10:30:00Z',
      duration: '1.2s',
      triggeredBy: 'Webhook',
    },
    {
      id: 'e2',
      workflowName: 'Campaign Performance Monitor',
      status: 'success',
      startTime: '2025-10-04T09:00:00Z',
      duration: '2.5s',
      triggeredBy: 'Schedule',
    },
    {
      id: 'e3',
      workflowName: 'Customer Onboarding Sequence',
      status: 'success',
      startTime: '2025-10-04T08:15:00Z',
      duration: '3.8s',
      triggeredBy: 'Event',
    },
    {
      id: 'e4',
      workflowName: 'Daily Analytics Report',
      status: 'success',
      startTime: '2025-10-04T09:00:00Z',
      duration: '5.1s',
      triggeredBy: 'Schedule',
    },
    {
      id: 'e5',
      workflowName: 'Lead Qualification Pipeline',
      status: 'failed',
      startTime: '2025-10-03T15:45:00Z',
      duration: '0.8s',
      triggeredBy: 'Webhook',
    },
    {
      id: 'e6',
      workflowName: 'Weekly Team Summary',
      status: 'success',
      startTime: '2025-09-30T10:00:00Z',
      duration: '4.2s',
      triggeredBy: 'Schedule',
    },
    {
      id: 'e7',
      workflowName: 'Customer Onboarding Sequence',
      status: 'running',
      startTime: '2025-10-04T11:00:00Z',
      duration: '-',
      triggeredBy: 'Event',
    },
  ];

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorkflow: WorkflowItem = {
      id: (workflows.length + 1).toString(),
      name: newWorkflowName,
      description: newWorkflowDescription,
      status: 'draft',
      trigger: { type: selectedTrigger, value: 'Not configured' },
      actions: 0,
      executions: 0,
      createdAt: new Date().toISOString().split('T')[0],
      successRate: 0,
    };

    setWorkflows([...workflows, newWorkflow]);
    setNewWorkflowName('');
    setNewWorkflowDescription('');
    setSelectedTrigger('webhook');
    setIsCreateModalOpen(false);
  };

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows((workflows) =>
      workflows.map((workflow) =>
        workflow.id === workflowId
          ? {
              ...workflow,
              status: workflow.status === 'active' ? 'paused' : workflow.status === 'paused' ? 'active' : 'draft',
            }
          : workflow
      )
    );
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      setWorkflows((workflows) => workflows.filter((workflow) => workflow.id !== workflowId));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'webhook':
        return <Zap className="w-4 h-4" />;
      case 'schedule':
        return <Clock className="w-4 h-4" />;
      case 'event':
        return <Activity className="w-4 h-4" />;
      default:
        return <Workflow className="w-4 h-4" />;
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions, 0);
  const activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  const avgSuccessRate =
    workflows.filter((w) => w.executions > 0).reduce((sum, w) => sum + w.successRate, 0) /
    Math.max(workflows.filter((w) => w.executions > 0).length, 1);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
        <p className="text-gray-600 mt-2">Automate your processes with powerful workflow automation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{workflows.length}</p>
            </div>
            <Workflow className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeWorkflows}</p>
            </div>
            <Play className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Executions</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalExecutions.toLocaleString()}</p>
            </div>
            <Zap className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{avgSuccessRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'workflows'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Workflows
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Execution History
            </button>
          </nav>
        </div>
      </div>

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <>
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </button>
              </div>
            </div>
          </div>

          {/* Workflows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                    <p className="text-sm text-gray-600">{workflow.description}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                      {workflow.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Trigger</span>
                    <div className="flex items-center space-x-1 text-gray-900">
                      {getTriggerIcon(workflow.trigger.type)}
                      <span className="capitalize">{workflow.trigger.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Actions</span>
                    <span className="text-gray-900 font-medium">{workflow.actions}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Executions</span>
                    <span className="text-gray-900 font-medium">{workflow.executions.toLocaleString()}</span>
                  </div>

                  {workflow.executions > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="text-gray-900 font-medium">{workflow.successRate}%</span>
                    </div>
                  )}

                  {workflow.lastRun && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Last Run</span>
                      <span className="text-gray-500">{new Date(workflow.lastRun).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => toggleWorkflowStatus(workflow.id)}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors flex items-center justify-center ${
                      workflow.status === 'active'
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {workflow.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </>
                    )}
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredWorkflows.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No workflows found</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Workflow
              </button>
            </div>
          )}
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  {template.icon}
                </div>
                {template.popular && (
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Popular
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span className="inline-flex px-2 py-1 rounded-full bg-gray-100">{template.category}</span>
                <div className="flex items-center space-x-3">
                  <span>{template.triggers} trigger</span>
                  <span>{template.actions} actions</span>
                </div>
              </div>

              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Execution History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Triggered By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executionHistory.map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{execution.workflowName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getExecutionStatusColor(execution.status)}`}
                      >
                        {execution.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(execution.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{execution.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{execution.triggeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Workflow className="w-6 h-6 mr-2 text-indigo-600" />
                Create New Workflow
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Workflow Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  required
                  placeholder="e.g., Lead Qualification Pipeline"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  required
                  placeholder="Describe what this workflow does..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Trigger Type</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTrigger('webhook')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedTrigger === 'webhook'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <div className="text-sm font-medium text-gray-900">Webhook</div>
                    <div className="text-xs text-gray-500 mt-1">HTTP trigger</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTrigger('schedule')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedTrigger === 'schedule'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <div className="text-sm font-medium text-gray-900">Schedule</div>
                    <div className="text-xs text-gray-500 mt-1">Time-based</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTrigger('event')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedTrigger === 'event' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Activity className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                    <div className="text-sm font-medium text-gray-900">Event</div>
                    <div className="text-xs text-gray-500 mt-1">System event</div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
