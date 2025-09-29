import { z } from 'zod';
import { AgentType } from '@prisma/client';

// Base agent configuration schema
export const BaseAgentConfigSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  type: z.nativeEnum(AgentType),

  // General settings
  maxExecutionTime: z.number().min(1000).max(300000).default(30000), // 1s to 5min
  retryAttempts: z.number().min(0).max(5).default(3),
  priority: z.number().min(1).max(10).default(5),

  // Scheduling
  schedule: z.object({
    enabled: z.boolean().default(false),
    cron: z.string().optional(), // Cron expression
    timezone: z.string().default('UTC'),
  }).optional(),

  // Resource limits
  resources: z.object({
    maxCpuUsage: z.number().min(0).max(100).default(80), // percentage
    maxMemoryUsage: z.number().min(0).max(100).default(80), // percentage
    maxApiCalls: z.number().min(1).max(1000).default(100),
  }).optional(),
});

// Lead Generator Agent Configuration
export const LeadGeneratorConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.LEAD_GENERATOR),
  configuration: z.object({
    sources: z.array(z.enum(['website', 'social_media', 'linkedin', 'email', 'ads'])),
    targetCriteria: z.object({
      industries: z.array(z.string()).optional(),
      companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
      jobTitles: z.array(z.string()).optional(),
      location: z.string().optional(),
    }),
    leadQualification: z.object({
      minimumScore: z.number().min(0).max(100).default(50),
      scoringCriteria: z.array(z.string()),
    }),
    outputFormat: z.enum(['csv', 'json', 'crm']).default('json'),
    dailyLimit: z.number().min(1).max(1000).default(100),
  }),
});

// Email Marketing Agent Configuration
export const EmailMarketerConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.EMAIL_MARKETER),
  configuration: z.object({
    emailProvider: z.enum(['sendgrid', 'mailchimp', 'aws-ses', 'smtp']),
    templates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      subject: z.string(),
      content: z.string(),
      variables: z.array(z.string()).optional(),
    })),
    segmentation: z.object({
      enabled: z.boolean().default(true),
      criteria: z.array(z.string()),
    }),
    scheduling: z.object({
      sendTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      timezone: z.string().default('UTC'),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    }),
    tracking: z.object({
      opens: z.boolean().default(true),
      clicks: z.boolean().default(true),
      unsubscribes: z.boolean().default(true),
    }),
  }),
});

// Social Media Agent Configuration
export const SocialMediaConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.SOCIAL_MEDIA),
  configuration: z.object({
    platforms: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'youtube'])),
    postTypes: z.array(z.enum(['text', 'image', 'video', 'poll', 'story'])),
    contentGeneration: z.object({
      tone: z.enum(['professional', 'casual', 'humorous', 'inspirational']),
      topics: z.array(z.string()),
      hashtags: z.object({
        enabled: z.boolean().default(true),
        maxCount: z.number().min(1).max(30).default(5),
        trending: z.boolean().default(true),
      }),
    }),
    engagement: z.object({
      autoLike: z.boolean().default(false),
      autoComment: z.boolean().default(false),
      autoFollow: z.boolean().default(false),
      responseTime: z.number().min(60).max(86400).default(3600), // seconds
    }),
    posting: z.object({
      frequency: z.number().min(1).max(24).default(3), // posts per day
      optimalTimes: z.array(z.string()),
    }),
  }),
});

// Content Creator Agent Configuration
export const ContentCreatorConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.CONTENT_CREATOR),
  configuration: z.object({
    contentTypes: z.array(z.enum(['blog_post', 'article', 'social_post', 'email', 'ad_copy', 'product_description'])),
    writing: z.object({
      tone: z.enum(['professional', 'casual', 'technical', 'persuasive', 'informative']),
      style: z.enum(['formal', 'conversational', 'academic', 'marketing']),
      length: z.object({
        min: z.number().min(50),
        max: z.number().max(10000),
      }),
    }),
    seo: z.object({
      enabled: z.boolean().default(true),
      keywords: z.array(z.string()),
      keywordDensity: z.number().min(0.5).max(5).default(2),
      metaDescription: z.boolean().default(true),
    }),
    research: z.object({
      enabled: z.boolean().default(true),
      sources: z.array(z.string()),
      factCheck: z.boolean().default(true),
    }),
    output: z.object({
      format: z.enum(['markdown', 'html', 'plain_text']).default('markdown'),
      includeImages: z.boolean().default(false),
      includeCitations: z.boolean().default(true),
    }),
  }),
});

// Analytics Agent Configuration
export const AnalyticsConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.ANALYTICS),
  configuration: z.object({
    dataSources: z.array(z.enum(['google_analytics', 'facebook_ads', 'google_ads', 'crm', 'database', 'api'])),
    metrics: z.array(z.string()),
    reporting: z.object({
      frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
      format: z.enum(['pdf', 'excel', 'dashboard', 'email']),
      recipients: z.array(z.string().email()),
    }),
    alerts: z.object({
      enabled: z.boolean().default(true),
      thresholds: z.array(z.object({
        metric: z.string(),
        condition: z.enum(['greater_than', 'less_than', 'equals', 'percentage_change']),
        value: z.number(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
      })),
    }),
    visualization: z.object({
      charts: z.array(z.enum(['line', 'bar', 'pie', 'scatter', 'heatmap'])),
      dashboardUrl: z.string().url().optional(),
    }),
  }),
});

