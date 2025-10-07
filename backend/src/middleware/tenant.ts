import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/server';
import { AuthenticatedRequest } from '@/types';

export const tenantResolver = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Skip tenant resolution for authentication routes
    if (req.path.startsWith('/api/auth/')) {
      return next();
    }

    const hostname = req.hostname;
    let subdomain: string | null = null;

    // Extract subdomain from hostname
    if (hostname) {
      const parts = hostname.split('.');

      // Handle different hostname patterns
      if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        // Local development - check for subdomain in header or query
        subdomain = req.headers['x-tenant'] as string || req.query.tenant as string;
      } else if (
        hostname.includes('railway.app') ||
        hostname.includes('railway.internal') ||
        hostname.startsWith('neurallempire-production') ||
        hostname === 'www.neurallempire.com' ||
        hostname === 'neurallempire.com'
      ) {
        // Skip Railway, production main domain, and deployment domains
        subdomain = null;
      } else if (parts.length >= 3) {
        // Production subdomain: {tenant}.neurallempire.com
        const potentialSubdomain = parts[0];

        // Skip system subdomains
        if (potentialSubdomain && !['www', 'api', 'app', 'admin', 'mail'].includes(potentialSubdomain)) {
          subdomain = potentialSubdomain;
        }
      }
    }

    // If subdomain exists, resolve organization
    if (subdomain) {
      const organization = await prisma.organization.findUnique({
        where: { slug: subdomain },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          planType: true,
          maxUsers: true,
          maxAgents: true,
          maxWorkflows: true,
          storageLimit: true,
          subdomainStatus: true,
          subdomainEnabled: true,
        },
      });

      if (organization) {
        // Enhanced status validation
        if (organization.status !== 'ACTIVE' && organization.status !== 'TRIAL') {
          res.status(403).json({
            success: false,
            error: 'Organization is not active',
            code: 'ORG_INACTIVE'
          });
          return;
        }

        // Check subdomain status
        if (!organization.subdomainEnabled || organization.subdomainStatus === 'SUSPENDED') {
          res.status(403).json({
            success: false,
            error: 'Subdomain access is disabled',
            code: 'SUBDOMAIN_DISABLED'
          });
          return;
        }

        req.organization = organization as any;
        req.tenant = subdomain;

        // Log subdomain access for analytics
        req.headers['x-org-id'] = organization.id;
        req.headers['x-org-plan'] = organization.planType;
      } else if (subdomain) {
        // Subdomain exists but organization not found
        res.status(404).json({
          success: false,
          error: 'Organization not found',
          code: 'ORG_NOT_FOUND',
          subdomain
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during tenant resolution',
      code: 'TENANT_RESOLUTION_ERROR'
    });
  }
};

export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.organization) {
    res.status(400).json({
      success: false,
      error: 'Organization context required',
    });
    return;
  }
  next();
};