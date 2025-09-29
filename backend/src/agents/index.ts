// Elite Eight Agent Types - Specialized implementations
export * from './lead-generator.agent';
export * from './email-marketer.agent';
export * from './social-media.agent';
export * from './content-creator.agent';
export * from './analytics.agent';
export * from './customer-service.agent';
export * from './sales.agent';
export * from './seo-optimizer.agent';

// Agent factory for creating specialized agent instances
import { AgentType } from '@prisma/client';
import { LeadGeneratorAgent } from './lead-generator.agent';
import { EmailMarketerAgent } from './email-marketer.agent';
import { SocialMediaAgent } from './social-media.agent';
import { ContentCreatorAgent } from './content-creator.agent';
import { AnalyticsAgent } from './analytics.agent';
import { CustomerServiceAgent } from './customer-service.agent';
import { SalesAgent } from './sales.agent';
import { SEOOptimizerAgent } from './seo-optimizer.agent';

export interface AgentExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    duration: number;
    resourceUsage: any;
    apiCalls?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

export abstract class BaseAgent {
  constructor(
    public readonly id: string,
    public readonly type: AgentType,
    public readonly config: any
  ) {}

  abstract execute(input?: any): Promise<AgentExecutionResult>;

  protected createSuccessResult(output: any, metrics?: any): AgentExecutionResult {
    return {
      success: true,
      output,
      metrics: {
        duration: metrics?.duration || 0,
        resourceUsage: metrics?.resourceUsage || {},
        apiCalls: metrics?.apiCalls || 0,
        memoryUsage: metrics?.memoryUsage || 0,
        cpuUsage: metrics?.cpuUsage || 0,
      },
    };
  }

  protected createErrorResult(error: string, metrics?: any): AgentExecutionResult {
    return {
      success: false,
      error,
      metrics: {
        duration: metrics?.duration || 0,
        resourceUsage: metrics?.resourceUsage || {},
        apiCalls: metrics?.apiCalls || 0,
        memoryUsage: metrics?.memoryUsage || 0,
        cpuUsage: metrics?.cpuUsage || 0,
      },
    };
  }

  protected simulateApiCall(delay: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay + Math.random() * delay));
  }

  protected generateMetrics(startTime: number, apiCalls: number = 1): any {
    const duration = Date.now() - startTime;
    return {
      duration,
      resourceUsage: {
        processingTime: duration,
        memoryPeak: Math.random() * 100 + 50, // MB
        cpuPeak: Math.random() * 50 + 20, // %
      },
      apiCalls,
      memoryUsage: Math.random() * 100 + 50,
      cpuUsage: Math.random() * 50 + 20,
    };
  }
}

export class AgentFactory {
  static createAgent(id: string, type: AgentType, config: any): BaseAgent {
    switch (type) {
      case AgentType.LEAD_GENERATOR:
        return new LeadGeneratorAgent(id, type, config);
      case AgentType.EMAIL_MARKETER:
        return new EmailMarketerAgent(id, type, config);
      case AgentType.SOCIAL_MEDIA:
        return new SocialMediaAgent(id, type, config);
      case AgentType.CONTENT_CREATOR:
        return new ContentCreatorAgent(id, type, config);
      case AgentType.ANALYTICS:
        return new AnalyticsAgent(id, type, config);
      case AgentType.CUSTOMER_SERVICE:
        return new CustomerServiceAgent(id, type, config);
      case AgentType.SALES:
        return new SalesAgent(id, type, config);
      case AgentType.SEO_OPTIMIZER:
        return new SEOOptimizerAgent(id, type, config);
      default:
        throw new Error(`Unsupported agent type: ${type}`);
    }
  }
}