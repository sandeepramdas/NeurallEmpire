import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

interface TTSConfig {
  id: string;
  name: string;
  description?: string;
  provider: string;
  voiceId?: string;
  voiceName?: string;
  voiceGender: string;
  language: string;
  speed: number;
  pitch: number;
  stability: number;
  similarity: number;
  apiKeyPreview?: string;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  tags: string[];
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://neurallempire-production.up.railway.app';

const TTS_PROVIDERS = [
  { value: 'ELEVENLABS', label: 'ElevenLabs', icon: '🎙️' },
  { value: 'OPENAI_TTS', label: 'OpenAI TTS', icon: '🤖' },
  { value: 'GOOGLE_TTS', label: 'Google TTS', icon: '🌐' },
  { value: 'AZURE_TTS', label: 'Azure TTS', icon: '☁️' },
  { value: 'AWS_POLLY', label: 'AWS Polly', icon: '📢' },
  { value: 'PLAY_HT', label: 'Play.ht', icon: '▶️' },
  { value: 'RESEMBLE_AI', label: 'Resemble.ai', icon: '🎭' },
  { value: 'MURF_AI', label: 'Murf.ai', icon: '🎬' },
];

const TTSConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<TTSConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'ELEVENLABS',
    voiceId: '',
    voiceName: '',
    voiceGender: 'neutral',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    stability: 0.5,
    similarity: 0.75,
    apiKey: '',
    isDefault: false,
    tags: [] as string[],
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tts-configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(response.data.configs);
    } catch (error) {
      console.error('Error fetching TTS configs:', error);
      toast.error('Failed to load TTS configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');

      if (editingId) {
        await axios.put(
          `${API_URL}/api/tts-configs/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('TTS configuration updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/tts-configs`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('TTS configuration created successfully');
      }

      fetchConfigs();
      resetForm();
    } catch (error: any) {
      console.error('Error saving TTS config:', error);
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    }
  };

  const handleEdit = (config: TTSConfig) => {
    setFormData({
      name: config.name,
      description: config.description || '',
      provider: config.provider,
      voiceId: config.voiceId || '',
      voiceName: config.voiceName || '',
      voiceGender: config.voiceGender,
      language: config.language,
      speed: config.speed,
      pitch: config.pitch,
      stability: config.stability,
      similarity: config.similarity,
      apiKey: '',
      isDefault: config.isDefault,
      tags: config.tags,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this TTS configuration?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/tts-configs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      provider: 'ELEVENLABS',
      voiceId: '',
      voiceName: '',
      voiceGender: 'neutral',
      language: 'en-US',
      speed: 1.0,
      pitch: 1.0,
      stability: 0.5,
      similarity: 0.75,
      apiKey: '',
      isDefault: false,
      tags: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                TTS Configurations
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your text-to-speech voice configurations
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {showForm ? (
                <>
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Configuration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Configuration Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Professional Male Voice"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Provider *
                  </label>
                  <select
                    required
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {TTS_PROVIDERS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.icon} {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Voice Name
                  </label>
                  <input
                    type="text"
                    value={formData.voiceName}
                    onChange={(e) => setFormData({ ...formData, voiceName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Samantha"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Voice ID
                  </label>
                  <input
                    type="text"
                    value={formData.voiceId}
                    onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Provider-specific voice ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Language
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., en-US"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender
                  </label>
                  <select
                    value={formData.voiceGender}
                    onChange={(e) => setFormData({ ...formData, voiceGender: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Speed: {formData.speed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={formData.speed}
                    onChange={(e) => setFormData({ ...formData, speed: parseFloat(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pitch: {formData.pitch}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={formData.pitch}
                    onChange={(e) => setFormData({ ...formData, pitch: parseFloat(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stability: {formData.stability}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.stability}
                    onChange={(e) => setFormData({ ...formData, stability: parseFloat(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Similarity: {formData.similarity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.similarity}
                    onChange={(e) => setFormData({ ...formData, similarity: parseFloat(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Provider API key"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Describe this voice configuration..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Set as default configuration
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingId ? 'Update' : 'Create'} Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Configurations List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <div
              key={config.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative"
            >
              {config.isDefault && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Default
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0">
                  <SpeakerWaveIcon className="h-10 w-10 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {config.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {TTS_PROVIDERS.find((p) => p.value === config.provider)?.label}
                  </p>
                </div>
              </div>

              {config.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {config.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Voice:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {config.voiceName || config.voiceId || 'Default'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Language:</span>
                  <span className="text-gray-900 dark:text-white">{config.language}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Speed:</span>
                  <span className="text-gray-900 dark:text-white">{config.speed}x</span>
                </div>
                {config.apiKeyPreview && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">API Key:</span>
                    <span className="text-gray-900 dark:text-white font-mono text-xs">
                      {config.apiKeyPreview}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Usage:</span>
                  <span className="text-gray-900 dark:text-white">{config.usageCount} times</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(config)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {configs.length === 0 && !showForm && (
          <div className="text-center py-12">
            <SpeakerWaveIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No TTS configurations
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new TTS configuration.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TTSConfigManager;
