import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile, organization } = useAuthStore();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Extract token from URL (new OAuth flow)
      const token = searchParams.get('token');
      const isNewUser = searchParams.get('new') === 'true';
      const provider = sessionStorage.getItem('authProvider');

      if (token) {
        setMessage('Authentication successful! Setting up your account...');

        // Store the token in localStorage
        localStorage.setItem('authToken', token);

        // Refresh user profile to get updated info
        await refreshProfile();

        setStatus('success');
        setMessage(
          isNewUser
            ? 'Welcome! Your account has been created successfully.'
            : 'Welcome back! You have been signed in.'
        );

        // Show success toast
        toast.success(
          isNewUser
            ? `Account created${provider ? ` with ${provider}` : ''}!`
            : `Signed in${provider ? ` with ${provider}` : ''}!`
        );

        // Get stored pre-auth URL or default redirect
        const preAuthUrl = sessionStorage.getItem('preAuthUrl');

        // Clean up session storage
        sessionStorage.removeItem('preAuthUrl');
        sessionStorage.removeItem('authProvider');

        // Redirect after brief delay
        setTimeout(() => {
          if (isNewUser) {
            // New users go to org selection
            navigate('/select-organization');
          } else if (preAuthUrl && preAuthUrl.includes('/dashboard')) {
            window.location.href = preAuthUrl;
          } else {
            // Redirect to dashboard with organization context
            if (organization?.slug) {
              navigate(`/org/${organization.slug}/dashboard`);
            } else {
              navigate('/dashboard'); // Will redirect to correct org path via ProtectedRoute
            }
          }
        }, 2000);

        return;
      }

      // Check for error parameters
      const error = searchParams.get('error');
      const errorMessage = searchParams.get('message');
      const errorProvider = searchParams.get('provider');

      if (error || errorMessage) {
        throw new Error(
          errorMessage ||
          `Authentication failed${errorProvider ? ` with ${errorProvider}` : ''}`
        );
      }

      // If we get here, something unexpected happened
      throw new Error('Authentication callback completed but no success or error parameters found');

    } catch (error: any) {
      console.error('OAuth callback error:', error);

      setStatus('error');
      setMessage(error.message || 'Authentication failed');

      toast.error('Authentication failed');

      // Clean up session storage
      sessionStorage.removeItem('preAuthUrl');
      sessionStorage.removeItem('authProvider');

      // Redirect to login page after delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" />
        );
      case 'success':
        return (
          <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
      >
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          {getStatusIcon()}
        </motion.div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className={`text-xl font-semibold mb-4 ${getStatusColor()}`}>
            {status === 'processing' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>

          <p className="text-gray-600 text-sm mb-6">
            {message}
          </p>

          {/* Additional status info */}
          {status === 'processing' && (
            <div className="space-y-2 text-xs text-gray-500">
              <p>• Verifying your credentials</p>
              <p>• Setting up your account</p>
              <p>• Preparing your dashboard</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-xs text-gray-500">
              <p>Redirecting you to your dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500">
                <p>You will be redirected to the login page shortly.</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Return to Login
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Provider branding if available */}
        {sessionStorage.getItem('authProvider') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-6 border-t border-gray-200"
          >
            <p className="text-xs text-gray-400">
              Authenticating with {sessionStorage.getItem('authProvider')}
            </p>
          </motion.div>
        )}

        {/* Loading dots animation */}
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center space-x-1 mt-6"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default OAuthCallback;