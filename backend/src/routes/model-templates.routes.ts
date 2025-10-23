import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { modelTemplatesController } from '../controllers/model-templates.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all model templates
router.get('/', (req, res) => modelTemplatesController.getTemplates(req, res));

// Get specific template
router.get('/:id', (req, res) => modelTemplatesController.getTemplate(req, res));

// Get recommended providers for template
router.get('/:id/providers', (req, res) => modelTemplatesController.getTemplateProviders(req, res));

export default router;
