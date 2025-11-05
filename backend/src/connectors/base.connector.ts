/**
 * ==================== BASE CONNECTOR CLASS ====================
 *
 * Abstract base class for all connectors
 * Provides common functionality:
 * - Initialization lifecycle
 * - Performance tracking
 * - Retry logic
 * - Error handling
 * - Health checks
 *
 * @module connectors/base
 */

import {
  IConnector,
  ConnectorConfig,
  QueryParams,
  QueryResult,
  Action,
  ActionResult,
  ConnectorSchema,
  Resource,
  ConnectionTestResult,
} from './types';
import { logger, PerformanceLogger } from '../infrastructure/logger';
import {
  ConnectionFailedError,
  ConnectionTimeoutError,
  QueryFailedError,
} from '../infrastructure/errors';
import { ConnectorRateLimiter } from './rate-limiter';

export abstract class BaseConnector implements IConnector {
  protected config!: ConnectorConfig;
  protected _initialized: boolean = false;
  protected lastHealthCheck?: Date;
  protected healthStatus: boolean = false;
  protected errorCount: number = 0;
  protected requestCount: number = 0;
  protected rateLimiter?: ConnectorRateLimiter;

  constructor(config: ConnectorConfig) {
    this.config = config;

    // Initialize rate limiter if enabled
    if (config.rateLimitEnabled) {
      this.rateLimiter = new ConnectorRateLimiter(config.id, {
        enabled: config.rateLimitEnabled,
        requestsPerMinute: config.rateLimitPerMinute,
        requestsPerHour: config.rateLimitPerHour,
        requestsPerDay: config.rateLimitPerDay,
        burstSize: config.rateLimitBurstSize,
      });
    }
  }

  // ==================== PROPERTIES ====================

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get type(): string {
    return this.config.type;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  // ==================== ABSTRACT METHODS ====================
  // Subclasses must implement these

  abstract initialize(config: ConnectorConfig): Promise<void>;
  abstract test(): Promise<ConnectionTestResult>;
  abstract query<T = any>(params: QueryParams): Promise<QueryResult<T>>;
  abstract execute<T = any>(action: Action): Promise<ActionResult<T>>;
  abstract getSchema(): Promise<ConnectorSchema>;
  abstract dispose(): Promise<void>;

  // ==================== CONCRETE METHODS ====================

  /**
   * Reconnect to the connector
   */
  async reconnect(): Promise<void> {
    logger.info(`Reconnecting connector: ${this.name}`, {
      connectorId: this.id,
    });

    await this.dispose();
    this._initialized = false;
    await this.initialize(this.config);
  }

  /**
   * Get a specific resource by name
   */
  async getResource(name: string): Promise<Resource> {
    const schema = await this.getSchema();
    const resource = schema.resources.find((r) => r.name === name);

    if (!resource) {
      throw new Error(`Resource '${name}' not found in connector schema`);
    }

    return resource;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    lastChecked: Date;
    error?: string;
  }> {
    // Cache health checks for 1 minute
    const now = new Date();
    if (
      this.lastHealthCheck &&
      now.getTime() - this.lastHealthCheck.getTime() < 60000
    ) {
      return {
        healthy: this.healthStatus,
        lastChecked: this.lastHealthCheck,
      };
    }

    try {
      const result = await this.test();
      this.healthStatus = result.success;
      this.lastHealthCheck = now;

      return {
        healthy: result.success,
        lastChecked: now,
        error: result.error,
      };
    } catch (error) {
      this.healthStatus = false;
      this.lastHealthCheck = now;

      return {
        healthy: false,
        lastChecked: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Ensure connector is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this._initialized) {
      throw new ConnectionFailedError(
        this.id,
        this.type,
        'Connector not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Track performance of operations
   */
  protected async withPerformanceTracking<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const perf = new PerformanceLogger(operation, {
      connectorId: this.id,
      connectorName: this.name,
      connectorType: this.type,
    });

    try {
      this.requestCount++;
      const result = await fn();
      perf.end(true);
      return result;
    } catch (error) {
      this.errorCount++;
      perf.end(false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
      factor?: number;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      factor = 2,
    } = options;

    let lastError: Error;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        logger.warn(`Retry ${attempt}/${maxRetries} for ${this.name}`, {
          connectorId: this.id,
          error: lastError.message,
          nextRetryIn: `${delay}ms`,
        });

        // Wait before retrying
        await this.sleep(delay);

        // Exponential backoff
        delay = Math.min(delay * factor, maxDelayMs);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    const errorMessage = error.message.toLowerCase();

    return retryableErrors.some((code) =>
      errorMessage.includes(code.toLowerCase())
    );
  }

  /**
   * Execute with timeout
   */
  protected async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ConnectionTimeoutError(this.id, this.type, timeoutMs)
            ),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(): Promise<void> {
    if (!this.rateLimiter) {
      return;
    }

    try {
      await this.rateLimiter.checkRateLimit();
    } catch (error: any) {
      logger.warn('Rate limit exceeded for connector', {
        connectorId: this.id,
        connectorType: this.type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Record a request (for rate limiting)
   */
  protected async recordRequest(): Promise<void> {
    this.requestCount++;

    if (this.rateLimiter) {
      try {
        await this.rateLimiter.recordRequest();
      } catch (error: any) {
        logger.error('Error recording request for rate limiting', {
          connectorId: this.id,
          error: error.message,
        });
      }
    }
  }

  /**
   * Validate query parameters
   */
  protected validateQueryParams(params: QueryParams): void {
    if (!params.resource) {
      throw new QueryFailedError(
        this.id,
        this.type,
        JSON.stringify(params),
        'Resource name is required'
      );
    }

    if (params.limit && params.limit > 1000) {
      throw new QueryFailedError(
        this.id,
        this.type,
        JSON.stringify(params),
        'Limit cannot exceed 1000'
      );
    }
  }

  /**
   * Validate action
   */
  protected validateAction(action: Action): void {
    if (!action.resource) {
      throw new Error('Resource name is required');
    }

    if (['create', 'update'].includes(action.operation) && !action.data) {
      throw new Error(`Data is required for ${action.operation} operation`);
    }

    if (action.operation === 'update' && !action.where) {
      throw new Error('Where clause is required for update operation');
    }

    if (action.operation === 'delete' && !action.where) {
      throw new Error('Where clause is required for delete operation');
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build error message with context
   */
  protected buildErrorMessage(
    operation: string,
    error: Error | string
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    return `${operation} failed for connector '${this.name}' (${this.type}): ${errorMessage}`;
  }

  /**
   * Log operation
   */
  protected logOperation(
    operation: string,
    details: Record<string, any> = {}
  ): void {
    logger.info(`Connector operation: ${operation}`, {
      connectorId: this.id,
      connectorName: this.name,
      connectorType: this.type,
      ...details,
    });
  }

  /**
   * Log error
   */
  protected logError(
    operation: string,
    error: Error,
    details: Record<string, any> = {}
  ): void {
    logger.error(`Connector error: ${operation}`, {
      connectorId: this.id,
      connectorName: this.name,
      connectorType: this.type,
      error: error.message,
      stack: error.stack,
      ...details,
    });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    lastHealthCheck?: Date;
    healthy: boolean;
  } {
    const errorRate =
      this.requestCount > 0 ? this.errorCount / this.requestCount : 0;

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      lastHealthCheck: this.lastHealthCheck,
      healthy: this.healthStatus,
    };
  }
}
