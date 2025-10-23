import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { costTrackingController } from '../controllers/cost-tracking.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Cost overview and analytics
router.get('/overview', (req, res) => costTrackingController.getCostOverview(req, res));
router.get('/projections', (req, res) => costTrackingController.getCostProjections(req, res));

// Budget alerts management
router.get('/alerts', (req, res) => costTrackingController.getBudgetAlerts(req, res));
router.post('/alerts', (req, res) => costTrackingController.createBudgetAlert(req, res));
router.put('/alerts/:id', (req, res) => costTrackingController.updateBudgetAlert(req, res));
router.delete('/alerts/:id', (req, res) => costTrackingController.deleteBudgetAlert(req, res));

export default router;
