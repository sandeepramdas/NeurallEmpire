/**
 * Code Generation & Artifacts Service
 * Tracks AI-generated code for transparency and auditability
 * Enables version control and deployment tracking for AI-generated applications
 */

import { prisma } from '@/server';

export type ArtifactType =
  | 'react_component'
  | 'api_endpoint'
  | 'database_migration'
  | 'service_class'
  | 'utility_function'
  | 'test_suite'
  | 'configuration'
  | 'documentation'
  | 'full_application';

export type ArtifactStatus =
  | 'draft'
  | 'generated'
  | 'reviewed'
  | 'approved'
  | 'deployed'
  | 'failed'
  | 'deprecated';

export interface CreateCodeArtifactDTO {
  organizationId: string;
  agentId: string;
  entityDefinitionId?: string;
  artifactType: ArtifactType;
  name: string;
  description?: string;
  code: string;
  language: string;
  framework?: string;
  dependencies?: string[];
  reasoning: string;
  prompt?: string;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface ValidateCodeDTO {
  code: string;
  language: string;
  artifactType: ArtifactType;
}

export interface DeployArtifactDTO {
  artifactId: string;
  environment: 'development' | 'staging' | 'production';
  deployedBy: string;
  deploymentNotes?: string;
}

/**
 * Validate code syntax (basic validation)
 */
export async function validateCodeSyntax(dto: ValidateCodeDTO): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Basic validation checks
  if (!dto.code || dto.code.trim().length === 0) {
    errors.push('Code cannot be empty');
    return { valid: false, errors };
  }

