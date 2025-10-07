# Free Subdomain Routing Setup

## Current Issue
Railway free plan only allows 2 custom domains. We need wildcard subdomain support for `*.neurallempire.com`.

## Solution: Cloudflare Workers (100% FREE)

### What This Does
- Routes all `*.neurallempire.com` requests through a Cloudflare Worker
- Worker forwards requests to `www.neurallempire.com` (Railway app)
- Adds `X-Subdomain` header so backend knows which org
- Completely free, unlimited subdomains

### Setup Instructions

#### Step 1: Register Workers.dev Subdomain
1. Go to: https://dash.cloudflare.com/3412fc592e6ceddce7292c41e35f91cd/workers/onboarding
2. Choose a subdomain name (e.g., `neurallempire.workers.dev`)
3. Click "Register"

#### Step 2: Deploy Worker
Option A - Via Dashboard (Easiest):
1. Go to Workers & Pages → Create
2. Create Worker
3. Name it: `subdomain-router`
4. Click "Deploy"
5. Edit Code → Copy content from `cloudflare-worker/subdomain-router.js`
6. Save and Deploy

Option B - Via CLI:
```bash
cd cloudflare-worker
wrangler deploy
```

#### Step 3: Add Wildcard Route
1. In Worker settings → Triggers
2. Add Custom Domain/Route
3. Route: `*.neurallempire.com/*`
4. Zone: `neurallempire.com`
5. Save

#### Step 4: Test
```bash
curl https://production-test-org.neurallempire.com/dashboard
```

Should now work! 🎉

### How It Works

```
User requests: production-test-org.neurallempire.com/dashboard
        ↓
Cloudflare Worker detects subdomain: "production-test-org"
        ↓
Forwards to: www.neurallempire.com/dashboard
Headers: X-Subdomain: production-test-org
        ↓
Railway app receives request
Backend reads X-Subdomain header
Returns correct organization data
```

### Backend Update Needed
The backend needs to read the `X-Subdomain` header:

```typescript
// In middleware or routes
const subdomain = req.headers['x-subdomain'] || req.headers['x-original-host'];
```

### Cost
- Cloudflare Workers Free Tier: 100,000 requests/day
- More than enough for a SaaS app
- No credit card required

### Alternative Free Options
If Cloudflare Workers doesn't work:

1. **Vercel** - Unlimited domains, supports wildcards, free
2. **Netlify** - Unlimited domains, free
3. **Fly.io** - Supports wildcards, free tier
