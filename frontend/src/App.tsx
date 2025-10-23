import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeInit } from '@/hooks/useThemeInit';
import {
  getOrganizationFromUrl,
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
import BillingSubscription from '@/pages/settings/Billing';
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

// Import V2 feature pages
import EntityDefinitions from '@/pages/dashboard/EntityDefinitions';
import OrganizationHierarchy from '@/pages/dashboard/OrganizationHierarchy';
import CodeArtifacts from '@/pages/dashboard/CodeArtifacts';

// Import Sales pages
import SalesOrder from '@/pages/dashboard/SalesOrder';
import SalesInvoice from '@/pages/dashboard/SalesInvoice';

// Import Healthcare pages
import PatientDietPlan from '@/pages/dashboard/PatientDietPlan';

// Import Settings pages
import AIModelsSettings from '@/pages/settings/AIModelsSettings';
import ProvidersSettings from '@/pages/settings/ProvidersSettings';

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

  // User authenticated but accessing wrong organization - redirect to correct path-based route
  if (orgFromUrl && organization && orgFromUrl !== organization.slug) {
    // Redirect to correct organization path
    return <Navigate to={`/org/${organization.slug}/dashboard`} replace />;
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

  // Authenticated user on public pages - redirect to dashboard
  if (isAuthenticated && organization) {
    const publicPaths = ['/', '/login', '/register'];
    if (publicPaths.includes(window.location.pathname)) {
      // Redirect to path-based organization dashboard
      return <Navigate to={`/org/${organization.slug}/dashboard`} replace />;
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

  // Redirect to path-based organization dashboard
  return <Navigate to={`/org/${organization.slug}/dashboard`} replace />;
};

/**
 * Dashboard Redirect - Handles /dashboard route
 */
const DashboardRedirect: React.FC = () => {
  const { organization } = useAuthStore();

  if (!organization) {
    return <Navigate to="/select-organization" replace />;
  }

  return <Navigate to={`/org/${organization.slug}/dashboard`} replace />;
};

const App: React.FC = () => {
  const { refreshProfile } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage
  useThemeInit();

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

  // DISABLED: Subdomain routing - using path-based routing instead
  // This prevents redirect loops on www.neurallempire.com
  useEffect(() => {
    // Path-based routing is now used instead of subdomain routing
    // to avoid redirect loops and compatibility issues on www.neurallempire.com
  }, []);

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

        {/* Protected Dashboard Routes - redirect to path-based org routing */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

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
          {/* Sales Routes */}
          <Route path="sales-order" element={<SalesOrder />} />
          <Route path="sales-invoice" element={<SalesInvoice />} />
          {/* Healthcare Routes */}
          <Route path="patient-diet-plan" element={<PatientDietPlan />} />
          {/* V2 Feature Routes */}
          <Route path="entities" element={<EntityDefinitions />} />
          <Route path="hierarchy" element={<OrganizationHierarchy />} />
          <Route path="code-artifacts" element={<CodeArtifacts />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/organization" element={<OrganizationProfile />} />
          <Route path="settings/team" element={<TeamMembers />} />
          <Route path="settings/billing" element={<BillingSubscription />} />
          <Route path="settings/api-keys" element={<APIKeys />} />
          <Route path="settings/security" element={<SecurityCompliance />} />
          <Route path="settings/branding" element={<BrandingTheme />} />
          <Route path="settings/analytics" element={<UsageAnalytics />} />
          <Route path="settings/domains" element={<DomainSettings />} />
          <Route path="settings/ai-models" element={<AIModelsSettings />} />
          <Route path="settings/providers" element={<ProvidersSettings />} />
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