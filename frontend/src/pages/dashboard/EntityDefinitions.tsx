import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Database,
  Plus,
  Search,
  Grid3x3,
  List,
  Play,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Code,
  Settings,
  Eye,
  Activity,
  GitBranch,
} from 'lucide-react';

// Types
interface EntityDefinition {
  id: string;
  entityName: string;
  displayName: string;
  tableName: string;
  vertical?: string;
  module?: string;
  category?: string;
  status: 'draft' | 'active' | 'deprecated';
  version: number;
  isSystemEntity: boolean;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  schemaDefinition: {
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      unique?: boolean;
    }>;
  };
}

const EntityDefinitions: React.FC = () => {
  const { organization } = useAuthStore();
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityDefinition | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch entities
  useEffect(() => {
    fetchEntities();
  }, [organization]);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/entities?organizationId=${organization?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getToken('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entities
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entity.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entity.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || entity.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'deprecated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'transactional':
        return <Activity className="w-4 h-4" />;
      case 'master':
        return <Database className="w-4 h-4" />;
      case 'reference':
        return <FileText className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const handleActivateEntity = async (entityId: string) => {
    if (!confirm('Are you sure you want to activate this entity? This will create the database table.')) {
      return;
    }

    try {
      const response = await fetch(`/api/entities/${entityId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Entity activated successfully!');
        fetchEntities();
      } else {
        alert('Failed to activate entity');
      }
    } catch (error) {
      console.error('Error activating entity:', error);
      alert('Failed to activate entity');
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!confirm('Are you sure you want to delete this entity?')) {
      return;
    }

    try {
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Entity deleted successfully!');
        fetchEntities();
      } else {
        alert('Failed to delete entity');
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('Failed to delete entity');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-8 h-8" />
            Entity Definitions
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage dynamic business entities for your organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Entity
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Entity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Entities</p>
              <p className="text-2xl font-bold text-gray-900">{entities.length}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {entities.filter(e => e.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Draft</p>
              <p className="text-2xl font-bold text-yellow-600">
                {entities.filter(e => e.status === 'draft').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">System Entities</p>
              <p className="text-2xl font-bold text-purple-600">
                {entities.filter(e => e.isSystemEntity).length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Empty State */}
          {filteredEntities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No entities found' : 'No entities yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Create your first dynamic entity to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                  Create First Entity
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEntities.map((entity) => (
                    <div
                      key={entity.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(entity.category)}
                            <div>
                              <h3 className="font-semibold text-gray-900">{entity.displayName}</h3>
                              <p className="text-sm text-gray-500">{entity.entityName}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entity.status)}`}>
                            {entity.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {entity.description || 'No description provided'}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {entity.vertical && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                              {entity.vertical}
                            </span>
                          )}
                          {entity.module && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {entity.module}
                            </span>
                          )}
                          {entity.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <Code className="w-4 h-4" />
                            {entity.schemaDefinition.columns.length} columns
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-4 h-4" />
                            v{entity.version}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedEntity(entity);
                              setShowDetailModal(true);
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {entity.status === 'draft' && !entity.isSystemEntity && (
                            <button
                              onClick={() => handleActivateEntity(entity.id)}
                              className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Activate
                            </button>
                          )}
                          {!entity.isSystemEntity && entity.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteEntity(entity.id)}
                              className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vertical</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Columns</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEntities.map((entity) => (
                        <tr key={entity.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {getCategoryIcon(entity.category)}
                              <div>
                                <div className="font-medium text-gray-900">{entity.displayName}</div>
                                <div className="text-sm text-gray-500">{entity.entityName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{entity.vertical || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {entity.schemaDefinition.columns.length}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entity.status)}`}>
                              {entity.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">v{entity.version}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedEntity(entity);
                                  setShowDetailModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {entity.status === 'draft' && !entity.isSystemEntity && (
                                <>
                                  <button
                                    onClick={() => handleActivateEntity(entity.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntity(entity.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create New Entity</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600">
              Entity creation form will be implemented in EntityDefinitionForm.tsx
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selectedEntity.displayName}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Entity Name</label>
                  <p className="mt-1 text-gray-900">{selectedEntity.entityName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Table Name</label>
                  <p className="mt-1 text-gray-900 font-mono text-sm">{selectedEntity.tableName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedEntity.status)}`}>
                      {selectedEntity.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Version</label>
                  <p className="mt-1 text-gray-900">v{selectedEntity.version}</p>
                </div>
              </div>

              {selectedEntity.description && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-gray-900">{selectedEntity.description}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Schema</label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-700">Column</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">Type</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntity.schemaDefinition.columns.map((col, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-sm font-mono">{col.name}</td>
                          <td className="py-2 text-sm text-gray-600">{col.type}</td>
                          <td className="py-2 text-sm">
                            {col.nullable === false && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded mr-1">NOT NULL</span>
                            )}
                            {col.unique && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">UNIQUE</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityDefinitions;
