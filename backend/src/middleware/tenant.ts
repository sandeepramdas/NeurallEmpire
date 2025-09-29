import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/server';
import { AuthenticatedRequest } from '@/types';

export const tenantResolver = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
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
          maxCampaigns: true,
          storageLimit: true,
        },
      });

      if (organization) {
        if (organization.status !== 'ACTIVE') {
          res.status(403).json({
            success: false,
            error: 'Organization is not active',
          });
          return;
        }

        req.organization = organization as any;
        req.tenant = subdomain;
      } else if (subdomain) {
        // Subdomain exists but organization not found
        res.status(404).json({
          success: false,
          error: 'Organization not found',
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