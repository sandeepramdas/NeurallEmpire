import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validateSchema, validateParams } from '@/middleware/validation';
import { SwarmController } from '@/controllers/swarm.controller';
import { z } from 'zod';
import { SwarmType, SwarmRole } from '@prisma/client';

const router = Router();
const swarmController = new SwarmController();

// Validation schemas
const CreateSwarmSchema = z.object({
  name: z.string().min(1, 'Swarm name is required'),
  description: z.string().optional(),
  coordinatorType: z.nativeEnum(SwarmType),
  configuration: z.record(z.any()).optional(),
});

const AddAgentToSwarmSchema = z.object({
  agentId: z.string().cuid('Invalid agent ID'),
  role: z.nativeEnum(SwarmRole),
  priority: z.number().min(0).max(100).default(0),
});

const ExecuteSwarmSchema = z.object({
  input: z.record(z.any()).optional(),
});

const SwarmParamsSchema = z.object({
  id: z.string().cuid('Invalid swarm ID'),
});

const SwarmAgentParamsSchema = z.object({
  id: z.string().cuid('Invalid swarm ID'),
  agentId: z.string().cuid('Invalid agent ID'),
});

// All routes require authentication
router.use(authenticate);

// Swarm CRUD operations
router.post('/', validateSchema(CreateSwarmSchema), swarmController.createSwarm.bind(swarmController));
router.get('/', swarmController.listSwarms.bind(swarmController));
router.get('/types', swarmController.getSwarmTypes.bind(swarmController));
router.get('/roles', swarmController.getSwarmRoles.bind(swarmController));
router.get('/:id', validateParams(SwarmParamsSchema), swarmController.getSwarm.bind(swarmController));

// Swarm member management
router.post('/:id/agents',
  validateParams(SwarmParamsSchema),
  validateSchema(AddAgentToSwarmSchema),
  swarmController.addAgentToSwarm.bind(swarmController)
);
router.delete('/:id/agents/:agentId',
  validateParams(SwarmAgentParamsSchema),
  swarmController.removeAgentFromSwarm.bind(swarmController)
);

// Swarm execution
router.post('/:id/execute',
  validateParams(SwarmParamsSchema),
  validateSchema(ExecuteSwarmSchema),
  swarmController.executeSwarm.bind(swarmController)
);

export default router;