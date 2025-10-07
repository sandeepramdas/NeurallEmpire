import { Request, Response } from 'express';
import { prisma } from '@/server';
import { z } from 'zod';
import { CodeGenerationService } from '@/services/code-generation.service';

// Validation schemas
const createArtifactSchema = z.object({
  agentId: z.string(),
  entityDefinitionId: z.string().optional(),
  artifactType: z.enum([
    'react_component',
    'api_endpoint',
    'database_migration',
    'service_class',
    'utility_function',
    'test_suite',
    'configuration',
    'documentation',
    'full_application',
  ]),
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().min(1),
  language: z.string().min(1),
  framework: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  reasoning: z.string().min(1),
  prompt: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const deployArtifactSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  deploymentNotes: z.string().optional(),
});

const reviewArtifactSchema = z.object({
  approved: z.boolean(),
  reviewNotes: z.string().optional(),
});

export class CodeArtifactsController {
  /**
   * Get all code artifacts for an organization
   */
  async getArtifacts(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { agentId, entityDefinitionId, artifactType, status, limit } = req.query;

      const artifacts = await CodeGenerationService.getCodeArtifacts(organizationId, {
        agentId: agentId as string,
        entityDefinitionId: entityDefinitionId as string,
        artifactType: artifactType as any,
        status: status as any,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json(artifacts);
    } catch (error: any) {
      console.error('Get artifacts error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch artifacts' });
    }
  }

  /**
   * Get a single code artifact by ID
   */
  async getArtifact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const artifact = await CodeGenerationService.getCodeArtifact(id);

      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      // Check organization access
      if (artifact.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json(artifact);
    } catch (error: any) {
      console.error('Get artifact error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch artifact' });
    }
  }

  /**
   * Create a new code artifact
   */
  async createArtifact(req: Request, res: Response) {
    try {
      const validatedData = createArtifactSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Create artifact
      const result = await CodeGenerationService.createCodeArtifact({
        ...validatedData,
        organizationId,
        createdBy: userId,
      } as any);

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Create artifact error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return res.status(500).json({ error: error.message || 'Failed to create artifact' });
    }
  }

  /**
   * Review a code artifact
   */
  async reviewArtifact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = reviewArtifactSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify artifact belongs to organization
      const artifact = await CodeGenerationService.getCodeArtifact(id);
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      if (artifact.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Review artifact
      await CodeGenerationService.reviewCodeArtifact(
        id,
        userId,
        validatedData.approved,
        validatedData.reviewNotes
      );

      return res.json({
        success: true,
        message: `Artifact ${validatedData.approved ? 'approved' : 'reviewed'}`,
      });
    } catch (error: any) {
      console.error('Review artifact error:', error);
      return res.status(500).json({ error: error.message || 'Failed to review artifact' });
    }
  }

  /**
   * Deploy a code artifact
   */
  async deployArtifact(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = deployArtifactSchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify artifact belongs to organization
      const artifact = await CodeGenerationService.getCodeArtifact(id);
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      if (artifact.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Deploy artifact
      const result = await CodeGenerationService.deployCodeArtifact({
        artifactId: id,
        environment: validatedData.environment,
        deployedBy: userId,
        deploymentNotes: validatedData.deploymentNotes,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Deploy artifact error:', error);
      return res.status(500).json({ error: error.message || 'Failed to deploy artifact' });
    }
  }

  /**
   * Get version history of an artifact
   */
  async getVersionHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      // Verify artifact belongs to organization
      const artifact = await CodeGenerationService.getCodeArtifact(id);
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      if (artifact.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get version history
      const history = await CodeGenerationService.getArtifactVersionHistory(id);

      return res.json(history);
    } catch (error: any) {
      console.error('Get version history error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch version history' });
    }
  }

  /**
   * Create a new version of an artifact
   */
  async createVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { code, changeDescription } = req.body;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      if (!code || !changeDescription) {
        return res.status(400).json({
          error: 'Code and changeDescription are required',
        });
      }

      // Verify artifact belongs to organization
      const artifact = await CodeGenerationService.getCodeArtifact(id);
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      if (artifact.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create new version
      const result = await CodeGenerationService.createArtifactVersion(
        id,
        code,
        changeDescription,
        userId
      );

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Create version error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create version' });
    }
  }

  /**
   * Validate code syntax
   */
  async validateCode(req: Request, res: Response) {
    try {
      const { code, language, artifactType } = req.body;

      if (!code || !language || !artifactType) {
        return res.status(400).json({
          error: 'Code, language, and artifactType are required',
        });
      }

      const validation = await CodeGenerationService.validateCodeSyntax({
        code,
        language,
        artifactType,
      });

      return res.json(validation);
    } catch (error: any) {
      console.error('Validate code error:', error);
      return res.status(500).json({ error: error.message || 'Failed to validate code' });
    }
  }

  /**
   * Get artifacts statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;

      const [total, deployed, approved, reviewed, syntaxValid] = await Promise.all([
        CodeGenerationService.getCodeArtifacts(organizationId, {}),
        CodeGenerationService.getCodeArtifacts(organizationId, { status: 'deployed' }),
        CodeGenerationService.getCodeArtifacts(organizationId, { status: 'approved' }),
        CodeGenerationService.getCodeArtifacts(organizationId, { status: 'reviewed' }),
        prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "CodeArtifacts"
          WHERE "organizationId" = ${organizationId}
            AND "syntaxValid" = true
            AND "deletedAt" IS NULL
        `,
      ]);

      const stats = {
        total: total.length,
        deployed: deployed.length,
        approved: approved.length,
        reviewed: reviewed.length,
        syntaxValid: (syntaxValid as any)[0]?.count || 0,
      };

      return res.json(stats);
    } catch (error: any) {
      console.error('Get stats error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get statistics' });
    }
  }
}

export const codeArtifactsController = new CodeArtifactsController();
