import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '@/config/env';
import { prisma } from '@/server';

/**
 * Razorpay Service
 * Handles all Razorpay payment operations
 */

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

const getRazorpayInstance = (): Razorpay => {
  if (!razorpayInstance) {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    razorpayInstance = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
};

export interface CreateOrderParams {
  amount: number; // in paise (INR * 100)
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  maxAgents: number;
  maxCampaigns: number;
  storageLimit: number;
}

// Plan definitions matching your pricing
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'FREE',
    price: 0,
    currency: 'INR',
    features: ['5 AI Agents', '10 Campaigns', '1GB Storage'],
    maxAgents: 5,
    maxCampaigns: 10,
    storageLimit: 1048576, // 1GB in KB
  },
  CONQUEROR: {
    id: 'conqueror',
    name: 'CONQUEROR',
    price: 60000, // ₹600 in paise
    currency: 'INR',
    features: ['50 AI Agents', 'Unlimited Campaigns', '100GB Storage', 'Priority Support'],
    maxAgents: 50,
    maxCampaigns: -1,
    storageLimit: 104857600, // 100GB in KB
  },
  EMPEROR: {
    id: 'emperor',
    name: 'EMPEROR',
    price: 240000, // ₹2400 in paise
    currency: 'INR',
    features: ['500 AI Agents', 'Unlimited Everything', '1TB Storage', 'White-label Options'],
    maxAgents: 500,
    maxCampaigns: -1,
    storageLimit: 1073741824, // 1TB in KB
  },
  OVERLORD: {
    id: 'overlord',
    name: 'OVERLORD',
    price: 0, // Custom pricing
    currency: 'INR',
    features: ['10000+ AI Agents', 'Enterprise Features', 'Unlimited Storage', 'Dedicated Support'],
    maxAgents: 10000,
    maxCampaigns: -1,
    storageLimit: -1,
  },
};

/**
 * Create a Razorpay order
 */
export const createOrder = async (params: CreateOrderParams) => {
  try {
    const razorpay = getRazorpayInstance();

    const options = {
      amount: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt || `receipt_${Date.now()}`,
      notes: params.notes || {},
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      data: order,
    };
  } catch (error: any) {
    console.error('Razorpay create order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order',
    };
  }
};

/**
 * Verify payment signature
 */
export const verifyPaymentSignature = (params: VerifyPaymentParams): boolean => {
  try {
    if (!config.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpay_signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  try {
    if (!config.RAZORPAY_WEBHOOK_SECRET) {
      console.warn('Razorpay webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
};

/**
 * Fetch payment details
 */
export const getPaymentDetails = async (paymentId: string) => {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);

    return {
      success: true,
      data: payment,
    };
  } catch (error: any) {
    console.error('Razorpay get payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payment details',
    };
  }
};

/**
 * Create subscription order for an organization
 */
export const createSubscriptionOrder = async (
  organizationId: string,
  planType: keyof typeof SUBSCRIPTION_PLANS,
  billingCycle: 'MONTHLY' | 'YEARLY'
) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    if (plan.price === 0) {
      throw new Error('Cannot create order for free plan');
    }

    // Calculate amount based on billing cycle
    const amount = billingCycle === 'YEARLY' ? plan.price * 12 * 0.8 : plan.price; // 20% discount for yearly

    // Create short receipt ID (max 40 chars for Razorpay)
    const receiptId = `S${Date.now().toString().slice(-10)}`;

    const order = await createOrder({
      amount,
      currency: plan.currency,
      receipt: receiptId,
      notes: {
        organizationId,
        planType,
        billingCycle,
      },
    });

    return order;
  } catch (error: any) {
    console.error('Create subscription order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription order',
    };
  }
};

/**
 * Process successful payment and update subscription
 */
export const processSubscriptionPayment = async (
  organizationId: string,
  paymentId: string,
  orderId: string,
  planType: keyof typeof SUBSCRIPTION_PLANS,
  billingCycle: 'MONTHLY' | 'YEARLY'
) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planType];
    const now = new Date();
    const periodEnd = new Date();

    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Update organization plan
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planType: planType as any,
        billingCycle: billingCycle as any,
        subscriptionId: paymentId,
        maxAgents: plan.maxAgents,
        storageLimit: plan.storageLimit,
      },
    });

    // TODO: Create subscription record when schema is updated
    const subscription = null;

    // TODO: Create invoice record when schema is updated

    return {
      success: true,
      data: {
        organization,
        subscription,
      },
    };
  } catch (error: any) {
    console.error('Process subscription payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process subscription payment',
    };
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (organizationId: string) => {
  try {
    // Update organization to free plan
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        planType: 'FREE',
        billingCycle: 'MONTHLY',
        maxAgents: 5,
        storageLimit: 1048576,
      },
    });

    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    return {
      success: true,
      data: organization,
    };
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription',
    };
  }
};

export default {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getPaymentDetails,
  createSubscriptionOrder,
  processSubscriptionPayment,
  cancelSubscription,
  SUBSCRIPTION_PLANS,
};
