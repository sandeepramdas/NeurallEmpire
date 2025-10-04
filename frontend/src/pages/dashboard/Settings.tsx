import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  Building2,
  Users,
  CreditCard,
  Key,
  Shield,
  Palette,
  BarChart3,
  Globe,
  ChevronRight,
  Clock,
  TrendingUp
} from 'lucide-react';

interface SettingCategory {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  color: string;
}

interface RecentSetting {
  title: string;
  category: string;
  time: string;
}

const Settings: React.FC = () => {
  const { organization } = useAuthStore();

  // Settings categories
  const settingsCategories: SettingCategory[] = [
    {
      icon: Building2,
      title: 'Organization',
      description: 'Manage organization profile and basic info',
      link: '/dashboard/settings/organization',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Users,
      title: 'Team Members',
      description: 'Invite and manage team members',
      link: '/dashboard/settings/team',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: CreditCard,
      title: 'Billing & Subscription',
      description: 'Manage your plan and billing',
      link: '/dashboard/settings/billing',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Key,
      title: 'API Keys',
      description: 'Create and manage API keys',
      link: '/dashboard/settings/api-keys',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: Shield,
      title: 'Security & Compliance',
      description: 'Configure security settings',
      link: '/dashboard/settings/security',
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: Palette,
      title: 'Branding & Theme',
      description: 'Customize your branding',
      link: '/dashboard/settings/branding',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      icon: BarChart3,
      title: 'Usage & Analytics',
      description: 'View usage metrics',
      link: '/dashboard/settings/analytics',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      icon: Globe,
      title: 'Domain Settings',
      description: 'Manage custom domains',
      link: '/dashboard/settings/domains',
      color: 'bg-teal-100 text-teal-600'
    }
  ];

  // Recent settings visited
  const recentSettings: RecentSetting[] = [
    { title: 'API Keys', category: 'Developer', time: '2 hours ago' },
    { title: 'Team Members', category: 'Organization', time: '1 day ago' },
    { title: 'Billing & Subscription', category: 'Account', time: '3 days ago' }
  ];

  // Popular settings
  const popularSettings: RecentSetting[] = [
    { title: 'API Keys', category: 'Developer', time: 'Most accessed' },
    { title: 'Team Members', category: 'Organization', time: 'Frequently used' },
    { title: 'Branding & Theme', category: 'Customization', time: 'Trending' }
  ];

  return (
    <div>
      {/* Header with Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
          <Link to="/dashboard" className="hover:text-primary-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-neural-900 font-medium">Settings</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-neural-900">
          Settings
        </h1>
        <p className="text-neutral-600 mt-2">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Settings Categories Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-display font-semibold text-neural-900 mb-6">
          All Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {settingsCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                to={category.link}
                className="card hover:shadow-lg hover:border-primary-300 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-base font-semibold text-neural-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {category.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Visited Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-neural-900">
              Recently Visited
            </h2>
          </div>
          {recentSettings.length > 0 ? (
            <div className="space-y-3">
              {recentSettings.map((setting, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group"
                >
                  <div>
                    <h3 className="text-sm font-medium text-neural-900 group-hover:text-primary-600 transition-colors">
                      {setting.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {setting.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">{setting.time}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No recent settings visited</p>
            </div>
          )}
        </div>

        {/* Popular Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-neural-900">
              Popular Settings
            </h2>
          </div>
          <div className="space-y-3">
            {popularSettings.map((setting, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group"
              >
                <div>
                  <h3 className="text-sm font-medium text-neural-900 group-hover:text-primary-600 transition-colors">
                    {setting.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {setting.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{setting.time}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organization Info Card */}
      <div className="mt-6 card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neural-900 mb-1">
              {organization?.name || 'Your Organization'}
            </h3>
            <p className="text-sm text-neutral-600">
              Manage all aspects of your organization from one place
            </p>
          </div>
          <Link
            to="/dashboard/settings/organization"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Organization Settings
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-green-50 border-green-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-green-900 mb-1">
            Need Help?
          </h3>
          <p className="text-xs text-green-700 mb-3">
            Browse our documentation for guides and tutorials
          </p>
          <button className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
            View Docs
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="card bg-blue-50 border-blue-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Contact Support
          </h3>
          <p className="text-xs text-blue-700 mb-3">
            Our team is here to help you 24/7
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Get Support
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="card bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-purple-900 mb-1">
            API Reference
          </h3>
          <p className="text-xs text-purple-700 mb-3">
            Integrate with our powerful API
          </p>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
            View API Docs
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
