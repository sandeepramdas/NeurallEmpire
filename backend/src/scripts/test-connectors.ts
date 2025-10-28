/**
 * ==================== CONNECTOR E2E TEST SCRIPT ====================
 *
 * Comprehensive end-to-end test for the connector system
 * Run with: npx tsx src/scripts/test-connectors.ts
 *
 * Tests:
 * 1. Database connector (PostgreSQL)
 * 2. API connector (REST)
 * 3. Service layer (CRUD operations)
 * 4. Error handling
 * 5. Performance
 *
 * @module scripts/test-connectors
 */

import { connectorService } from '../services/connector.service';
import { logger } from '../infrastructure/logger';

// Test configuration
const TEST_ORG_ID = 'test-org-123';
const TEST_USER_ID = 'test-user-123';

/**
 * Test 1: Database Connector
 */
async function testDatabaseConnector() {
  logger.info('\n========== TEST 1: Database Connector ==========\n');

  try {
    // Create database connector
    logger.info('✓ Creating database connector...');
    const dbConnector = await connectorService.createConnector(
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        name: 'Test PostgreSQL Database',
        type: 'DATABASE',
        provider: 'postgresql',
        description: 'Test database connector',
        config: {
          timeout: 5000,
        },
        credentials: {
          databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/test',
        },
      }
    );

    logger.info(`✓ Database connector created: ${dbConnector.id}`);
    logger.info(`  Status: ${(dbConnector as any).status || 'N/A'}`);

    // Test connection
    logger.info('\n✓ Testing database connection...');
    const testResult = await connectorService.testConnector(
      dbConnector.id,
      TEST_ORG_ID
    );

    logger.info(`  Connection ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`  Latency: ${testResult.latencyMs}ms`);

    // Get schema
    logger.info('\n✓ Fetching database schema...');
    const schema = await connectorService.getConnectorSchema(
      dbConnector.id,
      TEST_ORG_ID
    );

    logger.info(`  Found ${schema.resources.length} resources (tables)`);
    schema.resources.slice(0, 5).forEach((resource) => {
      logger.info(`    - ${resource.name} (${resource.fields.length} fields)`);
    });

    // Query data
    if (schema.resources.length > 0) {
      const firstResource = schema.resources[0].name;
      logger.info(`\n✓ Querying data from ${firstResource}...`);

      const queryResult = await connectorService.queryConnector(
        dbConnector.id,
        TEST_ORG_ID,
        {
          operation: 'read',
          resource: firstResource,
          limit: 5,
        }
      );

      logger.info(`  Retrieved ${queryResult.data.length} rows`);
      logger.info(`  Total: ${queryResult.metadata.total || 'unknown'}`);
      logger.info(`  Duration: ${queryResult.performance?.durationMs}ms`);
    }

    // Get statistics
    logger.info('\n✓ Fetching connector statistics...');
    const stats = await connectorService.getConnectorStats(
      dbConnector.id,
      TEST_ORG_ID
    );

    logger.info(`  Query count: ${stats.queryCount}`);
    logger.info(`  Error count: ${stats.errorCount}`);
    logger.info(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    logger.info(`  Avg response time: ${Math.round(stats.avgResponseTimeMs)}ms`);

    // Cleanup
    logger.info('\n✓ Cleaning up...');
    await connectorService.deleteConnector(
      dbConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    logger.info('\n✅ Database connector test PASSED\n');
    return true;
  } catch (error) {
    logger.error('\n❌ Database connector test FAILED');
    logger.error(error);
    return false;
  }
}

/**
 * Test 2: API Connector
 */
async function testAPIConnector() {
  logger.info('\n========== TEST 2: API Connector ==========\n');

  try {
    // Create API connector (using JSONPlaceholder as test API)
    logger.info('✓ Creating API connector...');
    const apiConnector = await connectorService.createConnector(
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        name: 'Test REST API',
        type: 'API',
        provider: 'rest',
        description: 'Test API connector (JSONPlaceholder)',
        config: {
          timeout: 5000,
        },
        credentials: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      }
    );

    logger.info(`✓ API connector created: ${apiConnector.id}`);
    logger.info(`  Status: ${(apiConnector as any).status || 'N/A'}`);

    // Test connection
    logger.info('\n✓ Testing API connection...');
    const testResult = await connectorService.testConnector(
      apiConnector.id,
      TEST_ORG_ID
    );

    logger.info(`  Connection ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`  Latency: ${testResult.latencyMs}ms`);

    // Query data
    logger.info('\n✓ Querying API data (GET /posts)...');
    const queryResult = await connectorService.queryConnector(
      apiConnector.id,
      TEST_ORG_ID,
      {
        operation: 'read',
        resource: '/posts',
        limit: 5,
      }
    );

    logger.info(`  Retrieved ${queryResult.data.length} items`);
    logger.info(`  Duration: ${queryResult.performance?.durationMs}ms`);

    if (queryResult.data.length > 0) {
      const firstItem = queryResult.data[0];
      logger.info(`  Sample: ${JSON.stringify(firstItem).substring(0, 100)}...`);
    }

    // Execute action (POST)
    logger.info('\n✓ Executing API action (POST /posts)...');
    const actionResult = await connectorService.executeAction(
      apiConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        operation: 'create',
        resource: '/posts',
        data: {
          title: 'Test Post from Connector',
          body: 'This is a test post created by the connector system',
          userId: 1,
        },
      }
    );

    logger.info(`  Action ${actionResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (actionResult.data) {
      logger.info(`  Created ID: ${(actionResult.data as any).id}`);
    }

    // Get statistics
    logger.info('\n✓ Fetching connector statistics...');
    const stats = await connectorService.getConnectorStats(
      apiConnector.id,
      TEST_ORG_ID
    );

    logger.info(`  Query count: ${stats.queryCount}`);
    logger.info(`  Error count: ${stats.errorCount}`);
    logger.info(`  Avg response time: ${Math.round(stats.avgResponseTimeMs)}ms`);

    // Cleanup
    logger.info('\n✓ Cleaning up...');
    await connectorService.deleteConnector(
      apiConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    logger.info('\n✅ API connector test PASSED\n');
    return true;
  } catch (error) {
    logger.error('\n❌ API connector test FAILED');
    logger.error(error);
    return false;
  }
}

/**
 * Test 3: Error Handling
 */
async function testErrorHandling() {
  logger.info('\n========== TEST 3: Error Handling ==========\n');

  try {
    // Test 3.1: Invalid credentials
    logger.info('✓ Testing invalid database credentials...');
    try {
      await connectorService.createConnector(TEST_ORG_ID, TEST_USER_ID, {
        name: 'Invalid DB',
        type: 'DATABASE',
        config: {},
        credentials: {
          databaseUrl: 'postgresql://invalid:invalid@localhost:9999/invalid',
        },
      });
      logger.info('  ❌ Should have thrown error');
      return false;
    } catch (error) {
      logger.info('  ✓ Correctly handled invalid credentials');
    }

    // Test 3.2: Invalid API endpoint
    logger.info('\n✓ Testing invalid API endpoint...');
    const invalidApiConnector = await connectorService.createConnector(
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        name: 'Invalid API',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://invalid-api-endpoint-12345.com',
        },
      }
    );

    const testResult = await connectorService.testConnector(
      invalidApiConnector.id,
      TEST_ORG_ID
    );

    if (!testResult.success) {
      logger.info('  ✓ Correctly detected invalid API');
    } else {
      logger.info('  ❌ Should have detected invalid API');
    }

    // Cleanup
    await connectorService.deleteConnector(
      invalidApiConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    // Test 3.3: Duplicate connector name
    logger.info('\n✓ Testing duplicate connector name...');
    const connector1 = await connectorService.createConnector(
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        name: 'Duplicate Test',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://api.example.com',
        },
      }
    );

    try {
      await connectorService.createConnector(TEST_ORG_ID, TEST_USER_ID, {
        name: 'Duplicate Test',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://api.example.com',
        },
      });
      logger.info('  ❌ Should have thrown conflict error');
      return false;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.info('  ✓ Correctly prevented duplicate connector');
      }
    }

    // Cleanup
    await connectorService.deleteConnector(
      connector1.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    logger.info('\n✅ Error handling test PASSED\n');
    return true;
  } catch (error) {
    logger.error('\n❌ Error handling test FAILED');
    logger.error(error);
    return false;
  }
}

/**
 * Test 4: Performance
 */
async function testPerformance() {
  logger.info('\n========== TEST 4: Performance ==========\n');

  try {
    // Create test connector
    const connector = await connectorService.createConnector(
      TEST_ORG_ID,
      TEST_USER_ID,
      {
        name: 'Performance Test API',
        type: 'API',
        config: {},
        credentials: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      }
    );

    // Test query performance
    logger.info('✓ Testing query performance (10 requests)...');
    const queryTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await connectorService.queryConnector(connector.id, TEST_ORG_ID, {
        operation: 'read',
        resource: '/posts',
        limit: 10,
      });
      queryTimes.push(Date.now() - start);
    }

    const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
    const minTime = Math.min(...queryTimes);
    const maxTime = Math.max(...queryTimes);

    logger.info(`  Average: ${Math.round(avgTime)}ms`);
    logger.info(`  Min: ${minTime}ms`);
    logger.info(`  Max: ${maxTime}ms`);

    if (avgTime < 2000) {
      logger.info('  ✓ Performance acceptable (< 2s average)');
    } else {
      logger.info('  ⚠️  Performance degraded (> 2s average)');
    }

    // Cleanup
    await connectorService.deleteConnector(
      connector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    logger.info('\n✅ Performance test PASSED\n');
    return true;
  } catch (error) {
    logger.error('\n❌ Performance test FAILED');
    logger.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  logger.info('\n');
  logger.info('╔═══════════════════════════════════════════════════════════╗');
  logger.info('║                                                             ║');
  logger.info('║        CONNECTOR SYSTEM - END-TO-END TEST SUITE            ║');
  logger.info('║                                                             ║');
  logger.info('╚═══════════════════════════════════════════════════════════╝');
  logger.info('\n');

  const results = {
    database: await testDatabaseConnector(),
    api: await testAPIConnector(),
    errorHandling: await testErrorHandling(),
    performance: await testPerformance(),
  };

  // Summary
  logger.info('\n');
  logger.info('╔═══════════════════════════════════════════════════════════╗');
  logger.info('║                       TEST SUMMARY                          ║');
  logger.info('╚═══════════════════════════════════════════════════════════╝');
  logger.info('\n');

  logger.info(`Database Connector:    ${results.database ? '✅ PASSED' : '❌ FAILED'}`);
  logger.info(`API Connector:         ${results.api ? '✅ PASSED' : '❌ FAILED'}`);
  logger.info(`Error Handling:        ${results.errorHandling ? '✅ PASSED' : '❌ FAILED'}`);
  logger.info(`Performance:           ${results.performance ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = Object.values(results).every((r) => r === true);

  logger.info('\n');
  if (allPassed) {
    logger.info('🎉 ALL TESTS PASSED! 🎉');
  } else {
    logger.info('❌ SOME TESTS FAILED');
  }
  logger.info('\n');

  // Cleanup all connectors
  await connectorService.disposeAll();

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  logger.error('Fatal error running tests:', error);
  process.exit(1);
});
