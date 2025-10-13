/**
 * ==================== DATABASE CONNECTOR ====================
 *
 * Connector for PostgreSQL, MySQL, and other SQL databases
 * Uses Prisma for dynamic database connections
 *
 * Features:
 * - Dynamic connection to any PostgreSQL/MySQL database
 * - Query builder with filters, pagination, sorting
 * - CRUD operations
 * - Transaction support
 * - Schema introspection
 *
 * @module connectors/database
 */

import { PrismaClient } from '@prisma/client';
import { BaseConnector } from './base.connector';
import {
  ConnectorConfig,
  QueryParams,
  QueryResult,
  Action,
  ActionResult,
  ConnectorSchema,
  ConnectionTestResult,
  DatabaseCredentials,
  isDatabaseCredentials,
} from './types';
import { decryptCredentials } from '../infrastructure/encryption';
import { QueryFailedError, InvalidCredentialsError } from '../infrastructure/errors';

export class DatabaseConnector extends BaseConnector {
  private client: PrismaClient | null = null;
  private connectionString: string = '';

  /**
   * Initialize database connection
   */
  async initialize(config: ConnectorConfig): Promise<void> {
    return this.withPerformanceTracking('initialize', async () => {
      try {
        this.config = config;

        // Decrypt credentials
        const credentials = typeof config.credentials === 'string'
          ? decryptCredentials(config.credentials)
          : config.credentials;

        if (!isDatabaseCredentials(credentials)) {
          throw new InvalidCredentialsError(this.id, this.type);
        }

        // Build connection string
        this.connectionString = this.buildConnectionString(credentials);

        // Create Prisma client
        this.client = new PrismaClient({
          datasources: {
            db: { url: this.connectionString },
          },
          log: process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
        });

        // Test connection
        await this.client.$connect();

        this._initialized = true;
        this.logOperation('initialize', { success: true });
      } catch (error) {
        this.logError('initialize', error as Error);
        throw error;
      }
    });
  }

