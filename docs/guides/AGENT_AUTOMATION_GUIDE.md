# 🤖 Agent Automation Guide

Complete guide to making your agents actually work and automate tasks.

## Table of Contents
1. [Agent Execution Modes](#agent-execution-modes)
2. [Quick Start Examples](#quick-start-examples)
3. [Setting Up Triggers](#setting-up-triggers)
4. [Creating Workflows](#creating-workflows)
5. [Agent Swarms](#agent-swarms)
6. [Integration with External APIs](#integration-with-external-apis)

---

## Agent Execution Modes

### 1. Manual Execution (Testing & On-Demand)
```bash
# Execute agent via API
curl -X POST https://www.neurallempire.com/api/agents/:agentId/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "userMessage": "Hello, I need help with my account",
      "context": {
        "userId": "user123",
        "channel": "web"
      }
    }
  }'
```

### 2. Scheduled Execution (Cron Jobs)
```typescript
// Backend: Add to src/services/scheduler.service.ts
import { agentService } from './agent.service';
import cron from 'node-cron';

export class AgentScheduler {
  scheduleAgent(agentId: string, schedule: string, input?: any) {
    // Schedule: '0 9 * * *' = Every day at 9 AM
    // Schedule: '*/15 * * * *' = Every 15 minutes
    // Schedule: '0 0 * * 1' = Every Monday at midnight

    const task = cron.schedule(schedule, async () => {
      console.log(`Executing scheduled agent: ${agentId}`);
      await agentService.executeAgent(agentId, input);
    });

    return task;
  }
}
```

### 3. Event-Driven Execution (Webhooks & Real-time)
```typescript
// src/controllers/webhooks.controller.ts
export class WebhookController {
  async handleWebhook(req: Request, res: Response) {
    const { event, data } = req.body;

    // Find agents subscribed to this event
    const agents = await prisma.agent.findMany({
      where: {
        status: 'RUNNING',
        triggers: {
          path: ['webhook', 'events'],
          array_contains: event
        }
      }
    });

    // Execute all matching agents
    for (const agent of agents) {
      await agentService.executeAgent(agent.id, {
        event,
        data,
        timestamp: new Date()
      });
    }

    res.json({ success: true, triggered: agents.length });
  }
}
```

---

## Quick Start Examples

### Example 1: Customer Support Chatbot

```typescript
// 1. Create the agent
const supportAgent = await agentService.createAgent(organizationId, {
  type: 'CHAT',
  name: 'Customer Support AI',
  description: '24/7 customer support automation',
  configuration: {
    model: 'gpt-4',
    systemPrompt: `You are a friendly customer support agent for NeurallEmpire.

Your responsibilities:
- Answer product questions professionally
- Help with account issues
- Create support tickets for complex problems
- Route urgent issues to human agents

Guidelines:
- Be empathetic and professional
- Ask clarifying questions when needed
- Provide step-by-step solutions
- Always confirm customer satisfaction`,
    temperature: 0.7,
    maxTokens: 800
  },
  capabilities: ['chat', 'sentiment_analysis', 'ticket_creation']
});

// 2. Activate the agent
await agentService.startAgent(supportAgent.id);

// 3. Execute with RAG context (uses knowledge base)
const result = await agentService.executeWithRAGContext(
  supportAgent.id,
  userId,
  "How do I reset my password?",
  {
    includeKnowledge: true,
    includeConversations: true
  }
);

console.log(result.output); // AI response with relevant context
```

### Example 2: Lead Enrichment Agent

```typescript
const leadEnrichmentAgent = await agentService.createAgent(organizationId, {
  type: 'DATA_PROCESSOR',
  name: 'Lead Enrichment AI',
  description: 'Enriches lead data with company info',
  configuration: {
    model: 'gpt-4',
    systemPrompt: `You analyze lead data and enrich it with company information.

Task: Given lead information (name, email, company), you will:
1. Extract company domain from email
2. Research company size, industry, funding
3. Score lead quality (0-100)
4. Suggest next best action

Return structured JSON output.`,
    temperature: 0.3,
    maxTokens: 1500
  },
  integrations: {
    clearbit: { apiKey: process.env.CLEARBIT_API_KEY },
    linkedin: { apiKey: process.env.LINKEDIN_API_KEY }
  },
  triggers: {
    webhook: {
      events: ['lead.created', 'form.submitted'],
      url: '/api/webhooks/new-lead'
    }
  }
});
```

### Example 3: Content Generator Agent

```typescript
const contentAgent = await agentService.createAgent(organizationId, {
  type: 'CONTENT_GENERATOR',
  name: 'Blog Post Writer',
  description: 'Generates SEO-optimized blog posts',
  configuration: {
    model: 'gpt-4',
    systemPrompt: `You are an expert content writer specializing in SaaS and AI topics.

Write engaging, SEO-optimized blog posts that:
- Hook readers in the first paragraph
- Include relevant statistics and examples
- Break content into scannable sections
- End with clear CTAs
- Target 1500-2000 words
- Include meta description and keywords`,
    temperature: 0.8,
    maxTokens: 4000
  },
  capabilities: ['content_generation', 'seo_optimization', 'research']
});

// Schedule to generate content weekly
const scheduler = new AgentScheduler();
scheduler.scheduleAgent(
  contentAgent.id,
  '0 9 * * 1', // Every Monday at 9 AM
  {
    topic: 'AI automation trends',
    targetKeywords: ['AI automation', 'business efficiency'],
    tone: 'professional yet approachable'
  }
);
```

---

## Setting Up Triggers

### Webhook Triggers

```typescript
// 1. Create webhook endpoint
// src/routes/webhooks.ts
router.post('/webhooks/:webhookId', async (req, res) => {
  const { webhookId } = req.params;
  const payload = req.body;

  // Find agents listening to this webhook
  const agents = await prisma.agent.findMany({
    where: {
      status: 'RUNNING',
      triggers: {
        path: ['webhook', 'id'],
        equals: webhookId
      }
    }
  });

  // Execute agents in parallel
  const results = await Promise.all(
    agents.map(agent =>
      agentService.executeAgent(agent.id, {
        webhook: webhookId,
        payload,
        timestamp: new Date()
      })
    )
  );

  res.json({ success: true, executed: results.length });
});

// 2. Configure agent webhook
await prisma.agent.update({
  where: { id: agentId },
  data: {
    triggers: {
      webhook: {
        id: 'new-lead-webhook',
        url: '/api/webhooks/new-lead-webhook',
        events: ['lead.created'],
        secret: process.env.WEBHOOK_SECRET
      }
    }
  }
});

// 3. External service calls your webhook
// POST https://www.neurallempire.com/api/webhooks/new-lead-webhook
// {
//   "event": "lead.created",
//   "data": { ... }
// }
```

### Schedule Triggers

```typescript
// Create scheduled agent
const dailyReportAgent = await prisma.agent.create({
  data: {
    name: 'Daily Analytics Report',
    type: 'REPORTER',
    status: 'RUNNING',
    triggers: {
      schedule: {
        cron: '0 9 * * *', // 9 AM daily
        timezone: 'America/New_York',
        enabled: true
      }
    },
    actions: {
      generateReport: {
        metrics: ['users', 'revenue', 'engagement'],
        period: 'yesterday'
      },
      notify: {
        channels: ['email', 'slack'],
        recipients: ['team@company.com']
      }
    }
  }
});
```

### Event Triggers (Real-time)

```typescript
// Agent listens to system events
await prisma.agent.update({
  where: { id: agentId },
  data: {
    triggers: {
      events: [
        'user.signup',
        'payment.successful',
        'support.ticket.created'
      ],
      filters: {
        'payment.amount': { gte: 1000 }, // Only high-value payments
        'user.plan': 'enterprise'
      }
    }
  }
});

// Emit events from your app
import { agentService } from '@/services/agent.service';

agentService.emit('payment.successful', {
  userId: 'user123',
  amount: 5000,
  plan: 'enterprise'
});
```

---

## Creating Workflows

Workflows chain multiple agents and actions together:

```typescript
const leadQualificationWorkflow = {
  name: 'Lead Qualification Pipeline',
  description: 'Automatically qualifies and routes leads',

  trigger: {
    type: 'webhook',
    event: 'lead.created'
  },

  steps: [
    // Step 1: Enrich lead data
    {
      id: 'enrich',
      type: 'agent',
      agentId: 'lead-enrichment-agent',
      input: {
        leadData: '${trigger.data}'
      },
      output: 'enrichedLead'
    },

    // Step 2: Score lead quality
    {
      id: 'score',
      type: 'agent',
      agentId: 'lead-scoring-agent',
      input: {
        lead: '${enrich.enrichedLead}'
      },
      output: 'score'
    },

    // Step 3: Decision point
    {
      id: 'route',
      type: 'condition',
      condition: '${score.value} >= 70',
      onTrue: 'notify-sales',
      onFalse: 'nurture'
    },

    // Step 4a: High-quality lead → Notify sales
    {
      id: 'notify-sales',
      type: 'action',
      action: 'send-notification',
      params: {
        channel: 'slack',
        message: 'New hot lead: ${enrich.enrichedLead.company}',
        urgency: 'high'
      }
    },

    // Step 4b: Low-quality lead → Add to nurture
    {
      id: 'nurture',
      type: 'agent',
      agentId: 'email-automation-agent',
      input: {
        lead: '${enrich.enrichedLead}',
        campaign: 'welcome-nurture'
      }
    }
  ]
};

// Create workflow
const workflow = await prisma.agentWorkflow.create({
  data: {
    ...leadQualificationWorkflow,
    organizationId,
    status: 'ACTIVE'
  }
});
```

---

## Agent Swarms

Multiple agents working together on complex tasks:

```typescript
// Create agent swarm
const contentCreationSwarm = await prisma.agentSwarm.create({
  data: {
    organizationId,
    creatorId: userId,
    name: 'Content Creation Team',
    type: 'SEQUENTIAL', // or 'PARALLEL', 'HIERARCHICAL'
    status: 'READY',

    configuration: {
      maxConcurrency: 3,
      errorHandling: 'continue' // or 'stop', 'retry'
    },

    members: {
      create: [
        {
          agentId: 'research-agent-id',
          role: 'COORDINATOR',
          order: 1,
          configuration: {
            task: 'Research topic and gather data'
          }
        },
        {
          agentId: 'writer-agent-id',
          role: 'WORKER',
          order: 2,
          configuration: {
            task: 'Write blog post from research'
          }
        },
        {
          agentId: 'editor-agent-id',
          role: 'REVIEWER',
          order: 3,
          configuration: {
            task: 'Edit and optimize content'
          }
        },
        {
          agentId: 'seo-agent-id',
          role: 'WORKER',
          order: 4,
          configuration: {
            task: 'Add SEO optimization'
          }
        }
      ]
    }
  },
  include: {
    members: true
  }
});

// Execute swarm
const swarmResult = await executeSwarm(contentCreationSwarm.id, {
  topic: 'AI automation for small businesses',
  targetLength: 2000,
  tone: 'professional'
});
```

---

## Integration with External APIs

### OpenAI Integration

```typescript
import OpenAI from 'openai';

class OpenAIAgentExecutor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async execute(agent: Agent, input: any) {
    const response = await this.openai.chat.completions.create({
      model: agent.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: agent.systemPrompt
        },
        {
          role: 'user',
          content: typeof input === 'string' ? input : JSON.stringify(input)
        }
      ],
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
      top_p: agent.topP,
      frequency_penalty: agent.frequencyPenalty,
      presence_penalty: agent.presencePenalty
    });

    return {
      success: true,
      output: response.choices[0].message.content,
      metrics: {
        tokens: response.usage,
        model: agent.model,
        duration: 0
      }
    };
  }
}
```

### Slack Integration

```typescript
import { WebClient } from '@slack/web-api';

class SlackAgentIntegration {
  private slack: WebClient;

  constructor(token: string) {
    this.slack = new WebClient(token);
  }

  async sendMessage(channel: string, message: string) {
    return await this.slack.chat.postMessage({
      channel,
      text: message
    });
  }

  async setupAgent(agentId: string, channelId: string) {
    // Listen to Slack messages and trigger agent
    // This would use Slack Events API
  }
}
```

### Email Integration (SendGrid)

```typescript
import sgMail from '@sendgrid/mail';

class EmailAgentIntegration {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string) {
    return await sgMail.send({
      to,
      from: 'agents@neurallempire.com',
      subject,
      html
    });
  }

  async executeAgentAction(agent: Agent, action: 'send' | 'reply' | 'forward', data: any) {
    switch (action) {
      case 'send':
        return await this.sendEmail(data.to, data.subject, data.html);
      case 'reply':
        // Handle email replies
        break;
      case 'forward':
        // Forward emails
        break;
    }
  }
}
```

---

## Complete Implementation Example

Here's a full end-to-end example of a working automated agent:

```typescript
// 1. Create the agent with full configuration
const customerSupportAgent = await prisma.agent.create({
  data: {
    organizationId,
    creatorId: userId,
    ownerId: userId,
    name: 'Customer Support AI',
    type: 'CHAT',
    status: 'READY',

    // AI Configuration
    model: 'gpt-4',
    systemPrompt: `You are a customer support agent for NeurallEmpire SaaS platform.

Your capabilities:
- Answer questions about features and pricing
- Help troubleshoot technical issues
- Create support tickets for complex problems
- Route urgent issues to human agents

Knowledge:
- Platform has: AI Agents, Workflows, Campaigns, Analytics
- Plans: FREE, PRO ($49/mo), ENTERPRISE ($199/mo)
- Support hours: 24/7 for Enterprise, 9-5 EST for others

Always be helpful, professional, and empathetic.`,
    temperature: 0.7,
    maxTokens: 1000,

    // Integrations
    integrations: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY
      },
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK,
        channel: '#support'
      },
      email: {
        from: 'support@neurallempire.com'
      }
    },

    // Triggers
    triggers: {
      events: ['support.message.received'],
      webhook: {
        url: '/api/webhooks/support',
        secret: process.env.WEBHOOK_SECRET
      }
    },

    // Capabilities
    capabilities: [
      'chat',
      'sentiment_analysis',
      'ticket_creation',
      'escalation'
    ]
  }
});

// 2. Add knowledge to the agent
await agentService.addAgentKnowledge(
  customerSupportAgent.id,
  `# Product Documentation

  ## Features
  - AI Agents: Create custom AI automations
  - Workflows: Multi-step automation
  - Campaigns: Marketing automation

  ## Pricing
  - FREE: 100 agent executions/month
  - PRO: 10,000 executions/month, $49/mo
  - ENTERPRISE: Unlimited, $199/mo`,
  'document'
);

// 3. Start the agent
await agentService.startAgent(customerSupportAgent.id);

// 4. Execute agent (with RAG context from knowledge base)
const response = await agentService.executeWithRAGContext(
  customerSupportAgent.id,
  'user123',
  'How much does the PRO plan cost?',
  {
    includeKnowledge: true,
    includeConversations: true
  }
);

console.log(response.output);
// "The PRO plan costs $49 per month and includes 10,000 agent executions per month.
//  Would you like me to help you upgrade your plan?"
```

---

## Testing Your Agents

```bash
# Test agent execution
curl -X POST https://www.neurallempire.com/api/agents/:agentId/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "userMessage": "Test message",
      "context": {}
    }
  }'

# Check agent status
curl https://www.neurallempire.com/api/agents/:agentId/status \
  -H "Authorization: Bearer $TOKEN"

# View agent interactions
curl https://www.neurallempire.com/api/agents/:agentId/interactions?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

1. **Create your first agent** using the examples above
2. **Add knowledge** to make agents contextually aware
3. **Set up triggers** for automation
4. **Create workflows** for complex multi-step processes
5. **Build agent swarms** for collaborative tasks
6. **Monitor performance** via the Analytics dashboard

For more examples, see:
- `/examples/agents/` - Agent templates
- `/examples/workflows/` - Workflow examples
- `/docs/api/` - API documentation

---

**Questions?** Contact support@neurallempire.com or check https://docs.neurallempire.com
