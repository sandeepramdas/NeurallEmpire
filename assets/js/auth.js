/* ===================================
   AUTHENTICATION MODULE
   =================================== */

const NeurallAuth = {
    currentUser: null,

    init() {
        console.log('🔐 Initializing authentication system...');

        this.bindEvents();
        this.checkExistingSession();
        this.updateUI();

        console.log('🔐 Authentication system initialized');
    },

    bindEvents() {
        // Navigation buttons
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) loginBtn.addEventListener('click', () => this.showModal('login'));
        if (signupBtn) signupBtn.addEventListener('click', () => this.showModal('signup'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Modal controls
        this.bindModalEvents('login');
        this.bindModalEvents('signup');
        this.bindModalEvents('dashboard');

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));

        // Form switching
        const switchToSignup = document.getElementById('switchToSignup');
        const switchToLogin = document.getElementById('switchToLogin');

        if (switchToSignup) switchToSignup.addEventListener('click', () => {
            this.hideModal('login');
            this.showModal('signup');
        });

        if (switchToLogin) switchToLogin.addEventListener('click', () => {
            this.hideModal('signup');
            this.showModal('login');
        });

        // Password strength checker
        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) {
            signupPassword.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }

        // Real-time validation
        this.bindFormValidation();
    },

    bindModalEvents(modalType) {
        const modal = document.getElementById(`${modalType}Modal`);
        const overlay = document.getElementById(`${modalType}Overlay`);
        const closeBtn = document.getElementById(`${modalType}Close`);

        if (overlay) overlay.addEventListener('click', () => this.hideModal(modalType));
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(modalType));

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('auth-modal--active')) {
                this.hideModal(modalType);
            }
        });
    },

    bindFormValidation() {
        // Real-time email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateEmail(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Password confirmation
        const confirmPassword = document.getElementById('signupConfirmPassword');
        const password = document.getElementById('signupPassword');

        if (confirmPassword && password) {
            confirmPassword.addEventListener('blur', () => {
                this.validatePasswordMatch(password.value, confirmPassword.value);
            });
        }
    },

    showModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) {
            modal.classList.add('auth-modal--active');
            document.body.style.overflow = 'hidden';

            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    },

    hideModal(type) {
        const modal = document.getElementById(`${type}Modal`);
        if (modal) {
            modal.classList.remove('auth-modal--active');
            document.body.style.overflow = '';

            // Clear form
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                this.clearAllErrors(form);
            }
        }
    },

    async handleLogin(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember');

        // Clear previous errors
        this.clearAllErrors(form);

        // Validate inputs
        if (!this.validateLoginForm(email, password)) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('.auth-form__submit');
        this.setButtonLoading(submitBtn, true, 'Logging in...');

        try {
            // Simulate authentication (replace with real backend call)
            const user = await this.authenticateUser(email, password);

            if (user) {
                this.setCurrentUser(user, remember);
                this.hideModal('login');
                this.updateUI();
                this.showWelcomeMessage(user);

                // Send login notification email
                if (typeof NeurallEmailService !== 'undefined') {
                    NeurallEmailService.sendLoginNotification?.(user);
                }
            } else {
                this.showError('loginPassword', 'Invalid email or password');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginPassword', 'Login failed. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, false, 'Login to Empire');
        }
    },

    async handleSignup(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            company: formData.get('company'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            terms: formData.get('terms'),
            newsletter: formData.get('newsletter')
        };

        // Clear previous errors
        this.clearAllErrors(form);

        // Validate inputs
        if (!this.validateSignupForm(userData)) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('.auth-form__submit');
        this.setButtonLoading(submitBtn, true, 'Creating Empire...');

        try {
            // Create user account (replace with real backend call)
            const user = await this.createUser(userData);

            if (user) {
                this.setCurrentUser(user, false);
                this.hideModal('signup');
                this.updateUI();
                this.showWelcomeMessage(user, true);

                // Send welcome email and admin notification
                if (typeof NeurallEmailService !== 'undefined') {
                    NeurallEmailService.sendWelcomeEmail?.(user);
                    NeurallEmailService.sendNewUserNotification?.(user);
                }
            }

        } catch (error) {
            console.error('Signup error:', error);

            if (error.message.includes('email')) {
                this.showError('signupEmail', 'Email already exists');
            } else {
                this.showError('signupEmail', 'Signup failed. Please try again.');
            }
        } finally {
            this.setButtonLoading(submitBtn, false, 'Create Empire Account');
        }
    },

    async authenticateUser(email, password) {
        // Try Supabase authentication first
        if (typeof SupabaseService !== 'undefined' && SupabaseService.isAvailable()) {
            try {
                console.log('🔐 Authenticating with Supabase...');

                const { user, session } = await SupabaseService.auth.signIn(email, password);

                if (user) {
                    // Get user profile data
                    const profile = await SupabaseService.profiles.get(user.id);

                    return {
                        id: user.id,
                        email: user.email,
                        firstName: profile?.first_name || user.user_metadata?.first_name,
                        lastName: profile?.last_name || user.user_metadata?.last_name,
                        company: profile?.company,
                        joinDate: user.created_at,
                        lastLogin: new Date().toISOString(),
                        subscription: {
                            plan: profile?.subscription_plan || 'none',
                            status: profile?.subscription_status || 'none'
                        }
                    };
                }

                return null;

            } catch (error) {
                console.error('Supabase authentication failed:', error);
                throw new Error(error.message || 'Authentication failed');
            }
        }

        // Fallback to localStorage (demo mode)
        console.log('🔐 Using localStorage authentication (demo mode)...');
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('neurall_users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);

                if (user) {
                    resolve({
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        company: user.company,
                        joinDate: user.joinDate,
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    resolve(null);
                }
            }, 1500);
        });
    },

    async createUser(userData) {
        // Try Supabase user creation first
        if (typeof SupabaseService !== 'undefined' && SupabaseService.isAvailable()) {
            try {
                console.log('🔐 Creating user with Supabase...');

                const { user, session } = await SupabaseService.auth.signUp(
                    userData.email,
                    userData.password,
                    {
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        company: userData.company,
                        newsletter: userData.newsletter || false,
                        ipAddress: this.getClientIP(),
                        userAgent: navigator.userAgent,
                        referralSource: document.referrer || 'direct'
                    }
                );

                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        company: userData.company,
                        joinDate: user.created_at
                    };
                }

                throw new Error('User creation failed');

            } catch (error) {
                console.error('Supabase user creation failed:', error);
                throw new Error(error.message || 'Registration failed');
            }
        }

        // Fallback to localStorage (demo mode)
        console.log('🔐 Using localStorage user creation (demo mode)...');
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('neurall_users') || '[]');

                // Check if email already exists
                if (users.find(u => u.email === userData.email)) {
                    reject(new Error('Email already exists'));
                    return;
                }

                const newUser = {
                    id: 'user_' + Date.now(),
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    company: userData.company,
                    password: userData.password,
                    joinDate: new Date().toISOString(),
                    newsletter: userData.newsletter || false,
                    plan: null,
                    status: 'active'
                };

                users.push(newUser);
                localStorage.setItem('neurall_users', JSON.stringify(users));

                resolve({
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    company: newUser.company,
                    joinDate: newUser.joinDate
                });
            }, 2000);
        });
    },

    setCurrentUser(user, remember = false) {
        this.currentUser = user;

        // Store in appropriate storage
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('neurall_current_user', JSON.stringify(user));

        if (remember) {
            localStorage.setItem('neurall_remember_user', 'true');
        }
    },

    checkExistingSession() {
        // Check for remembered user
        const rememberedUser = localStorage.getItem('neurall_current_user');
        const rememberFlag = localStorage.getItem('neurall_remember_user');

        if (rememberedUser && rememberFlag) {
            this.currentUser = JSON.parse(rememberedUser);
            return;
        }

        // Check session storage
        const sessionUser = sessionStorage.getItem('neurall_current_user');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
        }
    },

    async logout() {
        // Try Supabase logout first
        if (typeof SupabaseService !== 'undefined' && SupabaseService.isAvailable()) {
            try {
                await SupabaseService.auth.signOut();
                console.log('🔐 Logged out from Supabase');
            } catch (error) {
                console.error('Supabase logout failed:', error);
            }
        }

        // Clear local state
        this.currentUser = null;
        localStorage.removeItem('neurall_current_user');
        localStorage.removeItem('neurall_remember_user');
        sessionStorage.removeItem('neurall_current_user');

        this.updateUI();
        this.showLogoutMessage();
    },

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            // Show user menu, hide auth buttons
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userName) userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;

            // Update user name click to show dashboard
            if (userName) {
                userName.style.cursor = 'pointer';
                userName.addEventListener('click', () => this.showDashboard());
            }
        } else {
            // Show auth buttons, hide user menu
            if (loginBtn) loginBtn.style.display = 'block';
            if (signupBtn) signupBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    },

    showDashboard() {
        if (!this.currentUser) return;

        this.generateDashboardContent();
        this.showModal('dashboard');
    },

    generateDashboardContent() {
        const dashboard = document.getElementById('userDashboard');
        if (!dashboard || !this.currentUser) return;

        const dashboardHTML = `
            <div class="dashboard__content">
                <div class="dashboard__header">
                    <div class="dashboard__user-info">
                        <h3>Welcome back, ${this.currentUser.firstName}!</h3>
                        <p class="dashboard__user-meta">Empire Member since ${new Date(this.currentUser.joinDate).toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="dashboard__stats">
                    <div class="dashboard__stat">
                        <div class="dashboard__stat-value">0</div>
                        <div class="dashboard__stat-label">Active AI Agents</div>
                    </div>
                    <div class="dashboard__stat">
                        <div class="dashboard__stat-value">$0</div>
                        <div class="dashboard__stat-label">Revenue Generated</div>
                    </div>
                    <div class="dashboard__stat">
                        <div class="dashboard__stat-value">0</div>
                        <div class="dashboard__stat-label">Leads Captured</div>
                    </div>
                    <div class="dashboard__stat">
                        <div class="dashboard__stat-value">No Plan</div>
                        <div class="dashboard__stat-label">Current Plan</div>
                    </div>
                </div>

                <div class="dashboard__actions">
                    <button class="btn btn--primary" onclick="document.getElementById('dashboardClose').click(); document.querySelector('a[href=\\"#pricing\\"]').click();">
                        Choose Your Empire Plan
                    </button>
                    <button class="btn btn--outline" onclick="document.getElementById('dashboardClose').click(); document.querySelector('a[href=\\"#contact\\"]').click();">
                        Request Consultation
                    </button>
                </div>

                <div class="dashboard__recent">
                    <h4>Recent Activity</h4>
                    <div class="dashboard__activity">
                        <div class="dashboard__activity-item">
                            <span class="dashboard__activity-icon">🎉</span>
                            <span class="dashboard__activity-text">Welcome to NEURALLEMPIRE! Your empire awaits.</span>
                            <span class="dashboard__activity-time">${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        dashboard.innerHTML = dashboardHTML;
    },

    // Validation methods
    validateLoginForm(email, password) {
        let isValid = true;

        if (!email || !this.isValidEmail(email)) {
            this.showError('loginEmail', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password || password.length < 6) {
            this.showError('loginPassword', 'Password must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    },

    validateSignupForm(data) {
        let isValid = true;

        if (!data.firstName || data.firstName.length < 2) {
            this.showError('signupFirstName', 'First name must be at least 2 characters');
            isValid = false;
        }

        if (!data.lastName || data.lastName.length < 2) {
            this.showError('signupLastName', 'Last name must be at least 2 characters');
            isValid = false;
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            this.showError('signupEmail', 'Please enter a valid email address');
            isValid = false;
        }

        if (!data.password || data.password.length < 8) {
            this.showError('signupPassword', 'Password must be at least 8 characters');
            isValid = false;
        }

        if (data.password !== data.confirmPassword) {
            this.showError('signupConfirmPassword', 'Passwords do not match');
            isValid = false;
        }

        if (!data.terms) {
            this.showError('agreeTerms', 'You must agree to the Terms of Domination');
            isValid = false;
        }

        return isValid;
    },

    validateEmail(input) {
        if (!this.isValidEmail(input.value)) {
            this.showError(input.id, 'Please enter a valid email address');
            return false;
        }
        this.clearError(input);
        return true;
    },

    validatePasswordMatch(password, confirmPassword) {
        const confirmInput = document.getElementById('signupConfirmPassword');
        if (password !== confirmPassword) {
            this.showError('signupConfirmPassword', 'Passwords do not match');
            return false;
        }
        this.clearError(confirmInput);
        return true;
    },

    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        if (!strengthIndicator) return;

        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');

        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('One uppercase letter');

        if (/[a-z]/.test(password)) strength++;
        else feedback.push('One lowercase letter');

        if (/\d/.test(password)) strength++;
        else feedback.push('One number');

        if (/[^A-Za-z0-9]/.test(password)) strength++;
        else feedback.push('One special character');

        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = ['#ff4757', '#ff6b7a', '#ffa726', '#66bb6a', '#4caf50'];

        strengthIndicator.innerHTML = `
            <div class="password-strength-bar">
                <div class="password-strength-fill" style="width: ${(strength / 5) * 100}%; background: ${strengthColors[strength - 1] || '#ff4757'}"></div>
            </div>
            <div class="password-strength-text" style="color: ${strengthColors[strength - 1] || '#ff4757'}">
                ${strengthLevels[strength - 1] || 'Very Weak'}
                ${feedback.length > 0 ? ': ' + feedback.join(', ') : ''}
            </div>
        `;
    },

    // Utility methods
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId + 'Error');
        const inputElement = document.getElementById(fieldId);

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        if (inputElement) {
            inputElement.classList.add('auth-form__input--error');
        }
    },

    clearError(input) {
        const errorElement = document.getElementById(input.id + 'Error');

        if (errorElement) {
            errorElement.style.display = 'none';
        }

        input.classList.remove('auth-form__input--error');
    },

    clearAllErrors(form) {
        const errorElements = form.querySelectorAll('.auth-form__error');
        const inputElements = form.querySelectorAll('.auth-form__input');

        errorElements.forEach(el => el.style.display = 'none');
        inputElements.forEach(el => el.classList.remove('auth-form__input--error'));
    },

    setButtonLoading(button, isLoading, text = '') {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="loading-spinner loading-spinner--small"></span> ${text}`;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || text;
        }
    },

    showWelcomeMessage(user, isNewUser = false) {
        const message = isNewUser
            ? `🎉 Welcome to NEURALLEMPIRE, ${user.firstName}! Your empire account has been created successfully.`
            : `🧠 Welcome back, ${user.firstName}! Ready to dominate the market?`;

        this.showNotification(message, 'success');
    },

    showLogoutMessage() {
        this.showNotification('👋 Successfully logged out. Your empire awaits your return!', 'info');
    },

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification__content">
                <span class="notification__message">${message}</span>
                <button class="notification__close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('notification--show'), 100);

        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('notification--show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Manual close
        notification.querySelector('.notification__close').addEventListener('click', () => {
            notification.classList.remove('notification--show');
            setTimeout(() => notification.remove(), 300);
        });
    },

    // Supabase integration methods
    handleSupabaseAuth(session, profile) {
        if (session && session.user) {
            const user = {
                id: session.user.id,
                email: session.user.email,
                firstName: profile?.first_name || session.user.user_metadata?.first_name,
                lastName: profile?.last_name || session.user.user_metadata?.last_name,
                company: profile?.company,
                joinDate: session.user.created_at,
                lastLogin: new Date().toISOString(),
                subscription: {
                    plan: profile?.subscription_plan || 'none',
                    status: profile?.subscription_status || 'none'
                }
            };

            this.setCurrentUser(user, true);
            this.updateUI();
            console.log('🔐 Supabase auth state updated:', user.email);
        }
    },

    handleSupabaseSignOut() {
        this.currentUser = null;
        localStorage.removeItem('neurall_current_user');
        localStorage.removeItem('neurall_remember_user');
        sessionStorage.removeItem('neurall_current_user');
        this.updateUI();
        console.log('🔐 Supabase sign out handled');
    },

    // Helper methods
    getClientIP() {
        // This will be filled by the server or external service
        return 'unknown';
    },

    // Check if Supabase session exists
    async checkSupabaseSession() {
        if (typeof SupabaseService !== 'undefined' && SupabaseService.isAvailable()) {
            try {
                const session = await SupabaseService.auth.getCurrentSession();
                if (session && session.user) {
                    const profile = await SupabaseService.profiles.get(session.user.id);
                    this.handleSupabaseAuth(session, profile);
                    return true;
                }
            } catch (error) {
                console.error('Error checking Supabase session:', error);
            }
        }
        return false;
    },

    // Public API methods
    getCurrentUser() {
        return this.currentUser;
    },

    isLoggedIn() {
        return !!this.currentUser;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeurallAuth;
} else if (typeof window !== 'undefined') {
    window.NeurallAuth = NeurallAuth;
}