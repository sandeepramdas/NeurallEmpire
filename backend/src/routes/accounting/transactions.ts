/**
 * Transaction Routes
 * API endpoints for managing accounting transactions
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';
import { requireCompanyContext, requireActiveCompany } from '@/middleware/company-context';
import { transactionService } from '@/services/accounting/transaction.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { logger } from '@/infrastructure/logger';

const router = Router();

// Apply common middleware to all routes
router.use(authenticate);
router.use(requireCompanyContext);
router.use(requireActiveCompany);

/**
 * GET /api/accounting/transactions
 * Get all transactions for company
 */
router.get(
  '/',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionType, status, startDate, endDate, customerId, vendorId, limit, offset } = req.query;

      const transactions = await transactionService.getTransactions(req.companyId!, {
        transactionType: transactionType as TransactionType,
        status: status as TransactionStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        customerId: customerId as string,
        vendorId: vendorId as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Error fetching transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transactions',
      });
    }
  }
);

/**
 * GET /api/accounting/transactions/:transactionId
 * Get transaction by ID
 */
router.get(
  '/:transactionId',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionId } = req.params;

      const transaction = await transactionService.getTransaction(transactionId, req.companyId!);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error: any) {
      logger.error('Error fetching transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction',
      });
    }
  }
);

/**
 * GET /api/accounting/transactions/account/:accountId
 * Get transactions for a specific account
 */
router.get(
  '/account/:accountId',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { accountId } = req.params;
      const { startDate, endDate, status } = req.query;

      const transactions = await transactionService.getAccountTransactions(
        accountId,
        req.companyId!,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          status: status as TransactionStatus,
        }
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Error fetching account transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch account transactions',
      });
    }
  }
);

/**
 * GET /api/accounting/transactions/summary
 * Get transaction summary
 */
router.get(
  '/summary',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const summary = await transactionService.getTransactionSummary(
        req.companyId!,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Error fetching transaction summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction summary',
      });
    }
  }
);

/**
 * GET /api/accounting/transactions/search
 * Search transactions
 */
router.get(
  '/search',
  requirePermission('accounting:read:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      const transactions = await transactionService.searchTransactions(
        req.companyId!,
        q,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Error searching transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search transactions',
      });
    }
  }
);

/**
 * POST /api/accounting/transactions
 * Create a new transaction
 */
router.post(
  '/',
  requirePermission('accounting:create:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        transactionType,
        transactionDate,
        reference,
        description,
        memo,
        customerId,
        vendorId,
        journalEntries,
        attachments,
        metadata,
      } = req.body;

      if (!transactionType || !transactionDate || !description || !journalEntries) {
        return res.status(400).json({
          success: false,
          error: 'transactionType, transactionDate, description, and journalEntries are required',
        });
      }

      if (!Array.isArray(journalEntries) || journalEntries.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'journalEntries must be a non-empty array',
        });
      }

      const transaction = await transactionService.createTransaction(
        req.companyId!,
        {
          transactionType,
          transactionDate: new Date(transactionDate),
          reference,
          description,
          memo,
          customerId,
          vendorId,
          journalEntries,
          attachments,
          metadata,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating transaction:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create transaction',
      });
    }
  }
);

/**
 * PUT /api/accounting/transactions/:transactionId
 * Update a transaction (only drafts)
 */
router.put(
  '/:transactionId',
  requirePermission('accounting:update:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionId } = req.params;
      const updates = req.body;

      const transaction = await transactionService.updateTransaction(
        transactionId,
        req.companyId!,
        updates,
        req.user!.id
      );

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating transaction:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update transaction',
      });
    }
  }
);

/**
 * POST /api/accounting/transactions/:transactionId/post
 * Post a transaction (finalize and update balances)
 */
router.post(
  '/:transactionId/post',
  requirePermission('accounting:post:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionId } = req.params;

      const transaction = await transactionService.postTransaction(
        transactionId,
        req.companyId!,
        req.user!.id
      );

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction posted successfully',
      });
    } catch (error: any) {
      logger.error('Error posting transaction:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to post transaction',
      });
    }
  }
);

/**
 * POST /api/accounting/transactions/:transactionId/void
 * Void a transaction
 */
router.post(
  '/:transactionId/void',
  requirePermission('accounting:void:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      const transaction = await transactionService.voidTransaction(
        transactionId,
        req.companyId!,
        req.user!.id,
        reason
      );

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction voided successfully',
      });
    } catch (error: any) {
      logger.error('Error voiding transaction:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to void transaction',
      });
    }
  }
);

/**
 * DELETE /api/accounting/transactions/:transactionId
 * Delete a transaction (only drafts)
 */
router.delete(
  '/:transactionId',
  requirePermission('accounting:delete:transactions'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transactionId } = req.params;

      await transactionService.deleteTransaction(transactionId, req.companyId!, req.user!.id);

      res.json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting transaction:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete transaction',
      });
    }
  }
);

export default router;
