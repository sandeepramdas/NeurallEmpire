/**
 * Chart of Accounts Service
 * Manages the chart of accounts for multi-company accounting
 * Handles account creation, updates, hierarchies, and account queries
 */

import { prisma } from '@/server';
import { Account, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '@/infrastructure/logger';

interface CreateAccountDTO {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  description?: string;
  parentAccountId?: string;
  accountSubType?: string;
  isActive?: boolean;
  isSystemAccount?: boolean;
  metadata?: any;
}

interface UpdateAccountDTO {
  accountCode?: string;
  accountName?: string;
  description?: string;
  parentAccountId?: string;
  accountSubType?: string;
  isActive?: boolean;
  isSystemAccount?: boolean;
  metadata?: any;
}

interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
}

class ChartOfAccountsService {
  /**
   * Create a new account
   */
  async createAccount(
    companyId: string,
    data: CreateAccountDTO,
    createdBy: string
  ): Promise<Account> {
    try {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Check if account code already exists in this company
      const existingAccount = await prisma.account.findFirst({
        where: {
          companyId,
          accountCode: data.accountCode,
        },
      });

      if (existingAccount) {
        throw new Error('Account code already exists in this company');
      }

      // If parent account specified, validate it
      if (data.parentAccountId) {
        const parent = await prisma.account.findFirst({
          where: {
            id: data.parentAccountId,
            companyId,
          },
        });

        if (!parent) {
          throw new Error('Parent account not found or does not belong to this company');
        }

        // Ensure parent account type matches
        if (parent.accountType !== data.accountType) {
          throw new Error('Parent account type must match child account type');
        }
      }

      // Create account
      const account = await prisma.account.create({
        data: {
          companyId,
          accountCode: data.accountCode,
          accountName: data.accountName,
          accountType: data.accountType,
          accountSubType: data.accountSubType,
          description: data.description,
          parentAccountId: data.parentAccountId,
          isActive: data.isActive ?? true,
          isSystemAccount: data.isSystemAccount ?? false,
          balance: new Decimal(0),
          debitBalance: new Decimal(0),
          creditBalance: new Decimal(0),
          createdBy,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_ACCOUNT',
          resourceType: 'ACCOUNT',
          resourceId: account.id,
          userId: createdBy,
          companyId,
          newValues: {
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
          },
        },
      });

      return account;
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Update an account
   */
  async updateAccount(
    accountId: string,
    companyId: string,
    data: UpdateAccountDTO,
    updatedBy: string
  ): Promise<Account> {
    try {
      const existingAccount = await prisma.account.findFirst({
        where: {
          id: accountId,
          companyId,
        },
      });

      if (!existingAccount) {
        throw new Error('Account not found or does not belong to this company');
      }

      // Check if account code is being changed and if it conflicts
      if (data.accountCode && data.accountCode !== existingAccount.accountCode) {
        const duplicate = await prisma.account.findFirst({
          where: {
            companyId,
            accountCode: data.accountCode,
            id: { not: accountId },
          },
        });

        if (duplicate) {
          throw new Error('Account code already exists in this company');
        }
      }

      // Validate parent if being changed
      if (data.parentAccountId && data.parentAccountId !== existingAccount.parentAccountId) {
        const parent = await prisma.account.findFirst({
          where: {
            id: data.parentAccountId,
            companyId,
          },
        });

        if (!parent) {
          throw new Error('Parent account not found');
        }

        // Prevent circular reference
        if (data.parentAccountId === accountId) {
          throw new Error('Account cannot be its own parent');
        }

        // Check if new parent would create a circular reference
        const wouldCreateCircular = await this.checkCircularReference(
          accountId,
          data.parentAccountId,
          companyId
        );

        if (wouldCreateCircular) {
          throw new Error('This change would create a circular reference');
        }
      }

      const account = await prisma.account.update({
        where: { id: accountId },
        data: {
          accountCode: data.accountCode,
          accountName: data.accountName,
          accountSubType: data.accountSubType,
          description: data.description,
          parentAccountId: data.parentAccountId,
          isActive: data.isActive,
          isSystemAccount: data.isSystemAccount,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_ACCOUNT',
          resourceType: 'ACCOUNT',
          resourceId: accountId,
          userId: updatedBy,
          companyId,
          oldValues: {
            accountCode: existingAccount.accountCode,
            accountName: existingAccount.accountName,
          },
          newValues: {
            accountCode: account.accountCode,
            accountName: account.accountName,
          },
        },
      });

      return account;
    } catch (error) {
      logger.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete an account (soft delete by deactivating)
   */
  async deleteAccount(
    accountId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          id: accountId,
          companyId,
        },
        include: {
          children: true,
          journalEntries: true,
        },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check if account has children
      if (account.children.length > 0) {
        throw new Error('Cannot delete account with child accounts. Delete children first.');
      }

      // Check if account has transactions
      if (account.journalEntries.length > 0) {
        throw new Error('Cannot delete account with existing transactions. Deactivate instead.');
      }

      // Soft delete by deactivating
      await prisma.account.update({
        where: { id: accountId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_ACCOUNT',
          resourceType: 'ACCOUNT',
          resourceId: accountId,
          userId: deletedBy,
          companyId,
          oldValues: {
            accountCode: account.accountCode,
            accountName: account.accountName,
            isActive: true,
          },
          newValues: {
            isActive: false,
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string, companyId: string): Promise<Account | null> {
    try {
      return await prisma.account.findFirst({
        where: {
          id: accountId,
          companyId,
        },
        include: {
          parent: true,
          children: true,
        },
      });
    } catch (error) {
      logger.error('Error getting account:', error);
      return null;
    }
  }

  /**
   * Get account by account code
   */
  async getAccountByCode(
    accountCode: string,
    companyId: string
  ): Promise<Account | null> {
    try {
      return await prisma.account.findFirst({
        where: {
          accountCode,
          companyId,
        },
      });
    } catch (error) {
      logger.error('Error getting account by code:', error);
      return null;
    }
  }

  /**
   * Get all accounts for a company
   */
  async getAccounts(
    companyId: string,
    options?: {
      accountType?: AccountType;
      isActive?: boolean;
      includeInactive?: boolean;
    }
  ): Promise<Account[]> {
    try {
      const where: any = { companyId };

      if (options?.accountType) {
        where.accountType = options.accountType;
      }

      if (options?.isActive !== undefined) {
        where.isActive = options.isActive;
      } else if (!options?.includeInactive) {
        where.isActive = true;
      }

      return await prisma.account.findMany({
        where,
        orderBy: [
          { accountCode: 'asc' },
        ],
        include: {
          parent: true,
        },
      });
    } catch (error) {
      logger.error('Error getting accounts:', error);
      return [];
    }
  }

  /**
   * Get accounts by type
   */
  async getAccountsByType(
    companyId: string,
    accountType: AccountType
  ): Promise<Account[]> {
    return this.getAccounts(companyId, { accountType, isActive: true });
  }

  /**
   * Get chart of accounts as hierarchical tree
   */
  async getAccountTree(companyId: string): Promise<AccountTreeNode[]> {
    try {
      const accounts = await this.getAccounts(companyId, { includeInactive: false });

      // Build tree structure
      const accountMap = new Map<string, AccountTreeNode>();
      const rootAccounts: AccountTreeNode[] = [];

      // First pass: create map
      accounts.forEach(account => {
        accountMap.set(account.id, { ...account, children: [] });
      });

      // Second pass: build hierarchy
      accounts.forEach(account => {
        const node = accountMap.get(account.id)!;

        if (account.parentAccountId) {
          const parent = accountMap.get(account.parentAccountId);
          if (parent) {
            parent.children!.push(node);
          } else {
            // Parent not found, treat as root
            rootAccounts.push(node);
          }
        } else {
          rootAccounts.push(node);
        }
      });

      // Sort by account code at each level
      const sortChildren = (nodes: AccountTreeNode[]) => {
        nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            sortChildren(node.children);
          }
        });
      };

      sortChildren(rootAccounts);

      return rootAccounts;
    } catch (error) {
      logger.error('Error getting account tree:', error);
      return [];
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string, companyId: string): Promise<AccountBalance | null> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          id: accountId,
          companyId,
        },
      });

      if (!account) {
        return null;
      }

      // Calculate net balance based on account type
      let netBalance = 0;
      const debitBal = account.debitBalance.toNumber();
      const creditBal = account.creditBalance.toNumber();

      // For normal debit accounts (Assets, Expenses)
      if (
        account.accountType === 'ASSET' ||
        account.accountType === 'EXPENSE'
      ) {
        netBalance = debitBal - creditBal;
      }
      // For normal credit accounts (Liabilities, Equity, Revenue)
      else if (
        account.accountType === 'LIABILITY' ||
        account.accountType === 'EQUITY' ||
        account.accountType === 'REVENUE'
      ) {
        netBalance = creditBal - debitBal;
      }

      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debitBalance: debitBal,
        creditBalance: creditBal,
        netBalance,
      };
    } catch (error) {
      logger.error('Error getting account balance:', error);
      return null;
    }
  }

  /**
   * Get balances for all accounts of a specific type
   */
  async getAccountBalancesByType(
    companyId: string,
    accountType: AccountType
  ): Promise<AccountBalance[]> {
    try {
      const accounts = await this.getAccountsByType(companyId, accountType);

      const balances = await Promise.all(
        accounts.map(account => this.getAccountBalance(account.id, companyId))
      );

      return balances.filter(balance => balance !== null) as AccountBalance[];
    } catch (error) {
      logger.error('Error getting account balances by type:', error);
      return [];
    }
  }

  /**
   * Search accounts
   */
  async searchAccounts(
    companyId: string,
    query: string,
    limit = 20
  ): Promise<Account[]> {
    try {
      return await prisma.account.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { accountCode: { contains: query, mode: 'insensitive' } },
            { accountName: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: [
          { accountCode: 'asc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Error searching accounts:', error);
      return [];
    }
  }

  /**
   * Get account hierarchy path (breadcrumb)
   */
  async getAccountPath(accountId: string, companyId: string): Promise<Account[]> {
    try {
      const account = await this.getAccount(accountId, companyId);

      if (!account) {
        return [];
      }

      const path: Account[] = [account];

      let currentParentId = account.parentAccountId;
      while (currentParentId) {
        const parent = await prisma.account.findFirst({
          where: {
            id: currentParentId,
            companyId,
          },
        });

        if (parent) {
          path.unshift(parent);
          currentParentId = parent.parentAccountId;
        } else {
          break;
        }
      }

      return path;
    } catch (error) {
      logger.error('Error getting account path:', error);
      return [];
    }
  }

  /**
   * Seed default chart of accounts for a company
   */
  async seedDefaultAccounts(companyId: string, createdBy: string): Promise<Account[]> {
    try {
      const defaultAccounts = this.getDefaultAccountStructure();
      const createdAccounts: Account[] = [];
      const accountIdMap = new Map<string, string>();

      // Create accounts in order (parents first)
      for (const accountData of defaultAccounts) {
        const parentAccountId = accountData.parentKey
          ? accountIdMap.get(accountData.parentKey)
          : undefined;

        const account = await this.createAccount(
          companyId,
          {
            accountCode: accountData.accountCode,
            accountName: accountData.accountName,
            accountType: accountData.accountType,
            description: accountData.description,
            parentAccountId,
            isSystemAccount: accountData.isSystemAccount,
          },
          createdBy
        );

        createdAccounts.push(account);
        accountIdMap.set(accountData.key, account.id);
      }

      logger.info(`✅ Seeded ${createdAccounts.length} default accounts for company ${companyId}`);
      return createdAccounts;
    } catch (error) {
      logger.error('Error seeding default accounts:', error);
      throw error;
    }
  }

  /**
   * Check if changing parent would create circular reference
   */
  private async checkCircularReference(
    accountId: string,
    newParentId: string,
    companyId: string
  ): Promise<boolean> {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === accountId) {
        return true; // Circular reference detected
      }

      const parent = await prisma.account.findFirst({
        where: {
          id: currentId,
          companyId,
        },
        select: { parentAccountId: true },
      });

      currentId = parent?.parentAccountId || null;
    }

    return false;
  }

  /**
   * Get default account structure for seeding
   */
  private getDefaultAccountStructure() {
    return [
      // Assets
      { key: 'ASSETS', accountCode: '1000', accountName: 'Assets', accountType: 'ASSET' as AccountType, parentKey: undefined, isSystemAccount: false },
      { key: 'CURRENT_ASSETS', accountCode: '1100', accountName: 'Current Assets', accountType: 'ASSET' as AccountType, parentKey: 'ASSETS', isSystemAccount: false },
      { key: 'CASH', accountCode: '1110', accountName: 'Cash', accountType: 'ASSET' as AccountType, parentKey: 'CURRENT_ASSETS', description: 'Cash on hand and in banks', isSystemAccount: true },
      { key: 'CHECKING', accountCode: '1120', accountName: 'Checking Account', accountType: 'ASSET' as AccountType, parentKey: 'CURRENT_ASSETS', isSystemAccount: true },
      { key: 'SAVINGS', accountCode: '1130', accountName: 'Savings Account', accountType: 'ASSET' as AccountType, parentKey: 'CURRENT_ASSETS', isSystemAccount: true },
      { key: 'AR', accountCode: '1200', accountName: 'Accounts Receivable', accountType: 'ASSET' as AccountType, parentKey: 'CURRENT_ASSETS', description: 'Money owed by customers', isSystemAccount: false },
      { key: 'INVENTORY', accountCode: '1300', accountName: 'Inventory', accountType: 'ASSET' as AccountType, parentKey: 'CURRENT_ASSETS', description: 'Goods for sale', isSystemAccount: false },

      { key: 'FIXED_ASSETS', accountCode: '1500', accountName: 'Fixed Assets', accountType: 'ASSET' as AccountType, parentKey: 'ASSETS', isSystemAccount: false },
      { key: 'EQUIPMENT', accountCode: '1510', accountName: 'Equipment', accountType: 'ASSET' as AccountType, parentKey: 'FIXED_ASSETS', isSystemAccount: false },
      { key: 'ACCUMULATED_DEPRECIATION', accountCode: '1520', accountName: 'Accumulated Depreciation', accountType: 'ASSET' as AccountType, parentKey: 'FIXED_ASSETS', description: 'Contra asset account', isSystemAccount: false },

      // Liabilities
      { key: 'LIABILITIES', accountCode: '2000', accountName: 'Liabilities', accountType: 'LIABILITY' as AccountType, parentKey: undefined, isSystemAccount: false },
      { key: 'CURRENT_LIABILITIES', accountCode: '2100', accountName: 'Current Liabilities', accountType: 'LIABILITY' as AccountType, parentKey: 'LIABILITIES', isSystemAccount: false },
      { key: 'AP', accountCode: '2110', accountName: 'Accounts Payable', accountType: 'LIABILITY' as AccountType, parentKey: 'CURRENT_LIABILITIES', description: 'Money owed to vendors', isSystemAccount: false },
      { key: 'CREDIT_CARD', accountCode: '2120', accountName: 'Credit Card', accountType: 'LIABILITY' as AccountType, parentKey: 'CURRENT_LIABILITIES', isSystemAccount: false },
      { key: 'SALES_TAX', accountCode: '2130', accountName: 'Sales Tax Payable', accountType: 'LIABILITY' as AccountType, parentKey: 'CURRENT_LIABILITIES', isSystemAccount: false },

      { key: 'LONG_TERM_LIABILITIES', accountCode: '2500', accountName: 'Long-term Liabilities', accountType: 'LIABILITY' as AccountType, parentKey: 'LIABILITIES', isSystemAccount: false },
      { key: 'LOANS', accountCode: '2510', accountName: 'Loans Payable', accountType: 'LIABILITY' as AccountType, parentKey: 'LONG_TERM_LIABILITIES', isSystemAccount: false },

      // Equity
      { key: 'EQUITY', accountCode: '3000', accountName: 'Equity', accountType: 'EQUITY' as AccountType, parentKey: undefined, isSystemAccount: false },
      { key: 'OWNERS_EQUITY', accountCode: '3100', accountName: "Owner's Equity", accountType: 'EQUITY' as AccountType, parentKey: 'EQUITY', isSystemAccount: false },
      { key: 'RETAINED_EARNINGS', accountCode: '3200', accountName: 'Retained Earnings', accountType: 'EQUITY' as AccountType, parentKey: 'EQUITY', description: 'Accumulated profits', isSystemAccount: false },

      // Revenue
      { key: 'REVENUE', accountCode: '4000', accountName: 'Revenue', accountType: 'REVENUE' as AccountType, parentKey: undefined, isSystemAccount: false },
      { key: 'SALES_REVENUE', accountCode: '4100', accountName: 'Sales Revenue', accountType: 'REVENUE' as AccountType, parentKey: 'REVENUE', description: 'Income from product sales', isSystemAccount: false },
      { key: 'SERVICE_REVENUE', accountCode: '4200', accountName: 'Service Revenue', accountType: 'REVENUE' as AccountType, parentKey: 'REVENUE', description: 'Income from services', isSystemAccount: false },

      // Expenses
      { key: 'EXPENSES', accountCode: '5000', accountName: 'Expenses', accountType: 'EXPENSE' as AccountType, parentKey: undefined, isSystemAccount: false },
      { key: 'COGS', accountCode: '5100', accountName: 'Cost of Goods Sold', accountType: 'EXPENSE' as AccountType, parentKey: 'EXPENSES', description: 'Direct costs of products sold', isSystemAccount: false },
      { key: 'OPERATING_EXPENSES', accountCode: '5200', accountName: 'Operating Expenses', accountType: 'EXPENSE' as AccountType, parentKey: 'EXPENSES', isSystemAccount: false },
      { key: 'SALARIES', accountCode: '5210', accountName: 'Salaries & Wages', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
      { key: 'RENT', accountCode: '5220', accountName: 'Rent Expense', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
      { key: 'UTILITIES', accountCode: '5230', accountName: 'Utilities', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
      { key: 'OFFICE_SUPPLIES', accountCode: '5240', accountName: 'Office Supplies', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
      { key: 'INSURANCE', accountCode: '5250', accountName: 'Insurance', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
      { key: 'DEPRECIATION', accountCode: '5260', accountName: 'Depreciation Expense', accountType: 'EXPENSE' as AccountType, parentKey: 'OPERATING_EXPENSES', isSystemAccount: false },
    ];
  }
}

// Export singleton instance
export const chartOfAccountsService = new ChartOfAccountsService();
export default chartOfAccountsService;
