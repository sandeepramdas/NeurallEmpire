import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface AvatarConfig {
  id: string;
  name: string;
  description?: string;
  avatarType: string;
  gender: string;
  style?: string;
  imageUrl?: string;
  videoUrl?: string;
  modelUrl?: string;
  provider?: string;
  providerId?: string;
  apiKeyPreview?: string;
  skinTone?: string;
  hairColor?: string;
  eyeColor?: string;
  outfit?: string;
  background?: string;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  tags: string[];
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://neurallempire-production.up.railway.app';

const AVATAR_TYPES = [
  { value: 'REALISTIC_3D', label: 'Realistic 3D', icon: '👤' },
  { value: 'PROFESSIONAL', label: 'Professional', icon: '💼' },
  { value: 'CARTOON', label: 'Cartoon', icon: '🎨' },
  { value: 'ANIME', label: 'Anime', icon: '⭐' },
  { value: 'CUSTOM', label: 'Custom', icon: '🖼️' },
];

const AVATAR_PROVIDERS = [
  { value: 'D-ID', label: 'D-ID' },
  { value: 'HEYGEN', label: 'HeyGen' },
  { value: 'SYNTHESIA', label: 'Synthesia' },
  { value: 'CUSTOM', label: 'Custom' },
];

const AvatarConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<AvatarConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatarType: 'REALISTIC_3D',
    gender: 'neutral',
    style: '',
    imageUrl: '',
    videoUrl: '',
    modelUrl: '',
    provider: '',
    providerId: '',
    apiKey: '',
    skinTone: '',
    hairColor: '',
    eyeColor: '',
    outfit: '',
    background: '',
    isDefault: false,
    tags: [] as string[],
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/avatar-configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(response.data.configs);
    } catch (error) {
      console.error('Error fetching avatar configs:', error);
      toast.error('Failed to load avatar configurations');
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
          `${API_URL}/api/avatar-configs/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Avatar configuration updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/avatar-configs`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Avatar configuration created successfully');
      }

      fetchConfigs();
      resetForm();
    } catch (error: any) {
      console.error('Error saving avatar config:', error);
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    }
  };

  const handleEdit = (config: AvatarConfig) => {
    setFormData({
      name: config.name,
      description: config.description || '',
      avatarType: config.avatarType,
      gender: config.gender,
      style: config.style || '',
      imageUrl: config.imageUrl || '',
      videoUrl: config.videoUrl || '',
      modelUrl: config.modelUrl || '',
      provider: config.provider || '',
      providerId: config.providerId || '',
      apiKey: '',
      skinTone: config.skinTone || '',
      hairColor: config.hairColor || '',
      eyeColor: config.eyeColor || '',
      outfit: config.outfit || '',
      background: config.background || '',
      isDefault: config.isDefault,
      tags: config.tags,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this avatar configuration?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/avatar-configs/${id}`, {
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
      avatarType: 'REALISTIC_3D',
      gender: 'neutral',
      style: '',
      imageUrl: '',
      videoUrl: '',
      modelUrl: '',
      provider: '',
      providerId: '',
      apiKey: '',
      skinTone: '',
      hairColor: '',
      eyeColor: '',
      outfit: '',
      background: '',
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
                Avatar Configurations
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your video avatar configurations
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
                    placeholder="e.g., Professional Business Avatar"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Avatar Type *
                  </label>
                  <select
                    required
                    value={formData.avatarType}
                    onChange={(e) => setFormData({ ...formData, avatarType: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {AVATAR_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {AVATAR_PROVIDERS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Model URL
                  </label>
                  <input
                    type="url"
                    value={formData.modelUrl}
                    onChange={(e) => setFormData({ ...formData, modelUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Provider ID
                  </label>
                  <input
                    type="text"
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Provider-specific ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Skin Tone
                  </label>
                  <input
                    type="text"
                    value={formData.skinTone}
                    onChange={(e) => setFormData({ ...formData, skinTone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Light, Medium, Dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hair Color
                  </label>
                  <input
                    type="text"
                    value={formData.hairColor}
                    onChange={(e) => setFormData({ ...formData, hairColor: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Black, Brown, Blonde"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Eye Color
                  </label>
                  <input
                    type="text"
                    value={formData.eyeColor}
                    onChange={(e) => setFormData({ ...formData, eyeColor: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Brown, Blue, Green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Outfit
                  </label>
                  <input
                    type="text"
                    value={formData.outfit}
                    onChange={(e) => setFormData({ ...formData, outfit: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Business Suit, Casual"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Background
                  </label>
                  <input
                    type="text"
                    value={formData.background}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Office, Studio, Custom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Style
                  </label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Overall style description"
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
                    placeholder="Describe this avatar configuration..."
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

              {/* Avatar Preview */}
              <div className="mb-4">
                {config.imageUrl ? (
                  <img
                    src={config.imageUrl}
                    alt={config.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <div className="text-6xl">
                      {AVATAR_TYPES.find((t) => t.value === config.avatarType)?.icon || '👤'}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {config.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {AVATAR_TYPES.find((t) => t.value === config.avatarType)?.label}
                </p>
              </div>

              {config.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {config.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Gender:</span>
                  <span className="text-gray-900 dark:text-white capitalize">{config.gender}</span>
                </div>
                {config.provider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Provider:</span>
                    <span className="text-gray-900 dark:text-white">{config.provider}</span>
                  </div>
                )}
                {config.style && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Style:</span>
                    <span className="text-gray-900 dark:text-white">{config.style}</span>
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
            <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No avatar configurations
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new avatar configuration.
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

export default AvatarConfigManager;
