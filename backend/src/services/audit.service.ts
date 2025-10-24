import { prisma } from '@/server';
import { Request } from 'express';
import { AuthenticatedRequest } from '@/types';
import { logger } from '@/infrastructure/logger';

/**
 * Security Audit Logging Service
 * Tracks all security-relevant events for compliance and monitoring
 */

export enum AuditEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',

  // Authorization Events
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',

  // Data Access Events
  SENSITIVE_DATA_ACCESSED = 'SENSITIVE_DATA_ACCESSED',
  BULK_EXPORT = 'BULK_EXPORT',
  DATA_DELETED = 'DATA_DELETED',

  // Security Events
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',

  // Company/Organization Events
  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_DELETED = 'COMPANY_DELETED',
  COMPANY_SWITCHED = 'COMPANY_SWITCHED',
  SUBDOMAIN_CHANGED = 'SUBDOMAIN_CHANGED',

  // Admin Events
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',

  // Financial Events
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  TRANSACTION_VOIDED = 'TRANSACTION_VOIDED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogData {
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  organizationId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  details?: any;
  metadata?: any;
}

class AuditService {
  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: data.eventType,
          severity: data.severity,
          userId: data.userId,
          organizationId: data.organizationId,
          companyId: data.companyId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          resourceType: data.resourceType || '',
          resourceId: data.resourceId || '',
          action: data.action || data.eventType,
          details: data.details || {},
          metadata: data.metadata || {},
          createdAt: new Date(),
        },
      });

      // For critical events, also log to console for immediate alerting
      if (data.severity === AuditSeverity.CRITICAL) {
        logger.error('🚨 CRITICAL SECURITY EVENT:', {
          eventType: data.eventType,
          userId: data.userId,
          details: data.details,
        });
      }
    } catch (error) {
      // Don't let audit logging failures break the app
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Extract request metadata for audit logs
   */
  getRequestMetadata(req: Request | AuthenticatedRequest) {
    return {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: (req as AuthenticatedRequest).user?.id,
      organizationId: (req as AuthenticatedRequest).organization?.id,
      companyId: (req as AuthenticatedRequest).companyId,
    };
  }

  /**
   * Get client IP address (handles proxies)
   */
  private getClientIp(req: Request): string {
    // Handle various proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Log authentication events
   */
  async logAuth(
    req: Request,
    eventType: AuditEventType,
    details?: any
  ): Promise<void> {
    const metadata = this.getRequestMetadata(req);

    const severity = eventType.includes('FAILED') || eventType.includes('DENIED')
      ? AuditSeverity.WARNING
      : AuditSeverity.INFO;

    await this.log({
      eventType,
      severity,
      ...metadata,
      details,
    });
  }

  /**
   * Log security violations
   */
  async logSecurityEvent(
    req: Request,
    eventType: AuditEventType,
    details?: any
  ): Promise<void> {
    const metadata = this.getRequestMetadata(req);

    await this.log({
      eventType,
      severity: AuditSeverity.CRITICAL,
      ...metadata,
      details: {
        ...details,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
      },
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    req: AuthenticatedRequest,
    resourceType: string,
    resourceId: string,
    action: string,
    details?: any
  ): Promise<void> {
    const metadata = this.getRequestMetadata(req);

    await this.log({
      eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
      severity: AuditSeverity.INFO,
      ...metadata,
      resourceType,
      resourceId,
      action,
      details,
    });
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    req: AuthenticatedRequest,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: any
  ): Promise<void> {
    const metadata = this.getRequestMetadata(req);

    await this.log({
      eventType: AuditEventType.SETTINGS_CHANGED,
      severity: AuditSeverity.WARNING,
      ...metadata,
      resourceType,
      resourceId,
      action,
      details,
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    userId?: string;
    organizationId?: string;
    companyId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.severity) where.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs,
      total,
      hasMore: total > (filters.offset || 0) + logs.length,
    };
  }

  /**
   * Get security summary for a time period
   */
  async getSecuritySummary(organizationId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        severity: { in: [AuditSeverity.WARNING, AuditSeverity.CRITICAL] },
      },
    });

    const summary = {
      totalEvents: logs.length,
      criticalEvents: logs.filter(l => l.severity === AuditSeverity.CRITICAL).length,
      warningEvents: logs.filter(l => l.severity === AuditSeverity.WARNING).length,
      failedLogins: logs.filter(l => l.eventType === AuditEventType.LOGIN_FAILED).length,
      permissionDenied: logs.filter(l => l.eventType === AuditEventType.PERMISSION_DENIED).length,
      suspiciousActivity: logs.filter(l => l.eventType === AuditEventType.SUSPICIOUS_ACTIVITY).length,
      eventsByType: this.groupByEventType(logs),
    };

    return summary;
  }

  /**
   * Helper to group logs by event type
   */
  private groupByEventType(logs: any[]) {
    const grouped: Record<string, number> = {};
    logs.forEach(log => {
      grouped[log.eventType] = (grouped[log.eventType] || 0) + 1;
    });
    return grouped;
  }
}

export const auditService = new AuditService();
