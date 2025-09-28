const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Payment Identification
    paymentId: {
        type: String,
        required: [true, 'Payment ID is required'],
        unique: true,
        trim: true
    },
    orderId: {
        type: String,
        required: [true, 'Order ID is required'],
        unique: true,
        trim: true
    },
    signature: {
        type: String,
        required: [true, 'Payment signature is required']
    },

    // User and Plan Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    plan: {
        type: String,
        required: [true, 'Plan is required'],
        enum: ['conqueror', 'emperor', 'overlord'],
        trim: true
    },
    planDetails: {
        name: String,
        description: String,
        features: [String],
        agentCount: Number
    },

    // Amount and Currency
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        default: 'USD',
        enum: ['USD', 'INR', 'EUR', 'GBP'],
        uppercase: true
    },
    originalAmount: Number, // Original amount before any discounts
    discountAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discount amount cannot be negative']
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: [0, 'Tax amount cannot be negative']
    },

    // Payment Gateway Information
    gateway: {
        type: String,
        required: [true, 'Payment gateway is required'],
        enum: ['razorpay', 'stripe', 'paypal', 'manual'],
        default: 'razorpay'
    },
    gatewayPaymentId: String, // Gateway specific payment ID
    gatewayOrderId: String,   // Gateway specific order ID
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
        select: false // Don't include in queries by default
    },

    // Payment Status
    status: {
        type: String,
        required: [true, 'Payment status is required'],
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'crypto', 'other'],
        default: 'card'
    },

    // Customer Information
    customerInfo: {
        name: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Customer email is required'],
            lowercase: true,
            trim: true
        },
        phone: String,
        company: String
    },

    // Billing Information
    billingAddress: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
    },

    // Subscription Information
    subscription: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        interval: {
            type: String,
            enum: ['monthly', 'quarterly', 'annually', 'one-time'],
            default: 'monthly'
        },
        startDate: Date,
        endDate: Date,
        nextBillingDate: Date,
        subscriptionId: String
    },

    // Dates and Timing
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    expiresAt: Date,

    // Refund Information
    refund: {
        amount: {
            type: Number,
            default: 0,
            min: [0, 'Refund amount cannot be negative']
        },
        reason: String,
        refundId: String,
        refundedAt: Date,
        refundedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['none', 'pending', 'processed', 'failed'],
            default: 'none'
        }
    },

    // Discount and Coupon Information
    coupon: {
        code: String,
        description: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed', 'none'],
            default: 'none'
        },
        discountValue: Number,
        appliedAmount: Number
    },

    // Technical Information
    ipAddress: String,
    userAgent: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Fraud Detection
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    fraudFlags: [String],
    isManualReview: {
        type: Boolean,
        default: false
    },

    // Invoice Information
    invoice: {
        number: String,
        url: String,
        sentAt: Date,
        downloadCount: {
            type: Number,
            default: 0
        }
    },

    // Webhook Information
    webhookProcessed: {
        type: Boolean,
        default: false
    },
    webhookAttempts: {
        type: Number,
        default: 0
    },
    webhookLastAttempt: Date,

    // Notes and Communication
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
            enum: ['payment', 'refund', 'dispute', 'general'],
            default: 'general'
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gateway: 1 });
paymentSchema.index({ plan: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'subscription.nextBillingDate': 1 });

// Compound indexes
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ gateway: 1, status: 1 });

// Virtual for net amount (after discounts and before taxes)
paymentSchema.virtual('netAmount').get(function() {
    return this.amount - this.discountAmount;
});

// Virtual for total amount (including taxes)
paymentSchema.virtual('totalAmount').get(function() {
    return this.amount + this.taxAmount;
});

// Virtual for refund status
paymentSchema.virtual('isRefunded').get(function() {
    return this.refund.status === 'processed' && this.refund.amount > 0;
});

