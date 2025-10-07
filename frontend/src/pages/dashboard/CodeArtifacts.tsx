import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Code,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  FileCode,
  Rocket,
  X,
} from 'lucide-react';

// Types
interface CodeArtifact {
  id: string;
  name: string;
  artifactType: 'react_component' | 'api_endpoint' | 'database_migration' | 'service_class' | 'utility_function' | 'test_suite' | 'configuration' | 'documentation' | 'full_application';
  language: string;
  framework?: string;
  code: string;
  status: 'draft' | 'generated' | 'reviewed' | 'approved' | 'deployed' | 'failed';
  syntaxValid: boolean;
  version: number;
  agentId: string;
  agentName?: string;
  reasoning: string;
  createdAt: string;
  deployedAt?: string;
  deploymentEnvironment?: string;
}

const CodeArtifacts: React.FC = () => {
  const { organization } = useAuthStore();
  const [artifacts, setArtifacts] = useState<CodeArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchArtifacts();
  }, [organization]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/code-artifacts?organizationId=${organization?.id}&status=${filterStatus}&type=${filterType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setArtifacts(data);
      }
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtifacts = artifacts.filter(artifact =>
    artifact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artifact.reasoning.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800';
      case 'generated':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Rocket className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'reviewed':
        return <Eye className="w-4 h-4" />;
      case 'generated':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'react_component':
        return '⚛️';
      case 'api_endpoint':
        return '🔌';
      case 'database_migration':
        return '🗄️';
      case 'service_class':
        return '⚙️';
      case 'utility_function':
        return '🔧';
      case 'test_suite':
        return '🧪';
      case 'configuration':
        return '⚙️';
      case 'documentation':
        return '📚';
      case 'full_application':
        return '🚀';
      default:
        return '📄';
    }
  };

  const handleDeploy = async (artifactId: string) => {
    if (!confirm('Deploy this artifact to production?')) {
      return;
    }

    try {
      const response = await fetch(`/api/code-artifacts/${artifactId}/deploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          environment: 'production',
          deploymentNotes: 'Manual deployment from UI'
        })
      });

      if (response.ok) {
        alert('Artifact deployed successfully!');
        fetchArtifacts();
      } else {
        alert('Failed to deploy artifact');
      }
    } catch (error) {
      console.error('Error deploying artifact:', error);
      alert('Failed to deploy artifact');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Code className="w-8 h-8" />
            AI Code Artifacts
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage AI-generated code with full transparency
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Artifacts</p>
              <p className="text-2xl font-bold text-gray-900">{artifacts.length}</p>
            </div>
            <Code className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Deployed</p>
              <p className="text-2xl font-bold text-green-600">
                {artifacts.filter(a => a.status === 'deployed').length}
              </p>
            </div>
            <Rocket className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Approved</p>
              <p className="text-2xl font-bold text-blue-600">
                {artifacts.filter(a => a.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Review</p>
              <p className="text-2xl font-bold text-purple-600">
                {artifacts.filter(a => a.status === 'reviewed').length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Syntax Valid</p>
              <p className="text-2xl font-bold text-green-600">
                {artifacts.filter(a => a.syntaxValid).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              fetchArtifacts();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="generated">Generated</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="deployed">Deployed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              fetchArtifacts();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="react_component">React Component</option>
            <option value="api_endpoint">API Endpoint</option>
            <option value="database_migration">Database Migration</option>
            <option value="service_class">Service Class</option>
            <option value="utility_function">Utility Function</option>
            <option value="test_suite">Test Suite</option>
          </select>
        </div>
      </div>

      {/* Artifacts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredArtifacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No artifacts found</h3>
          <p className="text-gray-600">AI-generated code artifacts will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artifact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredArtifacts.map((artifact) => (
                <tr key={artifact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(artifact.artifactType)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{artifact.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {artifact.reasoning.substring(0, 60)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {artifact.artifactType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-mono">
                        {artifact.language}
                      </span>
                      {artifact.framework && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {artifact.framework}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(artifact.status)}`}>
                        {getStatusIcon(artifact.status)}
                        {artifact.status}
                      </span>
                      {!artifact.syntaxValid && (
                        <AlertCircle className="w-4 h-4 text-red-600" title="Syntax errors detected" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    v{artifact.version}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedArtifact(artifact);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {artifact.status === 'approved' && (
                        <button
                          onClick={() => handleDeploy(artifact.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Deploy"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const blob = new Blob([artifact.code], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${artifact.name}.${artifact.language}`;
                          a.click();
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedArtifact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getTypeIcon(selectedArtifact.artifactType)}</span>
                <div>
                  <h2 className="text-2xl font-bold">{selectedArtifact.name}</h2>
                  <p className="text-sm text-gray-600">
                    Generated by {selectedArtifact.agentName || 'AI Agent'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedArtifact.status)}`}>
                      {getStatusIcon(selectedArtifact.status)}
                      {selectedArtifact.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Version</label>
                  <p className="mt-1 text-gray-900">v{selectedArtifact.version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Language</label>
                  <p className="mt-1">
                    <span className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded font-mono">
                      {selectedArtifact.language}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Syntax Valid</label>
                  <p className="mt-1 flex items-center gap-2">
                    {selectedArtifact.syntaxValid ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-600 font-medium">Valid</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-600 font-medium">Errors Detected</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">AI Reasoning</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-900">{selectedArtifact.reasoning}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Generated Code</label>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100 font-mono">
                    <code>{selectedArtifact.code}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                {selectedArtifact.status === 'approved' && (
                  <button
                    onClick={() => handleDeploy(selectedArtifact.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Rocket className="w-5 h-5" />
                    Deploy to Production
                  </button>
                )}
                <button
                  onClick={() => {
                    const blob = new Blob([selectedArtifact.code], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedArtifact.name}.${selectedArtifact.language}`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
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

export default CodeArtifacts;
