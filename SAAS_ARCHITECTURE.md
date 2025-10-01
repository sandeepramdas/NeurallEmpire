# NeurallEmpire SaaS Architecture

## 🏗️ Multi-Tenant Architecture Design

### User Journey Flow

#### 1. **Sign Up** (`POST /api/auth/register`)
**Input:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Corp"
}
```

**What Happens:**
1. ✅ Validate input data
2. ✅ Check if email exists (reject duplicates)
3. ✅ Generate org slug from name: "Acme Corp" → "acme-corp"
4. ✅ Check if slug is available
5. ✅ Hash password (bcrypt, 12 rounds)
6. ✅ Create Organization in DB:
   - slug: "acme-corp"
   - status: TRIAL
   - planType: TRIAL
   - trialEndsAt: +14 days
   - maxUsers/Agents/Workflows based on plan
7. ✅ Create User in DB:
   - role: OWNER
   - status: ACTIVE (no email verification for MVP)
   - organizationId: linked
8. ⚠️ **MISSING: Create Cloudflare DNS record** for acme-corp.neurallempire.com
9. ⚠️ **MISSING: Create SubdomainRecord** in DB
10. ✅ Generate JWT token
11. ✅ Return: user, org, token

**Database Changes:**
- 1 row in `organizations` table
- 1 row in `users` table
- **MISSING:** 1 row in `subdomain_records` table
- **MISSING:** Cloudflare DNS A/CNAME record

#### 2. **Subdomain Routing**
**Current State:** ❌ NOT IMPLEMENTED

**Should Work:**
- `acme-corp.neurallempire.com` → Organization dashboard
- `www.neurallempire.com` → Marketing/Login page
- `app.neurallempire.com` → Main app (if needed)

**Required:**
1. Cloudflare DNS automation
2. Subdomain resolution middleware
3. Frontend subdomain detection
4. Org context based on subdomain

#### 3. **Sign In** (`POST /api/auth/login`)
**Works on:** ✅ www.neurallempire.com/login

**Input:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123!"
}
```

**What Happens:**
1. ✅ Validate credentials
2. ✅ Check user status (must be ACTIVE)
3. ✅ Verify password hash
4. ✅ Generate JWT token
5. ✅ Return user + org data
6. ⚠️ **SHOULD:** Redirect to `{orgSlug}.neurallempire.com/dashboard`

#### 4. **Dashboard Access**
**Current:** www.neurallempire.com/dashboard
**Should Be:** acme-corp.neurallempire.com/dashboard

**Required:**
- Frontend detects subdomain
- Validates org exists
- Loads org-specific data
- Multi-tenant data isolation

---

## 🔧 What Needs to be Fixed

### Priority 1: Subdomain Creation (Cloudflare)
```typescript
// After org creation in register():
await createCloudflareSubdomain(slug);
await prisma.subdomainRecord.create({
  organizationId: org.id,
  subdomain: slug,
  status: 'ACTIVE',
  verifiedAt: new Date()
});
```

### Priority 2: Subdomain Detection Middleware
```typescript
// Backend: src/middleware/subdomain.ts
export const extractSubdomain = (req, res, next) => {
  const host = req.hostname;
  const subdomain = host.split('.')[0];
  if (subdomain !== 'www' && subdomain !== 'neurallempire') {
    req.subdomain = subdomain;
    req.organization = await getOrgBySlug(subdomain);
  }
  next();
};
```

### Priority 3: Frontend Routing
```typescript
// Detect subdomain on frontend
const subdomain = window.location.hostname.split('.')[0];
if (subdomain !== 'www') {
  // Load org dashboard
} else {
  // Show marketing/login
}
```

### Priority 4: Post-Login Redirect
```typescript
// After successful login:
const orgSlug = user.organization.slug;
window.location.href = `https://${orgSlug}.neurallempire.com/dashboard`;
```

---

## 📊 Database Schema Requirements

### ✅ Existing Tables
- `users` - User accounts
- `organizations` - Company/tenant data
- `subdomain_records` - Subdomain tracking

### Current Schema Status
**Organizations table has:**
- ✅ slug (unique)
- ✅ customDomain
- ✅ subdomainStatus
- ✅ subdomainVerifiedAt

**Missing:**
- Cloudflare zone/record IDs
- SSL certificate tracking
- Subdomain creation automation

---

## 🚀 Implementation Plan

### Phase 1: Cloudflare Integration (URGENT)
1. Add Cloudflare API credentials to env
2. Create subdomain service
3. Hook into registration flow
4. Update SubdomainRecord on success

### Phase 2: Subdomain Routing
1. Backend middleware for subdomain detection
2. Frontend subdomain detection
3. Org context provider
4. Conditional rendering based on subdomain

### Phase 3: Post-Login Flow
1. Redirect to org subdomain after login
2. Persist session across subdomains
3. Handle subdomain-less access

### Phase 4: Production Hardening
1. SSL for all subdomains (Cloudflare auto)
2. Rate limiting per org
3. Audit logs
4. Analytics per tenant

---

## 🔐 Environment Variables Needed

```bash
# Cloudflare
CLOUDFLARE_API_KEY=your-api-key
CLOUDFLARE_EMAIL=your-email
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Base Domain
BASE_DOMAIN=neurallempire.com
APP_URL=https://www.neurallempire.com
```

---

## ✅ Current Working Features
- User registration with org creation
- Password hashing (bcrypt)
- JWT authentication
- User login
- Org slug generation
- Database transactions
- Trial period setup

## ❌ Critical Missing Features
- Cloudflare subdomain automation
- Subdomain routing (backend + frontend)
- Post-login redirect to subdomain
- Subdomain-based org detection
- Multi-tenant data isolation by subdomain
