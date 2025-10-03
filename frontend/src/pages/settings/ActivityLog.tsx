import React, { useState } from 'react';
import { Activity, Clock, User, MapPin, Download, Search, Filter, ChevronDown, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type ActivityType = 'login' | 'change' | 'api' | 'security' | 'team' | 'settings';

interface ActivityItem {
  id: string;
  type: ActivityType;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
  location: string;
  device: string;
  userAvatar?: string;
  userName: string;
}

const ActivityLog: React.FC = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const [dateRange, setDateRange] = useState('7');

  // Mock activity data
  const [activities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'login',
      action: 'Successful login',
      description: 'Logged in from Chrome on MacOS',
      timestamp: '2024-03-15T10:30:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '2',
      type: 'change',
      action: 'Profile updated',
      description: 'Updated profile information including email and phone number',
      timestamp: '2024-03-15T09:15:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '3',
      type: 'security',
      action: 'Password changed',
      description: 'Successfully changed account password',
      timestamp: '2024-03-14T16:45:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '4',
      type: 'api',
      action: 'API key created',
      description: 'Created new API key for production environment',
      timestamp: '2024-03-14T14:20:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '5',
      type: 'team',
      action: 'Team member added',
      description: 'Added Sarah Johnson to the organization',
      timestamp: '2024-03-14T12:00:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '6',
      type: 'login',
      action: 'Failed login attempt',
      description: 'Failed login attempt with incorrect password',
      timestamp: '2024-03-13T20:30:00Z',
      ipAddress: '203.0.113.45',
      location: 'San Francisco, CA, USA',
      device: 'Safari on iOS',
      userName: 'Unknown',
    },
    {
      id: '7',
      type: 'settings',
      action: 'Notification settings updated',
      description: 'Changed email notification preferences',
      timestamp: '2024-03-13T11:15:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '8',
      type: 'api',
      action: 'API key revoked',
      description: 'Revoked API key "Development Key"',
      timestamp: '2024-03-12T15:45:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '9',
      type: 'security',
      action: 'Two-factor authentication enabled',
      description: 'Enabled 2FA for enhanced account security',
      timestamp: '2024-03-12T10:20:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '10',
      type: 'team',
      action: 'Team member removed',
      description: 'Removed Mike Chen from the organization',
      timestamp: '2024-03-11T14:00:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '11',
      type: 'login',
      action: 'Successful login',
      description: 'Logged in from Firefox on Windows',
      timestamp: '2024-03-11T09:30:00Z',
      ipAddress: '192.168.1.105',
      location: 'New York, NY, USA',
      device: 'Firefox on Windows',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
    {
      id: '12',
      type: 'change',
      action: 'Organization settings updated',
      description: 'Updated organization name and billing information',
      timestamp: '2024-03-10T16:15:00Z',
      ipAddress: '192.168.1.100',
      location: 'New York, NY, USA',
      device: 'Chrome on MacOS',
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'John Doe',
      userAvatar: user?.avatar,
    },
  ]);

  const getFilteredActivities = () => {
    let filtered = activities;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((a) => new Date(a.timestamp) >= startDate);

    return filtered;
  };

  const filteredActivities = getFilteredActivities();

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Description', 'IP Address', 'Location', 'Device'].join(','),
      ...filteredActivities.map((a) =>
        [
          new Date(a.timestamp).toISOString(),
          a.action,
          a.description,
          a.ipAddress,
          a.location,
          a.device,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-600';
      case 'change':
        return 'bg-purple-100 text-purple-600';
      case 'api':
        return 'bg-green-100 text-green-600';
      case 'security':
        return 'bg-red-100 text-red-600';
      case 'team':
        return 'bg-yellow-100 text-yellow-600';
      case 'settings':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="mt-1 text-sm text-gray-600">
            View your account activity and security events
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export Log
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ActivityType | 'all')}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="login">Login</option>
              <option value="change">Changes</option>
              <option value="api">API</option>
              <option value="security">Security</option>
              <option value="team">Team</option>
              <option value="settings">Settings</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span>Showing {filteredActivities.length} activities</span>
          {(selectedType !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedType('all');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No activity found</p>
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredActivities.map((activity) => {
              const colorClass = getActivityColor(activity.type);

              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {activity.userAvatar ? (
                        <img
                          src={activity.userAvatar}
                          alt={activity.userName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {activity.action}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                              {activity.type}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {activity.description}
                          </p>

                          {/* Metadata */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{getTimeAgo(activity.timestamp)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{activity.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              <span>{activity.userName}</span>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span>IP: {activity.ipAddress}</span>
                            <span>Device: {activity.device}</span>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex-shrink-0 text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>About Activity Logs:</strong> We keep a detailed record of all account activity for security and auditing purposes. Activity logs are retained for 90 days.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              If you notice any suspicious activity, please contact our security team immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
