import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import {
  getOrganizationFromUrl,
  getSubdomainInfo,
  isOnSubdomain,
  isOnMainDomain,
  redirectToOrganization,
  redirectToMainSite
} from '@/utils/routing';

// Import pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import OrganizationSelector from '@/pages/auth/OrganizationSelector';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import Agents from '@/pages/dashboard/Agents';
import Campaigns from '@/pages/dashboard/Campaigns';
import Analytics from '@/pages/dashboard/Analytics';
import Settings from '@/pages/dashboard/Settings';
import NotFound from '@/pages/NotFound';
import OAuthCallback from '@/pages/auth/OAuthCallback';

// Import settings pages
import OrganizationProfile from '@/pages/settings/OrganizationProfile';
import TeamMembers from '@/pages/settings/TeamMembers';
import BillingSubscription from '@/pages/dashboard/settings/Billing';
import APIKeys from '@/pages/settings/APIKeys';
import SecurityCompliance from '@/pages/settings/SecurityCompliance';
import BrandingTheme from '@/pages/settings/BrandingTheme';
import UsageAnalytics from '@/pages/settings/UsageAnalytics';
import DomainSettings from '@/pages/settings/DomainSettings';
import UserProfile from '@/pages/settings/UserProfile';
import NotificationsPage from '@/pages/settings/NotificationsPage';
import ActivityLog from '@/pages/settings/ActivityLog';

// Import new dashboard pages
import Workflows from '@/pages/dashboard/Workflows';
import Integrations from '@/pages/dashboard/Integrations';
import Templates from '@/pages/dashboard/Templates';
import KnowledgeBase from '@/pages/dashboard/KnowledgeBase';
import APIPlayground from '@/pages/dashboard/APIPlayground';
import Reports from '@/pages/dashboard/Reports';
import Messages from '@/pages/dashboard/Messages';
import Webhooks from '@/pages/dashboard/Webhooks';

// OAuth buttons component available for login page

// Subdomain-aware components
interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Protected Route - Requires authentication and organization context
 */
