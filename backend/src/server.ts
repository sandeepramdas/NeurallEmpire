import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Import middleware
import { tenantResolver } from '@/middleware/tenant';
import { errorHandler } from '@/middleware/errorHandler';
import { notFound } from '@/middleware/notFound';

// Import consolidated routes
import apiRoutes from '@/routes';

// Import Sentry for error monitoring
import { initSentry, sentryErrorHandler } from '@/config/sentry';

// Import cron jobs
import { startCronJobs, stopCronJobs } from '@/services/cron.service';

dotenv.config();

const app: Application = express();

// Initialize Sentry error monitoring (must be first)
initSentry(app);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Trust proxy - Required for Railway/Cloudflare/reverse proxies
// Trust only the first proxy (Railway/Cloudflare)
app.set('trust proxy', 1);

// CRITICAL: Health check endpoint MUST be before CORS middleware
// This allows Railway healthchecks and direct browser access without Origin header
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// Security middleware - Comprehensive protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.neurallempire.com", "https://*.neurallempire.com", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// CORS configuration - Strict for both development and production
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://neurallempire.com',
      'https://www.neurallempire.com',
      'https://app.neurallempire.com',
    ];

    // Allow requests without origin (health checks, Postman, direct browser access)
    if (!origin) {
      return callback(null, true);
    }

    // Log CORS requests in development for debugging
    if (NODE_ENV === 'development') {
      console.log('🌐 CORS Request from origin:', origin);
    }

    // Allow subdomain pattern *.neurallempire.com
    if (origin.endsWith('.neurallempire.com') || origin.endsWith('neurallempire.com')) {
      return callback(null, true);
    }

    // Check allowed origins list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Reject all other origins
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // Cache preflight requests for 10 minutes
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Rate limiting - More permissive for production
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Validate that trust proxy is configured correctly
  validate: { trustProxy: false },
});

// Stricter rate limiting for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes per IP
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Validate that trust proxy is configured correctly
  validate: { trustProxy: false },
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Tenant resolution middleware (must be before routes)
app.use(tenantResolver);

// Debug endpoint to check frontend files
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

// API Routes - Use consolidated routes that include all endpoints
app.use('/api', apiRoutes);

// Serve frontend static files in production
if (NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, 'public');
  console.log('📂 Frontend path:', frontendPath);

  // Serve static files (JS, CSS, images, etc.)
  app.use(express.static(frontendPath, { maxAge: '1d' }));

  // SPA fallback - serve index.html for all non-API, non-static routes
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }

    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ Error serving index.html:', err);
        next(err);
      }
    });
  });
}

// Error handling middleware (must be last)
app.use(notFound);
app.use(sentryErrorHandler); // Capture errors in Sentry before handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  stopCronJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  stopCronJobs();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NeurallEmpire Backend running on port ${PORT}`);
  console.log(`📱 Environment: ${NODE_ENV}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);

  if (NODE_ENV === 'development') {
    console.log(`📊 Prisma Studio: npx prisma studio`);
  }

  // Start cron jobs for auto-renewals and scheduled tasks
  startCronJobs();
});

export default app;