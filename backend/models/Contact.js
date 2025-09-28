const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    // Contact Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
    },
    company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },

    // Budget and Requirements
    budget: {
        type: String,
        trim: true
    },
    budgetRange: {
        type: String,
        enum: ['under-600', '600-1200', '1200-2400', '2400-5000', '5000+', 'not-specified'],
        default: 'not-specified'
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },

    // Lead Classification
    leadSource: {
        type: String,
        enum: ['website', 'social', 'email', 'referral', 'direct', 'advertisement'],
        default: 'website'
    },
    leadType: {
        type: String,
        enum: ['inquiry', 'consultation', 'support', 'partnership', 'other'],
        default: 'inquiry'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    leadScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },

    // User Association
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isLoggedInUser: {
        type: Boolean,
        default: false
    },

    // Status and Processing
    status: {
        type: String,
        enum: ['new', 'contacted', 'qualified', 'converted', 'closed', 'spam'],
        default: 'new'
    },
    isProcessed: {
        type: Boolean,
        default: false
    },
    processedAt: Date,
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Follow-up Information
    followUpRequired: {
        type: Boolean,
        default: true
    },
    followUpDate: Date,
    lastContactedAt: Date,
    contactAttempts: {
        type: Number,
        default: 0
    },

    // Technical Information
    ipAddress: String,
    userAgent: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,

    // Geolocation
    location: {
        country: String,
        region: String,
        city: String,
        timezone: String
    },

    // Email Integration
    emailSent: {
        type: Boolean,
        default: false
    },
    emailSentAt: Date,
    emailTemplate: String,
    emailDelivered: {
        type: Boolean,
        default: false
    },
    emailOpened: {
        type: Boolean,
        default: false
    },
    emailClicked: {
        type: Boolean,
        default: false
    },

    // Notes and Communication History
    notes: [{
        content: {
            type: String,
            required: true,
            maxlength: [1000, 'Note cannot exceed 1000 characters']
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['call', 'email', 'meeting', 'note', 'follow-up'],
            default: 'note'
        }
    }],

    // Tags and Categories
    tags: [String],
    category: {
        type: String,
        enum: ['enterprise', 'smb', 'startup', 'individual', 'agency', 'other'],
        default: 'other'
    },

    // Conversion Tracking
    convertedToSale: {
        type: Boolean,
        default: false
    },
    conversionDate: Date,
    conversionValue: Number,
    conversionPlan: String,

    // Quality Metrics
    responseTime: Number, // Time to first response in minutes
    resolutionTime: Number, // Time to resolution in minutes
    satisfactionScore: {
        type: Number,
        min: 1,
        max: 5
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ leadScore: -1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ userId: 1 });
contactSchema.index({ leadSource: 1 });

// Compound indexes
contactSchema.index({ status: 1, priority: 1 });
contactSchema.index({ isProcessed: 1, createdAt: -1 });

// Virtual for urgency level
contactSchema.virtual('urgencyLevel').get(function() {
    const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);

    if (this.priority === 'urgent' || (this.priority === 'high' && hoursSinceCreation > 2)) {
        return 'critical';
    } else if (this.priority === 'high' || hoursSinceCreation > 24) {
        return 'high';
    } else if (hoursSinceCreation > 72) {
        return 'medium';
    } else {
        return 'low';
    }
});

// Virtual for days since creation
contactSchema.virtual('daysSinceCreation').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate lead score
contactSchema.pre('save', function(next) {
    if (this.isNew || this.isModified(['budget', 'company', 'phone', 'message'])) {
        this.calculateLeadScore();
    }
    next();
});

// Pre-save middleware to set follow-up date
contactSchema.pre('save', function(next) {
    if (this.isNew && !this.followUpDate) {
        // Set follow-up date based on priority
        const hours = {
            'urgent': 2,
            'high': 4,
            'medium': 24,
            'low': 72
        };

        this.followUpDate = new Date(Date.now() + (hours[this.priority] || 24) * 60 * 60 * 1000);
    }
    next();
});

// Instance method to calculate lead score
contactSchema.methods.calculateLeadScore = function() {
    let score = 50; // Base score

    // Budget scoring
    if (this.budget) {
        const budgetValue = parseInt(this.budget.replace(/[^\d]/g, ''));
        if (budgetValue >= 2400) score += 30;
        else if (budgetValue >= 1200) score += 20;
        else if (budgetValue >= 600) score += 10;
    }

    // Company provided
    if (this.company && this.company.trim()) score += 15;

    // Phone provided
    if (this.phone && this.phone.trim()) score += 10;

    // Message length and quality
    if (this.message && this.message.length > 50) score += 5;
    if (this.message && this.message.toLowerCase().includes('urgent')) score += 10;

    // User association
    if (this.isLoggedInUser) score += 20;

    // Set priority based on score
    if (score >= 90) this.priority = 'urgent';
    else if (score >= 75) this.priority = 'high';
    else if (score >= 60) this.priority = 'medium';
    else this.priority = 'low';

    this.leadScore = Math.min(score, 100);
};

// Instance method to add note
contactSchema.methods.addNote = function(content, type = 'note', createdBy = null) {
    this.notes.push({
        content: content,
        type: type,
        createdBy: createdBy,
        createdAt: new Date()
    });
    return this.save();
};

// Instance method to mark as processed
contactSchema.methods.markAsProcessed = function(processedBy = null) {
    this.isProcessed = true;
    this.processedAt = new Date();
    this.processedBy = processedBy;
    this.status = 'contacted';
    return this.save();
};

// Instance method to schedule follow-up
contactSchema.methods.scheduleFollowUp = function(date) {
    this.followUpDate = date;
    this.followUpRequired = true;
    return this.save();
};

// Static method to get leads by priority
contactSchema.statics.getByPriority = function(priority) {
    return this.find({
        priority: priority,
        status: { $in: ['new', 'contacted'] }
    }).sort({ createdAt: -1 });
};

// Static method to get overdue follow-ups
contactSchema.statics.getOverdueFollowUps = function() {
    return this.find({
        followUpRequired: true,
        followUpDate: { $lt: new Date() },
        status: { $in: ['new', 'contacted', 'qualified'] }
    }).sort({ followUpDate: 1 });
};

// Static method to get lead statistics
contactSchema.statics.getLeadStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgScore: { $avg: '$leadScore' }
            }
        }
    ]);

    const priorityStats = await this.aggregate([
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);

    return { statusStats: stats, priorityStats };
};

module.exports = mongoose.model('Contact', contactSchema);