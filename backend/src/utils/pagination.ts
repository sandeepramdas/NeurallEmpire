/**
 * ==================== PAGINATION UTILITY ====================
 *
 * Reusable pagination helpers for list endpoints
 *
 * Features:
 * - Parse pagination query parameters
 * - Calculate skip/take for Prisma queries
 * - Generate pagination metadata
 * - Consistent pagination response format
 *
 * @module utils/pagination
 */

import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Default pagination limits
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from request query
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
  const rawLimit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    page,
    limit,
    skip,
    take,
  };
}

/**
 * Generate pagination metadata
 */
export function getPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    meta: getPaginationMeta(total, page, limit),
  };
}
