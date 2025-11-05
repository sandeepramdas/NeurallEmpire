/**
 * ==================== AI VIDEO AGENT ROUTES ====================
 *
 * API endpoints for managing AI Video Agents with voice and visual interactions
 *
 * Features:
 * - Create, read, update, delete video agents
 * - Configure avatars, voices, and STT/TTS
 * - Manage video agent sessions
 * - Track analytics and performance
 *
 * @module routes/video-agents
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { VideoAgentsController } from '../controllers/video-agents.controller';

const router = express.Router();
const controller = new VideoAgentsController();

// All routes require authentication
router.use(authenticate);

// ==================== VIDEO AGENT MANAGEMENT ====================

/**
 * GET /api/video-agents
 * Get all video agents for organization
 */
router.get('/', (req, res) => controller.getVideoAgents(req, res));

/**
 * GET /api/video-agents/:id
 * Get a specific video agent by ID
 */
router.get('/:id', (req, res) => controller.getVideoAgent(req, res));

/**
 * POST /api/video-agents
 * Create a new video agent
 */
router.post('/', (req, res) => controller.createVideoAgent(req, res));

/**
 * PUT /api/video-agents/:id
 * Update a video agent
 */
router.put('/:id', (req, res) => controller.updateVideoAgent(req, res));

/**
 * DELETE /api/video-agents/:id
 * Delete a video agent
 */
router.delete('/:id', (req, res) => controller.deleteVideoAgent(req, res));

// ==================== ANALYTICS ====================

/**
 * GET /api/video-agents/:id/analytics
 * Get analytics for a specific video agent
 */
router.get('/:id/analytics', (req, res) => controller.getVideoAgentAnalytics(req, res));

export default router;
