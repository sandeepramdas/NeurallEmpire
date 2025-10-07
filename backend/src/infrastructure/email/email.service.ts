import sgMail from '@sendgrid/mail';
import { prisma } from '@/server';
import { captureException } from '@/config/sentry';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@neurallempire.com';
const FROM_NAME = process.env.FROM_NAME || 'NeurallEmpire';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✅ SendGrid email service initialized');
} else {
  console.log('⚠️  SendGrid API key not configured, email sending disabled');
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  organizationId: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  tags?: string[];
}

export class EmailService {
  /**
   * Send email immediately
   */
  static async send(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!SENDGRID_API_KEY) {
        console.log('📧 Email sending disabled (no API key):', options.subject);
        return { success: false, error: 'SendGrid not configured' };
      }

      const toArray = Array.isArray(options.to) ? options.to : [options.to];

      // Create email notification record
      const emailNotification = await prisma.emailNotification.create({
        data: {
          organizationId: options.organizationId,
          to: toArray,
          cc: options.cc || [],
          bcc: options.bcc || [],
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          replyTo: options.replyTo,
          subject: options.subject,
          body: options.text || '',
          bodyHtml: options.html,
          templateId: options.templateId,
          templateData: options.templateData,
          status: 'sending',
          priority: options.priority || 'normal',
          tags: options.tags || [],
          scheduledFor: options.scheduledFor,
        },
      });

      // Build SendGrid message
      const msg: sgMail.MailDataRequired = {
        to: toArray,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: options.subject,
        ...(options.text && { text: options.text }),
        ...(options.html && { html: options.html }),
        ...(options.cc && { cc: options.cc }),
        ...(options.bcc && { bcc: options.bcc }),
        ...(options.replyTo && { replyTo: options.replyTo }),
        ...(options.attachments && { attachments: options.attachments }),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      // Send via SendGrid
      const [response] = await sgMail.send(msg);

      // Update status
      await prisma.emailNotification.update({
        where: { id: emailNotification.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          providerId: response.headers['x-message-id'],
        },
      });

      console.log(`✅ Email sent to ${toArray.join(', ')}: ${options.subject}`);

      return {
        success: true,
        messageId: emailNotification.id,
      };
    } catch (error: any) {
      console.error('❌ Email send error:', error);
      captureException(error, { emailOptions: options });

      // Update status to failed
      try {
        await prisma.emailNotification.updateMany({
          where: {
            organizationId: options.organizationId,
            status: 'sending',
            subject: options.subject,
          },
          data: {
            status: 'failed',
            error: error.message,
            errorCode: error.code,
          },
        });
      } catch (dbError) {
        console.error('Failed to update email status:', dbError);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string,
    organizationId: string
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Welcome to NeurallEmpire! 🚀',
      html: this.getWelcomeEmailTemplate(firstName),
      organizationId,
      tags: ['welcome', 'onboarding'],
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    organizationId: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.send({
      to: email,
      subject: 'Reset Your Password',
      html: this.getPasswordResetTemplate(resetUrl),
      organizationId,
      tags: ['password-reset', 'security'],
    });
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(
    email: string,
    verificationToken: string,
    organizationId: string
  ): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await this.send({
      to: email,
      subject: 'Verify Your Email Address',
      html: this.getEmailVerificationTemplate(verifyUrl),
      organizationId,
      tags: ['email-verification'],
    });
  }

  /**
   * Send organization invite
   */
  static async sendOrganizationInvite(
    email: string,
    organizationName: string,
    inviteToken: string,
    organizationId: string
  ): Promise<void> {
    const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${inviteToken}`;

    await this.send({
      to: email,
      subject: `You've been invited to join ${organizationName}`,
      html: this.getOrganizationInviteTemplate(organizationName, inviteUrl),
      organizationId,
      tags: ['organization-invite'],
    });
  }

  // ==================== EMAIL TEMPLATES ====================

  private static getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to NeurallEmpire</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to NeurallEmpire!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${firstName},</p>

            <p style="font-size: 16px;">
              We're thrilled to have you on board! 🎉
            </p>

            <p style="font-size: 16px;">
              NeurallEmpire is your all-in-one platform for AI-powered business automation. Here's what you can do:
            </p>

            <ul style="font-size: 16px; line-height: 1.8;">
              <li>Create and deploy AI agents</li>
              <li>Automate workflows</li>
              <li>Manage your organization</li>
              <li>Track analytics and performance</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Get Started
              </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Need help? Check out our <a href="${process.env.FRONTEND_URL}/docs" style="color: #667eea;">documentation</a> or reach out to our support team.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} NeurallEmpire. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private static getPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

            <p style="font-size: 16px;">
              We received a request to reset your password. Click the button below to choose a new password:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              This link will expire in 1 hour for security reasons.
            </p>

            <p style="font-size: 14px; color: #666;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getEmailVerificationTemplate(verifyUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

            <p style="font-size: 16px;">
              Please verify your email address to complete your registration:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              This link will expire in 24 hours.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static getOrganizationInviteTemplate(organizationName: string, inviteUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Organization Invite</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>

            <p style="font-size: 16px;">
              You've been invited to join <strong>${organizationName}</strong> on NeurallEmpire.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Accept Invite
              </a>
            </div>

            <p style="font-size: 14px; color: #666;">
              This invitation will expire in 7 days.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}

export default EmailService;
