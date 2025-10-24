/**
 * Customer Service
 * Manages customer records for accounts receivable
 * Handles customer CRUD operations and customer-related queries
 */

import { prisma } from '@/server';
import { Customer } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '@/infrastructure/logger';

interface CreateCustomerDTO {
  customerNumber?: string;
  displayName?: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: AddressDTO;
  shippingAddress?: AddressDTO;
  taxId?: string;
  creditLimit?: number;
  paymentTerms?: string;
  notes?: string;
  metadata?: any;
}

interface UpdateCustomerDTO {
  customerNumber?: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  billingAddress?: AddressDTO;
  shippingAddress?: AddressDTO;
  taxId?: string;
  creditLimit?: number;
  paymentTerms?: string;
  isActive?: boolean;
  notes?: string;
  metadata?: any;
}

interface AddressDTO {
  [key: string]: any;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface CustomerBalance {
  customerId: string;
  customerName: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  currency: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  totalReceivables: number;
}

class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(
    companyId: string,
    data: CreateCustomerDTO,
    createdBy: string
  ): Promise<Customer> {
    try {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Generate customer number if not provided
      let customerNumber = data.customerNumber;
      if (!customerNumber) {
        customerNumber = await this.generateCustomerNumber(companyId);
      } else {
        // Check if customer number already exists
        const existing = await prisma.customer.findFirst({
          where: {
            companyId,
            customerNumber,
          },
        });

        if (existing) {
          throw new Error('Customer number already exists');
        }
      }

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          companyId,
          customerNumber,
          displayName: data.displayName,
          name: data.name,
          email: data.email,
          phone: data.phone,
          billingAddress: data.billingAddress || {},
          shippingAddress: data.shippingAddress || data.billingAddress || {},
          taxId: data.taxId,
          creditLimit: new Decimal(data.creditLimit || 0),
          paymentTerms: data.paymentTerms,
          balance: new Decimal(0),
          status: 'ACTIVE',
          notes: data.notes,
          metadata: data.metadata || {},
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_CUSTOMER',
          resourceType: 'CUSTOMER',
          resourceId: customer.id,
          userId: createdBy,
          companyId,
          newValues: {
            customerNumber: customer.customerNumber,
            name: customer.name,
            email: customer.email,
          },
        },
      });

      return customer;
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    companyId: string,
    data: UpdateCustomerDTO,
    updatedBy: string
  ): Promise<Customer> {
    try {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
      });

      if (!existingCustomer) {
        throw new Error('Customer not found');
      }

      // Check customer number uniqueness if being changed
      if (data.customerNumber && data.customerNumber !== existingCustomer.customerNumber) {
        const duplicate = await prisma.customer.findFirst({
          where: {
            companyId,
            customerNumber: data.customerNumber,
            id: { not: customerId },
          },
        });

        if (duplicate) {
          throw new Error('Customer number already exists');
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.customerNumber !== undefined) updateData.customerNumber = data.customerNumber;
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
      if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
      if (data.taxId !== undefined) updateData.taxId = data.taxId;
      if (data.creditLimit !== undefined) updateData.creditLimit = new Decimal(data.creditLimit);
      if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
      if (data.isActive !== undefined) updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_CUSTOMER',
          resourceType: 'CUSTOMER',
          resourceId: customerId,
          userId: updatedBy,
          companyId,
          oldValues: {
            name: existingCustomer.name,
            email: existingCustomer.email,
          },
          newValues: {
            name: customer.name,
            email: customer.email,
          },
        },
      });

      return customer;
    } catch (error) {
      logger.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete a customer (soft delete)
   */
  async deleteCustomer(
    customerId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
        include: {
          transactions: true,
        },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check if customer has transactions
      if (customer.transactions.length > 0) {
        throw new Error('Cannot delete customer with existing transactions. Deactivate instead.');
      }

      // Soft delete by deactivating
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_CUSTOMER',
          resourceType: 'CUSTOMER',
          resourceId: customerId,
          userId: deletedBy,
          companyId,
          oldValues: {
            customerNumber: customer.customerNumber,
            name: customer.name,
            status: 'ACTIVE',
          },
          newValues: {
            status: 'INACTIVE',
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string, companyId: string): Promise<Customer | null> {
    try {
      return await prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
      });
    } catch (error) {
      logger.error('Error getting customer:', error);
      return null;
    }
  }

  /**
   * Get customer by customer number
   */
  async getCustomerByNumber(
    customerNumber: string,
    companyId: string
  ): Promise<Customer | null> {
    try {
      return await prisma.customer.findFirst({
        where: {
          customerNumber,
          companyId,
        },
      });
    } catch (error) {
      logger.error('Error getting customer by number:', error);
      return null;
    }
  }

  /**
   * Get all customers for a company
   */
  async getCustomers(
    companyId: string,
    options?: {
      isActive?: boolean;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Customer[]> {
    try {
      const where: any = { companyId };

      if (options?.isActive !== undefined) {
        where.status = options.isActive ? 'ACTIVE' : 'INACTIVE';
      } else if (!options?.includeInactive) {
        where.status = 'ACTIVE';
      }

      return await prisma.customer.findMany({
        where,
        orderBy: [
          { customerNumber: 'asc' },
        ],
        take: options?.limit || 100,
        skip: options?.offset || 0,
      });
    } catch (error) {
      logger.error('Error getting customers:', error);
      return [];
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(
    companyId: string,
    query: string,
    limit = 20
  ): Promise<Customer[]> {
    try {
      return await prisma.customer.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          OR: [
            { customerNumber: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: [
          { customerNumber: 'asc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Error searching customers:', error);
      return [];
    }
  }

  /**
   * Get customer balance
   */
  async getCustomerBalance(
    customerId: string,
    companyId: string
  ): Promise<CustomerBalance | null> {
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
        include: {
          company: true,
        },
      });

      if (!customer) {
        return null;
      }

      // In a real implementation, you would calculate this from invoices and payments
      // For now, we'll use the balance field
      return {
        customerId: customer.id,
        customerName: customer.displayName || customer.name,
        totalInvoiced: customer.balance.toNumber(), // Simplified
        totalPaid: 0, // Would calculate from payments
        balance: customer.balance.toNumber(),
        currency: customer.company.currencyCode,
      };
    } catch (error) {
      logger.error('Error getting customer balance:', error);
      return null;
    }
  }

  /**
   * Get customer transactions
   */
  async getCustomerTransactions(
    customerId: string,
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        customerId,
        companyId,
      };

      if (options?.startDate || options?.endDate) {
        where.transactionDate = {};
        if (options.startDate) {
          where.transactionDate.gte = options.startDate;
        }
        if (options.endDate) {
          where.transactionDate.lte = options.endDate;
        }
      }

      return await prisma.transaction.findMany({
        where,
        include: {
          journalEntries: {
            include: {
              account: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });
    } catch (error) {
      logger.error('Error getting customer transactions:', error);
      return [];
    }
  }

  /**
   * Update customer balance
   */
  async updateCustomerBalance(
    customerId: string,
    companyId: string,
    amount: number,
    updatedBy: string
  ): Promise<Customer> {
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance: {
            increment: amount,
          },
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_CUSTOMER_BALANCE',
          resourceType: 'CUSTOMER',
          resourceId: customerId,
          userId: updatedBy,
          companyId,
          oldValues: { balance: customer.balance },
          newValues: { balance: updatedCustomer.balance },
        },
      });

      return updatedCustomer;
    } catch (error) {
      logger.error('Error updating customer balance:', error);
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(companyId: string): Promise<CustomerStats> {
    try {
      const [totalCustomers, activeCustomers, inactiveCustomers] = await Promise.all([
        prisma.customer.count({ where: { companyId } }),
        prisma.customer.count({ where: { companyId, status: 'ACTIVE' } }),
        prisma.customer.count({ where: { companyId, status: 'INACTIVE' } }),
      ]);

      // Calculate total receivables
      const customers = await prisma.customer.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { balance: true },
      });

      const totalReceivables = customers.reduce((sum, c) => sum + c.balance.toNumber(), 0);

      return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        totalReceivables,
      };
    } catch (error) {
      logger.error('Error getting customer stats:', error);
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        inactiveCustomers: 0,
        totalReceivables: 0,
      };
    }
  }

  /**
   * Generate unique customer number
   */
  private async generateCustomerNumber(companyId: string): Promise<string> {
    try {
      // Get the highest customer number for this company
      const lastCustomer = await prisma.customer.findFirst({
        where: { companyId },
        orderBy: { customerNumber: 'desc' },
        select: { customerNumber: true },
      });

      if (!lastCustomer) {
        return 'CUST-0001';
      }

      // Extract number from format CUST-XXXX
      const match = lastCustomer.customerNumber.match(/CUST-(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        return `CUST-${nextNumber.toString().padStart(4, '0')}`;
      }

      // Fallback if format doesn't match
      const count = await prisma.customer.count({ where: { companyId } });
      return `CUST-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating customer number:', error);
      return `CUST-${Date.now()}`;
    }
  }
}

// Export singleton instance
export const customerService = new CustomerService();
export default customerService;
