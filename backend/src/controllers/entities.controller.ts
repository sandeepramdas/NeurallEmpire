import { Request, Response } from 'express';
import { prisma } from '@/server';
import { z } from 'zod';
import { EntityService } from '@/services/entity.service';

// Validation schemas
const columnSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date', 'datetime', 'text', 'json', 'enum', 'reference']),
  maxLength: z.number().optional(),
  nullable: z.boolean().optional(),
  unique: z.boolean().optional(),
  index: z.boolean().optional(),
  displayName: z.string().optional(),
  defaultValue: z.any().optional(),
  values: z.array(z.string()).optional(), // For enum
  referenceEntity: z.string().optional(), // For reference
  referenceColumn: z.string().optional(),
  onDelete: z.enum(['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT']).optional(),
});

const createEntitySchema = z.object({
  entityName: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Entity name must be lowercase snake_case'),
  displayName: z.string().min(1),
  vertical: z.string().optional(),
  module: z.string().optional(),
  category: z.enum(['transactional', 'master', 'reference']).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  columns: z.array(columnSchema).min(1),
  isOrganizationScoped: z.boolean().optional(),
  enableAudit: z.boolean().optional(),
  enableWorkflow: z.boolean().optional(),
  enableVersioning: z.boolean().optional(),
  softDelete: z.boolean().optional(),
});

export class EntitiesController {
  /**
   * Get all entity definitions for an organization
   */
  async getEntities(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user.organizationId;
      const { vertical, module, status } = req.query;

      const entities = await EntityService.getEntityDefinitions(organizationId, {
        vertical: vertical as string,
        module: module as string,
        status: status as string,
      });

      return res.json(entities);
    } catch (error: any) {
      console.error('Get entities error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch entities' });
    }
  }

  /**
   * Get a single entity definition by ID
   */
  async getEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const entity = await EntityService.getEntityDefinition(id);

      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      // Check organization access
      if (entity.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json(entity);
    } catch (error: any) {
      console.error('Get entity error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch entity' });
    }
  }

  /**
   * Create a new entity definition
   */
  async createEntity(req: Request, res: Response) {
    try {
      const validatedData = createEntitySchema.parse(req.body);
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Destructure columns from rest of data
      const { columns, ...entityData } = validatedData;

      // Create entity definition
      const result = await EntityService.createEntityDefinition({
        ...entityData,
        organizationId,
        createdBy: userId,
        schemaDefinition: {
          columns: columns as any,
        },
      } as any);

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Create entity error:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return res.status(500).json({ error: error.message || 'Failed to create entity' });
    }
  }

  /**
   * Activate an entity definition (creates the database table)
   */
  async activateEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify entity belongs to organization
      const entity = await EntityService.getEntityDefinition(id);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      if (entity.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (entity.status === 'active') {
        return res.status(400).json({ error: 'Entity is already active' });
      }

      // Activate entity (creates database table)
      await EntityService.activateEntityDefinition(id, userId);

      return res.json({
        success: true,
        message: 'Entity activated and database table created successfully',
      });
    } catch (error: any) {
      console.error('Activate entity error:', error);
      return res.status(500).json({ error: error.message || 'Failed to activate entity' });
    }
  }

  /**
   * Delete an entity definition
   */
  async deleteEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Verify entity belongs to organization
      const entity = await EntityService.getEntityDefinition(id);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      if (entity.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (entity.isSystemEntity) {
        return res.status(403).json({ error: 'Cannot delete system entities' });
      }

      if (entity.status === 'active') {
        return res.status(400).json({
          error: 'Cannot delete active entity. Deprecate it first.',
        });
      }

      // Soft delete entity
      await EntityService.deleteEntityDefinition(id, userId);

      return res.json({
        success: true,
        message: 'Entity deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete entity error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete entity' });
    }
  }

  /**
   * Get DDL (SQL) for an entity definition
   */
  async getEntityDDL(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organizationId;

      const entity = await EntityService.getEntityDefinition(id);
      if (!entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      if (entity.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Generate DDL
      const ddl = EntityService.generateDDL(
        entity.tableName,
        entity.schemaDefinition as any,
        {
          isOrganizationScoped: entity.isOrganizationScoped,
          enableAudit: entity.enableAudit,
          softDelete: entity.softDelete,
        }
      );

      return res.json({
        tableName: entity.tableName,
        ddl,
      });
    } catch (error: any) {
      console.error('Get DDL error:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate DDL' });
    }
  }

  /**
   * Validate entity schema without creating it
   */
  async validateSchema(req: Request, res: Response) {
    try {
      const { columns } = req.body;

      if (!columns || !Array.isArray(columns)) {
        return res.status(400).json({ error: 'Invalid schema: columns array required' });
      }

      const validation = EntityService.validateEntitySchema({ columns });

      return res.json(validation);
    } catch (error: any) {
      console.error('Validate schema error:', error);
      return res.status(500).json({ error: error.message || 'Failed to validate schema' });
    }
  }
}

export const entitiesController = new EntitiesController();
