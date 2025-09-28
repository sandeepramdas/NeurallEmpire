/* ===================================
   NEURALLEMPIRE SOCIAL AUTHENTICATION
   OAuth SSO Integration Module
   =================================== */

const NeurallSocialAuth = {
    // Configuration
    config: {
        apiBaseUrl: 'http://localhost:3001/api',
        providers: {
            google: {
                name: 'Google',
                icon: '🔍',
                color: '#4285F4',
                enabled: true
            },
            facebook: {
                name: 'Facebook',
                icon: '📘',
                color: '#1877F2',
                enabled: true
            },
            github: {
                name: 'GitHub',
                icon: '🐙',
                color: '#333333',
                enabled: true
            },
            linkedin: {
                name: 'LinkedIn',
                icon: '💼',
                color: '#0A66C2',
                enabled: true
            }
        }
    },

    // State management
    state: {
        isLoading: false,
        currentProvider: null,
        authWindow: null,
        authTimer: null
    },

    // Initialize social auth
    init() {
        console.log('🔐 Initializing Social Authentication...');

        // Add social login buttons to existing auth modals
        this.addSocialButtons();

        // Listen for OAuth callback messages
        this.setupMessageListener();

        // Handle OAuth success/error redirects
        this.handleOAuthRedirect();

        console.log('✅ Social Authentication initialized');
    },

    // Add social login buttons to auth modals
    addSocialButtons() {
        // Find login modal
        const loginModal = document.querySelector('#loginModal .auth-form-content');
        const signupModal = document.querySelector('#signupModal .auth-form-content');

        if (loginModal) {
            this.insertSocialButtons(loginModal, 'login');
        }

        if (signupModal) {
            this.insertSocialButtons(signupModal, 'signup');
        }

        // Also add to any standalone auth forms
        const authForms = document.querySelectorAll('.auth-form, .login-form, .signup-form');
        authForms.forEach(form => {
            if (!form.querySelector('.social-auth-section')) {
                this.insertSocialButtons(form, 'auth');
            }
        });
    },

    // Insert social buttons into form
    insertSocialButtons(container, type) {
        const title = type === 'login' ? 'Sign in with' : 'Sign up with';

        const socialSection = document.createElement('div');
        socialSection.className = 'social-auth-section';
        socialSection.innerHTML = `
            <div class="social-auth-divider">
                <span>or ${title.toLowerCase()}</span>
            </div>
            <div class="social-auth-buttons">
                ${this.generateSocialButtons()}
            </div>
        `;

        // Find the best insertion point
        const submitButton = container.querySelector('button[type="submit"], .auth-submit-btn');
        const formFooter = container.querySelector('.auth-form-footer, .form-footer');

        if (submitButton) {
            submitButton.parentNode.insertBefore(socialSection, submitButton);
        } else if (formFooter) {
            formFooter.parentNode.insertBefore(socialSection, formFooter);
        } else {
            container.appendChild(socialSection);
        }

        // Bind click events
        this.bindSocialButtonEvents(socialSection);
    },

    // Generate social login buttons HTML
    generateSocialButtons() {
        const buttons = Object.entries(this.config.providers)
            .filter(([_, provider]) => provider.enabled)
            .map(([key, provider]) => `
                <button
                    type="button"
                    class="social-auth-btn social-auth-btn--${key}"
                    data-provider="${key}"
                    style="border-color: ${provider.color}; color: ${provider.color};"
                >
                    <span class="social-auth-icon">${provider.icon}</span>
                    <span class="social-auth-text">${provider.name}</span>
                </button>
            `).join('');

        return buttons;
    },

    // Bind social button click events
    bindSocialButtonEvents(container) {
        const buttons = container.querySelectorAll('.social-auth-btn');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const provider = button.dataset.provider;
                this.initiateOAuth(provider);
            });
        });
    },

    // Initiate OAuth flow
    async initiateOAuth(provider) {
        if (this.state.isLoading) {
            return;
        }

        try {
            this.state.isLoading = true;
            this.state.currentProvider = provider;

            // Update button state
            this.setButtonLoading(provider, true);

            // Open OAuth popup
            const authUrl = `${this.config.apiBaseUrl}/auth/${provider}`;
            this.openOAuthPopup(authUrl, provider);

        } catch (error) {
            console.error('OAuth initiation failed:', error);
            this.showNotification('Failed to start authentication', 'error');
        } finally {
            this.state.isLoading = false;
            this.setButtonLoading(provider, false);
        }
    },

    // Open OAuth popup window
    openOAuthPopup(url, provider) {
        const width = 500;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const popup = window.open(
            url,
            `${provider}_oauth`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        this.state.authWindow = popup;

        // Check if popup was blocked
        if (!popup || popup.closed) {
            this.showNotification('Popup blocked. Please allow popups and try again.', 'error');
            return;
        }

        // Monitor popup for completion
        this.monitorOAuthPopup(popup, provider);
    },

    // Monitor OAuth popup for completion
    monitorOAuthPopup(popup, provider) {
        this.state.authTimer = setInterval(() => {
            try {
                if (popup.closed) {
                    this.handleOAuthComplete(null, 'User cancelled authentication');
                    return;
                }

                // Check if popup navigated to success/error page
                const currentUrl = popup.location.href;

                if (currentUrl.includes('/auth/success')) {
                    // Extract token from URL
                    const urlParams = new URLSearchParams(popup.location.search);
                    const token = urlParams.get('token');
                    const userData = urlParams.get('user');

                    if (token && userData) {
                        this.handleOAuthComplete({
                            token: token,
                            user: JSON.parse(decodeURIComponent(userData))
                        });
                    }
                } else if (currentUrl.includes('/auth/error')) {
                    const urlParams = new URLSearchParams(popup.location.search);
                    const error = urlParams.get('message') || 'Authentication failed';
                    this.handleOAuthComplete(null, error);
                }

            } catch (e) {
                // Cross-origin error - popup is still loading
                // This is expected during the OAuth flow
            }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
            if (popup && !popup.closed) {
                popup.close();
                this.handleOAuthComplete(null, 'Authentication timeout');
            }
        }, 5 * 60 * 1000);
    },

    // Handle OAuth completion
    handleOAuthComplete(data, error = null) {
        // Clear monitoring
        if (this.state.authTimer) {
            clearInterval(this.state.authTimer);
            this.state.authTimer = null;
        }

        // Close popup
        if (this.state.authWindow && !this.state.authWindow.closed) {
            this.state.authWindow.close();
        }

        this.state.authWindow = null;
        this.state.isLoading = false;

        if (error) {
            console.error('OAuth error:', error);
            this.showNotification(error, 'error');
            this.setButtonLoading(this.state.currentProvider, false);
            return;
        }

        if (data && data.token && data.user) {
            this.handleAuthSuccess(data);
        } else {
            this.showNotification('Authentication failed - invalid response', 'error');
            this.setButtonLoading(this.state.currentProvider, false);
        }

        this.state.currentProvider = null;
    },

    // Handle successful authentication
    handleAuthSuccess(authData) {
        console.log('🎉 Social authentication successful:', authData.user.email);

        // Store user data
        this.storeUserData(authData);

        // Close auth modals
        this.closeAuthModals();

        // Show success message
        this.showNotification(`Welcome back, ${authData.user.firstName}!`, 'success');

        // Update UI
        this.updateUserInterface(authData.user);

        // Trigger auth success event
        this.triggerAuthEvent('social-auth-success', authData);

        // Set button success state
        this.setButtonSuccess(this.state.currentProvider);
    },

    // Store user data in localStorage/sessionStorage
    storeUserData(authData) {
        const storage = localStorage; // Could be sessionStorage based on preference
        storage.setItem('neurall_current_user', JSON.stringify(authData.user));
        storage.setItem('neurall_auth_token', authData.token);
        storage.setItem('neurall_login_method', 'social');
    },

    // Update user interface after login
    updateUserInterface(user) {
        // Update navigation
        const loginBtn = document.querySelector('.auth-login-btn');
        const signupBtn = document.querySelector('.auth-signup-btn');
        const userMenu = document.querySelector('.user-menu');

        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';

        // Show user menu or create one
        if (!userMenu) {
            this.createUserMenu(user);
        } else {
            userMenu.style.display = 'block';
            this.updateUserMenu(user);
        }

        // Update any user-specific content
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = user.firstName || user.email;
        });
    },

    // Create user menu in navigation
    createUserMenu(user) {
        const nav = document.querySelector('.main-nav, .navbar, nav');
        if (!nav) return;

        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <div class="user-avatar">
                ${user.socialAuth?.profilePicture ?
                    `<img src="${user.socialAuth.profilePicture}" alt="${user.firstName}" class="avatar-img">` :
                    `<div class="avatar-placeholder">${user.firstName.charAt(0)}</div>`
                }
            </div>
            <div class="user-info">
                <span class="user-name">${user.firstName} ${user.lastName}</span>
                <span class="user-plan">${user.subscription?.plan || 'Free'}</span>
            </div>
            <div class="user-dropdown">
                <a href="#" class="dropdown-item" data-action="dashboard">Dashboard</a>
                <a href="#" class="dropdown-item" data-action="profile">Profile</a>
                <a href="#" class="dropdown-item" data-action="billing">Billing</a>
                <a href="#" class="dropdown-item" data-action="logout">Logout</a>
            </div>
        `;

        nav.appendChild(userMenu);

        // Bind dropdown events
        this.bindUserMenuEvents(userMenu);
    },

    // Update existing user menu
    updateUserMenu(user) {
        const userName = document.querySelector('.user-menu .user-name');
        const userPlan = document.querySelector('.user-menu .user-plan');
        const avatar = document.querySelector('.user-menu .user-avatar');

        if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
        if (userPlan) userPlan.textContent = user.subscription?.plan || 'Free';

        if (avatar && user.socialAuth?.profilePicture) {
            avatar.innerHTML = `<img src="${user.socialAuth.profilePicture}" alt="${user.firstName}" class="avatar-img">`;
        }
    },

    // Bind user menu events
    bindUserMenuEvents(userMenu) {
        const dropdownItems = userMenu.querySelectorAll('.dropdown-item');

        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = item.dataset.action;

                switch (action) {
                    case 'dashboard':
                        this.showDashboard();
                        break;
                    case 'profile':
                        this.showProfile();
                        break;
                    case 'billing':
                        this.showBilling();
                        break;
                    case 'logout':
                        this.logout();
                        break;
                }
            });
        });
    },

    // Close auth modals
    closeAuthModals() {
        const modals = document.querySelectorAll('.auth-modal, #loginModal, #signupModal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('active', 'show');
        });
    },

    // Setup message listener for mobile apps
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data.type === 'OAUTH_SUCCESS') {
                this.handleOAuthComplete(event.data.data);
            } else if (event.data.type === 'OAUTH_ERROR') {
                this.handleOAuthComplete(null, event.data.error);
            }
        });
    },

    // Handle OAuth redirect (for mobile)
    handleOAuthRedirect() {
        const url = new URL(window.location.href);
        const pathname = url.pathname;

        if (pathname.includes('/auth/success')) {
            const token = url.searchParams.get('token');
            const userData = url.searchParams.get('user');

            if (token && userData) {
                try {
                    const user = JSON.parse(decodeURIComponent(userData));
                    this.handleAuthSuccess({ token, user });

                    // Clean up URL
                    window.history.replaceState({}, document.title, '/');
                } catch (error) {
                    console.error('Failed to parse OAuth success data:', error);
                }
            }
        } else if (pathname.includes('/auth/error')) {
            const error = url.searchParams.get('message') || 'Authentication failed';
            this.showNotification(error, 'error');

            // Clean up URL
            window.history.replaceState({}, document.title, '/');
        }
    },

    // UI Helper Methods
    setButtonLoading(provider, isLoading) {
        const button = document.querySelector(`[data-provider="${provider}"]`);
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            button.innerHTML = `
                <span class="spinner"></span>
                <span class="social-auth-text">Connecting...</span>
            `;
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const providerConfig = this.config.providers[provider];
            button.innerHTML = `
                <span class="social-auth-icon">${providerConfig.icon}</span>
                <span class="social-auth-text">${providerConfig.name}</span>
            `;
        }
    },

    setButtonSuccess(provider) {
        const button = document.querySelector(`[data-provider="${provider}"]`);
        if (!button) return;

        button.classList.add('success');
        button.innerHTML = `
            <span class="social-auth-icon">✓</span>
            <span class="social-auth-text">Connected</span>
        `;

        setTimeout(() => {
            if (button) {
                button.classList.remove('success');
                const providerConfig = this.config.providers[provider];
                button.innerHTML = `
                    <span class="social-auth-icon">${providerConfig.icon}</span>
                    <span class="social-auth-text">${providerConfig.name}</span>
                `;
            }
        }, 2000);
    },

    showNotification(message, type = 'info') {
        // Use existing notification system or create simple one
        if (window.NeurallAuth && typeof window.NeurallAuth.showNotification === 'function') {
            window.NeurallAuth.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message); // Replace with better notification in production
        }
    },

    triggerAuthEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    },

    // Navigation methods (to be integrated with existing dashboard)
    showDashboard() {
        if (window.NeurallAuth && typeof window.NeurallAuth.showDashboard === 'function') {
            window.NeurallAuth.showDashboard();
        }
    },

    showProfile() {
        console.log('Show profile page');
    },

    showBilling() {
        console.log('Show billing page');
    },

    logout() {
        if (window.NeurallAuth && typeof window.NeurallAuth.logout === 'function') {
            window.NeurallAuth.logout();
        } else {
            // Fallback logout
            localStorage.removeItem('neurall_current_user');
            localStorage.removeItem('neurall_auth_token');
            sessionStorage.removeItem('neurall_current_user');
            window.location.reload();
        }
    }
};

// Add CSS styles for social buttons
const socialAuthStyles = `
    .social-auth-section {
        margin: 20px 0;
    }

    .social-auth-divider {
        position: relative;
        text-align: center;
        margin: 20px 0;
    }

    .social-auth-divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e5e7eb;
    }

    .social-auth-divider span {
        background: white;
        padding: 0 15px;
        color: #6b7280;
        font-size: 14px;
    }

    .social-auth-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 15px;
    }

    .social-auth-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 15px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
    }

    .social-auth-btn:hover {
        background: #f9fafb;
        transform: translateY(-1px);
    }

    .social-auth-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .social-auth-btn.loading {
        pointer-events: none;
    }

    .social-auth-btn.success {
        background: #10b981;
        color: white;
        border-color: #10b981;
    }

    .social-auth-icon {
        font-size: 16px;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .user-menu {
        display: flex;
        align-items: center;
        gap: 10px;
        position: relative;
    }

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
    }

    .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        background: #6366f1;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
    }

    @media (max-width: 768px) {
        .social-auth-buttons {
            grid-template-columns: 1fr;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = socialAuthStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NeurallSocialAuth.init();
    });
} else {
    NeurallSocialAuth.init();
}

// Export for global access
window.NeurallSocialAuth = NeurallSocialAuth;