import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/server';
import { AuthenticatedRequest, JwtPayload, AuthUser } from '@/types';
import { rbacService } from '@/services/rbac.service';
import { config } from '@/config/env';
import { jwtBlacklistService } from '@/services/jwt-blacklist.service';

const JWT_SECRET = config.JWT_SECRET;

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    let token: string | undefined;

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Also check cookies for token (for web sessions)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check if token is blacklisted
    const isBlacklisted = await jwtBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
      });
      return;
    }

    // Check if all user tokens are blacklisted (forced logout)
    const allUserTokensBlacklisted = await jwtBlacklistService.areAllUserTokensBlacklisted(
      decoded.userId
    );
    if (allUserTokensBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'All sessions have been terminated',
      });
      return;
    }

    // Fetch user from database with organization info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            planType: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
      return;
    }

    if (user.organization.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: 'Organization is not active',
      });
      return;
    }

    // If tenant-specific request, verify user belongs to that tenant
    if (req.organization && user.organizationId !== req.organization.id) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this organization',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      isSuperAdmin: user.isSuperAdmin,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      avatar: user.avatar || undefined,
    };

    // Extract companyId from JWT if present (for multi-company context)
    if (decoded.companyId) {
      req.companyId = decoded.companyId;

      // Load user permissions for this company
      const permissions = await rbacService.getUserPermissions(user.id, decoded.companyId);
      req.permissions = permissions;

      // Load user roles for this company
      const roles = await rbacService.getUserRoles(user.id, decoded.companyId);
      req.roles = roles.map(r => r.code);
    }

    // If no tenant context yet, set from user's organization
    if (!req.organization) {
      req.organization = user.organization as any;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid access token',
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      // Check if token is blacklisted
      const isBlacklisted = await jwtBlacklistService.isBlacklisted(token);
      const allUserTokensBlacklisted = await jwtBlacklistService.areAllUserTokensBlacklisted(
        decoded.userId
      );

      // Skip user lookup if token is blacklisted
      if (isBlacklisted || allUserTokensBlacklisted) {
        next();
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          organizationId: true,
        },
      });

      if (user && user.status === 'ACTIVE') {
        (req as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          avatar: user.avatar || undefined,
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't return errors - just continue without user
    next();
  }
};