import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/server';
import { AuthenticatedRequest, JwtPayload, AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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
        organizationId: true,
        isActive: true,
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

    if (!user || !user.isActive) {
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
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      avatar: user.avatar || undefined,
    };

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

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          organizationId: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
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