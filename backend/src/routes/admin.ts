import { Router } from 'express';
import { adminController, requireSuperAdmin } from '../controllers/admin.controller';

const router = Router();

// All admin routes require super admin access
// You'll need to implement admin authentication middleware

// Organization management
router.get('/organizations', adminController.getOrganizations);
router.put('/organizations/:id/status', adminController.updateOrganizationStatus);
router.put('/organizations/:id/plan', adminController.updateOrganizationPlan);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// Platform statistics
router.get('/stats', adminController.getPlatformStats);

// Audit logs
router.get('/audit', adminController.getAuditLogs);

// Admin management (super admin only)
router.post('/admins', requireSuperAdmin, adminController.createAdmin);

export default router;