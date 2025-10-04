import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Megaphone,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Copy,
  X,
  Users,
  Send,
  Clock,
  TrendingUp,
  BarChart3,
  Upload,
  Eye,
  Zap,
} from 'lucide-react';

// Types
interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  channel: 'email' | 'sms' | 'webhook' | 'whatsapp';
  agentId?: string;
  agentName?: string;
  schedule: {
    type: 'now' | 'scheduled' | 'recurring';
    startDate?: string;
    endDate?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
  };
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    responded: number;
  };
  messageTemplate: string;
  targetAudience?: string;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'responded';
  sentAt?: string;
  respondedAt?: string;
}

// Mock Data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Spring Product Launch',
    description: 'Email campaign for new product features launch',
    status: 'running',
    channel: 'email',
    agentId: '2',
    agentName: 'Email Responder',
    schedule: {
      type: 'scheduled',
      startDate: '2025-10-01T09:00:00Z',
      endDate: '2025-10-15T17:00:00Z',
    },
    stats: {
      total: 5420,
      sent: 4892,
      delivered: 4756,
      failed: 136,
      responded: 1156,
    },
    messageTemplate: 'Hi {{name}}, Check out our new features...',
    targetAudience: 'Active users, last 30 days',
    createdAt: '2025-09-28T10:00:00Z',
    updatedAt: '2025-10-04T11:00:00Z',
  },
  {
    id: '2',
    name: 'Customer Re-engagement',
    description: 'Re-engage inactive customers with special offers',
    status: 'completed',
    channel: 'email',
    agentId: '2',
    agentName: 'Email Responder',
    schedule: {
      type: 'now',
    },
    stats: {
      total: 3890,
      sent: 3890,
      delivered: 3745,
      failed: 145,
      responded: 701,
    },
    messageTemplate: 'We miss you {{name}}! Here is a special offer...',
    targetAudience: 'Inactive users, 90+ days',
    createdAt: '2025-09-15T14:00:00Z',
    updatedAt: '2025-09-30T16:00:00Z',
  },
  {
    id: '3',
    name: 'Newsletter Q1 2025',
    description: 'Quarterly newsletter with updates and insights',
    status: 'completed',
    channel: 'email',
    agentId: '3',
    agentName: 'Content Generator',
    schedule: {
      type: 'scheduled',
      startDate: '2025-10-01T08:00:00Z',
    },
    stats: {
      total: 8245,
      sent: 8245,
      delivered: 8012,
      failed: 233,
      responded: 2572,
    },
    messageTemplate: 'Hello {{name}}, Here are the latest updates...',
    targetAudience: 'All subscribers',
    createdAt: '2025-09-20T09:00:00Z',
    updatedAt: '2025-10-01T10:00:00Z',
  },
  {
    id: '4',
    name: 'Abandoned Cart Recovery',
    description: 'SMS reminders for abandoned shopping carts',
    status: 'running',
    channel: 'sms',
    agentId: '1',
    agentName: 'Lead Qualifier',
    schedule: {
      type: 'recurring',
      frequency: 'daily',
    },
    stats: {
      total: 2156,
      sent: 1834,
      delivered: 1798,
      failed: 36,
      responded: 769,
    },
    messageTemplate: 'Hi {{name}}, You left items in your cart...',
    targetAudience: 'Cart abandoners, last 24h',
    createdAt: '2025-09-10T11:00:00Z',
    updatedAt: '2025-10-04T09:00:00Z',
  },
  {
    id: '5',
    name: 'New Feature Announcement',
    description: 'Announce latest platform updates to users',
    status: 'scheduled',
    channel: 'email',
    agentId: '2',
    agentName: 'Email Responder',
    schedule: {
      type: 'scheduled',
      startDate: '2025-10-10T10:00:00Z',
    },
    stats: {
      total: 6789,
      sent: 0,
      delivered: 0,
      failed: 0,
      responded: 0,
    },
    messageTemplate: 'Exciting news {{name}}! New features available...',
    targetAudience: 'All active users',
    createdAt: '2025-10-02T15:00:00Z',
    updatedAt: '2025-10-03T12:00:00Z',
  },
  {
    id: '6',
    name: 'Event Invitation',
    description: 'Invite premium customers to exclusive webinar',
    status: 'scheduled',
    channel: 'email',
    agentId: '2',
    agentName: 'Email Responder',
    schedule: {
      type: 'scheduled',
      startDate: '2025-10-08T14:00:00Z',
    },
    stats: {
      total: 1245,
      sent: 0,
      delivered: 0,
      failed: 0,
      responded: 0,
    },
    messageTemplate: 'You are invited {{name}}! Join us for...',
    targetAudience: 'Premium tier users',
    createdAt: '2025-09-30T10:00:00Z',
    updatedAt: '2025-10-01T14:00:00Z',
  },
  {
    id: '7',
    name: 'Feedback Survey',
    description: 'Collect customer feedback and satisfaction ratings',
    status: 'paused',
    channel: 'email',
    agentId: '8',
    agentName: 'Customer Support',
    schedule: {
      type: 'recurring',
      frequency: 'weekly',
    },
    stats: {
      total: 4532,
      sent: 2156,
      delivered: 2089,
      failed: 67,
      responded: 512,
    },
    messageTemplate: 'Hey {{name}}, We would love your feedback...',
    targetAudience: 'Recent purchasers',
    createdAt: '2025-09-05T13:00:00Z',
    updatedAt: '2025-09-25T11:00:00Z',
  },
  {
    id: '8',
    name: 'Flash Sale Alert',
    description: 'Limited time offer notification via SMS',
    status: 'completed',
    channel: 'sms',
    agentId: '1',
    agentName: 'Lead Qualifier',
    schedule: {
      type: 'now',
    },
    stats: {
      total: 3421,
      sent: 3421,
      delivered: 3387,
      failed: 34,
      responded: 1456,
    },
    messageTemplate: 'FLASH SALE {{name}}! 50% off for next 3 hours...',
    targetAudience: 'High-value customers',
    createdAt: '2025-09-28T08:00:00Z',
    updatedAt: '2025-09-28T12:00:00Z',
  },
  {
    id: '9',
    name: 'Onboarding Series Day 1',
    description: 'First email in automated onboarding sequence',
    status: 'running',
    channel: 'email',
    agentId: '8',
    agentName: 'Customer Support',
    schedule: {
      type: 'recurring',
      frequency: 'daily',
    },
    stats: {
      total: 892,
      sent: 756,
      delivered: 734,
      failed: 22,
      responded: 289,
    },
    messageTemplate: 'Welcome {{name}}! Let us help you get started...',
    targetAudience: 'New signups, day 1',
    createdAt: '2025-08-15T09:00:00Z',
    updatedAt: '2025-10-04T08:00:00Z',
  },
  {
    id: '10',
    name: 'Birthday Wishes Campaign',
    description: 'Personalized birthday messages with special discount',
    status: 'draft',
    channel: 'email',
    agentId: '2',
    agentName: 'Email Responder',
    schedule: {
      type: 'recurring',
      frequency: 'daily',
    },
    stats: {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      responded: 0,
    },
    messageTemplate: 'Happy Birthday {{name}}! Enjoy 25% off...',
    targetAudience: 'Users with birthday today',
    createdAt: '2025-10-03T16:00:00Z',
    updatedAt: '2025-10-03T16:00:00Z',
  },
];

