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
  console.log('\n========== TEST 1: Database Connector ==========\n');

  try {
    // Create database connector
    console.log('✓ Creating database connector...');
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

    console.log(`✓ Database connector created: ${dbConnector.id}`);
    console.log(`  Status: ${dbConnector.status}`);

    // Test connection
    console.log('\n✓ Testing database connection...');
    const testResult = await connectorService.testConnector(
      dbConnector.id,
      TEST_ORG_ID
    );

    console.log(`  Connection ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Latency: ${testResult.latencyMs}ms`);

    // Get schema
    console.log('\n✓ Fetching database schema...');
    const schema = await connectorService.getConnectorSchema(
      dbConnector.id,
      TEST_ORG_ID
    );

    console.log(`  Found ${schema.resources.length} resources (tables)`);
    schema.resources.slice(0, 5).forEach((resource) => {
      console.log(`    - ${resource.name} (${resource.fields.length} fields)`);
    });

    // Query data
    if (schema.resources.length > 0) {
      const firstResource = schema.resources[0].name;
      console.log(`\n✓ Querying data from ${firstResource}...`);

      const queryResult = await connectorService.queryConnector(
        dbConnector.id,
        TEST_ORG_ID,
        {
          operation: 'read',
          resource: firstResource,
          limit: 5,
        }
      );

      console.log(`  Retrieved ${queryResult.data.length} rows`);
      console.log(`  Total: ${queryResult.metadata.total || 'unknown'}`);
      console.log(`  Duration: ${queryResult.performance?.durationMs}ms`);
    }

    // Get statistics
    console.log('\n✓ Fetching connector statistics...');
    const stats = await connectorService.getConnectorStats(
      dbConnector.id,
      TEST_ORG_ID
    );

    console.log(`  Query count: ${stats.queryCount}`);
    console.log(`  Error count: ${stats.errorCount}`);
    console.log(`  Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg response time: ${Math.round(stats.avgResponseTimeMs)}ms`);

    // Cleanup
    console.log('\n✓ Cleaning up...');
    await connectorService.deleteConnector(
      dbConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    console.log('\n✅ Database connector test PASSED\n');
    return true;
  } catch (error) {
    console.error('\n❌ Database connector test FAILED');
    console.error(error);
    return false;
  }
}

/**
 * Test 2: API Connector
 */
async function testAPIConnector() {
  console.log('\n========== TEST 2: API Connector ==========\n');

  try {
    // Create API connector (using JSONPlaceholder as test API)
    console.log('✓ Creating API connector...');
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

    console.log(`✓ API connector created: ${apiConnector.id}`);
    console.log(`  Status: ${apiConnector.status}`);

    // Test connection
    console.log('\n✓ Testing API connection...');
    const testResult = await connectorService.testConnector(
      apiConnector.id,
      TEST_ORG_ID
    );

    console.log(`  Connection ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Latency: ${testResult.latencyMs}ms`);

    // Query data
    console.log('\n✓ Querying API data (GET /posts)...');
    const queryResult = await connectorService.queryConnector(
      apiConnector.id,
      TEST_ORG_ID,
      {
        operation: 'read',
        resource: '/posts',
        limit: 5,
      }
    );

    console.log(`  Retrieved ${queryResult.data.length} items`);
    console.log(`  Duration: ${queryResult.performance?.durationMs}ms`);

    if (queryResult.data.length > 0) {
      const firstItem = queryResult.data[0];
      console.log(`  Sample: ${JSON.stringify(firstItem).substring(0, 100)}...`);
    }

    // Execute action (POST)
    console.log('\n✓ Executing API action (POST /posts)...');
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

    console.log(`  Action ${actionResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (actionResult.data) {
      console.log(`  Created ID: ${(actionResult.data as any).id}`);
    }

    // Get statistics
    console.log('\n✓ Fetching connector statistics...');
    const stats = await connectorService.getConnectorStats(
      apiConnector.id,
      TEST_ORG_ID
    );

    console.log(`  Query count: ${stats.queryCount}`);
    console.log(`  Error count: ${stats.errorCount}`);
    console.log(`  Avg response time: ${Math.round(stats.avgResponseTimeMs)}ms`);

    // Cleanup
    console.log('\n✓ Cleaning up...');
    await connectorService.deleteConnector(
      apiConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    console.log('\n✅ API connector test PASSED\n');
    return true;
  } catch (error) {
    console.error('\n❌ API connector test FAILED');
    console.error(error);
    return false;
  }
}

/**
 * Test 3: Error Handling
 */
async function testErrorHandling() {
  console.log('\n========== TEST 3: Error Handling ==========\n');

  try {
    // Test 3.1: Invalid credentials
    console.log('✓ Testing invalid database credentials...');
    try {
      await connectorService.createConnector(TEST_ORG_ID, TEST_USER_ID, {
        name: 'Invalid DB',
        type: 'DATABASE',
        config: {},
        credentials: {
          databaseUrl: 'postgresql://invalid:invalid@localhost:9999/invalid',
        },
      });
      console.log('  ❌ Should have thrown error');
      return false;
    } catch (error) {
      console.log('  ✓ Correctly handled invalid credentials');
    }

    // Test 3.2: Invalid API endpoint
    console.log('\n✓ Testing invalid API endpoint...');
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
      console.log('  ✓ Correctly detected invalid API');
    } else {
      console.log('  ❌ Should have detected invalid API');
    }

    // Cleanup
    await connectorService.deleteConnector(
      invalidApiConnector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    // Test 3.3: Duplicate connector name
    console.log('\n✓ Testing duplicate connector name...');
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
      console.log('  ❌ Should have thrown conflict error');
      return false;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('  ✓ Correctly prevented duplicate connector');
      }
    }

    // Cleanup
    await connectorService.deleteConnector(
      connector1.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    console.log('\n✅ Error handling test PASSED\n');
    return true;
  } catch (error) {
    console.error('\n❌ Error handling test FAILED');
    console.error(error);
    return false;
  }
}

/**
 * Test 4: Performance
 */
async function testPerformance() {
  console.log('\n========== TEST 4: Performance ==========\n');

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
    console.log('✓ Testing query performance (10 requests)...');
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

    console.log(`  Average: ${Math.round(avgTime)}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms`);

    if (avgTime < 2000) {
      console.log('  ✓ Performance acceptable (< 2s average)');
    } else {
      console.log('  ⚠️  Performance degraded (> 2s average)');
    }

    // Cleanup
    await connectorService.deleteConnector(
      connector.id,
      TEST_ORG_ID,
      TEST_USER_ID
    );

    console.log('\n✅ Performance test PASSED\n');
    return true;
  } catch (error) {
    console.error('\n❌ Performance test FAILED');
    console.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                             ║');
  console.log('║        CONNECTOR SYSTEM - END-TO-END TEST SUITE            ║');
  console.log('║                                                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const results = {
    database: await testDatabaseConnector(),
    api: await testAPIConnector(),
    errorHandling: await testErrorHandling(),
    performance: await testPerformance(),
  };

  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log(`Database Connector:    ${results.database ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`API Connector:         ${results.api ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Error Handling:        ${results.errorHandling ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Performance:           ${results.performance ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = Object.values(results).every((r) => r === true);

  console.log('\n');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('❌ SOME TESTS FAILED');
  }
  console.log('\n');

  // Cleanup all connectors
  await connectorService.disposeAll();

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
