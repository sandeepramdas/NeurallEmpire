-- CreateTable
CREATE TABLE IF NOT EXISTS "tool_permissions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "roleId" TEXT,
    "actions" JSONB NOT NULL,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tool_executions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "orchestrator_workflow_executions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orchestrator_workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_collaborations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextExecutionAt" TIMESTAMP(3),
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "schedule_executions" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "duration" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace_items" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "version" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorOrganizationId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricing" JSONB NOT NULL,
    "icon" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "demoVideo" TEXT,
    "definition" JSONB NOT NULL,
    "requirements" JSONB,
    "documentation" TEXT,
    "changelog" TEXT,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "activeInstallCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace_installations" (
    "id" TEXT NOT NULL,
    "marketplaceItemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "installedBy" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "metadata" JSONB,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "marketplaceItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_permissions_toolId_organizationId_idx" ON "tool_permissions"("toolId", "organizationId");
CREATE INDEX IF NOT EXISTS "tool_permissions_userId_idx" ON "tool_permissions"("userId");
CREATE INDEX IF NOT EXISTS "tool_permissions_roleId_idx" ON "tool_permissions"("roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_executions_toolId_organizationId_idx" ON "tool_executions"("toolId", "organizationId");
CREATE INDEX IF NOT EXISTS "tool_executions_userId_idx" ON "tool_executions"("userId");
CREATE INDEX IF NOT EXISTS "tool_executions_executedAt_idx" ON "tool_executions"("executedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workflows_organizationId_idx" ON "workflows"("organizationId");
CREATE INDEX IF NOT EXISTS "workflows_isActive_idx" ON "workflows"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "orchestrator_workflow_executions_executionId_key" ON "orchestrator_workflow_executions"("executionId");
CREATE INDEX IF NOT EXISTS "orchestrator_workflow_executions_workflowId_idx" ON "orchestrator_workflow_executions"("workflowId");
CREATE INDEX IF NOT EXISTS "orchestrator_workflow_executions_organizationId_idx" ON "orchestrator_workflow_executions"("organizationId");
CREATE INDEX IF NOT EXISTS "orchestrator_workflow_executions_executionId_idx" ON "orchestrator_workflow_executions"("executionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_collaborations_organizationId_idx" ON "agent_collaborations"("organizationId");
CREATE INDEX IF NOT EXISTS "agent_collaborations_pattern_idx" ON "agent_collaborations"("pattern");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schedules_organizationId_idx" ON "schedules"("organizationId");
CREATE INDEX IF NOT EXISTS "schedules_agentId_idx" ON "schedules"("agentId");
CREATE INDEX IF NOT EXISTS "schedules_isActive_idx" ON "schedules"("isActive");
CREATE INDEX IF NOT EXISTS "schedules_nextExecutionAt_idx" ON "schedules"("nextExecutionAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schedule_executions_scheduleId_idx" ON "schedule_executions"("scheduleId");
CREATE INDEX IF NOT EXISTS "schedule_executions_status_idx" ON "schedule_executions"("status");
CREATE INDEX IF NOT EXISTS "schedule_executions_scheduledFor_idx" ON "schedule_executions"("scheduledFor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_items_type_idx" ON "marketplace_items"("type");
CREATE INDEX IF NOT EXISTS "marketplace_items_category_idx" ON "marketplace_items"("category");
CREATE INDEX IF NOT EXISTS "marketplace_items_isPublic_idx" ON "marketplace_items"("isPublic");
CREATE INDEX IF NOT EXISTS "marketplace_items_isOfficial_idx" ON "marketplace_items"("isOfficial");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_installations_marketplaceItemId_idx" ON "marketplace_installations"("marketplaceItemId");
CREATE INDEX IF NOT EXISTS "marketplace_installations_organizationId_idx" ON "marketplace_installations"("organizationId");
CREATE INDEX IF NOT EXISTS "marketplace_installations_status_idx" ON "marketplace_installations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "marketplace_reviews_marketplaceItemId_idx" ON "marketplace_reviews"("marketplaceItemId");
CREATE INDEX IF NOT EXISTS "marketplace_reviews_userId_idx" ON "marketplace_reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "role_assignments_userId_organizationId_roleId_key" ON "role_assignments"("userId", "organizationId", "roleId");
CREATE INDEX IF NOT EXISTS "role_assignments_userId_idx" ON "role_assignments"("userId");
CREATE INDEX IF NOT EXISTS "role_assignments_organizationId_idx" ON "role_assignments"("organizationId");
CREATE INDEX IF NOT EXISTS "role_assignments_roleId_idx" ON "role_assignments"("roleId");

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orchestrator_workflow_executions_workflowId_fkey') THEN
  ALTER TABLE "orchestrator_workflow_executions" ADD CONSTRAINT "orchestrator_workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_executions_scheduleId_fkey') THEN
  ALTER TABLE "schedule_executions" ADD CONSTRAINT "schedule_executions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_installations_marketplaceItemId_fkey') THEN
  ALTER TABLE "marketplace_installations" ADD CONSTRAINT "marketplace_installations_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "marketplace_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_reviews_marketplaceItemId_fkey') THEN
  ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_marketplaceItemId_fkey" FOREIGN KEY ("marketplaceItemId") REFERENCES "marketplace_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
 END IF;
END $$;
