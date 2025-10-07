import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

export const initSentry = (app: Express) => {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN) {
    console.log('ℹ️  Sentry DSN not configured, skipping error monitoring setup');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      // Profiling
      nodeProfilingIntegration(),
    ],

    // Release tracking
    release: process.env.npm_package_version,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove password fields
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          Object.keys(data).forEach(key => {
            if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
              data[key] = '[Filtered]';
            }
          });
        }
      }

      return event;
    },

    // Error filtering
    ignoreErrors: [
      'Non-Error promise rejection',
      'ResizeObserver loop limit exceeded',
      'Can\'t find variable: gtag',
    ],
  });

  console.log('✅ Sentry error monitoring initialized');
};

export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();
export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();
export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture 4xx and 5xx errors
    return error.status >= 400;
  },
});

// Manual error capture
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// Manual message capture
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// Set user context
export const setUser = (user: { id: string; email?: string; organizationId?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
  });
};

// Clear user context
export const clearUser = () => {
  Sentry.setUser(null);
};

// Add breadcrumb
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

export default Sentry;
