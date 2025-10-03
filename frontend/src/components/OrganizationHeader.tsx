import React, { useState } from 'react';
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
} from 'lucide-react';

interface OrganizationHeaderProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({ onThemeChange }) => {
  const { organization } = useAuthStore();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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

          <div className="text-gray-500">
            Last login: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default OrganizationHeader;
