const express = require('express');
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const Payment = require('../models/Payment');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Initialize payment gateways
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan configurations
const PLANS = {
    conqueror: {
        name: 'Conqueror Plan',
        description: 'Perfect for small businesses',
        price: 29.99,
        agentCount: 5,
        features: ['5 AI Agents', 'Lead Generation', 'Email Automation', 'Basic Analytics']
    },
    emperor: {
        name: 'Emperor Plan',
        description: 'Ideal for growing companies',
        price: 79.99,
        agentCount: 15,
        features: ['15 AI Agents', 'Advanced Lead Generation', 'Multi-channel Automation', 'Advanced Analytics', 'Priority Support']
    },
    overlord: {
        name: 'Overlord Plan',
        description: 'For enterprise domination',
        price: 199.99,
        agentCount: 50,
        features: ['50 AI Agents', 'Enterprise Lead Generation', 'Custom Integrations', 'White-label Solutions', 'Dedicated Account Manager']
    }
};

// Validation middleware
const createOrderValidation = [
    body('plan')
        .isIn(['conqueror', 'emperor', 'overlord'])
        .withMessage('Invalid plan selected'),
    body('currency')
        .optional()
        .isIn(['USD', 'INR', 'EUR', 'GBP'])
        .withMessage('Invalid currency'),
    body('gateway')
        .isIn(['razorpay', 'stripe'])
        .withMessage('Invalid payment gateway')
];

// @desc    Create payment order
// @route   POST /api/payments/create-order
// @access  Private
router.post('/create-order', protect, createOrderValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { plan, currency = 'USD', gateway = 'razorpay' } = req.body;
        const user = req.user;

        // Get plan details
        const planDetails = PLANS[plan];
        if (!planDetails) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan selected'
            });
        }

        // Calculate amount (convert to smallest currency unit)
        const amount = gateway === 'razorpay' && currency === 'INR'
            ? Math.round(planDetails.price * 82 * 100) // USD to INR conversion * 100 for paise
            : Math.round(planDetails.price * 100); // USD cents or other currency

        let order;
        let orderId;

        try {
            if (gateway === 'razorpay') {
                // Create Razorpay order
                order = await razorpay.orders.create({
                    amount: amount,
                    currency: currency === 'USD' ? 'INR' : currency, // Razorpay primarily uses INR
                    receipt: `order_${Date.now()}_${user._id}`,
                    notes: {
                        plan: plan,
                        userId: user._id.toString(),
                        userEmail: user.email
                    }
                });
                orderId = order.id;
            } else if (gateway === 'stripe') {
                // Create Stripe PaymentIntent
                order = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: currency.toLowerCase(),
                    metadata: {
                        plan: plan,
                        userId: user._id.toString(),
                        userEmail: user.email
                    },
                    description: `${planDetails.name} subscription for ${user.email}`
                });
                orderId = order.id;
            }
        } catch (gatewayError) {
            console.error('Payment gateway error:', gatewayError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create payment order with gateway',
                details: gatewayError.message
            });
        }

        // Create payment record in database
        const payment = await Payment.create({
            paymentId: `pay_${Date.now()}_${user._id}`,
            orderId: orderId,
            signature: '', // Will be updated during verification
            userId: user._id,
            plan: plan,
            planDetails: planDetails,
            amount: amount / 100, // Store in main currency unit
            currency: currency,
            gateway: gateway,
            gatewayOrderId: orderId,
            status: 'pending',
            customerInfo: {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: user.phone,
                company: user.company
            },
            subscription: {
                isRecurring: true,
                interval: 'monthly'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            data: {
                orderId: orderId,
                amount: amount,
                currency: currency,
                gateway: gateway,
                planDetails: planDetails,
                paymentId: payment._id,
                // Gateway-specific data
                ...(gateway === 'razorpay' && {
                    key: process.env.RAZORPAY_KEY_ID,
                    name: 'NeurallEmpire',
                    description: planDetails.description,
                    image: 'https://neurallempire.com/assets/images/logo.png',
                    prefill: {
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        contact: user.phone
                    },
                    theme: {
                        color: '#6366f1'
                    }
                }),
                ...(gateway === 'stripe' && {
                    clientSecret: order.client_secret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
                })
            }
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment order',
            details: error.message
        });
    }
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
    try {
        const { paymentId, orderId, signature, gateway } = req.body;

        if (!paymentId || !orderId || !gateway) {
            return res.status(400).json({
                success: false,
                error: 'Missing required payment verification data'
            });
        }

        // Find payment record
        const payment = await Payment.findOne({
            gatewayOrderId: orderId,
            userId: req.user._id
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment record not found'
            });
        }

        let isValidPayment = false;

        try {
            if (gateway === 'razorpay') {
                // Verify Razorpay payment signature
                const expectedSignature = crypto
                    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                    .update(`${orderId}|${paymentId}`)
                    .digest('hex');

                isValidPayment = expectedSignature === signature;
            } else if (gateway === 'stripe') {
                // Retrieve payment intent from Stripe
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
                isValidPayment = paymentIntent.status === 'succeeded';
            }
        } catch (verificationError) {
            console.error('Payment verification error:', verificationError);
            return res.status(500).json({
                success: false,
                error: 'Payment verification failed',
                details: verificationError.message
            });
        }

        if (isValidPayment) {
            // Update payment status
            payment.status = 'completed';
            payment.signature = signature;
            payment.gatewayPaymentId = paymentId;
            payment.paidAt = new Date();
            await payment.save();

            // Update user subscription
            const user = await User.findById(req.user._id);
            user.subscription = {
                plan: payment.plan,
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                paymentId: payment._id,
                amount: payment.amount
            };
            await user.save();

            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    paymentId: payment._id,
                    plan: payment.plan,
                    status: payment.status,
                    subscription: user.subscription
                }
            });
        } else {
            // Mark payment as failed
            payment.status = 'failed';
            payment.failedAt = new Date();
            await payment.save();

            res.status(400).json({
                success: false,
                error: 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment verification failed',
            details: error.message
        });
    }
});

