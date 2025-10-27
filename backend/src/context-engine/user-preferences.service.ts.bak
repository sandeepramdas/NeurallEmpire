/**
 * ==================== USER PREFERENCES SERVICE ====================
 *
 * Manages user preferences and interaction tracking for adaptive UIs
 *
 * Features:
 * - UI preferences (theme, mode, layout)
 * - Favorite views and shortcuts
 * - Interaction tracking
 * - Adaptive learning
 * - Redis caching + DB persistence
 *
 * @module context-engine/user-preferences
 */

import { PrismaClient } from '@prisma/client';
import { redis } from './redis.client';
import { logger } from '../infrastructure/logger';

const prisma = new PrismaClient();

export interface UserPreferences {
  userId: string;
  organizationId: string;

  // UI Preferences
  theme: 'light' | 'dark' | 'auto';
  uiMode: 'compact' | 'comfortable' | 'spacious';
  language: string;
  timezone: string;

  // Dashboard Preferences
  defaultView: string;
  favoriteViews: string[];
  pinnedAgents: string[];
  pinnedConnectors: string[];

  // Interaction Preferences
  shortcuts: Record<string, string>;
  recentlyUsed: {
    agents: string[];
    connectors: string[];
    views: string[];
  };

  // Notification Preferences
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    channels: string[];
  };

  // Canvas Preferences
  canvasSettings: {
    autoSave: boolean;
    gridSnap: boolean;
    defaultLayout: string;
  };

  // Agent Preferences
  agentDefaults: {
    model: string;
    temperature: number;
    maxTokens: number;
  };

  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastSync: Date;
  };
}

export interface InteractionEvent {
  userId: string;
  organizationId: string;
  type: 'view' | 'action' | 'agent_execution' | 'canvas_interaction' | 'connector_usage';
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AdaptiveInsights {
  userId: string;
  mostUsedAgents: Array<{ id: string; count: number; name: string }>;
  mostUsedConnectors: Array<{ id: string; count: number; name: string }>;
  mostVisitedViews: Array<{ path: string; count: number }>;
  peakActivityHours: number[];
  preferredModels: Array<{ model: string; count: number }>;
  recommendations: {
    suggestedAgents: string[];
    suggestedConnectors: string[];
    suggestedShortcuts: Array<{ action: string; reason: string }>;
  };
}

export class UserPreferencesService {
  private readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
  private readonly INTERACTION_TTL = 60 * 60 * 24 * 30; // 30 days
  private readonly MAX_RECENT_ITEMS = 20;
  private readonly MAX_INTERACTIONS = 1000; // Per user

  /**
   * Get user preferences
   */
  async getUserPreferences(
    userId: string,
    organizationId: string
  ): Promise<UserPreferences> {
    // Try Redis cache first
    const cached = await redis.getJSON<UserPreferences>(
      this.getPreferencesKey(userId, organizationId)
    );

    if (cached) {
      return cached;
    }

    // Fetch from database
    const dbPrefs = await prisma.userPreferences.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!dbPrefs) {
      // Create default preferences
      return await this.createDefaultPreferences(userId, organizationId);
    }

    // Map to UserPreferences interface
    const preferences: UserPreferences = {
      userId: dbPrefs.userId,
      organizationId: dbPrefs.organizationId,
      theme: (dbPrefs.theme as any) || 'auto',
      uiMode: (dbPrefs.uiMode as any) || 'comfortable',
      language: dbPrefs.language || 'en',
      timezone: dbPrefs.timezone || 'UTC',
      defaultView: dbPrefs.defaultView || '/dashboard',
      favoriteViews: (dbPrefs.favoriteViews as string[]) || [],
      pinnedAgents: (dbPrefs.pinnedAgents as string[]) || [],
      pinnedConnectors: (dbPrefs.pinnedConnectors as string[]) || [],
      shortcuts: (dbPrefs.shortcuts as Record<string, string>) || {},
      recentlyUsed: (dbPrefs.recentlyUsed as any) || {
        agents: [],
        connectors: [],
        views: [],
      },
      notifications: (dbPrefs.notifications as any) || {
        email: true,
        push: false,
        desktop: false,
        channels: [],
      },
      canvasSettings: (dbPrefs.canvasSettings as any) || {
        autoSave: true,
        gridSnap: false,
        defaultLayout: 'flow',
      },
      agentDefaults: (dbPrefs.agentDefaults as any) || {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 4096,
      },
      metadata: {
        createdAt: dbPrefs.createdAt,
        updatedAt: dbPrefs.updatedAt,
        lastSync: new Date(),
      },
    };

