import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ttsConfigController } from '../controllers/tts-config.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/tts-configs - List all TTS configurations
router.get('/', ttsConfigController.getConfigs.bind(ttsConfigController));

// POST /api/tts-configs - Create new TTS configuration
router.post('/', ttsConfigController.createConfig.bind(ttsConfigController));

// PUT /api/tts-configs/:id - Update TTS configuration
router.put('/:id', ttsConfigController.updateConfig.bind(ttsConfigController));

// DELETE /api/tts-configs/:id - Delete TTS configuration
router.delete('/:id', ttsConfigController.deleteConfig.bind(ttsConfigController));

export default router;
