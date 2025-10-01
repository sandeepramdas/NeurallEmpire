-- CreateEnum
CREATE TYPE "SubdomainStatus" AS ENUM ('PENDING', 'CONFIGURING', 'ACTIVE', 'FAILED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "SSLStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'FAILED', 'RENEWING');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB', 'LINKEDIN', 'MICROSOFT', 'FACEBOOK', 'TWITTER', 'APPLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SSOProvider" AS ENUM ('GOOGLE_WORKSPACE', 'MICROSOFT_365', 'OKTA', 'AUTH0', 'SAML', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('WEB', 'MOBILE', 'API', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('PASSWORD', 'GOOGLE', 'GITHUB', 'LINKEDIN', 'MICROSOFT', 'FACEBOOK', 'SSO', 'API_KEY', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'VIEWER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRIAL', 'FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'DELINQUENT', 'CANCELLED', 'BANNED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'ANALYST', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DRAFT', 'TESTING', 'READY', 'ACTIVE', 'PAUSED', 'RUNNING', 'ERROR', 'MAINTENANCE', 'DEPRECATED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CHAT', 'COMPLETION', 'FUNCTION_CALL', 'WORKFLOW');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'EVENT');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID', 'TRIALING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'BILLING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('LEAD_GENERATOR', 'EMAIL_MARKETER', 'SOCIAL_MEDIA', 'CONTENT_CREATOR', 'ANALYTICS', 'CUSTOMER_SERVICE', 'SALES', 'SEO_OPTIMIZER', 'CONVERSATIONAL', 'TASK_AUTOMATION', 'DATA_PROCESSOR', 'INTEGRATION', 'EMAIL_MARKETING', 'WORKFLOW_AUTOMATION', 'DATA_PROCESSING', 'INTEGRATION_AGENT', 'MONITORING_AGENT', 'RESEARCH_AGENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SwarmType" AS ENUM ('SEQUENTIAL', 'PARALLEL', 'HIERARCHICAL', 'COLLABORATIVE');

