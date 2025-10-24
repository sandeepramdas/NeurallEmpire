/**
 * Company Context Middleware
 * Manages company context for multi-company requests
 * Validates company access and attaches company info to request
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';
import { companyService } from '@/services/company.service';
import { prisma } from '@/server';
import { logger } from '@/infrastructure/logger';

/**
 * Require company context (companyId in JWT or header)
 * Validates that user has access to the specified company
 */
export const requireCompanyContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get companyId from multiple sources (priority: header > body > query > JWT)
    let companyId = req.headers['x-company-id'] as string;

    if (!companyId && req.body?.companyId) {
      companyId = req.body.companyId;
    }

    if (!companyId && req.query?.companyId) {
      companyId = req.query.companyId as string;
    }

    if (!companyId && req.companyId) {
      companyId = req.companyId;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company context required. Provide companyId in header, body, or query',
      });
    }

    // Verify user has access to this company
    const hasAccess = await companyService.verifyAccess(req.user.id, companyId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this company',
      });
    }

    // Attach companyId to request
    req.companyId = companyId;

    // Load company details (optional, for convenience)
    const company = await companyService.getCompany(companyId);
    if (company) {
      req.company = company;
    }

    next();
  } catch (error) {
    logger.error('Company context error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify company access',
    });
  }
};

/**
 * Optional company context
 * If companyId provided, validates access but doesn't require it
 */
export const optionalCompanyContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next();
    }

    // Get companyId from multiple sources
    let companyId = req.headers['x-company-id'] as string;

    if (!companyId && req.body?.companyId) {
      companyId = req.body.companyId;
    }

    if (!companyId && req.query?.companyId) {
      companyId = req.query.companyId as string;
    }

    if (!companyId && req.companyId) {
      companyId = req.companyId;
    }

    if (companyId) {
      // Verify access if companyId provided
      const hasAccess = await companyService.verifyAccess(req.user.id, companyId);

      if (hasAccess) {
        req.companyId = companyId;

        const company = await companyService.getCompany(companyId);
        if (company) {
          req.company = company;
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Optional company context error:', error);
    next(); // Don't block request on error
  }
};

/**
 * Load default company if no company context provided
 * Useful for routes that can work with or without company context
 */
export const loadDefaultCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.companyId) {
      return next();
    }

    // Get user's default company
    const defaultCompany = await companyService.getDefaultCompany(req.user.id);

    if (defaultCompany) {
      req.companyId = defaultCompany.id;
      req.company = defaultCompany;
    }

    next();
  } catch (error) {
    logger.error('Load default company error:', error);
    next(); // Don't block request on error
  }
};

/**
 * Require company to be active
 */
export const requireActiveCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company context required',
      });
    }

    // Get company if not already loaded
    let company = req.company;
    if (!company) {
      company = await companyService.getCompany(req.companyId);
      req.company = company;
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    if (company.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Company is not active',
        status: company.status,
      });
    }

    next();
  } catch (error) {
    logger.error('Active company check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify company status',
    });
  }
};

/**
 * Extract companyId from route params
 * Usage: For routes like /api/companies/:companyId/...
 */
export const companyIdFromParams = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.params.companyId) {
    req.companyId = req.params.companyId;
  }
  next();
};

/**
 * Validate that resource belongs to the current company context
 * Usage: validateResourceCompany('accountId', prisma.account)
 */
export const validateResourceCompany = (
  resourceIdParam: string,
  model: any,
  options?: { optional?: boolean }
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (!req.companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company context required',
        });
      }

      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];

      if (!resourceId) {
        if (options?.optional) {
          return next();
        }
        return res.status(400).json({
          success: false,
          error: `${resourceIdParam} is required`,
        });
      }

      // Check if resource belongs to company
      const resource = await model.findFirst({
        where: {
          id: resourceId,
          companyId: req.companyId,
        },
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or does not belong to this company',
        });
      }

      next();
    } catch (error) {
      logger.error('Resource company validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate resource',
      });
    }
  };
};

/**
 * Ensure user can only access their own companies
 * (unless they're super admin)
 */
export const restrictToOwnOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Super admins can access any organization
    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company context required',
      });
    }

    // Verify company belongs to user's organization
    const company = await prisma.company.findFirst({
      where: {
        id: req.companyId,
        organizationId: req.user.organizationId,
      },
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        error: 'Company does not belong to your organization',
      });
    }

    next();
  } catch (error) {
    logger.error('Organization restriction error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify organization access',
    });
  }
};
