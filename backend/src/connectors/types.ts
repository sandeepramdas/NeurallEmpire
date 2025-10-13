/**
 * ==================== CONNECTOR SYSTEM - TYPE DEFINITIONS ====================
 *
 * Type-safe interfaces for the connector system
 * Supports: Database, API, SaaS integrations
 *
 * @module connectors/types
 */

import { z } from 'zod';

// ==================== CONNECTOR CONFIGURATION ====================

/**
 * Connector Configuration Schema
 * Used for creating and validating connector configs
 */
export const ConnectorConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  type: z.enum(['DATABASE', 'API', 'SAAS', 'FILE']),
  provider: z.string().optional(),
  config: z.record(z.unknown()),
  credentials: z.union([
    z.record(z.string()),
    z.string() // Encrypted string from database
  ]),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitRequests: z.number().optional(),
  rateLimitWindow: z.number().optional(),
});

export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;

/**
 * Connector Creation Schema
 * Used for API validation when creating connectors
 */
export const CreateConnectorSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['DATABASE', 'API', 'SAAS', 'FILE']),
  provider: z.string().optional(),
  config: z.record(z.unknown()),
  credentials: z.record(z.string()),
  description: z.string().optional(),
});

export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>;

// ==================== QUERY OPERATIONS ====================

/**
 * Query Parameters
 * Used for querying data from connectors
 */
export interface QueryParams {
  operation: 'read' | 'search' | 'aggregate';
  resource: string; // table name, endpoint, collection, etc.
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  select?: string[]; // fields to return
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  include?: Record<string, boolean>; // relations to include
}

/**
 * Query Result
 * Standard response format for queries
 */
export interface QueryResult<T = any> {
  data: T[];
  metadata: {
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
    page?: number;
    pageSize?: number;
  };
  performance?: {
    durationMs: number;
    rows: number;
  };
}

// ==================== ACTION OPERATIONS ====================

/**
 * Action
 * Used for write operations on connectors
 */
export interface Action {
  operation: 'create' | 'update' | 'delete' | 'execute';
  resource: string;
  data?: Record<string, any>;
  params?: Record<string, any>;
  where?: Record<string, any>; // for update/delete
}

/**
 * Action Result
 * Standard response format for actions
 */
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    affected: number;
    created?: string | number;
  };
}

// ==================== CONNECTOR SCHEMA ====================

/**
 * Resource Field Definition
 * Describes a field in a resource (table, model, etc.)
 */
export interface ResourceField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
}

/**
 * Resource Definition
 * Describes a resource (table, endpoint, collection, etc.)
 */
export interface Resource {
  name: string;
  displayName?: string;
  description?: string;
  fields: ResourceField[];
  operations: Array<'read' | 'create' | 'update' | 'delete' | 'search'>;
  primaryKey?: string;
  relations?: {
    name: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    resource: string;
  }[];
}

/**
 * Connector Schema
 * Complete schema discovered from a connector
 */
export interface ConnectorSchema {
  version?: string;
  resources: Resource[];
  metadata?: {
    provider: string;
    version: string;
    capabilities: string[];
  };
}

// ==================== CONNECTOR INTERFACE ====================

/**
 * Connection Test Result
 */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

/**
 * Base Connector Interface
 * All connectors must implement this interface
 */
export interface IConnector {
  // Properties
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly initialized: boolean;

  // Lifecycle methods
  initialize(config: ConnectorConfig): Promise<void>;
  dispose(): Promise<void>;

  // Connection management
  test(): Promise<ConnectionTestResult>;
  reconnect(): Promise<void>;

  // Data operations
  query<T = any>(params: QueryParams): Promise<QueryResult<T>>;
  execute<T = any>(action: Action): Promise<ActionResult<T>>;

  // Schema discovery
  getSchema(): Promise<ConnectorSchema>;
  getResource(name: string): Promise<Resource>;

  // Health & monitoring
  getHealthStatus(): Promise<{
    healthy: boolean;
    lastChecked: Date;
    error?: string;
  }>;
}

// ==================== CONNECTOR REGISTRY ====================

/**
 * Connector Registry Entry
 */
export interface ConnectorRegistryEntry {
  connector: IConnector;
  config: ConnectorConfig;
  createdAt: Date;
  lastUsed: Date;
  requestCount: number;
  errorCount: number;
}

