# 🔐 Google OAuth Setup Guide

## ✅ What's Already Done

- ✅ OAuth infrastructure fully implemented
- ✅ Google OAuth buttons added to Login and Register pages
- ✅ OAuth callback routes configured
- ✅ Frontend deployed to Cloudflare Pages
- ✅ Backend environment variables scaffolded

## 📝 Quick Setup (5 Minutes)

### Step 1: Get Google OAuth Credentials

1. Go to **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth Client ID"**

### Step 2: Configure OAuth Consent Screen

If this is your first time:
- **User Type**: External
- **App name**: NeurallEmpire
- **User support email**: Your email
- **Developer contact**: Your email
- Click **Save and Continue**
- No need to add scopes, click **Save and Continue**
- Add test users if needed
- Click **Save and Continue**

### Step 3: Create OAuth Client ID

- **Application type**: Web application
- **Name**: NeurallEmpire Production
- **Authorized JavaScript origins**:
  ```
  https://www.neurallempire.com
  http://localhost:3000
  ```
- **Authorized redirect URIs**:
  ```
  https://www.neurallempire.com/auth/google/callback
  http://localhost:3000/auth/google/callback
  ```
- Click **Create**
- **Copy** the Client ID and Client Secret

### Step 4: Update Local Environment

Edit `backend/.env` and replace placeholders:
```bash
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
```

### Step 5: Update Production (Railway)

Run these commands:
```bash
railway variables --service NeurallEmpire --set GOOGLE_CLIENT_ID="YOUR_ACTUAL_CLIENT_ID"
railway variables --service NeurallEmpire --set GOOGLE_CLIENT_SECRET="YOUR_ACTUAL_CLIENT_SECRET"
railway up --service NeurallEmpire
```

Or set via Railway dashboard:
1. Go to https://railway.app
2. Select your project
3. Go to **Variables** tab
4. Add:
   - `GOOGLE_CLIENT_ID` = Your Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Client Secret
5. Click **Deploy**

## 🧪 Testing

### Local Testing:
1. Restart backend: `npm run dev` in backend folder
2. Go to http://localhost:3000/login
3. You should see "Continue with Google" button
4. Click it to test OAuth flow

### Production Testing:
1. Go to https://www.neurallempire.com/login
2. Click "Continue with Google"
3. Sign in with Google account
4. You'll be redirected to organization selector or dashboard

## 🎯 How It Works

### Login Flow:
```
User clicks "Continue with Google"
  ↓
Redirect to Google OAuth consent
  ↓
User authorizes
  ↓
Google redirects to /auth/google/callback
  ↓
Backend validates OAuth code
  ↓
Backend creates/links user account
  ↓
Backend generates JWT token
  ↓
User redirected to dashboard
```

### Features Included:
- ✅ Seamless account creation
- ✅ Automatic email verification
- ✅ Profile data sync (name, avatar)
- ✅ Organization context preservation
- ✅ Token refresh support
- ✅ Security state validation (CSRF protection)

## 🔧 Troubleshooting

### "OAuth not configured" Error:
- Make sure environment variables are set correctly
- Restart the backend server
- Check Railway logs: `railway logs --service NeurallEmpire`

### "Redirect URI mismatch" Error:
- Verify redirect URIs match exactly in Google Console
- Include both production and local URLs

### "Failed to fetch OAuth providers" Error:
- Backend may not be running
- Check CORS configuration
- Verify API_URL is correct in frontend

## 📚 Additional Providers

Want to add GitHub or LinkedIn OAuth? The infrastructure supports it!

Update `backend/.env`:
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

The buttons will automatically appear on login/register pages! 🎉

## 🚀 Production Ready

Your OAuth implementation includes:
- ✅ State parameter for CSRF protection
- ✅ Secure token storage
- ✅ Automatic user provisioning
- ✅ Multi-organization support
- ✅ Audit logging
- ✅ Token refresh mechanism
- ✅ Error handling

---

**Need help?** Check backend logs or test locally first!
