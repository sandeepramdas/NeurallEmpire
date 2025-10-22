import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { agentService, Agent as AgentType, CreateAgentRequest } from '@/services/agent.service';
import toast from 'react-hot-toast';
import {
  Bot,
  Plus,
  Search,
  Grid3x3,
  List,
  Play,
  Pause,
  Trash2,
  Copy,
  X,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  Brain,
  MessageSquare,
} from 'lucide-react';

// Types (extend from service)
interface Agent extends Omit<AgentType, 'capabilities'> {
  tools: string[];  // Alias for capabilities for UI compatibility
  totalRuns: number;
  avatar?: string;
  lastRunAt?: string;
}

interface AgentRun {
  id: string;
  status: 'success' | 'failed' | 'running';
  input: string;
  output: string;
  duration: number;
  timestamp: string;
}

// Mock data for run history (TODO: Connect to backend API)
const mockRuns: AgentRun[] = [
  {
    id: '1',
    status: 'success',
    input: 'Qualify lead: John Smith from TechCorp',
    output: 'Lead qualified: High priority - Enterprise company, $10M+ revenue',
    duration: 2.3,
    timestamp: '2025-10-04T10:30:00Z',
  },
  {
    id: '2',
    status: 'success',
    input: 'Qualify lead: Jane Doe from StartupXYZ',
    output: 'Lead qualified: Medium priority - Series A startup, growing team',
    duration: 1.8,
    timestamp: '2025-10-04T09:15:00Z',
  },
  {
    id: '3',
    status: 'failed',
    input: 'Qualify lead: Unknown contact',
    output: 'Error: Insufficient information to qualify lead',
    duration: 0.5,
    timestamp: '2025-10-04T08:45:00Z',
  },
];

