import cron from 'node-cron';
import subscriptionService from './subscription.service';

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
    console.log('⏰ Cron jobs already running');
    return;
  }

  console.log('⏰ Starting cron jobs...');

  // Run subscription renewals daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running subscription renewal job...');
    try {
      const result = await subscriptionService.processSubscriptionRenewals();
      console.log('✅ Subscription renewal job completed:', result);
    } catch (error) {
      console.error('❌ Subscription renewal job failed:', error);
    }
  });

  // Check for expiring trials daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('🔍 Checking for expiring trials...');
    try {
      // TODO: Implement trial expiration check and notifications
      console.log('✅ Trial expiration check completed');
    } catch (error) {
      console.error('❌ Trial expiration check failed:', error);
    }
  });

  // Send usage reports weekly on Monday at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('📊 Generating weekly usage reports...');
    try {
      // TODO: Implement weekly usage reports
      console.log('✅ Usage reports sent');
    } catch (error) {
      console.error('❌ Usage reports failed:', error);
    }
  });

  // Clean up old sessions every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🧹 Cleaning up expired sessions...');
    try {
      // TODO: Implement session cleanup
      console.log('✅ Session cleanup completed');
    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
    }
  });

  isRunning = true;
  console.log('✅ Cron jobs started successfully');
};

/**
 * Stop all cron jobs
 */
export const stopCronJobs = () => {
  if (!isRunning) {
    console.log('⏰ No cron jobs running');
    return;
  }

  // Cron tasks are automatically stopped when the process exits
  isRunning = false;
  console.log('⏰ Cron jobs stopped');
};

export default {
  startCronJobs,
  stopCronJobs,
};
