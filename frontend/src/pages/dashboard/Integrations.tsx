import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Plug,
  Check,
  X,
  Search,
  Settings,
  Webhook,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  AlertCircle,
  Zap,
  MessageSquare,
  Database,
  BarChart3,
  Mail,
  Calendar,
  FileText,
  ShoppingCart,
  Users,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  connected: boolean;
  popular: boolean;
  webhookUrl?: string;
  apiKey?: string;
  connectedAt?: string;
  lastSync?: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  events: string[];
}

const Integrations: React.FC = () => {
  const { organization } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  // Mock integrations data
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Slack',
      description: 'Send notifications and updates to Slack channels',
      category: 'Communication',
      icon: <MessageSquare className="w-8 h-8" />,
      connected: true,
      popular: true,
      webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      connectedAt: '2025-01-15',
      lastSync: '2025-10-04T10:30:00Z',
    },
    {
      id: '2',
      name: 'Zapier',
      description: 'Connect with 5000+ apps through Zapier automation',
      category: 'Automation',
      icon: <Zap className="w-8 h-8" />,
      connected: true,
      popular: true,
      apiKey: 'zap_live_xxxxxxxxxxxxxxxxxxxxxxxxxx',
      connectedAt: '2025-02-10',
      lastSync: '2025-10-04T09:15:00Z',
    },
    {
      id: '3',
      name: 'Google Analytics',
      description: 'Track and analyze your campaign performance',
      category: 'Analytics',
      icon: <BarChart3 className="w-8 h-8" />,
      connected: true,
      popular: true,
      apiKey: 'GA_xxxxxxxxxxxxxxxxxxxxxxxxxx',
      connectedAt: '2025-03-05',
      lastSync: '2025-10-04T08:00:00Z',
    },
    {
      id: '4',
      name: 'Salesforce',
      description: 'Sync leads and contacts with Salesforce CRM',
      category: 'CRM',
      icon: <Database className="w-8 h-8" />,
      connected: false,
      popular: true,
    },
    {
      id: '5',
      name: 'HubSpot',
      description: 'Manage marketing campaigns and customer relationships',
      category: 'CRM',
      icon: <Users className="w-8 h-8" />,
      connected: true,
      popular: true,
      apiKey: 'hub_xxxxxxxxxxxxxxxxxxxxxxxxxx',
      connectedAt: '2025-04-20',
      lastSync: '2025-10-04T07:30:00Z',
    },
    {
      id: '6',
      name: 'Mailchimp',
      description: 'Email marketing and automation platform',
      category: 'Marketing',
      icon: <Mail className="w-8 h-8" />,
      connected: false,
      popular: true,
    },
    {
      id: '7',
      name: 'Google Calendar',
      description: 'Schedule meetings and manage appointments',
      category: 'Productivity',
      icon: <Calendar className="w-8 h-8" />,
      connected: true,
      popular: false,
      apiKey: 'gcal_xxxxxxxxxxxxxxxxxxxxxxxxxx',
      connectedAt: '2025-05-12',
      lastSync: '2025-10-03T16:00:00Z',
    },
    {
      id: '8',
      name: 'Stripe',
      description: 'Accept payments and manage subscriptions',
      category: 'Payment',
      icon: <ShoppingCart className="w-8 h-8" />,
      connected: false,
      popular: true,
    },
    {
      id: '9',
      name: 'Intercom',
      description: 'Customer messaging and support platform',
      category: 'Communication',
      icon: <MessageSquare className="w-8 h-8" />,
      connected: false,
      popular: false,
    },
    {
      id: '10',
      name: 'Notion',
      description: 'Collaborative workspace and documentation',
      category: 'Productivity',
      icon: <FileText className="w-8 h-8" />,
      connected: false,
      popular: false,
    },
    {
      id: '11',
      name: 'Microsoft Teams',
      description: 'Team collaboration and communication',
      category: 'Communication',
      icon: <MessageSquare className="w-8 h-8" />,
      connected: false,
      popular: true,
    },
    {
      id: '12',
      name: 'Pipedrive',
      description: 'Sales CRM and pipeline management',
      category: 'CRM',
      icon: <Database className="w-8 h-8" />,
      connected: false,
      popular: false,
    },
    {
      id: '13',
      name: 'Mixpanel',
      description: 'Product analytics and user behavior tracking',
      category: 'Analytics',
      icon: <BarChart3 className="w-8 h-8" />,
      connected: false,
      popular: false,
    },
    {
      id: '14',
      name: 'SendGrid',
      description: 'Email delivery and marketing platform',
      category: 'Marketing',
      icon: <Mail className="w-8 h-8" />,
      connected: true,
      popular: false,
      apiKey: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxx',
      connectedAt: '2025-06-08',
      lastSync: '2025-10-04T09:45:00Z',
    },
    {
      id: '15',
      name: 'Airtable',
      description: 'Spreadsheet-database hybrid for project management',
      category: 'Productivity',
      icon: <Database className="w-8 h-8" />,
      connected: false,
      popular: false,
    },
  ]);

  // Mock webhook configurations
  const webhooks: WebhookConfig[] = [
    {
      id: 'wh1',
      name: 'Lead Created',
      url: `https://api.neurallempire.com/webhooks/${organization?.id || 'org'}/lead-created`,
      createdAt: '2025-01-15',
      events: ['lead.created', 'lead.updated'],
    },
    {
      id: 'wh2',
      name: 'Campaign Event',
      url: `https://api.neurallempire.com/webhooks/${organization?.id || 'org'}/campaign-event`,
      createdAt: '2025-02-10',
      events: ['campaign.started', 'campaign.completed', 'campaign.failed'],
    },
    {
      id: 'wh3',
      name: 'Agent Activity',
      url: `https://api.neurallempire.com/webhooks/${organization?.id || 'org'}/agent-activity`,
      createdAt: '2025-03-05',
      events: ['agent.created', 'agent.updated', 'agent.deleted'],
    },
  ];

  const categories = ['all', 'Communication', 'CRM', 'Analytics', 'Marketing', 'Productivity', 'Payment', 'Automation'];

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const recentlyUsed = integrations
    .filter((i) => i.connected && i.lastSync)
    .sort((a, b) => {
      if (!a.lastSync || !b.lastSync) return 0;
      return new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime();
    })
    .slice(0, 3);

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKeyInput('');
    setIsConfigModalOpen(true);
  };

  const handleConnectIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIntegration) {
      setIntegrations((integrations) =>
        integrations.map((integration) =>
          integration.id === selectedIntegration.id
            ? {
                ...integration,
                connected: true,
                apiKey: apiKeyInput,
                connectedAt: new Date().toISOString().split('T')[0],
              }
            : integration
        )
      );
      setIsConfigModalOpen(false);
      setSelectedIntegration(null);
      setApiKeyInput('');
    }
  };

  const handleDisconnectIntegration = (integrationId: string) => {
    if (window.confirm('Are you sure you want to disconnect this integration?')) {
      setIntegrations((integrations) =>
        integrations.map((integration) =>
          integration.id === integrationId
            ? {
                ...integration,
                connected: false,
                apiKey: undefined,
                webhookUrl: undefined,
                connectedAt: undefined,
                lastSync: undefined,
              }
            : integration
        )
      );
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWebhook(id);
      setTimeout(() => setCopiedWebhook(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const connectedCount = integrations.filter((i) => i.connected).length;
  const popularIntegrations = integrations.filter((i) => i.popular);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Connect NeurallEmpire with your favorite tools and services</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Integrations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{integrations.length}</p>
            </div>
            <Plug className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{connectedCount}</p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{integrations.length - connectedCount}</p>
            </div>
            <Plus className="w-8 h-8 icon-active" />
          </div>
        </div>
      </div>

      {/* Recently Used Integrations */}
      {recentlyUsed.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recently Used</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyUsed.map((integration) => (
              <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Integrations Section */}
      {categoryFilter === 'all' && searchQuery === '' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Popular Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularIntegrations.slice(0, 6).map((integration) => (
              <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {integration.icon}
                  </div>
                  {integration.connected ? (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      Available
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{integration.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{integration.category}</span>
                  {integration.connectedAt && (
                    <span>Connected {new Date(integration.connectedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {integration.connected ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleConfigureIntegration(integration)}
                      className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </button>
                    <button
                      onClick={() => handleDisconnectIntegration(integration.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfigureIntegration(integration)}
                    className="w-full px-4 py-2 btn-primary rounded-lg transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Integrations Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {categoryFilter === 'all' ? 'All Integrations' : `${categoryFilter} Integrations`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                  {integration.icon}
                </div>
                {integration.connected ? (
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    Available
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{integration.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{integration.category}</span>
                {integration.connectedAt && (
                  <span>Connected {new Date(integration.connectedAt).toLocaleDateString()}</span>
                )}
              </div>

              {integration.connected ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleConfigureIntegration(integration)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </button>
                  <button
                    onClick={() => handleDisconnectIntegration(integration.id)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConfigureIntegration(integration)}
                  className="w-full px-4 py-2 btn-primary rounded-lg transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>

        {filteredIntegrations.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Plug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No integrations found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Webhook URLs Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Webhook URLs</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Use these URLs to receive events from external services</p>
          </div>
          <Webhook className="w-6 h-6 icon-active" />
        </div>

        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{webhook.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created {new Date(webhook.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(webhook.url, webhook.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Copy webhook URL"
                  >
                    {copiedWebhook === webhook.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="View documentation">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <code className="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 rounded text-xs font-mono text-gray-900 dark:text-gray-100 overflow-x-auto">
                {webhook.url}
              </code>

              <div className="mt-3 flex flex-wrap gap-2">
                {webhook.events.map((event, index) => (
                  <span key={index} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configure Integration Modal */}
      {isConfigModalOpen && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Settings className="w-6 h-6 mr-2 icon-active" />
                Configure {selectedIntegration.name}
              </h2>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedIntegration.connected ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">Integration Active</p>
                      <p className="text-xs text-green-700 mt-1">
                        Connected on {selectedIntegration.connectedAt ? new Date(selectedIntegration.connectedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedIntegration.apiKey && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900 dark:text-gray-100">
                        {selectedIntegration.apiKey.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedIntegration.apiKey || '', selectedIntegration.id)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedIntegration.lastSync && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Sync</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{new Date(selectedIntegration.lastSync).toLocaleString()}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDisconnectIntegration(selectedIntegration.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectIntegration} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key / Access Token</label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    required
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You can find your API key in your {selectedIntegration.name} account settings
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Need Help?</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Check our documentation for step-by-step integration guides
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 btn-primary rounded-lg transition-colors flex items-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Connect Integration
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
