import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Bell,
  Search,
  Settings,
  Users,
  CreditCard,
  ChevronDown,
  Sun,
  Moon,
  FileText,
  HelpCircle,
  User,
  LogOut,
  Command,
  Activity,
  Crown,
  Keyboard,
  Clock,
  ArrowUpCircle,
  BookOpen,
  Code,
  MessageCircle,
  LifeBuoy,
  ExternalLink,
  CheckCircle,
  FileCode,
  GitBranch,
  Mail,
  Zap,
  Building2,
  Database,
} from 'lucide-react';

interface OrganizationHeaderProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({ onThemeChange }) => {
  const { user, organization, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount] = useState(3);

  // Mock data - replace with real data from your store/API
  const notifications = [
    { id: 1, type: 'info', message: 'New user joined your organization', time: '5 min ago' },
    { id: 2, type: 'success', message: 'Monthly report is ready', time: '1 hour ago' },
    { id: 3, type: 'warning', message: 'Subscription renewal in 7 days', time: '2 hours ago' },
  ];

  const quickActions = [
    { icon: Users, label: 'Invite Users', action: () => console.log('Invite users') },
    { icon: CreditCard, label: 'Billing', action: () => console.log('Billing') },
    { icon: FileText, label: 'Reports', action: () => console.log('Reports') },
    { icon: Settings, label: 'Settings', action: () => console.log('Settings') },
  ];

  // Additional mock data
  const recentActivities = [
    { id: 1, user: 'John Doe', action: 'created a new agent', time: '2 min ago' },
    { id: 2, user: 'Jane Smith', action: 'updated company settings', time: '15 min ago' },
    { id: 3, user: 'You', action: 'logged in from new device', time: '1 hour ago' },
  ];

  const userOrganizations = [
    { id: '1', name: organization?.name || 'Current Org', slug: organization?.slug || 'current', planType: organization?.planType || 'FREE', current: true },
    { id: '2', name: 'Demo Organization', slug: 'demo', planType: 'EMPEROR', current: false },
    { id: '3', name: 'Test Workspace', slug: 'test', planType: 'CONQUEROR', current: false },
  ];