  /**
   * Test database connection
   */
  async test(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Simple query to test connection
      await this.client!.$queryRaw`SELECT 1 as test`;

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: 'Database connection successful',
        latencyMs,
        metadata: {
          provider: this.config.provider || 'postgresql',
          latency: `${latencyMs}ms`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Query database
   */
  async query<T = any>(params: QueryParams): Promise<QueryResult<T>> {
    this.ensureInitialized();
    this.validateQueryParams(params);

    return this.withPerformanceTracking('query', async () => {
      await this.checkRateLimit();

      const startTime = Date.now();

      try {
        const { resource, filters, limit = 50, offset = 0, select, orderBy } = params;

        // Build where clause
        const where = this.buildWhereClause(filters);

        // Build select clause
        const selectClause = select ? this.buildSelectClause(select) : undefined;

        // Build orderBy clause
        const order = orderBy ? { [orderBy.field]: orderBy.direction } : undefined;

        // Execute query
        // @ts-ignore - Dynamic model access
        const data = await this.client[resource].findMany({
          where,
          take: limit,
          skip: offset,
          select: selectClause,
          orderBy: order,
        });

        // Get total count
        // @ts-ignore
        const total = await this.client[resource].count({ where });

        const durationMs = Date.now() - startTime;

        return {
          data: data as T[],
          metadata: {
            total,
            hasMore: offset + data.length < total,
            page: Math.floor(offset / limit) + 1,
            pageSize: limit,
          },
          performance: {
            durationMs,
            rows: data.length,
          },
        };
      } catch (error) {
        this.logError('query', error as Error, { params });
        throw new QueryFailedError(
          this.id,
          this.type,
          JSON.stringify(params),
          error instanceof Error ? error.message : 'Query failed'
        );
      }
    });
  }

  /**
   * Execute action (create, update, delete)
   */
  async execute<T = any>(action: Action): Promise<ActionResult<T>> {
    this.ensureInitialized();
    this.validateAction(action);

    return this.withPerformanceTracking('execute', async () => {
      await this.checkRateLimit();

      try {
        const { operation, resource, data, where } = action;

        let result: any;
        let affected = 0;

        switch (operation) {
          case 'create':
            // @ts-ignore
            result = await this.client[resource].create({ data });
            affected = 1;
            break;

          case 'update':
            if (!where) {
              throw new Error('Where clause required for update');
            }
            // @ts-ignore
            result = await this.client[resource].updateMany({
              where,
              data,
            });
            affected = result.count;
            break;

          case 'delete':
            if (!where) {
              throw new Error('Where clause required for delete');
            }
            // @ts-ignore
            result = await this.client[resource].deleteMany({ where });
            affected = result.count;
            break;

          case 'execute':
            // Custom SQL execution
            if (data?.sql) {
              result = await this.client!.$queryRawUnsafe(data.sql);
            } else {
              throw new Error('SQL query required for execute operation');
            }
            break;

          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }

        this.logOperation('execute', {
          operation,
          resource,
          affected,
        });

        return {
          success: true,
          data: result as T,
          metadata: {
            affected,
            created: operation === 'create' ? result.id : undefined,
          },
        };
      } catch (error) {
        this.logError('execute', error as Error, { action });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Action failed',
        };
      }
    });
  }

  /**
   * Get database schema
   */
  async getSchema(): Promise<ConnectorSchema> {
    this.ensureInitialized();

    return this.withPerformanceTracking('getSchema', async () => {
      try {
        // Get Prisma DMMF (Data Model Meta Format)
        const dmmf = (this.client as any)._dmmf;

        if (!dmmf || !dmmf.datamodel) {
          throw new Error('Unable to introspect database schema');
        }

        const resources = dmmf.datamodel.models.map((model: any) => ({
          name: model.name,
          displayName: model.name,
          description: model.documentation,
          fields: model.fields.map((field: any) => ({
            name: field.name,
            type: field.type,
            required: field.isRequired,
            isPrimaryKey: field.isId,
            isForeignKey: field.relationName !== undefined,
            isUnique: field.isUnique,
            defaultValue: field.default,
          })),
          operations: ['read', 'create', 'update', 'delete'] as const,
          primaryKey: model.fields.find((f: any) => f.isId)?.name,
          relations: model.fields
            .filter((f: any) => f.relationName)
            .map((f: any) => ({
              name: f.name,
              type: f.isList ? 'one-to-many' : 'one-to-one',
              resource: f.type,
            })),
        }));

        return {
          version: '1.0',
          resources,
          metadata: {
            provider: this.config.provider || 'postgresql',
            version: 'unknown',
            capabilities: ['read', 'write', 'schema', 'relations'],
          },
        };
      } catch (error) {
        this.logError('getSchema', error as Error);
        throw error;
      }
    });
  }

  /**
   * Dispose connection
   */
  async dispose(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
    }
    this._initialized = false;
    this.logOperation('dispose', { success: true });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build database connection string
   */
  private buildConnectionString(credentials: DatabaseCredentials): string {
    if (credentials.databaseUrl) {
      return credentials.databaseUrl;
    }

    const {
      host = 'localhost',
      port = 5432,
      database,
      username,
      password,
      ssl = false,
    } = credentials;

    if (!database || !username || !password) {
      throw new Error('Missing required database credentials');
    }

    const sslParam = ssl ? '?sslmode=require' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: Record<string, any>): Record<string, any> {
    if (!filters) return {};

    const where: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators: { gt: 10, lt: 20 }
        where[key] = value;
      } else {
        // Direct equality
        where[key] = value;
      }
    }

    return where;
  }

  /**
   * Build Prisma select clause
   */
  private buildSelectClause(select: string[]): Record<string, boolean> {
    return select.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  /**
   * Execute transaction
   */
  async executeTransaction(operations: Action[]): Promise<ActionResult[]> {
    this.ensureInitialized();

    return this.withPerformanceTracking('transaction', async () => {
      try {
        const results = await this.client!.$transaction(
          operations.map((op) => this.buildPrismaOperation(op))
        );

        return results.map((result, index) => ({
          success: true,
          data: result,
          metadata: {
            affected: 1,
          },
        }));
      } catch (error) {
        return operations.map(() => ({
          success: false,
          error: error instanceof Error ? error.message : 'Transaction failed',
        }));
      }
    });
  }

  /**
   * Build Prisma operation for transaction
   */
  private buildPrismaOperation(action: Action): any {
    const { operation, resource, data, where } = action;

    switch (operation) {
      case 'create':
        // @ts-ignore
        return this.client[resource].create({ data });

      case 'update':
        // @ts-ignore
        return this.client[resource].update({ where, data });

      case 'delete':
        // @ts-ignore
        return this.client[resource].delete({ where });

      default:
        throw new Error(`Unsupported transaction operation: ${operation}`);
    }
  }
}
