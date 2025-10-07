# 🔐 OAuth Provider Setup Guide - NeurallEmpire

## Quick Setup Checklist

### 1. Google OAuth Setup (5 minutes)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "NeurallEmpire"
3. Enable Google+ API and Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - **Application Type**: Web Application
   - **Name**: NeurallEmpire OAuth
   - **Authorized Origins**:
     - `http://localhost:3000`
     - `https://www.neurallempire.com`
     - `https://*.neurallempire.com`
   - **Authorized Redirect URIs**:
     - `http://localhost:3001/api/oauth/google/callback`
     - `https://api.neurallempire.com/api/oauth/google/callback`
5. Copy `Client ID` and `Client Secret` to your `.env` file

### 2. GitHub OAuth Setup (3 minutes)
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - **Application Name**: NeurallEmpire
   - **Homepage URL**: `https://www.neurallempire.com`
   - **Authorization callback URL**: `http://localhost:3001/api/oauth/github/callback`
4. Create app and copy `Client ID` and `Client Secret`
5. For production, create another app with production callback URL

### 3. LinkedIn OAuth Setup (5 minutes)
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Create new app:
   - **App Name**: NeurallEmpire
   - **Company**: Your Company
   - **Privacy Policy**: `https://www.neurallempire.com/privacy`
   - **App Logo**: Upload your logo
3. In "Auth" tab:
   - Add redirect URLs:
     - `http://localhost:3001/api/oauth/linkedin/callback`
     - `https://api.neurallempire.com/api/oauth/linkedin/callback`
   - Request "Sign In with LinkedIn" product
4. Copy `Client ID` and `Client Secret`

### 4. Microsoft OAuth Setup (5 minutes)
1. Go to [Azure Portal](https://portal.azure.com) → App Registrations
2. Create "New registration":
   - **Name**: NeurallEmpire
   - **Supported Account Types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: `http://localhost:3001/api/oauth/microsoft/callback`
3. In "Authentication":
   - Add platform → Web
   - Add redirect URIs for production
4. In "Certificates & secrets":
   - Create new client secret
5. Copy `Application (client) ID` and `Client Secret`

## Environment Variables Setup

After creating all OAuth apps, update your `.env` files:

### Backend (.env)
```bash
# Replace these with your actual OAuth credentials
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
GITHUB_CLIENT_ID=your_actual_github_client_id
GITHUB_CLIENT_SECRET=your_actual_github_client_secret
LINKEDIN_CLIENT_ID=your_actual_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_actual_linkedin_client_secret
MICROSOFT_CLIENT_ID=your_actual_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_actual_microsoft_client_secret
```

## Cloudflare DNS Setup (Optional but Recommended)

### 1. Cloudflare Account Setup
1. Create account at [Cloudflare](https://dash.cloudflare.com)
2. Add domain `neurallempire.com` to Cloudflare
3. Update nameservers at your domain registrar

### 2. API Token Creation
1. Go to "My Profile" → "API Tokens"
2. Create token with permissions:
   - `Zone:Zone:Read`
   - `Zone:DNS:Edit`
3. Include specific zones: `neurallempire.com`
4. Copy token to `.env` as `CLOUDFLARE_API_TOKEN`

### 3. Zone ID
1. Go to your domain overview in Cloudflare
2. Copy "Zone ID" from sidebar
3. Add to `.env` as `CLOUDFLARE_ZONE_ID`

## Security Configuration

### 1. Generate Encryption Keys
```bash
# Generate 32-character encryption key
openssl rand -hex 32

# Generate OAuth state secret
openssl rand -hex 32

# Generate subdomain signing secret
openssl rand -hex 32
```

### 2. Update Security Variables
```bash
ENCRYPTION_KEY=your_generated_32_character_key
OAUTH_STATE_SECRET=your_oauth_state_secret
SUBDOMAIN_SIGNING_SECRET=your_subdomain_secret
```

## Production Deployment Checklist

### Domain & SSL
- [ ] Domain `neurallempire.com` purchased and configured
- [ ] Cloudflare SSL/TLS set to "Full (strict)"
- [ ] API subdomain `api.neurallempire.com` pointing to backend
- [ ] Wildcard SSL certificate configured for `*.neurallempire.com`

### OAuth Apps - Production URLs
- [ ] Google OAuth: Add production redirect URLs
- [ ] GitHub OAuth: Create production app or update existing
- [ ] LinkedIn OAuth: Add production redirect URLs
- [ ] Microsoft OAuth: Add production redirect URLs

### Environment Variables - Production
- [ ] All OAuth secrets configured in production environment
- [ ] Database URL pointing to production database
- [ ] Cloudflare credentials configured
- [ ] Session domain set to `.neurallempire.com`
- [ ] CORS origins updated for production domains

## Testing Your Setup

### 1. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 2. Test OAuth Flow
1. Navigate to `http://localhost:3000/login`
2. Click each OAuth provider button
3. Complete OAuth flow and verify user creation
4. Test organization creation and subdomain assignment

### 3. Test Subdomain Routing
1. Create organization with slug "test"
2. Verify DNS record creation in Cloudflare
3. Test access via `http://localhost:3000?org=test`
4. Verify organization-specific dashboard access

## Troubleshooting

### OAuth Issues
- **Invalid redirect URI**: Ensure exact match in OAuth app settings
- **CORS errors**: Check FRONTEND_URL in backend .env
- **State mismatch**: Verify OAUTH_STATE_SECRET is set

### Subdomain Issues
- **DNS creation fails**: Check Cloudflare API token permissions
- **SSL certificate errors**: Ensure Cloudflare SSL is configured
- **Routing issues**: Verify environment variables in frontend

### Development Tips
- Use browser network tab to debug OAuth callbacks
- Check backend logs for detailed error messages
- Test with different browsers and incognito mode
- Verify database records after each OAuth login

---

🚀 **Total Setup Time**: ~20-30 minutes
📝 **Support**: Check logs and error messages for specific issues
🔧 **Advanced**: Consider implementing custom OAuth providers for enterprise clients