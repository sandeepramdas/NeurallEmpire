/**
 * Customer Routes
 * API endpoints for managing customers
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';
import { requireCompanyContext, requireActiveCompany } from '@/middleware/company-context';
import { customerService } from '@/services/accounting/customer.service';

const router = Router();

// Apply common middleware to all routes
router.use(authenticate);
router.use(requireCompanyContext);
router.use(requireActiveCompany);

/**
 * GET /api/accounting/customers
 * Get all customers for company
 */
router.get(
  '/',
  requirePermission('accounting:read:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { isActive, includeInactive, limit, offset } = req.query;

      const customers = await customerService.getCustomers(req.companyId!, {
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeInactive: includeInactive === 'true',
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        success: true,
        data: customers,
      });
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customers',
      });
    }
  }
);

/**
 * GET /api/accounting/customers/stats
 * Get customer statistics
 */
router.get(
  '/stats',
  requirePermission('accounting:read:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await customerService.getCustomerStats(req.companyId!);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching customer stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer stats',
      });
    }
  }
);

/**
 * GET /api/accounting/customers/search
 * Search customers
 */
router.get(
  '/search',
  requirePermission('accounting:read:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      const customers = await customerService.searchCustomers(
        req.companyId!,
        q,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: customers,
      });
    } catch (error: any) {
      console.error('Error searching customers:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search customers',
      });
    }
  }
);

/**
 * GET /api/accounting/customers/:customerId
 * Get customer by ID
 */
router.get(
  '/:customerId',
  requirePermission('accounting:read:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.params;

      const customer = await customerService.getCustomer(customerId, req.companyId!);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      res.json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer',
      });
    }
  }
);

/**
 * GET /api/accounting/customers/:customerId/balance
 * Get customer balance
 */
router.get(
  '/:customerId/balance',
  requirePermission('accounting:read:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.params;

      const balance = await customerService.getCustomerBalance(customerId, req.companyId!);

      if (!balance) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      res.json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      console.error('Error fetching customer balance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer balance',
      });
    }
  }
);

/**
 * GET /api/accounting/customers/:customerId/transactions
 * Get customer transactions
 */
router.get(
  '/:customerId/transactions',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.params;
      const { startDate, endDate, limit, offset } = req.query;

      const transactions = await customerService.getCustomerTransactions(
        customerId,
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
      console.error('Error fetching customer transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer transactions',
      });
    }
  }
);

/**
 * POST /api/accounting/customers
 * Create a new customer
 */
router.post(
  '/',
  requirePermission('accounting:create:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        customerNumber,
        displayName,
        name,
        email,
        phone,
        billingAddress,
        shippingAddress,
        taxId,
        creditLimit,
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

      const customer = await customerService.createCustomer(
        req.companyId!,
        {
          customerNumber,
          displayName,
          name,
          email,
          phone,
          billingAddress,
          shippingAddress,
          taxId,
          creditLimit,
          paymentTerms,
          notes,
          metadata,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create customer',
      });
    }
  }
);

/**
 * PUT /api/accounting/customers/:customerId
 * Update a customer
 */
router.put(
  '/:customerId',
  requirePermission('accounting:update:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.params;
      const updates = req.body;

      const customer = await customerService.updateCustomer(
        customerId,
        req.companyId!,
        updates,
        req.user!.id
      );

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update customer',
      });
    }
  }
);

/**
 * DELETE /api/accounting/customers/:customerId
 * Delete a customer (soft delete)
 */
router.delete(
  '/:customerId',
  requirePermission('accounting:delete:customers'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.params;

      await customerService.deleteCustomer(customerId, req.companyId!, req.user!.id);

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete customer',
      });
    }
  }
);

export default router;
