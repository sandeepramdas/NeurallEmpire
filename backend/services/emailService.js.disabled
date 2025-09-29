const nodemailer = require('nodemailer');

// Email service for NeurallEmpire
class EmailService {
    constructor() {
        this.transporter = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Create transporter
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            // Verify connection
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await this.transporter.verify();
                console.log('✅ Email service connected successfully');
            } else {
                console.log('⚠️  Email service not configured (missing credentials)');
            }
        } catch (error) {
            console.log('⚠️  Email service initialization failed:', error.message);
        }
    }

    async sendWelcomeEmail(user) {
        if (!this.transporter) {
            console.log('Email service not available - welcome email skipped');
            return { success: false, message: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'NeurallEmpire <noreply@neurallempire.com>',
                to: user.email,
                subject: 'Welcome to NeurallEmpire! 🧠👑',
                html: `
                    <h2>Welcome to NeurallEmpire, ${user.firstName}!</h2>
                    <p>Your empire awaits. Get ready to dominate with AI-powered marketing automation.</p>
                    <p>Your account has been successfully created.</p>
                    <p>Start building your empire: <a href="${process.env.FRONTEND_URL}">Login to Dashboard</a></p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Welcome email failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPaymentNotification(paymentData) {
        if (!this.transporter) {
            console.log('Email service not available - payment notification skipped');
            return { success: false, message: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'NeurallEmpire <noreply@neurallempire.com>',
                to: paymentData.email,
                subject: 'Payment Successful - Welcome to the Empire! 🎉',
                html: `
                    <h2>Payment Successful!</h2>
                    <p>Thank you for joining NeurallEmpire with the ${paymentData.plan} plan.</p>
                    <p><strong>Payment Details:</strong></p>
                    <ul>
                        <li>Plan: ${paymentData.plan}</li>
                        <li>Amount: $${paymentData.amount}</li>
                        <li>Payment ID: ${paymentData.paymentId}</li>
                    </ul>
                    <p>Your empire is ready! <a href="${process.env.FRONTEND_URL}">Access Dashboard</a></p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Payment notification failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendContactNotification(contactData) {
        if (!this.transporter) {
            console.log('Email service not available - contact notification skipped');
            return { success: false, message: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'NeurallEmpire <noreply@neurallempire.com>',
                to: process.env.EMAIL_USER || 'admin@neurallempire.com',
                subject: `New Contact Form Submission: ${contactData.subject}`,
                html: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>From:</strong> ${contactData.name} &lt;${contactData.email}&gt;</p>
                    ${contactData.company ? `<p><strong>Company:</strong> ${contactData.company}</p>` : ''}
                    ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
                    <p><strong>Subject:</strong> ${contactData.subject}</p>
                    <p><strong>Message:</strong></p>
                    <blockquote>${contactData.message}</blockquote>
                    <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Source:</strong> ${contactData.source}</p>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Contact notification failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();