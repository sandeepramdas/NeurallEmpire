import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { codeArtifactsController } from '@/controllers/code-artifacts.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Code Artifacts CRUD operations
router.get('/', codeArtifactsController.getArtifacts);
router.get('/stats', codeArtifactsController.getStats);
router.get('/:id', codeArtifactsController.getArtifact);
router.post('/', codeArtifactsController.createArtifact);

// Artifact operations
router.post('/:id/review', codeArtifactsController.reviewArtifact);
router.post('/:id/deploy', codeArtifactsController.deployArtifact);
router.get('/:id/versions', codeArtifactsController.getVersionHistory);
router.post('/:id/versions', codeArtifactsController.createVersion);

// Validation
router.post('/validate-code', codeArtifactsController.validateCode);

export default router;
