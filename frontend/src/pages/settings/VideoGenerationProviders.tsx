import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Zap,
  Shield,
  Eye,
  Heart,
  Image as ImageIcon,
} from 'lucide-react';

interface VideoGenProvider {
  id: string;
  name: string;
  type: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  webhookUrl?: string;
  config?: any;
  supportsLipSync: boolean;
  supportsEyeMovement: boolean;
  supportsEmotions: boolean;
  supportsBackground: boolean;
  monthlyMinutes?: number;
  costPerMinute?: number;
  maxVideoLength?: number;
  maxResolution?: string;
  avgProcessingTime?: number;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  healthStatus?: string;
  lastHealthCheck?: string;
  createdAt: string;
  updatedAt: string;
}

const providerTypes = [
  { value: 'D_ID', label: 'D-ID', description: 'Best for realistic lip-sync', logo: '🎭' },
  { value: 'HEYGEN', label: 'HeyGen', description: 'Professional AI avatars', logo: '👔' },
  { value: 'SYNTHESIA', label: 'Synthesia', description: 'Enterprise-grade videos', logo: '🎬' },
  { value: 'WAV2LIP', label: 'Wav2Lip', description: 'Self-hosted lip-sync', logo: '🔧' },
  { value: 'SADTALKER', label: 'SadTalker', description: 'Advanced facial animation', logo: '🎨' },
  { value: 'LIVEPORTRAIT', label: 'LivePortrait', description: 'Real-time reenactment', logo: '⚡' },
  { value: 'MURF_AI', label: 'Murf.ai', description: 'Voice-focused generation', logo: '🎤' },
  { value: 'CUSTOM', label: 'Custom', description: 'Your own integration', logo: '🔌' },
];