  // Language-specific validation
  switch (dto.language.toLowerCase()) {
    case 'typescript':
    case 'javascript':
      // Check for basic syntax errors
      try {
        // This is a simple check - in production, use a proper parser
        if (dto.code.includes('function') || dto.code.includes('const') || dto.code.includes('let')) {
          // Looks like valid JS/TS
        } else if (dto.code.includes('class') || dto.code.includes('interface')) {
          // Looks like valid TS
        } else if (dto.artifactType === 'react_component') {
          if (!dto.code.includes('return') && !dto.code.includes('React')) {
            errors.push('React component should include a return statement or React import');
          }
        }
      } catch (err) {
        errors.push('Syntax error detected');
      }
      break;

    case 'sql':
      // Check for SQL keywords
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
      const hasSQL = sqlKeywords.some(keyword => dto.code.toUpperCase().includes(keyword));
      if (!hasSQL) {
        errors.push('SQL code should contain valid SQL keywords');
      }
      break;

    case 'python':
      // Check for Python syntax
      if (dto.code.includes('def ') || dto.code.includes('class ') || dto.code.includes('import ')) {
        // Looks like valid Python
      } else {
        errors.push('Python code should contain valid Python syntax');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a code artifact
 */
export async function createCodeArtifact(dto: CreateCodeArtifactDTO) {
  // Validate code syntax
  const validation = await validateCodeSyntax({
    code: dto.code,
    language: dto.language,
    artifactType: dto.artifactType
  });

  // Store artifact using raw SQL (since we don't have the Prisma model yet)
  const result = await prisma.$executeRaw`
    INSERT INTO "CodeArtifacts" (
      id,
      "organizationId",
      "agentId",
      "entityDefinitionId",
      "artifactType",
      name,
      description,
      code,
      language,
      framework,
      dependencies,
      reasoning,
      prompt,
      "syntaxValid",
      "syntaxErrors",
      status,
      version,
      metadata,
      "createdBy",
      "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${dto.organizationId},
      ${dto.agentId},
      ${dto.entityDefinitionId || null},
      ${dto.artifactType},
      ${dto.name},
      ${dto.description || null},
      ${dto.code},
      ${dto.language},
      ${dto.framework || null},
      ${dto.dependencies || []}::text[],
      ${dto.reasoning},
      ${dto.prompt || null},
      ${validation.valid},
      ${JSON.stringify(validation.errors)}::jsonb,
      'generated',
      1,
      ${JSON.stringify(dto.metadata || {})}::jsonb,
      ${dto.createdBy},
      NOW()
    )
    RETURNING id
  `;

  return {
    artifactId: result,
    validation,
    status: 'generated',
    message: validation.valid
      ? 'Code artifact created successfully'
      : 'Code artifact created with validation errors'
  };
}

/**
 * Get code artifacts for an organization
 */
export async function getCodeArtifacts(
  organizationId: string,
  filters?: {
    agentId?: string;
    entityDefinitionId?: string;
    artifactType?: ArtifactType;
    status?: ArtifactStatus;
    limit?: number;
  }
) {
  const {
    agentId,
    entityDefinitionId,
    artifactType,
    status,
    limit = 50
  } = filters || {};

  // Build WHERE conditions dynamically
  const whereConditions = ['WHERE "organizationId" = $1', 'AND "deletedAt" IS NULL'];
  const params: any[] = [organizationId];
  let paramIndex = 2;

  if (agentId) {
    whereConditions.push(`AND "agentId" = $${paramIndex}`);
    params.push(agentId);
    paramIndex++;
  }

  if (entityDefinitionId) {
    whereConditions.push(`AND "entityDefinitionId" = $${paramIndex}`);
    params.push(entityDefinitionId);
    paramIndex++;
  }

  if (artifactType) {
    whereConditions.push(`AND "artifactType" = $${paramIndex}`);
    params.push(artifactType);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`AND status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const query = `
    SELECT
      id,
      "agentId",
      "artifactType",
      name,
      description,
      language,
      framework,
      "syntaxValid",
      status,
      version,
      "createdAt",
      "deployedAt"
    FROM "CodeArtifacts"
    ${whereConditions.join('\n      ')}
    ORDER BY "createdAt" DESC
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string;
    agentId: string;
    artifactType: string;
    name: string;
    description: string;
    language: string;
    framework: string;
    syntaxValid: boolean;
    status: string;
    version: number;
    createdAt: Date;
    deployedAt: Date | null;
  }>>(query, ...params);

  return results;
}

/**
 * Get a specific code artifact by ID
 */
export async function getCodeArtifact(id: string) {
  const results = await prisma.$queryRaw<Array<{
    id: string;
    organizationId: string;
    agentId: string;
    entityDefinitionId: string | null;
    artifactType: string;
    name: string;
    description: string;
    code: string;
    language: string;
    framework: string;
    dependencies: string[];
    reasoning: string;
    prompt: string;
    syntaxValid: boolean;
    syntaxErrors: string[];
    status: string;
    version: number;
    metadata: any;
    createdBy: string;
    reviewedBy: string | null;
    approvedBy: string | null;
    deployedBy: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    approvedAt: Date | null;
    deployedAt: Date | null;
  }>>`
    SELECT *
    FROM "CodeArtifacts"
    WHERE id = ${id}
      AND "deletedAt" IS NULL
  `;

  return results[0] || null;
}

/**
 * Review code artifact
 */
export async function reviewCodeArtifact(
  artifactId: string,
  reviewedBy: string,
  approved: boolean,
  reviewNotes?: string
) {
  await prisma.$executeRaw`
    UPDATE "CodeArtifacts"
    SET
      status = ${approved ? 'approved' : 'reviewed'},
      "reviewedBy" = ${reviewedBy},
      "reviewedAt" = NOW(),
      "approvedBy" = ${approved ? reviewedBy : null},
      "approvedAt" = ${approved ? prisma.$queryRaw`NOW()` : null},
      "reviewNotes" = ${reviewNotes || null}
    WHERE id = ${artifactId}
  `;
}

/**
 * Deploy code artifact
 */
export async function deployCodeArtifact(dto: DeployArtifactDTO) {
  const artifact = await getCodeArtifact(dto.artifactId);

  if (!artifact) {
    throw new Error('Artifact not found');
  }

  if (artifact.status !== 'approved' && dto.environment === 'production') {
    throw new Error('Only approved artifacts can be deployed to production');
  }

  // Update deployment status
  await prisma.$executeRaw`
    UPDATE "CodeArtifacts"
    SET
      status = 'deployed',
      "deployedBy" = ${dto.deployedBy},
      "deployedAt" = NOW(),
      "deploymentEnvironment" = ${dto.environment},
      "deploymentNotes" = ${dto.deploymentNotes || null}
    WHERE id = ${dto.artifactId}
  `;

  // Log deployment decision
  await prisma.$executeRaw`
    INSERT INTO "AIDecisionLog" (
      id,
      "organizationId",
      "agentId",
      "decisionType",
      context,
      decision,
      reasoning,
      "confidenceScore",
      outcome,
      "createdBy",
      "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${artifact.organizationId},
      ${artifact.agentId},
      'code_deployment',
      ${{
        artifactId: dto.artifactId,
        artifactType: artifact.artifactType,
        environment: dto.environment
      }}::jsonb,
      'deploy',
      ${dto.deploymentNotes || `Deployed ${artifact.name} to ${dto.environment}`},
      1.0,
      'success',
      ${dto.deployedBy},
      NOW()
    )
  `;

  return {
    success: true,
    message: `Artifact deployed to ${dto.environment}`
  };
}

/**
 * Create new version of artifact
 */
export async function createArtifactVersion(
  originalArtifactId: string,
  updatedCode: string,
  changeDescription: string,
  updatedBy: string
) {
  const original = await getCodeArtifact(originalArtifactId);

  if (!original) {
    throw new Error('Original artifact not found');
  }

  // Validate new code
  const validation = await validateCodeSyntax({
    code: updatedCode,
    language: original.language,
    artifactType: original.artifactType as ArtifactType
  });

  const newVersion = original.version + 1;

  // Create new version
  await prisma.$executeRaw`
    INSERT INTO "CodeArtifacts" (
      id,
      "organizationId",
      "agentId",
      "entityDefinitionId",
      "artifactType",
      name,
      description,
      code,
      language,
      framework,
      dependencies,
      reasoning,
      "syntaxValid",
      "syntaxErrors",
      status,
      version,
      "previousVersionId",
      "changeDescription",
      metadata,
      "createdBy",
      "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${original.organizationId},
      ${original.agentId},
      ${original.entityDefinitionId},
      ${original.artifactType},
      ${original.name},
      ${original.description},
      ${updatedCode},
      ${original.language},
      ${original.framework},
      ${original.dependencies}::text[],
      ${changeDescription},
      ${validation.valid},
      ${JSON.stringify(validation.errors)}::jsonb,
      'generated',
      ${newVersion},
      ${originalArtifactId},
      ${changeDescription},
      ${original.metadata}::jsonb,
      ${updatedBy},
      NOW()
    )
  `;

  return {
    version: newVersion,
    validation
  };
}

/**
 * Get artifact version history
 */
export async function getArtifactVersionHistory(artifactId: string) {
  // Get the artifact and trace back through previousVersionId
  const results = await prisma.$queryRaw<Array<{
    id: string;
    version: number;
    code: string;
    changeDescription: string;
    createdBy: string;
    createdAt: Date;
    status: string;
  }>>`
    WITH RECURSIVE versions AS (
      SELECT id, version, code, "changeDescription", "createdBy", "createdAt", status, "previousVersionId"
      FROM "CodeArtifacts"
      WHERE id = ${artifactId}

      UNION ALL

      SELECT a.id, a.version, a.code, a."changeDescription", a."createdBy", a."createdAt", a.status, a."previousVersionId"
      FROM "CodeArtifacts" a
      INNER JOIN versions v ON v."previousVersionId" = a.id
    )
    SELECT id, version, code, "changeDescription", "createdBy", "createdAt", status
    FROM versions
    ORDER BY version DESC
  `;

  return results;
}

export const CodeGenerationService = {
  createCodeArtifact,
  getCodeArtifacts,
  getCodeArtifact,
  reviewCodeArtifact,
  deployCodeArtifact,
  createArtifactVersion,
  getArtifactVersionHistory,
  validateCodeSyntax
};
