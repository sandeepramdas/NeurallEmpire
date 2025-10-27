import { Router } from 'express';
import { agentAPIKeysController } from '@/controllers/agent-api-keys.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

/**
 * Agent API Keys Routes
 * All routes require authentication
 * Base path: /api/agents/:agentId/api-keys
 */

// Create a new API key
router.post(
  '/:agentId/api-keys',
  authenticate,
  (req, res) => agentAPIKeysController.createAPIKey(req, res)
);

// List all API keys for an agent
router.get(
  '/:agentId/api-keys',
  authenticate,
  (req, res) => agentAPIKeysController.listAPIKeys(req, res)
);

// Update an API key
router.put(
  '/:agentId/api-keys/:keyId',
  authenticate,
  (req, res) => agentAPIKeysController.updateAPIKey(req, res)
);

// Revoke an API key
router.delete(
  '/:agentId/api-keys/:keyId',
  authenticate,
  (req, res) => agentAPIKeysController.revokeAPIKey(req, res)
);

// Regenerate an API key
router.post(
  '/:agentId/api-keys/:keyId/regenerate',
  authenticate,
  (req, res) => agentAPIKeysController.regenerateAPIKey(req, res)
);

// Get API key usage statistics
router.get(
  '/:agentId/api-keys/:keyId/usage',
  authenticate,
  (req, res) => agentAPIKeysController.getAPIKeyUsage(req, res)
);

export default router;