// Virtual for subscription status
paymentSchema.virtual('isSubscriptionActive').get(function() {
    return this.subscription.isRecurring &&
           this.status === 'completed' &&
           this.subscription.endDate > new Date();
});

// Pre-save middleware to set payment dates
paymentSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        const now = new Date();

        switch (this.status) {
            case 'completed':
                if (!this.paidAt) this.paidAt = now;
                break;
            case 'failed':
                if (!this.failedAt) this.failedAt = now;
                break;
            case 'refunded':
                if (!this.refundedAt) this.refundedAt = now;
                break;
        }
    }

    // Set subscription dates for recurring payments
    if (this.subscription.isRecurring && this.status === 'completed' && this.isNew) {
        this.subscription.startDate = new Date();

        // Calculate end date based on interval
        const intervalDays = {
            'monthly': 30,
            'quarterly': 90,
            'annually': 365
        };

        const days = intervalDays[this.subscription.interval] || 30;
        this.subscription.endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        this.subscription.nextBillingDate = new Date(this.subscription.endDate);
    }

    next();
});

// Instance method to mark as completed
paymentSchema.methods.markAsCompleted = function(gatewayResponse = null) {
    this.status = 'completed';
    this.paidAt = new Date();
    if (gatewayResponse) {
        this.gatewayResponse = gatewayResponse;
    }
    return this.save();
};

// Instance method to mark as failed
paymentSchema.methods.markAsFailed = function(reason = null) {
    this.status = 'failed';
    this.failedAt = new Date();
    if (reason) {
        this.addNote(reason, 'payment');
    }
    return this.save();
};

// Instance method to process refund
paymentSchema.methods.processRefund = function(amount, reason, refundId, refundedBy) {
    this.refund = {
        amount: amount,
        reason: reason,
        refundId: refundId,
        refundedAt: new Date(),
        refundedBy: refundedBy,
        status: 'processed'
    };

    if (amount >= this.amount) {
        this.status = 'refunded';
        this.refundedAt = new Date();
    }

    return this.save();
};

// Instance method to add note
paymentSchema.methods.addNote = function(content, type = 'general', createdBy = null) {
    this.notes.push({
        content: content,
        type: type,
        createdBy: createdBy,
        createdAt: new Date()
    });
    return this.save();
};

// Instance method to generate invoice number
paymentSchema.methods.generateInvoiceNumber = function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);

    this.invoice.number = `NE-${year}${month}-${timestamp}`;
    return this.invoice.number;
};

// Static method to get revenue statistics
paymentSchema.statics.getRevenueStats = async function(startDate, endDate) {
    const matchStage = {
        status: 'completed',
        paidAt: {
            $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lte: endDate || new Date()
        }
    };

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalTransactions: { $sum: 1 },
                avgTransactionValue: { $avg: '$amount' },
                totalTax: { $sum: '$taxAmount' },
                totalRefunds: { $sum: '$refund.amount' }
            }
        }
    ]);

    const planStats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$plan',
                revenue: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        overall: stats[0] || {
            totalRevenue: 0,
            totalTransactions: 0,
            avgTransactionValue: 0,
            totalTax: 0,
            totalRefunds: 0
        },
        byPlan: planStats
    };
};

// Static method to get payments requiring renewal
paymentSchema.statics.getUpcomingRenewals = function(days = 7) {
    const upcomingDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return this.find({
        'subscription.isRecurring': true,
        'subscription.nextBillingDate': {
            $gte: new Date(),
            $lte: upcomingDate
        },
        status: 'completed'
    }).populate('userId', 'firstName lastName email');
};

// Static method to get failed payments for retry
paymentSchema.statics.getFailedPaymentsForRetry = function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.find({
        status: 'failed',
        failedAt: { $gte: oneDayAgo },
        webhookAttempts: { $lt: 3 }
    }).populate('userId', 'firstName lastName email');
};

module.exports = mongoose.model('Payment', paymentSchema);