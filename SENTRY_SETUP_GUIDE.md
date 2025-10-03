# 🔍 Sentry Error Monitoring Setup Guide

## Overview

This guide will help you set up Sentry error monitoring for NeurallEmpire backend on the free Developer plan.

---

## Step 1: Create Sentry Account (Free)

### Sign Up Process

1. **Go to Sentry:**
   ```
   https://sentry.io/signup/
   ```

2. **Choose Sign-Up Method:**
   - Sign up with GitHub (recommended for developers)
   - Sign up with Google
   - Sign up with email

3. **Trial Information:**
   - You'll start with a 14-day Business plan trial
   - After trial, you'll automatically move to the free Developer plan
   - **Free Developer Plan includes:**
     - 5,000 errors per month
     - 10,000 performance units per month
     - 30-day data retention
     - 1 project
     - Perfect for MVP/beta deployment!

---

## Step 2: Create a New Project

### After Signing Up:

1. **Create Project:**
   - Click "Create Project"
   - Select **"Node.js"** as the platform
   - Name it: `neurallempire-backend`
   - Team: Keep default or create new
   - Click "Create Project"

2. **Get Your DSN:**
   - After creating the project, you'll see installation instructions
   - Look for a URL that looks like:
     ```
     https://[KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
     ```
   - **COPY THIS DSN** - you'll need it for environment variables

3. **Example DSN:**
   ```
   https://1234567890abcdef1234567890abcdef@o1234567.ingest.sentry.io/1234567
   ```

---

## Step 3: Configure Railway Environment Variables

### Add Sentry DSN to Railway

1. **Open Railway Dashboard:**
   ```bash
   railway open
   ```
   Or visit: https://railway.app

2. **Navigate to Your Project:**
   - Select: `diplomatic-commitment` → `production` → `NeurallEmpire`

3. **Add Environment Variable:**
   - Go to "Variables" tab
   - Click "+ New Variable"
   - Add:
     ```
     Name: SENTRY_DSN
     Value: [Your DSN from Step 2]
     ```

4. **Optional Variables (for more control):**
   ```env
   # Enable performance monitoring
   ENABLE_PERFORMANCE_MONITORING=true

   # Set log level
   LOG_LEVEL=info
   ```

5. **Click "Deploy" or the changes will auto-deploy**

---

## Step 4: Verify Sentry Integration (After Next Deployment)

### Test Error Tracking

Once deployed with SENTRY_DSN, you can test:

1. **Trigger a Test Error:**
   ```bash
   # This endpoint will trigger a test error (we'll create it)
   curl https://www.neurallempire.com/api/debug/test-error
   ```

2. **Check Sentry Dashboard:**
   - Go to https://sentry.io
   - Select your `neurallempire-backend` project
   - You should see the error appear within seconds!

3. **Error Details You'll See:**
   - Error type and message
   - Stack trace
   - Request context (URL, method, headers)
   - User context (if logged in)
   - Server environment
   - Timestamp

---

## Step 5: Understanding Sentry Features (Free Plan)

### What You Get

**Error Monitoring:**
- 5,000 errors/month (plenty for MVP!)
- Real-time error alerts
- Stack traces with source maps
- Error grouping and deduplication
- Search and filtering

**Performance Monitoring:**
- 10,000 performance units/month
- API endpoint performance tracking
- Slow query detection
- Transaction tracing

**Data Retention:**
- 30 days of error history
- Searchable event archive

**Alerts:**
- Email notifications
- Slack integration (optional)
- Custom alert rules

---

## What Happens in Your Code

### Current Integration (Already in Code)

Your backend already has Sentry integration code:

**File:** `backend/src/config/sentry.ts`

```typescript
// Automatically initializes when SENTRY_DSN is set
export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,

    // Automatically filters sensitive data
    beforeSend(event) {
      // Removes passwords, tokens, API keys
      return event;
    },
  });
};
```

**What Gets Tracked Automatically:**
- Unhandled exceptions
- Promise rejections
- HTTP 500 errors
- Database errors
- API failures

**What Gets Filtered (For Security):**
- Authorization headers
- Cookies
- Passwords
- API keys
- JWT tokens

---

## Step 6: Monitoring Best Practices

### What to Watch For

**1. Error Rate Trends:**
- Sudden spikes = new bug introduced
- Gradual increase = performance degradation
- Pattern by time = timezone-specific issues

**2. Critical Errors:**
- Database connection failures
- Payment processing errors
- Authentication failures
- Data corruption

**3. Performance Issues:**
- Slow API endpoints (>1 second)
- Database query timeouts
- Memory leaks
- CPU spikes

