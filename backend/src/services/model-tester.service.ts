import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Model Connection Tester Service
 * Tests real API connectivity to various AI providers
 */
export class ModelTesterService {
  /**
   * Test OpenAI API connection
   */
  async testOpenAI(apiKey: string, modelId: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
  }> {
    try {
      const startTime = Date.now();

      const client = new OpenAI({ apiKey });

      // Make a minimal test request
      const response = await client.chat.completions.create({
        model: modelId || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5,
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `✅ Connected successfully to ${modelId || 'OpenAI'}`,
        latency,
        details: {
          model: response.model,
          tokensUsed: response.usage?.total_tokens,
        },
      };
    } catch (error: any) {
      console.error('OpenAI test error:', error);

      let message = '❌ Connection failed';

      if (error.status === 401) {
        message = '❌ Invalid API key';
      } else if (error.status === 429) {
        message = '❌ Rate limit exceeded';
      } else if (error.status === 404) {
        message = `❌ Model "${modelId}" not found`;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = '❌ Network error - cannot reach OpenAI servers';
      } else if (error.message) {
        message = `❌ ${error.message}`;
      }

      return {
        success: false,
        message,
        details: {
          error: error.message,
          status: error.status,
          code: error.code,
        },
      };
    }
  }

  /**
   * Test Anthropic API connection
   */
  async testAnthropic(apiKey: string, modelId: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
  }> {
    try {
      const startTime = Date.now();

      const client = new Anthropic({ apiKey });

      // Make a minimal test request
      const response = await client.messages.create({
        model: modelId || 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }],
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        message: `✅ Connected successfully to ${modelId || 'Claude'}`,
        latency,
        details: {
          model: response.model,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error: any) {
      console.error('Anthropic test error:', error);

      let message = '❌ Connection failed';

      if (error.status === 401) {
        message = '❌ Invalid API key';
      } else if (error.status === 429) {
        message = '❌ Rate limit exceeded';
      } else if (error.status === 404) {
        message = `❌ Model "${modelId}" not found`;
      } else if (error.message) {
        message = `❌ ${error.message}`;
      }

      return {
        success: false,
        message,
        details: {
          error: error.message,
          status: error.status,
        },
      };
    }
  }

  /**
   * Test Google AI API connection
   */
  async testGoogleAI(apiKey: string, modelId: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
  }> {
    try {
      const startTime = Date.now();

      const model = modelId || 'gemini-pro';
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      const latency = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return {
        success: true,
        message: `✅ Connected successfully to ${model}`,
        latency,
        details: {
          model,
          response: data.candidates?.[0]?.content?.parts?.[0]?.text,
        },
      };
    } catch (error: any) {
      console.error('Google AI test error:', error);

      let message = '❌ Connection failed';

      if (error.message?.includes('API_KEY_INVALID')) {
        message = '❌ Invalid API key';
      } else if (error.message?.includes('quota')) {
        message = '❌ Quota exceeded';
      } else if (error.message?.includes('not found')) {
        message = `❌ Model "${modelId}" not found`;
      } else if (error.message) {
        message = `❌ ${error.message}`;
      }

      return {
        success: false,
        message,
        details: { error: error.message },
      };
    }
  }

  /**
   * Test any provider based on provider code
   */
  async testProvider(
    providerCode: string,
    apiKey: string,
    modelId: string
  ): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    details?: any;
  }> {
    switch (providerCode) {
      case 'openai':
        return this.testOpenAI(apiKey, modelId);

      case 'anthropic':
        return this.testAnthropic(apiKey, modelId);

      case 'google':
        return this.testGoogleAI(apiKey, modelId);

      default:
        return {
          success: false,
          message: `❌ Provider "${providerCode}" testing not yet implemented`,
          details: {
            supportedProviders: ['openai', 'anthropic', 'google'],
          },
        };
    }
  }
}

export const modelTesterService = new ModelTesterService();