const ProtectedRoute: React.FC<RouteGuardProps> = ({ children }) => {
  const { isAuthenticated, user, organization } = useAuthStore();
  const orgFromUrl = getOrganizationFromUrl();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    const loginPath = orgFromUrl ? `/login?org=${orgFromUrl}` : '/login';
    return <Navigate to={loginPath} replace />;
  }

  // Authenticated but no user data - still loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // User authenticated but accessing wrong organization subdomain
  if (orgFromUrl && organization && orgFromUrl !== organization.slug) {
    // Redirect to correct organization subdomain
    redirectToOrganization(organization.slug);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to your organization...</p>
        </div>
      </div>
    );
  }

  // On subdomain but no organization context - invalid subdomain
  if (orgFromUrl && !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Organization Not Found</h1>
          <p className="text-gray-600 mb-6">
            The organization "{orgFromUrl}" could not be found or you don't have access to it.
          </p>
          <button
            onClick={() => redirectToMainSite('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Your Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Public Route - Accessible without authentication
 * Redirects authenticated users to their dashboard
 */
const PublicRoute: React.FC<RouteGuardProps> = ({ children }) => {
  const { isAuthenticated, organization } = useAuthStore();
  const orgFromUrl = getOrganizationFromUrl();
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Authenticated user - redirect to dashboard
  if (isAuthenticated && organization) {
    // In development, just redirect to /dashboard with org query param
    if (isDev) {
      return <Navigate to={`/dashboard?org=${organization.slug}`} replace />;
    }

    // If on organization subdomain, go to that org's dashboard
    if (orgFromUrl && orgFromUrl === organization.slug) {
      return <Navigate to="/dashboard" replace />;
    }

    // Otherwise, redirect to user's organization subdomain (only once)
    if (!window.location.href.includes('redirecting')) {
      const targetUrl = `${window.location.protocol}//${organization.slug}.neurallempire.com/dashboard?redirecting=1`;
      window.location.href = targetUrl;
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      );
    }
  }

  return <>{children}</>;
};

/**
 * Organization Router - Handles dashboard access without explicit org in URL
 */
const OrganizationRouter: React.FC = () => {
  const { organization } = useAuthStore();

  if (!organization) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to organization's subdomain
  redirectToOrganization(organization.slug);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to {organization.name}...</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { refreshProfile, isAuthenticated, organization } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have a stored token
        const storedToken = localStorage.getItem('authToken');

        if (storedToken) {
          // Try to refresh profile to validate token
          await refreshProfile();
        }
      } catch (error) {
        console.error('Failed to refresh profile on app init:', error);
        // Clear invalid token
        localStorage.removeItem('authToken');
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle subdomain routing and organization validation
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const orgFromUrl = getOrganizationFromUrl();
    const subdomainInfo = getSubdomainInfo();
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Skip redirects in development
    if (isDev) return;

    // User is authenticated and we have organization context
    if (organization) {
      // If on main domain, redirect to organization subdomain
      if (isOnMainDomain() && window.location.pathname.startsWith('/dashboard')) {
        redirectToOrganization(organization.slug);
        return;
      }

      // If on wrong organization subdomain, redirect to correct one
      if (orgFromUrl && orgFromUrl !== organization.slug) {
        toast.error(`Redirecting to ${organization.name}`, {
          duration: 2000,
        });
        setTimeout(() => {
          redirectToOrganization(organization.slug);
        }, 1000);
        return;
      }

      // If on reserved subdomain, redirect to main site
      if (subdomainInfo.isReserved) {
        redirectToMainSite();
        return;
      }
    }
  }, [isInitialized, isAuthenticated, organization]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading NeurallEmpire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes - Available on main domain */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Organization Selector - shown after login */}
        <Route
          path="/select-organization"
          element={
            <ProtectedRoute>
              <OrganizationSelector />
            </ProtectedRoute>
          }
        />

        {/* OAuth Callback Routes */}
        <Route path="/auth/:provider/callback" element={<OAuthCallback />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {isOnSubdomain() ? (
                <DashboardLayout />
              ) : (
                <OrganizationRouter />
              )}
            </ProtectedRoute>
          }
        >
          {/* Nested dashboard routes - only available on subdomains */}
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="templates" element={<Templates />} />
          <Route path="messages" element={<Messages />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="docs" element={<KnowledgeBase />} />
          <Route path="api-playground" element={<APIPlayground />} />
          <Route path="settings" element={<Settings />} />

          {/* Settings routes */}
          <Route path="settings/organization" element={<OrganizationProfile />} />
          <Route path="settings/team" element={<TeamMembers />} />
          <Route path="settings/billing" element={<BillingSubscription />} />
          <Route path="settings/api-keys" element={<APIKeys />} />
          <Route path="settings/security" element={<SecurityCompliance />} />
          <Route path="settings/branding" element={<BrandingTheme />} />
          <Route path="settings/analytics" element={<UsageAnalytics />} />
          <Route path="settings/domains" element={<DomainSettings />} />
          <Route path="settings/data" element={<Settings />} />
          <Route path="settings/emails" element={<Settings />} />

          {/* User-specific routes */}
          <Route path="profile" element={<UserProfile />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>

        {/* Path-based organization routes (Hybrid approach) */}
        <Route
          path="/org/:orgSlug"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Same nested routes as subdomain */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="templates" element={<Templates />} />
          <Route path="messages" element={<Messages />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="docs" element={<KnowledgeBase />} />
          <Route path="api-playground" element={<APIPlayground />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/organization" element={<OrganizationProfile />} />
          <Route path="settings/team" element={<TeamMembers />} />
          <Route path="settings/billing" element={<BillingSubscription />} />
          <Route path="settings/api-keys" element={<APIKeys />} />
          <Route path="settings/security" element={<SecurityCompliance />} />
          <Route path="settings/branding" element={<BrandingTheme />} />
          <Route path="settings/analytics" element={<UsageAnalytics />} />
          <Route path="settings/domains" element={<DomainSettings />} />
          <Route path="settings/data" element={<Settings />} />
          <Route path="settings/emails" element={<Settings />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>

        {/* Legacy path-based routes for backwards compatibility */}
        <Route
          path="/dashboard/:orgSlug/*"
          element={
            <ProtectedRoute>
              <OrganizationRouter />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;