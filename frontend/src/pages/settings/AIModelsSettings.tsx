import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { RightPanel } from '@/components/ui/RightPanel';

interface AIProvider {
  id: string;
  code: string;
  name: string;
  displayName: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

interface AIModelConfig {
  id: string;
  modelId: string;
  displayName: string;
  description?: string;
  apiKeyPreview: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  isDefault: boolean;
  currentMonthUsage: number;
  monthlyUsageLimit?: number;
  provider: {
    code: string;
    name: string;
    displayName: string;
    icon?: string;
    color?: string;
  };
  createdAt: string;
}

interface ModelFormData {
  providerId: string;
  modelId: string;
  displayName: string;
  description?: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  isDefault: boolean;
}

const AIModelsSettings: React.FC = () => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [formData, setFormData] = useState<ModelFormData>({
    providerId: '',
    modelId: '',
    displayName: '',
    description: '',
    apiKey: '',
    maxTokens: 4000,
    temperature: 0.7,
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [modelsRes, providersRes] = await Promise.all([
        fetch('/api/ai-models/configs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/ai-models/providers', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (!modelsRes.ok || !providersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const modelsData = await modelsRes.json();
      const providersData = await providersRes.json();

      setModels(modelsData.configs || []);
      setProviders(providersData.providers || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddPanel = () => {
    setEditingModel(null);
    setFormData({
      providerId: '',
      modelId: '',
      displayName: '',
      description: '',
      apiKey: '',
      maxTokens: 4000,
      temperature: 0.7,
      isDefault: models.length === 0, // Auto-default if first model
    });
    setFormErrors({});
    setIsPanelOpen(true);
  };

  const openEditPanel = (model: AIModelConfig) => {
    setEditingModel(model);
    setFormData({
      providerId: model.provider.code,
      modelId: model.modelId,
      displayName: model.displayName,
      description: model.description || '',
      apiKey: '', // Don't show existing API key
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      isDefault: model.isDefault,
    });
    setFormErrors({});
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setEditingModel(null);
    setFormData({
      providerId: '',
      modelId: '',
      displayName: '',
      description: '',
      apiKey: '',
      maxTokens: 4000,
      temperature: 0.7,
      isDefault: false,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.providerId) errors.providerId = 'Provider is required';
    if (!formData.modelId) errors.modelId = 'Model ID is required';
    if (!formData.displayName) errors.displayName = 'Display name is required';
    if (!editingModel && !formData.apiKey) errors.apiKey = 'API key is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      // Find provider object
      const provider = providers.find((p) => p.id === formData.providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const payload = {
        ...formData,
        providerId: provider.id,
      };

      const url = editingModel
        ? `/api/ai-models/configs/${editingModel.id}`
        : '/api/ai-models/configs';

      const response = await fetch(url, {
        method: editingModel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save model');
      }

      await fetchData();
      closePanel();
    } catch (err: any) {
      console.error('Error saving model:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI model configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-models/configs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete model');
      }

      await fetchData();
    } catch (err: any) {
      console.error('Error deleting model:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading AI models...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            <span>AI Model Configuration</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Configure AI models from various providers to use across your platform
          </p>
        </div>
        <button
          onClick={openAddPanel}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Model</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Models List */}
      {models.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No AI models configured
          </h3>
          <p className="text-gray-600 mb-6">
            Add your first AI model to start using AI-powered features
          </p>
          <button
            onClick={openAddPanel}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5" />
            <span>Add Your First Model</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Model Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3 flex-1">
                  {model.provider.icon && (
                    <img
                      src={model.provider.icon}
                      alt={model.provider.name}
                      className="w-10 h-10 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {model.displayName}
                      </h3>
                      {model.isDefault && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {model.provider.displayName}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditPanel(model)}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
                    title="Delete"
                    disabled={model.isDefault}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Model Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Model ID:</span>
                  <span className="font-mono text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {model.modelId}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">API Key:</span>
                  <span className="font-mono text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {model.apiKeyPreview}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Usage This Month:</span>
                  <span className="text-gray-900">
                    {model.currentMonthUsage}
                    {model.monthlyUsageLimit && ` / ${model.monthlyUsageLimit}`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`flex items-center space-x-1 ${
                      model.isActive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {model.isActive ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        <span>Inactive</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Panel */}
      <RightPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        title={editingModel ? 'Edit AI Model' : 'Add AI Model'}
        width="60%"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6"
        >
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.providerId}
              onChange={(e) =>
                setFormData({ ...formData, providerId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.displayName}
                </option>
              ))}
            </select>
            {formErrors.providerId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.providerId}</p>
            )}
          </div>

          {/* Model ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.modelId}
              onChange={(e) =>
                setFormData({ ...formData, modelId: e.target.value })
              }
              placeholder="e.g., gpt-4-turbo-preview, claude-3-opus-20240229"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            {formErrors.modelId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.modelId}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              placeholder="e.g., GPT-4 Turbo, Claude 3 Opus"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            {formErrors.displayName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.displayName}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description of this model configuration"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key {!editingModel && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) =>
                setFormData({ ...formData, apiKey: e.target.value })
              }
              placeholder={
                editingModel
                  ? 'Leave blank to keep existing key'
                  : 'Enter your API key'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required={!editingModel}
            />
            {formErrors.apiKey && (
              <p className="mt-1 text-sm text-red-600">{formErrors.apiKey}</p>
            )}
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={formData.maxTokens}
              onChange={(e) =>
                setFormData({ ...formData, maxTokens: parseInt(e.target.value) })
              }
              min={1}
              max={200000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature ({formData.temperature})
            </label>
            <input
              type="range"
              value={formData.temperature}
              onChange={(e) =>
                setFormData({ ...formData, temperature: parseFloat(e.target.value) })
              }
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Deterministic (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Is Default */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
              Set as default model
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={closePanel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingModel
                ? 'Update Model'
                : 'Add Model'}
            </button>
          </div>
        </form>
      </RightPanel>
    </div>
  );
};

export default AIModelsSettings;