  const keyboardShortcuts = [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['⌘', 'N'], description: 'Create new item' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['G', 'H'], description: 'Go to home' },
    { keys: ['G', 'S'], description: 'Go to settings' },
  ];

  const resourcesMenuItems = [
    { icon: BookOpen, label: 'Documentation', description: 'API docs and guides', href: '/dashboard/docs' },
    { icon: Code, label: 'API Reference', description: 'Complete API documentation', href: '/dashboard/docs?category=api' },
    { icon: FileCode, label: 'API Playground', description: 'Test API endpoints', href: '/dashboard/api-playground' },
    { icon: GitBranch, label: 'Changelog', description: 'Latest updates and features', href: 'https://changelog.neurallempire.com', external: true },
    { icon: FileText, label: 'Templates', description: 'Agent and workflow templates', href: '/dashboard/templates' },
    { icon: BookOpen, label: 'Blog', description: 'Tips and best practices', href: 'https://blog.neurallempire.com', external: true },
  ];

  const helpMenuItems = [
    { icon: LifeBuoy, label: 'Support Center', description: 'Get help from our team', href: '/dashboard/support' },
    { icon: MessageCircle, label: 'Community', description: 'Join our community forum', href: 'https://community.neurallempire.com', external: true },
    { icon: CheckCircle, label: 'System Status', description: 'Check platform status', href: 'https://status.neurallempire.com', external: true },
    { icon: Mail, label: 'Contact Sales', description: 'Talk to our sales team', href: 'mailto:sales@neurallempire.com', external: true },
    { icon: Keyboard, label: 'Keyboard Shortcuts', description: 'View all shortcuts', action: () => setShowKeyboardShortcuts(true) },
    { icon: HelpCircle, label: 'FAQs', description: 'Frequently asked questions', href: '/dashboard/docs?category=faq' },
  ];

  // Theme toggle handler
  const handleToggleTheme = () => {
    toggleTheme();
    onThemeChange?.(theme === 'light' ? 'dark' : 'light');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Cmd/Ctrl + / for shortcuts guide
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="px-6 py-3">
        {/* Top Row - Actions and User Menu */}
        <div className="flex items-center justify-between mb-3">

          {/* Left: Search and Primary Actions */}
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Quick Actions */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Quick Actions"
              >
                <Zap className="w-5 h-5 text-gray-600" />
              </button>

              {showQuickActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowQuickActions(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Quick Actions</p>
                    </div>
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          action.action();
                          setShowQuickActions(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <action.icon className="w-4 h-4 mr-3 text-gray-500" />
                        <span className="text-sm text-gray-700">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Command Palette */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:flex items-center space-x-1.5"
              title="Command Palette (⌘K)"
            >
              <Command className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-500 font-medium">⌘K</span>
            </button>
          </div>

          {/* Center: Navigation */}
          <div className="flex items-center space-x-1">
            {/* Resources Mega Menu */}
            <div className="relative">
              <button
                onClick={() => setShowResourcesMenu(!showResourcesMenu)}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700 flex items-center"
                title="Resources"
              >
                Resources
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showResourcesMenu ? 'rotate-180' : ''}`} />
              </button>

              {showResourcesMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowResourcesMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Resources</p>
                    </div>
                    <div className="py-2">
                      {resourcesMenuItems.map((item, index) => {
                        const ItemIcon = item.icon;
                        return (
                          <a
                            key={index}
                            href={item.href}
                            target={item.external ? '_blank' : undefined}
                            rel={item.external ? 'noopener noreferrer' : undefined}
                            className="flex items-start px-4 py-3 hover:bg-gray-50 transition-colors group"
                            onClick={() => setShowResourcesMenu(false)}
                          >
                            <ItemIcon className="w-5 h-5 mr-3 text-indigo-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">{item.label}</span>
                                {item.external && <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help Mega Menu */}
            <div className="relative">
              <button
                onClick={() => setShowHelpMenu(!showHelpMenu)}
                className="px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700 flex items-center"
                title="Help"
              >
                Help
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showHelpMenu ? 'rotate-180' : ''}`} />
              </button>

              {showHelpMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowHelpMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Help & Support</p>
                    </div>
                    <div className="py-2">
                      {helpMenuItems.map((item, index) => {
                        const ItemIcon = item.icon;
                        const isAction = 'action' in item;

                        if (isAction) {
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                item.action?.();
                                setShowHelpMenu(false);
                              }}
                              className="w-full flex items-start px-4 py-3 hover:bg-gray-50 transition-colors group text-left"
                            >
                              <ItemIcon className="w-5 h-5 mr-3 text-indigo-600 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 block">{item.label}</span>
                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <a
                            key={index}
                            href={item.href}
                            target={item.external ? '_blank' : undefined}
                            rel={item.external ? 'noopener noreferrer' : undefined}
                            className="flex items-start px-4 py-3 hover:bg-gray-50 transition-colors group"
                            onClick={() => setShowHelpMenu(false)}
                          >
                            <ItemIcon className="w-5 h-5 mr-3 text-indigo-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">{item.label}</span>
                                {item.external && <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Right: Utility Actions & User Menu */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      <span className="text-xs text-gray-500">{notifications.length} new</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                        >
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <a href="/dashboard/notifications" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        View all notifications →
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Activity Feed */}
            <div className="relative">
              <button
                onClick={() => setShowActivityFeed(!showActivityFeed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Recent Activity"
              >
                <Activity className="w-5 h-5 text-gray-600" />
              </button>

              {showActivityFeed && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActivityFeed(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {recentActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm text-gray-800">
                            <span className="font-medium">{activity.user}</span> {activity.action}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {activity.time}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100">
                      <a href="/dashboard/activity" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                        View all activity →
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-yellow-500 transition-colors" />
              )}
            </button>

            {/* Settings */}
            <a
              href="/dashboard/settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </a>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200"></div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="User Menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Role: <span className="font-medium capitalize">{user?.role?.toLowerCase()}</span>
                      </p>
                    </div>

                    {/* User Menu Items */}
                    <a
                      href="/dashboard/profile"
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 mr-3 text-gray-500" />
                      <span className="text-sm text-gray-700">Profile Settings</span>
                    </a>
                    <a
                      href="/dashboard/billing"
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <CreditCard className="w-4 h-4 mr-3 text-gray-500" />
                      <span className="text-sm text-gray-700">Billing</span>
                    </a>
                    <button
                      onClick={() => {
                        setShowOrgSwitcher(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Building2 className="w-4 h-4 mr-3 text-gray-500" />
                      <span className="text-sm text-gray-700">Switch Organization</span>
                    </button>

                    {/* Logout */}
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-red-600"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row - Organization Info & Stats */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          {/* Left: Organization Name & Stats */}
          <div className="flex items-center space-x-6">
            {/* Organization Name */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {organization?.name?.charAt(0) || 'O'}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{organization?.name || 'Organization'}</div>
                <div className="text-xs text-gray-500">{organization?.slug}.neurallempire.com</div>
              </div>
            </div>

            <div className="w-px h-6 bg-gray-200"></div>

            {/* Plan Badge */}
            <div className="flex items-center space-x-2">
              <Crown className={`w-4 h-4 ${
                organization?.planType === 'OVERLORD' ? 'text-yellow-600' :
                organization?.planType === 'EMPEROR' ? 'text-purple-600' :
                organization?.planType === 'CONQUEROR' ? 'text-blue-600' :
                'text-gray-400'
              }`} />
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                organization?.planType === 'OVERLORD' ? 'bg-yellow-100 text-yellow-800' :
                organization?.planType === 'EMPEROR' ? 'bg-purple-100 text-purple-800' :
                organization?.planType === 'CONQUEROR' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {organization?.planType || 'FREE'}
              </span>
            </div>

            {/* Organization Status */}
            {organization?.status && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  organization.status === 'ACTIVE' ? 'bg-green-500' :
                  organization.status === 'TRIAL' ? 'bg-blue-500' :
                  organization.status === 'SUSPENDED' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-600 capitalize">
                  {organization.status.toLowerCase()}
                </span>
              </div>
            )}

            <div className="w-px h-6 bg-gray-200"></div>

            {/* Compact Stats */}
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span><span className="font-semibold text-gray-900">{organization?.maxUsers || 0}</span> users</span>
              </div>
              <div className="flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                <span><span className="font-semibold text-gray-900">0MB</span>/10GB</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-gray-400" />
                <span><span className="font-semibold text-gray-900">0</span>/10k calls</span>
              </div>
            </div>
          </div>

          {/* Right: Upgrade CTA */}
          {(organization?.planType === 'FREE' || !organization?.planType) && (
            <a
              href="/dashboard/settings/billing"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
            >
              <Crown className="w-4 h-4" />
              <span className="text-xs font-semibold">Upgrade Now</span>
              <ArrowUpCircle className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Command className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type a command or search..."
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Escape' && setShowCommandPalette(false)}
                />
                <button
                  onClick={() => setShowCommandPalette(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ESC
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {['Create New Agent', 'View Analytics', 'Invite Team Member', 'Export Data', 'Settings', 'Help & Support'].map((cmd, index) => (
                <button
                  key={index}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg text-left"
                  onClick={() => setShowCommandPalette(false)}
                >
                  <Search className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="text-sm text-gray-700">{cmd}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Organization Switcher Modal */}
      {showOrgSwitcher && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowOrgSwitcher(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl w-full max-w-md z-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Switch Organization</h3>
              <p className="text-sm text-gray-500 mt-1">Select an organization to switch to</p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {userOrganizations.map((org) => (
                <button
                  key={org.id}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-1 ${
                    org.current ? 'bg-indigo-50 border-2 border-indigo-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!org.current) {
                      // Switch organization logic
                      console.log('Switching to:', org.name);
                      setShowOrgSwitcher(false);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">{org.name.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">{org.slug}.neurallempire.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      org.planType === 'OVERLORD' ? 'bg-yellow-100 text-yellow-800' :
                      org.planType === 'EMPEROR' ? 'bg-blue-100 text-blue-800' :
                      org.planType === 'CONQUEROR' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {org.planType}
                    </span>
                    {org.current && (
                      <span className="text-xs text-indigo-600 font-medium">Current</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowOrgSwitcher(false)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create New Organization
              </button>
            </div>
          </div>
        </>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowKeyboardShortcuts(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl w-full max-w-2xl z-50">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <p className="text-sm text-gray-500 mt-1">Navigate faster with these shortcuts</p>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {keyboardShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-500">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default OrganizationHeader;
