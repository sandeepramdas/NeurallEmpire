-- ============================================
-- MIGRATION 002: Dynamic Entity Definition System
-- ============================================
-- Author: AI Migration Plan
-- Date: 2025-10-07
-- Description: Enables runtime creation of custom business entities
--              without code changes - the foundation for AI app generation

BEGIN;

-- ============================================
-- Step 1: Entity Definition Registry
-- ============================================

CREATE TABLE IF NOT EXISTS "EntityDefinition" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,

    -- Entity Identity
    "entityName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tableName" TEXT UNIQUE NOT NULL,

    -- Classification
    vertical TEXT, -- 'healthcare', 'manufacturing', 'retail', etc.
    module TEXT, -- 'sales', 'inventory', 'hr'
    category TEXT, -- 'transactional', 'master', 'reference'

    -- JSON Schema Definition (The Magic!)
    "schemaDefinition" JSONB NOT NULL,
    /*
    Example:
    {
        "columns": [
            {
                "name": "patientName",
                "type": "string",
                "maxLength": 255,
                "nullable": false,
                "unique": false,
                "index": true,
                "displayName": "Patient Name"
            },
            {
                "name": "dateOfBirth",
                "type": "date",
                "nullable": false
            },
            {
                "name": "bloodType",
                "type": "enum",
                "values": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
            },
            {
                "name": "primaryPhysician",
                "type": "reference",
                "referenceEntity": "physicians",
                "referenceColumn": "id",
                "onDelete": "RESTRICT"
            }
        ],
        "indexes": [
            {"columns": ["patientName", "dateOfBirth"], "unique": true}
        ],
        "constraints": [
            {"type": "check", "expression": "dateOfBirth < CURRENT_DATE"}
        ]
    }
    */

    -- Entity Behaviors
    "isOrganizationScoped" BOOLEAN DEFAULT true,
    "enableAudit" BOOLEAN DEFAULT true,
    "enableWorkflow" BOOLEAN DEFAULT false,
    "enableVersioning" BOOLEAN DEFAULT false,
    "softDelete" BOOLEAN DEFAULT true,

    -- UI Metadata
    "defaultUIConfig" JSONB DEFAULT '{}',
    "listViewConfig" JSONB,
    "formViewConfig" JSONB,

    -- API Configuration
    "apiEnabled" BOOLEAN DEFAULT true,
    "apiRateLimit" INTEGER DEFAULT 1000,

    -- Lifecycle
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
    version INTEGER DEFAULT 1,
    "isSystemEntity" BOOLEAN DEFAULT false,

    -- Metadata
    description TEXT,
    tags TEXT[],
    "documentationUrl" TEXT,

    -- Audit
    "createdBy" TEXT NOT NULL REFERENCES "User"(id),
    "updatedBy" TEXT REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "deletedAt" TIMESTAMP,

    UNIQUE("organizationId", "entityName")
);

-- Indexes
CREATE INDEX "idx_entity_org_status"
ON "EntityDefinition"("organizationId", status)
WHERE "deletedAt" IS NULL;

CREATE INDEX "idx_entity_vertical"
ON "EntityDefinition"(vertical)
WHERE vertical IS NOT NULL;

CREATE INDEX "idx_entity_module"
ON "EntityDefinition"(module)
WHERE module IS NOT NULL;

-- ============================================
-- Step 2: Entity Relationship Registry
-- ============================================

CREATE TABLE IF NOT EXISTS "EntityRelationship" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source entity
    "sourceEntityId" TEXT NOT NULL REFERENCES "EntityDefinition"(id) ON DELETE CASCADE,

    -- Target entity
    "targetEntityId" TEXT NOT NULL REFERENCES "EntityDefinition"(id) ON DELETE CASCADE,

    -- Relationship type
    "relationshipType" TEXT NOT NULL,
    -- Types: 'one_to_one', 'one_to_many', 'many_to_many', 'polymorphic'

    -- Foreign key column in source
    "sourceColumn" TEXT NOT NULL,

    -- Referenced column in target (usually 'id')
    "targetColumn" TEXT DEFAULT 'id',

    -- On delete action
    "onDelete" TEXT DEFAULT 'RESTRICT',
    -- Values: 'CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT'

    -- Display metadata
    "displayName" TEXT,
    "reverseDisplayName" TEXT, -- For the other side of relationship

    "createdAt" TIMESTAMP DEFAULT NOW(),

    UNIQUE("sourceEntityId", "sourceColumn")
);

