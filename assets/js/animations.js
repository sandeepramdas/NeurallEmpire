/* ===================================
   ANIMATIONS MODULE
   =================================== */

const AnimationsModule = {
    init() {
        this.setupIntersectionObserver();
        this.setupCounterAnimations();
        this.setupParallaxEffects();
        this.setupLoadingAnimation();
    },

    setupIntersectionObserver() {
        // Skip animations if user prefers reduced motion
        if (NeurallUtils.browser.prefersReducedMotion()) {
            this.showAllElements();
            return;
        }

        const observerOptions = {
            threshold: NEURALL_CONFIG.animations.observerThreshold,
            rootMargin: '0px 0px -100px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements that should fade in
        const elementsToAnimate = NeurallUtils.dom.selectAll(`
            .fade-in,
            .feature,
            .agent,
            .case,
            .pricing__card,
            .stat
        `);

        elementsToAnimate.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = `all ${NEURALL_CONFIG.animations.fadeInDuration}ms ease`;
            this.observer.observe(element);
        });
    },

    animateElement(element) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.classList.add('visible');

        // Add staggered animation delay for grid items
        const siblings = Array.from(element.parentNode.children);
        const index = siblings.indexOf(element);
        const delay = index * 100; // 100ms stagger

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    },

    showAllElements() {
        // Show all elements immediately for users who prefer reduced motion
        const elementsToShow = NeurallUtils.dom.selectAll(`
            .fade-in,
            .feature,
            .agent,
            .case,
            .pricing__card,
            .stat
        `);

        elementsToShow.forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
            element.classList.add('visible');
        });
    },

    setupCounterAnimations() {
        const statNumbers = NeurallUtils.dom.selectAll('.stat__number');

        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                    entry.target.classList.add('animated');
                    this.animateStatNumbers(entry.target.closest('.stats'));
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        const statsContainers = NeurallUtils.dom.selectAll('.stats');
        statsContainers.forEach(container => {
            statsObserver.observe(container);
        });
    },

    animateStatNumbers(statsContainer) {
        if (!statsContainer) return;

        const statNumbers = statsContainer.querySelectorAll('.stat__number');

        statNumbers.forEach(stat => {
            const text = stat.textContent;
            let end = parseInt(text.replace(/[^0-9]/g, ''));
            let suffix = '';

            // Determine suffix and adjust end value
            if (text.includes('+')) suffix = '+';
            if (text.includes('%')) suffix = '%';
            if (text.includes('$')) {
                if (text.includes('M')) {
                    suffix = 'M';
                } else {
                    suffix = '';
                }
            }
            if (text.includes('s')) suffix = 's';

            stat.setAttribute('data-suffix', suffix);

            if (!isNaN(end)) {
                NeurallUtils.animation.animateValue(
                    stat,
                    0,
                    end,
                    NEURALL_CONFIG.animations.counterDuration
                );
            }
        });
    },

    setupParallaxEffects() {
        // Skip parallax if user prefers reduced motion or is on mobile
        if (NeurallUtils.browser.prefersReducedMotion() || NeurallUtils.browser.isMobile()) {
            return;
        }

        const parallaxElements = [
            { selector: '.hero__content', multiplier: 0.5 },
            { selector: '.hero__background', multiplier: 0.3 }
        ];

        const handleParallax = NeurallUtils.animation.throttle(() => {
            const scrolled = window.pageYOffset;

            parallaxElements.forEach(({ selector, multiplier }) => {
                const element = NeurallUtils.dom.select(selector);
                if (element && scrolled < window.innerHeight) {
                    const yPos = scrolled * multiplier;
                    element.style.transform = `translateY(${yPos}px)`;

                    // Add opacity fade for hero content
                    if (selector === '.hero__content') {
                        const opacity = 1 - (scrolled / window.innerHeight);
                        element.style.opacity = Math.max(0, opacity);
                    }
                }
            });
        }, 16); // ~60fps

        window.addEventListener('scroll', handleParallax);
    },

    setupLoadingAnimation() {
        const loader = NeurallUtils.dom.select('.loader');
        if (!loader) return;

        // Hide loader after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('hidden');

                // Remove loader from DOM after animation
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 500);
            }, 1500);
        });
    },

    // Utility method to add entrance animation to new elements
    animateNewElement(element, delay = 0) {
        if (!element || NeurallUtils.browser.prefersReducedMotion()) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = `all ${NEURALL_CONFIG.animations.fadeInDuration}ms ease`;

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    },

    // Method to trigger specific animations
    triggerAnimation(elementSelector, animationType = 'fadeInUp') {
        const element = NeurallUtils.dom.select(elementSelector);
        if (!element) return;

        element.classList.add(`animate-${animationType}`);

        // Clean up animation class after completion
        setTimeout(() => {
            element.classList.remove(`animate-${animationType}`);
        }, 1000);
    },

    // Cleanup method
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AnimationsModule.init();
    });
} else {
    AnimationsModule.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationsModule;
} else if (typeof window !== 'undefined') {
    window.AnimationsModule = AnimationsModule;
}