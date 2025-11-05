import cron from 'node-cron';
import subscriptionService from './subscription.service';
import { logger } from '@/infrastructure/logger';
import { prisma } from '@/server';
import { EmailService } from '@/infrastructure/email/email.service';

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
      const result = await checkTrialExpirations();
      logger.info('✅ Trial expiration check completed:', result);
    } catch (error) {
      logger.error('❌ Trial expiration check failed:', error);
    }
  });

  // Send usage reports weekly on Monday at 9 AM
  cron.schedule('0 9 * * 1', async () => {
    logger.info('📊 Generating weekly usage reports...');
    try {
      const result = await sendWeeklyUsageReports();
      logger.info('✅ Usage reports sent:', result);
    } catch (error) {
      logger.error('❌ Usage reports failed:', error);
    }
  });

  // Clean up old sessions every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('🧹 Cleaning up expired sessions...');
    try {
      const result = await cleanupExpiredSessions();
      logger.info('✅ Session cleanup completed:', result);
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

// ==================== CRON JOB IMPLEMENTATIONS ====================

/**
 * Check for trial expirations and send notifications
 */
async function checkTrialExpirations() {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find trials expiring in 3 days (warning)
  const expiringTrials = await prisma.organization.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
    include: {
      users: {
        where: { role: 'OWNER' },
        take: 1,
      },
    },
  });

  // Find expired trials
  const expiredTrials = await prisma.organization.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        lt: now,
      },
    },
    include: {
      users: {
        where: { role: 'OWNER' },
        take: 1,
      },
    },
  });

  let warningsSent = 0;
  let trialsExpired = 0;

  // Send warnings for expiring trials
  for (const org of expiringTrials) {
    const owner = org.users[0];
    if (!owner) continue;

    try {
      const daysLeft = Math.ceil(
        (org.trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      await EmailService.send({
        to: owner.email,
        subject: `Your trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        html: getTrialExpiringEmailTemplate(owner.firstName || 'there', org.name, daysLeft),
        organizationId: org.id,
        tags: ['trial-expiring', 'billing'],
      });

      warningsSent++;
    } catch (error: any) {
      logger.error('Failed to send trial expiring email:', {
        organizationId: org.id,
        error: error.message,
      });
    }
  }

  // Handle expired trials
  for (const org of expiredTrials) {
    const owner = org.users[0];

    try {
      // Update organization status to suspended
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          status: 'SUSPENDED',
          planType: 'FREE',
        },
      });

      // Send expiration notification
      if (owner) {
        await EmailService.send({
          to: owner.email,
          subject: 'Your trial has expired',
          html: getTrialExpiredEmailTemplate(owner.firstName || 'there', org.name),
          organizationId: org.id,
          tags: ['trial-expired', 'billing'],
        });
      }

      trialsExpired++;
    } catch (error: any) {
      logger.error('Failed to process expired trial:', {
        organizationId: org.id,
        error: error.message,
      });
    }
  }

  return { warningsSent, trialsExpired };
}

/**
 * Send weekly usage reports to organization owners
 */
async function sendWeeklyUsageReports() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get all active organizations
  const organizations = await prisma.organization.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
    include: {
      users: {
        where: { role: 'OWNER' },
        take: 1,
      },
      agents: {
        where: {
          createdAt: { gte: oneWeekAgo },
        },
      },
      workflows: {
        where: {
          createdAt: { gte: oneWeekAgo },
        },
      },
    },
  });

  let reportsSent = 0;

  for (const org of organizations) {
    const owner = org.users[0];
    if (!owner) continue;

    try {
      // Get usage metrics for the week
      const metrics = await prisma.usageMetric.findMany({
        where: {
          organizationId: org.id,
          recordedAt: { gte: oneWeekAgo },
        },
      });

      const totalApiCalls = metrics
        .filter((m) => m.metricType === 'api_calls')
        .reduce((sum, m) => sum + m.value, 0);

      const newAgents = org.agents.length;
      const newWorkflows = org.workflows.length;

      // Send usage report email
      await EmailService.send({
        to: owner.email,
        subject: `Weekly Usage Report for ${org.name}`,
        html: getWeeklyUsageReportTemplate(
          owner.firstName || 'there',
          org.name,
          {
            apiCalls: totalApiCalls,
            newAgents,
            newWorkflows,
            activeUsers: org.currentUsers,
          }
        ),
        organizationId: org.id,
        tags: ['usage-report', 'weekly'],
      });

      reportsSent++;
    } catch (error: any) {
      logger.error('Failed to send usage report:', {
        organizationId: org.id,
        error: error.message,
      });
    }
  }

  return { reportsSent };
}

/**
 * Clean up expired sessions from the database
 */
async function cleanupExpiredSessions() {
  const now = new Date();

  // Delete sessions older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        // Expired sessions
        {
          expiresAt: {
            lt: now,
          },
        },
        // Old sessions (30+ days)
        {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      ],
    },
  });

  return { deletedCount: result.count };
}

// ==================== EMAIL TEMPLATES ====================

function getTrialExpiringEmailTemplate(firstName: string, orgName: string, daysLeft: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-top: 0;">Trial Expiring Soon</h2>

          <p>Hi ${firstName},</p>

          <p style="font-size: 16px;">
            Your trial for <strong>${orgName}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.
          </p>

          <p>Don't lose access to your AI agents and workflows! Upgrade now to continue using NeurallEmpire.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/settings/billing" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Upgrade Now
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Questions? Contact our support team at support@neurallempire.com
          </p>
        </div>
      </body>
    </html>
  `;
}

function getTrialExpiredEmailTemplate(firstName: string, orgName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-top: 0;">Trial Expired</h2>

          <p>Hi ${firstName},</p>

          <p style="font-size: 16px;">
            Your trial for <strong>${orgName}</strong> has expired. Your account has been suspended.
          </p>

          <p>To restore access to your AI agents and workflows, please upgrade to a paid plan.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/settings/billing" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Choose a Plan
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Your data is safe and will be preserved for 90 days.
          </p>
        </div>
      </body>
    </html>
  `;
}

function getWeeklyUsageReportTemplate(
  firstName: string,
  orgName: string,
  stats: { apiCalls: number; newAgents: number; newWorkflows: number; activeUsers: number }
): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-top: 0;">Weekly Usage Report</h2>

          <p>Hi ${firstName},</p>

          <p>Here's your weekly summary for <strong>${orgName}</strong>:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0;"><strong>API Calls</strong></td>
                <td style="padding: 10px 0; text-align: right; color: #667eea; font-size: 18px;">${stats.apiCalls.toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0;"><strong>New Agents</strong></td>
                <td style="padding: 10px 0; text-align: right; color: #667eea; font-size: 18px;">${stats.newAgents}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 0;"><strong>New Workflows</strong></td>
                <td style="padding: 10px 0; text-align: right; color: #667eea; font-size: 18px;">${stats.newWorkflows}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0;"><strong>Active Users</strong></td>
                <td style="padding: 10px 0; text-align: right; color: #667eea; font-size: 18px;">${stats.activeUsers}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default {
  startCronJobs,
  stopCronJobs,
};
