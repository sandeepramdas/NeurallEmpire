import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

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
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { token, refreshProfile } = useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken && token) {
        try {
          await refreshProfile();
        } catch (error) {
          console.error('Failed to refresh profile on app init:', error);
          // Auth store will handle logout if refresh fails
        }
      }
    };

    initAuth();
  }, [token, refreshProfile]);

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

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
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

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;