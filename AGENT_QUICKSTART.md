# 🤖 Agent Automation - Quick Start

## How to Give Life to Your Agents

Your agents become "alive" and automate tasks through **3 key mechanisms**:

### 1. **AI Execution** (Brain) 🧠
Agents connect to OpenAI (or other AI providers) to think and respond:

```bash
# Add to backend/.env
OPENAI_API_KEY=sk-your-key-here
```

Agents now have actual AI intelligence to:
- Answer questions intelligently
- Process data and make decisions
- Generate content automatically
- Analyze sentiment and intent

### 2. **Triggers** (Activation) ⚡
Agents can be triggered in 3 ways:

#### a) **Manual** - You call them via API
```bash
curl -X POST https://www.neurallempire.com/api/agents/:agentId/execute \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": {"userMessage": "Hello"}}'
```

#### b) **Scheduled** - They run automatically on a schedule
```typescript
// Runs every day at 9 AM
schedule: '0 9 * * *'

// Runs every 15 minutes
schedule: '*/15 * * * *'
```

#### c) **Event-Driven** - They respond to events in real-time
```typescript
triggers: {
  webhook: '/api/webhooks/new-lead',
  events: ['lead.created', 'payment.successful']
}
```

### 3. **Actions** (What They Do) 🎯
Agents can perform real actions:

- **Chat** - Respond to customer messages
- **Process Data** - Enrich leads, analyze sentiment
- **Generate Content** - Write blog posts, emails
- **Send Notifications** - Email, Slack, SMS
- **Update Systems** - CRM, databases, APIs
- **Make Decisions** - Route tickets, qualify leads

---

## Quick Test (2 Minutes)

### Step 1: Add OpenAI API Key
```bash
# backend/.env
OPENAI_API_KEY=sk-your-openai-key
```

### Step 2: Run Test Script
```bash
chmod +x scripts/test-agent.sh
./scripts/test-agent.sh
```

This will:
1. ✅ Create a customer support agent
2. ✅ Activate it
3. ✅ Send it a question
4. ✅ Get an AI-powered response

---

## Real-World Examples

### Example 1: Customer Support Bot
```typescript
// Agent automatically responds to support messages
const agent = {
  name: 'Support Bot',
  type: 'CHAT',
  systemPrompt: 'You are a helpful customer support agent...',
  triggers: {
    events: ['support.message.received']
  },
  actions: {
    respond: true,
    createTicket: 'if sentiment negative',
    notifyHuman: 'if urgent'
  }
};
```

**What it automates:**
- Responds to 80% of common questions
- Creates tickets for complex issues
- Escalates urgent problems to humans
- Works 24/7 without breaks

### Example 2: Lead Qualification Agent
```typescript
const agent = {
  name: 'Lead Qualifier',
  type: 'DATA_PROCESSOR',
  triggers: {
    webhook: '/api/webhooks/new-lead'
  },
  actions: {
    enrichData: true,
    scoreQuality: true,
    routeToSales: 'if score > 70'
  }
};
```

**What it automates:**
- Enriches every new lead with company data
- Scores lead quality (0-100)
- Routes hot leads to sales immediately
- Nurtures cold leads automatically

### Example 3: Daily Report Generator
```typescript
const agent = {
  name: 'Report Bot',
  type: 'REPORTER',
  schedule: '0 9 * * *', // 9 AM daily
  actions: {
    analyze: 'yesterday metrics',
    generateReport: true,
    sendEmail: ['team@company.com'],
    postSlack: '#analytics'
  }
};
```

**What it automates:**
- Runs every morning at 9 AM
- Analyzes previous day's data
- Generates formatted report
- Sends to team via email and Slack

---

## Complete Automation Flow

```
1. TRIGGER → Event happens (webhook, schedule, manual)
           ↓
2. AGENT   → AI processes the input (OpenAI, etc.)
           ↓
3. DECISION → Agent makes intelligent decision
           ↓
4. ACTIONS → Agent performs actions (notify, update, etc.)
           ↓
5. LOGGING → Results tracked in database
```

---

## Setup Checklist

### Essential Setup:
- [ ] Add `OPENAI_API_KEY` to backend/.env
- [ ] Create your first agent via API or UI
- [ ] Test agent with manual execution
- [ ] Add knowledge to agent for context

### Automation Setup:
- [ ] Configure triggers (webhook, schedule, or events)
- [ ] Set up actions (what agent should do)
- [ ] Add integrations (Slack, email, etc.)
- [ ] Monitor agent performance in dashboard

### Advanced Setup:
- [ ] Create workflows (multi-step automation)
- [ ] Build agent swarms (multiple agents working together)
- [ ] Add custom knowledge base
- [ ] Set up RAG for contextual responses

---

## API Endpoints

### Agent Management
```bash
# Create agent
POST /api/agents

# Start agent
POST /api/agents/:id/start

# Execute agent
POST /api/agents/:id/execute

# Stop agent
POST /api/agents/:id/stop

# Get status
GET /api/agents/:id/status

# List agents
GET /api/agents
```

### Automation
```bash
# Create webhook trigger
POST /api/webhooks

# Create workflow
POST /api/workflows

# Execute workflow
POST /api/workflows/:id/execute

# List executions
GET /api/agents/:id/interactions
```

---

## Environment Variables Needed

```bash
# Required for AI
OPENAI_API_KEY=sk-xxxxx              # For GPT-4 agents

# Optional Integrations
SENDGRID_API_KEY=SG.xxxxx            # For email agents
SLACK_WEBHOOK_URL=https://hooks...   # For Slack notifications
TWILIO_ACCOUNT_SID=ACxxxx            # For SMS agents
```

---

## Next Steps

1. **Read Full Guide**: `/docs/guides/AGENT_AUTOMATION_GUIDE.md`
2. **Test Agent**: Run `./scripts/test-agent.sh`
3. **Create Agent**: Via API or dashboard UI
4. **Set Up Triggers**: Make it automatic
5. **Monitor**: Check analytics dashboard

---

## Troubleshooting

**Agent not responding?**
- Check OPENAI_API_KEY is set
- Verify agent status is 'RUNNING'
- Check agent interactions for errors

**Triggers not firing?**
- Verify webhook URL is correct
- Check schedule cron syntax
- Ensure agent status is 'RUNNING'

**Poor responses?**
- Improve systemPrompt with more context
- Add knowledge to agent's knowledge base
- Use RAG context for better responses

---

## Support

- **Documentation**: `/docs/guides/AGENT_AUTOMATION_GUIDE.md`
- **API Docs**: `https://www.neurallempire.com/api/`
- **Examples**: `/examples/agents/`
- **Issues**: GitHub Issues

---

**Ready to automate?** Start with `./scripts/test-agent.sh` to see it in action! 🚀
