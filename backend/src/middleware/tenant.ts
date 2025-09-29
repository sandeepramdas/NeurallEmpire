import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/server';
import { AuthenticatedRequest } from '@/types';

export const tenantResolver = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hostname = req.hostname;
    let subdomain: string | null = null;

    // Extract subdomain from hostname
    if (hostname) {
      const parts = hostname.split('.');

      // Handle different hostname patterns
      if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
        // Local development - check for subdomain in header or query
        subdomain = req.headers['x-tenant'] as string || req.query.tenant as string;
      } else if (parts.length >= 3) {
        // Production subdomain: {tenant}.neurallempire.com
        const potentialSubdomain = parts[0];

        // Skip system subdomains
        if (!['www', 'api', 'app', 'admin', 'mail'].includes(potentialSubdomain)) {
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
          maxCampaigns: true,
          storageLimit: true,
        },
      });

      if (organization) {
        if (organization.status !== 'ACTIVE') {
          return res.status(403).json({
            success: false,
            error: 'Organization is not active',
          });
        }

        req.organization = organization;
        req.tenant = subdomain;
      } else if (subdomain) {
        // Subdomain exists but organization not found
        return res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during tenant resolution',
    });
  }
};

export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.organization) {
    return res.status(400).json({
      success: false,
      error: 'Organization context required',
    });
  }
  next();
};