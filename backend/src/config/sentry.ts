import * as Sentry from '@sentry/node';
import { httpIntegration, expressIntegration } from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Application, Express } from 'express';

/**
 * Sentry Error Monitoring Configuration
 * Complete integration with Express, profiling, and error tracking
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.npm_package_version || '1.0.0';

/**
 * Initialize Sentry with full Express integration
 */
export const initSentry = (app: Express): void => {
  if (!SENTRY_DSN) {
    console.log('ℹ️  Sentry DSN not configured, skipping error monitoring setup');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `neurallempire-backend@${APP_VERSION}`,

    // Performance Monitoring
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // Express integration with tracing
      httpIntegration(),
      expressIntegration({ app }),
      // Performance profiling
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove password fields from request data
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

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };
            delete sanitized.password;
            delete sanitized.token;
            delete sanitized.apiKey;
            return { ...breadcrumb, data: sanitized };
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
      'NetworkError',
      'Network request failed',
      'ValidationError',
      'Invalid input',
      'ResizeObserver loop limit exceeded',
      'Can\'t find variable: gtag',
    ],
  });

  console.log('✅ Sentry error monitoring initialized');
};

/**
 * Express middleware handlers
 */
export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();
export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();

export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture 4xx and 5xx errors
    return error.status >= 400;
  },
});

/**
 * Manual error capture with context
 * Alias for backward compatibility
 */
export const captureException = (
  error: Error,
  context?: {
    userId?: string;
    organizationId?: string;
    companyId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  } | Record<string, any>
): void => {
  Sentry.withScope(scope => {
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.organizationId) {
      scope.setTag('organizationId', context.organizationId);
    }
    if (context?.companyId) {
      scope.setTag('companyId', context.companyId);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    } else if (context && !context.userId && !context.tags && !context.organizationId && !context.companyId) {
      // If context is just extra data
      scope.setExtras(context);
    }

    Sentry.captureException(error);
  });
};

// Backward compatibility alias
export const captureError = captureException;

/**
 * Capture message (for non-error events)
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void => {
  Sentry.withScope(scope => {
    scope.setLevel(level);

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureMessage(message);
  });
};

/**
 * Set user context
 */
export const setUser = (user: { id: string; email?: string; organizationId?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
  });
};

/**
 * Clear user context
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

export default Sentry;
