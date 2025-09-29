import { Request } from 'express';
import { Organization, User, PlanType, UserRole } from '@prisma/client';

// Extended Request with authenticated user and tenant
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  organization?: Organization;
  tenant?: string; // subdomain
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta: PaginationMeta;
}

// Organization & Tenant Types
export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
  planType?: PlanType;
}

export interface TenantContext {
  organizationId: string;
  slug: string;
  planType: PlanType;
  limits: {
    maxUsers: number;
    maxAgents: number;
    maxCampaigns: number;
    storageLimit: number;
  };
}

// Authentication Types
export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationSlug?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SocialAuthData {
  provider: 'google' | 'facebook' | 'linkedin' | 'github';
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

// Agent & Campaign Types
export interface CreateAgentData {
  name: string;
  type: string;
  description?: string;
  configuration: Record<string, any>;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  targetAudience?: Record<string, any>;
  budget?: number;
  goals?: Record<string, any>;
  agentIds?: string[];
}

// Analytics Types
export interface AnalyticsData {
  visitors: number;
  pageViews: number;
  leads: number;
  conversions: number;
  revenue: number;
  date: Date;
}

export interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalCampaigns: number;
  totalLeads: number;
  monthlyRevenue: number;
  conversionRate: number;
  recentActivity: any[];
}

// Subdomain Types
export interface CreateSubdomainData {
  subdomain: string;
  customDomain?: string;
}

export interface SubdomainConfig {
  subdomain: string;
  customDomain?: string;
  sslEnabled: boolean;
  organizationId: string;
}

// Error Types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}