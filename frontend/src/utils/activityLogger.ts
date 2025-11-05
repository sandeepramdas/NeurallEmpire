/**
 * Frontend Activity Logger
 * Tracks user actions, errors, and network activity for debugging
 */

export type ActivityType =
  | 'PAGE_VIEW'
  | 'CLICK'
  | 'FORM_SUBMIT'
  | 'API_REQUEST'
  | 'API_RESPONSE'
  | 'ERROR'
  | 'OAUTH_START'
  | 'OAUTH_CALLBACK'
  | 'AUTH_STATE_CHANGE'
  | 'NAVIGATION'
  | 'USER_ACTION';

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: ActivityType;
  action: string;
  details: Record<string, any>;
  url: string;
  userAgent: string;
  userId?: string;
  organizationId?: string;
  sessionId: string;
}

class ActivityLogger {
  private logs: ActivityLog[] = [];
  private sessionId: string;
  private maxLogs = 500; // Keep last 500 logs in memory
  private apiEndpoint = '/api/admin/activity-logs';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeGlobalErrorHandler();
    this.initializeNavigationTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeGlobalErrorHandler() {
    // Catch all unhandled errors
    window.addEventListener('error', (event) => {
      this.log('ERROR', 'Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    });

    // Catch all unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('ERROR', 'Unhandled Promise Rejection', {
        reason: event.reason,
        promise: String(event.promise),
      });
    });
  }

  private initializeNavigationTracking() {
    // Track page views
    let lastUrl = window.location.href;

    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        this.log('NAVIGATION', 'Page Navigation', {
          from: lastUrl,
          to: currentUrl,
          method: 'client-side',
        });
        lastUrl = currentUrl;
      }
    };

    // Check for URL changes (works with React Router)
    setInterval(checkUrlChange, 500);

    // Track initial page load
    window.addEventListener('load', () => {
      this.log('PAGE_VIEW', 'Page Load', {
        url: window.location.href,
        referrer: document.referrer,
      });
    });
  }

  /**
   * Log an activity
   */
  log(type: ActivityType, action: string, details: Record<string, any> = {}) {
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      action,
      details,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      organizationId: this.getOrganizationId(),
      sessionId: this.sessionId,
    };

    // Add to in-memory store
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[${type}] ${action}:`, details);
    }

    // Send to backend (debounced)
    this.sendToBackend(log);

    return log;
  }

  /**
   * Track OAuth flow
   */
  trackOAuthStart(provider: string) {
    this.log('OAUTH_START', `OAuth ${provider} Started`, {
      provider,
      timestamp: Date.now(),
    });
  }

  trackOAuthCallback(token?: string, error?: string) {
    this.log('OAUTH_CALLBACK', 'OAuth Callback Received', {
      hasToken: !!token,
      tokenLength: token?.length,
      error,
      urlParams: Object.fromEntries(new URLSearchParams(window.location.search)),
    });
  }

  /**
   * Track API requests
   */
  trackApiRequest(method: string, url: string, data?: any) {
    this.log('API_REQUEST', `API ${method} ${url}`, {
      method,
      url,
      data,
      timestamp: Date.now(),
    });
  }

  trackApiResponse(method: string, url: string, status: number, data?: any, error?: any) {
    this.log('API_RESPONSE', `API ${method} ${url} - ${status}`, {
      method,
      url,
      status,
      data,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Track user actions
   */
  trackClick(element: string, details?: Record<string, any>) {
    this.log('CLICK', `Clicked: ${element}`, details);
  }

  trackFormSubmit(formName: string, details?: Record<string, any>) {
    this.log('FORM_SUBMIT', `Submitted: ${formName}`, details);
  }

  /**
   * Get all logs
   */
  getAllLogs(): ActivityLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: ActivityType): ActivityLog[] {
    return this.logs.filter(log => log.type === type);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  private getUserId(): string | undefined {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        return payload.userId;
      }
    } catch (e) {
      // Ignore
    }
    return undefined;
  }

  private getOrganizationId(): string | undefined {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        return payload.organizationId;
      }
    } catch (e) {
      // Ignore
    }
    return undefined;
  }

  private sendToBackend(log: ActivityLog) {
    // Add to pending logs queue
    this.pendingLogs.push(log);

    // Send logs to backend in batches (debounced)
    // This prevents too many requests
    if (!this.batchTimeout) {
      this.batchTimeout = window.setTimeout(() => {
        this.flushLogs();
      }, 2000); // Send every 2 seconds
    }
  }

  private batchTimeout: number | null = null;
  private pendingLogs: ActivityLog[] = [];

  private async flushLogs() {
    if (this.pendingLogs.length === 0) return;

    // Don't send logs if user is not authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Clear pending logs for unauthenticated users
      this.pendingLogs = [];
      this.batchTimeout = null;
      return;
    }

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];
    this.batchTimeout = null;

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (e) {
      // Silently fail - don't want logging to break the app
      if (import.meta.env.DEV) {
        console.warn('Failed to send activity logs:', e);
      }
    }
  }
}

// Singleton instance
export const activityLogger = new ActivityLogger();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).activityLogger = activityLogger;
}