-- ============================================
-- Step 3: Dynamic Field Value Storage (EAV Pattern)
-- ============================================
-- For truly dynamic data without schema changes

CREATE TABLE IF NOT EXISTS "DynamicFieldValue" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityDefinitionId" TEXT NOT NULL REFERENCES "EntityDefinition"(id) ON DELETE CASCADE,
    "recordId" TEXT NOT NULL, -- ID of the record in the dynamic table

    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL, -- 'string', 'number', 'boolean', 'date', 'json'

    -- Polymorphic value columns
    "stringValue" TEXT,
    "numberValue" DECIMAL(20, 6),
    "booleanValue" BOOLEAN,
    "dateValue" TIMESTAMP,
    "jsonValue" JSONB,

    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),

    UNIQUE("entityDefinitionId", "recordId", "fieldName")
);

-- Index for fast lookups
CREATE INDEX "idx_dynamic_field_record"
ON "DynamicFieldValue"("entityDefinitionId", "recordId");

-- ============================================
-- Step 4: Entity Version History
-- ============================================

CREATE TABLE IF NOT EXISTS "EntityVersionHistory" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityDefinitionId" TEXT NOT NULL REFERENCES "EntityDefinition"(id) ON DELETE CASCADE,

    version INTEGER NOT NULL,
    "schemaDefinition" JSONB NOT NULL,
    "changeDescription" TEXT,
    "migrationScript" TEXT, -- SQL for data migration

    "createdBy" TEXT NOT NULL REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT NOW(),

    UNIQUE("entityDefinitionId", version)
);

-- ============================================
-- Step 5: Helper Functions
-- ============================================

-- Generate table name from entity name
CREATE OR REPLACE FUNCTION generate_table_name(entity_name TEXT, org_id TEXT)
RETURNS TEXT AS $$
DECLARE
    org_slug TEXT;
    table_name TEXT;
BEGIN
    -- Get org slug
    SELECT slug INTO org_slug
    FROM "Organization"
    WHERE id = org_id;

    -- Generate name: org_slug_entity_name
    table_name := lower(regexp_replace(org_slug || '_' || entity_name, '[^a-z0-9_]', '_', 'g'));

    -- Ensure uniqueness by appending random suffix if needed
    WHILE EXISTS(SELECT 1 FROM "EntityDefinition" WHERE "tableName" = table_name) LOOP
        table_name := table_name || '_' || substring(gen_random_uuid()::TEXT from 1 for 8);
    END LOOP;

    RETURN table_name;
END;
$$ LANGUAGE plpgsql;

