import OpenAI from 'openai';
import { Agent } from '@prisma/client';

/**
 * Agent Executor Service
 * Connects agents to actual AI providers and executes them
 */

export class AgentExecutorService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Execute agent with OpenAI
   */
  async executeWithOpenAI(
    agent: Agent,
    userMessage: string,
    context?: any
  ): Promise<{ success: boolean; output: any; metrics: any; error?: string }> {
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
      console.error('OpenAI execution error:', error);
      return {
        success: false,
        output: null,
        metrics: {},
        error: error.message || 'OpenAI execution failed'
      };
    }
  }

  /**
   * Execute agent based on type
   */
  async execute(
    agent: Agent,
    input: any
  ): Promise<{ success: boolean; output: any; metrics: any; error?: string }> {
    // Extract user message from input
    const userMessage = typeof input === 'string'
      ? input
      : input.userMessage || input.message || JSON.stringify(input);

    const context = typeof input === 'object' ? input.context : undefined;

    // Execute based on agent configuration
    if (agent.model?.includes('gpt')) {
      return await this.executeWithOpenAI(agent, userMessage, context);
    }

    // Fallback for other types
    return {
      success: false,
      output: null,
      metrics: {},
      error: 'Unsupported model or configuration'
    };
  }

  /**
   * Calculate approximate cost based on model and tokens
   */
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;

    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];

    const promptCost = (usage.prompt_tokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPricing.completion;

    return promptCost + completionCost;
  }
}

export const agentExecutor = new AgentExecutorService();
