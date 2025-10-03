import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Webhook,
  Plus,
  X,
  Check,
  CheckCheck,
  AlertCircle,
  Globe,
  Key,
  Copy,
  ToggleLeft,
  ToggleRight,
  Send,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Code,
  Trash2,
} from 'lucide-react';

type WebhookEvent =
  | 'agent.created'
  | 'agent.updated'
  | 'agent.deleted'
  | 'campaign.sent'
  | 'campaign.opened'
  | 'campaign.clicked'
  | 'message.received'
  | 'user.created'
  | 'user.updated';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  isEnabled: boolean;
  secretKey: string;
  headers: { key: string; value: string }[];
  createdAt: string;
  lastTriggered?: string;
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: 'success' | 'failed' | 'pending';
  statusCode?: number;
  timestamp: string;
  responseTime: number;
  errorMessage?: string;
  payload: any;
}

const Webhooks: React.FC = () => {
  const { organization } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' }
  ]);

  // Mock webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: '1',
      name: 'Production Webhook',
      url: 'https://api.example.com/webhooks/neurall',
      events: ['agent.created', 'campaign.sent', 'campaign.opened'],
      isEnabled: true,
      secretKey: 'whsec_k8J9mN2pQ3rT4uV5wX6yZ7a',
      headers: [
        { key: 'Authorization', value: 'Bearer prod_token_xyz' },
        { key: 'X-Custom-Header', value: 'custom-value' }
      ],
      createdAt: '2025-01-15T10:00:00Z',
      lastTriggered: '2025-10-04T09:30:00Z',
      deliveryStats: {
        total: 1245,
        successful: 1198,
        failed: 47
      }
    },
    {
      id: '2',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      events: ['campaign.sent', 'message.received'],
      isEnabled: true,
      secretKey: 'whsec_a1B2c3D4e5F6g7H8i9J0k',
      headers: [],
      createdAt: '2025-02-10T14:30:00Z',
      lastTriggered: '2025-10-04T08:15:00Z',
      deliveryStats: {
        total: 892,
        successful: 889,
        failed: 3
      }
    },
    {
      id: '3',
      name: 'Analytics Tracker',
      url: 'https://analytics.company.com/track',
      events: ['campaign.opened', 'campaign.clicked'],
      isEnabled: true,
      secretKey: 'whsec_p9Q8r7S6t5U4v3W2x1Y0z',
      headers: [
        { key: 'X-API-Key', value: 'analytics_key_123' }
      ],
      createdAt: '2025-03-05T11:00:00Z',
      lastTriggered: '2025-10-04T07:45:00Z',
      deliveryStats: {
        total: 3456,
        successful: 3421,
        failed: 35
      }
    },
    {
      id: '4',
      name: 'CRM Integration',
      url: 'https://crm.example.com/api/webhooks',
      events: ['user.created', 'user.updated', 'agent.updated'],
      isEnabled: false,
      secretKey: 'whsec_m4N3o2P1q0R9s8T7u6V5w',
      headers: [
        { key: 'X-CRM-Token', value: 'crm_token_abc' }
      ],
      createdAt: '2025-02-28T16:20:00Z',
      deliveryStats: {
        total: 234,
        successful: 198,
        failed: 36
      }
    },
    {
      id: '5',
      name: 'Development Testing',
      url: 'http://localhost:3000/webhooks',
      events: ['agent.created', 'agent.deleted'],
      isEnabled: true,
      secretKey: 'whsec_x5Y6z7A8b9C0d1E2f3G4h',
      headers: [],
      createdAt: '2025-03-20T09:15:00Z',
      lastTriggered: '2025-10-03T18:30:00Z',
      deliveryStats: {
        total: 156,
        successful: 134,
        failed: 22
      }
    },
    {
      id: '6',
      name: 'Email Service Hook',
      url: 'https://mail.service.com/hooks/incoming',
      events: ['message.received'],
      isEnabled: true,
      secretKey: 'whsec_i8J9k0L1m2N3o4P5q6R7s',
      headers: [
        { key: 'X-Service-Key', value: 'email_service_key' }
      ],
      createdAt: '2025-01-25T13:45:00Z',
      lastTriggered: '2025-10-04T10:00:00Z',
      deliveryStats: {
        total: 2341,
        successful: 2298,
        failed: 43
      }
    },
    {
      id: '7',
      name: 'Backup Webhook',
      url: 'https://backup.example.com/events',
      events: ['agent.created', 'agent.updated', 'agent.deleted', 'campaign.sent'],
      isEnabled: false,
      secretKey: 'whsec_t7U8v9W0x1Y2z3A4b5C6d',
      headers: [],
      createdAt: '2024-12-10T10:30:00Z',
      deliveryStats: {
        total: 567,
        successful: 523,
        failed: 44
      }
    },
    {
      id: '8',
      name: 'Mobile App Notifications',
      url: 'https://push.notifications.com/webhook',
      events: ['campaign.opened', 'campaign.clicked', 'message.received'],
      isEnabled: true,
      secretKey: 'whsec_e6F7g8H9i0J1k2L3m4N5o',
      headers: [
        { key: 'X-App-Token', value: 'mobile_app_token' }
      ],
      createdAt: '2025-02-15T15:00:00Z',
      lastTriggered: '2025-10-04T09:00:00Z',
      deliveryStats: {
        total: 4521,
        successful: 4456,
        failed: 65
      }
    }
  ]);

  // Mock webhook logs
  const [webhookLogs] = useState<WebhookLog[]>([
    {
      id: '1',
      webhookId: '1',
      event: 'campaign.sent',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-04T09:30:00Z',
      responseTime: 145,
      payload: { campaignId: 'camp_123', recipientCount: 500 }
    },
    {
      id: '2',
      webhookId: '2',
      event: 'message.received',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-04T08:15:00Z',
      responseTime: 89,
      payload: { messageId: 'msg_456', from: 'user@example.com' }
    },
    {
      id: '3',
      webhookId: '3',
      event: 'campaign.opened',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-04T07:45:00Z',
      responseTime: 234,
      payload: { campaignId: 'camp_123', userId: 'user_789' }
    },
    {
      id: '4',
      webhookId: '1',
      event: 'agent.created',
      status: 'failed',
      statusCode: 500,
      timestamp: '2025-10-04T07:20:00Z',
      responseTime: 5000,
      errorMessage: 'Internal Server Error: Database connection timeout',
      payload: { agentId: 'agent_321', name: 'Customer Support Bot' }
    },
    {
      id: '5',
      webhookId: '8',
      event: 'campaign.clicked',
      status: 'success',
      statusCode: 201,
      timestamp: '2025-10-04T09:00:00Z',
      responseTime: 178,
      payload: { campaignId: 'camp_456', linkUrl: 'https://example.com' }
    },
    {
      id: '6',
      webhookId: '6',
      event: 'message.received',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-04T10:00:00Z',
      responseTime: 112,
      payload: { messageId: 'msg_789', subject: 'New inquiry' }
    },
    {
      id: '7',
      webhookId: '1',
      event: 'campaign.opened',
      status: 'failed',
      statusCode: 404,
      timestamp: '2025-10-03T18:45:00Z',
      responseTime: 3200,
      errorMessage: 'Endpoint not found',
      payload: { campaignId: 'camp_789' }
    },
    {
      id: '8',
      webhookId: '5',
      event: 'agent.deleted',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-03T18:30:00Z',
      responseTime: 92,
      payload: { agentId: 'agent_654', deletedBy: 'user_123' }
    },
    {
      id: '9',
      webhookId: '2',
      event: 'campaign.sent',
      status: 'success',
      statusCode: 200,
      timestamp: '2025-10-03T16:20:00Z',
      responseTime: 156,
      payload: { campaignId: 'camp_999', recipientCount: 250 }
    },
    {
      id: '10',
      webhookId: '8',
      event: 'message.received',
      status: 'failed',
      statusCode: 503,
      timestamp: '2025-10-03T15:10:00Z',
      responseTime: 10000,
      errorMessage: 'Service Unavailable: Timeout',
      payload: { messageId: 'msg_111' }
    }
  ]);

  const eventOptions: { value: WebhookEvent; label: string }[] = [
    { value: 'agent.created', label: 'Agent Created' },
    { value: 'agent.updated', label: 'Agent Updated' },
    { value: 'agent.deleted', label: 'Agent Deleted' },
    { value: 'campaign.sent', label: 'Campaign Sent' },
    { value: 'campaign.opened', label: 'Campaign Opened' },
    { value: 'campaign.clicked', label: 'Campaign Clicked' },
    { value: 'message.received', label: 'Message Received' },
    { value: 'user.created', label: 'User Created' },
    { value: 'user.updated', label: 'User Updated' }
  ];

  const handleToggleWebhook = (webhookId: string) => {
    setWebhooks(webhooks.map(w =>
      w.id === webhookId ? { ...w, isEnabled: !w.isEnabled } : w
    ));
  };

  const handleDeleteWebhook = (webhookId: string) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
    }
  };

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const newWebhook: WebhookConfig = {
      id: (webhooks.length + 1).toString(),
      name: webhookName,
      url: webhookUrl,
      events: selectedEvents,
      isEnabled: true,
      secretKey: `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      headers: customHeaders.filter(h => h.key && h.value),
      createdAt: new Date().toISOString(),
      deliveryStats: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };

    setWebhooks([...webhooks, newWebhook]);
    setIsCreateModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setWebhookName('');
    setWebhookUrl('');
    setSelectedEvents([]);
    setCustomHeaders([{ key: '', value: '' }]);
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    console.log('Testing webhook:', webhook);
    // Add test webhook logic here
  };

  const handleRetryLog = (logId: string) => {
    console.log('Retrying log:', logId);
    // Add retry logic here
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addHeaderField = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeaderField = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeaderField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  const getWebhookLogs = (webhookId: string) => {
    return webhookLogs.filter(log => log.webhookId === webhookId).slice(0, 5);
  };

  const totalWebhooks = webhooks.length;
  const activeWebhooks = webhooks.filter(w => w.isEnabled).length;
  const totalDeliveries = webhooks.reduce((sum, w) => sum + w.deliveryStats.total, 0);
  const successRate = totalDeliveries > 0
    ? Math.round((webhooks.reduce((sum, w) => sum + w.deliveryStats.successful, 0) / totalDeliveries) * 100)
    : 0;

  const examplePayload = {
    event: 'campaign.sent',
    timestamp: '2025-10-04T12:00:00Z',
    data: {
      campaignId: 'camp_abc123',
      campaignName: 'October Newsletter',
      recipientCount: 1500,
      organizationId: organization?.id || 'org_123',
      triggeredBy: 'user_456'
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600 mt-2">Manage webhook endpoints and delivery logs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Webhooks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalWebhooks}</p>
            </div>
            <Webhook className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeWebhooks}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deliveries</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalDeliveries.toLocaleString()}</p>
            </div>
            <Send className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{successRate}%</p>
            </div>
            <CheckCheck className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex items-center space-x-3">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Webhook
        </button>
        <button
          onClick={() => setIsPayloadModalOpen(true)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <Code className="w-4 h-4 mr-2" />
          View Payload Examples
        </button>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No webhooks configured</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Webhook
            </button>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Webhook Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Webhook className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Globe className="w-4 h-4" />
                          <span className="font-mono">{webhook.url}</span>
                        </div>
                      </div>
                    </div>

                    {/* Events */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleWebhook(webhook.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        webhook.isEnabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={webhook.isEnabled ? 'Disable' : 'Enable'}
                    >
                      {webhook.isEnabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={() => handleTestWebhook(webhook)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Test webhook"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-lg font-bold text-gray-900">{webhook.deliveryStats.total}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Successful</p>
                    <p className="text-lg font-bold text-green-600">{webhook.deliveryStats.successful}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-lg font-bold text-red-600">{webhook.deliveryStats.failed}</p>
                  </div>
                </div>

                {/* Secret Key */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Secret Key:</span>
                      <code className="text-sm font-mono text-yellow-700">{webhook.secretKey}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(webhook.secretKey, webhook.id)}
                      className="text-yellow-600 hover:text-yellow-700 transition-colors"
                    >
                      {copiedKey === webhook.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery Logs */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent Delivery Logs
                </h4>
                <div className="space-y-2">
                  {getWebhookLogs(webhook.id).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No delivery logs yet</p>
                  ) : (
                    getWebhookLogs(webhook.id).map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border ${
                          log.status === 'success'
                            ? 'bg-green-50 border-green-200'
                            : log.status === 'failed'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {log.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : log.status === 'failed' ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-600" />
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">{log.event}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  log.status === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : log.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.statusCode || 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(log.timestamp).toLocaleString()} • {log.responseTime}ms
                              </p>
                              {log.errorMessage && (
                                <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                              )}
                            </div>
                          </div>
                          {log.status === 'failed' && (
                            <button
                              onClick={() => handleRetryLog(log.id)}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Webhook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Webhook className="w-6 h-6 mr-2 text-indigo-600" />
                Create Webhook
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Name</label>
                <input
                  type="text"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  required
                  placeholder="e.g., Production Webhook"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                  placeholder="https://api.example.com/webhooks"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events to Subscribe</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-gray-300 rounded-lg">
                  {eventOptions.map((event) => (
                    <label key={event.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, event.value]);
                          } else {
                            setSelectedEvents(selectedEvents.filter(ev => ev !== event.value));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{event.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Select at least one event to trigger this webhook
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Headers (Optional)</label>
                {customHeaders.map((header, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeaderField(index, 'key', e.target.value)}
                      placeholder="Header key"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeaderField(index, 'value', e.target.value)}
                      placeholder="Header value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    {customHeaders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHeaderField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeaderField}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Header
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Security Notice</p>
                    <p className="text-xs text-blue-700">
                      A secret key will be automatically generated for webhook verification. You can use this key to validate incoming webhook requests.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payload Examples Modal */}
      {isPayloadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Code className="w-6 h-6 mr-2 text-indigo-600" />
                Webhook Payload Examples
              </h2>
              <button
                onClick={() => setIsPayloadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Payload Structure</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(examplePayload, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Authentication</h3>
                <p className="text-sm text-gray-700 mb-2">
                  All webhook requests include a signature in the <code className="bg-gray-200 px-1 py-0.5 rounded">X-NeurallEmpire-Signature</code> header:
                </p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs">
                  X-NeurallEmpire-Signature: sha256=abcdef123456...
                </pre>
              </div>

              <div>
                <a
                  href="https://docs.neurallempire.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Full Documentation
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsPayloadModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
