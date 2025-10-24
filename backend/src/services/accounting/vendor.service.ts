/**
 * Vendor Service
 * Manages vendor records for accounts payable
 * Handles vendor CRUD operations and vendor-related queries
 */

import { prisma } from '@/server';
import { Vendor } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '@/infrastructure/logger';

interface CreateVendorDTO {
  vendorNumber?: string;
  displayName?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: AddressDTO;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  metadata?: any;
}

interface UpdateVendorDTO {
  vendorNumber?: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: AddressDTO;
  taxId?: string;
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

interface VendorBalance {
  vendorId: string;
  vendorName: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  currency: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  totalPayables: number;
}

class VendorService {
  /**
   * Create a new vendor
   */
  async createVendor(
    companyId: string,
    data: CreateVendorDTO,
    createdBy: string
  ): Promise<Vendor> {
    try {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Generate vendor number if not provided
      let vendorNumber = data.vendorNumber;
      if (!vendorNumber) {
        vendorNumber = await this.generateVendorNumber(companyId);
      } else {
        // Check if vendor number already exists
        const existing = await prisma.vendor.findFirst({
          where: {
            companyId,
            vendorNumber,
          },
        });

        if (existing) {
          throw new Error('Vendor number already exists');
        }
      }

      // Create vendor
      const vendor = await prisma.vendor.create({
        data: {
          companyId,
          vendorNumber,
          displayName: data.displayName,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address || {},
          taxId: data.taxId,
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
          action: 'CREATE_VENDOR',
          resourceType: 'VENDOR',
          resourceId: vendor.id,
          userId: createdBy,
          companyId,
          newValues: {
            vendorNumber: vendor.vendorNumber,
            name: vendor.name,
            email: vendor.email,
          },
        },
      });

      return vendor;
    } catch (error) {
      logger.error('Error creating vendor:', error);
      throw error;
    }
  }

  /**
   * Update a vendor
   */
  async updateVendor(
    vendorId: string,
    companyId: string,
    data: UpdateVendorDTO,
    updatedBy: string
  ): Promise<Vendor> {
    try {
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
      });

      if (!existingVendor) {
        throw new Error('Vendor not found');
      }

