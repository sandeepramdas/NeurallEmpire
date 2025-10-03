import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Sentry Error Monitoring Configuration (Simplified)
 * Compatible with latest @sentry/node
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.npm_package_version || '1.0.0';

/**
 * Initialize Sentry
 */
export const initSentry = (app?: Express): void => {
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
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out sensitive data
    beforeSend(event) {
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
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
      'NetworkError',
      'Network request failed',
      'ValidationError',
      'Invalid input',
    ],
  });

  console.log('✅ Sentry error monitoring initialized');
};

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
    }

    Sentry.captureException(error);
  });
};

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

// Export basic error handler middleware
export const sentryErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (SENTRY_DSN && err.status >= 500) {
    Sentry.captureException(err);
  }
  next(err);
};

export default Sentry;
