import { Router } from 'express';
import { workflowsController } from '../controllers/workflows.controller';

const router = Router();

// Workflow CRUD operations
router.get('/', workflowsController.getWorkflows);
router.get('/:id', workflowsController.getWorkflow);
router.post('/', workflowsController.createWorkflow);
router.put('/:id', workflowsController.updateWorkflow);
router.delete('/:id', workflowsController.deleteWorkflow);

// Workflow operations
router.post('/:id/execute', workflowsController.executeWorkflow);
router.put('/:id/status', workflowsController.updateWorkflowStatus);
router.get('/:id/executions', workflowsController.getWorkflowExecutions);

// Template operations
router.post('/template/:templateId', workflowsController.createFromTemplate);

export default router;