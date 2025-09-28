/* ===================================
   EMAIL SERVICE MODULE
   =================================== */

const NeurallEmailService = {

    // Initialize EmailJS
    init() {
        if (typeof emailjs !== 'undefined' && NEURALL_CONFIG.emailjs.enabled) {
            emailjs.init(NEURALL_CONFIG.emailjs.publicKey);
            console.log('📧 EmailJS initialized successfully');
            return true;
        } else {
            console.warn('📧 EmailJS not available or not enabled');
            return false;
        }
    },

    // Send new lead notification email
    async sendLeadNotification(formData) {
        try {
            if (!NEURALL_CONFIG.emailjs.enabled) {
                console.warn('📧 EmailJS not enabled, skipping email notification');
                return { success: false, reason: 'EmailJS not enabled' };
            }

            // Prepare template parameters
            const templateParams = {
                to_email: NEURALL_CONFIG.contact.email,
                from_name: formData.name,
                from_email: formData.email,
                company: formData.company || 'Not specified',
                phone: formData.phone || 'Not provided',
                budget: formData.budget || 'Not specified',
                message: formData.message || 'No additional message',
                timestamp: new Date().toLocaleString(),
                source: 'NeurallEmpire Website',
                subject: `🧠 New Lead: ${formData.name} from ${formData.company || 'Unknown Company'}`,

                // Additional context
                lead_type: 'Website Contact Form',
                urgency: this.calculateUrgency(formData),
                lead_score: this.calculateLeadScore(formData)
            };

            // Send email via EmailJS
            const response = await emailjs.send(
                NEURALL_CONFIG.emailjs.serviceId,
                NEURALL_CONFIG.emailjs.templateId,
                templateParams
            );

            console.log('📧 Lead notification sent successfully:', response);
            return { success: true, response };

        } catch (error) {
            console.error('📧 Failed to send lead notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Send payment notification email
    async sendPaymentNotification(paymentData) {
        try {
            if (!NEURALL_CONFIG.emailjs.enabled) {
                console.warn('📧 EmailJS not enabled, skipping payment notification');
                return { success: false, reason: 'EmailJS not enabled' };
            }

            const templateParams = {
                to_email: NEURALL_CONFIG.contact.email,
                subject: `💰 New Payment: ${paymentData.plan} Plan - $${paymentData.amount / 100}`,
                payment_plan: paymentData.plan,
                payment_amount: `$${paymentData.amount / 100}`,
                customer_email: paymentData.email || 'Not provided',
                customer_name: paymentData.name || 'Unknown',
                timestamp: new Date().toLocaleString(),
                payment_id: paymentData.paymentId || 'N/A',
                source: 'NeurallEmpire Payment',

                // Payment context
                plan_details: this.getPlanDetails(paymentData.plan),
                revenue_impact: `$${paymentData.amount / 100} monthly recurring revenue`
            };

            const response = await emailjs.send(
                NEURALL_CONFIG.emailjs.serviceId,
                'payment_notification_template', // Separate template for payments
                templateParams
            );

            console.log('📧 Payment notification sent successfully:', response);
            return { success: true, response };

        } catch (error) {
            console.error('📧 Failed to send payment notification:', error);
            return { success: false, error: error.message };
        }
    },

    // Calculate lead urgency based on form data
    calculateUrgency(formData) {
        let urgency = 'Medium';

        // High urgency indicators
        if (formData.budget && parseInt(formData.budget.replace(/[^\d]/g, '')) >= 2400) {
            urgency = 'High';
        }

        if (formData.message && formData.message.toLowerCase().includes('urgent')) {
            urgency = 'High';
        }

        // Low urgency indicators
        if (formData.budget && parseInt(formData.budget.replace(/[^\d]/g, '')) < 600) {
            urgency = 'Low';
        }

        return urgency;
    },

    // Calculate lead score
    calculateLeadScore(formData) {
        let score = 50; // Base score

        // Budget scoring
        if (formData.budget) {
            const budgetValue = parseInt(formData.budget.replace(/[^\d]/g, ''));
            if (budgetValue >= 2400) score += 30;
            else if (budgetValue >= 1200) score += 20;
            else if (budgetValue >= 600) score += 10;
        }

        // Company provided
        if (formData.company && formData.company.trim()) score += 15;

        // Phone provided
        if (formData.phone && formData.phone.trim()) score += 10;

        // Message length and quality
        if (formData.message && formData.message.length > 50) score += 10;

        // Cap at 100
        return Math.min(score, 100);
    },

    // Get plan details for notifications
    getPlanDetails(planName) {
        const plan = NEURALL_CONFIG.plans[planName];
        if (!plan) return 'Unknown plan';

        return `${plan.name} Plan - ${plan.features.length} features included`;
    },

    // Send welcome email to new leads (optional)
    async sendWelcomeEmail(formData) {
        // This would send a welcome email to the customer
        // Implementation depends on having a customer-facing email template
        console.log('📧 Welcome email functionality ready for implementation');
    },

    // Fallback email sending using mailto (when EmailJS fails)
    fallbackEmailNotification(formData) {
        const subject = encodeURIComponent(`🧠 New Lead: ${formData.name} from NeurallEmpire`);
        const body = encodeURIComponent(`
New lead received from NeurallEmpire website:

Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || 'Not specified'}
Phone: ${formData.phone || 'Not provided'}
Budget: ${formData.budget || 'Not specified'}
Message: ${formData.message || 'No additional message'}

Timestamp: ${new Date().toLocaleString()}
Source: NeurallEmpire Contact Form
        `);

        const mailtoLink = `mailto:${NEURALL_CONFIG.contact.email}?subject=${subject}&body=${body}`;

        // Open default email client
        window.open(mailtoLink);

        console.log('📧 Fallback email notification triggered');
        return { success: true, method: 'mailto' };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeurallEmailService;
} else if (typeof window !== 'undefined') {
    window.NeurallEmailService = NeurallEmailService;
}