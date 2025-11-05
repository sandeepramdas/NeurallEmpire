import { Router, Request, Response } from 'express';
import razorpayService from '@/services/razorpay.service';
import subscriptionService from '@/services/subscription.service';
import { prisma } from '@/server';
import { logger } from '@/infrastructure/logger';

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
      logger.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;

    logger.info('Razorpay webhook event:', event);

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
        logger.info('Unhandled webhook event:', event);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
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
  const webhookEventId = payment.event_id || `${payment.id}_${Date.now()}`;

  try {
    logger.info('💰 Payment captured webhook:', payment.id, payment.order_id);

    // Check for duplicate webhook event (replay attack prevention)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId: webhookEventId },
    });

    if (existingEvent) {
      logger.warn('⚠️ Duplicate webhook event detected:', webhookEventId);
      return;
    }

    // Log webhook event for audit trail
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'razorpay',
        eventType: 'payment.captured',
        eventId: webhookEventId,
        payload: payment,
        processed: false,
      },
    });

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
      logger.info('✅ Invoice already exists for payment:', paymentId);

      // Mark webhook as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      return;
    }

    logger.info('📝 Creating invoice from webhook for payment:', paymentId);

    // Determine if it's a subscription or contribution from notes
    const organizationId = notes.organizationId;
    const type = notes.type || 'subscription';
    const planType = notes.planType;
    const billingCycle = notes.billingCycle;

    if (!organizationId) {
      throw new Error('No organizationId in payment notes');
    }

    if (type === 'contribution') {
      // Create contribution invoice
      await subscriptionService.createContributionInvoice(
        organizationId,
        amount,
        orderId,
        paymentId
      );
      logger.info('✅ Contribution invoice created via webhook');
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
      logger.info('✅ Subscription and invoice created via webhook');
    } else {
      logger.warn('⚠️ Unknown payment type, creating generic invoice');
      await subscriptionService.createContributionInvoice(
        organizationId,
        amount,
        orderId,
        paymentId
      );
    }

    // Mark webhook as successfully processed
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('❌ Handle payment captured error:', error);

    // Log error in webhook event
    try {
      await prisma.webhookEvent.updateMany({
        where: { eventId: webhookEventId },
        data: {
          processingError: error.message || 'Unknown error',
          retryCount: { increment: 1 },
        },
      });
    } catch (updateError) {
      logger.error('Failed to update webhook event error:', updateError);
    }

    throw error; // Re-throw to return 500 to Razorpay for retry
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(payment: any) {
  try {
    logger.info('Payment failed:', payment.id);

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const notes = payment.notes || {};

    // Find the payment record
    const paymentRecord = await prisma.payment.findUnique({
      where: { gatewayPaymentId: paymentId },
      include: { invoice: true },
    });

    if (paymentRecord) {
      // Update payment status
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: payment.error_description || 'Payment failed',
          failureCode: payment.error_code,
        },
      });

      // Update associated invoice if exists
      if (paymentRecord.invoiceId) {
        await prisma.invoice.update({
          where: { id: paymentRecord.invoiceId },
          data: {
            status: 'FAILED',
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            failureReason: payment.error_description || 'Payment failed',
          },
        });
      }

      logger.info('✅ Payment and invoice marked as failed');
    }

    // Send failure notification (optional)
    // TODO: Send email notification to organization about failed payment

  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
}

/**
 * Handle order paid event
 */
async function handleOrderPaid(order: any) {
  try {
    logger.info('Order paid:', order.id);

    // Additional order processing logic can go here
  } catch (error) {
    logger.error('Handle order paid error:', error);
  }
}

/**
 * Handle subscription activated event
 */
async function handleSubscriptionActivated(subscription: any) {
  try {
    logger.info('Subscription activated:', subscription.id);

    const subscriptionId = subscription.id;

    // Find subscription by Razorpay subscription ID
    const subscriptionRecord = await prisma.subscription.findUnique({
      where: { paymentGatewaySubscriptionId: subscriptionId },
    });

    if (subscriptionRecord) {
      // Update subscription status to active
      await prisma.subscription.update({
        where: { id: subscriptionRecord.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(subscription.current_start * 1000),
          currentPeriodEnd: new Date(subscription.current_end * 1000),
          nextBillingDate: new Date(subscription.current_end * 1000),
        },
      });

      // Update organization plan
      await prisma.organization.update({
        where: { id: subscriptionRecord.organizationId },
        data: {
          planType: subscriptionRecord.planType,
          status: 'ACTIVE',
        },
      });

      logger.info('✅ Subscription and organization updated to ACTIVE');
    }

  } catch (error) {
    logger.error('Handle subscription activated error:', error);
  }
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(subscription: any) {
  try {
    logger.info('Subscription cancelled:', subscription.id);

    const subscriptionId = subscription.id;

    // Find subscription by Razorpay subscription ID
    const subscriptionRecord = await prisma.subscription.findUnique({
      where: { paymentGatewaySubscriptionId: subscriptionId },
    });

    if (subscriptionRecord) {
      // Update subscription status to cancelled
      await prisma.subscription.update({
        where: { id: subscriptionRecord.id },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
          cancelAtPeriodEnd: false, // Already cancelled
        },
      });

      // Optionally downgrade organization to free plan
      // Or keep current plan until period ends
      await prisma.organization.update({
        where: { id: subscriptionRecord.organizationId },
        data: {
          status: 'CANCELLED',
          // planType: 'FREE', // Uncomment to immediately downgrade
        },
      });

      logger.info('✅ Subscription marked as cancelled');

      // TODO: Send email notification about cancellation
    }

  } catch (error) {
    logger.error('Handle subscription cancelled error:', error);
  }
}

export default router;
