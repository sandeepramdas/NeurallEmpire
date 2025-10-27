import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();

  // Generate breadcrumb items from pathname
  const pathnames = location.pathname.split('/').filter(x => x);

  // Extract org slug if path starts with /org/
  let orgSlug = '';
  let startIndex = 0;
  if (pathnames[0] === 'org' && pathnames[1]) {
    orgSlug = pathnames[1];
    startIndex = 2; // Skip 'org' and slug in breadcrumbs
  }

  // Don't show breadcrumbs on dashboard home
  if (pathnames.length <= startIndex + 1) {
    return null;
  }

  // Map of paths to readable names
  const pathNameMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'agents': 'AI Agents',
    'campaigns': 'Campaigns',
    'workflows': 'Workflows',
    'analytics': 'Analytics',
    'reports': 'Reports',
    'integrations': 'Integrations',
    'templates': 'Templates',
    'messages': 'Messages',
    'webhooks': 'Webhooks',
    'docs': 'Knowledge Base',
    'api-playground': 'API Playground',
    'settings': 'Settings',
    'organization': 'Organization Profile',
    'team': 'Team Members',
    'billing': 'Billing & Subscription',
    'api-keys': 'API Keys',
    'security': 'Security & Compliance',
    'branding': 'Branding & Theme',
    'domains': 'Domain Settings',
    'data': 'Data Management',
    'emails': 'Email Settings',
    'profile': 'User Profile',
    'notifications': 'Notifications',
    'activity': 'Activity Log',
  };

  const breadcrumbs = pathnames.slice(startIndex).map((value, index) => {
    const actualIndex = index + startIndex;
    const to = `/${pathnames.slice(0, actualIndex + 1).join('/')}`;
    const label = pathNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1);
    const isLast = actualIndex === pathnames.length - 1;

    return {
      to,
      label,
      isLast,
    };
  });

  // Dashboard home link with org slug
  const dashboardLink = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
      <Link
        to={dashboardLink}
        className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb) => (
        <React.Fragment key={crumb.to}>
          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-900 dark:text-gray-100">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.to}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
