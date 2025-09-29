// User & Authentication Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'OWNER' | 'ADMIN' | 'USER' | 'VIEWER';
  organizationId: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  planType: 'FREE' | 'CONQUEROR' | 'EMPEROR' | 'OVERLORD';
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'TRIAL';
  maxUsers: number;
  maxAgents: number;
  maxCampaigns: number;
  storageLimit: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
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

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationSlug?: string;
  acceptTerms: boolean;
}

// AI Agent Types
export interface AIAgent {
  id: string;
  name: string;
  type: 'LEAD_GENERATOR' | 'EMAIL_MARKETER' | 'SOCIAL_MEDIA' | 'CONTENT_CREATOR' | 'ANALYTICS' | 'CUSTOMER_SERVICE' | 'SALES';
  description?: string;
  configuration: Record<string, any>;
  isActive: boolean;
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  createdAt: string;
  updatedAt: string;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  targetAudience?: Record<string, any>;
  budget?: number;
  goals?: Record<string, any>;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

// Lead Types
export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  source: 'WEBSITE' | 'SOCIAL_MEDIA' | 'EMAIL' | 'REFERRAL' | 'PAID_ADS' | 'ORGANIC' | 'DIRECT';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  score: number;
  metadata?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface Analytics {
  date: string;
  visitors: number;
  pageViews: number;
  leads: number;
  conversions: number;
  revenue: number;
  agentMetrics?: Record<string, any>;
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
export interface Subdomain {
  id: string;
  subdomain: string;
  customDomain?: string;
  sslEnabled: boolean;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<any>;
  badge?: string | number;
  children?: NavItem[];
}

// Theme Types
export type Theme = 'light' | 'dark';

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

// Plan Types
export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: PlanFeature[];
  popular?: boolean;
  maxAgents: number;
  maxUsers: number;
  maxCampaigns: number;
  storageLimit: number;
}