      // Check vendor number uniqueness if being changed
      if (data.vendorNumber && data.vendorNumber !== existingVendor.vendorNumber) {
        const duplicate = await prisma.vendor.findFirst({
          where: {
            companyId,
            vendorNumber: data.vendorNumber,
            id: { not: vendorId },
          },
        });

        if (duplicate) {
          throw new Error('Vendor number already exists');
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.vendorNumber !== undefined) updateData.vendorNumber = data.vendorNumber;
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.taxId !== undefined) updateData.taxId = data.taxId;
      if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
      if (data.isActive !== undefined) updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: updateData,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_VENDOR',
          resourceType: 'VENDOR',
          resourceId: vendorId,
          userId: updatedBy,
          companyId,
          oldValues: {
            name: existingVendor.name,
            email: existingVendor.email,
          },
          newValues: {
            name: vendor.name,
            email: vendor.email,
          },
        },
      });

      return vendor;
    } catch (error) {
      logger.error('Error updating vendor:', error);
      throw error;
    }
  }

  /**
   * Delete a vendor (soft delete)
   */
  async deleteVendor(
    vendorId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
        include: {
          transactions: true,
        },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Check if vendor has transactions
      if (vendor.transactions.length > 0) {
        throw new Error('Cannot delete vendor with existing transactions. Deactivate instead.');
      }

      // Soft delete by deactivating
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_VENDOR',
          resourceType: 'VENDOR',
          resourceId: vendorId,
          userId: deletedBy,
          companyId,
          oldValues: {
            vendorNumber: vendor.vendorNumber,
            name: vendor.name,
            status: 'ACTIVE',
          },
          newValues: {
            status: 'INACTIVE',
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting vendor:', error);
      throw error;
    }
  }

  /**
   * Get vendor by ID
   */
  async getVendor(vendorId: string, companyId: string): Promise<Vendor | null> {
    try {
      return await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
      });
    } catch (error) {
      logger.error('Error getting vendor:', error);
      return null;
    }
  }

  /**
   * Get vendor by vendor number
   */
  async getVendorByNumber(
    vendorNumber: string,
    companyId: string
  ): Promise<Vendor | null> {
    try {
      return await prisma.vendor.findFirst({
        where: {
          vendorNumber,
          companyId,
        },
      });
    } catch (error) {
      logger.error('Error getting vendor by number:', error);
      return null;
    }
  }

  /**
   * Get all vendors for a company
   */
  async getVendors(
    companyId: string,
    options?: {
      isActive?: boolean;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Vendor[]> {
    try {
      const where: any = { companyId };

      if (options?.isActive !== undefined) {
        where.status = options.isActive ? 'ACTIVE' : 'INACTIVE';
      } else if (!options?.includeInactive) {
        where.status = 'ACTIVE';
      }

      return await prisma.vendor.findMany({
        where,
        orderBy: [
          { vendorNumber: 'asc' },
        ],
        take: options?.limit || 100,
        skip: options?.offset || 0,
      });
    } catch (error) {
      logger.error('Error getting vendors:', error);
      return [];
    }
  }

  /**
   * Search vendors
   */
  async searchVendors(
    companyId: string,
    query: string,
    limit = 20
  ): Promise<Vendor[]> {
    try {
      return await prisma.vendor.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          OR: [
            { vendorNumber: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: [
          { vendorNumber: 'asc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Error searching vendors:', error);
      return [];
    }
  }

  /**
   * Get vendor balance
   */
  async getVendorBalance(
    vendorId: string,
    companyId: string
  ): Promise<VendorBalance | null> {
    try {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
        include: {
          company: true,
        },
      });

      if (!vendor) {
        return null;
      }

      // In a real implementation, you would calculate this from bills and payments
      // For now, we'll use the balance field
      return {
        vendorId: vendor.id,
        vendorName: vendor.displayName || vendor.name,
        totalBilled: vendor.balance.toNumber(), // Simplified
        totalPaid: 0, // Would calculate from payments
        balance: vendor.balance.toNumber(),
        currency: vendor.company.currencyCode,
      };
    } catch (error) {
      logger.error('Error getting vendor balance:', error);
      return null;
    }
  }

  /**
   * Get vendor transactions
   */
  async getVendorTransactions(
    vendorId: string,
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
        vendorId,
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
      logger.error('Error getting vendor transactions:', error);
      return [];
    }
  }

  /**
   * Update vendor balance
   */
  async updateVendorBalance(
    vendorId: string,
    companyId: string,
    amount: number,
    updatedBy: string
  ): Promise<Vendor> {
    try {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const updatedVendor = await prisma.vendor.update({
        where: { id: vendorId },
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
          action: 'UPDATE_VENDOR_BALANCE',
          resourceType: 'VENDOR',
          resourceId: vendorId,
          userId: updatedBy,
          companyId,
          oldValues: { balance: vendor.balance },
          newValues: { balance: updatedVendor.balance },
        },
      });

      return updatedVendor;
    } catch (error) {
      logger.error('Error updating vendor balance:', error);
      throw error;
    }
  }

  /**
   * Get vendor statistics
   */
  async getVendorStats(companyId: string): Promise<VendorStats> {
    try {
      const [totalVendors, activeVendors, inactiveVendors] = await Promise.all([
        prisma.vendor.count({ where: { companyId } }),
        prisma.vendor.count({ where: { companyId, status: 'ACTIVE' } }),
        prisma.vendor.count({ where: { companyId, status: 'INACTIVE' } }),
      ]);

      // Calculate total payables
      const vendors = await prisma.vendor.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { balance: true },
      });

      const totalPayables = vendors.reduce((sum, v) => sum + v.balance.toNumber(), 0);

      return {
        totalVendors,
        activeVendors,
        inactiveVendors,
        totalPayables,
      };
    } catch (error) {
      logger.error('Error getting vendor stats:', error);
      return {
        totalVendors: 0,
        activeVendors: 0,
        inactiveVendors: 0,
        totalPayables: 0,
      };
    }
  }

  /**
   * Generate unique vendor number
   */
  private async generateVendorNumber(companyId: string): Promise<string> {
    try {
      // Get the highest vendor number for this company
      const lastVendor = await prisma.vendor.findFirst({
        where: { companyId },
        orderBy: { vendorNumber: 'desc' },
        select: { vendorNumber: true },
      });

      if (!lastVendor) {
        return 'VEND-0001';
      }

      // Extract number from format VEND-XXXX
      const match = lastVendor.vendorNumber.match(/VEND-(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        return `VEND-${nextNumber.toString().padStart(4, '0')}`;
      }

      // Fallback if format doesn't match
      const count = await prisma.vendor.count({ where: { companyId } });
      return `VEND-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      logger.error('Error generating vendor number:', error);
      return `VEND-${Date.now()}`;
    }
  }
}

// Export singleton instance
export const vendorService = new VendorService();
export default vendorService;
