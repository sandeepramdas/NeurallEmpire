/**
 * ==================== CONTEXT ENGINE TESTS ====================
 *
 * Unit and integration tests for the context engine
 *
 * @module context-engine/__tests__/context-engine.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { sessionMemoryService } from '../session-memory.service';
import { userPreferencesService } from '../user-preferences.service';
import { contextOrchestrator } from '../context.orchestrator';
import { redis } from '../redis.client';

describe('Context Engine', () => {
  const TEST_USER_ID = 'test-user-123';
  const TEST_ORG_ID = 'test-org-123';
  const TEST_AGENT_ID = 'test-agent-123';

  // ==================== SESSION MEMORY TESTS ====================

  describe('SessionMemoryService', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Ensure Redis is connected
      if (!redis.connected) {
        await redis.connect();
      }
    });

    afterEach(async () => {
      // Cleanup test session
      if (testSessionId) {
        try {
          await sessionMemoryService.deleteSession(testSessionId);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    });

    test('should create a new session', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      expect(testSessionId).toBeDefined();
      expect(typeof testSessionId).toBe('string');
      expect(testSessionId.length).toBeGreaterThan(0);
    });

    test('should retrieve session data', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      const session = await sessionMemoryService.getSession(testSessionId);

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(testSessionId);
      expect(session?.userId).toBe(TEST_USER_ID);
      expect(session?.organizationId).toBe(TEST_ORG_ID);
      expect(session?.agentId).toBe(TEST_AGENT_ID);
      expect(session?.messages).toEqual([]);
      expect(session?.metadata.totalMessages).toBe(0);
    });

    test('should add message to session', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      await sessionMemoryService.addMessage(testSessionId, {
        role: 'user',
        content: 'Hello, agent!',
        metadata: {
          tokens: 5,
          cost: 0.0001,
        },
      });

      const session = await sessionMemoryService.getSession(testSessionId);

      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0].role).toBe('user');
      expect(session?.messages[0].content).toBe('Hello, agent!');
      expect(session?.metadata.totalMessages).toBe(1);
      expect(session?.metadata.totalTokens).toBe(5);
      expect(session?.metadata.totalCost).toBe(0.0001);
    });

    test('should maintain message history limit', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      // Add 60 messages (exceeds MAX_MESSAGES = 50)
      for (let i = 0; i < 60; i++) {
        await sessionMemoryService.addMessage(testSessionId, {
          role: 'user',
          content: `Message ${i}`,
        });
      }

      const session = await sessionMemoryService.getSession(testSessionId);

      // Should keep only last 50 messages
      expect(session?.messages.length).toBe(50);
      expect(session?.messages[0].content).toBe('Message 10');
      expect(session?.messages[49].content).toBe('Message 59');
    });

    test('should get conversation history', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      // Add multiple messages
      await sessionMemoryService.addMessage(testSessionId, {
        role: 'user',
        content: 'First message',
      });

      await sessionMemoryService.addMessage(testSessionId, {
        role: 'assistant',
        content: 'First response',
      });

      await sessionMemoryService.addMessage(testSessionId, {
        role: 'user',
        content: 'Second message',
      });

      const history = await sessionMemoryService.getHistory(testSessionId, 2);

      expect(history.length).toBe(2);
      expect(history[0].content).toBe('First response');
      expect(history[1].content).toBe('Second message');
    });

    test('should update session context', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      await sessionMemoryService.updateContext(testSessionId, {
        customerName: 'John Doe',
        customerId: '12345',
      });

      const session = await sessionMemoryService.getSession(testSessionId);

      expect(session?.context.customerName).toBe('John Doe');
      expect(session?.context.customerId).toBe('12345');
    });

    test('should get session statistics', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      await sessionMemoryService.addMessage(testSessionId, {
        role: 'user',
        content: 'Test message',
        metadata: { tokens: 10, cost: 0.0002 },
      });

      const stats = await sessionMemoryService.getSessionStats(testSessionId);

      expect(stats.messageCount).toBe(1);
      expect(stats.totalTokens).toBe(10);
      expect(stats.totalCost).toBe(0.0002);
      expect(stats.duration).toBeGreaterThan(0);
      expect(stats.avgMessageLength).toBeGreaterThan(0);
    });

    test('should refresh session TTL', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      await sessionMemoryService.refreshSession(testSessionId);

      // Session should still exist
      const session = await sessionMemoryService.getSession(testSessionId);
      expect(session).toBeDefined();
    });

    test('should delete session', async () => {
      testSessionId = await sessionMemoryService.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      await sessionMemoryService.deleteSession(testSessionId);

      const session = await sessionMemoryService.getSession(testSessionId);
      expect(session).toBeNull();

      testSessionId = ''; // Prevent cleanup attempt
    });
  });

  // ==================== USER PREFERENCES TESTS ====================

  describe('UserPreferencesService', () => {
    beforeEach(async () => {
      // Ensure Redis is connected
      if (!redis.connected) {
        await redis.connect();
      }
    });

    afterEach(async () => {
      // Clear cache
      try {
        await userPreferencesService.clearCache(TEST_USER_ID, TEST_ORG_ID);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    test('should get default preferences for new user', async () => {
      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(TEST_USER_ID);
      expect(prefs.organizationId).toBe(TEST_ORG_ID);
      expect(prefs.theme).toBe('auto');
      expect(prefs.uiMode).toBe('comfortable');
      expect(prefs.language).toBe('en');
      expect(prefs.favoriteViews).toEqual([]);
    });

    test('should update user preferences', async () => {
      await userPreferencesService.updatePreferences(TEST_USER_ID, TEST_ORG_ID, {
        theme: 'dark',
        uiMode: 'compact',
        language: 'es',
      });

      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);

      expect(prefs.theme).toBe('dark');
      expect(prefs.uiMode).toBe('compact');
      expect(prefs.language).toBe('es');
    });

    test('should track user interaction', async () => {
      await userPreferencesService.trackInteraction({
        userId: TEST_USER_ID,
        organizationId: TEST_ORG_ID,
        type: 'agent_execution',
        resource: 'agent',
        resourceId: TEST_AGENT_ID,
        timestamp: new Date(),
      });

      // Interaction should be tracked (check by getting preferences)
      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs).toBeDefined();
    });

    test('should update recently used items', async () => {
      // Track multiple agent executions
      await userPreferencesService.trackInteraction({
        userId: TEST_USER_ID,
        organizationId: TEST_ORG_ID,
        type: 'agent_execution',
        resource: 'agent',
        resourceId: 'agent-1',
        timestamp: new Date(),
      });

      await userPreferencesService.trackInteraction({
        userId: TEST_USER_ID,
        organizationId: TEST_ORG_ID,
        type: 'agent_execution',
        resource: 'agent',
        resourceId: 'agent-2',
        timestamp: new Date(),
      });

      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);

      expect(prefs.recentlyUsed.agents).toContain('agent-2');
      expect(prefs.recentlyUsed.agents).toContain('agent-1');
      expect(prefs.recentlyUsed.agents[0]).toBe('agent-2'); // Most recent first
    });

    test('should toggle pin for agent', async () => {
      await userPreferencesService.togglePin(
        TEST_USER_ID,
        TEST_ORG_ID,
        'agent',
        TEST_AGENT_ID
      );

      let prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs.pinnedAgents).toContain(TEST_AGENT_ID);

      // Toggle again to unpin
      await userPreferencesService.togglePin(
        TEST_USER_ID,
        TEST_ORG_ID,
        'agent',
        TEST_AGENT_ID
      );

      prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs.pinnedAgents).not.toContain(TEST_AGENT_ID);
    });

    test('should add favorite view', async () => {
      await userPreferencesService.addFavoriteView(
        TEST_USER_ID,
        TEST_ORG_ID,
        '/dashboard/analytics'
      );

      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs.favoriteViews).toContain('/dashboard/analytics');
    });

    test('should remove favorite view', async () => {
      await userPreferencesService.addFavoriteView(
        TEST_USER_ID,
        TEST_ORG_ID,
        '/dashboard/analytics'
      );

      await userPreferencesService.removeFavoriteView(
        TEST_USER_ID,
        TEST_ORG_ID,
        '/dashboard/analytics'
      );

      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs.favoriteViews).not.toContain('/dashboard/analytics');
    });

    test('should set keyboard shortcut', async () => {
      await userPreferencesService.setShortcut(
        TEST_USER_ID,
        TEST_ORG_ID,
        'cmd+k',
        'quick-search'
      );

      const prefs = await userPreferencesService.getUserPreferences(TEST_USER_ID, TEST_ORG_ID);
      expect(prefs.shortcuts['cmd+k']).toBe('quick-search');
    });

    test('should get adaptive insights', async () => {
      // Track some interactions
      for (let i = 0; i < 10; i++) {
        await userPreferencesService.trackInteraction({
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
          type: 'agent_execution',
          resource: 'agent',
          resourceId: TEST_AGENT_ID,
          timestamp: new Date(),
        });
      }

      const insights = await userPreferencesService.getAdaptiveInsights(
        TEST_USER_ID,
        TEST_ORG_ID
      );

      expect(insights).toBeDefined();
      expect(insights.userId).toBe(TEST_USER_ID);
      expect(Array.isArray(insights.mostUsedAgents)).toBe(true);
      expect(Array.isArray(insights.peakActivityHours)).toBe(true);
    });
  });

  // ==================== CONTEXT ORCHESTRATOR TESTS ====================

  describe('ContextOrchestrator', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Ensure Redis is connected
      if (!redis.connected) {
        await redis.connect();
      }

      // Create test session
      testSessionId = await contextOrchestrator.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );
    });

    afterEach(async () => {
      // Cleanup
      if (testSessionId) {
        try {
          await contextOrchestrator.endSession(testSessionId);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    });

    test('should create session with context', async () => {
      const sessionId = await contextOrchestrator.createSession(
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID,
        { initialData: 'test' }
      );

      const session = await sessionMemoryService.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.context.initialData).toBe('test');

      // Cleanup
      await contextOrchestrator.endSession(sessionId);
    });

    test('should build basic context', async () => {
      const context = await contextOrchestrator.buildContext(
        testSessionId,
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID,
        {
          includeHistory: false,
          includeConnectors: false,
          includeKnowledge: false,
        }
      );

      expect(context).toBeDefined();
      expect(context.session.id).toBe(testSessionId);
      expect(context.user.id).toBe(TEST_USER_ID);
      expect(context.user.organizationId).toBe(TEST_ORG_ID);
      expect(context.agent.id).toBe(TEST_AGENT_ID);
      expect(context.metadata.version).toBe('3.0');
    });

    test('should build context with history', async () => {
      // Add some messages
      await contextOrchestrator.addMessage(testSessionId, 'user', 'Hello');
      await contextOrchestrator.addMessage(testSessionId, 'assistant', 'Hi there!');

      const context = await contextOrchestrator.buildContext(
        testSessionId,
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID,
        {
          includeHistory: true,
          historyLimit: 10,
        }
      );

      expect(context.session.messages.length).toBe(2);
      expect(context.session.messages[0].role).toBe('user');
      expect(context.session.messages[0].content).toBe('Hello');
      expect(context.session.messages[1].role).toBe('assistant');
      expect(context.session.messages[1].content).toBe('Hi there!');
    });

    test('should update context', async () => {
      await contextOrchestrator.updateContext({
        sessionId: testSessionId,
        userId: TEST_USER_ID,
        organizationId: TEST_ORG_ID,
        updates: {
          customData: 'test-value',
        },
      });

      const session = await sessionMemoryService.getSession(testSessionId);
      expect(session?.context.customData).toBe('test-value');
    });

    test('should add message to context', async () => {
      await contextOrchestrator.addMessage(testSessionId, 'user', 'Test message', {
        tokens: 5,
        cost: 0.0001,
      });

      const history = await sessionMemoryService.getHistory(testSessionId, 10);

      expect(history.length).toBe(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Test message');
      expect(history[0].metadata?.tokens).toBe(5);
    });

    test('should get context stats', async () => {
      await contextOrchestrator.addMessage(testSessionId, 'user', 'Message 1', {
        tokens: 5,
        cost: 0.0001,
      });

      await contextOrchestrator.addMessage(testSessionId, 'assistant', 'Response 1', {
        tokens: 10,
        cost: 0.0002,
      });

      const stats = await contextOrchestrator.getContextStats(testSessionId);

      expect(stats.messageCount).toBe(2);
      expect(stats.totalTokens).toBe(15);
      expect(stats.totalCost).toBeCloseTo(0.0003, 5);
    });

    test('should refresh session', async () => {
      await contextOrchestrator.refreshSession(testSessionId);

      // Session should still exist
      const session = await sessionMemoryService.getSession(testSessionId);
      expect(session).toBeDefined();
    });

    test('should cache and retrieve context', async () => {
      const context1 = await contextOrchestrator.buildContext(
        testSessionId,
        TEST_USER_ID,
        TEST_ORG_ID,
        TEST_AGENT_ID
      );

      const cached = await contextOrchestrator.getCachedContext(testSessionId, TEST_AGENT_ID);

      expect(cached).toBeDefined();
      expect(cached?.session.id).toBe(context1.session.id);
    });
  });
});
