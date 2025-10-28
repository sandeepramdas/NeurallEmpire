import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Agent } from '@prisma/client';
import { logger } from '@/infrastructure/logger';

/**
 * Agent Executor Service
 * Connects agents to actual AI providers and executes them
 * Supports: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google (Gemini)
 */

interface AIExecutionResult {
  success: boolean;
  output: any;
  metrics: any;
  error?: string;
}

export class AgentExecutorService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Execute agent with Anthropic Claude
   */
  async executeWithClaude(
    agent: Agent,
    userMessage: string,
    context?: any
  ): Promise<AIExecutionResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      // Build messages array
      const messages: any[] = [];

      // Add context if provided
      if (context) {
        messages.push({
          role: 'user',
          content: `Context:\n${JSON.stringify(context, null, 2)}\n\nUser Message: ${userMessage}`
        });
      } else {
        messages.push({
          role: 'user',
          content: userMessage
        });
      }

      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: agent.model || 'claude-3-sonnet-20240229',
        max_tokens: agent.maxTokens || 4096,
        temperature: agent.temperature || 0.7,
        system: agent.systemPrompt,
        messages
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: response.content[0].type === 'text' ? response.content[0].text : '',
          role: response.role,
          stopReason: response.stop_reason
        },
        metrics: {
          duration,
          tokens: {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
            total: response.usage.input_tokens + response.usage.output_tokens
          },
          model: response.model,
          cost: this.calculateClaudeCost(response.model, response.usage)
        }
      };
    } catch (error: any) {
      logger.error('Claude execution error:', error);
      return {
        success: false,
        output: null,
        metrics: {},
        error: error.message || 'Claude execution failed'
      };
    }
  }

  /**
   * Execute agent with Google Gemini
   */
  async executeWithGemini(
    agent: Agent,
    userMessage: string,
    context?: any
  ): Promise<AIExecutionResult> {
    // Check if Google AI API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Google AI API key not configured');
    }

    try {
      const startTime = Date.now();

      // Build prompt with system prompt and context
      let fullPrompt = `${agent.systemPrompt}\n\n`;
      if (context) {
        fullPrompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
      }
      fullPrompt += `User: ${userMessage}`;

      // Make request to Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${agent.model || 'gemini-pro'}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
              temperature: agent.temperature || 0.7,
              maxOutputTokens: agent.maxTokens || 2048,
              topP: agent.topP || 1.0
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      const outputText = (data as any).candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokenCount = (data as any).usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

      return {
        success: true,
        output: {
          message: outputText,
          role: 'assistant',
          finishReason: (data as any).candidates?.[0]?.finishReason
        },
        metrics: {
          duration,
          tokens: {
            prompt: tokenCount.promptTokenCount,
            completion: tokenCount.candidatesTokenCount,
            total: tokenCount.totalTokenCount
          },
          model: agent.model || 'gemini-pro',
          cost: this.calculateGeminiCost(agent.model || 'gemini-pro', tokenCount)
        }
      };
    } catch (error: any) {
      logger.error('Gemini execution error:', error);
      return {
        success: false,
        output: null,
        metrics: {},
        error: error.message || 'Gemini execution failed'
      };
    }
  }

  /**
   * Execute agent with OpenAI
   */
  async executeWithOpenAI(
    agent: Agent,
    userMessage: string,
    context?: any
  ): Promise<AIExecutionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content: agent.systemPrompt
        }
      ];

      // Add context if provided
      if (context) {
        messages.push({
          role: 'system',
          content: `Additional Context:\n${JSON.stringify(context, null, 2)}`
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      const startTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model: agent.model || 'gpt-4',
        messages,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
        top_p: agent.topP || 1.0,
        frequency_penalty: agent.frequencyPenalty || 0,
        presence_penalty: agent.presencePenalty || 0
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: {
          message: response.choices[0].message.content,
          role: response.choices[0].message.role,
          finishReason: response.choices[0].finish_reason
        },
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
      logger.error('OpenAI execution error:', error);
      return {
        success: false,
        output: null,
        metrics: {},
        error: error.message || 'OpenAI execution failed'
      };
    }
  }

  /**
   * Execute agent based on model type
   */
  async execute(
    agent: Agent,
    input: any
  ): Promise<AIExecutionResult> {
    // Extract user message from input
    const userMessage = typeof input === 'string'
      ? input
      : input.userMessage || input.message || JSON.stringify(input);

    const context = typeof input === 'object' ? input.context : undefined;

    // Route to appropriate AI provider based on model
    const model = agent.model?.toLowerCase() || '';

    try {
      // OpenAI models
      if (model.includes('gpt') || model.includes('openai')) {
        return await this.executeWithOpenAI(agent, userMessage, context);
      }

      // Anthropic Claude models
      if (model.includes('claude')) {
        return await this.executeWithClaude(agent, userMessage, context);
      }

      // Google Gemini models
      if (model.includes('gemini')) {
        return await this.executeWithGemini(agent, userMessage, context);
      }

      // Default to OpenAI if no specific provider detected
      if (this.openai) {
        logger.warn(`Unknown model ${agent.model}, defaulting to OpenAI`);
        return await this.executeWithOpenAI(agent, userMessage, context);
      }

      return {
        success: false,
        output: null,
        metrics: {},
        error: `Unsupported model: ${agent.model}`
      };
    } catch (error: any) {
      logger.error('Agent execution error:', error);
      return {
        success: false,
        output: null,
        metrics: {},
        error: error.message || 'Agent execution failed'
      };
    }
  }

  /**
   * Calculate approximate cost for OpenAI models
   */
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;

    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    const promptCost = (usage.prompt_tokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Calculate approximate cost for Anthropic Claude models
   */
  private calculateClaudeCost(model: string, usage: any): number {
    if (!usage) return 0;

    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 }, // per 1K tokens
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      'claude-2.1': { input: 0.008, output: 0.024 },
      'claude-2.0': { input: 0.008, output: 0.024 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-sonnet-20240229'];

    const inputCost = (usage.input_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.output_tokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Calculate approximate cost for Google Gemini models
   */
  private calculateGeminiCost(model: string, usage: any): number {
    if (!usage) return 0;

    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-pro': { input: 0.00025, output: 0.0005 }, // per 1K tokens
      'gemini-pro-vision': { input: 0.00025, output: 0.0005 },
      'gemini-ultra': { input: 0.001, output: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gemini-pro'];

    const inputCost = ((usage.promptTokenCount || 0) / 1000) * modelPricing.input;
    const outputCost = ((usage.candidatesTokenCount || 0) / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }
}

export const agentExecutor = new AgentExecutorService();
