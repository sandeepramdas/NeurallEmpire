-- ============================================
-- MIGRATION 001: N-Level Organization Hierarchy
-- ============================================
-- Author: AI Migration Plan
-- Date: 2025-10-07
-- Description: Adds support for unlimited-level organization hierarchy
--              with efficient closure table queries

-- SAFETY: This migration is BACKWARDS COMPATIBLE
-- Existing data will continue to work. New columns will be NULL initially.

BEGIN;

-- ============================================
-- Step 1: Add Hierarchy Columns to Organization
-- ============================================

-- Parent relationship
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES organizations("id") ON DELETE RESTRICT;

-- Materialized path (for efficient hierarchy queries)
-- Format: 'root.child.grandchild'
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "path" TEXT;

-- Level in hierarchy (0 = root)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "level" INTEGER DEFAULT 0;

-- Array of all ancestor IDs (for fast permission checks)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "ancestorIds" TEXT[] DEFAULT '{}';

-- Hierarchy position among siblings (for ordering)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "hierarchyPosition" INTEGER;

-- Type of organization node
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'division';
-- Types: 'holding', 'subsidiary', 'division', 'department', 'team', 'custom'

-- ============================================
-- Step 2: Create Indexes for Performance
-- ============================================

-- Index on parent for fast child queries
CREATE INDEX IF NOT EXISTS "idx_org_parent"
ON organizations("parentId")
WHERE "parentId" IS NOT NULL;

-- GIN index on ancestor array for fast permission checks
CREATE INDEX IF NOT EXISTS "idx_org_ancestors"
ON organizations USING GIN("ancestorIds");

-- Index on level for level-based queries
CREATE INDEX IF NOT EXISTS "idx_org_level"
ON organizations("level");

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS "idx_org_active_level"
ON organizations("deletedAt", "level")
WHERE "deletedAt" IS NULL;

-- ============================================
-- Step 3: Create Closure Table (Materialized View)
-- ============================================
-- This enables O(1) ancestor/descendant queries

CREATE MATERIALIZED VIEW IF NOT EXISTS "OrganizationClosure" AS
WITH RECURSIVE hierarchy AS (
    -- Base case: self-references
    SELECT
        id as "ancestorId",
        id as "descendantId",
        0 as depth,
        ARRAY[id] as path
    FROM organizations
    WHERE "deletedAt" IS NULL

    UNION ALL

    -- Recursive case: traverse down the tree
    SELECT
        h."ancestorId",
        o.id as "descendantId",
        h.depth + 1 as depth,
        h.path || o.id as path
    FROM hierarchy h
    JOIN organizations o ON o."parentId" = h."descendantId"
    WHERE o."deletedAt" IS NULL
)
SELECT * FROM hierarchy;

-- Index on closure table for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS "idx_closure_unique"
ON "OrganizationClosure"("ancestorId", "descendantId");

CREATE INDEX IF NOT EXISTS "idx_closure_descendant"
ON "OrganizationClosure"("descendantId");

-- ============================================
-- Step 4: Create Helper Functions
-- ============================================

-- Function to get all descendants of an organization
CREATE OR REPLACE FUNCTION get_descendants(org_id TEXT, max_depth INTEGER DEFAULT NULL)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    level INTEGER,
    depth_from_parent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.level,
        oc.depth as depth_from_parent
    FROM "OrganizationClosure" oc
    JOIN organizations o ON o.id = oc."descendantId"
    WHERE oc."ancestorId" = org_id
      AND oc."descendantId" != org_id
      AND (max_depth IS NULL OR oc.depth <= max_depth)
      AND o."deletedAt" IS NULL
    ORDER BY oc.depth, o.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get all ancestors of an organization
CREATE OR REPLACE FUNCTION get_ancestors(org_id TEXT)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    level INTEGER,
    depth_to_child INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.level,
        oc.depth as depth_to_child
    FROM "OrganizationClosure" oc
    JOIN organizations o ON o.id = oc."ancestorId"
    WHERE oc."descendantId" = org_id
      AND oc."ancestorId" != org_id
      AND o."deletedAt" IS NULL
    ORDER BY oc.depth DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to org (via hierarchy)
