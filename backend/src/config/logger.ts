import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { Request, Response } from 'express';

/**
 * Winston Logger Configuration
 * Provides structured logging with log rotation
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (human-readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

/**
 * Main Application Logger
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: customFormat,
  defaultMeta: { service: 'neurallempire-backend', environment: NODE_ENV },
  transports: [
    // Error logs - separate file
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // Combined logs - all levels
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    }),

    // Console output
    new winston.transports.Console({
      format: consoleFormat,
      level: NODE_ENV === 'production' ? 'info' : 'debug',
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

/**
 * HTTP Request Logger
 */
export const httpLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: { service: 'http-requests', environment: NODE_ENV },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

/**
 * Security Logger
 */
export const securityLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: { service: 'security', environment: NODE_ENV },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Keep security logs longer
      zippedArchive: true,
    }),
    // Also log security events to console
    new winston.transports.Console({
      format: consoleFormat,
      level: 'warn',
    }),
  ],
});

/**
 * Database Logger
 */
export const dbLogger = winston.createLogger({
  level: 'debug',
  format: customFormat,
  defaultMeta: { service: 'database', environment: NODE_ENV },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'database-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: Function): void => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Store request ID for tracing
  (req as any).requestId = requestId;

  // Log request
  httpLogger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      httpLogger.error('Request error', logData);
    } else if (res.statusCode >= 400) {
      httpLogger.warn('Request warning', logData);
    } else {
      httpLogger.info('Request completed', logData);
    }
  });

  next();
};

/**
 * Log helpers with structured data
 */
export const loggers = {
  /**
   * Log user action
   */
  userAction: (
    userId: string,
    action: string,
    details?: any
  ) => {
    logger.info('User action', {
      userId,
      action,
      ...details,
    });
  },

  /**
   * Log security event
   */
  security: (
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any
  ) => {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    securityLogger[level](`Security event: ${event}`, {
      event,
      severity,
      ...details,
    });
  },

  /**
   * Log database operation
   */
  database: (
    operation: string,
    table: string,
    duration?: number,
    details?: any
  ) => {
    dbLogger.debug('Database operation', {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...details,
    });
  },

  /**
   * Log API call to external service
   */
  externalApi: (
    service: string,
    endpoint: string,
    status: number,
    duration: number,
    details?: any
  ) => {
    logger.info('External API call', {
      service,
      endpoint,
      status,
      duration: `${duration}ms`,
      ...details,
    });
  },

  /**
   * Log performance metric
   */
  performance: (
    metric: string,
    value: number,
    unit: string,
    details?: any
  ) => {
    logger.info('Performance metric', {
      metric,
      value,
      unit,
      ...details,
    });
  },

  /**
   * Log business event
   */
  business: (
    event: string,
    organizationId: string,
    companyId?: string,
    details?: any
  ) => {
    logger.info('Business event', {
      event,
      organizationId,
      companyId,
      ...details,
    });
  },
};

/**
 * Stream for Morgan HTTP logger
 */
export const morganStream = {
  write: (message: string) => {
    httpLogger.info(message.trim());
  },
};

export default logger;
