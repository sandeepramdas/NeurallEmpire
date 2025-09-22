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
            this.initializeModule('Navigation', NavigationModule),
            this.initializeModule('Animations', AnimationsModule),

            // Feature modules
            this.initializeModule('Forms', FormsModule),
            this.initializeModule('Payments', PaymentsModule),
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
        if (FormsModule && FormsModule.retryFailedSubmissions) {
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
        const modules = [NavigationModule, AnimationsModule, FormsModule, PaymentsModule];

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

        // Show fallback UI
        const fallback = document.createElement('div');
        fallback.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--dark-grey);
                color: var(--white);
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                z-index: 10000;
            ">
                <h3>🧠 NEURALLEMPIRE</h3>
                <p>Something went wrong. Please refresh the page.</p>
                <button onclick="window.location.reload()" style="
                    background: var(--empire-gold);
                    color: var(--neural-black);
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 15px;
                ">Refresh Page</button>
            </div>
        `;

        document.body.appendChild(fallback);
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
        const modules = [NavigationModule, AnimationsModule, FormsModule, PaymentsModule];
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