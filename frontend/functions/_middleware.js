/**
 * Cloudflare Pages Function - API Proxy Middleware
 * Proxies /api/* requests to Railway backend
 */

const BACKEND_URL = 'https://neurallempire-production.up.railway.app';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Only proxy /api/* requests
  if (url.pathname.startsWith('/api/')) {
    // Build the backend URL
    const backendUrl = new URL(url.pathname + url.search, BACKEND_URL);

    // Clone the request with the new URL
    const modifiedRequest = new Request(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    // Forward to backend
    const response = await fetch(modifiedRequest);

    // Clone response to modify headers if needed
    const modifiedResponse = new Response(response.body, response);

    // Ensure CORS headers are present
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return modifiedResponse;
  }

  // For non-API requests, continue to next middleware/page
  return context.next();
}
