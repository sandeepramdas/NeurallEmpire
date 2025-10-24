import { prisma } from '@/server';
import { PlanType, BillingCycle, SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import { SUBSCRIPTION_PLANS } from './razorpay.service';
import { logger } from '@/infrastructure/logger';

/**
 * Subscription Management Service
 * Handles subscription lifecycle, invoices, and auto-renewals
 */

interface CreateSubscriptionParams {
  organizationId: string;
  planType: PlanType;
  billingCycle: BillingCycle;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

interface CreateInvoiceParams {
  organizationId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  taxAmount?: number;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  dueDate: Date;
  paymentGatewayInvoiceId?: string;
  paymentGatewayChargeId?: string;
  status?: InvoiceStatus;
  type: 'SUBSCRIPTION' | 'CONTRIBUTION';
}

/**
 * Generate unique invoice number
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Get count of invoices this month
  const startOfMonth = new Date(year, date.getMonth(), 1);
  const endOfMonth = new Date(year, date.getMonth() + 1, 0);

  const count = await prisma.invoice.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${year}${month}-${sequence}`;
};

/**
 * Create an invoice
 */
export const createInvoice = async (params: CreateInvoiceParams) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();

    const totalAmount = params.amount + (params.taxAmount || 0);

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: params.organizationId,
        subscriptionId: params.subscriptionId,
        invoiceNumber,
        status: params.status || InvoiceStatus.PAID,
        amount: params.amount,
        currency: params.currency,
        taxAmount: params.taxAmount,
        totalAmount,
        billingPeriodStart: params.billingPeriodStart,
        billingPeriodEnd: params.billingPeriodEnd,
        dueDate: params.dueDate,
        paidAt: params.status === InvoiceStatus.PAID ? new Date() : null,
        paymentGatewayInvoiceId: params.paymentGatewayInvoiceId,
        paymentGatewayChargeId: params.paymentGatewayChargeId,
        paymentGateway: 'razorpay',
      },
    });

    return {
      success: true,
      data: invoice,
    };
  } catch (error: any) {
    logger.error('Create invoice error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create invoice',
    };
  }
};

/**
 * Create subscription with invoice
 */
export const createSubscription = async (params: CreateSubscriptionParams) => {
  try {
    logger.info('📦 Creating subscription:', {
      organizationId: params.organizationId,
      planType: params.planType,
      billingCycle: params.billingCycle,
      amount: params.amount,
    });

    const plan = SUBSCRIPTION_PLANS[params.planType];
    if (!plan) {
      throw new Error('Invalid plan type');
    }

    const now = new Date();
    const periodEnd = new Date();

    if (params.billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (params.billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        organizationId: params.organizationId,
        paymentGatewaySubscriptionId: params.razorpayPaymentId,
        status: SubscriptionStatus.ACTIVE,
        planType: params.planType,
        billingCycle: params.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount: params.amount / 100, // Convert paise to rupees
        currency: 'INR',
        userLimit: 100, // Default limits
        agentLimit: plan.maxAgents,
        workflowLimit: 1000,
        apiCallLimit: 100000,
        cancelAtPeriodEnd: false,
      },
    });

    // Update organization
    await prisma.organization.update({
      where: { id: params.organizationId },
      data: {
        planType: params.planType,
        billingCycle: params.billingCycle,
        subscriptionId: params.razorpayPaymentId,
        maxAgents: plan.maxAgents,
        storageLimit: plan.storageLimit,
        status: 'ACTIVE',
      },
    });

    // Create invoice for this subscription
    await createInvoice({
      organizationId: params.organizationId,
      subscriptionId: subscription.id,
      amount: params.amount / 100,
      currency: 'INR',
      billingPeriodStart: now,
      billingPeriodEnd: periodEnd,
      dueDate: now,
      paymentGatewayChargeId: params.razorpayPaymentId,
      paymentGatewayInvoiceId: params.razorpayOrderId,
      status: InvoiceStatus.PAID,
      type: 'SUBSCRIPTION',
    });

    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    logger.error('Create subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription',
    };
  }
};

