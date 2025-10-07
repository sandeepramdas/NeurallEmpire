import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { entitiesController } from '@/controllers/entities.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Entity Definition CRUD operations
router.get('/', entitiesController.getEntities);
router.get('/:id', entitiesController.getEntity);
router.post('/', entitiesController.createEntity);
router.delete('/:id', entitiesController.deleteEntity);

// Entity operations
router.post('/:id/activate', entitiesController.activateEntity);
router.get('/:id/ddl', entitiesController.getEntityDDL);
router.post('/validate-schema', entitiesController.validateSchema);

export default router;