### Setting Up Alerts

**In Sentry Dashboard:**

1. Go to **Settings → Alerts**
2. Create alert rules:
   ```
   Alert 1: Error spike
   - When: Error count increases by 25% in 1 hour
   - Notify: Email

   Alert 2: New error type
   - When: First seen error appears
   - Notify: Email

   Alert 3: Critical errors
   - When: Any error with tag "severity:critical"
   - Notify: Email + Slack (optional)
   ```

---

## Step 7: Advanced Features (Optional)

### Source Maps (For Better Stack Traces)

Enable source maps to see original TypeScript code in errors:

```bash
# In package.json build script (already configured)
tsc --sourceMap
```

### User Context

Add user information to errors:

```typescript
// Already integrated in audit.service.ts
Sentry.setUser({
  id: userId,
  email: userEmail,
  organizationId: orgId,
});
```

### Custom Tags

Tag errors for better filtering:

```typescript
Sentry.setTag('feature', 'accounting');
Sentry.setTag('severity', 'high');
```

### Performance Monitoring

Track slow operations:

```typescript
const transaction = Sentry.startTransaction({
  name: 'Create Transaction',
  op: 'accounting',
});

try {
  await createTransaction();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

---

## Troubleshooting

### Sentry Not Receiving Errors?

**Check:**

1. **DSN Set Correctly:**
   ```bash
   railway variables | grep SENTRY_DSN
   ```

2. **Server Logs:**
   ```bash
   railway logs | grep Sentry
   ```
   Should see: `✅ Sentry error monitoring initialized`

3. **Test Manually:**
   ```bash
   # Trigger test error
   curl https://www.neurallempire.com/api/debug/test-sentry
   ```

4. **Check Sentry Status:**
   - Visit: https://status.sentry.io
   - Ensure service is operational

### Too Many Errors (Quota Exceeded)?

**Solutions:**

1. **Filter Noisy Errors:**
   - In Sentry dashboard → Settings → Inbound Filters
   - Ignore known browser errors
   - Ignore development errors

2. **Sample Errors:**
   ```typescript
   // In sentry.ts
   tracesSampleRate: 0.1, // Only send 10% of errors
   ```

3. **Upgrade if Needed:**
   - Free plan: 5,000 errors/month
   - Team plan: $26/month for 50,000 errors
   - But first, fix the bugs! 😊

---

## Expected Results

### After Setup

**Within 1 Hour:**
- Sentry integration active
- Errors being tracked
- Performance monitoring working

**Within 1 Day:**
- Error patterns visible
- Performance baselines established
- Alert rules configured

**Within 1 Week:**
- First bugs caught and fixed
- Performance optimizations identified
- User experience improved

---

## Cost Breakdown (Free Plan)

```
Monthly Cost: $0
Errors Tracked: 5,000
Performance Units: 10,000
Data Retention: 30 days
Projects: 1
Team Members: 1

Perfect for:
✅ MVP/Beta deployment
✅ Small teams
✅ Development phase
✅ Learning error monitoring
```

**When to Upgrade:**
- Production with >5,000 errors/month
- Need >30 days retention
- Multiple projects
- Team collaboration features

---

## Quick Reference

### Sentry Dashboard URLs

- **Main Dashboard:** https://sentry.io
- **Project Issues:** https://sentry.io/organizations/[org]/issues/
- **Performance:** https://sentry.io/organizations/[org]/performance/
- **Alerts:** https://sentry.io/organizations/[org]/alerts/

### Railway Commands

```bash
# Add Sentry DSN
railway variables set SENTRY_DSN="your-dsn-here"

# View current variables
railway variables

# View logs
railway logs

# Check deployment status
railway status
```

### Useful Sentry CLI (Optional)

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Login
sentry-cli login

# Upload source maps
sentry-cli releases files VERSION upload-sourcemaps ./dist
```

---

## Next Steps

After completing this setup:

1. ✅ Sign up for Sentry free account
2. ✅ Create `neurallempire-backend` project
3. ✅ Copy DSN
4. ✅ Add DSN to Railway environment variables
5. ✅ Wait for auto-deployment
6. ✅ Test error tracking
7. ✅ Set up alert rules
8. ✅ Monitor and optimize!

**Your production backend will now have enterprise-grade error monitoring!** 🎉

---

## Support

- **Sentry Docs:** https://docs.sentry.io
- **Sentry Status:** https://status.sentry.io
- **Community:** https://forum.sentry.io
- **GitHub:** https://github.com/getsentry/sentry

