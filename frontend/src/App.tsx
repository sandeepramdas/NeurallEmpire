import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getOrganizationFromUrl } from '@/utils/routing';

// Import pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import Agents from '@/pages/dashboard/Agents';
import Campaigns from '@/pages/dashboard/Campaigns';
import Analytics from '@/pages/dashboard/Analytics';
import Settings from '@/pages/dashboard/Settings';
import NotFound from '@/pages/NotFound';
import OrganizationRouter from '@/components/OrganizationRouter';

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, organization } = useAuthStore();

  if (isAuthenticated && organization) {
    return <Navigate to={`/dashboard/${organization.slug}`} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { token, refreshProfile, isAuthenticated, organization } = useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken && token) {
        try {
          await refreshProfile();
        } catch (error) {
          console.error('Failed to refresh profile on app init:', error);
          // Clear invalid token and continue with app load
          localStorage.removeItem('authToken');
          // Don't throw error - allow app to continue loading
        }
      }
    };

    // Only run auth refresh if we're not on the landing page
    if (window.location.pathname !== '/') {
      initAuth();
    }
  }, [token, refreshProfile]);

  // Handle subdomain routing
  useEffect(() => {
    const orgFromUrl = getOrganizationFromUrl();

    if (orgFromUrl && isAuthenticated && organization) {
      // If user is on a subdomain and authenticated, ensure they're viewing the correct organization
      if (orgFromUrl !== organization.slug) {
        // User is on wrong subdomain, redirect to main domain to switch organizations
        window.location.href = `https://www.neurallempire.com/dashboard/${organization.slug}`;
      }
    }
  }, [isAuthenticated, organization]);

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
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

        {/* Protected Dashboard Routes with Organization Slug */}
        <Route
          path="/dashboard/:orgSlug"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Redirect /dashboard to user's organization */}
        <Route
          path="/dashboard"
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