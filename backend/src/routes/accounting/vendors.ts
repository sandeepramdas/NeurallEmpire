/**
 * Vendor Routes
 * API endpoints for managing vendors
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';
import { requireCompanyContext, requireActiveCompany } from '@/middleware/company-context';
import { vendorService } from '@/services/accounting/vendor.service';

const router = Router();

// Apply common middleware to all routes
router.use(authenticate);
router.use(requireCompanyContext);
router.use(requireActiveCompany);

/**
 * GET /api/accounting/vendors
 * Get all vendors for company
 */
router.get(
  '/',
  requirePermission('accounting:read:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { isActive, includeInactive, limit, offset } = req.query;

      const vendors = await vendorService.getVendors(req.companyId!, {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeInactive: includeInactive === 'true',
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        success: true,
        data: vendors,
      });
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vendors',
      });
    }
  }
);

/**
 * GET /api/accounting/vendors/stats
 * Get vendor statistics
 */
router.get(
  '/stats',
  requirePermission('accounting:read:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await vendorService.getVendorStats(req.companyId!);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching vendor stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vendor stats',
      });
    }
  }
);

/**
 * GET /api/accounting/vendors/search
 * Search vendors
 */
router.get(
  '/search',
  requirePermission('accounting:read:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      const vendors = await vendorService.searchVendors(
        req.companyId!,
        q,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: vendors,
      });
    } catch (error: any) {
      console.error('Error searching vendors:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search vendors',
      });
    }
  }
);

/**
 * GET /api/accounting/vendors/:vendorId
 * Get vendor by ID
 */
router.get(
  '/:vendorId',
  requirePermission('accounting:read:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vendorId } = req.params;

      const vendor = await vendorService.getVendor(vendorId, req.companyId!);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
        });
      }

      res.json({
        success: true,
        data: vendor,
      });
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vendor',
      });
    }
  }
);

/**
 * GET /api/accounting/vendors/:vendorId/balance
 * Get vendor balance
 */
router.get(
  '/:vendorId/balance',
  requirePermission('accounting:read:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vendorId } = req.params;

      const balance = await vendorService.getVendorBalance(vendorId, req.companyId!);

      if (!balance) {
        return res.status(404).json({
          success: false,
          error: 'Vendor not found',
        });
      }

      res.json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      console.error('Error fetching vendor balance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vendor balance',
      });
    }
  }
);

/**
 * GET /api/accounting/vendors/:vendorId/transactions
 * Get vendor transactions
 */
router.get(
  '/:vendorId/transactions',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vendorId } = req.params;
      const { startDate, endDate, limit, offset } = req.query;

      const transactions = await vendorService.getVendorTransactions(
        vendorId,
        req.companyId!,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        }
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      console.error('Error fetching vendor transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vendor transactions',
      });
    }
  }
);

/**
 * POST /api/accounting/vendors
 * Create a new vendor
 */
router.post(
  '/',
  requirePermission('accounting:create:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        vendorNumber,
        displayName,
        name,
        email,
        phone,
        address,
        taxId,
        paymentTerms,
        notes,
        metadata,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'name is required',
        });
      }

      const vendor = await vendorService.createVendor(
        req.companyId!,
        {
          vendorNumber,
          displayName,
          name,
          email,
          phone,
          address,
          taxId,
          paymentTerms,
          notes,
          metadata,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: vendor,
        message: 'Vendor created successfully',
      });
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create vendor',
      });
    }
  }
);

/**
 * PUT /api/accounting/vendors/:vendorId
 * Update a vendor
 */
router.put(
  '/:vendorId',
  requirePermission('accounting:update:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vendorId } = req.params;
      const updates = req.body;

      const vendor = await vendorService.updateVendor(
        vendorId,
        req.companyId!,
        updates,
        req.user!.id
      );

      res.json({
        success: true,
        data: vendor,
        message: 'Vendor updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update vendor',
      });
    }
  }
);

/**
 * DELETE /api/accounting/vendors/:vendorId
 * Delete a vendor (soft delete)
 */
router.delete(
  '/:vendorId',
  requirePermission('accounting:delete:vendors'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { vendorId } = req.params;

      await vendorService.deleteVendor(vendorId, req.companyId!, req.user!.id);

      res.json({
        success: true,
        message: 'Vendor deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete vendor',
      });
    }
  }
);

export default router;
