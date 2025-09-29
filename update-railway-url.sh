#!/bin/bash

# Script to update frontend with Railway backend URL
# Usage: ./update-railway-url.sh https://your-railway-backend-url.up.railway.app

RAILWAY_URL=$1

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Error: Please provide Railway URL"
    echo "Usage: ./update-railway-url.sh https://your-railway-backend-url.up.railway.app"
    exit 1
fi

echo "🚂 Updating frontend to use Railway backend: $RAILWAY_URL"

# Update GitHub Actions workflow
sed -i.bak "s|VITE_API_URL: https://.*|VITE_API_URL: ${RAILWAY_URL}/api|" .github/workflows/deploy.yml

# Remove temporary mock API interceptor
echo "🧹 Removing temporary mock API..."

# Create clean version of api.ts without mock interceptor
cat > frontend/src/services/api.ts << 'EOF'
import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get current tenant
const getCurrentTenant = (): string | null => {
  // 1. Check URL query parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const tenantFromQuery = urlParams.get('tenant');
  if (tenantFromQuery) {
    return tenantFromQuery;
  }

  // 2. Check localStorage for selected tenant
  const tenantFromStorage = localStorage.getItem('selectedTenant');
  if (tenantFromStorage) {
    return tenantFromStorage;
  }

  // 3. Check hostname for subdomain (production)
  const hostname = window.location.hostname;
  if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.');
    if (parts.length >= 3 && !['www', 'api', 'app', 'admin'].includes(parts[0])) {
      return parts[0];
    }
  }

  return null;
};

// Add tenant header to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const tenant = getCurrentTenant();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenant) {
    config.headers['X-Tenant'] = tenant;
  }

  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      toast.error('Access denied');
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;
EOF

echo "✅ Updated API configuration"
echo "✅ Removed mock API interceptor"
echo "✅ Updated GitHub Actions with Railway URL: ${RAILWAY_URL}/api"

echo ""
echo "🚀 Ready to deploy! Run the following commands:"
echo "cd frontend && npm run build"
echo "git add . && git commit -m 'Connect to Railway backend: ${RAILWAY_URL}'"
echo "git push origin main"
EOF