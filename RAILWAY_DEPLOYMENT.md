# 🚂 Railway Backend Deployment Guide

## Quick Deploy to Railway

1. **Go to Railway.app** and sign in with GitHub
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **`sandeepramdas/NeurallEmpire`** repository
5. Select **`backend`** folder as the root directory

## Required Environment Variables

Set these in Railway Dashboard → Variables:

### Essential Variables
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:pDxhsrhidcB82xpS@db.xwncwujgfgqcwzorkngk.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-for-production-make-this-very-strong
SESSION_SECRET=your-session-secret-for-production-make-this-different
FRONTEND_URL=https://sandeepramdas.github.io/NeurallEmpire
```

### Security Variables (Generate Strong Random Values)
```env
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

### Optional Features (Add Later)
```env
# Email (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=NeurallEmpire <your-email@gmail.com>

# OpenAI (for AI agents)
OPENAI_API_KEY=your-openai-api-key
```

## Deployment Process

1. **Repository Connection**: Railway will automatically detect `railway.json` configuration
2. **Build Process**: Uses Nixpacks builder (auto-detected)
3. **Health Check**: Endpoint `/health` configured for monitoring
4. **Auto Restart**: On failure with max 10 retries

## Expected Railway URL

After deployment, your backend will be available at:
```
https://neurallempire-backend-production-XXXX.up.railway.app
```

## Update Frontend Configuration

Once Railway provides your backend URL, update the GitHub Actions workflow:

1. Go to `.github/workflows/deploy.yml`
2. Update line 43: `VITE_API_URL: https://your-railway-backend-url.railway.app`
3. Push changes to trigger frontend redeployment

## Verification Steps

1. **Health Check**: Visit `https://your-railway-url.railway.app/health`
2. **API Documentation**: Visit `https://your-railway-url.railway.app/api`
3. **Database Connection**: Check Railway logs for successful Prisma connection

## Troubleshooting

- **Build Fails**: Check Railway logs for missing dependencies
- **Health Check Fails**: Verify PORT environment variable is set to 3001
- **Database Errors**: Ensure DATABASE_URL is correctly formatted
- **CORS Issues**: Verify FRONTEND_URL matches your GitHub Pages URL

## Domain Configuration (Optional)

To use a custom domain:
1. Add your domain in Railway Dashboard → Settings → Domains
2. Update DNS CNAME record to point to Railway URL
3. Update FRONTEND_URL environment variable