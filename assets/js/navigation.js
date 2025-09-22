/* ===================================
   NAVIGATION MODULE
   =================================== */

const NavigationModule = {
    init() {
        this.bindEvents();
        this.setupScrollEffect();
        this.setupSmoothScrolling();
        this.setupMobileMenu();
    },

    bindEvents() {
        // Scroll spy for active navigation links
        window.addEventListener('scroll',
            NeurallUtils.animation.throttle(this.handleScroll.bind(this), 100)
        );

        // Mobile menu toggle
        const mobileToggle = NeurallUtils.dom.select('.mobile-menu-toggle');
        if (mobileToggle) {
            NeurallUtils.dom.on(mobileToggle, 'click', this.toggleMobileMenu.bind(this));
        }
    },

    setupScrollEffect() {
        const navbar = NeurallUtils.dom.select('.nav');
        if (!navbar) return;

        const handleScroll = () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll',
            NeurallUtils.animation.throttle(handleScroll, 100)
        );
    },

    setupSmoothScrolling() {
        const navLinks = NeurallUtils.dom.selectAll('a[href^="#"]');

        navLinks.forEach(link => {
            NeurallUtils.dom.on(link, 'click', (e) => {
                e.preventDefault();

                const targetId = link.getAttribute('href');
                const targetElement = NeurallUtils.dom.select(targetId);

                if (targetElement) {
                    NeurallUtils.animation.scrollTo(targetElement, 800);

                    // Close mobile menu if open
                    this.closeMobileMenu();

                    // Update active state
                    this.updateActiveLink(link);
                }
            });
        });
    },

    setupMobileMenu() {
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const mobileMenu = NeurallUtils.dom.select('.mobile-menu');
            const mobileToggle = NeurallUtils.dom.select('.mobile-menu-toggle');

            if (mobileMenu &&
                !mobileMenu.contains(e.target) &&
                !mobileToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });
    },

    handleScroll() {
        this.updateActiveNavigation();
    },

    updateActiveNavigation() {
        const sections = NeurallUtils.dom.selectAll('section[id]');
        const navLinks = NeurallUtils.dom.selectAll('.nav__link');

        let currentSection = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop &&
                window.scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');

            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    },

    updateActiveLink(activeLink) {
        const navLinks = NeurallUtils.dom.selectAll('.nav__link');

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        activeLink.classList.add('active');
    },

    toggleMobileMenu() {
        const mobileMenu = NeurallUtils.dom.select('.mobile-menu');
        const body = document.body;

        if (mobileMenu) {
            mobileMenu.classList.toggle('open');
            body.classList.toggle('menu-open');

            // Update toggle button aria-label
            const toggle = NeurallUtils.dom.select('.mobile-menu-toggle');
            if (toggle) {
                const isOpen = mobileMenu.classList.contains('open');
                toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
            }
        }
    },

    closeMobileMenu() {
        const mobileMenu = NeurallUtils.dom.select('.mobile-menu');
        const body = document.body;

        if (mobileMenu) {
            mobileMenu.classList.remove('open');
            body.classList.remove('menu-open');

            // Update toggle button aria-label
            const toggle = NeurallUtils.dom.select('.mobile-menu-toggle');
            if (toggle) {
                toggle.setAttribute('aria-label', 'Open menu');
            }
        }
    },

    // Public method to programmatically navigate to section
    navigateToSection(sectionId) {
        const targetElement = NeurallUtils.dom.select(`#${sectionId}`);
        if (targetElement) {
            NeurallUtils.animation.scrollTo(targetElement, 800);
        }
    }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        NavigationModule.init();
    });
} else {
    NavigationModule.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationModule;
} else if (typeof window !== 'undefined') {
    window.NavigationModule = NavigationModule;
}