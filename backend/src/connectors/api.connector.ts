/**
 * ==================== API CONNECTOR ====================
 *
 * Connector for REST APIs and GraphQL endpoints
 * Supports authentication, retries, and rate limiting
 *
 * Features:
 * - REST API integration
 * - Multiple auth methods (API key, Bearer, OAuth)
 * - Automatic retry with exponential backoff
 * - Response caching
 * - Request/response logging
 *
 * @module connectors/api
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { BaseConnector } from './base.connector';
import {
  ConnectorConfig,
  QueryParams,
  QueryResult,
  Action,
  ActionResult,
  ConnectorSchema,
  ConnectionTestResult,
  APICredentials,
  isAPICredentials,
} from './types';
import { decryptCredentials } from '../infrastructure/encryption';
import { QueryFailedError, InvalidCredentialsError } from '../infrastructure/errors';

export class APIConnector extends BaseConnector {
  private client: AxiosInstance | null = null;
  private credentials: APICredentials | null = null;

  /**
   * Initialize API connection
   */
  async initialize(config: ConnectorConfig): Promise<void> {
    return this.withPerformanceTracking('initialize', async () => {
      try {
        this.config = config;

        // Decrypt credentials
        const creds = typeof config.credentials === 'string'
          ? decryptCredentials(config.credentials)
          : config.credentials;

        if (!isAPICredentials(creds)) {
          throw new InvalidCredentialsError(this.id, this.type);
        }

        this.credentials = creds;

        // Create axios instance
        this.client = axios.create({
          baseURL: creds.baseUrl,
          timeout: (config.config.timeout as number) || 30000,
          headers: this.buildHeaders(),
          validateStatus: (status) => status < 500, // Don't throw on 4xx
        });

        // Add request interceptor
        this.client.interceptors.request.use(
          (config) => {
            this.logOperation('api_request', {
              method: config.method,
              url: config.url,
            });
            return config;
          },
          (error) => {
            this.logError('api_request_failed', error);
            return Promise.reject(error);
          }
        );

        // Add response interceptor
        this.client.interceptors.response.use(
          (response) => {
            this.logOperation('api_response', {
              status: response.status,
              url: response.config.url,
            });
            return response;
          },
          (error: AxiosError) => {
            this.logError('api_response_failed', error as Error, {
              status: error.response?.status,
              url: error.config?.url,
            });
            return Promise.reject(error);
          }
        );

        // Setup OAuth token refresh interceptor
        this.setupOAuthInterceptor();

        this._initialized = true;
        this.logOperation('initialize', { success: true });
      } catch (error) {
        this.logError('initialize', error as Error);
        throw error;
      }
    });
  }

  /**
   * Test API connection
   */
  async test(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      // Try to hit health/status endpoint or base URL
      const healthEndpoint = this.config.config.healthEndpoint as string || '/';
      const response = await this.client!.get(healthEndpoint);

      const latencyMs = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 300,
        message: `API responded with status ${response.status}`,
        latencyMs,
        metadata: {
          status: response.status,
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
   * Query API endpoint
   */
  async query<T = any>(params: QueryParams): Promise<QueryResult<T>> {
    this.ensureInitialized();
    this.validateQueryParams(params);

    return this.withPerformanceTracking('query', async () => {
      await this.checkRateLimit();

      const startTime = Date.now();

      try {
        const { resource, filters, limit, offset } = params;

        // Build query parameters
        const queryParams: Record<string, any> = {
          ...filters,
        };

        if (limit) queryParams.limit = limit;
        if (offset) queryParams.offset = offset;

        // Make request with retry
        const response = await this.withRetry(() =>
          this.client!.get(resource, { params: queryParams })
        );

        // Record successful request for rate limiting
        await this.recordRequest();

        // Parse response
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.data || [response.data];

        const total = this.extractTotal(response);
        const durationMs = Date.now() - startTime;

        return {
          data: data as T[],
          metadata: {
            total,
            hasMore: total ? offset! + data.length < total : undefined,
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
   * Execute action (POST, PUT, PATCH, DELETE)
   */
  async execute<T = any>(action: Action): Promise<ActionResult<T>> {
    this.ensureInitialized();
    this.validateAction(action);

    return this.withPerformanceTracking('execute', async () => {
      await this.checkRateLimit();

      try {
        const { operation, resource, data, params } = action;

        let response;

        switch (operation) {
          case 'create':
            response = await this.withRetry(() =>
              this.client!.post(resource, data, { params })
            );
            break;

          case 'update':
            response = await this.withRetry(() =>
              this.client!.put(resource, data, { params })
            );
            break;

          case 'delete':
            response = await this.withRetry(() =>
              this.client!.delete(resource, { params })
            );
            break;

          case 'execute':
            // Custom method (e.g., PATCH)
            const method = (data?.method as string) || 'post';
            response = await this.withRetry(() =>
              this.client!.request({
                method,
                url: resource,
                data: data?.body,
                params,
              })
            );
            break;

          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }

        // Record successful request for rate limiting
        await this.recordRequest();

        this.logOperation('execute', {
          operation,
          resource,
          status: response.status,
        });

        return {
          success: response.status >= 200 && response.status < 300,
          data: response.data as T,
          metadata: {
            affected: 1,
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
   * Get API schema (from OpenAPI spec if available)
   */
  async getSchema(): Promise<ConnectorSchema> {
    this.ensureInitialized();

    return this.withPerformanceTracking('getSchema', async () => {
      try {
        // Try to fetch OpenAPI/Swagger spec
        const schemaUrl = this.config.config.schemaUrl as string;

        if (schemaUrl) {
          const response = await this.client!.get(schemaUrl);
          return this.parseOpenAPISchema(response.data);
        }

        // Return manual schema from config
        const manualSchema = this.config.config.schema as ConnectorSchema;
        if (manualSchema) {
          return manualSchema;
        }

        // Return empty schema
        return {
          version: '1.0',
          resources: [],
          metadata: {
            provider: 'api',
            version: 'unknown',
            capabilities: ['read', 'write'],
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
    this.client = null;
    this.credentials = null;
    this._initialized = false;
    this.logOperation('dispose', { success: true });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Build request headers
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (!this.credentials) return headers;

    // API Key
    if (this.credentials.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    }

    // Bearer token
    if (this.credentials.bearerToken) {
      headers['Authorization'] = `Bearer ${this.credentials.bearerToken}`;
    }

    // Basic auth
    if (this.credentials.username && this.credentials.password) {
      const token = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
    }

    // OAuth
    if (this.credentials.oauth?.accessToken) {
      headers['Authorization'] = `Bearer ${this.credentials.oauth.accessToken}`;
    }

    // Custom headers
    if (this.credentials.customHeaders) {
      Object.assign(headers, this.credentials.customHeaders);
    }

    return headers;
  }

  /**
   * Extract total count from response
   */
  private extractTotal(response: any): number | undefined {
    // Try common headers
    const totalHeader =
      response.headers['x-total-count'] ||
      response.headers['total-count'] ||
      response.headers['count'];

    if (totalHeader) {
      return parseInt(totalHeader);
    }

    // Try response body
    if (response.data && typeof response.data === 'object') {
      return (
        response.data.total ||
        response.data.count ||
        response.data.totalCount ||
        undefined
      );
    }

    return undefined;
  }

  /**
   * Parse OpenAPI schema
   */
  private parseOpenAPISchema(spec: any): ConnectorSchema {
    const resources: any[] = [];

    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        // Extract resource name from path
        const resourceName = path.split('/')[1] || path;

        resources.push({
          name: resourceName,
          displayName: resourceName,
          fields: [], // Would need to parse from schema definitions
          operations: Object.keys(methods) as any,
        });
      });
    }

    return {
      version: spec.openapi || spec.swagger || '1.0',
      resources,
      metadata: {
        provider: 'api',
        version: spec.info?.version || 'unknown',
        capabilities: ['read', 'write'],
      },
    };
  }

  /**
   * Refresh OAuth token
   */
  private async refreshOAuthToken(): Promise<void> {
    if (!this.credentials?.oauth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const oauth = this.credentials.oauth;

    try {
      logger.info('Refreshing OAuth token', {
        connectorId: this.id,
        hasRefreshToken: !!oauth.refreshToken,
      });

      // Determine token endpoint based on baseUrl or use standard OAuth endpoint
      const tokenEndpoint = this.getOAuthTokenEndpoint();

      // Make token refresh request
      const response = await axios.post(
        tokenEndpoint,
        {
          grant_type: 'refresh_token',
          refresh_token: oauth.refreshToken,
          client_id: oauth.clientId,
          client_secret: oauth.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Update tokens
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token || oauth.refreshToken;

      oauth.accessToken = newAccessToken;
      oauth.refreshToken = newRefreshToken;

      // Update axios client with new token
      if (this.client) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      }

      logger.info('OAuth token refreshed successfully', {
        connectorId: this.id,
        expiresIn: response.data.expires_in,
      });

      // TODO: Persist updated tokens to database
      // This requires updating the Connector model in the database

    } catch (error: any) {
      logger.error('OAuth token refresh failed', {
        connectorId: this.id,
        error: error.message,
        status: error.response?.status,
      });

      throw new Error(`Failed to refresh OAuth token: ${error.message}`);
    }
  }

  /**
   * Get OAuth token endpoint based on connector configuration
   */
  private getOAuthTokenEndpoint(): string {
    // Check if baseUrl has a known OAuth provider
    const baseUrl = this.credentials?.baseUrl || '';

    // Common OAuth token endpoints
    const endpoints: Record<string, string> = {
      'salesforce.com': 'https://login.salesforce.com/services/oauth2/token',
      'googleapis.com': 'https://oauth2.googleapis.com/token',
      'graph.microsoft.com': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      'slack.com': 'https://slack.com/api/oauth.v2.access',
      'github.com': 'https://github.com/login/oauth/access_token',
    };

    // Find matching endpoint
    for (const [domain, endpoint] of Object.entries(endpoints)) {
      if (baseUrl.includes(domain)) {
        return endpoint;
      }
    }

    // Default: assume OAuth token endpoint is at /oauth/token
    return `${baseUrl}/oauth/token`;
  }

  /**
   * Setup axios interceptor to handle 401 errors and refresh tokens
   */
  private setupOAuthInterceptor(): void {
    if (!this.client || !this.credentials?.oauth) {
      return;
    }

    let isRefreshing = false;
    let failedQueue: Array<{
      resolve: (value?: any) => void;
      reject: (reason?: any) => void;
    }> = [];

    const processQueue = (error: any = null) => {
      failedQueue.forEach((promise) => {
        if (error) {
          promise.reject(error);
        } else {
          promise.resolve();
        }
      });

      failedQueue = [];
    };

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we have OAuth credentials
        if (
          error.response?.status === 401 &&
          this.credentials?.oauth?.refreshToken &&
          !originalRequest._retry
        ) {
          if (isRefreshing) {
            // Queue this request to retry after token refresh
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.client!.request(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            await this.refreshOAuthToken();
            processQueue();
            isRefreshing = false;

            // Retry original request with new token
            return this.client!.request(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError);
            isRefreshing = false;
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    logger.info('OAuth interceptor configured', {
      connectorId: this.id,
    });
  }
}