const mockContacts: Contact[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Smith',
    status: 'responded',
    sentAt: '2025-10-04T09:00:00Z',
    respondedAt: '2025-10-04T09:30:00Z',
  },
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane Doe',
    status: 'delivered',
    sentAt: '2025-10-04T09:00:00Z',
  },
  {
    id: '3',
    email: 'bob@example.com',
    name: 'Bob Johnson',
    status: 'failed',
    sentAt: '2025-10-04T09:00:00Z',
  },
];

const channelColors: Record<string, string> = {
  email: 'bg-blue-100 text-blue-800',
  sms: 'bg-green-100 text-green-800',
  webhook: 'bg-purple-100 text-purple-800',
  whatsapp: 'bg-emerald-100 text-emerald-800',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  running: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

const contactStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  responded: 'bg-purple-100 text-purple-800',
};

const Campaigns: React.FC = () => {
  const { organization } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'contacts' | 'messages' | 'analytics'>('overview');

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return mockCampaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      const matchesChannel = channelFilter === 'all' || campaign.channel === channelFilter;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [searchQuery, statusFilter, channelFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = mockCampaigns.length;
    const active = mockCampaigns.filter(
      (c) => c.status === 'running' || c.status === 'scheduled'
    ).length;
    const messagesSentToday = mockCampaigns.reduce((sum, c) => {
      if (c.updatedAt && new Date(c.updatedAt).toDateString() === new Date().toDateString()) {
        return sum + c.stats.sent;
      }
      return sum;
    }, 0);
    const totalSent = mockCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
    const totalResponded = mockCampaigns.reduce((sum, c) => sum + c.stats.responded, 0);
    const responseRate = totalSent > 0 ? ((totalResponded / totalSent) * 100).toFixed(1) : '0.0';

    return {
      total,
      active,
      messagesSentToday,
      responseRate,
    };
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.stats.total === 0) return 0;
    return (campaign.stats.sent / campaign.stats.total) * 100;
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailModal(true);
    setDetailTab('overview');
  };

  const handleToggleStatus = (campaignId: string) => {
    console.log('Toggle status for campaign:', campaignId);
  };

  const handleDelete = (campaignId: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      console.log('Delete campaign:', campaignId);
    }
  };

  const handleClone = (campaignId: string) => {
    console.log('Clone campaign:', campaignId);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neural-900 mb-2">Campaigns</h1>
        <p className="text-neutral-600">
          Manage and monitor your marketing campaigns for {organization?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Total Campaigns</p>
              <p className="text-3xl font-bold text-neural-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Active Campaigns</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Sent Today</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.messagesSentToday.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Response Rate</p>
              <p className="text-3xl font-bold text-purple-600">{stats.responseRate}%</p>
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
                placeholder="Search campaigns..."
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
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="webhook">Webhook</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No campaigns found</h3>
          <p className="text-neutral-600 mb-4">
            {searchQuery || statusFilter !== 'all' || channelFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first campaign'}
          </p>
          {!searchQuery && statusFilter === 'all' && channelFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="card hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3
                      onClick={() => handleCampaignClick(campaign)}
                      className="font-semibold text-neural-900 cursor-pointer hover:text-primary-600"
                    >
                      {campaign.name}
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">{campaign.description}</p>
                </div>
              </div>

              {/* Status and Channel Badges */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[campaign.status]
                  }`}
                >
                  {campaign.status}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    channelColors[campaign.channel]
                  }`}
                >
                  {campaign.channel}
                </span>
                {campaign.agentName && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                    {campaign.agentName}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
                  <span>
                    {campaign.stats.sent.toLocaleString()} / {campaign.stats.total.toLocaleString()}{' '}
                    sent
                  </span>
                  <span>{getProgress(campaign).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${getProgress(campaign)}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-neutral-200">
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Delivered</p>
                  <p className="text-sm font-semibold text-green-600">
                    {campaign.stats.delivered.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Failed</p>
                  <p className="text-sm font-semibold text-red-600">
                    {campaign.stats.failed.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Responded</p>
                  <p className="text-sm font-semibold text-purple-600">
                    {campaign.stats.responded.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500">Rate</p>
                  <p className="text-sm font-semibold text-blue-600">
                    {campaign.stats.sent > 0
                      ? ((campaign.stats.responded / campaign.stats.sent) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                <Clock className="w-3 h-3" />
                {campaign.schedule.type === 'now' && <span>Send immediately</span>}
                {campaign.schedule.type === 'scheduled' && (
                  <span>Scheduled: {formatDate(campaign.schedule.startDate)}</span>
                )}
                {campaign.schedule.type === 'recurring' && (
                  <span>Recurring: {campaign.schedule.frequency}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCampaignClick(campaign)}
                  className="flex-1 btn btn-sm btn-outline flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                {campaign.status !== 'completed' && (
                  <button
                    onClick={() => handleToggleStatus(campaign.id)}
                    className="btn btn-sm btn-outline"
                    title={campaign.status === 'running' ? 'Pause' : 'Resume'}
                  >
                    {campaign.status === 'running' ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleClone(campaign.id)}
                  className="btn btn-sm btn-outline"
                  title="Clone"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="btn btn-sm btn-outline text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neural-900">Create New Campaign</h2>
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
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Spring Product Launch"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your campaign..."
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Channel & Agent */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Channel
                    </label>
                    <select className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="webhook">Webhook</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      AI Agent
                    </label>
                    <select className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="">None</option>
                      <option value="1">Lead Qualifier</option>
                      <option value="2">Email Responder</option>
                      <option value="8">Customer Support</option>
                    </select>
                  </div>
                </div>

                {/* Message Template */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Message Template
                  </label>
                  <textarea
                    placeholder="Hi {{name}}, &#10;&#10;Your personalized message here...&#10;&#10;Use {{name}}, {{email}}, etc. for personalization"
                    rows={6}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Use variables like {'{name}'}, {'{email}'}, {'{company}'} for personalization
                  </p>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Target Audience
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button className="btn btn-outline flex-1 flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload CSV
                      </button>
                      <button className="btn btn-outline flex-1 flex items-center justify-center gap-2">
                        <Users className="w-4 h-4" />
                        Select from Database
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Or describe target audience (e.g., Active users, last 30 days)"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Schedule
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="schedule" value="now" defaultChecked />
                      <span className="text-sm text-neutral-700">Send immediately</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="schedule" value="scheduled" />
                      <span className="text-sm text-neutral-700">Schedule for later</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="schedule" value="recurring" />
                      <span className="text-sm text-neutral-700">Recurring campaign</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Start Date</label>
                        <input
                          type="datetime-local"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Frequency</label>
                        <select className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle create
                    setShowCreateModal(false);
                  }}
                  className="btn btn-primary"
                >
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-neural-900">
                    {selectedCampaign.name}
                  </h2>
                  <p className="text-sm text-neutral-600">{selectedCampaign.description}</p>
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
                  onClick={() => setDetailTab('contacts')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'contacts'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Contacts
                </button>
                <button
                  onClick={() => setDetailTab('messages')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'messages'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Messages
                </button>
                <button
                  onClick={() => setDetailTab('analytics')}
                  className={`px-4 py-2 font-medium text-sm ${
                    detailTab === 'analytics'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Analytics
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-neural-900">
                        {selectedCampaign.stats.total.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Sent</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedCampaign.stats.sent.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Delivered</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedCampaign.stats.delivered.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Responded</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedCampaign.stats.responded.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div>
                    <h3 className="font-semibold text-neural-900 mb-4">Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Status</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[selectedCampaign.status]
                          }`}
                        >
                          {selectedCampaign.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Channel</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            channelColors[selectedCampaign.channel]
                          }`}
                        >
                          {selectedCampaign.channel}
                        </span>
                      </div>
                      {selectedCampaign.agentName && (
                        <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                          <span className="text-sm text-neutral-600">AI Agent</span>
                          <span className="text-sm font-medium text-neural-900">
                            {selectedCampaign.agentName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b border-neutral-200">
                        <span className="text-sm text-neutral-600">Target Audience</span>
                        <span className="text-sm font-medium text-neural-900">
                          {selectedCampaign.targetAudience}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-neutral-600">Created</span>
                        <span className="text-sm font-medium text-neural-900">
                          {formatDate(selectedCampaign.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message Template */}
                  <div>
                    <h3 className="font-semibold text-neural-900 mb-2">Message Template</h3>
                    <div className="p-4 bg-neutral-50 rounded-lg font-mono text-sm text-neutral-700 whitespace-pre-wrap">
                      {selectedCampaign.messageTemplate}
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts Tab */}
              {detailTab === 'contacts' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                            Sent At
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase">
                            Responded At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {mockContacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 text-sm font-medium text-neural-900">
                              {contact.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {contact.email}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  contactStatusColors[contact.status]
                                }`}
                              >
                                {contact.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {contact.sentAt ? formatDate(contact.sentAt) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-600">
                              {contact.respondedAt ? formatDate(contact.respondedAt) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {detailTab === 'messages' && (
                <div className="space-y-4">
                  <div className="p-4 border border-neutral-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-neural-900">John Smith</p>
                        <p className="text-xs text-neutral-500">john@example.com</p>
                      </div>
                      <span className="text-xs text-neutral-500">2 hours ago</span>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <p className="text-sm text-neutral-700">
                        Hi John, Check out our new features...
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border border-neutral-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-neural-900">Jane Doe</p>
                        <p className="text-xs text-neutral-500">jane@example.com</p>
                      </div>
                      <span className="text-xs text-neutral-500">3 hours ago</span>
                    </div>
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <p className="text-sm text-neutral-700">
                        Hi Jane, Check out our new features...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {detailTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Chart Placeholder */}
                  <div className="h-64 flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg border-2 border-dashed border-primary-200">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-primary-400 mx-auto mb-2" />
                      <p className="text-neutral-600 text-sm">Analytics Chart Placeholder</p>
                      <p className="text-neutral-500 text-xs mt-1">
                        Campaign performance over time
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-neutral-200 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Delivery Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedCampaign.stats.sent > 0
                          ? (
                              (selectedCampaign.stats.delivered / selectedCampaign.stats.sent) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="p-4 border border-neutral-200 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Response Rate</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedCampaign.stats.sent > 0
                          ? (
                              (selectedCampaign.stats.responded / selectedCampaign.stats.sent) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
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

export default Campaigns;
