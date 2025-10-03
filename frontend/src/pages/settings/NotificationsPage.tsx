import React, { useState } from 'react';
import { Bell, Check, Trash2, Info, AlertCircle, CheckCircle, XCircle, User, Settings, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationFilter = 'all' | 'unread' | 'mentions' | 'updates';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'system' | 'security' | 'update' | 'mention' | 'activity';
  actionUrl?: string;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'New feature available',
      message: 'Check out our new analytics dashboard with advanced reporting capabilities.',
      timestamp: '2024-03-15T10:30:00Z',
      read: false,
      category: 'update',
      actionUrl: '/analytics',
    },
    {
      id: '2',
      type: 'success',
      title: 'Profile updated successfully',
      message: 'Your profile information has been updated and saved.',
      timestamp: '2024-03-15T09:15:00Z',
      read: true,
      category: 'activity',
    },
    {
      id: '3',
      type: 'warning',
      title: 'Password expiring soon',
      message: 'Your password will expire in 7 days. Please update it to maintain account security.',
      timestamp: '2024-03-14T16:45:00Z',
      read: false,
      category: 'security',
      actionUrl: '/settings/security',
    },
    {
      id: '4',
      type: 'info',
      title: 'Sarah Johnson mentioned you',
      message: 'Sarah mentioned you in a comment: "Hey @' + (user?.firstName || 'User') + ', can you review this?"',
      timestamp: '2024-03-14T14:20:00Z',
      read: false,
      category: 'mention',
    },
    {
      id: '5',
      type: 'error',
      title: 'Failed to sync data',
      message: 'We encountered an error while syncing your data. Please try again later.',
      timestamp: '2024-03-14T12:00:00Z',
      read: true,
      category: 'system',
    },
    {
      id: '6',
      type: 'success',
      title: 'Team member added',
      message: 'John Smith has been added to your organization.',
      timestamp: '2024-03-13T11:30:00Z',
      read: true,
      category: 'activity',
    },
    {
      id: '7',
      type: 'info',
      title: 'Scheduled maintenance',
      message: 'System maintenance is scheduled for March 20th from 2:00 AM to 4:00 AM EST.',
      timestamp: '2024-03-13T09:00:00Z',
      read: false,
      category: 'system',
    },
    {
      id: '8',
      type: 'warning',
      title: 'Unusual login activity detected',
      message: 'We detected a login from a new device in San Francisco, CA. If this wasn\'t you, please secure your account.',
      timestamp: '2024-03-12T20:15:00Z',
      read: true,
      category: 'security',
      actionUrl: '/settings/security',
    },
    {
      id: '9',
      type: 'success',
      title: 'API key created',
      message: 'A new API key has been created for production environment.',
      timestamp: '2024-03-12T15:45:00Z',
      read: true,
      category: 'activity',
    },
    {
      id: '10',
      type: 'info',
      title: 'Mike Chen mentioned you',
      message: 'Mike mentioned you in "Q1 Planning": "@' + (user?.firstName || 'User') + ', what are your thoughts on this?"',
      timestamp: '2024-03-11T13:20:00Z',
      read: false,
      category: 'mention',
    },
  ]);

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'mentions':
        return notifications.filter((n) => n.category === 'mention');
      case 'updates':
        return notifications.filter((n) => n.category === 'update');
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      setNotifications([]);
    }
  };

  const getNotificationIcon = (type: NotificationType, category: string) => {
    if (category === 'security') return Shield;
    if (category === 'mention') return User;
    if (category === 'update') return Zap;
    if (category === 'activity') return Settings;

    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return XCircle;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">
            Stay updated with your latest activity
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Check className="w-4 h-4 inline mr-2" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFilter === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {notifications.length}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFilter === 'unread'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('mentions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFilter === 'mentions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mentions
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {notifications.filter((n) => n.category === 'mention').length}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('updates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFilter === 'updates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Updates
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {notifications.filter((n) => n.category === 'update').length}
              </span>
            </button>
          </nav>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No notifications</p>
              <p className="text-gray-400 text-xs mt-1">
                {activeFilter === 'all'
                  ? "You're all caught up!"
                  : `No ${activeFilter} notifications`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type, notification.category);
              const colorClass = getNotificationColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {getTimeAgo(notification.timestamp)}
                            </span>
                            {notification.actionUrl && (
                              <a
                                href={notification.actionUrl}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View details
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notification Settings Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              Want to customize which notifications you receive?
            </p>
            <a
              href="/settings/profile"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block"
            >
              Manage notification preferences
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