    // Cache in Redis
    await redis.setJSON(
      this.getPreferencesKey(userId, organizationId),
      preferences,
      this.CACHE_TTL
    );

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    organizationId: string,
    updates: Partial<Omit<UserPreferences, 'userId' | 'organizationId' | 'metadata'>>
  ): Promise<UserPreferences> {
    // Get current preferences
    const current = await this.getUserPreferences(userId, organizationId);

    // Merge updates
    const updated: UserPreferences = {
      ...current,
      ...updates,
      userId,
      organizationId,
      metadata: {
        ...current.metadata,
        updatedAt: new Date(),
        lastSync: new Date(),
      },
    };

    // Update database
    await prisma.userPreferences.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      update: {
        theme: updated.theme,
        uiMode: updated.uiMode,
        language: updated.language,
        timezone: updated.timezone,
        defaultView: updated.defaultView,
        favoriteViews: updated.favoriteViews,
        pinnedAgents: updated.pinnedAgents,
        pinnedConnectors: updated.pinnedConnectors,
        shortcuts: updated.shortcuts,
        recentlyUsed: updated.recentlyUsed,
        notifications: updated.notifications,
        canvasSettings: updated.canvasSettings,
        agentDefaults: updated.agentDefaults,
        updatedAt: new Date(),
      },
      create: {
        userId,
        organizationId,
        theme: updated.theme,
        uiMode: updated.uiMode,
        language: updated.language,
        timezone: updated.timezone,
        defaultView: updated.defaultView,
        favoriteViews: updated.favoriteViews,
        pinnedAgents: updated.pinnedAgents,
        pinnedConnectors: updated.pinnedConnectors,
        shortcuts: updated.shortcuts,
        recentlyUsed: updated.recentlyUsed,
        notifications: updated.notifications,
        canvasSettings: updated.canvasSettings,
        agentDefaults: updated.agentDefaults,
      },
    });

    // Update cache
    await redis.setJSON(
      this.getPreferencesKey(userId, organizationId),
      updated,
      this.CACHE_TTL
    );

    logger.info('User preferences updated', {
      userId,
      organizationId,
      updatedFields: Object.keys(updates),
    });

    return updated;
  }

  /**
   * Track user interaction
   */
  async trackInteraction(event: InteractionEvent): Promise<void> {
    const { userId, organizationId, type, resource, resourceId, metadata } = event;

    // Store interaction in database
    await prisma.userInteraction.create({
      data: {
        userId,
        organizationId,
        interactionType: type,
        resource,
        resourceId,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    });

    // Store in Redis for fast access (with TTL)
    const interactionKey = this.getInteractionKey(userId, organizationId);
    await redis.lpush(interactionKey, JSON.stringify(event));
    await redis.ltrim(interactionKey, 0, this.MAX_INTERACTIONS - 1);
    await redis.expire(interactionKey, this.INTERACTION_TTL);

    // Update recently used items
    await this.updateRecentlyUsed(userId, organizationId, type, resourceId);

    logger.debug('Interaction tracked', {
      userId,
      type,
      resource,
      resourceId,
    });
  }

  /**
   * Update recently used items
   */
  private async updateRecentlyUsed(
    userId: string,
    organizationId: string,
    type: string,
    resourceId: string
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    let category: 'agents' | 'connectors' | 'views' | null = null;

    if (type === 'agent_execution') category = 'agents';
    else if (type === 'connector_usage') category = 'connectors';
    else if (type === 'view') category = 'views';

    if (!category) return;

    // Update recent list (move to front if exists, add if not)
    const recent = prefs.recentlyUsed[category].filter((id) => id !== resourceId);
    recent.unshift(resourceId);

    // Keep only last N items
    const updated = recent.slice(0, this.MAX_RECENT_ITEMS);

    await this.updatePreferences(userId, organizationId, {
      recentlyUsed: {
        ...prefs.recentlyUsed,
        [category]: updated,
      },
    });
  }

  /**
   * Get adaptive insights
   */
  async getAdaptiveInsights(
    userId: string,
    organizationId: string
  ): Promise<AdaptiveInsights> {
    // Get recent interactions (last 30 days)
    const interactions = await prisma.userInteraction.findMany({
      where: {
        userId,
        organizationId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 500,
    });

    // Aggregate agent usage
    const agentUsage = new Map<string, number>();
    interactions
      .filter((i) => i.interactionType === 'agent_execution')
      .forEach((i) => {
        agentUsage.set(i.resourceId, (agentUsage.get(i.resourceId) || 0) + 1);
      });

    // Aggregate connector usage
    const connectorUsage = new Map<string, number>();
    interactions
      .filter((i) => i.interactionType === 'connector_usage')
      .forEach((i) => {
        connectorUsage.set(i.resourceId, (connectorUsage.get(i.resourceId) || 0) + 1);
      });

    // Aggregate view visits
    const viewVisits = new Map<string, number>();
    interactions
      .filter((i) => i.interactionType === 'view')
      .forEach((i) => {
        viewVisits.set(i.resource, (viewVisits.get(i.resource) || 0) + 1);
      });

    // Calculate peak activity hours
    const hourCounts = new Array(24).fill(0);
    interactions.forEach((i) => {
      const hour = new Date(i.timestamp).getHours();
      hourCounts[hour]++;
    });

    // Get top 3 peak hours
    const peakActivityHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => item.hour);

    // Aggregate preferred models
    const modelUsage = new Map<string, number>();
    interactions
      .filter((i) => i.metadata && (i.metadata as any).model)
      .forEach((i) => {
        const model = (i.metadata as any).model;
        modelUsage.set(model, (modelUsage.get(model) || 0) + 1);
      });

    // Get agent and connector names
    const topAgentIds = Array.from(agentUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    const topConnectorIds = Array.from(connectorUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    const agents = await prisma.agent.findMany({
      where: { id: { in: topAgentIds }, organizationId },
      select: { id: true, name: true },
    });

    const connectors = await prisma.connector.findMany({
      where: { id: { in: topConnectorIds }, organizationId },
      select: { id: true, name: true },
    });

    // Build insights
    const insights: AdaptiveInsights = {
      userId,
      mostUsedAgents: topAgentIds.map((id) => ({
        id,
        count: agentUsage.get(id) || 0,
        name: agents.find((a) => a.id === id)?.name || 'Unknown',
      })),
      mostUsedConnectors: topConnectorIds.map((id) => ({
        id,
        count: connectorUsage.get(id) || 0,
        name: connectors.find((c) => c.id === id)?.name || 'Unknown',
      })),
      mostVisitedViews: Array.from(viewVisits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ path, count })),
      peakActivityHours,
      preferredModels: Array.from(modelUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([model, count]) => ({ model, count })),
      recommendations: await this.generateRecommendations(
        userId,
        organizationId,
        agentUsage,
        connectorUsage,
        viewVisits
      ),
    };

    return insights;
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    userId: string,
    organizationId: string,
    agentUsage: Map<string, number>,
    connectorUsage: Map<string, number>,
    viewVisits: Map<string, number>
  ): Promise<AdaptiveInsights['recommendations']> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    // Get all available agents and connectors
    const [allAgents, allConnectors] = await Promise.all([
      prisma.agent.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, name: true, category: true },
      }),
      prisma.connector.findMany({
        where: { organizationId, status: 'CONNECTED' },
        select: { id: true, name: true, type: true },
      }),
    ]);

    // Suggest agents not yet used but in same category as most used
    const usedAgentIds = Array.from(agentUsage.keys());
    const mostUsedAgent = allAgents.find((a) => a.id === usedAgentIds[0]);

    const suggestedAgents = allAgents
      .filter((a) => !usedAgentIds.includes(a.id))
      .filter((a) => mostUsedAgent && a.category === mostUsedAgent.category)
      .slice(0, 3)
      .map((a) => a.id);

    // Suggest connectors not yet used
    const usedConnectorIds = Array.from(connectorUsage.keys());
    const suggestedConnectors = allConnectors
      .filter((c) => !usedConnectorIds.includes(c.id))
      .slice(0, 3)
      .map((c) => c.id);

    // Suggest shortcuts based on frequent actions
    const suggestedShortcuts: Array<{ action: string; reason: string }> = [];

    if (agentUsage.size > 0) {
      const mostUsed = Array.from(agentUsage.entries()).sort((a, b) => b[1] - a[1])[0];
      suggestedShortcuts.push({
        action: `quick-execute-${mostUsed[0]}`,
        reason: `You frequently use this agent (${mostUsed[1]} times)`,
      });
    }

    if (viewVisits.size > 0) {
      const mostVisited = Array.from(viewVisits.entries()).sort((a, b) => b[1] - a[1])[0];
      suggestedShortcuts.push({
        action: `quick-nav-${mostVisited[0]}`,
        reason: `You often visit this view (${mostVisited[1]} times)`,
      });
    }

    return {
      suggestedAgents,
      suggestedConnectors,
      suggestedShortcuts,
    };
  }

  /**
   * Create default preferences
   */
  private async createDefaultPreferences(
    userId: string,
    organizationId: string
  ): Promise<UserPreferences> {
    const defaults: UserPreferences = {
      userId,
      organizationId,
      theme: 'auto',
      uiMode: 'comfortable',
      language: 'en',
      timezone: 'UTC',
      defaultView: '/dashboard',
      favoriteViews: [],
      pinnedAgents: [],
      pinnedConnectors: [],
      shortcuts: {},
      recentlyUsed: {
        agents: [],
        connectors: [],
        views: [],
      },
      notifications: {
        email: true,
        push: false,
        desktop: false,
        channels: [],
      },
      canvasSettings: {
        autoSave: true,
        gridSnap: false,
        defaultLayout: 'flow',
      },
      agentDefaults: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 4096,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSync: new Date(),
      },
    };

    // Create in database
    await prisma.userPreferences.create({
      data: {
        userId,
        organizationId,
        theme: defaults.theme,
        uiMode: defaults.uiMode,
        language: defaults.language,
        timezone: defaults.timezone,
        defaultView: defaults.defaultView,
        favoriteViews: defaults.favoriteViews,
        pinnedAgents: defaults.pinnedAgents,
        pinnedConnectors: defaults.pinnedConnectors,
        shortcuts: defaults.shortcuts,
        recentlyUsed: defaults.recentlyUsed,
        notifications: defaults.notifications,
        canvasSettings: defaults.canvasSettings,
        agentDefaults: defaults.agentDefaults,
      },
    });

    // Cache in Redis
    await redis.setJSON(
      this.getPreferencesKey(userId, organizationId),
      defaults,
      this.CACHE_TTL
    );

    logger.info('Default preferences created', { userId, organizationId });

    return defaults;
  }

  /**
   * Pin/unpin resource
   */
  async togglePin(
    userId: string,
    organizationId: string,
    resourceType: 'agent' | 'connector',
    resourceId: string
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    const field = resourceType === 'agent' ? 'pinnedAgents' : 'pinnedConnectors';
    const current = prefs[field];

    const updated = current.includes(resourceId)
      ? current.filter((id) => id !== resourceId)
      : [...current, resourceId];

    await this.updatePreferences(userId, organizationId, {
      [field]: updated,
    });

    logger.info('Resource pin toggled', {
      userId,
      resourceType,
      resourceId,
      pinned: !current.includes(resourceId),
    });
  }

  /**
   * Add favorite view
   */
  async addFavoriteView(
    userId: string,
    organizationId: string,
    viewPath: string
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    if (!prefs.favoriteViews.includes(viewPath)) {
      await this.updatePreferences(userId, organizationId, {
        favoriteViews: [...prefs.favoriteViews, viewPath],
      });
    }
  }

  /**
   * Remove favorite view
   */
  async removeFavoriteView(
    userId: string,
    organizationId: string,
    viewPath: string
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    await this.updatePreferences(userId, organizationId, {
      favoriteViews: prefs.favoriteViews.filter((v) => v !== viewPath),
    });
  }

  /**
   * Set shortcut
   */
  async setShortcut(
    userId: string,
    organizationId: string,
    key: string,
    action: string
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId, organizationId);

    await this.updatePreferences(userId, organizationId, {
      shortcuts: {
        ...prefs.shortcuts,
        [key]: action,
      },
    });
  }

  /**
   * Clear cache
   */
  async clearCache(userId: string, organizationId: string): Promise<void> {
    await redis.delete(this.getPreferencesKey(userId, organizationId));
    logger.info('Preferences cache cleared', { userId, organizationId });
  }

  /**
   * Helper: Get preferences cache key
   */
  private getPreferencesKey(userId: string, organizationId: string): string {
    return `prefs:${organizationId}:${userId}`;
  }

  /**
   * Helper: Get interaction cache key
   */
  private getInteractionKey(userId: string, organizationId: string): string {
    return `interactions:${organizationId}:${userId}`;
  }
}

// Singleton instance
export const userPreferencesService = new UserPreferencesService();