// @desc    Get user payments
// @route   GET /api/payments/my-payments
// @access  Private
router.get('/my-payments', protect, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = { userId: req.user._id };
        if (status) {
            query.status = status;
        }

        const payments = await Payment.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-gatewayResponse -signature');

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            data: {
                payments,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payments'
        });
    }
});

// @desc    Get available plans
// @route   GET /api/payments/plans
// @access  Public
router.get('/plans', async (req, res) => {
    try {
        res.json({
            success: true,
            data: PLANS
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plans'
        });
    }
});

// @desc    Cancel subscription
// @route   POST /api/payments/cancel-subscription
// @access  Private
router.post('/cancel-subscription', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.subscription || user.subscription.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'No active subscription found'
            });
        }

        // Update user subscription status
        user.subscription.status = 'cancelled';
        await user.save();

        // Find and update the payment record
        if (user.subscription.paymentId) {
            await Payment.findByIdAndUpdate(user.subscription.paymentId, {
                'subscription.isRecurring': false,
                status: 'cancelled'
            });
        }

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            data: {
                subscription: user.subscription
            }
        });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel subscription'
        });
    }
});

// @desc    Get user subscription details
// @route   GET /api/payments/subscription
// @access  Private
router.get('/subscription', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            success: true,
            data: {
                subscription: user.subscription || null,
                hasActiveSubscription: user.subscription && user.subscription.status === 'active'
            }
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscription details'
        });
    }
});

// @desc    Upgrade/Downgrade subscription
// @route   POST /api/payments/change-plan
// @access  Private
router.post('/change-plan', protect, async (req, res) => {
    try {
        const { newPlan } = req.body;

        if (!newPlan || !PLANS[newPlan]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan selected'
            });
        }

        const user = await User.findById(req.user._id);

        if (!user.subscription || user.subscription.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'No active subscription to modify'
            });
        }

        const currentPlan = user.subscription.plan;
        const newPlanDetails = PLANS[newPlan];

        // Check if it's actually a change
        if (currentPlan === newPlan) {
            return res.status(400).json({
                success: false,
                error: 'Already subscribed to this plan'
            });
        }

        // For plan changes, create a new payment order
        // This is a simplified version - in production you'd handle proration
        const planChangeData = {
            plan: newPlan,
            amount: newPlanDetails.price * 100,
            currency: 'USD',
            gateway: 'razorpay'
        };

        res.json({
            success: true,
            message: 'Plan change initiated. Please complete payment.',
            data: {
                currentPlan: currentPlan,
                newPlan: newPlan,
                planDetails: newPlanDetails,
                requiresPayment: true,
                paymentData: planChangeData
            }
        });

    } catch (error) {
        console.error('Change plan error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change plan'
        });
    }
});

// @desc    Get payment history with analytics
// @route   GET /api/payments/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const payments = await Payment.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-gatewayResponse -signature');

        const total = await Payment.countDocuments({ userId: req.user._id });

        // Calculate analytics
        const analytics = await Payment.aggregate([
            { $match: { userId: req.user._id, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' },
                    totalPayments: { $sum: 1 },
                    avgPayment: { $avg: '$amount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                payments,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                },
                analytics: analytics[0] || {
                    totalSpent: 0,
                    totalPayments: 0,
                    avgPayment: 0
                }
            }
        });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment history'
        });
    }
});

module.exports = router;