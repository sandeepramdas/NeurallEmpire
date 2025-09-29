# 🚀 NeurallEmpire Payment Gateway & SSO Setup Guide

Complete implementation guide for payment processing and social authentication.

## 📋 Overview

This guide covers the setup of:
- ✅ **Payment Gateway Integration** (Razorpay & Stripe)
- ✅ **Social Authentication** (Google, Facebook, GitHub, LinkedIn)
- ✅ **Subscription Management**
- ✅ **Webhook Handling**

## 🏗️ Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

Dependencies installed:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `passport-facebook` - Facebook OAuth strategy
- `passport-github2` - GitHub OAuth strategy
- `passport-linkedin-oauth2` - LinkedIn OAuth strategy
- `express-session` - Session management

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env
```

Configure the following in `.env`:

#### Payment Gateway Settings
```env
# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhoo
```

#### OAuth Configuration
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### 3. Start Backend Server

```bash
npm run dev
```

Server will run on: `http://localhost:3001`

## 🎨 Frontend Setup

### 1. Update HTML to Include New Scripts

Add to your `index.html` before closing `</body>`:

```html
<!-- Payment Integration -->
<script src="assets/js/payments-new.js"></script>

<!-- Social Authentication -->
<script src="assets/js/social-auth.js"></script>
```

### 2. Update Frontend API Configuration

In `assets/js/payments-new.js` and `assets/js/social-auth.js`, update the API base URL if needed:

```javascript
config: {
    apiBaseUrl: 'http://localhost:3001/api', // Development
    // apiBaseUrl: 'https://your-domain.com/api', // Production
}
```

## 🔧 OAuth App Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (Development)
   - `https://your-domain.com/api/auth/google/callback` (Production)

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - `http://localhost:3001/api/auth/facebook/callback`
   - `https://your-domain.com/api/auth/facebook/callback`

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `http://localhost:3001/api/auth/github/callback`

### LinkedIn OAuth Setup

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new app
3. Add redirect URLs:
   - `http://localhost:3001/api/auth/linkedin/callback`

## 💳 Payment Gateway Setup

### Razorpay Setup

