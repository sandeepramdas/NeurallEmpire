import { Request, Response } from 'express';
import { logger } from '@/infrastructure/logger';

interface ModelTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  useCase: string;
  recommendedProviders: string[];
  defaultConfig: {
    maxTokens: number;
    temperature: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  capabilities: Record<string, boolean>;
  supportedTasks: string[];
  tags: string[];
  examplePrompt?: string;
}

const MODEL_TEMPLATES: ModelTemplate[] = [
  {
    id: 'diet-nutritionist',
    name: 'Diet & Nutrition Assistant',
    category: 'Healthcare',
    description: 'Optimized for creating personalized diet plans, nutritional analysis, and meal recommendations',
    icon: '🥗',
    color: '#10b981',
    useCase: 'Generate detailed diet plans with calorie tracking, macro distribution, and meal suggestions based on patient health profiles',
    recommendedProviders: ['openai', 'anthropic', 'google'],
    defaultConfig: {
      maxTokens: 6000,
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.2,
    },
    capabilities: {
      longContext: true,
      structuredOutput: true,
      healthcare: true,
    },
    supportedTasks: ['diet-plan-generation', 'nutritional-analysis', 'meal-planning'],
    tags: ['nutrition', 'healthcare', 'diet', 'wellness'],
    examplePrompt: 'Create a 7-day diet plan for a patient with diabetes, considering their calorie needs and dietary restrictions',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    category: 'Marketing',
    description: 'Creative content generation for blogs, articles, social media, and marketing copy',
    icon: '✍️',
    color: '#8b5cf6',
    useCase: 'Generate engaging blog posts, marketing copy, product descriptions, and social media content',
    recommendedProviders: ['anthropic', 'openai', 'cohere'],
    defaultConfig: {
      maxTokens: 4000,
      temperature: 0.85,
      topP: 0.95,
      frequencyPenalty: 0.5,
      presencePenalty: 0.3,
    },
    capabilities: {
      creative: true,
      longForm: true,
      multiLanguage: false,
    },
    supportedTasks: ['blog-writing', 'copywriting', 'social-media', 'seo-content'],
    tags: ['content', 'marketing', 'creative', 'writing'],
    examplePrompt: 'Write a compelling 1000-word blog post about AI trends in healthcare',
  },
  {
    id: 'data-analyst',
    name: 'Data Analysis Assistant',
    category: 'Analytics',
    description: 'Analyze data patterns, generate insights, create visualizations, and provide statistical analysis',
    icon: '📊',
    color: '#3b82f6',
    useCase: 'Perform data analysis, statistical calculations, trend identification, and generate actionable business insights',
    recommendedProviders: ['openai', 'anthropic', 'google'],
    defaultConfig: {
      maxTokens: 8000,
      temperature: 0.3,
      topP: 0.8,
      frequencyPenalty: 0.1,
      presencePenalty: 0.0,
    },
    capabilities: {
      analytical: true,
      codeGeneration: true,
      structuredOutput: true,
    },
    supportedTasks: ['data-analysis', 'statistics', 'visualization', 'reporting'],
    tags: ['analytics', 'data', 'insights', 'reporting'],
    examplePrompt: 'Analyze sales data trends over the last quarter and identify key growth opportunities',
  },
  {
    id: 'customer-support',
    name: 'Customer Support Chatbot',
    category: 'Support',
    description: 'Intelligent customer support with FAQ handling, troubleshooting, and ticket management',
    icon: '💬',
    color: '#f59e0b',
    useCase: 'Handle customer inquiries, provide product information, troubleshoot issues, and escalate when needed',
    recommendedProviders: ['anthropic', 'openai', 'mistral'],
    defaultConfig: {
      maxTokens: 2000,
      temperature: 0.5,
      topP: 0.85,
      frequencyPenalty: 0.2,
      presencePenalty: 0.1,
    },
    capabilities: {
      conversational: true,
      contextAware: true,
      empathetic: true,
    },
    supportedTasks: ['customer-support', 'faq', 'troubleshooting', 'ticket-routing'],
    tags: ['support', 'chatbot', 'customer-service', 'helpdesk'],
    examplePrompt: 'Help a customer troubleshoot login issues and guide them through password reset',
  },
  {
    id: 'code-assistant',
    name: 'Code Generation Assistant',
    category: 'Development',
    description: 'Generate, review, and debug code across multiple programming languages',
    icon: '💻',
    color: '#ec4899',
    useCase: 'Write code snippets, debug errors, explain code logic, and provide best practices for software development',
    recommendedProviders: ['anthropic', 'openai', 'mistral'],
    defaultConfig: {
      maxTokens: 8000,
      temperature: 0.2,
      topP: 0.9,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    },
    capabilities: {
      codeGeneration: true,
      multiLanguage: true,
      debugging: true,
    },
    supportedTasks: ['code-generation', 'debugging', 'code-review', 'documentation'],
    tags: ['coding', 'programming', 'development', 'debugging'],
    examplePrompt: 'Write a React component for a user authentication form with validation',
  },
  {
    id: 'translator',
    name: 'Language Translator',
    category: 'Localization',
    description: 'Accurate translation across 100+ languages with cultural context awareness',
    icon: '🌍',
    color: '#06b6d4',
    useCase: 'Translate content while preserving tone, context, and cultural nuances for global audiences',
    recommendedProviders: ['google', 'openai', 'anthropic'],
    defaultConfig: {
      maxTokens: 4000,
      temperature: 0.3,
      topP: 0.85,
      frequencyPenalty: 0.1,
      presencePenalty: 0.0,
    },
    capabilities: {
      multiLanguage: true,
      culturalAwareness: true,
      contextPreserving: true,
    },
    supportedTasks: ['translation', 'localization', 'cultural-adaptation'],
    tags: ['translation', 'language', 'localization', 'multilingual'],
    examplePrompt: 'Translate this marketing email to Spanish, French, and German while maintaining brand voice',
  },
  {
    id: 'research-assistant',
    name: 'Research & Summarization',
    category: 'Research',
    description: 'Comprehensive research, document analysis, and intelligent summarization',
    icon: '🔍',
    color: '#f97316',
    useCase: 'Analyze research papers, summarize long documents, extract key insights, and synthesize information',
    recommendedProviders: ['anthropic', 'openai', 'google'],
    defaultConfig: {
      maxTokens: 8000,
      temperature: 0.4,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.1,
    },
    capabilities: {
      longContext: true,
      analytical: true,
      structuredOutput: true,
    },
    supportedTasks: ['research', 'summarization', 'analysis', 'synthesis'],
    tags: ['research', 'analysis', 'summarization', 'insights'],
    examplePrompt: 'Summarize the key findings from this 50-page research report on renewable energy',
  },
  {
    id: 'education-tutor',
    name: 'Educational Tutor',
    category: 'Education',
    description: 'Personalized tutoring, concept explanation, and adaptive learning assistance',
    icon: '🎓',
    color: '#a855f7',
    useCase: 'Explain complex concepts, provide step-by-step guidance, create practice problems, and adapt to learning pace',
    recommendedProviders: ['anthropic', 'openai', 'google'],
    defaultConfig: {
      maxTokens: 4000,
      temperature: 0.6,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.2,
    },
    capabilities: {
      educational: true,
      adaptive: true,
      patient: true,
    },
    supportedTasks: ['tutoring', 'explanation', 'practice-problems', 'feedback'],
    tags: ['education', 'tutoring', 'learning', 'teaching'],
    examplePrompt: 'Explain quantum mechanics concepts to a high school student with practical examples',
  },
];

export class ModelTemplatesController {
  /**
   * Get all available model templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const { category } = req.query;

      let templates = MODEL_TEMPLATES;

      // Filter by category if provided
      if (category && typeof category === 'string') {
        templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase());
      }

      res.json({
        success: true,
        templates,
        categories: [...new Set(MODEL_TEMPLATES.map(t => t.category))],
      });
    } catch (error: any) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch model templates',
      });
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = MODEL_TEMPLATES.find(t => t.id === id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        template,
      });
    } catch (error: any) {
      logger.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch template',
      });
    }
  }

  /**
   * Get recommended providers for a template
   */
  async getTemplateProviders(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = MODEL_TEMPLATES.find(t => t.id === id);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      res.json({
        success: true,
        recommendedProviders: template.recommendedProviders,
        defaultConfig: template.defaultConfig,
      });
    } catch (error: any) {
      logger.error('Error fetching template providers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch template providers',
      });
    }
  }
}

export const modelTemplatesController = new ModelTemplatesController();
