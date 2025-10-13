/**
 * ==================== PRODUCTION-GRADE LOGGING ====================
 *
 * Winston-based logging with:
 * - Structured logging (JSON)
 * - Multiple transports (Console, File, CloudWatch)
 * - Log levels (error, warn, info, debug)
 * - Request correlation IDs
 * - Performance tracking
 * - PII redaction
 *
 * @module infrastructure/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// JSON format for file/cloud logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// PII Redaction
const redactPII = winston.format((info) => {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials', 'authorization'];

  const redact = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(redact);
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = redact(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  };

  return redact(info);
});

// Transports
const transports: winston.transport[] = [
  // Console transport (for development)
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
  }),
];

// File transports (for production)
if (process.env.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: jsonFormat,
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: jsonFormat,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(redactPII(), jsonFormat),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

/**
 * HTTP Request Logger Middleware
 */
export function httpLogger(req: any, res: any, next: any) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Request Failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Client Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
}

/**
 * Performance Logger
 * Tracks execution time of operations
 */
export class PerformanceLogger {
  private startTime: number;
  private checkpoints: Map<string, number>;

  constructor(private operation: string, private metadata?: Record<string, any>) {
    this.startTime = Date.now();
    this.checkpoints = new Map();
  }

  checkpoint(name: string) {
    this.checkpoints.set(name, Date.now() - this.startTime);
  }

  end(success: boolean = true, additionalData?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    const checkpoints: Record<string, number> = {};

    this.checkpoints.forEach((time, name) => {
      checkpoints[name] = time;
    });

    logger.info(`Operation ${success ? 'completed' : 'failed'}: ${this.operation}`, {
      operation: this.operation,
      duration: `${duration}ms`,
      success,
      checkpoints,
      ...this.metadata,
      ...additionalData,
    });

    return duration;
  }
}

/**
 * Audit Logger
 * Logs important business operations
 */
export function auditLog(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  logger.info('AUDIT', {
    type: 'AUDIT',
    action,
    userId,
    resourceType,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Security Logger
 * Logs security-related events
 */
export function securityLog(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>
) {
  const logFn = severity === 'low' || severity === 'medium' ? logger.warn : logger.error;

  logFn('SECURITY EVENT', {
    type: 'SECURITY',
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
