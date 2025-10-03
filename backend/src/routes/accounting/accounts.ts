/**
 * Chart of Accounts Routes
 * API endpoints for managing chart of accounts
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';
import { requireCompanyContext, requireActiveCompany } from '@/middleware/company-context';
import { chartOfAccountsService } from '@/services/accounting/chart-of-accounts.service';
import { AccountType } from '@prisma/client';

const router = Router();

// Apply common middleware to all routes
router.use(authenticate);
router.use(requireCompanyContext);
router.use(requireActiveCompany);

/**
 * GET /api/accounting/accounts
 * Get all accounts for company
 */
router.get(
  '/',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountType, isActive, includeInactive } = req.query;

      const accounts = await chartOfAccountsService.getAccounts(req.companyId!, {
        accountType: accountType as AccountType,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        includeInactive: includeInactive === 'true',
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch accounts',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/tree
 * Get chart of accounts as hierarchical tree
 */
router.get(
  '/tree',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const accountTree = await chartOfAccountsService.getAccountTree(req.companyId!);

      res.json({
        success: true,
        data: accountTree,
      });
    } catch (error: any) {
      console.error('Error fetching account tree:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account tree',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/:accountId
 * Get account by ID
 */
router.get(
  '/:accountId',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      const account = await chartOfAccountsService.getAccount(accountId, req.companyId!);

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      res.json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      console.error('Error fetching account:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/:accountId/balance
 * Get account balance
 */
router.get(
  '/:accountId/balance',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      const balance = await chartOfAccountsService.getAccountBalance(accountId, req.companyId!);

      if (!balance) {
        return res.status(404).json({
          success: false,
          error: 'Account not found',
        });
      }

      res.json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      console.error('Error fetching account balance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account balance',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/:accountId/path
 * Get account hierarchy path (breadcrumbs)
 */
router.get(
  '/:accountId/path',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      const path = await chartOfAccountsService.getAccountPath(accountId, req.companyId!);

      res.json({
        success: true,
        data: path,
      });
    } catch (error: any) {
      console.error('Error fetching account path:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account path',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/type/:accountType
 * Get accounts by type
 */
router.get(
  '/type/:accountType',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountType } = req.params;

      const accounts = await chartOfAccountsService.getAccountsByType(
        req.companyId!,
        accountType as AccountType
      );

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      console.error('Error fetching accounts by type:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch accounts',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/type/:accountType/balances
 * Get balances for all accounts of a specific type
 */
router.get(
  '/type/:accountType/balances',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountType } = req.params;

      const balances = await chartOfAccountsService.getAccountBalancesByType(
        req.companyId!,
        accountType as AccountType
      );

      res.json({
        success: true,
        data: balances,
      });
    } catch (error: any) {
      console.error('Error fetching account balances:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account balances',
      });
    }
  }
);

/**
 * GET /api/accounting/accounts/search
 * Search accounts
 */
router.get(
  '/search',
  requirePermission('accounting:read:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      const accounts = await chartOfAccountsService.searchAccounts(
        req.companyId!,
        q,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      console.error('Error searching accounts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search accounts',
      });
    }
  }
);

/**
 * POST /api/accounting/accounts
 * Create a new account
 */
router.post(
  '/',
  requirePermission('accounting:create:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        accountCode,
        accountName,
        accountType,
        description,
        parentAccountId,
        accountSubType,
        isActive,
        isSystemAccount,
        metadata,
      } = req.body;

      if (!accountCode || !accountName || !accountType) {
        return res.status(400).json({
          success: false,
          error: 'accountCode, accountName, and accountType are required',
        });
      }

      const account = await chartOfAccountsService.createAccount(
        req.companyId!,
        {
          accountCode,
          accountName,
          accountType,
          description,
          parentAccountId,
          accountSubType,
          isActive,
          isSystemAccount,
          metadata,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully',
      });
    } catch (error: any) {
      console.error('Error creating account:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create account',
      });
    }
  }
);

/**
 * PUT /api/accounting/accounts/:accountId
 * Update an account
 */
router.put(
  '/:accountId',
  requirePermission('accounting:update:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const updates = req.body;

      const account = await chartOfAccountsService.updateAccount(
        accountId,
        req.companyId!,
        updates,
        req.user!.id
      );

      res.json({
        success: true,
        data: account,
        message: 'Account updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating account:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update account',
      });
    }
  }
);

/**
 * DELETE /api/accounting/accounts/:accountId
 * Delete an account (soft delete)
 */
router.delete(
  '/:accountId',
  requirePermission('accounting:delete:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;

      await chartOfAccountsService.deleteAccount(accountId, req.companyId!, req.user!.id);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete account',
      });
    }
  }
);

/**
 * POST /api/accounting/accounts/seed-defaults
 * Seed default chart of accounts
 */
router.post(
  '/seed-defaults',
  requirePermission('accounting:create:accounts'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const accounts = await chartOfAccountsService.seedDefaultAccounts(
        req.companyId!,
        req.user!.id
      );

      res.json({
        success: true,
        data: accounts,
        message: 'Default chart of accounts seeded successfully',
      });
    } catch (error: any) {
      console.error('Error seeding default accounts:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to seed default accounts',
      });
    }
  }
);

export default router;
