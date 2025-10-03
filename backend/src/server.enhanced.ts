import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Import configuration
import { config, isProduction, isDevelopment } from '@/config/env';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from '@/config/sentry';
import logger, { requestLogger, morganStream } from '@/config/logger';

// Import middleware
import { tenantResolver } from '@/middleware/tenant';
import { errorHandler } from '@/middleware/errorHandler';
import { notFound } from '@/middleware/notFound';
import { sanitizeInput } from '@/middleware/sanitization';
import { csrfTokenGenerator, conditionalCsrfProtection, csrfErrorHandler, getCsrfToken } from '@/middleware/csrf';

// Import consolidated routes
import apiRoutes from '@/routes';

// Load environment variables
dotenv.config();

const app: Application = express();

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: isDevelopment() ? ['warn', 'error'] : ['error'],
});

// Initialize Sentry (Error Monitoring)
if (config.SENTRY_DSN) {
  initSentry(app);
  logger.info('Sentry error monitoring enabled');
}

// Trust proxy - Required for Railway/Cloudflare/reverse proxies
app.set('trust proxy', 1);

// ============================================================================
// SENTRY REQUEST HANDLER (Must be first)
// ============================================================================
if (config.SENTRY_DSN) {
  app.use(sentryRequestHandler);
  app.use(sentryTracingHandler);
}

// ============================================================================
// HEALTH CHECK (Before all middleware for fast response)
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: config.APP_VERSION,
  });
});

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: isProduction() ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", config.API_BASE_URL],
      frameSrc: ["'self'", "https://checkout.razorpay.com"],
    },
  } : false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// CORS - Cross-Origin Resource Sharing
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  config.FRONTEND_URL,
  config.BACKEND_URL,
  ...config.CORS_ORIGINS,
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow any origin
    if (isDevelopment()) {
      logger.debug(`CORS request from origin: ${origin}`);
      return callback(null, true);
    }

    // Check wildcard subdomain pattern
    if (origin.endsWith(`.${config.BASE_DOMAIN}`) || origin.endsWith(config.BASE_DOMAIN)) {
      return callback(null, true);
    }

    // Check allowed origins list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject all other origins
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant', 'x-csrf-token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-CSRF-Token'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ============================================================================
// RATE LIMITING
// ============================================================================

if (config.ENABLE_RATE_LIMITING) {
  // General rate limiting for all API routes
  const generalLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDevelopment(), // Skip in development
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
      });
    },
  });

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.AUTH_RATE_LIMIT_MAX,
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => isDevelopment(),
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
      });
    },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);

  logger.info('Rate limiting enabled');
}

// ============================================================================
// BODY PARSING & COMPRESSION
// ============================================================================

app.use(cookieParser(config.COOKIE_SECRET));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// REQUEST LOGGING
// ============================================================================

// Morgan HTTP logger (development)
if (isDevelopment()) {
  app.use(require('morgan')('dev'));
} else {
  // Production - use winston
  app.use(require('morgan')('combined', { stream: morganStream }));
}

// Custom request logger with detailed info
app.use(requestLogger);

// ============================================================================
// INPUT SANITIZATION (XSS Protection)
// ============================================================================

app.use(sanitizeInput);
logger.info('Input sanitization enabled');

// ============================================================================
// CSRF PROTECTION
// ============================================================================

if (config.ENABLE_CSRF) {
  // CSRF token endpoint (public)
  app.get('/api/csrf-token', getCsrfToken);

  // Apply CSRF protection conditionally
  // (Skip for API calls with valid JWT, apply for browser requests)
  app.use(conditionalCsrfProtection);

  logger.info('CSRF protection enabled');
}

// ============================================================================
// TENANT RESOLUTION
// ============================================================================

app.use(tenantResolver);

// ============================================================================
// DEBUG ENDPOINTS (Development only)
// ============================================================================

if (isDevelopment()) {
  // Frontend files check
  app.get('/api/debug/files', (req, res) => {
    const fs = require('fs');
    const frontendPath = path.join(__dirname, 'public');

    try {
      const files = fs.existsSync(frontendPath) ? fs.readdirSync(frontendPath) : [];
      res.json({
        frontendPath,
        __dirname,
        exists: fs.existsSync(frontendPath),
        files: files,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Environment configuration check
  app.get('/api/debug/config', (req, res) => {
    res.json({
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      baseDomain: config.BASE_DOMAIN,
      corsEnabled: true,
      csrfEnabled: config.ENABLE_CSRF,
      rateLimitingEnabled: config.ENABLE_RATE_LIMITING,
      auditLoggingEnabled: config.ENABLE_AUDIT_LOGGING,
      sentryEnabled: !!config.SENTRY_DSN,
    });
  });
}

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api', apiRoutes);

// ============================================================================
// STATIC FILE SERVING (Production)
// ============================================================================

if (isProduction()) {
  const frontendPath = path.join(__dirname, 'public');
  logger.info(`Serving static files from: ${frontendPath}`);

  // Serve static files with caching
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.use((req, res, next) => {
    // Skip API routes and health checks
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }

    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        logger.error('Error serving index.html:', err);
        next(err);
      }
    });
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// CSRF error handler (must be before general error handler)
if (config.ENABLE_CSRF) {
  app.use(csrfErrorHandler);
}

// 404 handler
app.use(notFound);

// Sentry error handler (must be before other error handlers)
if (config.SENTRY_DSN) {
  app.use(sentryErrorHandler);
}

// General error handler (must be last)
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connections
    await prisma.$disconnect();
    logger.info('Database connections closed');

    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(config.PORT, () => {
  logger.info('='.repeat(60));
  logger.info(`🚀 ${config.APP_NAME} Backend v${config.APP_VERSION}`);
  logger.info(`📱 Environment: ${config.NODE_ENV}`);
  logger.info(`🌐 Server running on port ${config.PORT}`);
  logger.info(`🔒 Security features:`);
  logger.info(`   - CORS: ✅ Enabled`);
  logger.info(`   - Helmet: ✅ Enabled`);
  logger.info(`   - Rate Limiting: ${config.ENABLE_RATE_LIMITING ? '✅ Enabled' : '⚠️  Disabled'}`);
  logger.info(`   - CSRF Protection: ${config.ENABLE_CSRF ? '✅ Enabled' : '⚠️  Disabled'}`);
  logger.info(`   - Input Sanitization: ✅ Enabled`);
  logger.info(`   - Audit Logging: ${config.ENABLE_AUDIT_LOGGING ? '✅ Enabled' : '⚠️  Disabled'}`);
  logger.info(`   - Error Monitoring (Sentry): ${config.SENTRY_DSN ? '✅ Enabled' : 'ℹ️  Disabled'}`);
  logger.info('='.repeat(60));

  if (isDevelopment()) {
    logger.info(`📊 Prisma Studio: npx prisma studio`);
    logger.info(`🔧 API Documentation: ${config.BACKEND_URL}/api/docs`);
  }
});

export default app;
