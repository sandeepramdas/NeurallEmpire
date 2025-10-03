import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

/**
 * Sentry Error Monitoring Configuration
 * Provides real-time error tracking and performance monitoring
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.npm_package_version || '1.0.0';

/**
 * Initialize Sentry
 */
export const initSentry = (app: Express): void => {
  // Only enable Sentry in production or if DSN is explicitly provided
  if (!SENTRY_DSN) {
    console.log('ℹ️  Sentry DSN not configured, skipping error monitoring setup');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `neurallempire-backend@${APP_VERSION}`,

    // Performance Monitoring
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // HTTP integration for Express
      new Sentry.Integrations.Http({ tracing: true }),

      // Express integration
      new Sentry.Integrations.Express({
        app,
      }),

      // Profiling
      new ProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
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
      // Browser errors that don't matter for backend
      'Non-Error exception captured',
      'Non-Error promise rejection captured',

      // Network errors
      'NetworkError',
      'Network request failed',

      // Validation errors (these are expected)
      'ValidationError',
      'Invalid input',
    ],
  });

  console.log('✅ Sentry error monitoring initialized');
};

/**
 * Request handler middleware (must be first)
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler();

/**
 * Tracing middleware
 */
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

/**
 * Error handler middleware (must be before other error handlers)
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors with status >= 500
    if (error.status && error.status >= 500) {
      return true;
    }

    // Capture specific error types
    if (error.name === 'UnauthorizedError') {
      return false; // Don't report auth errors
    }

    return true;
  },
});

/**
 * Manually capture error
 */
export const captureError = (
  error: Error,
  context?: {
    userId?: string;
    organizationId?: string;
    companyId?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void => {
  Sentry.withScope(scope => {
    // Add user context
    if (context?.userId) {
      scope.setUser({
        id: context.userId,
      });
    }

    // Add tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Add extra context
    if (context?.organizationId) {
      scope.setTag('organizationId', context.organizationId);
    }
    if (context?.companyId) {
      scope.setTag('companyId', context.companyId);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(error);
  });
};

/**
 * Capture message (for non-error events)
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
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
 * Start a transaction for performance monitoring
 */
export const startTransaction = (
  name: string,
  op: string
): Sentry.Transaction => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

/**
 * Performance monitoring helper
 */
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const transaction = startTransaction(name, 'function');

  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};
