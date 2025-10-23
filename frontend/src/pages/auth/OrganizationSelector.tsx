import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Building2, ChevronRight, Plus, Crown, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: string;
  role: string;
  memberCount?: number;
  createdAt: string;
}

const OrganizationSelector: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout, setOrganization } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrganizations(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch organizations');
      }
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (org: Organization) => {
    // Set organization in auth store
    setOrganization({
      id: org.id,
      name: org.name,
      slug: org.slug,
    } as any);

    // Store selected organization in localStorage
    localStorage.setItem('selectedOrganization', JSON.stringify(org));

    // Navigate to organization's path-based dashboard
    navigate(`/org/${org.slug}/dashboard`);
  };

  const handleCreateOrganization = () => {
    navigate('/create-organization');
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType.toUpperCase()) {
      case 'OVERLORD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'EMPEROR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CONQUEROR':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER':
        return 'bg-green-100 text-green-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NeurallEmpire</h1>
                <p className="text-sm text-gray-500">Select your workspace</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Workspace
          </h2>
          <p className="text-gray-600">
            Select an organization to continue, or create a new one
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Organizations Grid */}
        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelectOrganization(org)}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all duration-200 p-6 text-left group"
              >
                {/* Organization Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>

                {/* Organization Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {org.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {org.slug}.neurallempire.com
                </p>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(org.planType)}`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {org.planType}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(org.role)}`}>
                    {org.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No organizations found</p>
            <p className="text-sm text-gray-500">Create your first organization to get started</p>
          </div>
        )}

        {/* Create New Organization */}
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all duration-200 p-8 text-center">
          <button
            onClick={handleCreateOrganization}
            className="inline-flex items-center justify-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Organization</span>
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Set up a new workspace for your team
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSelector;
