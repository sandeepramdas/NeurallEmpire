/* ===================================
   UTILITY FUNCTIONS
   =================================== */

const NeurallUtils = {
    // DOM Utilities
    dom: {
        // Safe querySelector
        select: (selector, parent = document) => {
            try {
                return parent.querySelector(selector);
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`, error);
                return null;
            }
        },

        // Safe querySelectorAll
        selectAll: (selector, parent = document) => {
            try {
                return Array.from(parent.querySelectorAll(selector));
            } catch (error) {
                console.warn(`Invalid selector: ${selector}`, error);
                return [];
            }
        },

        // Add event listener with error handling
        on: (element, event, handler, options = {}) => {
            if (!element || typeof handler !== 'function') return;

            try {
                element.addEventListener(event, handler, options);
            } catch (error) {
                console.error('Error adding event listener:', error);
            }
        },

        // Remove event listener
        off: (element, event, handler, options = {}) => {
            if (!element || typeof handler !== 'function') return;

            try {
                element.removeEventListener(event, handler, options);
            } catch (error) {
                console.error('Error removing event listener:', error);
            }
        },

        // Check if element is in viewport
        isInViewport: (element, threshold = 0) => {
            if (!element) return false;

            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const windowWidth = window.innerWidth || document.documentElement.clientWidth;

            return (
                rect.top >= -threshold &&
                rect.left >= -threshold &&
                rect.bottom <= windowHeight + threshold &&
                rect.right <= windowWidth + threshold
            );
        }
    },

    // Animation Utilities
    animation: {
        // Smooth scroll to element
        scrollTo: (target, duration = 800) => {
            const element = typeof target === 'string' ?
                NeurallUtils.dom.select(target) : target;

            if (!element) return;

            const start = window.pageYOffset;
            const elementTop = element.offsetTop - 100; // Account for fixed nav
            const distance = elementTop - start;
            const startTime = performance.now();

            const easeInOutQuart = (t) => {
                return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
            };

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeInOutQuart(progress);

                window.scrollTo(0, start + distance * easedProgress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        },

        // Animate number counter
        animateValue: (element, start, end, duration = 2000) => {
            if (!element) return;

            const range = end - start;
            const increment = range > 0 ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const value = Math.floor(start + range * progress);

                element.textContent = value.toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    const suffix = element.getAttribute('data-suffix') || '';
                    element.textContent = end.toLocaleString() + suffix;
                }
            };

            requestAnimationFrame(animate);
        },

        // Throttle function calls
        throttle: (func, delay) => {
            let timeoutId;
            let lastExecTime = 0;

            return function (...args) {
                const currentTime = Date.now();

                if (currentTime - lastExecTime > delay) {
                    func.apply(this, args);
                    lastExecTime = currentTime;
                } else {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        func.apply(this, args);
                        lastExecTime = Date.now();
                    }, delay - (currentTime - lastExecTime));
                }
            };
        },

        // Debounce function calls
        debounce: (func, delay) => {
            let timeoutId;

            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }
    },

    // Form Utilities
    form: {
        // Validate email
        isValidEmail: (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Validate phone number (Indian format)
        isValidPhone: (phone) => {
            const phoneRegex = /^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/;
            return phoneRegex.test(phone.replace(/\s/g, ''));
        },

        // Get form data as object
        getFormData: (form) => {
            if (!form) return {};

            const formData = new FormData(form);
            const data = {};

            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            return data;
        },

        // Show form validation error
        showError: (field, message) => {
            if (!field) return;

            field.classList.add('error');

            // Remove existing error message
            const existingError = field.parentNode.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }

            // Add new error message
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = message;
            errorElement.style.color = 'var(--error-color, #ff4444)';
            errorElement.style.fontSize = '14px';
            errorElement.style.marginTop = '5px';

            field.parentNode.appendChild(errorElement);
        },

        // Clear form validation errors
        clearErrors: (form) => {
            if (!form) return;

            const errorFields = form.querySelectorAll('.error');
            const errorMessages = form.querySelectorAll('.error-message');

            errorFields.forEach(field => field.classList.remove('error'));
            errorMessages.forEach(message => message.remove());
        }
    },

    // Storage Utilities
    storage: {
        // Set item in localStorage with error handling
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('Could not save to localStorage:', error);
                return false;
            }
        },

        // Get item from localStorage with error handling
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Could not read from localStorage:', error);
                return defaultValue;
            }
        },

        // Remove item from localStorage
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('Could not remove from localStorage:', error);
                return false;
            }
        }
    },

    // Network Utilities
    network: {
        // Simple fetch wrapper with error handling
        request: async (url, options = {}) => {
            try {
                const defaultOptions = {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: NEURALL_CONFIG.api.timeout
                };

                const config = { ...defaultOptions, ...options };
                const response = await fetch(url, config);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Network request failed:', error);
                throw error;
            }
        }
    },

    // Browser Utilities
    browser: {
        // Check if user prefers reduced motion
        prefersReducedMotion: () => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        // Check if user is on mobile device
        isMobile: () => {
            return window.innerWidth <= 768;
        },

        // Check if user is on touch device
        isTouchDevice: () => {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },

        // Get viewport dimensions
        getViewport: () => {
            return {
                width: window.innerWidth || document.documentElement.clientWidth,
                height: window.innerHeight || document.documentElement.clientHeight
            };
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeurallUtils;
} else if (typeof window !== 'undefined') {
    window.NeurallUtils = NeurallUtils;
}