-- CreateEnum
CREATE TYPE "SwarmRole" AS ENUM ('LEADER', 'WORKER', 'COORDINATOR', 'SPECIALIST');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "permissions" JSONB NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'TRIAL',
    "statusReason" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedBy" TEXT,
    "subdomainEnabled" BOOLEAN NOT NULL DEFAULT true,
    "subdomainStatus" "SubdomainStatus" NOT NULL DEFAULT 'PENDING',
    "subdomainVerifiedAt" TIMESTAMP(3),
    "customDomain" TEXT,
    "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "sslCertificateStatus" "SSLStatus" NOT NULL DEFAULT 'PENDING',
    "sslCertificateExpiry" TIMESTAMP(3),
    "planType" "PlanType" NOT NULL DEFAULT 'TRIAL',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "subscriptionId" TEXT,
    "billingEmail" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "trialExtended" BOOLEAN NOT NULL DEFAULT false,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxAgents" INTEGER NOT NULL DEFAULT 10,
    "maxWorkflows" INTEGER NOT NULL DEFAULT 20,
    "maxApiCalls" INTEGER NOT NULL DEFAULT 10000,
    "storageLimit" BIGINT NOT NULL DEFAULT 5368709120,
    "currentUsers" INTEGER NOT NULL DEFAULT 0,
    "currentAgents" INTEGER NOT NULL DEFAULT 0,
    "currentWorkflows" INTEGER NOT NULL DEFAULT 0,
    "apiCallsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "storageUsed" BIGINT NOT NULL DEFAULT 0,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoProvider" "SSOProvider",
    "ssoConfig" JSONB,
    "samlMetadata" TEXT,
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataRetention" INTEGER NOT NULL DEFAULT 90,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "setupWizardCompleted" BOOLEAN NOT NULL DEFAULT false,
    "firstAgentCreated" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "department" TEXT,
    "title" TEXT,
    "permissions" JSONB,
    "canCreateAgents" BOOLEAN NOT NULL DEFAULT true,
    "canManageWorkflows" BOOLEAN NOT NULL DEFAULT true,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "lastLoginMethod" "LoginMethod",
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'WEB',
    "loginMethod" "LoginMethod",
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "location" JSONB,
    "subdomain" TEXT,
    "originUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "avatar" TEXT,
    "category" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "frequencyPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "presencePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tools" JSONB,
    "integrations" JSONB,
    "pricing" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_interactions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "type" "InteractionType" NOT NULL DEFAULT 'CHAT',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "context" JSONB,
    "tokens" JSONB,
    "latency" INTEGER,
    "cost" DOUBLE PRECISION,
    "status" "InteractionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_workflows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggerConfig" JSONB,
    "schedule" TEXT,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "avgDuration" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastExecutedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "currentNode" TEXT,
    "completedNodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "input" JSONB,
    "output" JSONB,
    "variables" JSONB,
    "error" TEXT,
    "failedNode" TEXT,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_templates" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "configTemplate" JSONB NOT NULL,
    "requirements" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentGatewaySubscriptionId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "planType" "PlanType" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "taxAmount" DOUBLE PRECISION,
    "userLimit" INTEGER NOT NULL,
    "agentLimit" INTEGER NOT NULL,
    "workflowLimit" INTEGER NOT NULL,
    "apiCallLimit" INTEGER NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "taxAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentGatewayInvoiceId" TEXT,
    "paymentGatewayChargeId" TEXT,
    "paymentGateway" TEXT NOT NULL DEFAULT 'razorpay',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "dimensions" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_swarms" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SwarmType" NOT NULL DEFAULT 'SEQUENTIAL',
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB,
    "executionOrder" JSONB,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "avgDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastExecutedAt" TIMESTAMP(3),

    CONSTRAINT "agent_swarms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swarm_members" (
    "id" TEXT NOT NULL,
    "swarmId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" "SwarmRole" NOT NULL DEFAULT 'WORKER',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastExecutedAt" TIMESTAMP(3),

    CONSTRAINT "swarm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AgentToAgentWorkflow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "admin_actions_targetType_targetId_idx" ON "admin_actions"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_customDomain_key" ON "organizations"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_subscriptionId_key" ON "organizations"("subscriptionId");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_planType_idx" ON "organizations"("planType");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_subdomainStatus_idx" ON "organizations"("subdomainStatus");

-- CreateIndex
CREATE UNIQUE INDEX "subdomain_records_subdomain_key" ON "subdomain_records"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "subdomain_records_fullDomain_key" ON "subdomain_records"("fullDomain");

-- CreateIndex
CREATE INDEX "subdomain_records_subdomain_idx" ON "subdomain_records"("subdomain");

-- CreateIndex
CREATE INDEX "subdomain_records_status_idx" ON "subdomain_records"("status");

-- CreateIndex
CREATE INDEX "subdomain_records_organizationId_idx" ON "subdomain_records"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_status_idx" ON "users"("organizationId", "status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");

-- CreateIndex
CREATE INDEX "social_accounts_provider_idx" ON "social_accounts"("provider");

-- CreateIndex
CREATE INDEX "social_accounts_organizationId_idx" ON "social_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_providerId_key" ON "social_accounts"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_userId_provider_key" ON "social_accounts"("userId", "provider");

-- CreateIndex
CREATE INDEX "oauth_configs_organizationId_idx" ON "oauth_configs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_configs_organizationId_provider_key" ON "oauth_configs"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_subdomain_idx" ON "sessions"("subdomain");

-- CreateIndex
CREATE INDEX "sessions_isActive_idx" ON "sessions"("isActive");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "agents_organizationId_status_idx" ON "agents"("organizationId", "status");

-- CreateIndex
CREATE INDEX "agents_isPublic_category_idx" ON "agents"("isPublic", "category");

-- CreateIndex
CREATE INDEX "agents_creatorId_idx" ON "agents"("creatorId");

-- CreateIndex
CREATE INDEX "agent_interactions_organizationId_agentId_idx" ON "agent_interactions"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "agent_interactions_startedAt_idx" ON "agent_interactions"("startedAt");

-- CreateIndex
CREATE INDEX "agent_interactions_status_idx" ON "agent_interactions"("status");

-- CreateIndex
CREATE INDEX "agent_workflows_organizationId_status_idx" ON "agent_workflows"("organizationId", "status");

-- CreateIndex
CREATE INDEX "agent_workflows_creatorId_idx" ON "agent_workflows"("creatorId");

-- CreateIndex
CREATE INDEX "workflow_executions_workflowId_status_idx" ON "workflow_executions"("workflowId", "status");

-- CreateIndex
CREATE INDEX "agent_templates_isPublic_category_idx" ON "agent_templates"("isPublic", "category");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paymentGatewaySubscriptionId_key" ON "subscriptions"("paymentGatewaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentGatewayInvoiceId_key" ON "invoices"("paymentGatewayInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_action_idx" ON "audit_logs"("organizationId", "action");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_metrics_organizationId_metricType_idx" ON "usage_metrics"("organizationId", "metricType");

-- CreateIndex
CREATE INDEX "usage_metrics_recordedAt_idx" ON "usage_metrics"("recordedAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_userId_isRead_idx" ON "notifications"("organizationId", "userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "swarm_members_swarmId_agentId_key" ON "swarm_members"("swarmId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "_AgentToAgentWorkflow_AB_unique" ON "_AgentToAgentWorkflow"("A", "B");

-- CreateIndex
CREATE INDEX "_AgentToAgentWorkflow_B_index" ON "_AgentToAgentWorkflow"("B");

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subdomain_records" ADD CONSTRAINT "subdomain_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_configs" ADD CONSTRAINT "oauth_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_interactions" ADD CONSTRAINT "agent_interactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_interactions" ADD CONSTRAINT "agent_interactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "agent_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "agent_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_swarms" ADD CONSTRAINT "agent_swarms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_swarms" ADD CONSTRAINT "agent_swarms_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swarm_members" ADD CONSTRAINT "swarm_members_swarmId_fkey" FOREIGN KEY ("swarmId") REFERENCES "agent_swarms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swarm_members" ADD CONSTRAINT "swarm_members_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentToAgentWorkflow" ADD CONSTRAINT "_AgentToAgentWorkflow_A_fkey" FOREIGN KEY ("A") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentToAgentWorkflow" ADD CONSTRAINT "_AgentToAgentWorkflow_B_fkey" FOREIGN KEY ("B") REFERENCES "agent_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
