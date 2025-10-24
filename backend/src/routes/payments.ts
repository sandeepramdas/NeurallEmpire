import { Router, Request, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import razorpayService from '@/services/razorpay.service';
import subscriptionService from '@/services/subscription.service';
import { logger } from '@/infrastructure/logger';

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
      if (!amount || amount < 100) { // 100 paise = ₹1
        return res.status(400).json({
          success: false,
          message: 'Minimum contribution amount is ₹1 (100 paise)',
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

    // Validate amount matches plan pricing (prevent price manipulation)
    const plan = razorpayService.SUBSCRIPTION_PLANS[planType as keyof typeof razorpayService.SUBSCRIPTION_PLANS];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan configuration',
      });
    }

    const expectedAmount = billingCycle === 'MONTHLY' ? plan.price : plan.price * 10; // 10 months for yearly

    if (amount && amount !== expectedAmount) {
      logger.warn('⚠️ Amount manipulation attempt:', {
        planType,
        billingCycle,
        expected: expectedAmount,
        received: amount,
        organizationId,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid amount for selected plan',
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
    logger.error('Create order error:', error);
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
    logger.info('🔐 Verifying payment signature:', {
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
      logger.error('❌ Payment signature verification failed:', {
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

    logger.info('✅ Payment signature verified successfully');

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
    logger.error('Verify payment error:', error);
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
    logger.error('Get subscription error:', error);
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
    logger.error('Cancel subscription error:', error);
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
    logger.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoices',
    });
  }
});

/**
 * Download invoice as PDF
 */
router.get('/invoices/:invoiceId/download', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID not found',
      });
    }

    // Get invoice with organization and subscription details
    const { prisma } = await import('@/server');
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        organization: true,
        subscription: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Generate HTML invoice
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 800px; margin: 40px auto; padding: 40px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
    .logo { font-size: 32px; font-weight: bold; color: #6366f1; }
    .invoice-details { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 8px; }
    .invoice-date { color: #666; font-size: 14px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { flex: 1; }
    .party-title { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; font-weight: 600; }
    .party-details { font-size: 14px; }
    .company-name { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .items-table thead { background: #f8f9fa; }
    .items-table th { padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; font-weight: 600; border-bottom: 2px solid #dee2e6; }
    .items-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
    .item-description { font-weight: 500; color: #333; }
    .item-period { color: #666; font-size: 13px; margin-top: 4px; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.final { border-top: 2px solid #333; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: bold; color: #6366f1; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #666; font-size: 12px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    @media print {
      .container { margin: 0; padding: 20px; }
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">NeurallEmpire</div>
        <div style="color: #666; font-size: 14px; margin-top: 4px;">AI Agent Platform</div>
      </div>
      <div class="invoice-details">
        <div class="invoice-number">INVOICE</div>
        <div style="font-size: 18px; color: #666; margin-bottom: 8px;">${invoice.invoiceNumber}</div>
        <span class="status-badge ${invoice.status === 'PAID' ? 'status-paid' : 'status-pending'}">${invoice.status}</span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-title">From</div>
        <div class="party-details">
          <div class="company-name">NeurallEmpire</div>
          <div>AI Agent Platform</div>
          <div>support@neurallempire.com</div>
          <div>https://neurallempire.com</div>
        </div>
      </div>
      <div class="party">
        <div class="party-title">Bill To</div>
        <div class="party-details">
          <div class="company-name">${invoice.organization.name}</div>
          <div>${invoice.organization.billingEmail || 'No email'}</div>
        </div>
      </div>
    </div>

    <!-- Invoice Details -->
    <div style="display: flex; gap: 40px; margin-bottom: 30px; font-size: 14px;">
      <div>
        <span style="color: #666;">Invoice Date:</span>
        <span style="font-weight: 600; margin-left: 8px;">${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
      ${invoice.paidAt ? `
      <div>
        <span style="color: #666;">Paid On:</span>
        <span style="font-weight: 600; margin-left: 8px;">${new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
      ` : ''}
      ${invoice.dueDate ? `
      <div>
        <span style="color: #666;">Due Date:</span>
        <span style="font-weight: 600; margin-left: 8px;">${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
      ` : ''}
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-description">
              ${invoice.subscription ? `${invoice.subscription.planType} Plan - ${invoice.subscription.billingCycle}` : 'Contribution to NeurallEmpire'}
            </div>
            ${invoice.billingPeriodStart && invoice.billingPeriodEnd ? `
            <div class="item-period">
              Billing Period: ${new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}
            </div>
            ` : ''}
          </td>
          <td class="text-right">₹${invoice.amount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>₹${invoice.amount.toFixed(2)}</span>
      </div>
      ${invoice.taxAmount ? `
      <div class="total-row">
        <span>Tax (18% GST):</span>
        <span>₹${invoice.taxAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row final">
        <span>Total:</span>
        <span>₹${invoice.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    ${invoice.paymentGatewayChargeId ? `
    <div style="margin-top: 40px; padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 13px;">
      <div style="font-weight: 600; margin-bottom: 8px; color: #333;">Payment Details</div>
      <div style="color: #666;">
        <div>Payment Method: Razorpay</div>
        <div>Transaction ID: ${invoice.paymentGatewayChargeId}</div>
        ${invoice.paymentGatewayInvoiceId ? `<div>Order ID: ${invoice.paymentGatewayInvoiceId}</div>` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div style="margin-bottom: 8px; font-weight: 600; color: #333;">Thank you for your business!</div>
      <div>This is a computer-generated invoice. No signature required.</div>
      <div style="margin-top: 8px;">For any questions, contact us at support@neurallempire.com</div>
    </div>
  </div>
</body>
</html>
    `;

    // Set headers for PDF download
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.html"`);
    res.send(html);

  } catch (error: any) {
    logger.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download invoice',
    });
  }
});

export default router;
