# Railway Deployment Troubleshooting Guide

## Current Issue
Server is returning 500 Internal Server Error after Stripe removal deployment.

## Steps to Troubleshoot

### 1. Check Railway Deployment Logs

Visit: https://railway.com/project/fa6214c1-48ed-4944-a0d0-318aaf399a83/service/1512a2da-cf3e-4a12-acc0-927c554e91f4

**Look for**:
- Build logs - Did the build complete successfully?
- Deploy logs - Is the server starting?
- Runtime logs - What error is causing the 500 response?

**Common errors to watch for**:
- `Prisma Client` errors
- Module not found errors
- Database connection errors
- Missing environment variables

### 2. Verify Environment Variables

In Railway dashboard → Settings → Variables, check:

**Required variables**:
- `DATABASE_URL` - Should point to Supabase
- `NODE_ENV=production`
- `JWT_SECRET`
- `SESSION_SECRET`
- `FRONTEND_URL=https://www.neurallempire.com`

**Remove these if present**:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- Any other STRIPE_* variables

### 3. Check Build Configuration

In Railway dashboard → Settings:

**Build settings**:
- Builder: Should be "NIXPACKS" (as per railway.json)
- Root directory: Should be `/` or blank
- Build command: Should use the one from railway.json

**Deploy settings**:
- Start command: `cd backend && node dist/server.js`
- Health check path: `/health`

### 4. Manual Rebuild

If logs show the issue, try:

1. In Railway dashboard → Deployments
2. Click "Deploy" → "Redeploy"
3. Watch the logs carefully

### 5. Rollback Option

If needed, you can rollback to a previous deployment:

1. In Railway dashboard → Deployments
2. Find the last working deployment (before Stripe removal)
3. Click ••• → "Redeploy"

## Quick Fixes

### If Prisma Client Error:
```bash
# Run this locally then redeploy:
railway run npx prisma generate
```

### If Module Not Found:
```bash
# Verify node_modules are properly installed:
railway run npm install
```

### If Database Connection Error:
- Check DATABASE_URL is correct in Railway variables
- Verify Supabase database is accessible
- Test connection: `railway run npx prisma db pull`

## Local Testing

Test the build locally before deploying:

```bash
cd backend
npm install
npx prisma generate
npm run build
NODE_ENV=production node dist/server.js
```

Then test health endpoint:
```bash
curl http://localhost:3001/health
```

## Contact Information

If you need help, the error message from Railway logs is critical. Share:
1. The exact error from Railway deployment logs
2. The timestamp of the failing deployment
3. Any Prisma-related errors

---

**Last Updated**: 2025-10-01
**Issue**: Post-Stripe removal deployment error
**Status**: Investigating