// ==================== RATE LIMITING ====================

/**
 * Rate Limit Config
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  enabled: boolean;
}

/**
 * Rate Limit Status
 */
export interface RateLimitStatus {
  remaining: number;
  resetAt: Date;
  limited: boolean;
}

// ==================== DATABASE SPECIFIC ====================

/**
 * Database Credentials
 */
export interface DatabaseCredentials {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  databaseUrl?: string; // Alternative to individual fields
  ssl?: boolean;
  connectionTimeoutMs?: number;
  maxConnections?: number;
}

/**
 * Database Connection Options
 */
export interface DatabaseConnectionOptions {
  pooling?: boolean;
  maxPoolSize?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  ssl?: boolean;
  sslMode?: 'require' | 'prefer' | 'disable';
}

// ==================== API SPECIFIC ====================

/**
 * API Credentials
 */
export interface APICredentials {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  oauth?: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
  };
  customHeaders?: Record<string, string>;
}

/**
 * API Connection Options
 */
export interface APIConnectionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  followRedirects?: boolean;
  validateStatus?: (status: number) => boolean;
}

// ==================== SAAS SPECIFIC ====================

/**
 * SaaS Provider Configuration
 */
export interface SaaSProviderConfig {
  provider: 'salesforce' | 'hubspot' | 'stripe' | 'zendesk' | 'slack';
  instanceUrl?: string; // for Salesforce, etc.
  credentials: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
  };
  apiVersion?: string;
  sandbox?: boolean; // for test environments
}

// ==================== ERROR TYPES ====================

/**
 * Connector Error Details
 */
export interface ConnectorErrorDetails {
  connectorId: string;
  connectorType: string;
  operation: string;
  message: string;
  code?: string;
  retryable: boolean;
  metadata?: Record<string, any>;
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Database Config Schema
 */
export const DatabaseConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  databaseUrl: z.string().optional(),
  ssl: z.boolean().optional(),
  connectionTimeoutMs: z.number().optional(),
}).refine(
  (data) => data.databaseUrl || (data.host && data.database),
  { message: 'Either databaseUrl or host+database must be provided' }
);

/**
 * API Config Schema
 */
export const APIConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().optional(),
  retries: z.number().optional(),
  followRedirects: z.boolean().optional(),
});

/**
 * Query Params Schema
 */
export const QueryParamsSchema = z.object({
  operation: z.enum(['read', 'search', 'aggregate']),
  resource: z.string(),
  filters: z.record(z.any()).optional(),
  limit: z.number().positive().max(1000).optional(),
  offset: z.number().nonnegative().optional(),
  select: z.array(z.string()).optional(),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
});

/**
 * Action Schema
 */
export const ActionSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'execute']),
  resource: z.string(),
  data: z.record(z.any()).optional(),
  params: z.record(z.any()).optional(),
  where: z.record(z.any()).optional(),
});

// ==================== TYPE GUARDS ====================

/**
 * Type guard for database credentials
 */
export function isDatabaseCredentials(credentials: any): credentials is DatabaseCredentials {
  return (
    typeof credentials === 'object' &&
    (credentials.databaseUrl !== undefined || credentials.host !== undefined)
  );
}

/**
 * Type guard for API credentials
 */
export function isAPICredentials(credentials: any): credentials is APICredentials {
  return (
    typeof credentials === 'object' &&
    credentials.baseUrl !== undefined
  );
}

/**
 * Type guard for SaaS credentials
 */
export function isSaaSCredentials(credentials: any): credentials is SaaSProviderConfig {
  return (
    typeof credentials === 'object' &&
    credentials.provider !== undefined &&
    credentials.credentials !== undefined
  );
}

// ==================== UTILITY TYPES ====================

/**
 * Partial connector config for updates
 */
export type PartialConnectorConfig = Partial<Omit<ConnectorConfig, 'id' | 'type'>>;

/**
 * Connector with status
 */
export interface ConnectorWithStatus extends ConnectorConfig {
  status: 'active' | 'error' | 'disabled' | 'testing';
  lastTested?: Date;
  lastError?: string;
  requestCount: number;
  errorCount: number;
  avgResponseTimeMs?: number;
}
