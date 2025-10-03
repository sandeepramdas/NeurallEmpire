import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Key, Copy, Trash2, Eye, EyeOff, Plus, X, Check, AlertCircle } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'inactive';
  usageCount: number;
}

const APIKeys: React.FC = () => {
  const { } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Mock data for demonstration
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'ne_live_1234567890abcdefghijklmnopqrstuvwxyz',
      createdAt: '2025-01-15',
      lastUsed: '2025-10-04',
      status: 'active',
      usageCount: 15234,
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'ne_dev_abcdefghijklmnopqrstuvwxyz1234567890',
      createdAt: '2025-02-10',
      lastUsed: '2025-10-03',
      status: 'active',
      usageCount: 8921,
    },
    {
      id: '3',
      name: 'Testing API Key',
      key: 'ne_test_zyxwvutsrqponmlkjihgfedcba0987654321',
      createdAt: '2025-03-20',
      lastUsed: '2025-09-28',
      status: 'active',
      usageCount: 3456,
    },
    {
      id: '4',
      name: 'Legacy API Key',
      key: 'ne_legacy_0987654321zyxwvutsrqponmlkjihgfedcba',
      createdAt: '2024-11-05',
      lastUsed: '2025-08-15',
      status: 'inactive',
      usageCount: 892,
    },
  ]);

  const maskKey = (key: string) => {
    const prefix = key.substring(0, 8);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${'*'.repeat(24)}${suffix}`;
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const copyToClipboard = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const newKey = {
      id: (apiKeys.length + 1).toString(),
      name: newKeyName,
      key: `ne_new_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      status: 'active' as const,
      usageCount: 0,
    };

    setApiKeys([...apiKeys, newKey]);
    setCreatedKey(newKey.key);
    setNewKeyName('');
    setIsCreateModalOpen(false);
  };

  const handleRevokeKey = (keyId: string) => {
    if (window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      setApiKeys((keys) => keys.filter((key) => key.id !== keyId));
    }
  };

  const totalUsage = apiKeys.reduce((sum, key) => sum + key.usageCount, 0);
  const activeKeys = apiKeys.filter((key) => key.status === 'active').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-2">Manage your API keys for accessing NeurallEmpire services</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total API Keys</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{apiKeys.length}</p>
            </div>
            <Key className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Keys</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{activeKeys}</p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalUsage.toLocaleString()}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Create New Key Button */}
      <div className="mb-6">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New API Key
        </button>
      </div>

      {/* Recently Created Key Alert */}
      {createdKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-2">API Key Created Successfully!</h3>
              <p className="text-sm text-green-700 mb-3">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono text-gray-900">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey, 'new')}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </button>
                <button
                  onClick={() => setCreatedKey(null)}
                  className="px-3 py-2 border border-green-300 text-green-700 rounded hover:bg-green-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-900">
                        {visibleKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={visibleKeys[apiKey.id] ? 'Hide key' : 'Show key'}
                      >
                        {visibleKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === apiKey.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        apiKey.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {apiKey.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {apiKey.usageCount.toLocaleString()} requests
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(apiKey.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {apiKey.lastUsed === 'Never' ? 'Never' : new Date(apiKey.lastUsed).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRevokeKey(apiKey.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {apiKeys.length === 0 && (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No API keys found</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First API Key
            </button>
          </div>
        )}
      </div>

      {/* Usage Guidelines */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          Security Best Practices
        </h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Never share your API keys publicly or commit them to version control</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use different API keys for different environments (development, staging, production)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Rotate your API keys regularly to maintain security</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Revoke unused or compromised keys immediately</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Monitor API key usage for unusual activity</span>
          </li>
        </ul>
      </div>

      {/* Create API Key Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Key className="w-6 h-6 mr-2 text-indigo-600" />
                Create New API Key
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  placeholder="e.g., Production API Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Give your API key a descriptive name to help you identify its purpose
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">Important Security Notice</p>
                    <p className="text-xs text-yellow-700">
                      Your API key will be shown only once after creation. Make sure to copy and store it securely.
                      You won't be able to see the full key again.
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
                  Create API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeys;
