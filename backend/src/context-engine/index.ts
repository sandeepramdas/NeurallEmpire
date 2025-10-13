/**
 * ==================== CONTEXT ENGINE ====================
 *
 * Centralized export for Context Engine components
 *
 * @module context-engine
 */

// Services
export { redis, RedisClient } from './redis.client';
export {
  sessionMemoryService,
  SessionMemoryService,
  type SessionData,
  type Message,
} from './session-memory.service';
export {
  userPreferencesService,
  UserPreferencesService,
  type UserPreferences,
  type InteractionEvent,
  type AdaptiveInsights,
} from './user-preferences.service';
export {
  contextOrchestrator,
  ContextOrchestrator,
  type AgentContext,
  type ContextBuildOptions,
  type ContextUpdateInput,
} from './context.orchestrator';
