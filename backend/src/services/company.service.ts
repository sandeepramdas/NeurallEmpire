/**
 * Company Management Service
 * Handles multi-company operations, user access, and company switching
 */

import { prisma } from '@/server';
import { Company, UserCompanyAccess, User } from '@prisma/client';
import { rbacService } from './rbac.service';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { logger } from '@/infrastructure/logger';

interface CreateCompanyDTO {
  companyCode: string;
  name: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;
  currencyCode?: string;
  fiscalYearStart?: number;
  fiscalYearEnd?: number;
  accountingMethod?: 'ACCRUAL' | 'CASH';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface UpdateCompanyDTO {
  name?: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;
  currencyCode?: string;
  fiscalYearStart?: number;
  fiscalYearEnd?: number;
  accountingMethod?: 'ACCRUAL' | 'CASH';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  settings?: any;
}

interface GrantAccessDTO {
  userId: string;
  companyId: string;
  roleId?: string;
  permissions?: string[];
  isDefault?: boolean;
}

interface CompanyWithAccess extends Company {
  userAccess?: UserCompanyAccess;
  role?: {
    id: string;
    name: string;
    code: string;
  };
}

class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(
    organizationId: string,
    data: CreateCompanyDTO,
    createdBy: string
  ): Promise<Company> {
    try {
      // Check organization limits
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          maxCompanies: true,
          currentCompanies: true,
        },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      if (organization.currentCompanies >= organization.maxCompanies) {
        throw new Error(`Company limit reached. Maximum ${organization.maxCompanies} companies allowed.`);
      }

      // Check if company code already exists in organization
      const existing = await prisma.company.findUnique({
        where: {
          organizationId_companyCode: {
            organizationId,
            companyCode: data.companyCode.toUpperCase(),
          },
        },
      });

      if (existing) {
        throw new Error('Company code already exists in this organization');
      }

      // Create company
      const company = await prisma.company.create({
        data: {
          organizationId,
          companyCode: data.companyCode.toUpperCase(),
          name: data.name,
          legalName: data.legalName,
          taxId: data.taxId,
          registrationNumber: data.registrationNumber,
          currencyCode: data.currencyCode || 'USD',
          fiscalYearStart: data.fiscalYearStart || 1,
          fiscalYearEnd: data.fiscalYearEnd || 12,
          accountingMethod: data.accountingMethod || 'ACCRUAL',
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          country: data.country || 'US',
          zipCode: data.zipCode,
          phone: data.phone,
          email: data.email,
          website: data.website,
          status: 'ACTIVE',
        },
      });

      // Update organization company count
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          currentCompanies: { increment: 1 },
        },
      });

      // Grant access to creator with OWNER role
      const ownerRole = await prisma.role.findFirst({
        where: {
          organizationId,
          code: 'OWNER',
        },
      });

      if (ownerRole) {
        await this.grantAccess({
          userId: createdBy,
          companyId: company.id,
          roleId: ownerRole.id,
          isDefault: true,
        }, createdBy);
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_COMPANY',
          resourceType: 'COMPANY',
          resourceId: company.id,
          userId: createdBy,
          organizationId,
          companyId: company.id,
          newValues: {
            companyCode: company.companyCode,
            name: company.name,
          },
        },
      });

      return company;
    } catch (error) {
      logger.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Get all companies a user has access to
   */
  async getUserCompanies(userId: string): Promise<CompanyWithAccess[]> {
    try {
      const userAccesses = await prisma.userCompanyAccess.findMany({
        where: { userId },
        include: {
          company: true,
          role: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { lastAccessedAt: 'desc' },
        ],
      });

      return userAccesses.map(access => ({
        ...access.company,
        userAccess: access,
        role: access.role || undefined,
      }));
    } catch (error) {
      logger.error('Error getting user companies:', error);
      return [];
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(companyId: string): Promise<Company | null> {
    try {
      return await prisma.company.findUnique({
        where: { id: companyId },
      });
    } catch (error) {
      logger.error('Error getting company:', error);
      return null;
    }
  }

  /**
   * Get company with full details
   */
  async getCompanyWithDetails(companyId: string) {
    try {
      return await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          userAccess: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting company with details:', error);
      return null;
    }
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    data: UpdateCompanyDTO,
    updatedBy: string
  ): Promise<Company> {
    try {
      const existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!existingCompany) {
        throw new Error('Company not found');
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_COMPANY',
          resourceType: 'COMPANY',
          resourceId: companyId,
          userId: updatedBy,
          companyId,
          oldValues: existingCompany as any,
          newValues: data as any,
        },
      });

      return company;
    } catch (error) {
      logger.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(companyId: string, deletedBy: string): Promise<void> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          userAccess: true,
          accounts: true,
          transactions: true,
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Check if company has data
      if (company.accounts.length > 0 || company.transactions.length > 0) {
        // Soft delete - archive instead
        await prisma.company.update({
          where: { id: companyId },
          data: {
            status: 'ARCHIVED',
            deletedAt: new Date(),
          },
        });
      } else {
        // Hard delete if no data
        await prisma.company.delete({
          where: { id: companyId },
        });
      }

      // Update organization company count
      await prisma.organization.update({
        where: { id: company.organizationId },
        data: {
          currentCompanies: { decrement: 1 },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_COMPANY',
          resourceType: 'COMPANY',
          resourceId: companyId,
          userId: deletedBy,
          organizationId: company.organizationId,
          oldValues: {
            companyCode: company.companyCode,
            name: company.name,
          },
        },
      });
    } catch (error) {
      logger.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Grant user access to a company
   */
  async grantAccess(data: GrantAccessDTO, grantedBy: string): Promise<UserCompanyAccess> {
    try {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Verify user exists and belongs to same organization
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user || user.organizationId !== company.organizationId) {
        throw new Error('User not found or does not belong to company organization');
      }

      // Check if access already exists
      const existingAccess = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId: data.userId,
            companyId: data.companyId,
          },
        },
      });

      if (existingAccess) {
        throw new Error('User already has access to this company');
      }

      // If this is set as default, unset other defaults for this user
      if (data.isDefault) {
        await prisma.userCompanyAccess.updateMany({
          where: { userId: data.userId },
          data: { isDefault: false },
        });
      }

      // Create access
      const access = await prisma.userCompanyAccess.create({
        data: {
          userId: data.userId,
          companyId: data.companyId,
          roleId: data.roleId,
          permissions: data.permissions || [],
          isDefault: data.isDefault || false,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'GRANT_COMPANY_ACCESS',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: data.userId,
          userId: grantedBy,
          companyId: data.companyId,
          newValues: {
            userId: data.userId,
            companyId: data.companyId,
            roleId: data.roleId,
          },
        },
      });

      return access;
    } catch (error) {
      logger.error('Error granting company access:', error);
      throw error;
    }
  }

  /**
   * Revoke user access to a company
   */
  async revokeAccess(userId: string, companyId: string, revokedBy: string): Promise<void> {
    try {
      const access = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      if (!access) {
        throw new Error('User does not have access to this company');
      }

      await prisma.userCompanyAccess.delete({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'REVOKE_COMPANY_ACCESS',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId: revokedBy,
          companyId,
          oldValues: {
            userId,
            companyId,
            roleId: access.roleId,
          },
        },
      });
    } catch (error) {
      logger.error('Error revoking company access:', error);
      throw error;
    }
  }

  /**
   * Verify user has access to a company
   */
  async verifyAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      // Check if user is super admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      });

      if (user?.isSuperAdmin) {
        return true;
      }

      // Check user company access
      const access = await prisma.userCompanyAccess.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
      });

      return !!access;
    } catch (error) {
      logger.error('Error verifying company access:', error);
      return false;
    }
  }

  /**
   * Switch user's active company
   */
  async switchCompany(userId: string, companyId: string) {
    try {
      // Verify access
      const hasAccess = await this.verifyAccess(userId, companyId);

      if (!hasAccess) {
        throw new Error('User does not have access to this company');
      }

      // Get company details
      const company = await this.getCompany(companyId);

      if (!company) {
        throw new Error('Company not found');
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get permissions for this company
      const permissions = await rbacService.getUserPermissions(userId, companyId);

      // Get roles for this company
      const roles = await rbacService.getUserRoles(userId, companyId);

      // Update last accessed time
      await prisma.userCompanyAccess.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          lastAccessedAt: new Date(),
          accessCount: { increment: 1 },
        },
      });

      // Generate new JWT with company context
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          companyId: company.id,
          role: user.role,
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as any }
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'SWITCH_COMPANY',
          resourceType: 'USER_COMPANY_ACCESS',
          resourceId: userId,
          userId,
          companyId,
          newValues: {
            companyId,
            companyName: company.name,
          },
        },
      });

      return {
        token,
        company,
        permissions,
        roles,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    } catch (error) {
      logger.error('Error switching company:', error);
      throw error;
    }
  }

  /**
   * Set default company for user
   */
  async setDefaultCompany(userId: string, companyId: string): Promise<void> {
    try {
      // Verify access
      const hasAccess = await this.verifyAccess(userId, companyId);

      if (!hasAccess) {
        throw new Error('User does not have access to this company');
      }

      // Unset all defaults for this user
      await prisma.userCompanyAccess.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.userCompanyAccess.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: { isDefault: true },
      });

      // Update user preferences
      await prisma.userPreference.upsert({
        where: { userId },
        update: { defaultCompanyId: companyId },
        create: {
          userId,
          defaultCompanyId: companyId,
        },
      });
    } catch (error) {
      logger.error('Error setting default company:', error);
      throw error;
    }
  }

  /**
   * Get user's default company
   */
  async getDefaultCompany(userId: string): Promise<Company | null> {
    try {
      const preference = await prisma.userPreference.findUnique({
        where: { userId },
      });

      if (preference?.defaultCompanyId) {
        return await this.getCompany(preference.defaultCompanyId);
      }

      // Fallback to first company with isDefault flag
      const access = await prisma.userCompanyAccess.findFirst({
        where: {
          userId,
          isDefault: true,
        },
        include: {
          company: true,
        },
      });

      return access?.company || null;
    } catch (error) {
      logger.error('Error getting default company:', error);
      return null;
    }
  }

  /**
   * Get all companies in an organization
   */
  async getOrganizationCompanies(organizationId: string): Promise<Company[]> {
    try {
      return await prisma.company.findMany({
        where: {
          organizationId,
          status: {
            not: 'ARCHIVED',
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      logger.error('Error getting organization companies:', error);
      return [];
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: string) {
    try {
      const [
        userCount,
        accountCount,
        transactionCount,
        customerCount,
        vendorCount,
      ] = await Promise.all([
        prisma.userCompanyAccess.count({
          where: { companyId },
        }),
        prisma.account.count({
          where: { companyId },
        }),
        prisma.transaction.count({
          where: { companyId },
        }),
        prisma.customer.count({
          where: { companyId },
        }),
        prisma.vendor.count({
          where: { companyId },
        }),
      ]);

      return {
        userCount,
        accountCount,
        transactionCount,
        customerCount,
        vendorCount,
      };
    } catch (error) {
      logger.error('Error getting company stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const companyService = new CompanyService();
export default companyService;
