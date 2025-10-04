/**
 * Enhanced routing utilities for subdomain-based multi-tenant SaaS
 * Supports both development and production environments
 */

export interface SubdomainInfo {
  subdomain: string | null;
  isSubdomain: boolean;
  isReserved: boolean;
  fullDomain: string;
}

// Reserved subdomains that cannot be used by organizations
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'app', 'admin', 'mail', 'ftp', 'blog', 'shop',
  'support', 'help', 'docs', 'status', 'cdn', 'assets', 'static',
  'dashboard', 'account', 'billing', 'login', 'register', 'auth',
  'staging', 'dev', 'test', 'demo'
];

/**
 * Get organization slug from current URL
 * Works in both development and production environments
 * Supports: custom domains, subdomains, path-based, and query parameters
 */
export const getOrganizationFromUrl = (): string | null => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // 1. Try path-based routing first (/org/acme-corp/dashboard)
  const pathMatch = pathname.match(/^\/org\/([a-z0-9-]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Development environment - use query parameters
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('org') || urlParams.get('tenant');
  }

  // 3. Check if custom domain (not neurallempire.com)
  // Custom domains should have org slug in local storage or make API call
  if (!hostname.includes('neurallempire.com')) {
    // For custom domains, orgSlug should be fetched from API or stored
    const storedOrgSlug = localStorage.getItem(`customDomain:${hostname}`);
    return storedOrgSlug;
  }

  // 4. Production subdomain detection
  if (hostname.includes('neurallempire.com')) {
    const parts = hostname.split('.');

    // If it's a subdomain (e.g., acme.neurallempire.com)
    if (parts.length >= 3) {
      const potentialSubdomain = parts[0];

      // Skip reserved subdomains
      if (!RESERVED_SUBDOMAINS.includes(potentialSubdomain)) {
        return potentialSubdomain;
      }
    }
  }

  return null;
};

/**
 * Get detailed subdomain information
 */
export const getSubdomainInfo = (): SubdomainInfo => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const orgFromQuery = getOrganizationFromUrl();
    return {
      subdomain: orgFromQuery,
      isSubdomain: !!orgFromQuery,
      isReserved: false,
      fullDomain: hostname
    };
  }

  if (hostname.includes('neurallempire.com')) {
    const parts = hostname.split('.');

    if (parts.length >= 3) {
      const subdomain = parts[0];
      return {
        subdomain,
        isSubdomain: true,
        isReserved: RESERVED_SUBDOMAINS.includes(subdomain),
        fullDomain: hostname
      };
    }
  }

  return {
    subdomain: null,
    isSubdomain: false,
    isReserved: false,
    fullDomain: hostname
  };
};

/**
 * Build URL for organization dashboard
 * Returns subdomain URL in production, query-based in development
 * Supports optional path-based fallback
 */
export const buildDashboardUrl = (
  orgSlug: string,
  path: string = '/dashboard',
  options: { usePathBased?: boolean } = {}
): string => {
  const hostname = window.location.hostname;

  // Development environment - use query parameters
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = path;
    currentUrl.searchParams.set('org', orgSlug);
    return currentUrl.toString();
  }

  // Path-based routing (fallback option)
  if (options.usePathBased) {
    const protocol = window.location.protocol;
    const host = hostname.includes('neurallempire.com') ? 'www.neurallempire.com' : hostname;
    // Convert /dashboard to /org/acme-corp/dashboard
    const pathWithOrg = path.replace(/^\//, `/org/${orgSlug}/`);
    return `${protocol}//${host}${pathWithOrg}`;
  }

  // Production - use subdomain (default)
  const protocol = window.location.protocol;
  return `${protocol}//${orgSlug}.neurallempire.com${path}`;
};

/**
 * Build URL for main marketing site
 */
export const buildMainSiteUrl = (path: string = '/'): string => {
  const hostname = window.location.hostname;

  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${window.location.origin}${path}`;
  }

  // Production
  return `https://www.neurallempire.com${path}`;
};

/**
 * Check if current URL matches organization
 */
export const isCurrentOrganization = (orgSlug: string): boolean => {
  const currentOrg = getOrganizationFromUrl();
  return currentOrg === orgSlug;
};

/**
 * Redirect to organization's subdomain
 */
export const redirectToOrganization = (orgSlug: string, path: string = '/dashboard'): void => {
  const targetUrl = buildDashboardUrl(orgSlug, path);

  // Only redirect if we're not already on the target URL
  if (window.location.href !== targetUrl) {
    window.location.href = targetUrl;
  }
};

/**
 * Redirect to main marketing site
 */
export const redirectToMainSite = (path: string = '/'): void => {
  const targetUrl = buildMainSiteUrl(path);
  window.location.href = targetUrl;
};

/**
 * Get organization context for API calls
 */
export const getOrganizationContext = (): { orgSlug?: string; headers: Record<string, string> } => {
  const orgSlug = getOrganizationFromUrl();

  const headers: Record<string, string> = {};

  if (orgSlug) {
    headers['X-Organization-Slug'] = orgSlug;
  }

  return { orgSlug: orgSlug || undefined, headers };
};

/**
 * Validate subdomain format
 */
export const isValidSubdomain = (subdomain: string): boolean => {
  // Check length (3-63 characters)
  if (subdomain.length < 3 || subdomain.length > 63) {
    return false;
  }

  // Check format: alphanumeric and hyphens only
  const pattern = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  if (!pattern.test(subdomain)) {
    return false;
  }

  // Check if reserved
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return false;
  }

  return true;
};

/**
 * Generate subdomain suggestions
 */
export const generateSubdomainSuggestions = (baseName: string): string[] => {
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');

  return [
    `${cleanBase}co`,
    `${cleanBase}inc`,
    `${cleanBase}org`,
    `${cleanBase}team`,
    `${cleanBase}hq`,
    `${cleanBase}labs`,
    `${cleanBase}studio`,
    `${cleanBase}group`
  ].filter(suggestion => suggestion.length >= 3 && suggestion.length <= 63);
};

/**
 * Check if we're on a subdomain
 */
export const isOnSubdomain = (): boolean => {
  const info = getSubdomainInfo();
  return info.isSubdomain && !info.isReserved;
};

/**
 * Check if we're on the main domain
 */
export const isOnMainDomain = (): boolean => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return !getOrganizationFromUrl(); // No org in query = main domain
  }

  return hostname === 'neurallempire.com' || hostname === 'www.neurallempire.com';
};

/**
 * Get current environment info
 */
export const getEnvironmentInfo = () => {
  const hostname = window.location.hostname;
  const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
  const isProduction = hostname.includes('neurallempire.com');

  return {
    isDevelopment,
    isProduction,
    hostname,
    protocol: window.location.protocol,
    port: window.location.port
  };
};