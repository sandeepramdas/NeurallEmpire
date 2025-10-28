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
      link: `/org/${organization?.slug}/settings/organization`,
      color: 'bg-primary-100 dark:bg-primary-900/30 icon-active'
    },
    {
      icon: Users,
      title: 'Team Members',
      description: 'Invite and manage team members',
      link: `/org/${organization?.slug}/settings/team`,
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: CreditCard,
      title: 'Billing & Subscription',
      description: 'Manage your plan and billing',
      link: `/org/${organization?.slug}/settings/billing`,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Key,
      title: 'API Keys',
      description: 'Create and manage API keys',
      link: `/org/${organization?.slug}/settings/api-keys`,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: Shield,
      title: 'Security & Compliance',
      description: 'Configure security settings',
      link: `/org/${organization?.slug}/settings/security`,
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: Palette,
      title: 'Branding & Theme',
      description: 'Customize your branding',
      link: `/org/${organization?.slug}/settings/branding`,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      icon: BarChart3,
      title: 'Usage & Analytics',
      description: 'View usage metrics',
      link: `/org/${organization?.slug}/settings/analytics`,
      color: 'bg-primary-100 dark:bg-primary-900/30 icon-active'
    },
    {
      icon: Globe,
      title: 'Domain Settings',
      description: 'Manage custom domains',
      link: `/org/${organization?.slug}/settings/domains`,
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
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <Link to={`/org/${organization?.slug}/dashboard`} className="link-hover transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-gray-100 font-medium">Settings</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Settings Categories Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-gray-100 mb-6">
          All Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {settingsCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                to={category.link}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 hover:shadow-lg transition-all group cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  '--hover-border': 'var(--color-primary)'
                } as any}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 icon-active group-hover:translate-x-1 transition-all" style={{ '--icon-hover-color': 'var(--color-primary)' } as any} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 link-hover transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Clock className="w-5 h-5 icon-active" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recently Visited
            </h2>
          </div>
          {recentSettings.length > 0 ? (
            <div className="space-y-3">
              {recentSettings.map((setting, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 link-hover transition-colors">
                      {setting.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {setting.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{setting.time}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 link-hover group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent settings visited</p>
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
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 link-hover transition-colors">
                    {setting.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {setting.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{setting.time}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 link-hover group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organization Info Card */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 5%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 5%, transparent) 100%)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {organization?.name || 'Your Organization'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage all aspects of your organization from one place
            </p>
          </div>
          <Link
            to="/dashboard/settings/organization"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
          >
            Organization Settings
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
            Need Help?
          </h3>
          <p className="text-xs text-green-700 dark:text-green-300 mb-3">
            Browse our documentation for guides and tutorials
          </p>
          <button className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center gap-1">
            View Docs
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Contact Support
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            Our team is here to help you 24/7
          </p>
          <button className="text-sm icon-active hover:opacity-80 dark:hover:text-blue-300 font-medium flex items-center gap-1">
            Get Support
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
            API Reference
          </h3>
          <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
            Integrate with our powerful API
          </p>
          <button className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1">
            View API Docs
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
