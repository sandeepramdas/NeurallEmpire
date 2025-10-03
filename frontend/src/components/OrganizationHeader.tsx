import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Bell,
  Search,
  Settings,
  Users,
  CreditCard,
  Building2,
  ChevronDown,
  Globe,
  Sun,
  Palette,
  Database,
  Key,
  Shield,
  BarChart3,
  FileText,
  Mail,
  Zap,
  HelpCircle,
  User,
  LogOut,
  Command,
  Activity,
  Crown,
  Keyboard,
  Clock,
  ArrowUpCircle,
} from 'lucide-react';

interface OrganizationHeaderProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({ onThemeChange }) => {
  const { user, organization, logout } = useAuthStore();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount] = useState(3); // Remove setUnreadCount if not used

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

  const orgMenuItems = [
    { icon: Building2, label: 'Organization Profile', href: '/dashboard/settings/organization' },
    { icon: Users, label: 'Team Members', href: '/dashboard/settings/team' },
    { icon: CreditCard, label: 'Billing & Subscription', href: '/dashboard/settings/billing' },
    { icon: Database, label: 'Data Management', href: '/dashboard/settings/data' },
    { icon: Key, label: 'API Keys', href: '/dashboard/settings/api-keys' },
    { icon: Shield, label: 'Security & Compliance', href: '/dashboard/settings/security' },
    { icon: Palette, label: 'Branding & Theme', href: '/dashboard/settings/branding' },
    { icon: BarChart3, label: 'Usage & Analytics', href: '/dashboard/settings/analytics' },
    { icon: Globe, label: 'Domain Settings', href: '/dashboard/settings/domains' },
    { icon: Mail, label: 'Email Templates', href: '/dashboard/settings/emails' },
    { icon: Zap, label: 'Integrations', href: '/dashboard/settings/integrations' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support' },
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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-3">
        {/* Top Row - Organization Info & Actions */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: Organization Info */}
          <div className="flex items-center space-x-4">
            {/* Organization Logo/Avatar */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">
                  {organization?.name?.charAt(0) || 'N'}
                </span>
              </div>
              {organization?.planType === 'OVERLORD' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white" title="Overlord Plan">
                  <svg className="w-full h-full text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Organization Details */}
            <div className="flex items-center space-x-2">
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {organization?.name || 'Organization'}
                </h1>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    {organization?.slug || 'org'}.neurallempire.com
                  </span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    organization?.planType === 'OVERLORD' ? 'bg-yellow-100 text-yellow-800' :
                    organization?.planType === 'EMPEROR' ? 'bg-blue-100 text-blue-800' :
                    organization?.planType === 'CONQUEROR' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {organization?.planType || 'FREE'}
                  </span>
                </div>
              </div>

              {/* Organization Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowOrgMenu(!showOrgMenu)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Organization Settings"
                >
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showOrgMenu ? 'rotate-180' : ''}`} />
                </button>

                {showOrgMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowOrgMenu(false)}
                    />
                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Organization Settings</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {orgMenuItems.map((item, index) => (
                          <a
                            key={index}
                            href={item.href}
                            className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            onClick={() => setShowOrgMenu(false)}
                          >
                            <item.icon className="w-4 h-4 mr-3 text-gray-500" />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

            {/* Command Palette */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:flex items-center space-x-1"
              title="Command Palette (⌘K)"
            >
              <Command className="w-5 h-5 text-gray-600" />
              <span className="text-xs text-gray-500">⌘K</span>
            </button>

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

            {/* Keyboard Shortcuts */}
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
              title="Keyboard Shortcuts (⌘/)"
            >
              <Keyboard className="w-5 h-5 text-gray-600" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => onThemeChange?.('dark')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle Theme"
            >
              <Sun className="w-5 h-5 text-gray-600" />
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
            <div className="w-px h-6 bg-gray-300"></div>

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

        {/* Bottom Row - Stats & Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            {/* Active Users */}
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{organization?.maxUsers || 0}</span> max users
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
                <span className="text-gray-600 capitalize">
                  {organization.status.toLowerCase()}
                </span>
              </div>
            )}

            {/* Storage Used */}
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">0 MB</span> / 10 GB used
              </span>
            </div>

            {/* API Calls */}
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">0</span> / 10,000 API calls
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Upgrade CTA for Free/Basic plans */}
            {(organization?.planType === 'FREE' || !organization?.planType) && (
              <a
                href="/dashboard/settings/billing"
                className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                <Crown className="w-4 h-4" />
                <span className="text-xs font-medium">Upgrade to Pro</span>
                <ArrowUpCircle className="w-3 h-3" />
              </a>
            )}

            <span className="text-gray-500">Last login: {new Date().toLocaleString()}</span>
          </div>
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
