import OpenAI from 'openai';
import { logger } from '@/infrastructure/logger';
import { prisma } from '@/server';
import { decrypt } from '@/utils/encryption';

/**
 * Diet Plan Generator Service
 * Uses OpenAI GPT to generate personalized diet plans based on patient conditions
 */
export class DietPlanService {
  private openai: OpenAI | null = null;

  constructor() {
    // OpenAI client will be initialized per-request with the configured AI model
    logger.info('✅ DietPlanService initialized');
  }

  /**
   * Get OpenAI client with API key from AI model config or environment
   */
  private async getOpenAIClient(aiModelConfigId?: string): Promise<OpenAI> {
    let apiKey: string | undefined;

    // Try to get API key from AI model config first
    if (aiModelConfigId) {
      try {
        const modelConfig = await prisma.aIModelConfig.findUnique({
          where: { id: aiModelConfigId },
          include: { provider: true }
        });

        if (modelConfig && modelConfig.apiKeyEncrypted) {
          apiKey = decrypt(modelConfig.apiKeyEncrypted);
          logger.info('✅ Using API key from AI model config:', modelConfig.displayName);
        }
      } catch (error) {
        logger.error('Error fetching AI model config:', error);
      }
    }

    // Fallback to environment variable
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey !== 'your_openai_api_key_here' && !apiKey.includes('placeholder')) {
        logger.info('✅ Using API key from environment variable');
      } else {
        throw new Error('OpenAI API key not configured. Please configure an AI model or set OPENAI_API_KEY environment variable.');
      }
    }

    return new OpenAI({ apiKey });
  }

  /**
   * Generate a personalized diet plan using GPT
   */
  async generateDietPlan(params: {
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    disease: string;
    allergies?: string[];
    medications?: string[];
    dietaryRestrictions?: string[];
    numberOfDays: number;
    mealsPerDay: number;
    specialInstructions?: string;
    model?: string;
    aiModelConfigId?: string;
  }): Promise<{
    success: boolean;
    dietPlan?: any;
    metrics?: any;
    error?: string
  }> {
    try {
      const {
        patientName,
        patientAge,
        patientGender,
        disease,
        allergies = [],
        medications = [],
        dietaryRestrictions = [],
        numberOfDays,
        mealsPerDay,
        specialInstructions,
        model = 'gpt-4',
        aiModelConfigId
      } = params;

      // Get OpenAI client with configured API key
      const openai = await this.getOpenAIClient(aiModelConfigId);

      // Get model ID from config if provided
      let modelToUse = model;
      if (aiModelConfigId) {
        try {
          const modelConfig = await prisma.aIModelConfig.findUnique({
            where: { id: aiModelConfigId }
          });
          if (modelConfig) {
            modelToUse = modelConfig.modelId;
            logger.info('✅ Using model from config:', modelToUse);
          }
        } catch (error) {
          logger.warn('Could not fetch model ID from config, using default');
        }
      }

      // Build the system prompt
      const systemPrompt = `You are an expert nutritionist and dietitian specializing in medical nutrition therapy.
Your role is to create personalized, evidence-based diet plans for patients with various medical conditions.

Guidelines:
- Always consider the patient's medical condition and provide scientifically-backed dietary recommendations
- Account for food allergies, medications, and dietary restrictions
- Ensure balanced nutrition with appropriate macronutrients and micronutrients
- Provide practical, easy-to-follow meal suggestions
- Include portion sizes and nutritional information when relevant
- Add notes about food-medication interactions if applicable
- Be culturally sensitive and offer diverse food options`;

      // Build the user prompt
      const userPrompt = `Create a comprehensive diet plan for the following patient:

Patient Information:
- Name: ${patientName}
${patientAge ? `- Age: ${patientAge} years` : ''}
${patientGender ? `- Gender: ${patientGender}` : ''}
- Primary Medical Condition: ${disease}
${allergies.length > 0 ? `- Allergies: ${allergies.join(', ')}` : ''}
${medications.length > 0 ? `- Current Medications: ${medications.join(', ')}` : ''}
${dietaryRestrictions.length > 0 ? `- Dietary Restrictions: ${dietaryRestrictions.join(', ')}` : ''}
${specialInstructions ? `- Special Instructions: ${specialInstructions}` : ''}

Plan Requirements:
- Duration: EXACTLY ${numberOfDays} days (you MUST provide meal plans for all ${numberOfDays} days)
- Meals per day: EXACTLY ${mealsPerDay} meals for EACH day
- Total meals to generate: ${numberOfDays * mealsPerDay} meals (${numberOfDays} days × ${mealsPerDay} meals/day)

IMPORTANT: The "dailyPlans" array MUST contain EXACTLY ${numberOfDays} day objects, and each day MUST have EXACTLY ${mealsPerDay} meal objects.

Please provide a detailed diet plan in the following JSON format:
{
  "summary": {
    "title": "Diet Plan Title",
    "description": "Brief overview of the diet plan approach",
    "keyRecommendations": ["recommendation 1", "recommendation 2", ...],
    "nutritionGoals": {
      "calories": "daily calorie target",
      "protein": "daily protein target",
      "carbs": "daily carbs target",
      "fats": "daily fats target"
    }
  },
  "dailyPlans": [
    {
      "day": 1,
      "date": "Day 1",
      "meals": [
        {
          "mealType": "Breakfast/Lunch/Dinner/Snack",
          "time": "suggested time",
          "name": "meal name",
          "ingredients": ["ingredient 1", "ingredient 2", ...],
          "preparation": "brief preparation instructions",
          "nutrition": {
            "calories": "approximate calories",
            "protein": "protein content",
            "carbs": "carbs content",
            "fats": "fats content"
          },
          "notes": "any special notes or warnings"
        }
      ],
      "hydration": "daily water intake recommendation",
      "supplements": ["any recommended supplements"]
    }
  ],
  "foodsToAvoid": ["food 1", "food 2", ...],
  "foodsToEmphasize": ["food 1", "food 2", ...],
  "lifestyleRecommendations": ["tip 1", "tip 2", ...],
  "medicationInteractions": ["any relevant food-medication interactions"],
  "emergencyContacts": "when to consult healthcare provider"
}

Provide ONLY the JSON response, no additional text.`;

      const startTime = Date.now();

      // Use gpt-4o-mini as default if gpt-4 is selected (better and cheaper)
      if (modelToUse === 'gpt-4') {
        modelToUse = 'gpt-4o-mini';
      }

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const duration = Date.now() - startTime;

      // Parse the response
      const dietPlanText = response.choices[0].message.content;
      const dietPlan = dietPlanText ? JSON.parse(dietPlanText) : null;

      return {
        success: true,
        dietPlan,
        metrics: {
          duration,
          tokens: {
            prompt: response.usage?.prompt_tokens,
            completion: response.usage?.completion_tokens,
            total: response.usage?.total_tokens
          },
          model: response.model,
          cost: this.calculateCost(response.model, response.usage)
        }
      };
    } catch (error: any) {
      logger.error('Diet plan generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate diet plan'
      };
    }
  }

  /**
   * Calculate approximate cost based on token usage
   */
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;

    // Approximate costs per 1K tokens (as of 2024)
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const modelCost = costs[model] || costs['gpt-4'];
    const inputCost = (usage.prompt_tokens / 1000) * modelCost.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCost.output;

    return Number((inputCost + outputCost).toFixed(4));
  }
}

export const dietPlanService = new DietPlanService();
