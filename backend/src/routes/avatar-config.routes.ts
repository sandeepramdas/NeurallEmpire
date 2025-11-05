import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { avatarConfigController } from '../controllers/avatar-config.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/avatar-configs - List all avatar configurations
router.get('/', avatarConfigController.getConfigs.bind(avatarConfigController));

// POST /api/avatar-configs - Create new avatar configuration
router.post('/', avatarConfigController.createConfig.bind(avatarConfigController));

// PUT /api/avatar-configs/:id - Update avatar configuration
router.put('/:id', avatarConfigController.updateConfig.bind(avatarConfigController));

// DELETE /api/avatar-configs/:id - Delete avatar configuration
router.delete('/:id', avatarConfigController.deleteConfig.bind(avatarConfigController));

export default router;
