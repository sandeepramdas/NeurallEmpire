/* ===================================
   NEURALLEMPIRE PAYMENTS MODULE v2.0
   Modern SaaS Payment Integration
   =================================== */

const NeurallPayments = {
    // Configuration
    config: {
        apiBaseUrl: 'https://www.neurallempire.com/api',
        razorpayScript: 'https://checkout.razorpay.com/v1/checkout.js',
        stripeScript: 'https://js.stripe.com/v3/',
        defaultGateway: 'razorpay', // 'razorpay' or 'stripe'
        currency: 'USD'
    },

    // State management
    state: {
        currentUser: null,
        isAuthenticated: false,
        loadingPayment: false,
        availablePlans: {},
        paymentGateway: null
    },

    // Initialize payment module
    async init() {
        console.log('🔄 Initializing NeurallEmpire Payments...');

        // Check authentication status
        this.checkAuthStatus();

        // Load available plans
        await this.loadPlans();

        // Load payment gateway scripts
        await this.loadPaymentGateways();

        // Bind payment events
        this.bindEvents();

        console.log('✅ Payments module initialized successfully');
    },

    // Check if user is authenticated
    checkAuthStatus() {
        const userData = localStorage.getItem('neurall_current_user') || sessionStorage.getItem('neurall_current_user');

        if (userData) {
            try {
                this.state.currentUser = JSON.parse(userData);
                this.state.isAuthenticated = true;
                console.log('👤 User authenticated:', this.state.currentUser.email);
            } catch (error) {
                console.error('Failed to parse user data:', error);
                this.clearAuthData();
            }
        }
    },

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('neurall_current_user');
        sessionStorage.removeItem('neurall_current_user');
        this.state.currentUser = null;
        this.state.isAuthenticated = false;
    },

    // Load available plans from backend
    async loadPlans() {
        try {
            const response = await this.apiRequest('/payments/plans', 'GET');

            if (response.success) {
                this.state.availablePlans = response.data;
                console.log('📋 Plans loaded:', this.state.availablePlans);
                this.updatePlanDisplay();
            }
        } catch (error) {
            console.warn('Backend not available, using default plans:', error.message);

            // Use default plan data when backend is unavailable
            this.state.availablePlans = {
                conqueror: {
                    name: 'Conqueror Plan',
                    price: 29.99,
                    description: 'Perfect for small businesses',
                    agentCount: 5,
                    features: ['5 AI Agents', 'Lead Generation', 'Email Automation', 'Basic Analytics']
                },
                emperor: {
                    name: 'Emperor Plan',
                    price: 79.99,
                    description: 'Ideal for growing companies',
                    agentCount: 15,
                    features: ['15 AI Agents', 'Advanced Lead Generation', 'Multi-channel Automation', 'Advanced Analytics', 'Priority Support']
                },
                overlord: {
                    name: 'Overlord Plan',
                    price: 199.99,
                    description: 'For enterprise domination',
                    agentCount: 50,
                    features: ['50 AI Agents', 'Enterprise Lead Generation', 'Custom Integrations', 'White-label Solutions', 'Dedicated Account Manager']
                }
            };
            this.updatePlanDisplay();
        }
    },

    // Update plan display on the page
    updatePlanDisplay() {
        const planElements = document.querySelectorAll('[data-plan]');

        planElements.forEach(element => {
            const planType = element.dataset.plan;
            const planData = this.state.availablePlans[planType];

            if (planData) {
                // Update price
                const priceElement = element.querySelector('.plan-price');
                if (priceElement) {
                    priceElement.textContent = `$${planData.price}`;
                }

                // Update features
                const featuresElement = element.querySelector('.plan-features');
                if (featuresElement && planData.features) {
                    featuresElement.innerHTML = planData.features
                        .map(feature => `<li>✓ ${feature}</li>`)
                        .join('');
                }

                // Update button
                const button = element.querySelector('.payment-btn');
                if (button) {
                    button.dataset.amount = planData.price;
                    button.dataset.description = planData.description;
                }
            }
        });
    },

    // Load payment gateway scripts
    async loadPaymentGateways() {
        const promises = [];

        // Load Razorpay
        if (!window.Razorpay) {
            promises.push(this.loadScript(this.config.razorpayScript, 'Razorpay'));
        }

        // Load Stripe
        if (!window.Stripe) {
            promises.push(this.loadScript(this.config.stripeScript, 'Stripe'));
        }

        try {
            await Promise.all(promises);
            console.log('💳 Payment gateways loaded successfully');
        } catch (error) {
            console.error('Failed to load payment gateways:', error);
        }
    },

    // Load external script
    loadScript(src, globalVar) {
        return new Promise((resolve, reject) => {
            if (window[globalVar]) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                if (window[globalVar]) {
                    resolve();
                } else {
                    reject(new Error(`${globalVar} not found after script load`));
                }
            };

            script.onerror = () => reject(new Error(`Failed to load ${src}`));

            document.head.appendChild(script);
        });
    },

    // Bind payment events
    bindEvents() {
        // Payment buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.payment-btn') || e.target.closest('.payment-btn')) {
                e.preventDefault();
                const button = e.target.matches('.payment-btn') ? e.target : e.target.closest('.payment-btn');
                this.handlePaymentClick(button);
            }
        });

        // Gateway selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('[name="payment-gateway"]')) {
                this.config.defaultGateway = e.target.value;
            }
        });
    },

    // Handle payment button click
    async handlePaymentClick(button) {
        // Check authentication
        if (!this.state.isAuthenticated) {
            this.showAuthModal();
            return;
        }

        // Prevent double clicks
        if (this.state.loadingPayment) {
            return;
        }

        const plan = button.dataset.plan;
        const gateway = button.dataset.gateway || this.config.defaultGateway;

        if (!plan) {
            this.showNotification('Invalid plan selected', 'error');
            return;
        }

        try {
            this.state.loadingPayment = true;
            this.setButtonLoading(button, true);

            // Create payment order
            const orderData = await this.createPaymentOrder(plan, gateway);

            if (orderData.success) {
                // Initialize payment gateway
                if (gateway === 'razorpay') {
                    await this.initializeRazorpay(orderData.data, button);
                } else if (gateway === 'stripe') {
                    await this.initializeStripe(orderData.data, button);
                }
            } else {
                throw new Error(orderData.error || 'Failed to create payment order');
            }

        } catch (error) {
            console.error('Payment initialization failed:', error);

            // Check if this is a backend connectivity issue
            if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
                this.showNotification('Payment system temporarily unavailable. Please try again later or contact support.', 'error');

                // Optionally show fallback contact information
                this.showPaymentFallbackModal(plan);
            } else {
                this.showNotification(error.message || 'Payment failed to initialize', 'error');
            }
        } finally {
            this.state.loadingPayment = false;
            this.setButtonLoading(button, false);
        }
    },

    showPaymentFallbackModal(plan) {
        this.showModal(
            'Payment System Temporarily Unavailable',
            `We're experiencing temporary connectivity issues with our payment system.

            To proceed with the ${plan} plan, please:
            • Contact our sales team directly
            • Email: sales@neurallempire.com
            • Phone: +1 (555) 123-4567

            We'll process your subscription manually and get you started within 24 hours.`,
            'info'
        );
    },

    // Create payment order
    async createPaymentOrder(plan, gateway) {
        const requestData = {
            plan: plan,
            currency: this.config.currency,
            gateway: gateway
        };

        return await this.apiRequest('/payments/create-order', 'POST', requestData);
    },

    // Initialize Razorpay payment
    async initializeRazorpay(orderData, button) {
        if (!window.Razorpay) {
            throw new Error('Razorpay not loaded');
        }

        const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: orderData.name || 'NeurallEmpire',
            description: orderData.planDetails.description,
            image: orderData.image || '/assets/images/logo.png',
            order_id: orderData.orderId,

            prefill: {
                name: `${this.state.currentUser.firstName} ${this.state.currentUser.lastName}`,
                email: this.state.currentUser.email,
                contact: this.state.currentUser.phone || ''
            },

            theme: {
                color: orderData.theme?.color || '#6366f1'
            },

            handler: (response) => {
                this.handlePaymentSuccess(response, orderData, button);
            },

            modal: {
                ondismiss: () => {
                    this.handlePaymentDismiss(button);
                }
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    },

    // Initialize Stripe payment
    async initializeStripe(orderData, button) {
        if (!window.Stripe) {
            throw new Error('Stripe not loaded');
        }

        const stripe = Stripe(orderData.publishableKey);

        const { error } = await stripe.confirmCardPayment(orderData.clientSecret, {
            payment_method: {
                card: {
                    // This would typically be a Stripe Elements card
                    // For now, this is a simplified version
                },
                billing_details: {
                    name: `${this.state.currentUser.firstName} ${this.state.currentUser.lastName}`,
                    email: this.state.currentUser.email,
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        } else {
            // Payment succeeded
            this.handlePaymentSuccess({
                payment_intent: orderData.orderId
            }, orderData, button);
        }
    },

    // Handle payment success
    async handlePaymentSuccess(paymentResponse, orderData, button) {
        try {
            // Verify payment with backend
            const verificationData = {
                paymentId: paymentResponse.razorpay_payment_id || paymentResponse.payment_intent,
                orderId: paymentResponse.razorpay_order_id || orderData.orderId,
                signature: paymentResponse.razorpay_signature,
                gateway: orderData.gateway
            };

            const verification = await this.apiRequest('/payments/verify', 'POST', verificationData);

            if (verification.success) {
                // Update user subscription in local storage
                if (this.state.currentUser) {
                    this.state.currentUser.subscription = verification.data.subscription;
                    this.updateStoredUserData();
                }

                // Show success message
                this.showPaymentSuccess(orderData.planDetails, verification.data);

                // Update UI
                this.setButtonSuccess(button);

                // Track conversion
                this.trackConversion(orderData.planDetails, orderData.amount);

            } else {
                throw new Error(verification.error || 'Payment verification failed');
            }

        } catch (error) {
            console.error('Payment verification failed:', error);
            this.showNotification('Payment verification failed. Please contact support.', 'error');
        }
    },

    // Handle payment dismissal
    handlePaymentDismiss(button) {
        this.setButtonLoading(button, false);
        this.showNotification('Payment cancelled', 'info');
    },

    // Update stored user data
    updateStoredUserData() {
        const userDataKey = localStorage.getItem('neurall_current_user') ? 'neurall_current_user' : 'neurall_current_user';
        const storage = localStorage.getItem('neurall_current_user') ? localStorage : sessionStorage;

        storage.setItem(userDataKey, JSON.stringify(this.state.currentUser));
    },

    // Show authentication modal
    showAuthModal() {
        this.showNotification('Please sign in to purchase a plan', 'info');

        // Trigger auth modal if available
        if (window.NeurallAuth && typeof window.NeurallAuth.showLoginModal === 'function') {
            window.NeurallAuth.showLoginModal();
        }
    },

    // API request helper
    async apiRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // Add authorization header if user is authenticated
        if (this.state.isAuthenticated && this.state.currentUser.token) {
            options.headers['Authorization'] = `Bearer ${this.state.currentUser.token}`;
        }

        // Add request body for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    },

    // UI Helper Methods
    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `
                <span class="spinner"></span>
                Processing...
            `;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Choose Plan';
            button.classList.remove('loading');
        }
    },

    setButtonSuccess(button) {
        if (!button) return;

        button.textContent = '✓ Payment Successful';
        button.classList.add('success');
        button.disabled = true;

        setTimeout(() => {
            button.textContent = 'Subscribed';
            button.classList.remove('success');
            button.classList.add('subscribed');
        }, 3000);
    },

    showPaymentSuccess(planDetails, paymentData) {
        const message = `
            🎉 Welcome to ${planDetails.name}!

            Your subscription is now active and you have access to ${planDetails.agentCount} AI agents.

            Payment ID: ${paymentData.paymentId}

            Check your dashboard to start building your empire!
        `;

        this.showModal('Payment Successful', message, 'success');
    },

    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.querySelector('.neurall-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'neurall-notification';
            document.body.appendChild(notification);
        }

        notification.className = `neurall-notification neurall-notification--${type}`;
        notification.textContent = message;
        notification.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    },

    showModal(title, message, type = 'info') {
        // Remove existing modal
        const existingModal = document.querySelector('.neurall-payment-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = `neurall-payment-modal neurall-payment-modal--${type}`;
        modal.innerHTML = `
            <div class="neurall-payment-modal__backdrop"></div>
            <div class="neurall-payment-modal__content">
                <div class="neurall-payment-modal__header">
                    <h3>${title}</h3>
                    <button class="neurall-payment-modal__close">&times;</button>
                </div>
                <div class="neurall-payment-modal__body">
                    ${message.replace(/\n/g, '<br>')}
                </div>
                <div class="neurall-payment-modal__footer">
                    <button class="btn btn--primary neurall-payment-modal__ok">
                        ${type === 'success' ? 'Go to Dashboard' : 'OK'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close events
        const closeBtn = modal.querySelector('.neurall-payment-modal__close');
        const okBtn = modal.querySelector('.neurall-payment-modal__ok');
        const backdrop = modal.querySelector('.neurall-payment-modal__backdrop');

        [closeBtn, okBtn, backdrop].forEach(element => {
            element.addEventListener('click', () => {
                modal.remove();

                // Redirect to dashboard on success
                if (type === 'success' && element === okBtn) {
                    // Trigger dashboard view if auth module is available
                    if (window.NeurallAuth && typeof window.NeurallAuth.showDashboard === 'function') {
                        window.NeurallAuth.showDashboard();
                    }
                }
            });
        });
    },

    trackConversion(planDetails, amount) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'purchase', {
                transaction_id: `neurall_${Date.now()}`,
                value: amount / 100,
                currency: this.config.currency,
                items: [{
                    item_id: planDetails.name.toLowerCase().replace(' ', '_'),
                    item_name: planDetails.name,
                    category: 'AI Marketing Plan',
                    quantity: 1,
                    price: amount / 100
                }]
            });
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Purchase', {
                value: amount / 100,
                currency: this.config.currency,
                content_name: planDetails.name,
                content_category: 'AI Marketing Plan'
            });
        }

        console.log(`🎯 Conversion tracked: ${planDetails.name}, $${amount / 100}`);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NeurallPayments.init();
    });
} else {
    NeurallPayments.init();
}

// Export for global access
window.NeurallPayments = NeurallPayments;