/**
 * ==================== AGENT MARKETPLACE SERVICE ====================
 *
 * Browse, install, and manage agent templates, tools, and integrations
 *
 * Features:
 * - Agent template marketplace
 * - Tool marketplace
 * - Integration marketplace
 * - Version management
 * - Ratings and reviews
 * - Installation and updates
 * - Usage analytics
 *
 * @module orchestrator/marketplace-service
 */

import { logger } from '../infrastructure/logger';
import { redis } from '../context-engine/redis.client';
import { toolRegistry, ToolDefinition } from './tool.system';
import { prisma } from './prisma.client';

// ==================== TYPES ====================

export type MarketplaceItemType = 'agent' | 'tool' | 'integration' | 'workflow';

export interface MarketplaceItem {
  id: string;
  type: MarketplaceItemType;
  name: string;
  description: string;
  longDescription?: string;
  version: string;
  author: string;
  authorOrganizationId?: string;

  // Visibility
  isPublic: boolean;
  isOfficial: boolean; // Built by NeurallEmpire team

  // Categorization
  category: string;
  tags: string[];

  // Pricing
  pricing: {
    type: 'free' | 'paid' | 'freemium';
    price?: number; // Monthly price in cents
    trialDays?: number;
  };

  // Media
  icon?: string; // URL or emoji
  screenshots?: string[];
  demoVideo?: string;

  // Installation
  installCount: number;
  activeInstallCount: number;

  // Ratings
  rating: number; // 0-5
  reviewCount: number;

  // Definition (actual content)
  definition: any; // Tool, agent, or workflow definition

  // Requirements
  requirements?: {
    minVersion?: string; // Minimum platform version
    permissions?: string[];
    dependencies?: string[]; // Other marketplace item IDs
  };

  // Documentation
  documentation?: string; // Markdown
  changelog?: string;

  // Metadata
  publishedAt: Date;
  updatedAt: Date;
  verifiedAt?: Date; // When verified by NeurallEmpire team

  metadata?: Record<string, any>;
}

export interface MarketplaceInstallation {
  id: string;
  marketplaceItemId: string;
  organizationId: string;
  installedBy: string; // userId
  version: string;
  status: 'active' | 'inactive' | 'failed';
  installedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  config?: any; // User configuration
  metadata?: Record<string, any>;
}

export interface MarketplaceReview {
  id: string;
  marketplaceItemId: string;
  userId: string;
  organizationId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  helpful: number; // Number of users who found this helpful
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceStats {
  itemId: string;
  totalInstalls: number;
  activeInstalls: number;
  avgRating: number;
  reviewCount: number;
  usageCount: number;
  lastWeekInstalls: number;
  lastMonthInstalls: number;
  trendingScore: number;
}

// ==================== MARKETPLACE SERVICE ====================

export class MarketplaceService {
  private readonly CACHE_TTL = 60 * 5; // 5 minutes

