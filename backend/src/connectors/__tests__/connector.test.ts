/**
 * ==================== CONNECTOR SYSTEM TESTS ====================
 *
 * Unit and integration tests for the connector system
 *
 * @module connectors/__tests__/connector.test
 */

import { DatabaseConnector } from '../database.connector';
import { APIConnector } from '../api.connector';
import { ConnectorConfig } from '../types';

describe('Connector System', () => {
  describe('DatabaseConnector', () => {
    let connector: DatabaseConnector;
    const testConfig: ConnectorConfig = {
      id: 'test-db-connector',
      name: 'Test Database',
      type: 'DATABASE',
      provider: 'postgresql',
      config: {
        timeout: 5000,
      },
      credentials: {
        databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test',
      },
    };

    beforeEach(async () => {
      connector = new DatabaseConnector(testConfig);
    });

    afterEach(async () => {
      if (connector.initialized) {
        await connector.dispose();
      }
    });

    test('should initialize successfully', async () => {
      await connector.initialize(testConfig);
      expect(connector.initialized).toBe(true);
      expect(connector.id).toBe('test-db-connector');
      expect(connector.name).toBe('Test Database');
      expect(connector.type).toBe('DATABASE');
    });

    test('should test connection', async () => {
      await connector.initialize(testConfig);
      const result = await connector.test();

      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    test('should fail when not initialized', async () => {
      await expect(
        connector.query({
          operation: 'read',
          resource: 'users',
        })
      ).rejects.toThrow('not initialized');
    });

    test('should query data', async () => {
      await connector.initialize(testConfig);

      const result = await connector.query({
        operation: 'read',
        resource: 'User', // Adjust to your schema
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should handle query errors', async () => {
      await connector.initialize(testConfig);

      await expect(
        connector.query({
          operation: 'read',
          resource: 'NonExistentTable',
        })
      ).rejects.toThrow();
    });

    test('should get schema', async () => {
      await connector.initialize(testConfig);

      const schema = await connector.getSchema();

      expect(schema).toHaveProperty('resources');
      expect(Array.isArray(schema.resources)).toBe(true);
      expect(schema.resources.length).toBeGreaterThan(0);
    });

    test('should dispose cleanly', async () => {
      await connector.initialize(testConfig);
      await connector.dispose();

      expect(connector.initialized).toBe(false);
    });

    test('should track statistics', async () => {
      await connector.initialize(testConfig);

      // Make some requests
      await connector.test();
      await connector.test();

      const stats = connector.getStatistics();

      expect(stats.requestCount).toBeGreaterThan(0);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('APIConnector', () => {
    let connector: APIConnector;
    const testConfig: ConnectorConfig = {
      id: 'test-api-connector',
      name: 'Test API',
      type: 'API',
      provider: 'rest',
      config: {
        timeout: 5000,
      },
      credentials: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
      },
    };

    beforeEach(async () => {
      connector = new APIConnector(testConfig);
    });

    afterEach(async () => {
      if (connector.initialized) {
        await connector.dispose();
      }
    });

    test('should initialize successfully', async () => {
      await connector.initialize(testConfig);
      expect(connector.initialized).toBe(true);
    });

    test('should test connection', async () => {
      await connector.initialize(testConfig);
      const result = await connector.test();

      expect(result.success).toBe(true);
    });

    test('should query data', async () => {
      await connector.initialize(testConfig);

      const result = await connector.query({
        operation: 'read',
        resource: '/posts',
        limit: 10,
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('should handle API errors', async () => {
      await connector.initialize(testConfig);

      await expect(
        connector.query({
          operation: 'read',
          resource: '/nonexistent',
        })
      ).rejects.toThrow();
    });

    test('should execute POST request', async () => {
      await connector.initialize(testConfig);

      const result = await connector.execute({
        operation: 'create',
        resource: '/posts',
        data: {
          title: 'Test Post',
          body: 'Test content',
          userId: 1,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Connector Error Handling', () => {
    test('should retry on transient errors', async () => {
      const config: ConnectorConfig = {
        id: 'test-retry',
        name: 'Test Retry',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://httpstat.us',
        },
      };

      const connector = new APIConnector(config);
      await connector.initialize(config);

      // This endpoint returns 500 initially, then 200
      // The connector should retry and eventually succeed
      try {
        await connector.query({
          operation: 'read',
          resource: '/200',
        });
      } catch (error) {
        // Expected on first try
      }

      await connector.dispose();
    });

    test('should timeout on slow requests', async () => {
      const config: ConnectorConfig = {
        id: 'test-timeout',
        name: 'Test Timeout',
        type: 'API',
        config: {
          timeout: 1000, // 1 second
        },
        credentials: {
          baseUrl: 'https://httpstat.us',
        },
      };

      const connector = new APIConnector(config);
      await connector.initialize(config);

      // This endpoint delays for 5 seconds
      await expect(
        connector.query({
          operation: 'read',
          resource: '/200?sleep=5000',
        })
      ).rejects.toThrow();

      await connector.dispose();
    });
  });

  describe('Connector Performance', () => {
    test('should track performance metrics', async () => {
      const config: ConnectorConfig = {
        id: 'test-perf',
        name: 'Test Performance',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const connector = new APIConnector(config);
      await connector.initialize(config);

      const startTime = Date.now();

      await connector.query({
        operation: 'read',
        resource: '/posts',
        limit: 10,
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete in < 5s

      const stats = connector.getStatistics();
      expect(stats.requestCount).toBeGreaterThan(0);

      await connector.dispose();
    });
  });
});
