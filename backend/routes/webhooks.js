const express = require('express');
const crypto = require('crypto');
const Stripe = require('stripe');

const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Raw body parser for webhooks (needed for signature verification)
router.use('/stripe', express.raw({ type: 'application/json' }));
router.use('/razorpay', express.json());

// @desc    Handle Razorpay webhooks
// @route   POST /api/webhooks/razorpay
// @access  Public (but verified)
router.post('/razorpay', async (req, res) => {
    try {
        const webhookSignature = req.get('X-Razorpay-Signature');
        const webhookBody = JSON.stringify(req.body);

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(webhookBody)
            .digest('hex');

        if (!crypto.timingSafeEqual(
            Buffer.from(webhookSignature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        )) {
            console.log('Invalid Razorpay webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const { event, payload } = req.body;

        console.log('Razorpay webhook received:', event);

        switch (event) {
            case 'payment.captured':
                await handleRazorpayPaymentCaptured(payload.payment.entity);
                break;

            case 'payment.failed':
                await handleRazorpayPaymentFailed(payload.payment.entity);
                break;

            case 'subscription.charged':
                await handleRazorpaySubscriptionCharged(payload.subscription.entity, payload.payment.entity);
                break;

            case 'subscription.cancelled':
                await handleRazorpaySubscriptionCancelled(payload.subscription.entity);
                break;

            case 'refund.created':
                await handleRazorpayRefundCreated(payload.refund.entity);
                break;

            default:
                console.log('Unhandled Razorpay webhook event:', event);
        }

        res.status(200).json({ status: 'success' });

    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// @desc    Handle Stripe webhooks
// @route   POST /api/webhooks/stripe
// @access  Public (but verified)
router.post('/stripe', async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.log('Invalid Stripe webhook signature:', err.message);
            return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
        }

        console.log('Stripe webhook received:', event.type);

        switch (event.type) {
            case 'payment_intent.succeeded':
                await handleStripePaymentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handleStripePaymentFailed(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handleStripeInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handleStripeInvoicePaymentFailed(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleStripeSubscriptionDeleted(event.data.object);
                break;

            case 'charge.dispute.created':
                await handleStripeDisputeCreated(event.data.object);
                break;

            default:
                console.log('Unhandled Stripe webhook event:', event.type);
        }

        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Razorpay webhook handlers
async function handleRazorpayPaymentCaptured(paymentData) {
    try {
        const payment = await Payment.findOne({
            gatewayPaymentId: paymentData.id
        });

        if (payment) {
            payment.status = 'completed';
            payment.paidAt = new Date(paymentData.created_at * 1000);
            payment.gatewayResponse = paymentData;
            payment.webhookProcessed = true;
            await payment.save();

            // Update user subscription
            await updateUserSubscription(payment);

            console.log('Razorpay payment captured processed:', paymentData.id);
        }
    } catch (error) {
        console.error('Error processing Razorpay payment captured:', error);
    }
}

async function handleRazorpayPaymentFailed(paymentData) {
    try {
        const payment = await Payment.findOne({
            gatewayPaymentId: paymentData.id
        });

        if (payment) {
            payment.status = 'failed';
            payment.failedAt = new Date();
            payment.gatewayResponse = paymentData;
            payment.webhookProcessed = true;
            await payment.save();

            console.log('Razorpay payment failed processed:', paymentData.id);
        }
    } catch (error) {
        console.error('Error processing Razorpay payment failed:', error);
    }
}

async function handleRazorpaySubscriptionCharged(subscriptionData, paymentData) {
    try {
        // Handle recurring subscription charges
        const existingPayment = await Payment.findOne({
            'subscription.subscriptionId': subscriptionData.id
        });

        if (existingPayment) {
            // Create new payment record for the recurring charge
            const newPayment = new Payment({
                paymentId: `pay_recurring_${Date.now()}`,
                orderId: paymentData.order_id,
                signature: '',
                userId: existingPayment.userId,
                plan: existingPayment.plan,
                planDetails: existingPayment.planDetails,
                amount: paymentData.amount / 100,
                currency: paymentData.currency,
                gateway: 'razorpay',
                gatewayPaymentId: paymentData.id,
                gatewayOrderId: paymentData.order_id,
                status: 'completed',
                paidAt: new Date(paymentData.created_at * 1000),
                customerInfo: existingPayment.customerInfo,
                subscription: {
                    isRecurring: true,
                    interval: existingPayment.subscription.interval,
                    subscriptionId: subscriptionData.id
                },
                gatewayResponse: paymentData,
                webhookProcessed: true
            });

            await newPayment.save();
            await updateUserSubscription(newPayment);

            console.log('Razorpay subscription charged processed:', subscriptionData.id);
        }
    } catch (error) {
        console.error('Error processing Razorpay subscription charged:', error);
    }
}

async function handleRazorpaySubscriptionCancelled(subscriptionData) {
    try {
        const payment = await Payment.findOne({
            'subscription.subscriptionId': subscriptionData.id
        });

        if (payment) {
            payment.subscription.isRecurring = false;
            payment.status = 'cancelled';
            await payment.save();

            // Update user subscription
            const user = await User.findById(payment.userId);
            if (user && user.subscription.status === 'active') {
                user.subscription.status = 'cancelled';
                await user.save();
            }

            console.log('Razorpay subscription cancelled processed:', subscriptionData.id);
        }
    } catch (error) {
        console.error('Error processing Razorpay subscription cancelled:', error);
    }
}

async function handleRazorpayRefundCreated(refundData) {
    try {
        const payment = await Payment.findOne({
            gatewayPaymentId: refundData.payment_id
        });

        if (payment) {
            payment.refund = {
                amount: refundData.amount / 100,
                reason: refundData.notes?.reason || 'Refund requested',
                refundId: refundData.id,
                refundedAt: new Date(refundData.created_at * 1000),
                status: 'processed'
            };

            if (refundData.amount >= payment.amount * 100) {
                payment.status = 'refunded';
                payment.refundedAt = new Date();
            }

            await payment.save();

            console.log('Razorpay refund processed:', refundData.id);
        }
    } catch (error) {
        console.error('Error processing Razorpay refund:', error);
    }
}

// Stripe webhook handlers
async function handleStripePaymentSucceeded(paymentIntent) {
    try {
        const payment = await Payment.findOne({
            gatewayOrderId: paymentIntent.id
        });

        if (payment) {
            payment.status = 'completed';
            payment.paidAt = new Date(paymentIntent.created * 1000);
            payment.gatewayResponse = paymentIntent;
            payment.webhookProcessed = true;
            await payment.save();

            await updateUserSubscription(payment);

            console.log('Stripe payment succeeded processed:', paymentIntent.id);
        }
    } catch (error) {
        console.error('Error processing Stripe payment succeeded:', error);
    }
}

async function handleStripePaymentFailed(paymentIntent) {
    try {
        const payment = await Payment.findOne({
            gatewayOrderId: paymentIntent.id
        });

        if (payment) {
            payment.status = 'failed';
            payment.failedAt = new Date();
            payment.gatewayResponse = paymentIntent;
            payment.webhookProcessed = true;
            await payment.save();

            console.log('Stripe payment failed processed:', paymentIntent.id);
        }
    } catch (error) {
        console.error('Error processing Stripe payment failed:', error);
    }
}

async function handleStripeInvoicePaymentSucceeded(invoice) {
    try {
        // Handle recurring subscription payments
        console.log('Stripe invoice payment succeeded:', invoice.id);
    } catch (error) {
        console.error('Error processing Stripe invoice payment succeeded:', error);
    }
}

async function handleStripeInvoicePaymentFailed(invoice) {
    try {
        console.log('Stripe invoice payment failed:', invoice.id);
    } catch (error) {
        console.error('Error processing Stripe invoice payment failed:', error);
    }
}

async function handleStripeSubscriptionDeleted(subscription) {
    try {
        // Find payment by customer ID or subscription ID
        const payment = await Payment.findOne({
            'subscription.subscriptionId': subscription.id
        });

        if (payment) {
            payment.subscription.isRecurring = false;
            payment.status = 'cancelled';
            await payment.save();

            // Update user subscription
            const user = await User.findById(payment.userId);
            if (user && user.subscription.status === 'active') {
                user.subscription.status = 'cancelled';
                await user.save();
            }

            console.log('Stripe subscription deleted processed:', subscription.id);
        }
    } catch (error) {
        console.error('Error processing Stripe subscription deleted:', error);
    }
}

async function handleStripeDisputeCreated(charge) {
    try {
        const payment = await Payment.findOne({
            gatewayPaymentId: charge.payment_intent
        });

        if (payment) {
            payment.status = 'disputed';
            payment.fraudFlags = payment.fraudFlags || [];
            payment.fraudFlags.push('dispute_created');
            payment.isManualReview = true;
            await payment.save();

            console.log('Stripe dispute created processed:', charge.id);
        }
    } catch (error) {
        console.error('Error processing Stripe dispute created:', error);
    }
}

// Helper function to update user subscription
async function updateUserSubscription(payment) {
    try {
        const user = await User.findById(payment.userId);
        if (user && payment.status === 'completed') {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // Add 1 month

            user.subscription = {
                plan: payment.plan,
                status: 'active',
                startDate: payment.paidAt || new Date(),
                endDate: endDate,
                paymentId: payment._id,
                amount: payment.amount
            };

            await user.save();
            console.log('User subscription updated for user:', user.email);
        }
    } catch (error) {
        console.error('Error updating user subscription:', error);
    }
}

module.exports = router;