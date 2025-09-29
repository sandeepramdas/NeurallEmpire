const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const socialAuthRoutes = require('./routes/social-auth');

// Import database connection
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "checkout.razorpay.com", "js.stripe.com"],
            connectSrc: ["'self'", "api.razorpay.com", "api.stripe.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 * 1000
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60 * 1000
    }
});

app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:8000',
            'http://localhost:3000',
            'https://www.neurallempire.com',
            'https://neurallempire.com'
        ];

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware (required for OAuth)
app.use(session({
    secret: process.env.SESSION_SECRET || 'neurall-empire-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: require('./package.json').version
    });
});

// Webhook routes (before other middleware that might interfere)
app.use('/api/webhooks', webhookRoutes);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'NeurallEmpire API v1.0',
        documentation: 'https://docs.neurallempire.com/api',
        endpoints: {
            auth: '/api/auth',
            contact: '/api/contact',
            payments: '/api/payments',
            health: '/health'
        },
        version: '1.0.0',
        status: 'active'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: errors
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            error: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired'
        });
    }

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS: Origin not allowed'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        availableRoutes: [
            'GET /api',
            'GET /health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/contact',
            'POST /api/payments/create-intent'
        ]
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 NeurallEmpire Backend Server Started
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Port: ${PORT}
📡 API: http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/health
📚 Docs: http://localhost:${PORT}/api
    `);
});

module.exports = app;