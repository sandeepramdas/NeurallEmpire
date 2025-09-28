/* ===================================
   MAIN APPLICATION ENTRY POINT
   =================================== */

const NeurallEmpireApp = {
    // Application state
    state: {
        isLoaded: false,
        modules: [],
        currentSection: 'home'
    },

    // Initialize the application
    async init() {
        console.log('🧠 NEURALLEMPIRE - Initializing AI Empire...');

        try {
            // Check browser compatibility
            this.checkBrowserCompatibility();

            // Initialize core modules
            await this.initializeModules();

            // Set up global event listeners
            this.setupGlobalEvents();

            // Mark as loaded
            this.state.isLoaded = true;

            console.log('✅ NEURALLEMPIRE - Initialization complete!');

        } catch (error) {
            console.error('❌ NEURALLEMPIRE - Initialization failed:', error);
            this.handleInitializationError(error);
        }
    },

    checkBrowserCompatibility() {
        const features = [
            'querySelector',
            'addEventListener',
            'fetch',
            'Promise',
            'IntersectionObserver'
        ];

        const missingFeatures = features.filter(feature => {
            if (feature === 'IntersectionObserver') {
                return !window.IntersectionObserver;
            }
            return !window[feature];
        });

        if (missingFeatures.length > 0) {
            console.warn('Browser compatibility issues detected:', missingFeatures);
            this.showCompatibilityWarning(missingFeatures);
        }
    },

    async initializeModules() {
        const moduleInitPromises = [
            // Core modules that should load first
            this.initializeModule('Navigation', typeof NavigationModule !== 'undefined' ? NavigationModule : null),
            this.initializeModule('Animations', typeof AnimationsModule !== 'undefined' ? AnimationsModule : null),
            this.initializeModule('Authentication', typeof NeurallAuth !== 'undefined' ? NeurallAuth : null),

            // Feature modules
            this.initializeModule('Forms', typeof FormsModule !== 'undefined' ? FormsModule : null),
            this.initializeModule('Payments', typeof NeurallPayments !== 'undefined' ? NeurallPayments : null),
        ];

        // Wait for all modules to initialize
        const results = await Promise.allSettled(moduleInitPromises);

        // Log any module initialization failures
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.warn(`Module ${index} failed to initialize:`, result.reason);
            }
        });
    },

    async initializeModule(name, module) {
        try {
            if (module && typeof module.init === 'function') {
                await module.init();
                this.state.modules.push(name);
                console.log(`✅ ${name} module initialized`);
            } else {
                console.warn(`⚠️ ${name} module not found or missing init method`);
            }
        } catch (error) {
            console.error(`❌ ${name} module initialization failed:`, error);
            throw error;
        }
    },

    setupGlobalEvents() {
        // Global error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

        // Performance monitoring
        window.addEventListener('load', this.trackPageLoadPerformance.bind(this));

        // Visibility change handling
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Resize handling with debouncing
        window.addEventListener('resize',
            NeurallUtils.animation.debounce(this.handleResize.bind(this), 250)
        );

        // Network status monitoring
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    },

    handleGlobalError(event) {
        console.error('Global error caught:', event.error);

        // Log error details for debugging
        const errorInfo = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Save error to localStorage for later analysis
        this.logError(errorInfo);

        // Prevent default browser error handling for our errors
        if (event.filename && event.filename.includes('neurallempire')) {
            event.preventDefault();
        }
    },

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);

        const errorInfo = {
            type: 'unhandledrejection',
            reason: event.reason,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.logError(errorInfo);

        // Prevent default handling
        event.preventDefault();
    },

    logError(errorInfo) {
        try {
            const errors = NeurallUtils.storage.get('neurall_errors', []);
            errors.push(errorInfo);

            // Keep only last 50 errors
            if (errors.length > 50) {
                errors.splice(0, errors.length - 50);
            }

            NeurallUtils.storage.set('neurall_errors', errors);
        } catch (storageError) {
            console.warn('Failed to log error to storage:', storageError);
        }
    },

    trackPageLoadPerformance() {
        if (!window.performance || !window.performance.timing) return;

        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;

        console.log(`📊 Performance metrics:
            - Page load time: ${loadTime}ms
            - DOM ready time: ${domReadyTime}ms
        `);

        // Log performance data
        const performanceData = {
            loadTime,
            domReadyTime,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        NeurallUtils.storage.set('neurall_performance', performanceData);
    },

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('🔇 Page hidden - pausing animations');
            this.pauseAnimations();
        } else {
            console.log('👁️ Page visible - resuming animations');
            this.resumeAnimations();
        }
    },

    handleResize() {
        const viewport = NeurallUtils.browser.getViewport();
        console.log(`📐 Viewport resized: ${viewport.width}x${viewport.height}`);

        // Broadcast resize event to modules
        this.broadcastToModules('resize', viewport);
    },

    handleOnline() {
        console.log('🌐 Connection restored');
        this.showConnectionStatus('online');

        // Retry any failed network requests
        if (typeof FormsModule !== 'undefined' && FormsModule && FormsModule.retryFailedSubmissions) {
            FormsModule.retryFailedSubmissions();
        }
    },

    handleOffline() {
        console.log('📵 Connection lost');
        this.showConnectionStatus('offline');
    },

    pauseAnimations() {
        document.body.classList.add('animations-paused');
    },

    resumeAnimations() {
        document.body.classList.remove('animations-paused');
    },

    broadcastToModules(event, data) {
        // Notify all modules of global events
        const modules = [
            typeof NavigationModule !== 'undefined' ? NavigationModule : null,
            typeof AnimationsModule !== 'undefined' ? AnimationsModule : null,
            typeof FormsModule !== 'undefined' ? FormsModule : null,
            typeof NeurallPayments !== 'undefined' ? NeurallPayments : null
        ].filter(module => module !== null);

        modules.forEach(module => {
            if (module && typeof module.handleGlobalEvent === 'function') {
                try {
                    module.handleGlobalEvent(event, data);
                } catch (error) {
                    console.warn('Module failed to handle global event:', error);
                }
            }
        });
    },

    showConnectionStatus(status) {
        // Remove existing status
        const existingStatus = NeurallUtils.dom.select('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Show status for offline only
        if (status === 'offline') {
            const statusElement = document.createElement('div');
            statusElement.className = 'connection-status';
            statusElement.innerHTML = `
                <div class="connection-status__content">
                    📵 You're offline. Some features may not work.
                </div>
            `;

            statusElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff4444;
                color: white;
                padding: 10px;
                text-align: center;
                z-index: 10001;
                font-size: 14px;
            `;

            document.body.appendChild(statusElement);
        }
    },

    showCompatibilityWarning(missingFeatures) {
        const warning = document.createElement('div');
        warning.className = 'compatibility-warning';
        warning.innerHTML = `
            <div class="compatibility-warning__content">
                ⚠️ Your browser may not support all features.
                Consider updating for the best experience.
                <button class="compatibility-warning__close">×</button>
            </div>
        `;

        warning.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--dark-grey);
            color: var(--white);
            padding: 15px;
            border-radius: 10px;
            border: 1px solid var(--empire-gold);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
        `;

        document.body.appendChild(warning);

        // Close button
        const closeBtn = warning.querySelector('.compatibility-warning__close');
        if (closeBtn) {
            NeurallUtils.dom.on(closeBtn, 'click', () => {
                warning.remove();
            });
        }

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 10000);
    },

    handleInitializationError(error) {
        console.error('Failed to initialize NEURALLEMPIRE:', error);

        // Check if this is a network/API error (not a critical JavaScript error)
        const isNetworkError = error.message && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('api') ||
            error.message.includes('connection') ||
            error.message.includes('404') ||
            error.message.includes('500')
        );

        // Don't show popup for network errors - just log them
        if (isNetworkError) {
            console.warn('🌐 Network/API error detected - continuing without backend services:', error.message);
            return;
        }

        // Only show popup for critical JavaScript errors
        console.warn('⚠️ Non-critical initialization error - page will continue to work:', error.message);

        // Optional: Show a subtle notification instead of blocking popup
        this.showSubtleNotification('Some features may be limited due to network connectivity.');
    },

    showSubtleNotification(message) {
        // Create a subtle notification that doesn't block the UI
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 193, 7, 0.9);
            color: #000;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    },

    // Public API methods
    navigateToSection(sectionId) {
        if (NavigationModule && NavigationModule.navigateToSection) {
            NavigationModule.navigateToSection(sectionId);
        }
    },

    triggerAnimation(selector, type) {
        if (AnimationsModule && AnimationsModule.triggerAnimation) {
            AnimationsModule.triggerAnimation(selector, type);
        }
    },

    // Cleanup method for SPA scenarios
    destroy() {
        console.log('🧠 NEURALLEMPIRE - Cleaning up...');

        // Cleanup modules
        const modules = [
            typeof NavigationModule !== 'undefined' ? NavigationModule : null,
            typeof AnimationsModule !== 'undefined' ? AnimationsModule : null,
            typeof FormsModule !== 'undefined' ? FormsModule : null,
            typeof NeurallPayments !== 'undefined' ? NeurallPayments : null
        ].filter(module => module !== null);

        modules.forEach(module => {
            if (module && typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.warn('Module cleanup failed:', error);
                }
            }
        });

        // Remove global event listeners
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);

        this.state.isLoaded = false;
        this.state.modules = [];
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NeurallEmpireApp.init();
    });
} else {
    NeurallEmpireApp.init();
}

// Expose app to global scope for debugging
if (typeof window !== 'undefined') {
    window.NeurallEmpireApp = NeurallEmpireApp;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeurallEmpireApp;
}