// Customer Service Agent Configuration
export const CustomerServiceConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.CUSTOMER_SERVICE),
  configuration: z.object({
    channels: z.array(z.enum(['email', 'chat', 'phone', 'social_media', 'ticket_system'])),
    responses: z.object({
      tone: z.enum(['friendly', 'professional', 'empathetic', 'formal']),
      language: z.string().default('en'),
      responseTime: z.number().min(1).max(1440).default(60), // minutes
    }),
    escalation: z.object({
      enabled: z.boolean().default(true),
      triggers: z.array(z.enum(['negative_sentiment', 'complex_issue', 'vip_customer', 'high_value'])),
      humanHandoff: z.boolean().default(true),
    }),
    knowledgeBase: z.object({
      sources: z.array(z.string()),
      updateFrequency: z.enum(['realtime', 'hourly', 'daily']),
      categories: z.array(z.string()),
    }),
    satisfaction: z.object({
      tracking: z.boolean().default(true),
      followUp: z.boolean().default(true),
      surveyEnabled: z.boolean().default(true),
    }),
  }),
});

// Sales Agent Configuration
export const SalesConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.SALES),
  configuration: z.object({
    pipeline: z.object({
      stages: z.array(z.string()),
      autoProgress: z.boolean().default(false),
      qualificationCriteria: z.array(z.string()),
    }),
    outreach: z.object({
      channels: z.array(z.enum(['email', 'phone', 'linkedin', 'social_media'])),
      frequency: z.number().min(1).max(7).default(3), // days between contacts
      maxAttempts: z.number().min(1).max(10).default(5),
      personalization: z.boolean().default(true),
    }),
    scoring: z.object({
      enabled: z.boolean().default(true),
      factors: z.array(z.string()),
      minimumScore: z.number().min(0).max(100).default(70),
    }),
    crm: z.object({
      integration: z.enum(['salesforce', 'hubspot', 'pipedrive', 'custom']),
      syncFrequency: z.enum(['realtime', 'hourly', 'daily']),
      autoCreateContacts: z.boolean().default(true),
    }),
  }),
});

// SEO Optimizer Agent Configuration
export const SEOOptimizerConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.SEO_OPTIMIZER),
  configuration: z.object({
    targets: z.object({
      keywords: z.array(z.string()),
      competitors: z.array(z.string().url()),
      targetPages: z.array(z.string().url()),
    }),
    optimization: z.object({
      onPage: z.boolean().default(true),
      technical: z.boolean().default(true),
      content: z.boolean().default(true),
      backlinks: z.boolean().default(false),
    }),
    monitoring: z.object({
      rankings: z.boolean().default(true),
      traffic: z.boolean().default(true),
      backlinks: z.boolean().default(true),
      competitors: z.boolean().default(true),
    }),
    reporting: z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      metrics: z.array(z.string()),
      recommendations: z.boolean().default(true),
    }),
  }),
});

// Custom Agent Configuration (flexible schema)
export const CustomAgentConfigSchema = BaseAgentConfigSchema.extend({
  type: z.literal(AgentType.CUSTOM),
  configuration: z.record(z.any()), // Flexible configuration for custom agents
});

// Union schema for all agent types
export const AgentConfigSchema = z.discriminatedUnion('type', [
  LeadGeneratorConfigSchema,
  EmailMarketerConfigSchema,
  SocialMediaConfigSchema,
  ContentCreatorConfigSchema,
  AnalyticsConfigSchema,
  CustomerServiceConfigSchema,
  SalesConfigSchema,
  SEOOptimizerConfigSchema,
  CustomAgentConfigSchema,
]);

// Agent triggers schema
export const AgentTriggersSchema = z.object({
  manual: z.boolean().default(true),
  scheduled: z.object({
    enabled: z.boolean().default(false),
    cron: z.string().optional(),
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url().optional(),
    secret: z.string().optional(),
  }).optional(),
  events: z.array(z.object({
    type: z.enum(['lead_created', 'email_received', 'threshold_reached', 'time_based']),
    conditions: z.record(z.any()),
  })).optional(),
});

// Agent actions schema
export const AgentActionsSchema = z.object({
  primary: z.object({
    type: z.string(),
    config: z.record(z.any()),
  }),
  onSuccess: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
  })).optional(),
  onFailure: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
  })).optional(),
  notifications: z.object({
    email: z.array(z.string().email()).optional(),
    webhook: z.string().url().optional(),
    slack: z.string().optional(),
  }).optional(),
});

// Agent capabilities schema
export const AgentCapabilitiesSchema = z.object({
  apis: z.array(z.object({
    name: z.string(),
    endpoint: z.string().url(),
    authentication: z.enum(['none', 'api_key', 'oauth', 'basic']),
    rateLimit: z.number().optional(),
  })).optional(),
  integrations: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  dataAccess: z.array(z.string()).optional(),
});

// Complete agent creation schema
export const CreateAgentSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AgentType),
  description: z.string().optional(),
  configuration: z.record(z.any()),
  triggers: AgentTriggersSchema.optional(),
  actions: AgentActionsSchema.optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
});

// Agent update schema
export const UpdateAgentSchema = CreateAgentSchema.partial();

// Export type definitions
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type CreateAgentData = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentData = z.infer<typeof UpdateAgentSchema>;
export type AgentTriggers = z.infer<typeof AgentTriggersSchema>;
export type AgentActions = z.infer<typeof AgentActionsSchema>;
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;