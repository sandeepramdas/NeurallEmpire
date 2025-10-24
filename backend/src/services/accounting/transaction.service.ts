/**
 * Transaction Service
 * Manages accounting transactions with double-entry bookkeeping
 * Handles transaction creation, updates, posting, and voiding
 */

import { prisma } from '@/server';
import { Transaction, JournalEntry, TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '@/infrastructure/logger';

interface CreateTransactionDTO {
  transactionType: TransactionType;
  transactionDate: Date;
  reference?: string;
  description: string;
  memo?: string;
  customerId?: string;
  vendorId?: string;
  journalEntries: CreateJournalEntryDTO[];
  attachments?: string[];
  metadata?: any;
}

interface CreateJournalEntryDTO {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  metadata?: any;
}

interface UpdateTransactionDTO {
  transactionDate?: Date;
  reference?: string;
  description?: string;
  memo?: string;
  customerId?: string;
  vendorId?: string;
  journalEntries?: CreateJournalEntryDTO[];
  metadata?: any;
}

interface TransactionWithEntries extends Transaction {
  journalEntries: JournalEntry[];
}

interface TransactionSummary {
  totalTransactions: number;
  totalDebit: number;
  totalCredit: number;
  byType: Record<TransactionType, number>;
  byStatus: Record<TransactionStatus, number>;
}

class TransactionService {
  /**
   * Create a new transaction with journal entries
   */
  async createTransaction(
    companyId: string,
    data: CreateTransactionDTO,
    createdBy: string
  ): Promise<TransactionWithEntries> {
    try {
      // Validate journal entries balance
      this.validateJournalEntriesBalance(data.journalEntries);

      // Verify all accounts exist and belong to company
      await this.validateAccounts(companyId, data.journalEntries);

      // Verify customer/vendor if provided
      if (data.customerId) {
        await this.validateCustomer(companyId, data.customerId);
      }
      if (data.vendorId) {
        await this.validateVendor(companyId, data.vendorId);
      }

      // Generate transaction number
      const transactionNumber = await this.generateTransactionNumber(companyId);

      // Create transaction with journal entries in a transaction
      const transaction = await prisma.$transaction(async (tx) => {
        // Create transaction
        const txn = await tx.transaction.create({
          data: {
            companyId,
            transactionNumber,
            transactionType: data.transactionType,
            transactionDate: data.transactionDate,
            reference: data.reference,
            description: data.description,
            memo: data.memo,
            customerId: data.customerId,
            vendorId: data.vendorId,
            status: 'DRAFT',
            createdBy,
            totalDebit: new Decimal(0),
            totalCredit: new Decimal(0),
            attachments: data.attachments || [],
            metadata: data.metadata || {},
          },
        });

        // Create journal entries
        const journalEntries = await Promise.all(
          data.journalEntries.map((entry, index) =>
            tx.journalEntry.create({
              data: {
                transaction: { connect: { id: txn.id } },
                account: { connect: { id: entry.accountId } },
                lineNumber: index + 1,
                debit: new Decimal(entry.debit),
                credit: new Decimal(entry.credit),
                description: entry.description || data.description,
                metadata: entry.metadata || {},
              },
            })
          )
        );

        return { ...txn, journalEntries };
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_TRANSACTION',
          resourceType: 'TRANSACTION',
          resourceId: transaction.id,
          userId: createdBy,
          companyId,
          newValues: {
            transactionType: transaction.transactionType,
            reference: transaction.reference,
            amount: this.calculateTransactionAmount(data.journalEntries),
          },
        },
      });

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update a transaction (only in DRAFT status)
   */
  async updateTransaction(
    transactionId: string,
    companyId: string,
    data: UpdateTransactionDTO,
    updatedBy: string
  ): Promise<TransactionWithEntries> {
    try {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          companyId,
        },
        include: {
          journalEntries: true,
        },
      });

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      if (existingTransaction.status !== 'DRAFT') {
        throw new Error('Only draft transactions can be updated');
      }

      // Validate journal entries if provided
      if (data.journalEntries) {
        this.validateJournalEntriesBalance(data.journalEntries);
        await this.validateAccounts(companyId, data.journalEntries);
      }

      const transaction = await prisma.$transaction(async (tx) => {
        // Build update data
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (data.transactionDate !== undefined) updateData.transactionDate = data.transactionDate;
        if (data.reference !== undefined) updateData.reference = data.reference;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.memo !== undefined) updateData.memo = data.memo;
        if (data.customerId !== undefined) updateData.customerId = data.customerId;
        if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
        if (data.metadata !== undefined) updateData.metadata = data.metadata;

        // Update transaction
        const txn = await tx.transaction.update({
          where: { id: transactionId },
          data: updateData,
        });

        let journalEntries = existingTransaction.journalEntries;

        // If journal entries provided, replace them
        if (data.journalEntries) {
          // Delete existing entries
          await tx.journalEntry.deleteMany({
            where: { transactionId },
          });

          // Create new entries
          journalEntries = await Promise.all(
            data.journalEntries.map((entry, index) =>
              tx.journalEntry.create({
                data: {
                  transaction: { connect: { id: transactionId } },
                  account: { connect: { id: entry.accountId } },
                  lineNumber: index + 1,
                  debit: new Decimal(entry.debit),
                  credit: new Decimal(entry.credit),
                  description: entry.description || data.description || txn.description,
                  metadata: entry.metadata || {},
                },
              })
            )
          );
        }

        return { ...txn, journalEntries };
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_TRANSACTION',
          resourceType: 'TRANSACTION',
          resourceId: transactionId,
          userId: updatedBy,
          companyId,
          oldValues: {
            description: existingTransaction.description,
          },
          newValues: {
            description: transaction.description,
          },
        },
      });

      return transaction;
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Post a transaction (finalize and update account balances)
   */
  async postTransaction(
    transactionId: string,
    companyId: string,
    postedBy: string
  ): Promise<Transaction> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          companyId,
        },
        include: {
          journalEntries: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'POSTED') {
        throw new Error('Transaction is already posted');
      }

      if (transaction.status === 'VOID') {
        throw new Error('Cannot post a voided transaction');
      }

      // Post transaction and update account balances
      const result = await prisma.$transaction(async (tx) => {
        // Update transaction status
        const postedTxn = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'POSTED',
            postedAt: new Date(),
            postedBy,
          },
        });

        // Update account balances
        for (const entry of transaction.journalEntries) {
          await tx.account.update({
            where: { id: entry.accountId },
            data: {
              debitBalance: {
                increment: entry.debit,
              },
              creditBalance: {
                increment: entry.credit,
              },
            },
          });
        }

        return postedTxn;
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'POST_TRANSACTION',
          resourceType: 'TRANSACTION',
          resourceId: transactionId,
          userId: postedBy,
          companyId,
          oldValues: { status: 'DRAFT' },
          newValues: { status: 'POSTED' },
        },
      });

      return result;
    } catch (error) {
      logger.error('Error posting transaction:', error);
      throw error;
    }
  }

  /**
   * Void a transaction (reverse journal entries)
   */
  async voidTransaction(
    transactionId: string,
    companyId: string,
    voidedBy: string,
    reason?: string
  ): Promise<Transaction> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          companyId,
        },
        include: {
          journalEntries: true,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'VOID') {
        throw new Error('Transaction is already voided');
      }

      if (transaction.status === 'DRAFT') {
        // Just mark as void for draft transactions
        const voidedTxn = await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'VOID',
            isReversed: true,
            reversedBy: voidedBy,
            metadata: {
              ...((transaction.metadata as any) || {}),
              voidReason: reason,
            },
          },
        });

        await prisma.auditLog.create({
          data: {
            action: 'VOID_TRANSACTION',
            resourceType: 'TRANSACTION',
            resourceId: transactionId,
            userId: voidedBy,
            companyId,
            newValues: { status: 'VOID', reason },
          },
        });

        return voidedTxn;
      }

      // For posted transactions, reverse the journal entries
      const result = await prisma.$transaction(async (tx) => {
        // Mark transaction as void
        const voidedTxn = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'VOID',
            isReversed: true,
            reversedBy: voidedBy,
            metadata: {
              ...((transaction.metadata as any) || {}),
              voidReason: reason,
            },
          },
        });

        // Reverse account balances
        for (const entry of transaction.journalEntries) {
          await tx.account.update({
            where: { id: entry.accountId },
            data: {
              debitBalance: {
                decrement: entry.debit,
              },
              creditBalance: {
                decrement: entry.credit,
              },
            },
          });
        }

        return voidedTxn;
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'VOID_TRANSACTION',
          resourceType: 'TRANSACTION',
          resourceId: transactionId,
          userId: voidedBy,
          companyId,
          oldValues: { status: transaction.status },
          newValues: { status: 'VOID', reason },
        },
      });

      return result;
    } catch (error) {
      logger.error('Error voiding transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a transaction (only drafts)
   */
  async deleteTransaction(
    transactionId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          companyId,
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'DRAFT') {
        throw new Error('Only draft transactions can be deleted. Use void for posted transactions.');
      }

      await prisma.$transaction(async (tx) => {
        // Delete journal entries
        await tx.journalEntry.deleteMany({
          where: { transactionId },
        });

        // Delete transaction
        await tx.transaction.delete({
          where: { id: transactionId },
        });
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_TRANSACTION',
          resourceType: 'TRANSACTION',
          resourceId: transactionId,
          userId: deletedBy,
          companyId,
          oldValues: {
            description: transaction.description,
            reference: transaction.reference,
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(
    transactionId: string,
    companyId: string
  ): Promise<TransactionWithEntries | null> {
    try {
      return await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          companyId,
        },
        include: {
          journalEntries: {
            include: {
              account: true,
            },
          },
          customer: true,
          vendor: true,
        },
      });
    } catch (error) {
      logger.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get transactions for a company
   */
  async getTransactions(
    companyId: string,
    options?: {
      transactionType?: TransactionType;
      status?: TransactionStatus;
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
      vendorId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<TransactionWithEntries[]> {
    try {
      const where: any = { companyId };

      if (options?.transactionType) {
        where.transactionType = options.transactionType;
      }

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.startDate || options?.endDate) {
        where.transactionDate = {};
        if (options.startDate) {
          where.transactionDate.gte = options.startDate;
        }
        if (options.endDate) {
          where.transactionDate.lte = options.endDate;
        }
      }

      if (options?.customerId) {
        where.customerId = options.customerId;
      }

      if (options?.vendorId) {
        where.vendorId = options.vendorId;
      }

      return await prisma.transaction.findMany({
        where,
        include: {
          journalEntries: {
            include: {
              account: true,
            },
          },
          customer: true,
          vendor: true,
        },
        orderBy: {
          transactionDate: 'desc',
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });
    } catch (error) {
      logger.error('Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Get transactions for a specific account
   */
  async getAccountTransactions(
    accountId: string,
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      status?: TransactionStatus;
    }
  ): Promise<TransactionWithEntries[]> {
    try {
      // First get journal entries for this account
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          accountId,
          transaction: {
            companyId,
            status: options?.status || 'POSTED',
            ...(options?.startDate || options?.endDate
              ? {
                  transactionDate: {
                    ...(options.startDate ? { gte: options.startDate } : {}),
                    ...(options.endDate ? { lte: options.endDate } : {}),
                  },
                }
              : {}),
          },
        },
        include: {
          transaction: {
            include: {
              journalEntries: {
                include: {
                  account: true,
                },
              },
              customer: true,
              vendor: true,
            },
          },
        },
        orderBy: {
          transaction: {
            transactionDate: 'desc',
          },
        },
      });

      // Extract unique transactions
      const transactionMap = new Map<string, TransactionWithEntries>();
      journalEntries.forEach(entry => {
        if (!transactionMap.has(entry.transaction.id)) {
          transactionMap.set(entry.transaction.id, entry.transaction as any);
        }
      });

      return Array.from(transactionMap.values());
    } catch (error) {
      logger.error('Error getting account transactions:', error);
      return [];
    }
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionSummary> {
    try {
      const where: any = { companyId, status: 'POSTED' };

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          journalEntries: true,
        },
      });

      let totalDebit = 0;
      let totalCredit = 0;
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      transactions.forEach(txn => {
        // Count by type
        byType[txn.transactionType] = (byType[txn.transactionType] || 0) + 1;

        // Count by status
        byStatus[txn.status] = (byStatus[txn.status] || 0) + 1;

        // Sum debits and credits
        txn.journalEntries.forEach(entry => {
          totalDebit += (entry.debit as Decimal).toNumber();
          totalCredit += (entry.credit as Decimal).toNumber();
        });
      });

      return {
        totalTransactions: transactions.length,
        totalDebit,
        totalCredit,
        byType: byType as Record<TransactionType, number>,
        byStatus: byStatus as Record<TransactionStatus, number>,
      };
    } catch (error) {
      logger.error('Error getting transaction summary:', error);
      return {
        totalTransactions: 0,
        totalDebit: 0,
        totalCredit: 0,
        byType: {} as Record<TransactionType, number>,
        byStatus: {} as Record<TransactionStatus, number>,
      };
    }
  }

  /**
   * Search transactions
   */
  async searchTransactions(
    companyId: string,
    query: string,
    limit = 20
  ): Promise<TransactionWithEntries[]> {
    try {
      return await prisma.transaction.findMany({
        where: {
          companyId,
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { memo: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          journalEntries: {
            include: {
              account: true,
            },
          },
          customer: true,
          vendor: true,
        },
        orderBy: {
          transactionDate: 'desc',
        },
        take: limit,
      }) as any;
    } catch (error) {
      logger.error('Error searching transactions:', error);
      return [];
    }
  }

  /**
   * Validate journal entries balance (debits must equal credits)
   */
  private validateJournalEntriesBalance(entries: CreateJournalEntryDTO[]): void {
    if (entries.length === 0) {
      throw new Error('At least one journal entry is required');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      if (entry.debit < 0 || entry.credit < 0) {
        throw new Error('Debit and credit amounts must be non-negative');
      }

      if (entry.debit > 0 && entry.credit > 0) {
        throw new Error('Journal entry cannot have both debit and credit');
      }

      if (entry.debit === 0 && entry.credit === 0) {
        throw new Error('Journal entry must have either debit or credit');
      }

      totalDebit += entry.debit;
      totalCredit += entry.credit;
    });

    // Check if debits equal credits (with floating point tolerance)
    const tolerance = 0.01;
    if (Math.abs(totalDebit - totalCredit) > tolerance) {
      throw new Error(
        `Journal entries are not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`
      );
    }
  }

  /**
   * Validate that all accounts exist and belong to company
   */
  private async validateAccounts(
    companyId: string,
    entries: CreateJournalEntryDTO[]
  ): Promise<void> {
    const accountIds = [...new Set(entries.map(e => e.accountId))];

    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        isActive: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new Error('One or more accounts not found or inactive');
    }

    // System accounts cannot have manual entries
    const systemAccounts = accounts.filter(acc => acc.isSystemAccount);
    const systemAccountIds = entries
      .filter(e => systemAccounts.some(acc => acc.id === e.accountId))
      .map(e => e.accountId);

    if (systemAccountIds.length > 0) {
      const account = systemAccounts.find(acc => systemAccountIds.includes(acc.id));
      throw new Error(
        `Account "${account?.accountName}" (${account?.accountCode}) is a system account and does not allow manual entries`
      );
    }
  }

  /**
   * Validate customer
   */
  private async validateCustomer(companyId: string, customerId: string): Promise<void> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }
  }

  /**
   * Validate vendor
   */
  private async validateVendor(companyId: string, vendorId: string): Promise<void> {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }
  }

  /**
   * Calculate transaction amount (sum of debits or credits)
   */
  private calculateTransactionAmount(entries: CreateJournalEntryDTO[]): number {
    return entries.reduce((sum, entry) => sum + entry.debit + entry.credit, 0) / 2;
  }

  /**
   * Generate unique transaction number
   */
  private async generateTransactionNumber(companyId: string): Promise<string> {
    try {
      // Get the highest transaction number for this company
      const lastTransaction = await prisma.transaction.findFirst({
        where: { companyId },
        orderBy: { transactionNumber: 'desc' },
        select: { transactionNumber: true },
      });

      if (!lastTransaction) {
        return 'TXN-0001';
      }

      // Extract number from format TXN-XXXX
      const match = lastTransaction.transactionNumber.match(/TXN-(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        return `TXN-${nextNumber.toString().padStart(4, '0')}`;
      }

      // Fallback if format doesn't match
      const count = await prisma.transaction.count({ where: { companyId } });
      return `TXN-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating transaction number:', error);
      return `TXN-${Date.now()}`;
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
export default transactionService;
