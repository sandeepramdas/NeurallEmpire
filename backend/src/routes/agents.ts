import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validateSchema, validateParams } from '@/middleware/validation';
import { AgentController } from '@/controllers/agent.controller';
import { CreateAgentSchema, UpdateAgentSchema } from '@/schemas/agent.schemas';
import { z } from 'zod';

const router = Router();
const agentController = new AgentController();

// Parameter validation schemas
const AgentParamsSchema = z.object({
  id: z.string().cuid('Invalid agent ID'),
});

// All routes require authentication
router.use(authenticate);

// Agent CRUD operations
router.post('/', validateSchema(CreateAgentSchema), agentController.createAgent.bind(agentController));
router.get('/', agentController.listAgents.bind(agentController));
router.get('/types', agentController.getAgentTypes.bind(agentController));
router.get('/:id', validateParams(AgentParamsSchema), agentController.getAgent.bind(agentController));
router.put('/:id', validateParams(AgentParamsSchema), validateSchema(UpdateAgentSchema), agentController.updateAgent.bind(agentController));

// Agent lifecycle operations
router.post('/:id/start', validateParams(AgentParamsSchema), agentController.startAgent.bind(agentController));
router.post('/:id/stop', validateParams(AgentParamsSchema), agentController.stopAgent.bind(agentController));
router.post('/:id/execute', validateParams(AgentParamsSchema), agentController.executeAgent.bind(agentController));

// Agent execution history
router.get('/:id/executions', validateParams(AgentParamsSchema), agentController.getAgentExecutions.bind(agentController));

export default router;