-- Validate JSON schema
CREATE OR REPLACE FUNCTION validate_entity_schema(schema JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    column_def JSONB;
BEGIN
    -- Check required fields exist
    IF NOT (schema ? 'columns') THEN
        RAISE EXCEPTION 'Schema must have "columns" array';
    END IF;

    -- Validate each column definition
    FOR column_def IN SELECT * FROM jsonb_array_elements(schema->'columns')
    LOOP
        -- Check required column fields
        IF NOT (column_def ? 'name' AND column_def ? 'type') THEN
            RAISE EXCEPTION 'Each column must have "name" and "type"';
        END IF;

        -- Validate type
        IF column_def->>'type' NOT IN ('string', 'number', 'boolean', 'date', 'datetime', 'text', 'json', 'enum', 'reference') THEN
            RAISE EXCEPTION 'Invalid column type: %', column_def->>'type';
        END IF;

        -- For enum, validate values exist
        IF column_def->>'type' = 'enum' AND NOT (column_def ? 'values') THEN
            RAISE EXCEPTION 'Enum column must have "values" array';
        END IF;

        -- For reference, validate referenceEntity exists
        IF column_def->>'type' = 'reference' AND NOT (column_def ? 'referenceEntity') THEN
            RAISE EXCEPTION 'Reference column must have "referenceEntity"';
        END IF;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate DDL from schema definition
CREATE OR REPLACE FUNCTION generate_ddl_from_schema(
    entity_def_id TEXT
) RETURNS TEXT AS $$
DECLARE
    entity_rec RECORD;
    column_def JSONB;
    ddl TEXT;
    column_ddl TEXT;
    pg_type TEXT;
BEGIN
    -- Get entity definition
    SELECT * INTO entity_rec
    FROM "EntityDefinition"
    WHERE id = entity_def_id;

    -- Start DDL
    ddl := format('CREATE TABLE IF NOT EXISTS "%s" (', entity_rec."tableName");
    ddl := ddl || E'\n    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),';

    IF entity_rec."isOrganizationScoped" THEN
        ddl := ddl || E'\n    "organizationId" TEXT NOT NULL REFERENCES "Organization"(id),';
    END IF;

    -- Add custom columns
    FOR column_def IN
        SELECT * FROM jsonb_array_elements(entity_rec."schemaDefinition"->'columns')
    LOOP
        -- Map JSON type to PostgreSQL type
        pg_type := CASE column_def->>'type'
            WHEN 'string' THEN
                CASE
                    WHEN (column_def->>'maxLength')::INTEGER IS NOT NULL
                    THEN format('VARCHAR(%s)', column_def->>'maxLength')
                    ELSE 'TEXT'
                END
            WHEN 'number' THEN 'DECIMAL(20, 6)'
            WHEN 'boolean' THEN 'BOOLEAN'
            WHEN 'date' THEN 'DATE'
            WHEN 'datetime' THEN 'TIMESTAMP'
            WHEN 'text' THEN 'TEXT'
            WHEN 'json' THEN 'JSONB'
            WHEN 'enum' THEN format('TEXT CHECK ("%s" IN (%s))',
                column_def->>'name',
                (SELECT string_agg(format('''%s''', value), ', ')
                 FROM jsonb_array_elements_text(column_def->'values') value))
            WHEN 'reference' THEN 'TEXT' -- Will add FK separately
            ELSE 'TEXT'
        END;

        column_ddl := format(E'\n    "%s" %s',
            column_def->>'name',
            pg_type);

        -- Add constraints
        IF (column_def->>'nullable')::BOOLEAN = false THEN
            column_ddl := column_ddl || ' NOT NULL';
        END IF;

        IF (column_def->>'unique')::BOOLEAN = true THEN
            column_ddl := column_ddl || ' UNIQUE';
        END IF;

        IF column_def ? 'defaultValue' THEN
            column_ddl := column_ddl || format(' DEFAULT %s', column_def->>'defaultValue');
        END IF;

        ddl := ddl || column_ddl || ',';
    END LOOP;

    -- Add audit fields if enabled
    IF entity_rec."enableAudit" THEN
        ddl := ddl || E'\n    "createdBy" TEXT NOT NULL REFERENCES "User"(id),';
        ddl := ddl || E'\n    "updatedBy" TEXT REFERENCES "User"(id),';
        ddl := ddl || E'\n    "createdAt" TIMESTAMP DEFAULT NOW(),';
        ddl := ddl || E'\n    "updatedAt" TIMESTAMP DEFAULT NOW(),';
    END IF;

    -- Add soft delete if enabled
    IF entity_rec."softDelete" THEN
        ddl := ddl || E'\n    "deletedAt" TIMESTAMP,';
    END IF;

    -- Remove trailing comma and close
    ddl := regexp_replace(ddl, ',$', '');
    ddl := ddl || E'\n);';

    RETURN ddl;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 6: Trigger to Auto-Create Tables
-- ============================================

CREATE OR REPLACE FUNCTION create_dynamic_table_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    ddl TEXT;
BEGIN
    -- Validate schema
    PERFORM validate_entity_schema(NEW."schemaDefinition");

    -- Generate and execute DDL
    ddl := generate_ddl_from_schema(NEW.id);

    RAISE NOTICE 'Creating table with DDL: %', ddl;
    EXECUTE ddl;

    -- Create indexes
    -- (Additional logic here to create indexes from schema)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only auto-create tables in development
-- In production, require explicit approval
-- CREATE TRIGGER "trigger_create_dynamic_table"
-- AFTER INSERT ON "EntityDefinition"
-- FOR EACH ROW
-- WHEN (NEW.status = 'active' AND current_setting('app.environment', true) = 'development')
-- EXECUTE FUNCTION create_dynamic_table_on_insert();

-- ============================================
-- Step 7: Seed System Entities
-- ============================================

-- Insert existing entities as EntityDefinitions
-- (This makes them manageable through the same system)

-- Example: Make Account entity a system entity
-- INSERT INTO "EntityDefinition" (
--     id, "organizationId", "entityName", "displayName", "tableName",
--     "schemaDefinition", "isSystemEntity", "createdBy"
-- )
-- SELECT
--     gen_random_uuid(),
--     id as "organizationId",
--     'account',
--     'Chart of Accounts',
--     'Account',
--     '{...}' :: JSONB, -- Schema would be extracted from existing table
--     true,
--     (SELECT id FROM "User" WHERE email = 'system@neurallempire.com' LIMIT 1)
-- FROM "Organization"
-- LIMIT 1;

-- ============================================
-- Step 8: Migration Metadata
-- ============================================

INSERT INTO "MigrationLog" (migration_name, success)
VALUES ('002_entity_definitions', true);

COMMIT;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
/*
BEGIN;

DROP TRIGGER IF EXISTS "trigger_create_dynamic_table" ON "EntityDefinition";
DROP FUNCTION IF EXISTS create_dynamic_table_on_insert();
DROP FUNCTION IF EXISTS generate_ddl_from_schema(TEXT);
DROP FUNCTION IF EXISTS validate_entity_schema(JSONB);
DROP FUNCTION IF EXISTS generate_table_name(TEXT, TEXT);

DROP TABLE IF EXISTS "EntityVersionHistory";
DROP TABLE IF EXISTS "DynamicFieldValue";
DROP TABLE IF EXISTS "EntityRelationship";
DROP TABLE IF EXISTS "EntityDefinition";

DELETE FROM "MigrationLog" WHERE migration_name = '002_entity_definitions';

COMMIT;
*/

-- ============================================
-- USAGE EXAMPLES
-- ============================================
/*
-- Example 1: Define a custom "Patient" entity
INSERT INTO "EntityDefinition" (
    "organizationId",
    "entityName",
    "displayName",
    "tableName",
    vertical,
    module,
    "schemaDefinition",
    "createdBy"
) VALUES (
    'org_id_here',
    'patient',
    'Patient',
    'org_slug_patient',
    'healthcare',
    'patient_management',
    '{
        "columns": [
            {"name": "firstName", "type": "string", "maxLength": 100, "nullable": false},
            {"name": "lastName", "type": "string", "maxLength": 100, "nullable": false},
            {"name": "dateOfBirth", "type": "date", "nullable": false},
            {"name": "gender", "type": "enum", "values": ["male", "female", "other"]},
            {"name": "email", "type": "string", "unique": true},
            {"name": "phoneNumber", "type": "string", "maxLength": 20}
        ],
        "indexes": [
            {"columns": ["lastName", "firstName"], "unique": false}
        ]
    }',
    'user_id_here'
);

-- The table would be automatically created in development
-- In production, you would run:
-- SELECT generate_ddl_from_schema('entity_def_id');
-- Then execute the DDL manually after review
*/
