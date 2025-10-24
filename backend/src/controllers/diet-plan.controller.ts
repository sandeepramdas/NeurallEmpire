import { Request, Response } from 'express';
import { prisma } from '@/server';
import { dietPlanService } from '@/services/diet-plan.service';
import { AuthenticatedRequest } from '@/types';
import { logger } from '@/infrastructure/logger';

type AuthRequest = AuthenticatedRequest;

/**
 * Diet Plan Controller
 * Handles CRUD operations and AI generation for patient diet plans
 */
class DietPlanController {
  /**
   * Get all diet plans for the organization
   */
  async getDietPlans(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Organization not found'
        });
      }

      const { status, limit = 50, offset = 0 } = req.query;

      const where: any = { organizationId };
      if (status) {
        where.status = status;
      }

      const [dietPlans, total] = await Promise.all([
        prisma.patientDietPlan.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.patientDietPlan.count({ where })
      ]);

      res.json({
        success: true,
        data: dietPlans,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset)
        }
      });
    } catch (error: any) {
      logger.error('Error fetching diet plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diet plans',
        error: error.message
      });
    }
  }

  /**
   * Get a single diet plan by ID
   */
  async getDietPlan(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId;
      const { id } = req.params;

      const dietPlan = await prisma.patientDietPlan.findFirst({
        where: {
          id,
          organizationId: organizationId!
        }
      });

      if (!dietPlan) {
        return res.status(404).json({
          success: false,
          message: 'Diet plan not found'
        });
      }

      res.json({
        success: true,
        data: dietPlan
      });
    } catch (error: any) {
      logger.error('Error fetching diet plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch diet plan',
        error: error.message
      });
    }
  }

  /**
   * Generate and create a new diet plan using AI
   */
  async generateDietPlan(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId;
      const userId = authReq.user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        patientName,
        patientAge,
        patientGender,
        disease,
        allergies,
        medications,
        dietaryRestrictions,
        numberOfDays = 7,
        mealsPerDay = 3,
        notes,
        specialInstructions,
        companyId,
        model = 'gpt-4',
        aiModelConfigId
      } = req.body;

      // Validation
      if (!patientName || !disease) {
        return res.status(400).json({
          success: false,
          message: 'Patient name and disease are required'
        });
      }

      // Generate diet plan using AI
      logger.info(`🔄 Generating ${numberOfDays}-day diet plan for patient:`, patientName);
      const result = await dietPlanService.generateDietPlan({
        patientName,
        patientAge,
        patientGender,
        disease,
        allergies,
        medications,
        dietaryRestrictions,
        numberOfDays,
        mealsPerDay,
        specialInstructions,
        model,
        aiModelConfigId
      });

      if (!result.success || !result.dietPlan) {
        logger.error('❌ Diet plan generation failed:', result.error);
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate diet plan'
        });
      }

      logger.info('✅ Diet plan generated successfully');

      // Calculate validity period
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + numberOfDays);

      // Save to database
      const dietPlan = await prisma.patientDietPlan.create({
        data: {
          organizationId,
          companyId: companyId || null,
          patientName,
          patientAge,
          patientGender,
          disease,
          allergies: allergies || [],
          medications: medications || [],
          dietaryRestrictions: dietaryRestrictions || [],
          timespan: `${numberOfDays} days`,
          customDays: numberOfDays,
          mealsPerDay,
          dietPlan: result.dietPlan,
          notes,
          specialInstructions,
          model,
          generatedBy: userId,
          generationTokens: result.metrics,
          validUntil,
          status: 'active',
          aiModelConfigId: aiModelConfigId || null
        }
      });

      res.status(201).json({
        success: true,
        data: dietPlan,
        message: 'Diet plan generated successfully'
      });
    } catch (error: any) {
      logger.error('Error generating diet plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate diet plan',
        error: error.message
      });
    }
  }

  /**
   * Update diet plan status
   */
  async updateDietPlanStatus(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId;
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'completed', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, completed, or archived'
        });
      }

      const dietPlan = await prisma.patientDietPlan.updateMany({
        where: {
          id,
          organizationId: organizationId!
        },
        data: { status }
      });

      if (dietPlan.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Diet plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Diet plan status updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating diet plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update diet plan',
        error: error.message
      });
    }
  }

  /**
   * Delete a diet plan
   */
  async deleteDietPlan(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId;
      const { id } = req.params;

      const deleted = await prisma.patientDietPlan.deleteMany({
        where: {
          id,
          organizationId: organizationId!
        }
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Diet plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Diet plan deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting diet plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete diet plan',
        error: error.message
      });
    }
  }
}

export const dietPlanController = new DietPlanController();
