import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import OAuthButton from './OAuthButton';
import { getOrganizationFromUrl } from '@/utils/routing';

interface OAuthProvider {
  provider: string;
  enabled: boolean;
  customization?: {
    buttonText?: string;
    buttonColor?: string;
    logoUrl?: string;
  };
}

interface OAuthButtonsProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  showDivider?: boolean;
  title?: string;
}

const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  // onSuccess,
  onError,
  className = '',
  showDivider = true,
  title = 'Continue with'
}) => {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get organization context
  const orgSlug = getOrganizationFromUrl();

  useEffect(() => {
    fetchAvailableProviders();
  }, [orgSlug]);

  const fetchAvailableProviders = async () => {
    try {
      setLoading(true);

      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const url = orgSlug
        ? `${baseUrl}/api/oauth/providers?org=${orgSlug}`
        : `${baseUrl}/api/oauth/providers`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setProviders(data.providers.filter((p: any) => p.enabled !== false));
      } else {
        throw new Error(data.error || 'Failed to fetch OAuth providers');
      }
    } catch (err: any) {
      console.error('Failed to fetch OAuth providers:', err);
      setError('Failed to load authentication options');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthAuth = async (provider: string) => {
    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

      // Build the OAuth initiation URL
      let oauthUrl = `${baseUrl}/api/oauth/${provider}`;

      // Add organization context
      if (orgSlug) {
        oauthUrl += `?org=${orgSlug}`;
      }

      // Store current location for post-auth redirect
      sessionStorage.setItem('preAuthUrl', window.location.href);
      sessionStorage.setItem('authProvider', provider);

      // Initiate OAuth flow
      const response = await fetch(oauthUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to initiate authentication');
      }

    } catch (err: any) {
      console.error(`OAuth error for ${provider}:`, err);
      toast.error(`Failed to authenticate with ${provider}`);
      onError?.(err.message);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || providers.length === 0) {
    return (
      <div className={`text-center ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            {error || 'No authentication providers available'}
          </p>
          <button
            onClick={fetchAvailableProviders}
            className="mt-2 text-yellow-600 hover:text-yellow-700 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showDivider && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{title}</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        <motion.div className="space-y-3">
          {providers.map((providerConfig, index) => (
            <motion.div
              key={providerConfig.provider}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <OAuthButton
                provider={providerConfig.provider as any}
                onAuth={handleOAuthAuth}
                orgSlug={orgSlug || undefined}
                customization={providerConfig.customization}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Organization branding */}
      {orgSlug && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Signing in to <span className="font-medium">{orgSlug}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default OAuthButtons;