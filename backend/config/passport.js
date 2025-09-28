const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await User.findOne({ 'socialAuth.googleId': profile.id });

            if (user) {
                // User exists, update last login
                user.lastLoginAt = new Date();
                await user.save();
                return done(null, user);
            }

            // Check if user exists with same email
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                // Link Google account to existing user
                user.socialAuth = user.socialAuth || {};
                user.socialAuth.googleId = profile.id;
                user.socialAuth.providers = user.socialAuth.providers || [];

                if (!user.socialAuth.providers.includes('google')) {
                    user.socialAuth.providers.push('google');
                }

                user.lastLoginAt = new Date();
                await user.save();
                return done(null, user);
            }

            // Create new user
            const newUser = new User({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-8), // Random password
                isEmailVerified: true, // Email verified by Google
                socialAuth: {
                    googleId: profile.id,
                    providers: ['google'],
                    profilePicture: profile.photos[0]?.value
                },
                registrationSource: 'google',
                lastLoginAt: new Date()
            });

            await newUser.save();
            done(null, newUser);

        } catch (error) {
            console.error('Google OAuth error:', error);
            done(error, null);
        }
    }));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: '/api/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'picture.type(large)']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Facebook ID
            let user = await User.findOne({ 'socialAuth.facebookId': profile.id });

            if (user) {
                user.lastLoginAt = new Date();
                await user.save();
                return done(null, user);
            }

            // Check if user exists with same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne({ email: email });

                if (user) {
                    // Link Facebook account to existing user
                    user.socialAuth = user.socialAuth || {};
                    user.socialAuth.facebookId = profile.id;
                    user.socialAuth.providers = user.socialAuth.providers || [];

                    if (!user.socialAuth.providers.includes('facebook')) {
                        user.socialAuth.providers.push('facebook');
                    }

                    user.lastLoginAt = new Date();
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            if (!email) {
                return done(new Error('No email provided by Facebook'), null);
            }

            const newUser = new User({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: email,
                password: Math.random().toString(36).slice(-8),
                isEmailVerified: true,
                socialAuth: {
                    facebookId: profile.id,
                    providers: ['facebook'],
                    profilePicture: profile.photos[0]?.value
                },
                registrationSource: 'facebook',
                lastLoginAt: new Date()
            });

            await newUser.save();
            done(null, newUser);

        } catch (error) {
            console.error('Facebook OAuth error:', error);
            done(error, null);
        }
    }));
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this GitHub ID
            let user = await User.findOne({ 'socialAuth.githubId': profile.id });

            if (user) {
                user.lastLoginAt = new Date();
                await user.save();
                return done(null, user);
            }

            // Check if user exists with same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne({ email: email });

                if (user) {
                    // Link GitHub account to existing user
                    user.socialAuth = user.socialAuth || {};
                    user.socialAuth.githubId = profile.id;
                    user.socialAuth.providers = user.socialAuth.providers || [];

                    if (!user.socialAuth.providers.includes('github')) {
                        user.socialAuth.providers.push('github');
                    }

                    user.lastLoginAt = new Date();
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            if (!email) {
                return done(new Error('No email provided by GitHub'), null);
            }

            const [firstName, ...lastNameParts] = (profile.displayName || profile.username || 'User').split(' ');

            const newUser = new User({
                firstName: firstName,
                lastName: lastNameParts.join(' ') || 'GitHub',
                email: email,
                password: Math.random().toString(36).slice(-8),
                isEmailVerified: true,
                socialAuth: {
                    githubId: profile.id,
                    providers: ['github'],
                    profilePicture: profile.photos[0]?.value
                },
                registrationSource: 'github',
                lastLoginAt: new Date()
            });

            await newUser.save();
            done(null, newUser);

        } catch (error) {
            console.error('GitHub OAuth error:', error);
            done(error, null);
        }
    }));
}

// LinkedIn OAuth Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: '/api/auth/linkedin/callback',
        scope: ['r_emailaddress', 'r_liteprofile']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this LinkedIn ID
            let user = await User.findOne({ 'socialAuth.linkedinId': profile.id });

            if (user) {
                user.lastLoginAt = new Date();
                await user.save();
                return done(null, user);
            }

            // Check if user exists with same email
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne({ email: email });

                if (user) {
                    // Link LinkedIn account to existing user
                    user.socialAuth = user.socialAuth || {};
                    user.socialAuth.linkedinId = profile.id;
                    user.socialAuth.providers = user.socialAuth.providers || [];

                    if (!user.socialAuth.providers.includes('linkedin')) {
                        user.socialAuth.providers.push('linkedin');
                    }

                    user.lastLoginAt = new Date();
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            if (!email) {
                return done(new Error('No email provided by LinkedIn'), null);
            }

            const newUser = new User({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: email,
                password: Math.random().toString(36).slice(-8),
                isEmailVerified: true,
                socialAuth: {
                    linkedinId: profile.id,
                    providers: ['linkedin'],
                    profilePicture: profile.photos[0]?.value
                },
                registrationSource: 'linkedin',
                lastLoginAt: new Date()
            });

            await newUser.save();
            done(null, newUser);

        } catch (error) {
            console.error('LinkedIn OAuth error:', error);
            done(error, null);
        }
    }));
}

module.exports = passport;