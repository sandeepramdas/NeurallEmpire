import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

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
import subdomainRoutes from '@/routes/subdomains';
import webhookRoutes from '@/routes/webhooks';
import paymentRoutes from '@/routes/payments';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
    },
  },
}));

// CORS configuration
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

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    // Allow subdomain pattern *.neurallempire.com
    if (origin.endsWith('.neurallempire.com')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/swarms', swarmRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subdomains', subdomainRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payments', paymentRoutes);

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