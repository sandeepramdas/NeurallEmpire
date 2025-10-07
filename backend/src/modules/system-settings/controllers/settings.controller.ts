import { Request, Response } from 'express';
import SystemSettingsService from '../services/settings.service';
import { captureException } from '@/config/sentry';

export class SystemSettingsController {
  /**
   * Get a specific setting
   * GET /api/settings/:key
   */
  static async getSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const value = await SystemSettingsService.getSetting(key, organizationId);

      if (value === null) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
        });
      }

      res.json({
        success: true,
        data: { key, value },
      });
    } catch (error: any) {
      console.error('Error getting setting:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get setting',
      });
    }
  }

  /**
   * Get setting with full details
   * GET /api/settings/:key/details
   */
  static async getSettingDetails(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const setting = await SystemSettingsService.getSettingDetails(key, organizationId);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
        });
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error: any) {
      console.error('Error getting setting details:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get setting details',
      });
    }
  }

  /**
   * Get all settings
   * GET /api/settings
   */
  static async getAllSettings(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { category, type, isPublic } = req.query;

      const filter = {
        category: category as string,
        type: type as string,
        isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      };

      const settings = await SystemSettingsService.getAllSettings(organizationId, filter);

      res.json({
        success: true,
        data: settings,
        count: settings.length,
      });
    } catch (error: any) {
      console.error('Error getting settings:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get settings',
      });
    }
  }

  /**
   * Get settings by category
   * GET /api/settings/category/:category
   */
  static async getSettingsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const settings = await SystemSettingsService.getSettingsByCategory(category, organizationId);

      res.json({
        success: true,
        data: settings,
        count: settings.length,
      });
    } catch (error: any) {
      console.error('Error getting settings by category:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get settings',
      });
    }
  }

  /**
   * Get public settings
   * GET /api/settings/public
   */
  static async getPublicSettings(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      const settings = await SystemSettingsService.getPublicSettings(organizationId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error getting public settings:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get public settings',
      });
    }
  }

  /**
   * Create or update a setting
   * PUT /api/settings/:key
   */
  static async setSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, ...options } = req.body;
      const organizationId = (req as any).user?.organizationId;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Value is required',
        });
      }

      const setting = await SystemSettingsService.setSetting(
        key,
        value,
        organizationId,
        options
      );

      res.json({
        success: true,
        data: setting,
        message: 'Setting updated successfully',
      });
    } catch (error: any) {
      console.error('Error setting value:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update setting',
      });
    }
  }

  /**
   * Delete a setting
   * DELETE /api/settings/:key
   */
  static async deleteSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const organizationId = (req as any).user?.organizationId;

      await SystemSettingsService.deleteSetting(key, organizationId);

      res.json({
        success: true,
        message: 'Setting deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete setting',
      });
    }
  }

  /**
   * Reset setting to default
   * POST /api/settings/:key/reset
   */
  static async resetToDefault(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const organizationId = (req as any).user?.organizationId;

      await SystemSettingsService.resetToDefault(key, organizationId);

      res.json({
        success: true,
        message: 'Setting reset to default value',
      });
    } catch (error: any) {
      console.error('Error resetting setting:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reset setting',
      });
    }
  }

  /**
   * Bulk update settings
   * POST /api/settings/bulk-update
   */
  static async bulkUpdateSettings(req: Request, res: Response) {
    try {
      const { settings } = req.body;
      const organizationId = (req as any).user?.organizationId;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: 'Settings must be an array of {key, value} objects',
        });
      }

      await SystemSettingsService.bulkUpdateSettings(settings, organizationId);

      res.json({
        success: true,
        message: `${settings.length} settings updated successfully`,
      });
    } catch (error: any) {
      console.error('Error bulk updating settings:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to bulk update settings',
      });
    }
  }

  /**
   * Check feature flag
   * GET /api/settings/features/:featureName
   */
  static async checkFeature(req: Request, res: Response) {
    try {
      const { featureName } = req.params;
      const organizationId = (req as any).user?.organizationId;

      const isEnabled = await SystemSettingsService.isFeatureEnabled(featureName, organizationId);

      res.json({
        success: true,
        data: {
          feature: featureName,
          enabled: isEnabled,
        },
      });
    } catch (error: any) {
      console.error('Error checking feature flag:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check feature flag',
      });
    }
  }

  /**
   * Enable feature
   * POST /api/settings/features/:featureName/enable
   */
  static async enableFeature(req: Request, res: Response) {
    try {
      const { featureName } = req.params;
      const organizationId = (req as any).user?.organizationId;

      await SystemSettingsService.enableFeature(featureName, organizationId);

      res.json({
        success: true,
        message: `Feature ${featureName} enabled`,
      });
    } catch (error: any) {
      console.error('Error enabling feature:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to enable feature',
      });
    }
  }

  /**
   * Disable feature
   * POST /api/settings/features/:featureName/disable
   */
  static async disableFeature(req: Request, res: Response) {
    try {
      const { featureName } = req.params;
      const organizationId = (req as any).user?.organizationId;

      await SystemSettingsService.disableFeature(featureName, organizationId);

      res.json({
        success: true,
        message: `Feature ${featureName} disabled`,
      });
    } catch (error: any) {
      console.error('Error disabling feature:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to disable feature',
      });
    }
  }
}

export default SystemSettingsController;
