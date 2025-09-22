/* ===================================
   CONFIGURATION & CONSTANTS
   =================================== */

const NEURALL_CONFIG = {
    // API Configuration
    api: {
        baseUrl: '/api',
        timeout: 10000
    },

    // Payment Configuration
    payment: {
        razorpayKey: 'rzp_test_9999999999', // Replace with your actual key
        currency: 'INR',
        companyName: 'NEURALLEMPIRE',
        theme: '#FFD700'
    },

    // Plans Configuration
    plans: {
        conqueror: {
            name: 'Conqueror',
            price: 50000,
            amount: 5000000, // in paise
            description: 'Conqueror Plan - 50 AI Agents',
            features: [
                '50 Specialized AI Agents',
                'Up to 100K leads/month',
                '5 Marketing Channels',
                'Real-time Analytics',
                '24/7 AI Support',
                'Monthly Strategy Calls'
            ]
        },
        emperor: {
            name: 'Emperor',
            price: 200000,
            amount: 20000000, // in paise
            description: 'Emperor Plan - 500 AI Agents',
            features: [
                '500 Specialized AI Agents',
                'Unlimited leads generation',
                'All Marketing Channels',
                'Predictive Analytics',
                'Dedicated Success Team',
                'Weekly Strategy Sessions',
                'Custom AI Development',
                'Competitor Neutralization'
            ]
        },
        overlord: {
            name: 'Overlord',
            price: 'Custom',
            description: 'For enterprises demanding total market control',
            features: [
                '10,000+ AI Agents',
                'Global Market Domination',
                'White-label Solutions',
                'Quantum Computing Access',
                'C-Suite Advisory Board',
                'Daily Strategic Command',
                'Market Monopoly Systems'
            ]
        }
    },

    // Animation Configuration
    animations: {
        fadeInDuration: 600,
        counterDuration: 2000,
        parallaxMultiplier: 0.5,
        observerThreshold: 0.1
    },

    // Contact Information
    contact: {
        email: 'dominate@neurallempire.com',
        phone: '+91-9700465200',
        address: 'Cyber Towers, HITEC City, Hyderabad',
        social: {
            twitter: '#',
            linkedin: '#',
            youtube: '#',
            email: '#'
        }
    },

    // SEO Configuration
    seo: {
        title: 'NEURALLEMPIRE - Where AI Meets ALL',
        description: 'Transform your business with 10,000+ AI agents. We don\'t just optimize marketing - we dominate markets.',
        keywords: 'AI, Marketing, Automation, Lead Generation, Business Growth',
        author: 'Sandeep Ramdaz'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NEURALL_CONFIG;
} else if (typeof window !== 'undefined') {
    window.NEURALL_CONFIG = NEURALL_CONFIG;
}