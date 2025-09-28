const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

// Helper function to create auth response
const createAuthResponse = (user) => {
    const token = generateToken(user);

    // Remove sensitive information
    const userResponse = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company,
        subscription: user.subscription,
        socialAuth: {
            providers: user.socialAuth?.providers || [],
            profilePicture: user.socialAuth?.profilePicture
        },
        registrationSource: user.registrationSource,
        lastLoginAt: user.lastLoginAt,
        token: token
    };

    return {
        success: true,
        message: 'Authentication successful',
        data: {
            user: userResponse,
            token: token
        }
    };
};

// Helper function to handle OAuth success
const handleOAuthSuccess = (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
        }

        const authResponse = createAuthResponse(req.user);

        // For web browser, redirect with token in URL (will be handled by frontend)
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${authResponse.data.token}&user=${encodeURIComponent(JSON.stringify(authResponse.data.user))}`;

        res.redirect(redirectUrl);

    } catch (error) {
        console.error('OAuth success handler error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication processing failed`);
    }
};

// Helper function to handle OAuth failure
const handleOAuthFailure = (err, req, res, next) => {
    console.error('OAuth failure:', err);
    const errorMessage = err.message || 'Authentication failed';
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(errorMessage)}`);
};

// Google OAuth Routes
// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
// @access  Public
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/auth/failure',
        session: false
    }),
    handleOAuthSuccess
);

// Facebook OAuth Routes
// @desc    Initiate Facebook OAuth
// @route   GET /api/auth/facebook
// @access  Public
router.get('/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));

// @desc    Facebook OAuth callback
// @route   GET /api/auth/facebook/callback
// @access  Public
router.get('/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/api/auth/failure',
        session: false
    }),
    handleOAuthSuccess
);

// GitHub OAuth Routes
// @desc    Initiate GitHub OAuth
// @route   GET /api/auth/github
// @access  Public
router.get('/github', passport.authenticate('github', {
    scope: ['user:email']
}));

// @desc    GitHub OAuth callback
// @route   GET /api/auth/github/callback
// @access  Public
router.get('/github/callback',
    passport.authenticate('github', {
        failureRedirect: '/api/auth/failure',
        session: false
    }),
    handleOAuthSuccess
);

// LinkedIn OAuth Routes
// @desc    Initiate LinkedIn OAuth
// @route   GET /api/auth/linkedin
// @access  Public
router.get('/linkedin', passport.authenticate('linkedin', {
    scope: ['r_emailaddress', 'r_liteprofile']
}));

// @desc    LinkedIn OAuth callback
// @route   GET /api/auth/linkedin/callback
// @access  Public
router.get('/linkedin/callback',
    passport.authenticate('linkedin', {
        failureRedirect: '/api/auth/failure',
        session: false
    }),
    handleOAuthSuccess
);

// OAuth failure route
// @desc    Handle OAuth failures
// @route   GET /api/auth/failure
// @access  Public
router.get('/failure', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
});

// Link social account to existing account
// @desc    Link social account
// @route   POST /api/auth/link-account
// @access  Private
router.post('/link-account', protect, async (req, res) => {
    try {
        const { provider, action } = req.body;

        if (!provider || !['google', 'facebook', 'github', 'linkedin'].includes(provider)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid provider specified'
            });
        }

        if (action === 'link') {
            // Store user ID in session and redirect to OAuth
            req.session.linkAccountUserId = req.user._id;

            const authUrl = `/api/auth/${provider}?link=true`;
            return res.json({
                success: true,
                message: 'Redirect to social provider',
                data: {
                    authUrl: authUrl
                }
            });

        } else if (action === 'unlink') {
            // Unlink social account
            const user = req.user;

            if (!user.socialAuth || !user.socialAuth.providers.includes(provider)) {
                return res.status(400).json({
                    success: false,
                    error: 'Account is not linked to this provider'
                });
            }

            // Remove provider from user's social auth
            user.socialAuth.providers = user.socialAuth.providers.filter(p => p !== provider);

            // Remove provider-specific ID
            switch (provider) {
                case 'google':
                    user.socialAuth.googleId = undefined;
                    break;
                case 'facebook':
                    user.socialAuth.facebookId = undefined;
                    break;
                case 'github':
                    user.socialAuth.githubId = undefined;
                    break;
                case 'linkedin':
                    user.socialAuth.linkedinId = undefined;
                    break;
            }

            await user.save();

            res.json({
                success: true,
                message: `${provider} account unlinked successfully`,
                data: {
                    providers: user.socialAuth.providers
                }
            });
        }

    } catch (error) {
        console.error('Link account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to link/unlink account'
        });
    }
});

// Get linked accounts
// @desc    Get user's linked social accounts
// @route   GET /api/auth/linked-accounts
// @access  Private
router.get('/linked-accounts', protect, async (req, res) => {
    try {
        const user = req.user;

        const linkedAccounts = {
            google: !!user.socialAuth?.googleId,
            facebook: !!user.socialAuth?.facebookId,
            github: !!user.socialAuth?.githubId,
            linkedin: !!user.socialAuth?.linkedinId
        };

        res.json({
            success: true,
            data: {
                linkedAccounts,
                providers: user.socialAuth?.providers || [],
                profilePicture: user.socialAuth?.profilePicture,
                registrationSource: user.registrationSource
            }
        });

    } catch (error) {
        console.error('Get linked accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch linked accounts'
        });
    }
});

// Mobile app OAuth token exchange
// @desc    Exchange OAuth code for JWT token (for mobile apps)
// @route   POST /api/auth/oauth/token
// @access  Public
router.post('/oauth/token', async (req, res) => {
    try {
        const { provider, accessToken, userData } = req.body;

        if (!provider || !accessToken || !userData) {
            return res.status(400).json({
                success: false,
                error: 'Missing required OAuth data'
            });
        }

        // Verify the access token with the provider (implementation depends on provider)
        // For now, we'll trust the client verification

        // Find or create user based on OAuth data
        const User = require('../models/User');
        let user;

        // Check if user exists with provider ID
        const providerIdField = `socialAuth.${provider}Id`;
        user = await User.findOne({ [providerIdField]: userData.id });

        if (!user && userData.email) {
            // Check if user exists with email
            user = await User.findOne({ email: userData.email });

            if (user) {
                // Link the OAuth account
                user.socialAuth = user.socialAuth || {};
                user.socialAuth[`${provider}Id`] = userData.id;
                user.socialAuth.providers = user.socialAuth.providers || [];

                if (!user.socialAuth.providers.includes(provider)) {
                    user.socialAuth.providers.push(provider);
                }

                await user.save();
            }
        }

        if (!user) {
            // Create new user
            user = new User({
                firstName: userData.firstName || userData.given_name || 'User',
                lastName: userData.lastName || userData.family_name || '',
                email: userData.email,
                password: Math.random().toString(36).slice(-8),
                isEmailVerified: true,
                socialAuth: {
                    [`${provider}Id`]: userData.id,
                    providers: [provider],
                    profilePicture: userData.picture || userData.avatar_url
                },
                registrationSource: provider,
                lastLoginAt: new Date()
            });

            await user.save();
        } else {
            user.lastLoginAt = new Date();
            await user.save();
        }

        const authResponse = createAuthResponse(user);

        res.json(authResponse);

    } catch (error) {
        console.error('OAuth token exchange error:', error);
        res.status(500).json({
            success: false,
            error: 'OAuth token exchange failed'
        });
    }
});

module.exports = router;