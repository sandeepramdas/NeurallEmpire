import { Router } from 'express';
import SystemSettingsController from '../controllers/settings.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public settings (no auth required in future for frontend config)
router.get('/public', SystemSettingsController.getPublicSettings);

// Feature flags
router.get('/features/:featureName', SystemSettingsController.checkFeature);
router.post('/features/:featureName/enable', SystemSettingsController.enableFeature);
router.post('/features/:featureName/disable', SystemSettingsController.disableFeature);

// Bulk operations
router.post('/bulk-update', SystemSettingsController.bulkUpdateSettings);

// Category-based retrieval
router.get('/category/:category', SystemSettingsController.getSettingsByCategory);

// Individual setting operations
router.get('/:key/details', SystemSettingsController.getSettingDetails);
router.get('/:key', SystemSettingsController.getSetting);
router.put('/:key', SystemSettingsController.setSetting);
router.delete('/:key', SystemSettingsController.deleteSetting);
router.post('/:key/reset', SystemSettingsController.resetToDefault);

// Get all settings (must be last to avoid conflicts)
router.get('/', SystemSettingsController.getAllSettings);

export default router;
