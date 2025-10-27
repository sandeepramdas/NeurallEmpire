/**
 * ==================== CONNECTOR SERVICE ====================
 *
 * Business logic for managing connectors
 * - CRUD operations
 * - Connection management
 * - Schema discovery
 * - Query/Action execution
 *
 * @module services/connector
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseConnector } from '../connectors/database.connector';
import { APIConnector } from '../connectors/api.connector';
import {
  IConnector,
  ConnectorConfig,
  CreateConnectorInput,
  QueryParams,
  Action,
  ConnectorWithStatus,
} from '../connectors/types';
import { encryptCredentials, decryptCredentials } from '../infrastructure/encryption';
import { NotFoundError, ValidationError, ConflictError } from '../infrastructure/errors';
import { logger, auditLog } from '../infrastructure/logger';

const prisma = new PrismaClient();

export class ConnectorService {
  private connectorRegistry: Map<string, IConnector> = new Map();

  /**
   * Create a new connector
   */
  async createConnector(
    organizationId: string,
    userId: string,
    input: CreateConnectorInput
  ) {
    try {
      // Validate input
      if (!input.name || !input.type) {
        throw new ValidationError('Name and type are required');
      }

      // Generate slug
      const slug = this.generateSlug(input.name);

      // Check for duplicates
      const existing = await prisma.connector.findFirst({
        where: {
          organizationId,
          slug,
        },
      });

      if (existing) {
        throw new ConflictError(
          `Connector with name '${input.name}' already exists`,
          { slug }
        );
      }

      // Encrypt credentials
      const encryptedCredentials = encryptCredentials(input.credentials);

      // Create connector in database
      const connector = await prisma.connector.create({
        data: {
          organizationId,
          name: input.name,
          description: input.description,
          type: input.type,
          config: input.config as any,
          credentials: encryptedCredentials,
          isActive: true,
        } as any,
      });

      // Test connection
      try {
        const instance = await this.loadConnector(connector.id);
        const testResult = await instance.test();

        await prisma.connector.update({
          where: { id: connector.id },
          data: {
            status: testResult.success ? 'ACTIVE' : 'ERROR',
            lastTestedAt: new Date(),
            testResult: testResult as any,
          } as any,
        });

        // Update connector object
        connector.status = testResult.success ? 'ACTIVE' : 'ERROR';
      } catch (error) {
        logger.error('Connector test failed after creation', {
          connectorId: connector.id,
          error,
        });

        await prisma.connector.update({
          where: { id: connector.id },
          data: {
            status: 'ERROR',
            lastTestedAt: new Date(),
          } as any,
        });
      }

      // Audit log
      auditLog('CREATE_CONNECTOR', userId, 'Connector', connector.id, {
        name: input.name,
        type: input.type,
      });

      logger.info('Connector created', {
        connectorId: connector.id,
        name: input.name,
        type: input.type,
      });

      return connector;
    } catch (error) {
      logger.error('Failed to create connector', { error, input });
      throw error;
    }
  }

  /**
   * Get connector by ID
   */
  async getConnector(connectorId: string, organizationId: string) {
    const connector = await prisma.connector.findFirst({
      where: {
        id: connectorId,
        organizationId,
      },
    });

    if (!connector) {
      throw new NotFoundError('Connector', connectorId);
    }

    return connector;
  }

  /**
   * List all connectors for an organization
   */
  async listConnectors(organizationId: string, filters?: {
    type?: string;
    status?: string;
    enabled?: boolean;
  }) {
    const where: any = { organizationId };

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.enabled !== undefined) where.enabled = filters.enabled;

    const connectors = await prisma.connector.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return connectors;
  }

  /**
   * Update connector
   */
  async updateConnector(
    connectorId: string,
    organizationId: string,
    userId: string,
    updates: Partial<CreateConnectorInput>
  ) {
    // Check exists
    const existing = await this.getConnector(connectorId, organizationId);

    // Prepare update data
    const data: any = {};

    if (updates.name) {
      data.name = updates.name;
      data.slug = this.generateSlug(updates.name);
    }
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.config) data.config = updates.config;
    if (updates.credentials) {
      data.credentials = encryptCredentials(updates.credentials);
    }

    // Update in database
    const connector = await prisma.connector.update({
      where: { id: connectorId },
      data: {
        ...data,
        updatedAt: new Date(),
      } as any,
    });

    // Invalidate cache
    this.connectorRegistry.delete(connectorId);

    // Audit log
    auditLog('UPDATE_CONNECTOR', userId, 'Connector', connectorId, {
      updates: Object.keys(updates),
    });

    logger.info('Connector updated', {
      connectorId,
      updates: Object.keys(updates),
    });

    return connector;
  }

  /**
   * Delete connector
   */
  async deleteConnector(
    connectorId: string,
    organizationId: string,
    userId: string
  ) {
    // Check exists
    await this.getConnector(connectorId, organizationId);

    // Remove from cache
    const instance = this.connectorRegistry.get(connectorId);
    if (instance) {
      await instance.dispose();
      this.connectorRegistry.delete(connectorId);
    }

    // Delete from database
    await prisma.connector.delete({
      where: { id: connectorId } as any,
    });

    // Audit log
    auditLog('DELETE_CONNECTOR', userId, 'Connector', connectorId);

    logger.info('Connector deleted', { connectorId });
  }

  /**
   * Test connector connection
   */
  async testConnector(connectorId: string, organizationId: string) {
    await this.getConnector(connectorId, organizationId);

    const instance = await this.loadConnector(connectorId);
    const result = await instance.test();

    // Update last tested time
    await prisma.connector.update({
      where: { id: connectorId } as any,
      data: {
        status: result.success ? 'ACTIVE' : 'ERROR',
        lastTestedAt: new Date(),
        testResult: result as any,
      } as any,
    });

    return result;
  }

  /**
   * Get connector schema
   */
  async getConnectorSchema(connectorId: string, organizationId: string) {
    await this.getConnector(connectorId, organizationId);

    const instance = await this.loadConnector(connectorId);
    const schema = await instance.getSchema();

    // Update schema in database
    await prisma.connector.update({
      where: { id: connectorId } as any,
      data: {
        schema: schema as any,
        schemaUpdatedAt: new Date(),
      } as any,
    });

    return schema;
  }

  /**
   * Query connector
   */
  async queryConnector(
    connectorId: string,
    organizationId: string,
    params: QueryParams
  ) {
    await this.getConnector(connectorId, organizationId);

    const instance = await this.loadConnector(connectorId);
    const startTime = Date.now();

    try {
      const result = await instance.query(params);

      // Log query
      await (prisma as any).connectorQuery.create({
        data: {
          connectorId,
          operation: params.operation,
          resource: params.resource,
          query: params as any,
          result: result.data as any,
          status: 'SUCCESS',
          durationMs: Date.now() - startTime,
          rowsAffected: result.data.length,
        } as any,
      });

      // Update stats
      await this.updateStats(connectorId, Date.now() - startTime, false);

      return result;
    } catch (error) {
      // Log failed query
      await (prisma as any).connectorQuery.create({
        data: {
          connectorId,
          operation: params.operation,
          resource: params.resource,
          query: params as any,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Query failed',
          durationMs: Date.now() - startTime,
        } as any,
      });

      // Update stats
      await this.updateStats(connectorId, Date.now() - startTime, true);

      throw error;
    }
  }

  /**
   * Execute action on connector
   */
  async executeAction(
    connectorId: string,
    organizationId: string,
    userId: string,
    action: Action
  ) {
    await this.getConnector(connectorId, organizationId);

    const instance = await this.loadConnector(connectorId);
    const result = await instance.execute(action);

    // Audit log
    await (prisma as any).connectorAuditLog.create({
      data: {
        connectorId,
        action: action.operation,
        status: result.success ? 'success' : 'failure',
        userId,
        input: action as any,
        output: result.data as any,
        error: result.error,
      } as any,
    });

    return result;
  }

  /**
   * Get connector statistics
   */
  async getConnectorStats(connectorId: string, organizationId: string) {
    await this.getConnector(connectorId, organizationId);

    const instance = this.connectorRegistry.get(connectorId);
    const memoryStats = instance?.getStatistics();

    // Get database stats
    const queryCount = await (prisma as any).connectorQuery.count({
      where: { connectorId } as any,
    });

    const errorCount = await (prisma as any).connectorQuery.count({
      where: {
        connectorId,
        status: 'FAILED',
      } as any,
    });

    const avgDuration = await (prisma as any).connectorQuery.aggregate({
      where: { connectorId } as any,
      _avg: { durationMs: true } as any,
    });

    return {
      queryCount,
      errorCount,
      errorRate: queryCount > 0 ? errorCount / queryCount : 0,
      avgResponseTimeMs: avgDuration._avg.durationMs || 0,
      memoryStats,
    } as any,
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Load connector instance
   */
  private async loadConnector(connectorId: string): Promise<IConnector> {
    // Check cache
    if (this.connectorRegistry.has(connectorId)) {
      return this.connectorRegistry.get(connectorId)!;
    }

    // Load from database
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId } as any,
    });

    if (!connector) {
      throw new NotFoundError('Connector', connectorId);
    }

    // Create instance
    const instance = this.createConnectorInstance(connector);

    // Initialize
    await instance.initialize({
      id: connector.id,
      name: connector.name,
      type: connector.type,
      provider: connector.provider || undefined,
      config: connector.config as Record<string, any>,
      credentials: connector.credentials,
      rateLimitEnabled: connector.rateLimitEnabled,
      rateLimitRequests: connector.rateLimitRequests || undefined,
      rateLimitWindow: connector.rateLimitWindow || undefined,
    });

    // Cache
    this.connectorRegistry.set(connectorId, instance);

    return instance;
  }

  /**
   * Create connector instance based on type
   */
  private createConnectorInstance(connector: any): IConnector {
    const config: ConnectorConfig = {
      id: connector.id,
      name: connector.name,
      type: connector.type,
      provider: connector.provider,
      config: connector.config,
      credentials: connector.credentials,
    } as any,

    switch (connector.type) {
      case 'DATABASE':
        return new DatabaseConnector(config);

      case 'API':
        return new APIConnector(config);

      case 'SAAS':
        // TODO: Add SaaS connectors
        throw new Error('SaaS connectors not yet implemented');

      default:
        throw new Error(`Unsupported connector type: ${connector.type}`);
    }
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Update connector statistics
   */
  private async updateStats(
    connectorId: string,
    durationMs: number,
    isError: boolean
  ) {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId } as any,
    });

    if (!connector) return;

    const requestCount = connector.requestCount + 1;
    const errorCount = connector.errorCount + (isError ? 1 : 0);

    // Calculate moving average response time
    const avgResponseTime = connector.avgResponseTime || 0;
    const newAvg = (avgResponseTime * connector.requestCount + durationMs) / requestCount;

    await prisma.connector.update({
      where: { id: connectorId } as any,
      data: {
        requestCount,
        errorCount,
        avgResponseTime: Math.round(newAvg),
      } as any,
    });
  }

  /**
   * Dispose all connectors
   */
  async disposeAll() {
    for (const [id, connector] of this.connectorRegistry.entries()) {
      try {
        await connector.dispose();
      } catch (error) {
        logger.error('Failed to dispose connector', { connectorId: id, error });
      }
    }
    this.connectorRegistry.clear();
  }
}

// Singleton instance
export const connectorService = new ConnectorService();
