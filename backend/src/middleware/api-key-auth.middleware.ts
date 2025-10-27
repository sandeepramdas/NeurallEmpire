import { Request, Response, NextFunction } from 'express';
import { agentAPIKeyService } from '@/services/agent-api-key.service';
import { logger } from '@/infrastructure/logger';

/**
 * API Key Authentication Middleware
 * Authenticates requests using Agent API keys
 */

interface AuthenticatedRequest extends Request {
  apiKey?: any;
  agent?: any;
  organization?: any;
}

/**
 * Middleware to authenticate requests using API key
 * Expects: Authorization: Bearer neurall_live_xxxxx
 * Or: X-API-Key: neurall_live_xxxxx
 */
export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract API key from headers
    let apiKey: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }

    // Check X-API-Key header
    if (!apiKey) {
      apiKey = req.headers['x-api-key'] as string;
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing API key',
        message: 'Provide API key in Authorization header or X-API-Key header'
      });
    }

    // Validate API key
    const validation = await agentAPIKeyService.validateAPIKey(apiKey);

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: validation.error || 'API key is invalid or expired'
      });
    }

    // Check rate limit
    const ipAddress = req.ip || req.socket.remoteAddress;
    const withinLimit = await agentAPIKeyService.checkRateLimit(
      validation.apiKey!.id,
      ipAddress
    );

    if (!withinLimit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${validation.apiKey!.rateLimit} requests per minute exceeded`
      });
    }

    // Attach to request object
    req.apiKey = validation.apiKey;
    req.agent = validation.agent;
    req.organization = validation.apiKey.organization;

    // Log successful authentication
    logger.debug(`API key authenticated: ${validation.apiKey!.prefix}... for agent ${validation.agent!.id}`);

    next();
  } catch (error: any) {
    logger.error('API key auth error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
}

/**
 * Middleware to log API usage after request completion
 */
export function logAPIUsage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (body: any): Response {
    const responseTime = Date.now() - startTime;

    // Log API usage asynchronously
    if (req.apiKey && req.agent) {
      const requestSize = req.headers['content-length']
        ? parseInt(req.headers['content-length'])
        : undefined;

      const responseSize = Buffer.byteLength(body);

      agentAPIKeyService.logAPIUsage({
        apiKeyId: req.apiKey.id,
        agentId: req.agent.id,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        requestSize,
        responseSize,
        errorMessage: res.statusCode >= 400 ? body : undefined
      }).catch(err => {
        logger.error('Failed to log API usage:', err);
      });
    }

    // Call original send
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Combined middleware: authenticate and log
 */
export const apiKeyAuthWithLogging = [apiKeyAuth, logAPIUsage];