  /**
   * Publish item to marketplace
   */
  async publishItem(
    item: Omit<MarketplaceItem, 'id' | 'installCount' | 'activeInstallCount' | 'rating' | 'reviewCount' | 'publishedAt' | 'updatedAt'>
  ): Promise<MarketplaceItem> {
    try {
      // Validate item
      this.validateItem(item);

      const marketplaceItem = await prisma.marketplaceItem.create({
        data: {
          type: item.type,
          name: item.name,
          description: item.description,
          longDescription: item.longDescription,
          version: item.version,
          author: item.author,
          authorOrganizationId: item.authorOrganizationId,
          isPublic: item.isPublic,
          isOfficial: item.isOfficial,
          category: item.category,
          tags: item.tags,
          pricing: item.pricing as any,
          icon: item.icon,
          screenshots: item.screenshots,
          demoVideo: item.demoVideo,
          definition: item.definition as any,
          requirements: item.requirements as any,
          documentation: item.documentation,
          changelog: item.changelog,
          installCount: 0,
          activeInstallCount: 0,
          rating: 0,
          reviewCount: 0,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Marketplace item published', {
        itemId: marketplaceItem.id,
        name: item.name,
        type: item.type,
        author: item.author,
      });

      // Clear cache
      await this.clearItemsCache();

      return this.toMarketplaceItem(marketplaceItem);
    } catch (error) {
      logger.error('Failed to publish marketplace item', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update marketplace item
   */
  async updateItem(
    itemId: string,
    updates: Partial<MarketplaceItem>
  ): Promise<MarketplaceItem> {
    try {
      const updated = await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Marketplace item updated', { itemId, updates: Object.keys(updates) });

      await this.clearItemsCache();

      return this.toMarketplaceItem(updated);
    } catch (error) {
      logger.error('Failed to update marketplace item', { error, itemId });
      throw error;
    }
  }

  /**
   * Get marketplace item
   */
  async getItem(itemId: string): Promise<MarketplaceItem | null> {
    try {
      // Check cache
      const cached = await this.getCachedItem(itemId);
      if (cached) {
        return cached;
      }

      const item = await prisma.marketplaceItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return null;
      }

      const marketplaceItem = this.toMarketplaceItem(item);

      // Cache item
      await this.cacheItem(itemId, marketplaceItem);

      return marketplaceItem;
    } catch (error) {
      logger.error('Failed to get marketplace item', { error, itemId });
      throw error;
    }
  }

  /**
   * Browse marketplace
   */
  async browseItems(filters?: {
    type?: MarketplaceItemType;
    category?: string;
    tags?: string[];
    author?: string;
    isOfficial?: boolean;
    search?: string;
    sort?: 'popular' | 'rating' | 'recent' | 'name';
    limit?: number;
    offset?: number;
  }): Promise<{ items: MarketplaceItem[]; total: number }> {
    try {
      const where: any = {
        isPublic: true,
      };

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags,
        };
      }

      if (filters?.author) {
        where.author = filters.author;
      }

      if (filters?.isOfficial !== undefined) {
        where.isOfficial = filters.isOfficial;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Determine sort order
      let orderBy: any = { publishedAt: 'desc' }; // Default: recent

      switch (filters?.sort) {
        case 'popular':
          orderBy = { installCount: 'desc' };
          break;
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        case 'name':
          orderBy = { name: 'asc' };
          break;
      }

      const [items, total] = await Promise.all([
        prisma.marketplaceItem.findMany({
          where,
          orderBy,
          take: filters?.limit || 20,
          skip: filters?.offset || 0,
        }),
        prisma.marketplaceItem.count({ where }),
      ]);

      return {
        items: items.map((i) => this.toMarketplaceItem(i)),
        total,
      };
    } catch (error) {
      logger.error('Failed to browse marketplace', { error, filters });
      throw error;
    }
  }

  /**
   * Install marketplace item
   */
  async installItem(
    itemId: string,
    organizationId: string,
    userId: string,
    config?: any
  ): Promise<MarketplaceInstallation> {
    try {
      // Get marketplace item
      const item = await this.getItem(itemId);
      if (!item) {
        throw new Error(`Marketplace item ${itemId} not found`);
      }

      // Check if already installed
      const existing = await prisma.marketplaceInstallation.findFirst({
        where: {
          marketplaceItemId: itemId,
          organizationId,
          status: 'active',
        },
      });

      if (existing) {
        throw new Error(`Item ${item.name} is already installed`);
      }

      // Install based on type
      let installationResult: any;

      switch (item.type) {
        case 'tool':
          installationResult = await this.installTool(item, organizationId);
          break;

        case 'agent':
          installationResult = await this.installAgent(item, organizationId);
          break;

        case 'workflow':
          installationResult = await this.installWorkflow(item, organizationId);
          break;

        case 'integration':
          installationResult = await this.installIntegration(item, organizationId);
          break;

        default:
          throw new Error(`Unknown item type: ${item.type}`);
      }

      // Create installation record
      const installation = await prisma.marketplaceInstallation.create({
        data: {
          marketplaceItemId: itemId,
          organizationId,
          installedBy: userId,
          version: item.version,
          status: 'active',
          installedAt: new Date(),
          usageCount: 0,
          config: config as any,
          metadata: installationResult as any,
        },
      });

      // Update item stats
      await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          installCount: { increment: 1 },
          activeInstallCount: { increment: 1 },
        },
      });

      logger.info('Marketplace item installed', {
        itemId,
        organizationId,
        userId,
        itemName: item.name,
        itemType: item.type,
      });

      return {
        id: installation.id,
        marketplaceItemId: installation.marketplaceItemId,
        organizationId: installation.organizationId,
        installedBy: installation.installedBy,
        version: installation.version,
        status: installation.status as any,
        installedAt: installation.installedAt,
        lastUsedAt: installation.lastUsedAt || undefined,
        usageCount: installation.usageCount,
        config: installation.config as any,
      };
    } catch (error) {
      logger.error('Failed to install marketplace item', { error, itemId, organizationId });
      throw error;
    }
  }

