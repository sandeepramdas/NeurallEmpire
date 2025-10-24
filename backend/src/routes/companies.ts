/**
 * Company Routes
 * API endpoints for multi-company management
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireRole } from '@/middleware/rbac';
import { requireCompanyContext, optionalCompanyContext } from '@/middleware/company-context';
import { companyService } from '@/services/company.service';
import { rbacService } from '@/services/rbac.service';
import { logger } from '@/infrastructure/logger';

const router = Router();

/**
 * GET /api/companies
 * Get all companies user has access to
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companies = await companyService.getUserCompanies(req.user!.id);

      res.json({
        success: true,
        data: companies,
      });
    } catch (error: any) {
      logger.error('Error fetching companies:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch companies',
      });
    }
  }
);

/**
 * GET /api/companies/:companyId
 * Get company details
 */
router.get(
  '/:companyId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;

      // Verify access
      const hasAccess = await companyService.verifyAccess(req.user!.id, companyId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this company',
        });
      }

      const company = await companyService.getCompany(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      res.json({
        success: true,
        data: company,
      });
    } catch (error: any) {
      logger.error('Error fetching company:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch company',
      });
    }
  }
);

/**
 * POST /api/companies
 * Create a new company (requires organization owner/admin)
 */
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyCode, name, currencyCode, fiscalYearStart, accountingMethod } = req.body;

      if (!companyCode || !name) {
        return res.status(400).json({
          success: false,
          error: 'companyCode and name are required',
        });
      }

      const company = await companyService.createCompany(
        req.user!.organizationId,
        {
          companyCode,
          name,
          currencyCode,
          fiscalYearStart,
          accountingMethod,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: company,
        message: 'Company created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating company:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create company',
      });
    }
  }
);

/**
 * PUT /api/companies/:companyId
 * Update company details
 */
router.put(
  '/:companyId',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const updates = req.body;

      const company = await companyService.updateCompany(
        companyId,
        updates,
        req.user!.id
      );

      res.json({
        success: true,
        data: company,
        message: 'Company updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating company:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update company',
      });
    }
  }
);

/**
 * DELETE /api/companies/:companyId
 * Delete/archive company
 */
router.delete(
  '/:companyId',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;

      await companyService.deleteCompany(companyId, req.user!.id);

      res.json({
        success: true,
        message: 'Company archived successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting company:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete company',
      });
    }
  }
);

/**
 * POST /api/companies/:companyId/switch
 * Switch to a different company (returns new JWT)
 */
router.post(
  '/:companyId/switch',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;

      const result = await companyService.switchCompany(req.user!.id, companyId);

      res.json({
        success: true,
        data: result,
        message: 'Switched company successfully',
      });
    } catch (error: any) {
      logger.error('Error switching company:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to switch company',
      });
    }
  }
);

/**
 * POST /api/companies/:companyId/set-default
 * Set company as user's default
 */
router.post(
  '/:companyId/set-default',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;

      await companyService.setDefaultCompany(req.user!.id, companyId);

      res.json({
        success: true,
        message: 'Default company set successfully',
      });
    } catch (error: any) {
      logger.error('Error setting default company:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to set default company',
      });
    }
  }
);

/**
 * GET /api/companies/:companyId/stats
 * Get company statistics
 */
router.get(
  '/:companyId/stats',
  authenticate,
  requireCompanyContext,
  requirePermission('company:read:stats'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;

      const stats = await companyService.getCompanyStats(companyId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error fetching company stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch company stats',
      });
    }
  }
);

/**
 * POST /api/companies/:companyId/access
 * Grant user access to company
 */
router.post(
  '/:companyId/access',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId } = req.params;
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        return res.status(400).json({
          success: false,
          error: 'userId and roleId are required',
        });
      }

      await companyService.grantAccess(
        {
          userId,
          companyId,
          roleId,
        },
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Access granted successfully',
      });
    } catch (error: any) {
      logger.error('Error granting access:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to grant access',
      });
    }
  }
);

/**
 * DELETE /api/companies/:companyId/access/:userId
 * Revoke user access to company
 */
router.delete(
  '/:companyId/access/:userId',
  authenticate,
  requireCompanyContext,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, userId } = req.params;

      await companyService.revokeAccess(userId, companyId, req.user!.id);

      res.json({
        success: true,
        message: 'Access revoked successfully',
      });
    } catch (error: any) {
      logger.error('Error revoking access:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to revoke access',
      });
    }
  }
);

/**
 * GET /api/companies/organization/:organizationId
 * Get all companies in organization (admin only)
 */
router.get(
  '/organization/:organizationId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { organizationId } = req.params;

      // Verify user belongs to this organization
      if (req.user!.organizationId !== organizationId && !req.user!.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const companies = await companyService.getOrganizationCompanies(organizationId);

      res.json({
        success: true,
        data: companies,
      });
    } catch (error: any) {
      logger.error('Error fetching organization companies:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch companies',
      });
    }
  }
);

export default router;
