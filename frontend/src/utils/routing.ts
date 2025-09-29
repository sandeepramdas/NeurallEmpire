/**
 * Routing utilities for handling single domain + subdomain routing
 */

export const getOrganizationFromUrl = (): string | null => {
  const hostname = window.location.hostname;

  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check URL parameters for organization
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('org') || urlParams.get('tenant');
  }

  // Production subdomain detection
  if (hostname.includes('neurallempire.com')) {
    const parts = hostname.split('.');

    // If it's a subdomain (not www or api)
    if (parts.length >= 3 && !['www', 'api', 'app', 'admin'].includes(parts[0])) {
      return parts[0]; // Return subdomain as organization slug
    }
  }

  return null;
};

export const buildDashboardUrl = (orgSlug: string): string => {
  const hostname = window.location.hostname;

  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `/dashboard/${orgSlug}?org=${orgSlug}`;
  }

  // Production - use path-based routing for now
  return `/dashboard/${orgSlug}`;
};

export const shouldRedirectToDashboard = (orgSlug: string): boolean => {
  const currentOrg = getOrganizationFromUrl();
  return currentOrg === orgSlug;
};

export const getMainDomainUrl = (): string => {
  const hostname = window.location.hostname;

  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }

  // Production
  return 'https://www.neurallempire.com';
};