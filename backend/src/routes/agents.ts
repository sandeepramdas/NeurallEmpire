import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { agentsController } from '@/controllers/agents.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Agent CRUD operations
router.get('/', agentsController.getAgents);
router.get('/:id', agentsController.getAgent);
router.post('/', agentsController.createAgent);
router.put('/:id', agentsController.updateAgent);
router.delete('/:id', agentsController.deleteAgent);

// Agent operations
router.post('/:id/execute', agentsController.executeAgent);
router.put('/:id/status', agentsController.updateAgentStatus);
router.get('/:id/metrics', agentsController.getAgentMetrics);

export default router;