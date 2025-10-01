/**
 * Cloudflare Worker for Subdomain Routing
 * Routes *.neurallempire.com to Railway app with subdomain info
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract subdomain
    const parts = hostname.split('.');
    let subdomain = null;

    // Check if it's a subdomain (e.g., acme.neurallempire.com)
    if (parts.length >= 3 && hostname.endsWith('neurallempire.com')) {
      subdomain = parts[0];

      // Skip reserved subdomains
      const reserved = ['www', 'api', 'admin', 'mail', 'blog'];
      if (reserved.includes(subdomain)) {
        subdomain = null;
      }
    }

    // Target Railway app
    const targetUrl = 'https://www.neurallempire.com';

    // Build the proxied request
    const proxyUrl = new URL(url.pathname + url.search, targetUrl);

    // Clone the request
    const modifiedRequest = new Request(proxyUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    // Add subdomain info to headers if present
    if (subdomain) {
      modifiedRequest.headers.set('X-Subdomain', subdomain);
      modifiedRequest.headers.set('X-Original-Host', hostname);
    }

    // Forward request to Railway
    const response = await fetch(modifiedRequest);

    // Clone response to modify headers
    const modifiedResponse = new Response(response.body, response);

    // Add CORS headers if needed
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');

    return modifiedResponse;
  },
};
