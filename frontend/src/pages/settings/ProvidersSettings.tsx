import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  Globe,
  FileText,
  Sparkles,
  Eye,
  MessageSquare,
  Zap,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Provider {
  id: string;
  code: string;
  name: string;
  displayName: string;
  apiBaseUrl: string;
  apiDocUrl?: string;
  website?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  maxTokensLimit?: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

const ProvidersSettings: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    displayName: '',
    apiBaseUrl: '',
    apiDocUrl: '',
    website: '',
    icon: '',
    color: '#6366f1',
    isActive: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
    maxTokensLimit: '',
    orderIndex: 0,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai-models/providers');
      setProviders(response.data.providers || []);
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'maxTokensLimit' || name === 'orderIndex') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      displayName: '',
      apiBaseUrl: '',
      apiDocUrl: '',
      website: '',
      icon: '',
      color: '#6366f1',
      isActive: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      maxTokensLimit: '',
      orderIndex: 0,
    });
    setEditingProvider(null);
    setShowForm(false);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      code: provider.code,
      name: provider.name,
      displayName: provider.displayName,
      apiBaseUrl: provider.apiBaseUrl,
      apiDocUrl: provider.apiDocUrl || '',
      website: provider.website || '',
      icon: provider.icon || '',
      color: provider.color || '#6366f1',
      isActive: provider.isActive,
      supportsStreaming: provider.supportsStreaming,
      supportsVision: provider.supportsVision,
      supportsFunctionCalling: provider.supportsFunctionCalling,
      maxTokensLimit: provider.maxTokensLimit?.toString() || '',
      orderIndex: provider.orderIndex,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: any = {
        ...formData,
        maxTokensLimit: formData.maxTokensLimit ? parseInt(formData.maxTokensLimit as any) : undefined,
      };

      if (editingProvider) {
        await api.put(`/ai-models/providers/${editingProvider.id}`, payload);
        toast.success('Provider updated successfully');
      } else {
        await api.post('/ai-models/providers', payload);
        toast.success('Provider created successfully');
      }

      fetchProviders();
      resetForm();
    } catch (error: any) {
      console.error('Error saving provider:', error);
      toast.error(error.response?.data?.error || 'Failed to save provider');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the provider "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/ai-models/providers/${id}`);
      toast.success('Provider deleted successfully');
      fetchProviders();
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast.error(error.response?.data?.error || 'Failed to delete provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Model Providers</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage AI provider integrations and their capabilities
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {/* Provider Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingProvider ? 'Edit Provider' : 'Add New Provider'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., openai"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., OpenAI"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., OpenAI GPT Models"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* URLs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Base URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="apiBaseUrl"
                  value={formData.apiBaseUrl}
                  onChange={handleInputChange}
                  required
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Documentation URL
                  </label>
                  <input
                    type="url"
                    name="apiDocUrl"
                    value={formData.apiDocUrl}
                    onChange={handleInputChange}
                    placeholder="https://docs.example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://www.example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Appearance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon (emoji or URL)
                  </label>
                  <input
                    type="text"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    placeholder="🤖 or URL"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brand Color
                  </label>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Capabilities
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="supportsStreaming"
                      checked={formData.supportsStreaming}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Supports Streaming</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="supportsVision"
                      checked={formData.supportsVision}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Supports Vision</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="supportsFunctionCalling"
                      checked={formData.supportsFunctionCalling}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Supports Function Calling</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Tokens Limit
                  </label>
                  <input
                    type="number"
                    name="maxTokensLimit"
                    value={formData.maxTokensLimit}
                    onChange={handleInputChange}
                    placeholder="e.g., 128000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="orderIndex"
                    value={formData.orderIndex}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingProvider ? 'Update Provider' : 'Create Provider'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Providers List */}
      <div className="grid gap-4">
        {providers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No providers configured yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Add your first provider
            </button>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon/Logo */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: provider.color + '20', color: provider.color }}
                  >
                    {provider.icon || '🤖'}
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.displayName}
                      </h3>
                      <span className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {provider.code}
                      </span>
                      {!provider.isActive && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {provider.apiBaseUrl}
                    </p>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {provider.supportsStreaming && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          <Zap className="w-3 h-3" /> Streaming
                        </span>
                      )}
                      {provider.supportsVision && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          <Eye className="w-3 h-3" /> Vision
                        </span>
                      )}
                      {provider.supportsFunctionCalling && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          <MessageSquare className="w-3 h-3" /> Functions
                        </span>
                      )}
                      {provider.maxTokensLimit && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {provider.maxTokensLimit.toLocaleString()} tokens
                        </span>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex gap-3 text-sm">
                      {provider.website && (
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <Globe className="w-4 h-4" />
                          Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {provider.apiDocUrl && (
                        <a
                          href={provider.apiDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <FileText className="w-4 h-4" />
                          Docs
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id, provider.name)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProvidersSettings;
