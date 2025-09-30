# 🗄️ Database Migration Guide - Enhanced OAuth & Subdomain Support

## 📋 Overview

This guide walks you through upgrading your NeurallEmpire database schema to support:
- **Dynamic Subdomain Management** (`org.neurallempire.com`)
- **Enterprise OAuth/SSO** (Google, LinkedIn, GitHub)
- **Enhanced Session Management** (Cross-subdomain support)
- **Comprehensive Audit Trail**

## 🚀 Quick Migration (Recommended)

### Step 1: Backup Current Database
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Prisma
npx prisma db pull
npx prisma generate
```

### Step 2: Apply New Schema
```bash
# Replace current schema with enhanced version
cp backend/prisma/schema-enhanced.prisma backend/prisma/schema.prisma

# Generate new migration
npx prisma migrate dev --name "add_subdomain_oauth_support"

# Generate Prisma client
npx prisma generate
```

### Step 3: Verify Migration
```bash
# Check database status
npx prisma migrate status

# Open Prisma Studio to verify
npx prisma studio
```

## 📊 What's Being Added

### 🆕 New Tables

#### 1. **`subdomain_records`** - DNS Management
```sql
-- Manages org.neurallempire.com subdomains
- subdomain: "acme"
- fullDomain: "acme.neurallempire.com"
- status: PENDING, ACTIVE, FAILED
- healthStatus: HEALTHY, DEGRADED, UNHEALTHY
- sslEnabled: true/false
- uptime: 99.9%
```

#### 2. **`social_accounts`** - OAuth Management
```sql
-- Links users to OAuth providers
- provider: GOOGLE, GITHUB, LINKEDIN
- providerId: OAuth provider user ID
- accessToken: Current OAuth token
- refreshToken: Token refresh capability
- providerData: Full OAuth profile
```

#### 3. **`oauth_configs`** - Per-Organization OAuth Setup
```sql
-- Organization-specific OAuth configuration
- provider: GOOGLE, GITHUB, LINKEDIN
- clientId: OAuth app client ID
- clientSecret: OAuth app secret (encrypted)
- allowedDomains: Restrict to company domains
- autoCreateUsers: Auto-create on first login
```

### 🔄 Enhanced Existing Tables

#### **Organizations** - Subdomain Support
```sql
+ subdomainEnabled: Boolean
+ subdomainStatus: PENDING, ACTIVE, FAILED
+ subdomainVerifiedAt: Timestamp
+ customDomain: "acme.com" (optional)
+ sslCertificateStatus: PENDING, ACTIVE, EXPIRED
+ allowedDomains: ["@acme.com", "@partner.com"]
+ ssoProvider: GOOGLE_WORKSPACE, OKTA, etc.
```

#### **Users** - Enhanced Authentication
```sql
+ lastLoginMethod: PASSWORD, GOOGLE, GITHUB, etc.
+ onboardingCompleted: Boolean
+ twoFactorEnabled: Boolean
+ backupCodes: Array of recovery codes
```

#### **Sessions** - Cross-Subdomain Support
```sql
+ sessionType: WEB, MOBILE, API
+ subdomain: Which subdomain session belongs to
+ device, browser, os: Parsed from userAgent
+ isActive: Session status
+ riskScore: Security assessment
```

## 🔧 Implementation Steps

### Phase 1: Database Migration ✅

1. **Apply Schema Changes**
   ```bash
   cd backend
   cp prisma/schema-enhanced.prisma prisma/schema.prisma
   npx prisma migrate dev --name "enhanced_oauth_subdomain"
   ```

2. **Verify New Tables**
   ```bash
   npx prisma studio
   # Check: subdomain_records, social_accounts, oauth_configs
   ```

### Phase 2: Update Backend Code

1. **Update Prisma Types**
   ```bash
   npx prisma generate
   # New types: SubdomainRecord, SocialAccount, OAuthConfig
   ```

2. **Create New Services**
   ```typescript
   // backend/src/services/subdomain.service.ts
   // backend/src/services/oauth.service.ts
   // backend/src/services/dns.service.ts
   ```

3. **Update Middleware**
   ```typescript
   // backend/src/middleware/tenant.ts - Add subdomain resolution
   // backend/src/middleware/auth.ts - Add OAuth support
   ```

### Phase 3: Frontend Updates

1. **Update Routing Logic**
   ```typescript
   // frontend/src/utils/routing.ts - True subdomain detection
   // frontend/src/App.tsx - Subdomain-based routing
   ```

2. **Add OAuth Components**
   ```typescript
   // frontend/src/components/auth/OAuthButton.tsx
   // frontend/src/pages/auth/OAuthCallback.tsx
   ```

## 🔍 Key Schema Improvements

### 🔐 Security Enhancements

1. **OAuth Token Management**
   - Separate table for OAuth tokens
   - Automatic token refresh
   - Provider-specific data isolation

2. **Session Security**
   - Risk scoring for suspicious sessions
   - Device fingerprinting
   - Cross-subdomain session tracking

3. **Audit Trail**
   - Enhanced logging for subdomain operations
   - OAuth event tracking
   - Security incident monitoring

### 🚀 Subdomain Infrastructure

1. **DNS Management**
   - Automatic CNAME creation
   - Health monitoring
   - SSL certificate tracking

2. **Multi-Domain Support**
   - Custom domains (`acme.com`)
   - Wildcard SSL support
   - Domain verification workflow

### 🎯 Enterprise Features

1. **SSO Integration**
   - SAML support
   - Google Workspace
   - Microsoft 365
   - Custom identity providers

2. **Organization Management**
   - Domain-restricted signup
   - Auto-user provisioning
   - Role-based access control

## ⚡ Benefits After Migration

### 🏢 For Organizations
- **Custom Subdomains**: `acme.neurallempire.com`
- **Branded Experience**: Custom domains
- **Enterprise SSO**: Seamless team access
- **Advanced Security**: MFA, session monitoring

### 👥 For Users
- **One-Click Login**: OAuth providers
- **Cross-Device Sessions**: Seamless experience
- **Enhanced Security**: Risk-based authentication
- **Personalized Onboarding**: Role-based setup

### 🛠️ For Developers
- **Type Safety**: Full Prisma type support
- **Audit Trail**: Comprehensive logging
- **Scalable Architecture**: Multi-tenant design
- **API-First**: RESTful endpoints

## 🚨 Migration Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] Current schema documented
- [ ] Migration plan reviewed
- [ ] Test environment prepared

### During Migration
- [ ] Schema migration applied
- [ ] New tables created
- [ ] Existing data preserved
- [ ] Indexes created
- [ ] Foreign keys established

### Post-Migration
- [ ] Prisma client regenerated
- [ ] Backend services updated
- [ ] Frontend components updated
- [ ] Tests updated
- [ ] Documentation updated

### Verification
- [ ] All tables accessible
- [ ] Data integrity maintained
- [ ] Performance acceptable
- [ ] Security features working
- [ ] OAuth flows functional

## 🔗 Next Steps

1. **Apply Migration** (This document)
2. **Implement OAuth Services**
3. **Create Subdomain Management**
4. **Update Frontend Routing**
5. **Test End-to-End Flows**
6. **Deploy to Production**

## 📞 Support

If you encounter issues during migration:

1. **Check Migration Status**
   ```bash
   npx prisma migrate status
   ```

2. **Reset if Needed**
   ```bash
   npx prisma migrate reset
   npx prisma db push
   ```

3. **Verify Schema**
   ```bash
   npx prisma validate
   npx prisma format
   ```

Your database will be ready for enterprise-grade subdomain-based SaaS operations after this migration! 🚀