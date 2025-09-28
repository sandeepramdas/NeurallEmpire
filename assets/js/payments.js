/* ===================================
   PAYMENTS MODULE
   =================================== */

const PaymentsModule = {
    init() {
        this.bindPaymentButtons();
        this.validateRazorpayScript();
    },

    validateRazorpayScript() {
        if (typeof Razorpay === 'undefined') {
            console.warn('Razorpay script not loaded. Payment functionality will be disabled.');
            this.disablePaymentButtons();
            return false;
        }
        return true;
    },

    bindPaymentButtons() {
        const paymentButtons = NeurallUtils.dom.selectAll('.payment-btn');

        paymentButtons.forEach(button => {
            NeurallUtils.dom.on(button, 'click', (e) => {
                e.preventDefault();
                this.handlePaymentClick(button);
            });
        });
    },

    handlePaymentClick(button) {
        if (!this.validateRazorpayScript()) {
            this.showPaymentError('Payment system is temporarily unavailable. Please try again later.');
            return;
        }

        const plan = button.getAttribute('data-plan');
        const amount = parseInt(button.getAttribute('data-amount'));
        const description = button.getAttribute('data-description');

        if (!plan || !amount || !description) {
            console.error('Missing payment data attributes');
            this.showPaymentError('Invalid payment configuration. Please contact support.');
            return;
        }

        // Show loading state
        this.setButtonLoading(button, true);

        // Prepare payment options
        const options = this.preparePaymentOptions(plan, amount, description, button);

        try {
            const rzp = new Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error('Error initializing Razorpay:', error);
            this.showPaymentError('Failed to initialize payment. Please try again.');
            this.setButtonLoading(button, false);
        }
    },

    preparePaymentOptions(plan, amount, description, button) {
        return {
            key: NEURALL_CONFIG.payment.razorpayKey,
            amount: amount,
            currency: NEURALL_CONFIG.payment.currency,
            name: NEURALL_CONFIG.payment.companyName,
            description: description,
            image: this.getCompanyLogo(),
            handler: (response) => this.handlePaymentSuccess(response, plan, amount, description, button),
            prefill: this.getPrefillData(),
            notes: {
                plan: plan,
                website: 'neurallempire.com',
                timestamp: new Date().toISOString()
            },
            theme: {
                color: NEURALL_CONFIG.payment.theme
            },
            modal: {
                ondismiss: () => this.handlePaymentDismiss(button),
                confirm_close: true,
                escape: true
            },
            retry: {
                enabled: true,
                max_count: 3
            }
        };
    },

    getCompanyLogo() {
        // Return base64 encoded brain emoji SVG for consistency
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🧠</text></svg>';
    },

    getPrefillData() {
        // Try to get data from contact form if available
        const contactForm = NeurallUtils.dom.select('#empireForm');
        const prefillData = {
            name: '',
            email: '',
            contact: ''
        };

        if (contactForm) {
            const nameField = contactForm.querySelector('[name="name"]');
            const emailField = contactForm.querySelector('[name="email"]');
            const phoneField = contactForm.querySelector('[name="phone"]');

            if (nameField && nameField.value) prefillData.name = nameField.value;
            if (emailField && emailField.value) prefillData.email = emailField.value;
            if (phoneField && phoneField.value) prefillData.contact = phoneField.value;
        }

        return prefillData;
    },

    handlePaymentSuccess(response, plan, amount, description, button) {
        console.log('Payment successful:', response);

        this.setButtonLoading(button, false);

        // Send payment notification email
        if (typeof NeurallEmailService !== 'undefined') {
            const paymentData = {
                plan: plan,
                amount: amount,
                paymentId: response.razorpay_payment_id,
                email: response.email || 'not provided',
                name: response.name || 'not provided'
            };

            NeurallEmailService.sendPaymentNotification(paymentData);
        }

        // Show success message
        const successMessage = `
            🎉 Payment Successful!

            Payment ID: ${response.razorpay_payment_id}
            Plan: ${plan.toUpperCase()}

            Welcome to NEURALLEMPIRE! Our AI agents will contact you within 24 hours to begin your empire.
        `;

        this.showPaymentSuccess(successMessage);

        // Send payment details to backend
        this.sendPaymentDataToServer({
            payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            plan: plan,
            amount: amount,
            description: description,
            timestamp: new Date().toISOString()
        });

        // Update button state
        this.setButtonSuccess(button);

        // Track conversion event (if analytics is available)
        this.trackConversion(plan, amount);
    },

    handlePaymentDismiss(button) {
        console.log('Payment cancelled by user');
        this.setButtonLoading(button, false);
    },

    async sendPaymentDataToServer(paymentData) {
        try {
            const response = await NeurallUtils.network.request('/api/payment-success', {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });

            console.log('Payment data sent to server:', response);
        } catch (error) {
            console.warn('Failed to send payment data to server:', error);
            // Don't show error to user as payment was successful
        }
    },

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `
                <span class="loading-spinner"></span>
                Processing...
            `;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Start Your Empire';
            button.classList.remove('loading');
        }
    },

    setButtonSuccess(button) {
        if (!button) return;

        button.textContent = '✓ Payment Successful';
        button.classList.add('success');
        button.disabled = true;

        // Reset button after 5 seconds
        setTimeout(() => {
            button.textContent = button.dataset.originalText || 'Start Your Empire';
            button.classList.remove('success');
            button.disabled = false;
        }, 5000);
    },

    showPaymentSuccess(message) {
        // Create a custom modal or use browser alert
        if (this.createPaymentModal) {
            this.createPaymentModal('success', message);
        } else {
            alert(message);
        }
    },

    showPaymentError(message) {
        // Create a custom modal or use browser alert
        if (this.createPaymentModal) {
            this.createPaymentModal('error', message);
        } else {
            alert(`Payment Error: ${message}`);
        }
    },

    disablePaymentButtons() {
        const paymentButtons = NeurallUtils.dom.selectAll('.payment-btn');

        paymentButtons.forEach(button => {
            button.disabled = true;
            button.textContent = 'Payment Unavailable';
            button.classList.add('disabled');
        });
    },

    trackConversion(plan, amount) {
        // Google Analytics tracking (if available)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: `neurall_${Date.now()}`,
                value: amount / 100, // Convert cents to dollars
                currency: 'USD',
                items: [{
                    item_id: plan,
                    item_name: `${plan} Plan`,
                    category: 'AI Marketing Plan',
                    quantity: 1,
                    price: amount / 100
                }]
            });
        }

        // Facebook Pixel tracking (if available)
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Purchase', {
                value: amount / 100,
                currency: 'USD',
                content_name: `${plan} Plan`,
                content_category: 'AI Marketing Plan'
            });
        }

        console.log(`Conversion tracked: ${plan} plan, $${amount / 100}`);
    },

    // Optional: Create custom payment modal
    createPaymentModal(type, message) {
        // Remove existing modal
        const existingModal = NeurallUtils.dom.select('.payment-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = `payment-modal payment-modal--${type}`;
        modal.innerHTML = `
            <div class="payment-modal__overlay"></div>
            <div class="payment-modal__content">
                <div class="payment-modal__icon">
                    ${type === 'success' ? '🎉' : '❌'}
                </div>
                <div class="payment-modal__message">
                    ${message.replace(/\n/g, '<br>')}
                </div>
                <button class="payment-modal__close btn btn--primary">
                    ${type === 'success' ? 'Continue' : 'Try Again'}
                </button>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        document.body.appendChild(modal);

        // Close modal
        const closeBtn = modal.querySelector('.payment-modal__close');
        const overlay = modal.querySelector('.payment-modal__overlay');

        [closeBtn, overlay].forEach(element => {
            NeurallUtils.dom.on(element, 'click', () => {
                modal.remove();
            });
        });

        // Auto-close success modal after 10 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 10000);
        }
    }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PaymentsModule.init();
    });
} else {
    PaymentsModule.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentsModule;
} else if (typeof window !== 'undefined') {
    window.PaymentsModule = PaymentsModule;
}