import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { dietPlanController } from '@/controllers/diet-plan.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Diet Plan CRUD operations
router.get('/', dietPlanController.getDietPlans);
router.get('/:id', dietPlanController.getDietPlan);
router.post('/generate', dietPlanController.generateDietPlan);
router.put('/:id/status', dietPlanController.updateDietPlanStatus);
router.delete('/:id', dietPlanController.deleteDietPlan);

export default router;
