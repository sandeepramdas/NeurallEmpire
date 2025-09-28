const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes - requires valid JWT token
const protect = async (req, res, next) => {
    let token;

    try {
        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check for token in cookies (if using cookie-based auth)
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Token is valid but user no longer exists'
            });
        }

        // Check if user account is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account is not active. Please contact support.'
            });
        }

        // Add user to request object
        req.user = user;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Not authorized'
        });
    }
};

// Middleware to check for specific roles (admin, user, etc.)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        if (!roles.includes(req.user.role || 'user')) {
            return res.status(403).json({
                success: false,
                error: `User role '${req.user.role || 'user'}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Middleware to check subscription status
const requireSubscription = (...allowedPlans) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Allow access if no specific plans are required
        if (allowedPlans.length === 0) {
            return next();
        }

        const userPlan = req.user.subscription?.plan || 'none';

        if (!allowedPlans.includes(userPlan)) {
            return res.status(403).json({
                success: false,
                error: 'This feature requires a subscription upgrade',
                requiredPlans: allowedPlans,
                currentPlan: userPlan
            });
        }

        // Check if subscription is active
        if (req.user.subscription?.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Subscription is not active',
                subscriptionStatus: req.user.subscription?.status || 'none'
            });
        }

        // Check if subscription hasn't expired
        if (req.user.subscription?.endDate && new Date() > req.user.subscription.endDate) {
            return res.status(403).json({
                success: false,
                error: 'Subscription has expired',
                expiredDate: req.user.subscription.endDate
            });
        }

        next();
    };
};

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    let token;

    try {
        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database
            const user = await User.findById(decoded.id).select('-password');

            if (user && user.status === 'active') {
                req.user = user;
            }
        }

        next();

    } catch (error) {
        // If token is invalid, just continue without user
        console.log('Optional auth failed (continuing without user):', error.message);
        next();
    }
};

// Middleware to check if user owns resource
const checkOwnership = (resourceIdField = 'userId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            // Get resource ID from request parameters or body
            const resourceId = req.params.id || req.body.id;

            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    error: 'Resource ID is required'
                });
            }

            // This will be used by the route handler to check ownership
            req.resourceIdField = resourceIdField;
            next();

        } catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Error checking resource ownership'
            });
        }
    };
};

// Middleware to log user activity
const logActivity = (action) => {
    return (req, res, next) => {
        if (req.user) {
            // Log user activity (you can implement this based on your logging system)
            console.log(`User ${req.user.id} performed action: ${action} at ${new Date().toISOString()}`);

            // Update last activity timestamp
            req.user.lastLogin = new Date();
            req.user.save().catch(err => console.error('Error updating last activity:', err));
        }

        next();
    };
};

// Middleware to check email verification
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'User not authenticated'
        });
    }

    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            error: 'Email verification required',
            action: 'verify-email'
        });
    }

    next();
};

// Middleware to handle API key authentication (for external integrations)
const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key is required'
            });
        }

        // Validate API key (implement your API key validation logic)
        // This is a simple example - in production, store hashed API keys in database
        const validApiKeys = (process.env.API_KEYS || '').split(',');

        if (!validApiKeys.includes(apiKey)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        // Add API key info to request
        req.apiKey = apiKey;
        req.isApiRequest = true;

        next();

    } catch (error) {
        console.error('API key auth error:', error);
        return res.status(401).json({
            success: false,
            error: 'API key authentication failed'
        });
    }
};

module.exports = {
    protect,
    authorize,
    requireSubscription,
    optionalAuth,
    checkOwnership,
    logActivity,
    requireEmailVerification,
    apiKeyAuth
};