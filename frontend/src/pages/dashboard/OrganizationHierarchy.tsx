import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Users,
  GitBranch,
  Settings,
  Building,
  Briefcase,
  UserCircle,
} from 'lucide-react';

// Types
interface OrganizationNode {
  id: string;
  name: string;
  slug: string;
  level: number;
  type: string;
  parentId?: string;
  children: OrganizationNode[];
  userCount?: number;
  description?: string;
}

const OrganizationHierarchy: React.FC = () => {
  const { organization } = useAuthStore();
  const [hierarchyTree, setHierarchyTree] = useState<OrganizationNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);

  useEffect(() => {
    fetchHierarchy();
  }, [organization]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organization?.id}/hierarchy`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHierarchyTree(data);
        // Auto-expand root node
        setExpandedNodes(new Set([data.id]));
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'holding':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'subsidiary':
        return <Building className="w-5 h-5 icon-active" />;
      case 'division':
        return <GitBranch className="w-5 h-5 text-green-600" />;
      case 'department':
        return <Briefcase className="w-5 h-5 text-orange-600" />;
      case 'team':
        return <Users className="w-5 h-5 text-pink-600" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'holding':
        return 'bg-purple-100 text-purple-800';
      case 'subsidiary':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'division':
        return 'bg-green-100 text-green-800';
      case 'department':
        return 'bg-orange-100 text-orange-800';
      case 'team':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const TreeNode: React.FC<{ node: OrganizationNode; level: number }> = ({ node, level }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;

    return (
      <div className="relative">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'hover:bg-gray-100'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(node.id);
            }}
            className={`flex-shrink-0 ${!hasChildren && 'invisible'}`}
          >
            {hasChildren && (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </>
            )}
          </button>

          {/* Icon */}
          <div className="flex-shrink-0">
            {getTypeIcon(node.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{node.name}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(node.type)}`}>
                {node.type}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{node.slug}</p>
              {node.userCount !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="w-3 h-3" />
                  {node.userCount} users
                </span>
              )}
            </div>
          </div>

          {/* Level Badge */}
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">L{node.level}</span>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <GitBranch className="w-8 h-8" />
            Organization Hierarchy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your organizational structure with unlimited levels
          </p>
        </div>
        <button
          onClick={() => console.log('Add organization - Coming soon')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Organization
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Nodes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {hierarchyTree ? countNodes(hierarchyTree) : 0}
              </p>
            </div>
            <GitBranch className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Max Depth</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {hierarchyTree ? maxDepth(hierarchyTree) : 0}
              </p>
            </div>
            <Settings className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Subsidiaries</p>
              <p className="text-2xl font-bold icon-active">
                {hierarchyTree ? countByType(hierarchyTree, 'subsidiary') : 0}
              </p>
            </div>
            <Building className="w-8 h-8 icon-active" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Divisions</p>
              <p className="text-2xl font-bold text-green-600">
                {hierarchyTree ? countByType(hierarchyTree, 'division') : 0}
              </p>
            </div>
            <Briefcase className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Teams</p>
              <p className="text-2xl font-bold text-pink-600">
                {hierarchyTree ? countByType(hierarchyTree, 'team') : 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-pink-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree View */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : hierarchyTree ? (
            <div className="space-y-1">
              <TreeNode node={hierarchyTree} level={0} />
            </div>
          ) : (
            <div className="text-center py-12">
              <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No hierarchy data available</p>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {selectedNode ? (
            <div>
              <div className="flex items-start gap-3 mb-6">
                {getTypeIcon(selectedNode.type)}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedNode.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedNode.slug}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(selectedNode.type)}`}>
                  {selectedNode.type}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedNode.level}</p>
                </div>

                {selectedNode.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedNode.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Children</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedNode.children.length}</p>
                </div>

                {selectedNode.userCount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Users</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{selectedNode.userCount}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                  Add Child Organization
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Select a node to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function countNodes(node: OrganizationNode): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) || 0);
}

function maxDepth(node: OrganizationNode, currentDepth: number = 0): number {
  if (!node.children || node.children.length === 0) {
    return currentDepth;
  }
  return Math.max(...node.children.map(child => maxDepth(child, currentDepth + 1)));
}

function countByType(node: OrganizationNode, type: string): number {
  const currentCount = node.type === type ? 1 : 0;
  return currentCount + (node.children?.reduce((sum, child) => sum + countByType(child, type), 0) || 0);
}

export default OrganizationHierarchy;