  /**
   * Uninstall marketplace item
   */
  async uninstallItem(
    itemId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const installation = await prisma.marketplaceInstallation.findFirst({
        where: {
          marketplaceItemId: itemId,
          organizationId,
          status: 'active',
        },
      });

      if (!installation) {
        throw new Error('Installation not found');
      }

      // Mark as inactive
      await prisma.marketplaceInstallation.update({
        where: { id: installation.id },
        data: { status: 'inactive' },
      });

      // Update item stats
      await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          activeInstallCount: { decrement: 1 },
        },
      });

      logger.info('Marketplace item uninstalled', { itemId, organizationId });
    } catch (error) {
      logger.error('Failed to uninstall marketplace item', { error, itemId, organizationId });
      throw error;
    }
  }

  /**
   * List installed items
   */
  async listInstalled(
    organizationId: string,
    filters?: {
      type?: MarketplaceItemType;
      status?: 'active' | 'inactive';
    }
  ): Promise<Array<MarketplaceInstallation & { item: MarketplaceItem }>> {
    try {
      const where: any = {
        organizationId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      const installations = await prisma.marketplaceInstallation.findMany({
        where,
        include: {
          marketplaceItem: true,
        },
        orderBy: { installedAt: 'desc' },
      });

      const result = await Promise.all(
        installations.map(async (inst) => {
          const item = this.toMarketplaceItem(inst.marketplaceItem);

          // Filter by type if specified
          if (filters?.type && item.type !== filters.type) {
            return null;
          }

          return {
            id: inst.id,
            marketplaceItemId: inst.marketplaceItemId,
            organizationId: inst.organizationId,
            installedBy: inst.installedBy,
            version: inst.version,
            status: inst.status as any,
            installedAt: inst.installedAt,
            lastUsedAt: inst.lastUsedAt || undefined,
            usageCount: inst.usageCount,
            config: inst.config as any,
            item,
          };
        })
      );

      return result.filter((r) => r !== null) as any;
    } catch (error) {
      logger.error('Failed to list installed items', { error, organizationId });
      throw error;
    }
  }

  /**
   * Add review
   */
  async addReview(
    itemId: string,
    userId: string,
    organizationId: string,
    rating: number,
    title?: string,
    comment?: string
  ): Promise<MarketplaceReview> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user has already reviewed
      const existing = await prisma.marketplaceReview.findFirst({
        where: {
          marketplaceItemId: itemId,
          userId,
        },
      });

      if (existing) {
        throw new Error('You have already reviewed this item');
      }

      const review = await prisma.marketplaceReview.create({
        data: {
          marketplaceItemId: itemId,
          userId,
          organizationId,
          rating,
          title,
          comment,
          helpful: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update item rating
      await this.updateItemRating(itemId);

      logger.info('Review added', { itemId, userId, rating });

      return {
        id: review.id,
        marketplaceItemId: review.marketplaceItemId,
        userId: review.userId,
        organizationId: review.organizationId,
        rating: review.rating,
        title: review.title || undefined,
        comment: review.comment || undefined,
        helpful: review.helpful,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to add review', { error, itemId, userId });
      throw error;
    }
  }

  /**
   * Get marketplace statistics
   */
  async getStats(itemId: string): Promise<MarketplaceStats> {
    try {
      const item = await prisma.marketplaceItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      const [lastWeekInstalls, lastMonthInstalls, totalUsage] = await Promise.all([
        prisma.marketplaceInstallation.count({
          where: {
            marketplaceItemId: itemId,
            installedAt: { gte: oneWeekAgo },
          },
        }),
        prisma.marketplaceInstallation.count({
          where: {
            marketplaceItemId: itemId,
            installedAt: { gte: oneMonthAgo },
          },
        }),
        prisma.marketplaceInstallation.aggregate({
          where: { marketplaceItemId: itemId },
          _sum: { usageCount: true },
        }),
      ]);

      // Calculate trending score (installs in last week * 2 + rating * 10)
      const trendingScore = lastWeekInstalls * 2 + item.rating * 10;

      return {
        itemId,
        totalInstalls: item.installCount,
        activeInstalls: item.activeInstallCount,
        avgRating: item.rating,
        reviewCount: item.reviewCount,
        usageCount: totalUsage._sum.usageCount || 0,
        lastWeekInstalls,
        lastMonthInstalls,
        trendingScore,
      };
    } catch (error) {
      logger.error('Failed to get marketplace stats', { error, itemId });
      throw error;
    }
  }

  /**
   * Install tool from marketplace
   */
  private async installTool(item: MarketplaceItem, organizationId: string): Promise<any> {
    try {
      const toolDefinition = item.definition as ToolDefinition;

      // Register tool in tool registry
      toolRegistry.register(toolDefinition);

      return {
        toolId: toolDefinition.id,
        registered: true,
      };
    } catch (error) {
      logger.error('Failed to install tool', { error, itemId: item.id });
      throw error;
    }
  }

  /**
   * Install agent from marketplace
   */
  private async installAgent(item: MarketplaceItem, organizationId: string): Promise<any> {
    try {
      // Create agent from template
      const agentTemplate = item.definition;

      const agent = await prisma.agent.create({
        data: {
          name: `${item.name} (${organizationId})`,
          description: item.description,
          organizationId,
          model: (agentTemplate as any).llmModel || 'gpt-4',
          systemPrompt: agentTemplate.systemPrompt,
          config: agentTemplate.config as any,
          isActive: true,
          createdAt: new Date(),
        },
      });

      return {
        agentId: agent.id,
        name: agent.name,
      };
    } catch (error) {
      logger.error('Failed to install agent', { error, itemId: item.id });
      throw error;
    }
  }

  /**
   * Install workflow from marketplace
   */
  private async installWorkflow(item: MarketplaceItem, organizationId: string): Promise<any> {
    try {
      const workflowTemplate = item.definition;

      const workflow = await prisma.workflow.create({
        data: {
          name: workflowTemplate.name,
          description: item.description,
          version: item.version,
          organizationId,
          definition: workflowTemplate as any,
          isActive: true,
          createdAt: new Date(),
        },
      });

      return {
        workflowId: workflow.id,
        name: workflow.name,
      };
    } catch (error) {
      logger.error('Failed to install workflow', { error, itemId: item.id });
      throw error;
    }
  }

  /**
   * Install integration from marketplace
   */
  private async installIntegration(item: MarketplaceItem, organizationId: string): Promise<any> {
    try {
      const integrationTemplate = item.definition;

      // Create connector for integration
      const connector = await prisma.connector.create({
        data: {
          name: integrationTemplate.name,
          description: item.description,
          type: integrationTemplate.type,
          organizationId,
          config: integrationTemplate.config as any,
          isActive: true,
          createdAt: new Date(),
        },
      });

      return {
        connectorId: connector.id,
        name: connector.name,
      };
    } catch (error) {
      logger.error('Failed to install integration', { error, itemId: item.id });
      throw error;
    }
  }

  /**
   * Update item rating based on reviews
   */
  private async updateItemRating(itemId: string): Promise<void> {
    try {
      const reviews = await prisma.marketplaceReview.findMany({
        where: { marketplaceItemId: itemId },
      });

      if (reviews.length === 0) {
        return;
      }

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await prisma.marketplaceItem.update({
        where: { id: itemId },
        data: {
          rating: avgRating,
          reviewCount: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Failed to update item rating', { error, itemId });
    }
  }

  /**
   * Validate marketplace item
   */
  private validateItem(item: any): void {
    if (!item.name || !item.description || !item.version || !item.author) {
      throw new Error('Item must have name, description, version, and author');
    }

    if (!item.type || !['agent', 'tool', 'integration', 'workflow'].includes(item.type)) {
      throw new Error('Invalid item type');
    }

    if (!item.definition) {
      throw new Error('Item must have definition');
    }
  }

  /**
   * Convert DB record to MarketplaceItem
   */
  private toMarketplaceItem(record: any): MarketplaceItem {
    return {
      id: record.id,
      type: record.type,
      name: record.name,
      description: record.description,
      longDescription: record.longDescription,
      version: record.version,
      author: record.author,
      authorOrganizationId: record.authorOrganizationId,
      isPublic: record.isPublic,
      isOfficial: record.isOfficial,
      category: record.category,
      tags: record.tags,
      pricing: record.pricing,
      icon: record.icon,
      screenshots: record.screenshots,
      demoVideo: record.demoVideo,
      installCount: record.installCount,
      activeInstallCount: record.activeInstallCount,
      rating: record.rating,
      reviewCount: record.reviewCount,
      definition: record.definition,
      requirements: record.requirements,
      documentation: record.documentation,
      changelog: record.changelog,
      publishedAt: record.publishedAt,
      updatedAt: record.updatedAt,
      verifiedAt: record.verifiedAt,
    };
  }

  /**
   * Cache marketplace item
   */
  private async cacheItem(itemId: string, item: MarketplaceItem): Promise<void> {
    try {
      await redis.setJSON(`marketplace-item:${itemId}`, item, this.CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache marketplace item', { error, itemId });
    }
  }

  /**
   * Get cached marketplace item
   */
  private async getCachedItem(itemId: string): Promise<MarketplaceItem | null> {
    try {
      return await redis.getJSON<MarketplaceItem>(`marketplace-item:${itemId}`);
    } catch (error) {
      logger.warn('Failed to get cached marketplace item', { error, itemId });
      return null;
    }
  }

  /**
   * Clear items cache
   */
  private async clearItemsCache(): Promise<void> {
    try {
      const keys = await redis.keys('marketplace-item:*');
      if (keys.length > 0) {
        await redis.deleteMany(keys);
      }
    } catch (error) {
      logger.warn('Failed to clear items cache', { error });
    }
  }
}

// Singleton instance
export const marketplaceService = new MarketplaceService();

export default marketplaceService;
