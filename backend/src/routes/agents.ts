import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { agentsController } from '@/controllers/agents.controller';
import { aiExecutionRateLimiters } from '@/middleware/rate-limit';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Agent CRUD operations
router.get('/', agentsController.getAgents);
router.get('/:id', agentsController.getAgent);
router.post('/', agentsController.createAgent);
router.put('/:id', agentsController.updateAgent);
router.delete('/:id', agentsController.deleteAgent);

// Agent operations with rate limiting
router.post('/:id/execute', ...aiExecutionRateLimiters, agentsController.executeAgent);
router.put('/:id/status', agentsController.updateAgentStatus);
router.get('/:id/metrics', agentsController.getAgentMetrics);

export default router;