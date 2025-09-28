const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
        match: [/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't include password in queries by default
    },

    // Company Information
    company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    jobTitle: {
        type: String,
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-1000', '1000+', 'not-specified'],
        default: 'not-specified'
    },

    // Contact Information
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
    },
    country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country name cannot exceed 50 characters']
    },

    // Account Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'active'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Subscription Information
    subscription: {
        plan: {
            type: String,
            enum: ['none', 'conqueror', 'emperor', 'overlord'],
            default: 'none'
        },
        status: {
            type: String,
            enum: ['none', 'active', 'cancelled', 'expired', 'trial'],
            default: 'none'
        },
        startDate: Date,
        endDate: Date,
        paymentId: String,
        amount: Number
    },

    // Marketing Preferences
    newsletter: {
        type: Boolean,
        default: false
    },
    marketingEmails: {
        type: Boolean,
        default: true
    },
    smsUpdates: {
        type: Boolean,
        default: false
    },

    // Analytics & Tracking
    lastLogin: Date,
    loginCount: {
        type: Number,
        default: 0
    },
    ipAddress: String,
    userAgent: String,
    referralSource: String,

    // Lead Scoring
    leadScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    leadSource: {
        type: String,
        enum: ['website', 'social', 'email', 'referral', 'direct', 'other'],
        default: 'website'
    },

    // Profile Image
    avatar: {
        public_id: String,
        url: String
    },

    // Social Authentication
    socialAuth: {
        googleId: String,
        facebookId: String,
        githubId: String,
        linkedinId: String,
        providers: [{
            type: String,
            enum: ['google', 'facebook', 'github', 'linkedin']
        }],
        profilePicture: String
    },

    // Registration source tracking
    registrationSource: {
        type: String,
        enum: ['website', 'google', 'facebook', 'github', 'linkedin'],
        default: 'website'
    },
    lastLoginAt: Date,

    // Settings
    settings: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'private', 'contacts'],
                default: 'private'
            },
            dataSharing: { type: Boolean, default: false }
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ leadScore: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for subscription status check
userSchema.virtual('hasActiveSubscription').get(function() {
    return this.subscription.status === 'active' &&
           this.subscription.endDate > new Date();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to update lead score
userSchema.pre('save', function(next) {
    if (this.isNew || this.isModified(['company', 'phone', 'subscription.plan'])) {
        this.calculateLeadScore();
    }
    next();
});

// Instance method to calculate lead score
userSchema.methods.calculateLeadScore = function() {
    let score = 50; // Base score

    // Company provided
    if (this.company && this.company.trim()) score += 15;

    // Phone provided
    if (this.phone && this.phone.trim()) score += 10;

    // Subscription plan
    switch (this.subscription.plan) {
        case 'overlord': score += 25; break;
        case 'emperor': score += 20; break;
        case 'conqueror': score += 15; break;
    }

    // Email verified
    if (this.isEmailVerified) score += 10;

    // Recent activity (logged in within last 30 days)
    if (this.lastLogin && this.lastLogin > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        score += 5;
    }

    this.leadScore = Math.min(score, 100);
};

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            plan: this.subscription.plan
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const crypto = require('crypto');

    // Generate token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to emailVerificationToken field
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    // Set expire time (24 hours)
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to passwordResetToken field
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire time (10 minutes)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Static method to find user by email verification token
userSchema.statics.findByEmailVerificationToken = function(token) {
    const crypto = require('crypto');

    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return this.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
    });
};

// Static method to find user by password reset token
userSchema.statics.findByPasswordResetToken = function(token) {
    const crypto = require('crypto');

    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return this.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });
};

module.exports = mongoose.model('User', userSchema);