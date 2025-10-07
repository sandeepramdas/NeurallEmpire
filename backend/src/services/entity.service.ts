/**
 * Dynamic Entity Management Service
 * Handles runtime creation and management of custom business entities
 * Enables AI agents to create entities without code changes
 */

import { prisma } from '@/server';

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'text' | 'json' | 'enum' | 'reference';
  maxLength?: number;
  nullable?: boolean;
  unique?: boolean;
  index?: boolean;
  defaultValue?: any;
  displayName?: string;
  // For enum type
  values?: string[];
  // For reference type
  referenceEntity?: string;
  referenceColumn?: string;
  onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT';
}

export interface EntitySchemaDefinition {
  columns: ColumnDefinition[];
  indexes?: {
    columns: string[];
    unique?: boolean;
  }[];
  constraints?: {
    type: 'check' | 'unique';
    expression?: string;
    columns?: string[];
  }[];
}

export interface CreateEntityDefinitionDTO {
  organizationId: string;
  entityName: string;
  displayName: string;
  vertical?: string;
  module?: string;
  category?: string;
  schemaDefinition: EntitySchemaDefinition;
  isOrganizationScoped?: boolean;
  enableAudit?: boolean;
  enableWorkflow?: boolean;
  enableVersioning?: boolean;
  softDelete?: boolean;
  description?: string;
  tags?: string[];
  createdBy: string;
}

/**
 * Generate unique table name from entity name and organization
 */
async function generateTableName(entityName: string, organizationId: string): Promise<string> {
  // Get organization slug
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true }
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Generate name: org_slug_entity_name
  let tableName = `${org.slug}_${entityName}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // Ensure uniqueness by appending random suffix if needed
  let counter = 1;
  let uniqueName = tableName;

  while (await prisma.entityDefinition.findUnique({ where: { tableName: uniqueName } })) {
    uniqueName = `${tableName}_${counter}`;
    counter++;
  }

  return uniqueName;
}

/**
 * Validate entity schema definition
 */
export function validateEntitySchema(schema: EntitySchemaDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!schema.columns || !Array.isArray(schema.columns) || schema.columns.length === 0) {
    errors.push('Schema must have at least one column');
    return { valid: false, errors };
  }

  // Validate each column
  const columnNames = new Set<string>();
  for (const col of schema.columns) {
    // Check required column fields
    if (!col.name || !col.type) {
      errors.push('Each column must have "name" and "type"');
      continue;
    }

    // Check for duplicate column names
    if (columnNames.has(col.name)) {
      errors.push(`Duplicate column name: ${col.name}`);
    }
    columnNames.add(col.name);

    // Validate type
    const validTypes = ['string', 'number', 'boolean', 'date', 'datetime', 'text', 'json', 'enum', 'reference'];
    if (!validTypes.includes(col.type)) {
      errors.push(`Invalid column type: ${col.type}`);
    }

    // For enum, validate values exist
    if (col.type === 'enum' && (!col.values || col.values.length === 0)) {
      errors.push(`Enum column "${col.name}" must have values array`);
    }

    // For reference, validate referenceEntity exists
    if (col.type === 'reference' && !col.referenceEntity) {
      errors.push(`Reference column "${col.name}" must have referenceEntity`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate PostgreSQL DDL from schema definition
 */
export function generateDDL(
  tableName: string,
  schema: EntitySchemaDefinition,
  options: {
    isOrganizationScoped?: boolean;
    enableAudit?: boolean;
    softDelete?: boolean;
  } = {}
): string {
  let ddl = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
  ddl += `  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()`;

  // Add organizationId if scoped
  if (options.isOrganizationScoped) {
    ddl += `,\n  "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`;
  }

  // Add custom columns
  for (const col of schema.columns) {
    let pgType: string;

    // Map JSON type to PostgreSQL type
    switch (col.type) {
      case 'string':
        pgType = col.maxLength ? `VARCHAR(${col.maxLength})` : 'TEXT';
        break;
      case 'number':
        pgType = 'DECIMAL(20, 6)';
        break;
      case 'boolean':
        pgType = 'BOOLEAN';
        break;
      case 'date':
        pgType = 'DATE';
        break;
      case 'datetime':
        pgType = 'TIMESTAMP';
        break;
      case 'text':
        pgType = 'TEXT';
        break;
      case 'json':
        pgType = 'JSONB';
        break;
      case 'enum':
        if (col.values) {
          const enumValues = col.values.map(v => `'${v}'`).join(', ');
          pgType = `TEXT CHECK ("${col.name}" IN (${enumValues}))`;
        } else {
          pgType = 'TEXT';
        }
        break;
      case 'reference':
        pgType = 'TEXT';
        break;
      default:
        pgType = 'TEXT';
    }

    ddl += `,\n  "${col.name}" ${pgType}`;

    // Add constraints
    if (col.nullable === false) {
      ddl += ' NOT NULL';
    }

    if (col.unique) {
      ddl += ' UNIQUE';
    }

    if (col.defaultValue !== undefined) {
      ddl += ` DEFAULT ${col.defaultValue}`;
    }
  }

  // Add audit fields if enabled
  if (options.enableAudit) {
    ddl += `,\n  "createdBy" TEXT NOT NULL REFERENCES users(id)`;
    ddl += `,\n  "updatedBy" TEXT REFERENCES users(id)`;
    ddl += `,\n  "createdAt" TIMESTAMP DEFAULT NOW()`;
    ddl += `,\n  "updatedAt" TIMESTAMP DEFAULT NOW()`;
  }

  // Add soft delete if enabled
  if (options.softDelete) {
    ddl += `,\n  "deletedAt" TIMESTAMP`;
  }

  ddl += '\n);';

  return ddl;
}