const modelColors: Record<string, string> = {
  'gpt-4': 'bg-green-100 text-green-800',
  'gpt-3.5-turbo': 'bg-blue-100 text-blue-800',
  'claude-3-opus': 'bg-purple-100 text-purple-800',
  'claude-3-sonnet': 'bg-indigo-100 text-indigo-800',
  'gemini-pro': 'bg-orange-100 text-orange-800',
  'gemini-ultra': 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  READY: 'bg-blue-100 text-blue-800',
  TESTING: 'bg-purple-100 text-purple-800',
  ERROR: 'bg-red-100 text-red-800',
  RUNNING: 'bg-green-100 text-green-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  DEPRECATED: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

const Agents: React.FC = () => {
  const { organization } = useAuthStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'runs' | 'settings'>('overview');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAgentData, setNewAgentData] = useState<Partial<CreateAgentRequest>>({
    name: '',
    description: '',
    type: 'LEAD_GENERATOR',
    category: 'Business',
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful AI assistant.',
    },
    capabilities: [],
  });

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [statusFilter]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter.toUpperCase();

      const response = await agentService.getAgents(params);
      // Transform backend response to match frontend interface
      const transformedAgents: Agent[] = response.data.map((agent) => ({
        ...agent,
        tools: agent.capabilities || [],
        totalRuns: agent.usageCount,
        lastRunAt: agent.lastUsedAt,
      }));
      setAgents(transformedAgents);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to normalize status display
  const getStatusDisplay = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      const matchesModel = modelFilter === 'all' || agent.model === modelFilter;
      return matchesSearch && matchesStatus && matchesModel;
    });
  }, [agents, searchQuery, statusFilter, modelFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === 'ACTIVE' || a.status === 'RUNNING').length;
    const totalRunsToday = agents.reduce((sum, a) => {
      if (a.lastRunAt && new Date(a.lastRunAt).toDateString() === new Date().toDateString()) {
        return sum + a.totalRuns;
      }
      return sum;
    }, 0);
    const avgSuccessRate = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length
      : 0;

    return {
      total,
      active,
      totalRunsToday,
      avgSuccessRate: avgSuccessRate.toFixed(1),
    };
  }, [agents]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetailModal(true);
    setDetailTab('overview');
  };

  const handleToggleStatus = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const newStatus = agent.status === 'ACTIVE' || agent.status === 'RUNNING' ? 'PAUSED' : 'ACTIVE';

    try {
      await agentService.updateAgentStatus(agentId, newStatus);
      toast.success(`Agent ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`);
      loadAgents();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast.error('Failed to update agent status');
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      await agentService.deleteAgent(agentId);
      toast.success('Agent deleted successfully');
      loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleClone = async (agentId: string) => {
    try {
      await agentService.cloneAgent(agentId);
      toast.success('Agent cloned successfully');
      loadAgents();
    } catch (error) {
      console.error('Error cloning agent:', error);
      toast.error('Failed to clone agent');
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedAgents.length === 0) return;

    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedAgents.length} agent(s)?`)) return;

      try {
        await Promise.all(selectedAgents.map((id) => agentService.deleteAgent(id)));
        toast.success(`${selectedAgents.length} agent(s) deleted`);
        setSelectedAgents([]);
        loadAgents();
      } catch (error) {
        toast.error('Failed to delete agents');
      }
    } else {
      const newStatus = action === 'activate' ? 'ACTIVE' : 'PAUSED';
      try {
        await Promise.all(selectedAgents.map((id) => agentService.updateAgentStatus(id, newStatus)));
        toast.success(`${selectedAgents.length} agent(s) ${action}d`);
        setSelectedAgents([]);
        loadAgents();
      } catch (error) {
        toast.error(`Failed to ${action} agents`);
      }
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentData.name || !newAgentData.type) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const createData: CreateAgentRequest = {
        name: newAgentData.name,
        type: newAgentData.type,
        category: newAgentData.category || 'General',
        description: newAgentData.description,
        config: newAgentData.config || {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful AI assistant.',
        },
        capabilities: newAgentData.capabilities || [],
      };

      await agentService.createAgent(createData);
      toast.success('Agent created successfully!');
      setShowCreateModal(false);
      setNewAgentData({
        name: '',
        description: '',
        type: 'LEAD_GENERATOR',
        category: 'Business',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful AI assistant.',
        },
        capabilities: [],
      });
      loadAgents();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast.error(error.response?.data?.error || 'Failed to create agent');
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neural-900 mb-2">
          AI Agents
        </h1>
        <p className="text-neutral-600">
          Manage and monitor your AI agents for {organization?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-neural-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Bot className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Active Agents</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Runs Today</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalRunsToday}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-purple-600">{stats.avgSuccessRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="DRAFT">Draft</option>
                <option value="READY">Ready</option>
                <option value="TESTING">Testing</option>
              </select>

              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Models</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-neutral-600'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-neutral-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAgents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {selectedAgents.length} agent(s) selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="btn btn-sm btn-outline flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="btn btn-sm btn-outline flex items-center gap-1"
              >
                <Pause className="w-3 h-3" />
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="btn btn-sm btn-outline text-red-600 hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Agent List/Grid */}
      {loading ? (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">Loading agents...</h3>
          <p className="text-neutral-600">Please wait while we fetch your agents</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="card text-center py-12">
          <Brain className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No agents found</h3>
          <p className="text-neutral-600 mb-4">
            {searchQuery || statusFilter !== 'all' || modelFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first AI agent'}
          </p>
          {!searchQuery && statusFilter === 'all' && modelFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Agent
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="card hover:shadow-lg transition-shadow">
              {/* Selection Checkbox */}
              <div className="flex items-start justify-between mb-4">
                <input
                  type="checkbox"
                  checked={selectedAgents.includes(agent.id)}
                  onChange={() => toggleAgentSelection(agent.id)}
                  className="mt-1"
                />
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[agent.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {getStatusDisplay(agent.status)}
                  </span>
                </div>
              </div>

              {/* Agent Info */}
              <div
                onClick={() => handleAgentClick(agent)}
                className="cursor-pointer mb-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neural-900 truncate">
                      {agent.name}
                    </h3>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        modelColors[agent.model]
                      }`}
                    >
                      {agent.model}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-neutral-500">Total Runs</p>
                    <p className="text-lg font-semibold text-neural-900">
                      {agent.totalRuns.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Success Rate</p>
                    <p className="text-lg font-semibold text-green-600">
                      {agent.successRate}%
                    </p>
                  </div>
                </div>

                {/* Last Run */}
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Clock className="w-3 h-3" />
                  Last run: {formatDate(agent.lastRunAt)}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-200 flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(agent.id)}
                  className="flex-1 btn btn-sm btn-outline flex items-center justify-center gap-1"
                >
                  {agent.status === 'ACTIVE' || agent.status === 'RUNNING' ? (
                    <>
                      <Pause className="w-3 h-3" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleClone(agent.id)}
                  className="btn btn-sm btn-outline"
                  title="Clone"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="btn btn-sm btn-outline text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgents(filteredAgents.map((a) => a.id));
                        } else {
                          setSelectedAgents([]);
                        }
                      }}
                      checked={
                        selectedAgents.length === filteredAgents.length &&
                        filteredAgents.length > 0
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Total Runs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Success Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                    Last Run
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => handleAgentClick(agent)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => toggleAgentSelection(agent.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-neural-900">{agent.name}</p>
                          <p className="text-sm text-neutral-600 truncate max-w-xs">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          modelColors[agent.model]
                        }`}
                      >
                        {agent.model}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[agent.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {getStatusDisplay(agent.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {agent.totalRuns.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-green-600 font-medium">
                        {agent.successRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-600">
                      {formatDate(agent.lastRunAt)}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(agent.id)}
                          className="p-1 hover:bg-neutral-200 rounded"
                          title={agent.status === 'ACTIVE' || agent.status === 'RUNNING' ? 'Pause' : 'Activate'}
                        >
                          {agent.status === 'ACTIVE' || agent.status === 'RUNNING' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleClone(agent.id)}
                          className="p-1 hover:bg-neutral-200 rounded"
                          title="Clone"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neural-900">Create New Agent</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Lead Qualifier"
                    value={newAgentData.name || ''}
                    onChange={(e) => setNewAgentData({ ...newAgentData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Agent Type *
                  </label>
                  <select
                    value={newAgentData.type || 'LEAD_GENERATOR'}
                    onChange={(e) => setNewAgentData({ ...newAgentData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="LEAD_GENERATOR">Lead Generator</option>
                    <option value="EMAIL_MARKETER">Email Marketer</option>
                    <option value="SOCIAL_MEDIA">Social Media Manager</option>
                    <option value="CONTENT_CREATOR">Content Creator</option>
                    <option value="ANALYTICS">Analytics Agent</option>
                    <option value="CUSTOMER_SERVICE">Customer Service</option>
                    <option value="SALES">Sales Assistant</option>
                    <option value="SEO_OPTIMIZER">SEO Optimizer</option>
                    <option value="CONVERSATIONAL">Conversational Agent</option>
                    <option value="TASK_AUTOMATION">Task Automation</option>
                    <option value="DATA_PROCESSOR">Data Processor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this agent does..."
                    rows={3}
                    value={newAgentData.description || ''}
                    onChange={(e) => setNewAgentData({ ...newAgentData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Model
                  </label>
                  <select
                    value={newAgentData.config?.model || 'gpt-4'}
                    onChange={(e) =>
                      setNewAgentData({
                        ...newAgentData,
                        config: { ...newAgentData.config!, model: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="gpt-4">GPT-4 (Most capable)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & efficient)</option>
                    <option value="claude-3-opus">Claude 3 Opus (Best reasoning)</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</option>
                    <option value="gemini-pro">Gemini Pro (Multimodal)</option>
                    <option value="gemini-ultra">Gemini Ultra (Advanced)</option>
                  </select>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={newAgentData.config?.temperature || 0.7}
                      onChange={(e) =>
                        setNewAgentData({
                          ...newAgentData,
                          config: { ...newAgentData.config!, temperature: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-neutral-500 mt-1">0 = Focused, 2 = Creative</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      step="100"
                      value={newAgentData.config?.maxTokens || 2000}
                      onChange={(e) =>
                        setNewAgentData({
                          ...newAgentData,
                          config: { ...newAgentData.config!, maxTokens: parseInt(e.target.value) },
                        })
                      }
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Max response length</p>
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    placeholder="You are a helpful assistant that..."
                    rows={6}
                    value={newAgentData.config?.systemPrompt || ''}
                    onChange={(e) =>
                      setNewAgentData({
                        ...newAgentData,
                        config: { ...newAgentData.config!, systemPrompt: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                {/* Tools */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tools & Capabilities
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'web_search',
                      'database_query',
                      'email_send',
                      'calendar_integration',
                      'sentiment_analysis',
                      'image_generation',
                    ].map((tool) => (
                      <label key={tool} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={newAgentData.capabilities?.includes(tool) || false}
                          onChange={(e) => {
                            const capabilities = newAgentData.capabilities || [];
                            if (e.target.checked) {
                              setNewAgentData({
                                ...newAgentData,
                                capabilities: [...capabilities, tool],
                              });
                            } else {
                              setNewAgentData({
                                ...newAgentData,
                                capabilities: capabilities.filter((c) => c !== tool),
                              });
                            }
                          }}
                        />
                        <span className="text-sm text-neutral-700">
                          {tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAgentData({
                      name: '',
                      description: '',
                      type: 'LEAD_GENERATOR',
                      category: 'Business',
                      config: {
                        model: 'gpt-4',
                        temperature: 0.7,
                        maxTokens: 2000,
                        systemPrompt: 'You are a helpful AI assistant.',
                      },
                      capabilities: [],
                    });
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button onClick={handleCreateAgent} className="btn btn-primary">
                  Create Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {showDetailModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neural-900">
                      {selectedAgent.name}
                    </h2>
                    <p className="text-sm text-neutral-600">{selectedAgent.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-neutral-200">
                <button
                  onClick={() => setDetailTab('overview')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'overview'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDetailTab('runs')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'runs'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Run History
                </button>
                <button
                  onClick={() => setDetailTab('settings')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'settings'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Total Runs</p>
                      <p className="text-2xl font-bold text-neural-900">
                        {selectedAgent.totalRuns.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedAgent.successRate}%
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Last Run</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatDate(selectedAgent.lastRunAt)}
                      </p>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div>
                    <h3 className="font-semibold text-neural-900 mb-4">Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Model</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            modelColors[selectedAgent.model]
                          }`}
                        >
                          {selectedAgent.model}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Status</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[selectedAgent.status]
                          }`}
                        >
                          {selectedAgent.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Temperature</span>
                        <span className="text-sm font-medium text-neural-900">
                          {selectedAgent.temperature}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Max Tokens</span>
                        <span className="text-sm font-medium text-neural-900">
                          {selectedAgent.maxTokens}
                        </span>
                      </div>
                      <div className="flex items-start justify-between py-2">
                        <span className="text-sm text-neutral-600">Tools</span>
                        <div className="flex flex-wrap gap-2 justify-end max-w-md">
                          {selectedAgent.tools.map((tool) => (
                            <span
                              key={tool}
                              className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <h3 className="font-semibold text-neural-900 mb-2">System Prompt</h3>
                    <div className="p-4 bg-neutral-50 rounded-lg font-mono text-sm text-neutral-700">
                      {selectedAgent.systemPrompt}
                    </div>
                  </div>
                </div>
              )}

              {/* Runs History Tab */}
              {detailTab === 'runs' && (
                <div className="space-y-4">
                  {mockRuns.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                      <p className="text-neutral-600">No runs yet</p>
                    </div>
                  ) : (
                    mockRuns.map((run) => (
                      <div
                        key={run.id}
                        className="p-4 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {run.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : run.status === 'failed' ? (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                            )}
                            <span
                              className={`text-sm font-medium ${
                                run.status === 'success'
                                  ? 'text-green-600'
                                  : run.status === 'failed'
                                  ? 'text-red-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500">
                            {formatDate(run.timestamp)} • {run.duration}s
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Input:</p>
                            <p className="text-sm text-neutral-700">{run.input}</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Output:</p>
                            <p className="text-sm text-neutral-700">{run.output}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {detailTab === 'settings' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedAgent.name}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Description
                    </label>
                    <textarea
                      defaultValue={selectedAgent.description}
                      rows={3}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Model
                    </label>
                    <select
                      defaultValue={selectedAgent.model}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Temperature
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        defaultValue={selectedAgent.temperature}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        defaultValue={selectedAgent.maxTokens}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      System Prompt
                    </label>
                    <textarea
                      defaultValue={selectedAgent.systemPrompt}
                      rows={6}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button className="btn btn-outline">Cancel</button>
                    <button className="btn btn-primary">Save Changes</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