1. Sign up at [Razorpay](https://razorpay.com/)
2. Get API keys from Dashboard → Settings → API Keys
3. Configure webhooks:
   - Webhook URL: `https://your-domain.com/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`, `subscription.charged`

### Stripe Setup

1. Sign up at [Stripe](https://stripe.com/)
2. Get API keys from Dashboard → Developers → API Keys
3. Configure webhooks:
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## 🚀 Available API Endpoints

### Authentication Endpoints
```
POST /api/auth/register          - User registration
POST /api/auth/login             - User login
GET  /api/auth/google            - Google OAuth initiation
GET  /api/auth/facebook          - Facebook OAuth initiation
GET  /api/auth/github            - GitHub OAuth initiation
GET  /api/auth/linkedin          - LinkedIn OAuth initiation
GET  /api/auth/linked-accounts   - Get linked social accounts
POST /api/auth/link-account      - Link/unlink social accounts
```

### Payment Endpoints
```
GET  /api/payments/plans         - Get available plans
POST /api/payments/create-order  - Create payment order
POST /api/payments/verify        - Verify payment
GET  /api/payments/my-payments   - Get user payments
GET  /api/payments/subscription  - Get subscription details
POST /api/payments/cancel-subscription - Cancel subscription
POST /api/payments/change-plan   - Change subscription plan
GET  /api/payments/history       - Get payment history
```

### Webhook Endpoints
```
POST /api/webhooks/razorpay      - Razorpay webhook handler
POST /api/webhooks/stripe        - Stripe webhook handler
```

## 🎯 Frontend Integration

### Payment Integration Example

```html
<!-- Plan selection with payment buttons -->
<div class="pricing-card" data-plan="conqueror">
    <h3>Conqueror Plan</h3>
    <div class="plan-price">$29.99</div>
    <ul class="plan-features">
        <!-- Features will be populated by JavaScript -->
    </ul>
    <button class="payment-btn btn btn--primary"
            data-plan="conqueror"
            data-gateway="razorpay">
        Choose Plan
    </button>
</div>
```

### Social Login Integration

Social login buttons are automatically added to existing auth modals. The `social-auth.js` script will:

1. Find existing login/signup modals
2. Add social login buttons automatically
3. Handle OAuth flow via popup windows
4. Store user data and JWT tokens
5. Update UI with user information

### Manual Social Button Addition

```html
<div class="auth-form">
    <h2>Sign In</h2>
    <!-- Regular form fields -->
    <input type="email" name="email" placeholder="Email">
    <input type="password" name="password" placeholder="Password">
    <button type="submit">Sign In</button>

    <!-- Social buttons will be automatically inserted here -->
</div>
```

## 🔒 Security Features

### Payment Security
- ✅ Payment signature verification
- ✅ Webhook signature validation
- ✅ Rate limiting on payment endpoints
- ✅ Input validation and sanitization
- ✅ Secure token storage

### OAuth Security
- ✅ CSRF protection via state parameter
- ✅ Secure callback URL validation
- ✅ Session-based authentication
- ✅ Popup-based OAuth flow
- ✅ Token expiration handling

## 📊 Subscription Management

### Plan Features

**Conqueror Plan - $29.99/month**
- 5 AI Agents
- Lead Generation
- Email Automation
- Basic Analytics

**Emperor Plan - $79.99/month**
- 15 AI Agents
- Advanced Lead Generation
- Multi-channel Automation
- Advanced Analytics
- Priority Support

**Overlord Plan - $199.99/month**
- 50 AI Agents
- Enterprise Lead Generation
- Custom Integrations
- White-label Solutions
- Dedicated Account Manager

### Subscription Operations

Users can:
- ✅ Subscribe to plans
- ✅ Upgrade/downgrade plans
- ✅ Cancel subscriptions
- ✅ View payment history
- ✅ Download invoices
- ✅ Manage billing details

## 🧪 Testing

### Payment Testing

**Razorpay Test Cards:**
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date
```

**Stripe Test Cards:**
```
Card Number: 4242 4242 4242 4242
CVV: 123
Expiry: Any future date
```

### OAuth Testing

1. Configure OAuth apps with localhost URLs
2. Test each provider individually
3. Verify account linking functionality
4. Test popup blocking scenarios

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
PRODUCTION_URL=https://your-domain.com

# Use production API keys
RAZORPAY_KEY_ID=rzp_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx

# Update OAuth redirect URLs
GOOGLE_CLIENT_ID=production_client_id
```

### SSL Certificate Required

OAuth providers require HTTPS in production. Ensure SSL certificate is properly configured.

### CORS Configuration

Update CORS settings in `server.js` for production domain:

```javascript
const allowedOrigins = [
    'https://your-domain.com',
    'https://www.your-domain.com'
];
```

## 📈 Analytics Integration

### Payment Tracking

```javascript
// Google Analytics
gtag('event', 'purchase', {
    transaction_id: 'neurall_123',
    value: 29.99,
    currency: 'USD'
});

// Facebook Pixel
fbq('track', 'Purchase', {
    value: 29.99,
    currency: 'USD'
});
```

### Social Login Tracking

```javascript
gtag('event', 'login', {
    method: 'google'
});
```

## 🐛 Troubleshooting

### Common Issues

**OAuth Popup Blocked**
- Ensure popups are allowed
- Check popup blocker settings
- Test in incognito mode

**Payment Failures**
- Verify API keys are correct
- Check webhook URLs are accessible
- Validate SSL certificate

**CORS Errors**
- Update CORS origin settings
- Check frontend URL configuration
- Verify API endpoint URLs

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 🎉 Success!

Your NeurallEmpire platform now has:

✅ **Complete Payment Processing**
- Razorpay & Stripe integration
- Subscription management
- Webhook handling
- Payment history

✅ **Social Authentication**
- Google, Facebook, GitHub, LinkedIn
- Account linking
- Popup-based OAuth flow
- Secure token management

✅ **SaaS Features**
- Plan upgrades/downgrades
- Billing management
- User dashboard
- Analytics integration

Your empire is ready for domination! 🧠👑