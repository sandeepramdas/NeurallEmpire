import { Router, Request, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import razorpayService from '@/services/razorpay.service';
import subscriptionService from '@/services/subscription.service';

const router = Router();

/**
 * Get available subscription plans (public endpoint)
 */
router.get('/plans', (req: Request, res: Response) => {
  const plans = Object.values(razorpayService.SUBSCRIPTION_PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price / 100, // Convert paise to rupees for display
    currency: plan.currency,
    features: plan.features,
    maxAgents: plan.maxAgents,
    maxCampaigns: plan.maxCampaigns,
    storageLimit: plan.storageLimit,
  }));

  res.json({
    success: true,
    data: plans,
  });
});

// All routes below require authentication
router.use(authenticate);

/**
 * Create payment order for subscription
 */
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { planType, billingCycle, amount } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    // Handle contributions (one-time payments)
    if (planType === 'CONTRIBUTION') {
      if (!amount || amount < 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contribution amount (minimum ₹1)',
        });
      }

      // Create short receipt ID (max 40 chars for Razorpay)
      const receiptId = `C${Date.now().toString().slice(-10)}`;

      const result = await razorpayService.createOrder({
        amount: amount, // Amount already in paise from frontend
        currency: 'INR',
        receipt: receiptId,
        notes: {
          organizationId,
          type: 'contribution',
        },
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json({
        success: true,
        data: {
          orderId: result.data.id,
          amount: result.data.amount,
          currency: result.data.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    }

    // Handle subscription orders
    if (!planType || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Plan type and billing cycle are required',
      });
    }

    const validPlanTypes = ['CONQUEROR', 'EMPEROR', 'OVERLORD'];
    if (!validPlanTypes.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type',
      });
    }

    const validBillingCycles = ['MONTHLY', 'YEARLY'];
    if (!validBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle',
      });
    }

    const result = await razorpayService.createSubscriptionOrder(
      organizationId,
      planType,
      billingCycle
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: {
        orderId: result.data.id,
        amount: result.data.amount,
        currency: result.data.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  }
});

/**
 * Verify payment and activate subscription
 */
router.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
      billingCycle,
      amount,
      type, // 'SUBSCRIPTION' or 'CONTRIBUTION'
    } = req.body;

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters',
      });
    }

    // Verify signature
    console.log('🔐 Verifying payment signature:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature_length: razorpay_signature?.length,
    });

    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error('❌ Payment signature verification failed:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        organizationId,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
        error: 'SIGNATURE_VERIFICATION_FAILED',
      });
    }

    console.log('✅ Payment signature verified successfully');

    // Handle contribution (one-time payment)
    if (type === 'CONTRIBUTION') {
      const invoiceResult = await subscriptionService.createContributionInvoice(
        organizationId,
        amount,
        razorpay_order_id,
        razorpay_payment_id
      );

      if (!invoiceResult.success) {
        return res.status(400).json(invoiceResult);
      }

      return res.json({
        success: true,
        message: 'Contribution received successfully',
        data: {
          invoice: invoiceResult.data,
        },
      });
    }

    // Handle subscription payment - create subscription with invoice
    const subscriptionResult = await subscriptionService.createSubscription({
      organizationId,
      planType,
      billingCycle,
      amount,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!subscriptionResult.success) {
      return res.status(400).json(subscriptionResult);
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: subscriptionResult.data,
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
});

/**
 * Get current subscription details
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    const { prisma } = await import('@/server');

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        planType: true,
        billingCycle: true,
        maxAgents: true,
        storageLimit: true,
      },
    });

    const subscriptionResult = await subscriptionService.getActiveSubscription(organizationId);

    // Convert BigInt to string for JSON serialization
    const orgData = organization ? {
      ...organization,
      storageLimit: organization.storageLimit.toString(),
    } : null;

    res.json({
      success: true,
      data: {
        organization: orgData,
        subscription: subscriptionResult.data,
      },
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch subscription',
    });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel-subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    const result = await subscriptionService.cancelSubscriptionAtPeriodEnd(organizationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      data: result.data,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
    });
  }
});

/**
 * Get payment history (invoices)
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const result = await subscriptionService.getInvoices(organizationId, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoices',
    });
  }
});

export default router;
