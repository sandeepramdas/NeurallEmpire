import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { hierarchyController } from '@/controllers/hierarchy.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Hierarchy operations
router.get('/tree/:orgId?', hierarchyController.getHierarchyTree);
router.get('/descendants/:orgId?', hierarchyController.getDescendants);
router.get('/ancestors/:orgId?', hierarchyController.getAncestors);
router.get('/children/:orgId?', hierarchyController.getChildren);
router.get('/stats', hierarchyController.getStats);

// Hierarchy management
router.post('/set-parent/:orgId?', hierarchyController.setParent);
router.get('/check-access/:orgId', hierarchyController.checkAccess);

export default router;
