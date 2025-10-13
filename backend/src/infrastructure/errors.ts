/**
 * ==================== PRODUCTION-GRADE ERROR HANDLING ====================
 *
 * Custom error classes for different failure scenarios
 * - Type-safe error handling
 * - Structured logging
 * - Client-friendly error messages
 * - Sentry integration ready
 *
 * @module infrastructure/errors
 */

/**
 * Base Application Error
 * All custom errors extend this class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Validation Error (400)
 * Used for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Authentication Error (401)
 * Used when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details);
  }
}

/**
 * Authorization Error (403)
 * Used when user doesn't have permission
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}

/**
 * Not Found Error (404)
 * Used when resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR', true, { resource, identifier });
  }
}

/**
 * Conflict Error (409)
 * Used for resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', true, details);
  }
}

/**
 * Rate Limit Error (429)
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfter });
  }
}

// ==================== CONNECTOR ERRORS ====================

/**
 * Base Connector Error
 * All connector-related errors extend this
 */
export class ConnectorError extends AppError {
  constructor(
    message: string,
    public connectorId: string,
    public connectorType: string,
    statusCode: number = 500,
    code: string = 'CONNECTOR_ERROR',
    details?: Record<string, any>
  ) {
    super(message, statusCode, code, true, { connectorId, connectorType, ...details });
  }
}

/**
 * Connection Failed Error
 * Used when connector cannot establish connection
 */
export class ConnectionFailedError extends ConnectorError {
  constructor(connectorId: string, connectorType: string, reason: string) {
    super(
      `Failed to connect to ${connectorType}: ${reason}`,
      connectorId,
      connectorType,
      503,
      'CONNECTION_FAILED',
      { reason }
    );
  }
}

/**
 * Connection Timeout Error
 * Used when connector connection times out
 */
export class ConnectionTimeoutError extends ConnectorError {
  constructor(connectorId: string, connectorType: string, timeoutMs: number) {
    super(
      `Connection to ${connectorType} timed out after ${timeoutMs}ms`,
      connectorId,
      connectorType,
      504,
      'CONNECTION_TIMEOUT',
      { timeoutMs }
    );
  }
}

/**
 * Query Failed Error
 * Used when connector query fails
 */
export class QueryFailedError extends ConnectorError {
  constructor(
    connectorId: string,
    connectorType: string,
    query: string,
    reason: string
  ) {
    super(
      `Query failed on ${connectorType}: ${reason}`,
      connectorId,
      connectorType,
      500,
      'QUERY_FAILED',
      { query, reason }
    );
  }
}

/**
 * Invalid Credentials Error
 * Used when connector credentials are invalid
 */
export class InvalidCredentialsError extends ConnectorError {
  constructor(connectorId: string, connectorType: string) {
    super(
      `Invalid credentials for ${connectorType}`,
      connectorId,
      connectorType,
      401,
      'INVALID_CREDENTIALS'
    );
  }
}

// ==================== AI/ML ERRORS ====================

/**
 * AI Service Error
 * Base class for AI-related errors
 */
export class AIServiceError extends AppError {
  constructor(
    message: string,
    public provider: string,
    public model: string,
    details?: Record<string, any>
  ) {
    super(message, 500, 'AI_SERVICE_ERROR', true, { provider, model, ...details });
  }
}

/**
 * Model Not Available Error
 * Used when AI model is not available
 */
export class ModelNotAvailableError extends AIServiceError {
  constructor(provider: string, model: string) {
    super(`Model ${model} not available from ${provider}`, provider, model);
    this.code = 'MODEL_NOT_AVAILABLE';
  }
}

/**
 * Token Limit Exceeded Error
 * Used when input exceeds model's token limit
 */
export class TokenLimitExceededError extends AIServiceError {
  constructor(provider: string, model: string, tokenCount: number, maxTokens: number) {
    super(
      `Token limit exceeded: ${tokenCount} tokens (max: ${maxTokens})`,
      provider,
      model,
      { tokenCount, maxTokens }
    );
    this.code = 'TOKEN_LIMIT_EXCEEDED';
  }
}

/**
 * AI Generation Failed Error
 * Used when AI generation fails
 */
export class AIGenerationFailedError extends AIServiceError {
  constructor(provider: string, model: string, reason: string) {
    super(`AI generation failed: ${reason}`, provider, model, { reason });
    this.code = 'AI_GENERATION_FAILED';
  }
}

// ==================== VECTOR SEARCH ERRORS ====================

/**
 * Vector Search Error
 * Base class for vector search errors
 */
export class VectorSearchError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 500, 'VECTOR_SEARCH_ERROR', true, details);
  }
}

/**
 * Embedding Failed Error
 * Used when text embedding fails
 */
export class EmbeddingFailedError extends VectorSearchError {
  constructor(text: string, reason: string) {
    super(`Failed to generate embedding: ${reason}`, {
      textLength: text.length,
      reason,
    });
    this.code = 'EMBEDDING_FAILED';
  }
}

/**
 * Index Not Found Error
 * Used when vector index doesn't exist
 */
export class IndexNotFoundError extends VectorSearchError {
  constructor(indexName: string) {
    super(`Vector index '${indexName}' not found`, { indexName });
    this.code = 'INDEX_NOT_FOUND';
    this.statusCode = 404;
  }
}

// ==================== WORKFLOW ERRORS ====================

/**
 * Workflow Error
 * Base class for workflow errors
 */
export class WorkflowError extends AppError {
  constructor(
    message: string,
    public workflowId: string,
    public stepIndex?: number,
    details?: Record<string, any>
  ) {
    super(message, 500, 'WORKFLOW_ERROR', true, { workflowId, stepIndex, ...details });
  }
}

/**
 * Step Failed Error
 * Used when a workflow step fails
 */
export class StepFailedError extends WorkflowError {
  constructor(workflowId: string, stepIndex: number, stepName: string, reason: string) {
    super(
      `Workflow step '${stepName}' failed: ${reason}`,
      workflowId,
      stepIndex,
      { stepName, reason }
    );
    this.code = 'STEP_FAILED';
  }
}

// ==================== ERROR HANDLER MIDDLEWARE ====================

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Global Error Handler Middleware
 * Catches all errors and returns appropriate responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Application error', {
        error: err.toJSON(),
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.id,
      });
    } else {
      logger.warn('Client error', {
        error: err.toJSON(),
        path: req.path,
        method: req.method,
      });
    }
  } else {
    // Unexpected error
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  }

  // Send response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && { details: err.details }),
      },
    });
  }

  // Unknown error - don't leak details
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        details: { message: err.message },
      }),
    },
  });
}

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not Found Handler
 * Handles 404 errors
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}
