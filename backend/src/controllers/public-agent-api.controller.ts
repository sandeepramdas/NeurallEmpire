import { Request, Response } from 'express';
import { z } from 'zod';
import { agentService } from '@/services/agent.service';
import { logger } from '@/infrastructure/logger';

/**
 * Public Agent API Controller
 * Provides public API endpoints for external agent integrations
 * Requires API key authentication
 */

interface AuthenticatedRequest extends Request {
  apiKey?: any;
  agent?: any;
  organization?: any;
}

// Validation schemas
const executeAgentSchema = z.object({
  input: z.any(),
  context: z.any().optional(),
  metadata: z.object({}).passthrough().optional()
});

const chatAgentSchema = z.object({
  message: z.string().min(1),
  context: z.any().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional()
});

export class PublicAgentAPIController {
  /**
   * Execute an agent
   * POST /api/public/agents/:agentId/execute
   */
  async executeAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { agentId } = req.params;

      // Verify agent matches API key
      if (req.agent.id !== agentId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'API key is not authorized for this agent'
        });
      }

      // Validate request body
      const validatedData = executeAgentSchema.parse(req.body);

      // Execute agent
      const result = await agentService.executeAgent(agentId, validatedData.input);

      if (result.success) {
        res.json({
          success: true,
          data: {
            output: result.output,
            metrics: result.metrics
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Agent execution failed'
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Execute agent error:', error);
      res.status(500).json({
        error: 'Execution failed',
        message: error.message || 'Failed to execute agent'
      });
    }
  }

  /**
   * Chat with an agent
   * POST /api/public/agents/:agentId/chat
   */
  async chatWithAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { agentId } = req.params;

      // Verify agent matches API key
      if (req.agent.id !== agentId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'API key is not authorized for this agent'
        });
      }

      // Validate request body
      const validatedData = chatAgentSchema.parse(req.body);

      // Execute agent with RAG context if userId provided
      let result;
      if (validatedData.userId) {
        result = await agentService.executeWithRAGContext(
          agentId,
          validatedData.userId,
          validatedData.message,
          {
            includeKnowledge: true,
            includeConversations: true,
            includeCode: false
          }
        );
      } else {
        // Execute without RAG context
        result = await agentService.executeAgent(agentId, {
          userMessage: validatedData.message,
          context: validatedData.context
        });
      }

      if (result.success) {
        res.json({
          success: true,
          data: {
            message: result.output?.message || result.output,
            conversationId: validatedData.conversationId,
            metrics: result.metrics
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Chat failed'
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Chat with agent error:', error);
      res.status(500).json({
        error: 'Chat failed',
        message: error.message || 'Failed to chat with agent'
      });
    }
  }

  /**
   * Get agent status
   * GET /api/public/agents/:agentId/status
   */
  async getAgentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { agentId } = req.params;

      // Verify agent matches API key
      if (req.agent.id !== agentId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'API key is not authorized for this agent'
        });
      }

      const status = await agentService.getAgentStatus(agentId);

      res.json({
        success: true,
        data: {
          id: status.id,
          name: status.name,
          status: status.status,
          isRunning: status.isRunning,
          lastUsedAt: status.lastUsedAt,
          usageCount: status.usageCount,
          successRate: status.successRate,
          avgResponseTime: status.avgResponseTime
        }
      });
    } catch (error: any) {
      logger.error('Get agent status error:', error);
      res.status(500).json({
        error: 'Failed to get status',
        message: error.message || 'Failed to get agent status'
      });
    }
  }

  /**
   * Submit feedback for agent response
   * POST /api/public/agents/:agentId/feedback
   */
  async submitFeedback(req: AuthenticatedRequest, res: Response) {
    try {
      const { agentId } = req.params;
      const { interactionId, rating, comment } = req.body;

      // Verify agent matches API key
      if (req.agent.id !== agentId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'API key is not authorized for this agent'
        });
      }

      // Validate input
      if (!interactionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: 'Invalid feedback',
          message: 'interactionId and rating (1-5) are required'
        });
      }

      // Store feedback (you can extend this with a Feedback model)
      logger.info(`Feedback received for agent ${agentId}, interaction ${interactionId}: ${rating}/5`);

      res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error: any) {
      logger.error('Submit feedback error:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
        message: error.message || 'Failed to submit feedback'
      });
    }
  }

  /**
   * Test agent endpoint (does not consume credits)
   * POST /api/public/agents/:agentId/test
   */
  async testAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const { agentId } = req.params;
      const { message } = req.body;

      // Verify agent matches API key
      if (req.agent.id !== agentId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'API key is not authorized for this agent'
        });
      }

      if (!message) {
        return res.status(400).json({
          error: 'Missing message',
          message: 'Test message is required'
        });
      }

      // Execute agent (you could add a flag to mark this as a test execution)
      const result = await agentService.executeAgent(agentId, {
        userMessage: message,
        isTest: true
      });

      res.json({
        success: true,
        data: {
          output: result.output,
          metrics: result.metrics,
          note: 'This is a test execution and does not count towards usage limits'
        }
      });
    } catch (error: any) {
      logger.error('Test agent error:', error);
      res.status(500).json({
        error: 'Test failed',
        message: error.message || 'Failed to test agent'
      });
    }
  }
}

export const publicAgentAPIController = new PublicAgentAPIController();