/**
 * Create a new entity definition
 */
export async function createEntityDefinition(dto: CreateEntityDefinitionDTO) {
  // Validate schema
  const validation = validateEntitySchema(dto.schemaDefinition);
  if (!validation.valid) {
    throw new Error(`Invalid schema: ${validation.errors.join(', ')}`);
  }

  // Generate unique table name
  const tableName = await generateTableName(dto.entityName, dto.organizationId);

  // Create entity definition
  const entityDef = await prisma.entityDefinition.create({
    data: {
      organizationId: dto.organizationId,
      entityName: dto.entityName,
      displayName: dto.displayName,
      tableName,
      vertical: dto.vertical,
      module: dto.module,
      category: dto.category,
      schemaDefinition: dto.schemaDefinition as any,
      isOrganizationScoped: dto.isOrganizationScoped ?? true,
      enableAudit: dto.enableAudit ?? true,
      enableWorkflow: dto.enableWorkflow ?? false,
      enableVersioning: dto.enableVersioning ?? false,
      softDelete: dto.softDelete ?? true,
      description: dto.description,
      tags: dto.tags ?? [],
      createdBy: dto.createdBy,
      status: 'draft' // Start in draft mode for review
    }
  });

  // Generate DDL (don't execute automatically - requires manual review)
  const ddl = generateDDL(tableName, dto.schemaDefinition, {
    isOrganizationScoped: dto.isOrganizationScoped,
    enableAudit: dto.enableAudit,
    softDelete: dto.softDelete
  });

  return {
    entityDefinition: entityDef,
    ddl,
    message: 'Entity definition created in DRAFT mode. Review and activate to create table.'
  };
}

/**
 * Activate entity definition and create table
 */
export async function activateEntityDefinition(
  entityDefId: string,
  userId: string
): Promise<void> {
  const entityDef = await prisma.entityDefinition.findUnique({
    where: { id: entityDefId }
  });

  if (!entityDef) {
    throw new Error('Entity definition not found');
  }

  if (entityDef.status === 'active') {
    throw new Error('Entity definition is already active');
  }

  // Generate and execute DDL
  const ddl = generateDDL(
    entityDef.tableName,
    entityDef.schemaDefinition as unknown as EntitySchemaDefinition,
    {
      isOrganizationScoped: entityDef.isOrganizationScoped,
      enableAudit: entityDef.enableAudit,
      softDelete: entityDef.softDelete
    }
  );

  // Execute DDL using raw query
  await prisma.$executeRawUnsafe(ddl);

  // Create version history
  if (entityDef.enableVersioning) {
    await prisma.entityVersionHistory.create({
      data: {
        entityDefinitionId: entityDef.id,
        version: entityDef.version,
        schemaDefinition: entityDef.schemaDefinition,
        changeDescription: 'Initial version',
        createdBy: userId
      }
    });
  }

  // Update status to active
  await prisma.entityDefinition.update({
    where: { id: entityDefId },
    data: {
      status: 'active',
      updatedBy: userId,
      updatedAt: new Date()
    }
  });
}

/**
 * Get entity definitions for an organization
 */
export async function getEntityDefinitions(organizationId: string, filters?: {
  vertical?: string;
  module?: string;
  status?: string;
}) {
  return prisma.entityDefinition.findMany({
    where: {
      organizationId,
      ...(filters?.vertical && { vertical: filters.vertical }),
      ...(filters?.module && { module: filters.module }),
      ...(filters?.status && { status: filters.status }),
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Get entity definition by ID
 */
export async function getEntityDefinition(id: string) {
  return prisma.entityDefinition.findUnique({
    where: { id },
    include: {
      sourceRelationships: true,
      targetRelationships: true,
      versionHistory: {
        orderBy: { version: 'desc' },
        take: 10
      }
    }
  });
}

/**
 * Delete entity definition (soft delete)
 */
export async function deleteEntityDefinition(id: string, userId: string) {
  const entityDef = await prisma.entityDefinition.findUnique({
    where: { id }
  });

  if (!entityDef) {
    throw new Error('Entity definition not found');
  }

  if (entityDef.status === 'active') {
    throw new Error('Cannot delete active entity. Deprecate it first.');
  }

  await prisma.entityDefinition.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedBy: userId
    }
  });
}

export const EntityService = {
  createEntityDefinition,
  activateEntityDefinition,
  getEntityDefinitions,
  getEntityDefinition,
  deleteEntityDefinition,
  validateEntitySchema,
  generateDDL,
  generateTableName
};
