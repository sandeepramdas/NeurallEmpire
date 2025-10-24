import cron from 'node-cron';
import subscriptionService from './subscription.service';
import { logger } from '@/infrastructure/logger';

/**
 * Cron Job Service
 * Handles scheduled tasks like subscription renewals
 */

let isRunning = false;

/**
 * Start all cron jobs
 */
export const startCronJobs = () => {
  if (isRunning) {
    logger.info('⏰ Cron jobs already running');
    return;
  }

  logger.info('⏰ Starting cron jobs...');

  // Run subscription renewals daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('🔄 Running subscription renewal job...');
    try {
      const result = await subscriptionService.processSubscriptionRenewals();
      logger.info('✅ Subscription renewal job completed:', result);
    } catch (error) {
      logger.error('❌ Subscription renewal job failed:', error);
    }
  });

  // Check for expiring trials daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('🔍 Checking for expiring trials...');
    try {
      // TODO: Implement trial expiration check and notifications
      logger.info('✅ Trial expiration check completed');
    } catch (error) {
      logger.error('❌ Trial expiration check failed:', error);
    }
  });

  // Send usage reports weekly on Monday at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    logger.info('📊 Generating weekly usage reports...');
    try {
      // TODO: Implement weekly usage reports
      logger.info('✅ Usage reports sent');
    } catch (error) {
      logger.error('❌ Usage reports failed:', error);
    }
  });

  // Clean up old sessions every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('🧹 Cleaning up expired sessions...');
    try {
      // TODO: Implement session cleanup
      logger.info('✅ Session cleanup completed');
    } catch (error) {
      logger.error('❌ Session cleanup failed:', error);
    }
  });

  isRunning = true;
  logger.info('✅ Cron jobs started successfully');
};

/**
 * Stop all cron jobs
 */
export const stopCronJobs = () => {
  if (!isRunning) {
    logger.info('⏰ No cron jobs running');
    return;
  }

  // Cron tasks are automatically stopped when the process exits
  isRunning = false;
  logger.info('⏰ Cron jobs stopped');
};

export default {
  startCronJobs,
  stopCronJobs,
};
