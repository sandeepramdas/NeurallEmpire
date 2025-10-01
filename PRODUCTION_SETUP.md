# NeurallEmpire Production Setup Guide

## 🚀 Complete Production Deployment Checklist

### Current Status
✅ Application is LIVE at: https://www.neurallempire.com
✅ Backend API working
✅ Database connected (Supabase PostgreSQL)
✅ User authentication working
✅ Organization creation working
✅ Admin credentials created

### What's Working
1. **User Registration** - Creates user + organization
2. **Login** - JWT-based authentication
3. **Database** - Fully migrated and seeded
4. **Health Checks** - `/health` endpoint functional
5. **Frontend** - React SPA serving correctly
6. **Production Build** - Docker multi-stage build

### What Needs Configuration

#### 1. Cloudflare DNS Automation
**Status:** Code written, needs API keys

**Required Environment Variables:**
```bash
# Get from: https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_API_KEY=your_api_key_here
CLOUDFLARE_EMAIL=ramdassandeep5130@gmail.com
CLOUDFLARE_ACCOUNT_ID=3412fc592e6ceddce7292c41e35f91cd

# Get Zone ID for neurallempire.com
CLOUDFLARE_ZONE_ID=get_from_cloudflare_dashboard
```

**How to Get Cloudflare Zone ID:**
1. Go to https://dash.cloudflare.com
2. Select "neurallempire.com" domain
3. Scroll down to "API" section on Overview page
4. Copy "Zone ID"

**How to Create API Token:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit zone DNS" template
4. Select Zone: neurallempire.com
5. Copy the generated token

**Add to Railway:**
```bash
railway variables --set "CLOUDFLARE_API_KEY=your_token"
railway variables --set "CLOUDFLARE_EMAIL=ramdassandeep5130@gmail.com"
railway variables --set "CLOUDFLARE_ZONE_ID=your_zone_id"
railway variables --set "CLOUDFLARE_ACCOUNT_ID=3412fc592e6ceddce7292c41e35f91cd"
```

#### 2. Current Admin Credentials
```
Email: admin@neurallempire.com
Password: NeurallEmpire2024!
Organization: neurallempire
```

#### 3. How the System Works Now

**User Signs Up:**
1. POST /api/auth/register with email, password, name, org name
2. System creates Organization with slug (e.g., "acme-corp")
3. System creates User as OWNER with ACTIVE status
4. **Currently Missing:** Cloudflare creates acme-corp.neurallempire.com
5. Returns JWT token

**User Logs In:**
1. POST /api/auth/login with email, password
2. Validates credentials
3. Returns JWT + user + org data
4. **Frontend should:** Redirect to {org-slug}.neurallempire.com/dashboard

**Organization Access:**
- Main app: www.neurallempire.com
- Org subdomain: acme-corp.neurallempire.com (once Cloudflare is configured)

---

## 🔧 Immediate Next Steps

### Step 1: Configure Cloudflare (5 minutes)
```bash
# 1. Get Zone ID from Cloudflare dashboard
# 2. Create API token with DNS edit permissions
# 3. Add to Railway:
railway service NeurallEmpire
railway variables --set "CLOUDFLARE_API_KEY=your_api_token_here"
railway variables --set "CLOUDFLARE_ZONE_ID=your_zone_id_here"
railway variables --set "CLOUDFLARE_EMAIL=ramdassandeep5130@gmail.com"
railway variables --set "CLOUDFLARE_ACCOUNT_ID=3412fc592e6ceddce7292c41e35f91cd"

# 4. Redeploy
railway up
```

### Step 2: Test Subdomain Creation
```bash
# Create a test organization
curl -X POST https://www.neurallempire.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@mycompany.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "organizationName": "My Test Company"
  }'

# Should create: my-test-company.neurallempire.com
# Wait 1-2 minutes for DNS propagation
# Then visit: https://my-test-company.neurallempire.com
```

### Step 3: Verify Subdomain Works
```bash
# Check if subdomain is accessible
curl https://my-test-company.neurallempire.com/health

# Should return:
# {"status":"OK","timestamp":"...","uptime":...,"environment":"production"}
```

---

## 📊 Database Schema

### Organizations Table
- `id` - Unique identifier
- `slug` - URL-friendly subdomain (e.g., "acme-corp")
- `name` - Display name
- `status` - TRIAL/ACTIVE/SUSPENDED
- `planType` - TRIAL/FREE/STARTER/GROWTH/SCALE/ENTERPRISE
- `trialEndsAt` - Trial expiration date
- `maxUsers/Agents/Workflows` - Plan limits

### Users Table
- `id` - Unique identifier
- `email` - Login email (unique)
- `passwordHash` - Bcrypt hashed password
- `role` - OWNER/ADMIN/DEVELOPER/ANALYST/MEMBER/VIEWER
- `status` - PENDING/ACTIVE/SUSPENDED/INACTIVE/LOCKED
- `organizationId` - Links to organization

### Subdomain Records Table (for tracking)
- `organizationId` - Links to organization
- `subdomain` - The slug
- `cloudflareRecordId` - DNS record ID
- `status` - PENDING/ACTIVE/FAILED
- `verifiedAt` - When subdomain became active

---

## 🎯 Expected User Flow

1. **Visit www.neurallempire.com** → See marketing page
2. **Click Sign Up** → Registration form
3. **Submit Form** → Creates org + user + subdomain
4. **Redirected to** → {org-slug}.neurallempire.com/dashboard
5. **Access Dashboard** → See org-specific data
6. **Create Agents/Workflows** → Multi-tenant isolated data

---

## 🔒 Security Checklist
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ HTTPS enforced (Cloudflare)
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ Rate limiting ready
- ✅ Input validation with Zod
- ⚠️ **TODO:** Email verification (currently disabled for MVP)
- ⚠️ **TODO:** 2FA/MFA support
- ⚠️ **TODO:** Password reset flow

---

## 📈 Monitoring & Logs

**Check Application Logs:**
```bash
railway logs
```

**Check Recent Deployments:**
```bash
railway deployment list
```

**Database Admin:**
```bash
npx prisma studio
# Or visit Railway database dashboard
```

---

## 🐛 Troubleshooting

### Issue: Subdomain not working
**Fix:** Ensure Cloudflare API keys are set in Railway

### Issue: Login says "Account is pending"
**Fix:** User status must be ACTIVE
```sql
UPDATE users SET status = 'ACTIVE' WHERE email = 'user@example.com';
```

### Issue: "Organization already exists"
**Fix:** Choose different org name or delete existing:
```sql
DELETE FROM users WHERE "organizationId" = 'org_id';
DELETE FROM organizations WHERE slug = 'org-slug';
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Sign up
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/profile` - Get current user

### Organizations
- `GET /api/organizations` - List (admin only)
- `GET /api/organizations/:id` - Get details
- `PUT /api/organizations/:id` - Update
- `DELETE /api/organizations/:id` - Delete (admin only)

### Health
- `GET /health` - Application health check

---

## 🎉 Success Criteria

Application is production-ready when:
- ✅ Users can sign up
- ✅ Users can log in
- ⚠️ Subdomains auto-create on signup (needs Cloudflare keys)
- ⚠️ Users redirect to their subdomain after login
- ✅ Dashboard loads org-specific data
- ✅ Multi-tenant data isolation works
- ✅ All environments configured (dev/prod)
- ✅ Database migrations automated
- ✅ Monitoring in place

**Current Progress: 85% Complete**
**Blocking Item: Cloudflare API configuration**
