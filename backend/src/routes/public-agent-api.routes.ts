import { Router } from 'express';
import { publicAgentAPIController } from '@/controllers/public-agent-api.controller';
import { apiKeyAuthWithLogging } from '@/middleware/api-key-auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Public Agent API Routes
 * All routes require API key authentication
 * Base path: /api/public/agents
 */

// Rate limiter for public API
const publicAPILimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all public API routes
router.use(publicAPILimiter);

// Execute an agent
router.post(
  '/:agentId/execute',
  apiKeyAuthWithLogging,
  (req, res) => publicAgentAPIController.executeAgent(req, res)
);

// Chat with an agent
router.post(
  '/:agentId/chat',
  apiKeyAuthWithLogging,
  (req, res) => publicAgentAPIController.chatWithAgent(req, res)
);

// Get agent status
router.get(
  '/:agentId/status',
  apiKeyAuthWithLogging,
  (req, res) => publicAgentAPIController.getAgentStatus(req, res)
);

// Submit feedback
router.post(
  '/:agentId/feedback',
  apiKeyAuthWithLogging,
  (req, res) => publicAgentAPIController.submitFeedback(req, res)
);

// Test agent (does not consume credits)
router.post(
  '/:agentId/test',
  apiKeyAuthWithLogging,
  (req, res) => publicAgentAPIController.testAgent(req, res)
);

export default router;
