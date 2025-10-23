/**
 * ==================== AI MODEL CONFIGURATION ROUTES ====================
 *
 * API endpoints for managing AI model configurations
 *
 * Features:
 * - List available AI providers (OpenAI, Anthropic, Google, etc.)
 * - Create, read, update, delete model configurations
 * - Test model connections
 * - Track usage statistics
 *
 * @module routes/ai-models-routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { AIModelsController } from '../controllers/ai-models.controller';

const router = express.Router();
const controller = new AIModelsController();

// All routes require authentication
router.use(authenticate);

// ==================== AI MODEL PROVIDERS ====================

/**
 * GET /api/ai-models/providers
 * Get list of available AI model providers
 */
router.get('/providers', (req, res) => controller.getProviders(req, res));

// ==================== MODEL CONFIGURATIONS ====================

/**
 * GET /api/ai-models/configs
 * Get organization's AI model configurations
 */
router.get('/configs', (req, res) => controller.getModelConfigs(req, res));

/**
 * GET /api/ai-models/configs/:id
 * Get a single model configuration by ID
 */
router.get('/configs/:id', (req, res) => controller.getModelConfig(req, res));

/**
 * POST /api/ai-models/configs
 * Create a new AI model configuration
 */
router.post('/configs', (req, res) => controller.createModelConfig(req, res));

/**
 * PUT /api/ai-models/configs/:id
 * Update an existing AI model configuration
 */
router.put('/configs/:id', (req, res) => controller.updateModelConfig(req, res));

/**
 * DELETE /api/ai-models/configs/:id
 * Delete (soft delete) an AI model configuration
 */
router.delete('/configs/:id', (req, res) => controller.deleteModelConfig(req, res));

// ==================== TESTING & UTILITIES ====================

/**
 * POST /api/ai-models/test
 * Test an AI model connection before saving
 */
router.post('/test', (req, res) => controller.testModelConnection(req, res));

/**
 * GET /api/ai-models/configs/:id/usage
 * Get usage statistics for a specific model
 */
router.get('/configs/:id/usage', (req, res) => controller.getModelUsageStats(req, res));

export default router;