const VideoGenerationProviders: React.FC = () => {
  const [providers, setProviders] = useState<VideoGenProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<VideoGenProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'D_ID',
    displayName: '',
    description: '',
    logoUrl: '',
    apiKey: '',
    apiSecret: '',
    apiUrl: '',
    webhookUrl: '',
    config: '{}',
    supportsLipSync: true,
    supportsEyeMovement: false,
    supportsEmotions: false,
    supportsBackground: false,
    monthlyMinutes: 0,
    costPerMinute: 0,
    maxVideoLength: 60,
    maxResolution: '1080p',
    avgProcessingTime: 30,
    priority: 0,
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await api.get('/video-generation-providers');
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProvider) {
        await api.put(`/video-generation-providers/${editingProvider.id}`, formData);
        toast.success('Provider updated successfully!');
      } else {
        await api.post('/video-generation-providers', formData);
        toast.success('Provider added successfully!');
      }

      setShowModal(false);
      setEditingProvider(null);
      resetForm();
      fetchProviders();
    } catch (error: any) {
      console.error('Error saving provider:', error);
      toast.error(error.response?.data?.error || 'Failed to save provider');
    }
  };

  const handleEdit = (provider: VideoGenProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      displayName: provider.displayName,
      description: provider.description || '',
      logoUrl: provider.logoUrl || '',
      apiKey: '', // Don't show existing key for security
      apiSecret: '', // Don't show existing secret
      apiUrl: provider.apiUrl || '',
      webhookUrl: provider.webhookUrl || '',
      config: JSON.stringify(provider.config || {}, null, 2),
      supportsLipSync: provider.supportsLipSync,
      supportsEyeMovement: provider.supportsEyeMovement,
      supportsEmotions: provider.supportsEmotions,
      supportsBackground: provider.supportsBackground,
      monthlyMinutes: provider.monthlyMinutes || 0,
      costPerMinute: provider.costPerMinute || 0,
      maxVideoLength: provider.maxVideoLength || 60,
      maxResolution: provider.maxResolution || '1080p',
      avgProcessingTime: provider.avgProcessingTime || 30,
      priority: provider.priority,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      await api.delete(`/video-generation-providers/${id}`);
      toast.success('Provider deleted successfully!');
      fetchProviders();
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast.error(error.response?.data?.error || 'Failed to delete provider');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      toast.loading('Testing connection...', { id: 'test-connection' });
      await api.post(`/video-generation-providers/${id}/test`);
      toast.success('Connection successful!', { id: 'test-connection' });
      fetchProviders();
    } catch (error: any) {
      toast.error('Connection failed', { id: 'test-connection' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'D_ID',
      displayName: '',
      description: '',
      logoUrl: '',
      apiKey: '',
      apiSecret: '',
      apiUrl: '',
      webhookUrl: '',
      config: '{}',
      supportsLipSync: true,
      supportsEyeMovement: false,
      supportsEmotions: false,
      supportsBackground: false,
      monthlyMinutes: 0,
      costPerMinute: 0,
      maxVideoLength: 60,
      maxResolution: '1080p',
      avgProcessingTime: 30,
      priority: 0,
      isActive: true,
      isDefault: false,
    });
  };

  const getHealthStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Video className="h-8 w-8 text-indigo-600" />
              Video Generation Providers
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Configure video generation services for lip-sync and facial animation
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProvider(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No providers configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your first video generation provider to enable lip-sync and facial animation
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            Add Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center text-2xl">
                      {providerTypes.find((t) => t.value === provider.type)?.logo || '🎥'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{provider.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.isDefault && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium rounded">
                        Default
                      </span>
                    )}
                    {getHealthStatusIcon(provider.healthStatus)}
                  </div>
                </div>
                {provider.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {provider.description}
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {provider.supportsLipSync ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">Lip Sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {provider.supportsEyeMovement ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">Eye Movement</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {provider.supportsEmotions ? (
                      <Heart className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">Emotions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {provider.supportsBackground ? (
                      <ImageIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-700 dark:text-gray-300">Background</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Cost</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${provider.costPerMinute?.toFixed(2) || '0.00'}/min
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Processing</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ~{provider.avgProcessingTime || 30}s
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                    <Zap className="w-4 h-4" />
                    <span>Priority</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{provider.priority}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {provider.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                <button
                  onClick={() => handleTestConnection(provider.id)}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Test
                </button>
                <button
                  onClick={() => handleEdit(provider)}
                  className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingProvider ? 'Edit Provider' : 'Add Video Generation Provider'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProvider(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Provider Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      {providerTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.logo} {type.label} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="My D-ID Provider"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Internal Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="d-id-production"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority (0-100)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Provider description..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* API Configuration */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    API Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key {editingProvider ? '(leave empty to keep existing)' : '*'}
                      </label>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required={!editingProvider}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Secret (optional)
                      </label>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="secret-..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API URL (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.apiUrl}
                        onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                        placeholder="https://api.provider.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Webhook URL (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.webhookUrl}
                        onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                        placeholder="https://your-api.com/webhooks"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Supported Features
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supportsLipSync}
                        onChange={(e) => setFormData({ ...formData, supportsLipSync: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Lip Sync</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supportsEyeMovement}
                        onChange={(e) => setFormData({ ...formData, supportsEyeMovement: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Eye Movement</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supportsEmotions}
                        onChange={(e) => setFormData({ ...formData, supportsEmotions: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Emotions</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supportsBackground}
                        onChange={(e) => setFormData({ ...formData, supportsBackground: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Background</span>
                    </label>
                  </div>
                </div>

                {/* Limits & Performance */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Limits & Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Monthly Minutes
                      </label>
                      <input
                        type="number"
                        value={formData.monthlyMinutes}
                        onChange={(e) => setFormData({ ...formData, monthlyMinutes: parseInt(e.target.value) })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cost per Minute ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costPerMinute}
                        onChange={(e) => setFormData({ ...formData, costPerMinute: parseFloat(e.target.value) })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Avg Processing Time (s)
                      </label>
                      <input
                        type="number"
                        value={formData.avgProcessingTime}
                        onChange={(e) => setFormData({ ...formData, avgProcessingTime: parseInt(e.target.value) })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Video Length (s)
                      </label>
                      <input
                        type="number"
                        value={formData.maxVideoLength}
                        onChange={(e) => setFormData({ ...formData, maxVideoLength: parseInt(e.target.value) })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Resolution
                      </label>
                      <select
                        value={formData.maxResolution}
                        onChange={(e) => setFormData({ ...formData, maxResolution: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="480p">480p</option>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                        <option value="4K">4K</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h3>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Set as Default</span>
                    </label>
                  </div>
                </div>

                {/* Provider Config JSON */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Provider-Specific Configuration (JSON)
                  </h3>
                  <textarea
                    value={formData.config}
                    onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                    rows={6}
                    placeholder='{ "driver_expressions": true, "fluent": true }'
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Provider-specific settings in JSON format. Refer to provider documentation for available options.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProvider(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingProvider ? 'Update Provider' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGenerationProviders;
