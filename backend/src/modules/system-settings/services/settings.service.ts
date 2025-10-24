import { prisma } from '@/server';
import { captureException } from '@/config/sentry';
import { logger } from '@/infrastructure/logger';

export interface SystemSettingInput {
  key: string;
  value: any;
  type?: 'global' | 'organization' | 'user' | 'feature_flag';
  category?: string;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
  validationRules?: any;
  defaultValue?: any;
}

export interface SettingFilter {
  organizationId?: string;
  category?: string;
  type?: string;
  isPublic?: boolean;
}

export class SystemSettingsService {
  /**
   * Get a specific setting by key
   */
  static async getSetting(key: string, organizationId?: string): Promise<any | null> {
    try {
      const setting = await prisma.systemSetting.findFirst({
        where: {
          key,
          organizationId: organizationId || null,
        },
      });

      if (!setting) {
        return null;
      }

      return setting.value;
    } catch (error: any) {
      logger.error('❌ Error getting setting:', error);
      captureException(error, { key, organizationId });
      throw new Error(`Failed to get setting: ${error.message}`);
    }
  }

  /**
   * Get setting with full details
   */
  static async getSettingDetails(key: string, organizationId?: string) {
    try {
      const setting = await prisma.systemSetting.findFirst({
        where: {
          key,
          organizationId: organizationId || null,
        },
      });

      return setting;
    } catch (error: any) {
      logger.error('❌ Error getting setting details:', error);
      captureException(error, { key, organizationId });
      throw new Error(`Failed to get setting details: ${error.message}`);
    }
  }

  /**
   * Set or update a setting
   */
  static async setSetting(
    key: string,
    value: any,
    organizationId?: string,
    options?: Partial<SystemSettingInput>
  ): Promise<any> {
    try {
      const setting = await prisma.systemSetting.upsert({
        where: {
          organizationId_key: {
            organizationId: organizationId || null,
            key,
          },
        },
        create: {
          key,
          value,
          organizationId: organizationId || null,
          type: options?.type || 'organization',
          category: options?.category || 'general',
          description: options?.description,
          isPublic: options?.isPublic ?? false,
          isEditable: options?.isEditable ?? true,
          validationRules: options?.validationRules,
          defaultValue: options?.defaultValue,
        },
        update: {
          value,
          ...(options?.description && { description: options.description }),
          ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
          ...(options?.isEditable !== undefined && { isEditable: options.isEditable }),
          ...(options?.validationRules && { validationRules: options.validationRules }),
          ...(options?.defaultValue && { defaultValue: options.defaultValue }),
        },
      });

      logger.info(`✅ Setting updated: ${key}`);
      return setting;
    } catch (error: any) {
      logger.error('❌ Error setting value:', error);
      captureException(error, { key, value, organizationId });
      throw new Error(`Failed to set setting: ${error.message}`);
    }
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: string, organizationId?: string) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          category,
          organizationId: organizationId || null,
        },
        orderBy: {
          key: 'asc',
        },
      });

      return settings;
    } catch (error: any) {
      logger.error('❌ Error getting settings by category:', error);
      captureException(error, { category, organizationId });
      throw new Error(`Failed to get settings: ${error.message}`);
    }
  }

  /**
   * Get all settings for an organization
   */
  static async getAllSettings(organizationId?: string, filter?: SettingFilter) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          organizationId: organizationId || null,
          ...(filter?.category && { category: filter.category }),
          ...(filter?.type && { type: filter.type }),
          ...(filter?.isPublic !== undefined && { isPublic: filter.isPublic }),
        },
        orderBy: [
          { category: 'asc' },
          { key: 'asc' },
        ],
      });

      return settings;
    } catch (error: any) {
      logger.error('❌ Error getting all settings:', error);
      captureException(error, { organizationId, filter });
      throw new Error(`Failed to get settings: ${error.message}`);
    }
  }

  /**
   * Get public settings (for frontend)
   */
  static async getPublicSettings(organizationId?: string) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          organizationId: organizationId || null,
          isPublic: true,
        },
        select: {
          key: true,
          value: true,
          category: true,
          description: true,
        },
      });

      // Convert to key-value map
      return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
    } catch (error: any) {
      logger.error('❌ Error getting public settings:', error);
      captureException(error, { organizationId });
      throw new Error(`Failed to get public settings: ${error.message}`);
    }
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string, organizationId?: string): Promise<void> {
    try {
      const setting = await prisma.systemSetting.findFirst({
        where: {
          key,
          organizationId: organizationId || null,
        },
      });

      if (!setting) {
        throw new Error('Setting not found');
      }

      if (!setting.isEditable) {
        throw new Error('This setting cannot be deleted');
      }

      await prisma.systemSetting.delete({
        where: {
          id: setting.id,
        },
      });

      logger.info(`✅ Setting deleted: ${key}`);
    } catch (error: any) {
      logger.error('❌ Error deleting setting:', error);
      captureException(error, { key, organizationId });
      throw new Error(`Failed to delete setting: ${error.message}`);
    }
  }

  /**
   * Feature flag helpers
   */
  static async isFeatureEnabled(featureName: string, organizationId?: string): Promise<boolean> {
    try {
      const setting = await this.getSetting(`feature_${featureName}`, organizationId);
      return setting === true || setting === 'enabled';
    } catch (error) {
      logger.error(`❌ Error checking feature flag: ${featureName}`, error);
      return false; // Fail closed - feature disabled by default
    }
  }

  static async enableFeature(featureName: string, organizationId?: string): Promise<void> {
    await this.setSetting(`feature_${featureName}`, true, organizationId, {
      type: 'feature_flag',
      category: 'features',
      description: `Enable ${featureName} feature`,
      isPublic: false,
    });
  }

  static async disableFeature(featureName: string, organizationId?: string): Promise<void> {
    await this.setSetting(`feature_${featureName}`, false, organizationId, {
      type: 'feature_flag',
      category: 'features',
      description: `Enable ${featureName} feature`,
      isPublic: false,
    });
  }

  /**
   * Bulk update settings
   */
  static async bulkUpdateSettings(
    settings: Array<{ key: string; value: any }>,
    organizationId?: string
  ): Promise<void> {
    try {
      await Promise.all(
        settings.map(({ key, value }) =>
          this.setSetting(key, value, organizationId)
        )
      );

      logger.info(`✅ Bulk updated ${settings.length} settings`);
    } catch (error: any) {
      logger.error('❌ Error bulk updating settings:', error);
      captureException(error, { settingsCount: settings.length, organizationId });
      throw new Error(`Failed to bulk update settings: ${error.message}`);
    }
  }

  /**
   * Reset setting to default value
   */
  static async resetToDefault(key: string, organizationId?: string): Promise<void> {
    try {
      const setting = await this.getSettingDetails(key, organizationId);

      if (!setting) {
        throw new Error('Setting not found');
      }

      if (!setting.isEditable) {
        throw new Error('This setting cannot be reset');
      }

      if (setting.defaultValue === null) {
        throw new Error('No default value available for this setting');
      }

      await this.setSetting(key, setting.defaultValue, organizationId);

      logger.info(`✅ Setting reset to default: ${key}`);
    } catch (error: any) {
      logger.error('❌ Error resetting setting:', error);
      captureException(error, { key, organizationId });
      throw new Error(`Failed to reset setting: ${error.message}`);
    }
  }
}

export default SystemSettingsService;
