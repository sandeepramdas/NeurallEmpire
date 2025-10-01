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

// Import routes
import authRoutes from '@/routes/auth';
import organizationRoutes from '@/routes/organizations';
import userRoutes from '@/routes/users';
import agentRoutes from '@/routes/agents';
import swarmRoutes from '@/routes/swarms';
import campaignRoutes from '@/routes/campaigns';
import analyticsRoutes from '@/routes/analytics';
import subdomainRoutes from '@/routes/subdomain';
import webhookRoutes from '@/routes/webhooks';
import paymentRoutes from '@/routes/payments';
import oauthRoutes from '@/routes/oauth';

dotenv.config();

const app: Application = express();
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
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration - Restrictive for production
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

    // In development, allow any origin for testing
    if (NODE_ENV === 'development') {
      console.log('🌐 CORS Request from origin:', origin);
      return callback(null, true);
    }

    // Production: Allow requests without origin (health checks, direct browser access)
    if (!origin) {
      return callback(null, true);
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/swarms', swarmRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subdomain', subdomainRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payments', paymentRoutes);

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
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
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
});

export default app;