import { Router, Request, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import razorpayService from '@/services/razorpay.service';

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

      const result = await razorpayService.createOrder({
        amount: amount, // Amount already in paise from frontend
        currency: 'INR',
        receipt: `contribution_${organizationId}_${Date.now()}`,
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
    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Process subscription payment
    const result = await razorpayService.processSubscriptionPayment(
      organizationId,
      razorpay_payment_id,
      razorpay_order_id,
      planType,
      billingCycle
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: result.data,
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

    const { prisma } = await import('@/config/database');

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        planType: true,
        billingCycle: true,
        maxAgents: true,
        maxCampaigns: true,
        storageLimit: true,
      },
    });

    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        organization,
        subscription,
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

    const result = await razorpayService.cancelSubscription(organizationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
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

    const { prisma } = await import('@/config/database');

    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 invoices
    });

    res.json({
      success: true,
      data: invoices,
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