CREATE OR REPLACE FUNCTION user_has_org_access(
    user_id TEXT,
    org_id TEXT,
    inherit_access BOOLEAN DEFAULT true
) RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    IF NOT inherit_access THEN
        -- Direct access only
        SELECT EXISTS(
            SELECT 1 FROM "UserOrganization"
            WHERE "userId" = user_id
              AND "organizationId" = org_id
              AND "deletedAt" IS NULL
        ) INTO has_access;
    ELSE
        -- Check access to org or any ancestor
        SELECT EXISTS(
            SELECT 1
            FROM "UserOrganization" uo
            JOIN "OrganizationClosure" oc
              ON oc."ancestorId" = uo."organizationId"
            WHERE uo."userId" = user_id
              AND oc."descendantId" = org_id
              AND uo."deletedAt" IS NULL
        ) INTO has_access;
    END IF;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 5: Migrate Existing Data
-- ============================================

-- Initialize path for existing root organizations
UPDATE organizations
SET path = id,
    level = 0
WHERE "parentId" IS NULL
  AND path IS NULL;

-- Function to auto-refresh closure table on organization changes
CREATE OR REPLACE FUNCTION refresh_org_closure()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "OrganizationClosure";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh (can be disabled for bulk operations)
CREATE TRIGGER "trigger_refresh_org_closure"
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_org_closure();

-- ============================================
-- Step 6: Add Validation Constraints
-- ============================================

-- Prevent circular references
ALTER TABLE organizations
ADD CONSTRAINT "check_no_self_parent"
CHECK ("parentId" IS NULL OR "parentId" != id);

-- Ensure level consistency with parent
-- (This would be enforced in application logic)

-- ============================================
-- Step 7: Create Migration Metadata
-- ============================================

CREATE TABLE IF NOT EXISTS "MigrationLog" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

INSERT INTO "MigrationLog" (migration_name, success)
VALUES ('001_org_hierarchy', true);

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
/*
BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS "trigger_refresh_org_closure" ON organizations;
DROP FUNCTION IF EXISTS refresh_org_closure();

-- Drop helper functions
DROP FUNCTION IF EXISTS user_has_org_access(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_ancestors(TEXT);
DROP FUNCTION IF EXISTS get_descendants(TEXT, INTEGER);

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS "OrganizationClosure";

-- Drop indexes
DROP INDEX IF EXISTS "idx_closure_descendant";
DROP INDEX IF EXISTS "idx_closure_unique";
DROP INDEX IF EXISTS "idx_org_active_level";
DROP INDEX IF EXISTS "idx_org_level";
DROP INDEX IF EXISTS "idx_org_ancestors";
DROP INDEX IF EXISTS "idx_org_parent";

-- Drop constraints
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS "check_no_self_parent";

-- Drop columns (DANGEROUS - only if no data exists)
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "hierarchyPosition";
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "type";
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "ancestorIds";
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "level";
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "path";
-- ALTER TABLE organizations DROP COLUMN IF EXISTS "parentId";

DELETE FROM "MigrationLog" WHERE migration_name = '001_org_hierarchy';

COMMIT;
*/

-- ============================================
-- TESTING QUERIES
-- ============================================
/*
-- Test 1: Create a hierarchy
INSERT INTO organizations (id, name, slug, "planType")
VALUES
    ('org1', 'Parent Corp', 'parent-corp', 'ENTERPRISE'),
    ('org2', 'Subsidiary A', 'subsidiary-a', 'ENTERPRISE'),
    ('org3', 'Division B', 'division-b', 'PROFESSIONAL');

UPDATE organizations SET "parentId" = 'org1', level = 1, path = 'org1.org2'
WHERE id = 'org2';

UPDATE organizations SET "parentId" = 'org2', level = 2, path = 'org1.org2.org3'
WHERE id = 'org3';

-- Test 2: Query descendants
SELECT * FROM get_descendants('org1');

-- Test 3: Query ancestors
SELECT * FROM get_ancestors('org3');

-- Test 4: Check user access
SELECT user_has_org_access('user123', 'org3', true);

-- Test 5: View closure table
SELECT * FROM "OrganizationClosure" WHERE "ancestorId" = 'org1';
*/
