-- ==================== NEURALLEMPIRE SCHEMA ENHANCEMENT ====================
-- Migration: Add Subdomain Management & Enhanced OAuth Support
-- Version: 2.1
-- Date: 2025-01-15

-- ==================== NEW ENUMS ====================

-- Create new enums for subdomain management
CREATE TYPE "SubdomainStatus" AS ENUM ('PENDING', 'CONFIGURING', 'ACTIVE', 'FAILED', 'SUSPENDED', 'DELETED');
CREATE TYPE "SSLStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'FAILED', 'RENEWING');
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- Create new enums for OAuth
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB', 'LINKEDIN', 'MICROSOFT', 'FACEBOOK', 'TWITTER', 'APPLE', 'CUSTOM');
CREATE TYPE "SSOProvider" AS ENUM ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'OKTA', 'AUTH0', 'SAML', 'CUSTOM');

-- Create new enums for sessions
CREATE TYPE "SessionType" AS ENUM ('WEB', 'MOBILE', 'API', 'ADMIN', 'SYSTEM');
CREATE TYPE "LoginMethod" AS ENUM ('PASSWORD', 'GOOGLE', 'GITHUB', 'LINKEDIN', 'MICROSOFT', 'FACEBOOK', 'SSO', 'API_KEY', 'MAGIC_LINK');

-- ==================== ENHANCE EXISTING TABLES ====================

-- Enhance Organizations table for subdomain support
ALTER TABLE "organizations" ADD COLUMN "subdomainEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN "subdomainStatus" "SubdomainStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "organizations" ADD COLUMN "subdomainVerifiedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "customDomain" VARCHAR(255) UNIQUE;
ALTER TABLE "organizations" ADD COLUMN "customDomainVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "sslCertificateStatus" "SSLStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "organizations" ADD COLUMN "sslCertificateExpiry" TIMESTAMP(3);

-- Enhanced SSO fields
ALTER TABLE "organizations" ADD COLUMN "ssoProvider" "SSOProvider";
ALTER TABLE "organizations" ADD COLUMN "samlMetadata" TEXT;
ALTER TABLE "organizations" ADD COLUMN "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Enhanced onboarding
ALTER TABLE "organizations" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN "setupWizardCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "firstAgentCreated" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for new Organization fields
CREATE INDEX "organizations_subdomainStatus_idx" ON "organizations"("subdomainStatus");

-- Enhance Users table
ALTER TABLE "users" ADD COLUMN "lastLoginMethod" "LoginMethod";
ALTER TABLE "users" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "locale" VARCHAR(10) NOT NULL DEFAULT 'en';
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "twoFactorSecret" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for lastLoginAt
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- Enhance Sessions table
ALTER TABLE "sessions" ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'WEB';
ALTER TABLE "sessions" ADD COLUMN "loginMethod" "LoginMethod";
ALTER TABLE "sessions" ADD COLUMN "device" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN "browser" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN "os" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN "location" JSONB;
ALTER TABLE "sessions" ADD COLUMN "subdomain" VARCHAR(255);
ALTER TABLE "sessions" ADD COLUMN "originUrl" TEXT;
ALTER TABLE "sessions" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "sessions" ADD COLUMN "isSuspicious" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN "riskScore" DOUBLE PRECISION;
ALTER TABLE "sessions" ADD COLUMN "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "metadata" JSONB;

-- Create indexes for new Session fields
CREATE INDEX "sessions_subdomain_idx" ON "sessions"("subdomain");
CREATE INDEX "sessions_isActive_idx" ON "sessions"("isActive");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- ==================== CREATE NEW TABLES ====================

-- Subdomain Records Management
CREATE TABLE "subdomain_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "fullDomain" TEXT NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'CNAME',
    "recordValue" TEXT NOT NULL,
    "status" "SubdomainStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dnsProvider" TEXT NOT NULL DEFAULT 'cloudflare',
    "externalRecordId" TEXT,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sslProvider" TEXT NOT NULL DEFAULT 'cloudflare',
    "sslCertId" TEXT,
    "lastHealthCheck" TIMESTAMP(3),
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "responseTime" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subdomain_records_pkey" PRIMARY KEY ("id")
);

-- Create indexes for subdomain_records
CREATE UNIQUE INDEX "subdomain_records_subdomain_key" ON "subdomain_records"("subdomain");
CREATE UNIQUE INDEX "subdomain_records_fullDomain_key" ON "subdomain_records"("fullDomain");
CREATE INDEX "subdomain_records_subdomain_idx" ON "subdomain_records"("subdomain");
CREATE INDEX "subdomain_records_status_idx" ON "subdomain_records"("status");
CREATE INDEX "subdomain_records_organizationId_idx" ON "subdomain_records"("organizationId");

-- Social Accounts (OAuth)
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "providerUsername" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayName" TEXT,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "providerData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for social_accounts
CREATE UNIQUE INDEX "social_accounts_provider_providerId_key" ON "social_accounts"("provider", "providerId");
CREATE UNIQUE INDEX "social_accounts_userId_provider_key" ON "social_accounts"("userId", "provider");
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");
CREATE INDEX "social_accounts_provider_idx" ON "social_accounts"("provider");
CREATE INDEX "social_accounts_organizationId_idx" ON "social_accounts"("organizationId");

-- OAuth Configuration
CREATE TABLE "oauth_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoCreateUsers" BOOLEAN NOT NULL DEFAULT true,
    "autoJoinOrg" BOOLEAN NOT NULL DEFAULT false,
    "defaultRole" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "buttonText" TEXT,
    "buttonColor" TEXT,
    "logoUrl" TEXT,
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalParams" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_configs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for oauth_configs
CREATE UNIQUE INDEX "oauth_configs_organizationId_provider_key" ON "oauth_configs"("organizationId", "provider");
CREATE INDEX "oauth_configs_organizationId_idx" ON "oauth_configs"("organizationId");

-- ==================== ADD FOREIGN KEY CONSTRAINTS ====================

-- Subdomain Records
ALTER TABLE "subdomain_records" ADD CONSTRAINT "subdomain_records_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Social Accounts
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OAuth Configs
ALTER TABLE "oauth_configs" ADD CONSTRAINT "oauth_configs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== DATA MIGRATION ====================

-- Update existing organizations with subdomain records
INSERT INTO "subdomain_records" (
    "id",
    "organizationId",
    "subdomain",
    "fullDomain",
    "recordValue",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    'sdr_' || "id",
    "id",
    "slug",
    "slug" || '.neurallempire.com',
    'neurallempire.com',
    'PENDING'::"SubdomainStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organizations"
WHERE "slug" IS NOT NULL;

-- Update organization subdomain status
UPDATE "organizations"
SET "subdomainStatus" = 'PENDING'::"SubdomainStatus"
WHERE "slug" IS NOT NULL;

-- ==================== CLEANUP EXISTING OAUTH FIELDS ====================

-- Note: We're keeping the existing googleId, microsoftId, githubId fields for now
-- These will be migrated to social_accounts table in a separate migration
-- after the OAuth system is fully implemented and tested

-- ==================== VERIFICATION QUERIES ====================

-- Verify new tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subdomain_records', 'social_accounts', 'oauth_configs');

-- Verify new columns were added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN ('subdomainEnabled', 'subdomainStatus', 'sslCertificateStatus');

-- Count records in new tables
SELECT
    (SELECT COUNT(*) FROM subdomain_records) as subdomain_records,
    (SELECT COUNT(*) FROM social_accounts) as social_accounts,
    (SELECT COUNT(*) FROM oauth_configs) as oauth_configs;

COMMIT;