/**
 * Create invoice for contribution (one-time payment)
 */
export const createContributionInvoice = async (
  organizationId: string,
  amount: number,
  razorpayOrderId: string,
  razorpayPaymentId: string
) => {
  try {
    const invoice = await createInvoice({
      organizationId,
      amount: amount / 100, // Convert paise to rupees
      currency: 'INR',
      dueDate: new Date(),
      paymentGatewayChargeId: razorpayPaymentId,
      paymentGatewayInvoiceId: razorpayOrderId,
      status: InvoiceStatus.PAID,
      type: 'CONTRIBUTION',
    });

    return invoice;
  } catch (error: any) {
    logger.error('Create contribution invoice error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create contribution invoice',
    };
  }
};

/**
 * Get active subscription for organization
 */
export const getActiveSubscription = async (organizationId: string) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        invoices: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    return {
      success: true,
      data: subscription,
    };
  } catch (error: any) {
    logger.error('Get active subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get subscription',
    };
  }
};

/**
 * Get all invoices for organization
 */
export const getInvoices = async (organizationId: string, limit = 50) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        subscription: {
          select: {
            planType: true,
            billingCycle: true,
          },
        },
      },
    });

    return {
      success: true,
      data: invoices,
    };
  } catch (error: any) {
    logger.error('Get invoices error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get invoices',
    };
  }
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscriptionAtPeriodEnd = async (organizationId: string) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    logger.error('Cancel subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription',
    };
  }
};

/**
 * Renew subscription (called by auto-renewal job)
 */
export const renewSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        organization: true,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.cancelAtPeriodEnd) {
      // Cancel the subscription
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED,
        },
      });

      // Downgrade organization to free plan
      await prisma.organization.update({
        where: { id: subscription.organizationId },
        data: {
          planType: 'FREE',
          billingCycle: 'MONTHLY',
          maxAgents: 5,
          storageLimit: 1048576,
        },
      });

      return {
        success: true,
        data: { renewed: false, cancelled: true },
      };
    }

    // Calculate next period
    const nextPeriodStart = subscription.currentPeriodEnd;
    const nextPeriodEnd = new Date(nextPeriodStart);

    if (subscription.billingCycle === 'MONTHLY') {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else if (subscription.billingCycle === 'YEARLY') {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    // Update subscription period
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: nextPeriodStart,
        currentPeriodEnd: nextPeriodEnd,
      },
    });

    // Create invoice for next period
    await createInvoice({
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      amount: subscription.amount,
      currency: subscription.currency,
      billingPeriodStart: nextPeriodStart,
      billingPeriodEnd: nextPeriodEnd,
      dueDate: nextPeriodStart,
      status: InvoiceStatus.OPEN, // Will be paid via auto-charge
      type: 'SUBSCRIPTION',
    });

    return {
      success: true,
      data: { renewed: true, subscription: updated },
    };
  } catch (error: any) {
    logger.error('Renew subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to renew subscription',
    };
  }
};

/**
 * Check and process renewals for subscriptions ending soon
 * Should be called by a cron job daily
 */
export const processSubscriptionRenewals = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const subscriptionsToRenew = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: {
          lte: tomorrow,
        },
      },
    });

    const results = [];
    for (const subscription of subscriptionsToRenew) {
      const result = await renewSubscription(subscription.id);
      results.push({
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        result,
      });
    }

    return {
      success: true,
      data: {
        processed: results.length,
        results,
      },
    };
  } catch (error: any) {
    logger.error('Process renewals error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process renewals',
    };
  }
};

export default {
  createSubscription,
  createInvoice,
  createContributionInvoice,
  getActiveSubscription,
  getInvoices,
  cancelSubscriptionAtPeriodEnd,
  renewSubscription,
  processSubscriptionRenewals,
  generateInvoiceNumber,
};
