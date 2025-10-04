import { Router, Request, Response } from 'express';
import razorpayService from '@/services/razorpay.service';
import subscriptionService from '@/services/subscription.service';
import { prisma } from '@/server';

const router = Router();

/**
 * Razorpay Webhook Handler
 * Handles payment events from Razorpay
 */
router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    console.log('Razorpay webhook event:', event);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;

      case 'order.paid':
        await handleOrderPaid(req.body.payload?.order?.entity);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(req.body.payload?.subscription?.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(req.body.payload?.subscription?.entity);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
});

/**
 * Handle payment captured event
 * This is the backup mechanism if frontend callback fails
 */
async function handlePaymentCaptured(payment: any) {
  try {
    console.log('💰 Payment captured webhook:', payment.id, payment.order_id);

    // Get payment and order details
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount; // in paise
    const notes = payment.notes || {};

    // Check if invoice already exists for this payment
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        paymentGatewayChargeId: paymentId,
      },
    });

    if (existingInvoice) {
      console.log('✅ Invoice already exists for payment:', paymentId);
      return;
    }

    console.log('📝 Creating invoice from webhook for payment:', paymentId);

    // Determine if it's a subscription or contribution from notes
    const organizationId = notes.organizationId;
    const type = notes.type || 'subscription';
    const planType = notes.planType;
    const billingCycle = notes.billingCycle;

    if (!organizationId) {
      console.error('❌ No organizationId in payment notes');
      return;
    }

    if (type === 'contribution') {
      // Create contribution invoice
      await subscriptionService.createContributionInvoice(
        organizationId,
        amount,
        orderId,
        paymentId
      );
      console.log('✅ Contribution invoice created via webhook');
    } else if (planType && billingCycle) {
      // Create subscription
      await subscriptionService.createSubscription({
        organizationId,
        planType: planType as any,
        billingCycle: billingCycle as any,
        amount,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
      });
      console.log('✅ Subscription and invoice created via webhook');
    } else {
      console.warn('⚠️ Unknown payment type, creating generic invoice');
      await subscriptionService.createContributionInvoice(
        organizationId,
        amount,
        orderId,
        paymentId
      );
    }
  } catch (error) {
    console.error('❌ Handle payment captured error:', error);
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(payment: any) {
  try {
    console.log('Payment failed:', payment.id);
    // TODO: Update invoice status when schema is updated
    // You can add additional logic here like sending failure notifications
  } catch (error) {
    console.error('Handle payment failed error:', error);
  }
}

/**
 * Handle order paid event
 */
async function handleOrderPaid(order: any) {
  try {
    console.log('Order paid:', order.id);

    // Additional order processing logic can go here
  } catch (error) {
    console.error('Handle order paid error:', error);
  }
}

/**
 * Handle subscription activated event
 */
async function handleSubscriptionActivated(subscription: any) {
  try {
    console.log('Subscription activated:', subscription.id);
    // TODO: Update subscription status when schema is updated
  } catch (error) {
    console.error('Handle subscription activated error:', error);
  }
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(subscription: any) {
  try {
    console.log('Subscription cancelled:', subscription.id);
    // TODO: Update subscription status when schema is updated
  } catch (error) {
    console.error('Handle subscription cancelled error:', error);
  }
}

export default router;
