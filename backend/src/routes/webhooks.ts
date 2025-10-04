import { Router, Request, Response } from 'express';
import razorpayService from '@/services/razorpay.service';
import { prisma } from '@/config/database';

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
 */
async function handlePaymentCaptured(payment: any) {
  try {
    console.log('Payment captured:', payment.id);

    // Update invoice status if exists
    await prisma.invoice.updateMany({
      where: {
        razorpayPaymentId: payment.id,
      },
      data: {
        status: 'PAID',
        paidAt: new Date(payment.created_at * 1000),
      },
    });

    // You can add additional logic here like sending confirmation emails
  } catch (error) {
    console.error('Handle payment captured error:', error);
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(payment: any) {
  try {
    console.log('Payment failed:', payment.id);

    // Update invoice status if exists
    await prisma.invoice.updateMany({
      where: {
        razorpayPaymentId: payment.id,
      },
      data: {
        status: 'FAILED',
      },
    });

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

    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        providerSubscriptionId: subscription.id,
      },
      data: {
        status: 'ACTIVE',
      },
    });
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

    // Update subscription status
    await prisma.subscription.updateMany({
      where: {
        providerSubscriptionId: subscription.id,
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Handle subscription cancelled error:', error);
  }
}

export default router;
