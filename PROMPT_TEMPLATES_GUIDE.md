# 🤖 AI Prompt Template System

## Overview

The **Prompt Template System** allows you to create reusable, configurable AI agent configurations that can be used across your entire platform. Instead of hardcoding prompts in your code, you can now manage them through a UI and database.

## Key Features

### 1. **Reusable Prompt Templates**
- Create once, use everywhere
- Centralized management in database
- Version control and history

### 2. **Variable Substitution**
- Use placeholders like `{{patientName}}`, `{{disease}}`, `{{age}}`
- Dynamic content generation
- Type-safe variable validation

### 3. **Configurable Parameters**
- Temperature, max tokens, top-p, etc.
- Override AI model defaults per template
- Response format (text, JSON)

### 4. **Usage Tracking & Analytics**
- Token usage per execution
- Cost tracking
- Performance metrics
- Success/error rates

### 5. **Multi-Model Support**
- Bind templates to specific AI models
- Or use organization's default model
- Easy model switching

## Database Schema

### PromptTemplate
```prisma
model PromptTemplate {
  id              String   @id @default(cuid())
  organizationId  String
  aiModelConfigId String?  // Optional: bind to specific AI model

  // Template Identity
  name            String
  description     String?
  category        String   // e.g., "diet-plan", "customer-support"
  icon            String?

  // Prompt Configuration
  systemPrompt    String   @db.Text
  userPromptTemplate String @db.Text  // Template with variables

  // Model Parameters (Override AI model defaults)
  temperature     Float?   @default(0.7)
  maxTokens       Int?     @default(4000)
  topP            Float?
  frequencyPenalty Float?
  presencePenalty  Float?
  responseFormat  String?  @default("text") // "text", "json_object"

  // Variables Configuration
  variables       Json?    // Array of {name, type, required, default, description}

  // Output Configuration
  outputSchema    Json?    // Expected output structure for validation

  // Metadata
  isActive        Boolean  @default(true)
  isPublic        Boolean  @default(false)
  version         String   @default("1.0.0")

  // Usage Tracking
  usageCount      Int      @default(0)
  lastUsedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### PromptExecution
```prisma
model PromptExecution {
  id              String   @id @default(cuid())
  templateId      String
  aiModelConfigId String

  // Execution Details
  inputVariables  Json     // Variables used in this execution
  renderedPrompt  String   @db.Text // Final prompt after substitution
  response        String   @db.Text // AI response

  // Metadata
  tokensUsed      Int?
  cost            Decimal?
  duration        Int?     // milliseconds
  status          String   @default("success") // success, error
  errorMessage    String?

  createdAt       DateTime @default(now())
}
```

## Usage Examples

### Example 1: Diet Plan Template

```json
{
  "name": "Patient Diet Plan Generator",
  "category": "diet-plan",
  "description": "Generate personalized diet plans for patients with medical conditions",

  "systemPrompt": "You are an expert nutritionist and dietitian specializing in medical nutrition therapy. Your role is to create personalized, evidence-based diet plans for patients with various medical conditions. Always provide scientifically-backed recommendations and account for allergies, medications, and dietary restrictions.",

  "userPromptTemplate": "Create a comprehensive diet plan for:\n\nPatient: {{patientName}}\nAge: {{patientAge}}\nGender: {{patientGender}}\nCondition: {{disease}}\nAllergies: {{allergies}}\nMedications: {{medications}}\nDietary Restrictions: {{dietaryRestrictions}}\n\nDuration: {{numberOfDays}} days\nMeals per day: {{mealsPerDay}}\nSpecial Instructions: {{specialInstructions}}\n\nProvide a detailed diet plan in JSON format with daily meal plans, nutrition goals, and recommendations.",

  "variables": [
    {"name": "patientName", "type": "string", "required": true, "description": "Patient's full name"},
    {"name": "patientAge", "type": "number", "required": false, "description": "Patient's age"},
    {"name": "patientGender", "type": "string", "required": false, "description": "Patient's gender"},
    {"name": "disease", "type": "string", "required": true, "description": "Primary medical condition"},
    {"name": "allergies", "type": "array", "required": false, "default": [], "description": "Food allergies"},
    {"name": "medications", "type": "array", "required": false, "default": [], "description": "Current medications"},
    {"name": "dietaryRestrictions", "type": "array", "required": false, "default": [], "description": "Dietary restrictions"},
    {"name": "numberOfDays", "type": "number", "required": true, "default": 7, "description": "Plan duration"},
    {"name": "mealsPerDay", "type": "number", "required": true, "default": 3, "description": "Meals per day"},
    {"name": "specialInstructions", "type": "string", "required": false, "description": "Additional requirements"}
  ],

  "temperature": 0.7,
  "maxTokens": 4000,
  "responseFormat": "json_object",

  "outputSchema": {
    "type": "object",
    "properties": {
      "summary": {"type": "object"},
      "dailyPlans": {"type": "array"},
      "foodsToAvoid": {"type": "array"},
      "nutritionGoals": {"type": "object"}
    }
  }
}
```

### Example 2: Customer Support Template

```json
{
  "name": "Customer Support Agent",
  "category": "customer-support",
  "description": "Respond to customer inquiries with helpful, professional support",

  "systemPrompt": "You are a helpful customer support agent. Respond to customer inquiries professionally, empathetically, and provide accurate information. Always try to resolve issues and escalate when necessary.",

  "userPromptTemplate": "Customer: {{customerName}}\nIssue Type: {{issueType}}\nPriority: {{priority}}\n\nCustomer Message:\n{{customerMessage}}\n\nContext:\n{{context}}\n\nProvide a professional, helpful response.",

  "variables": [
    {"name": "customerName", "type": "string", "required": true},
    {"name": "issueType", "type": "string", "required": true},
    {"name": "priority", "type": "string", "required": false, "default": "medium"},
    {"name": "customerMessage", "type": "string", "required": true},
    {"name": "context", "type": "string", "required": false}
  ],

  "temperature": 0.5,
  "maxTokens": 1000,
  "responseFormat": "text"
}
```

## Implementation Steps

### Step 1: Database Migration

```bash
# After Supabase database is restored
npx prisma db push

# Or create migration
npx prisma migrate dev --name add_prompt_templates
```

### Step 2: Create Backend API

Create `/api/prompt-templates` endpoints:
- `GET /api/prompt-templates` - List templates
- `POST /api/prompt-templates` - Create template
- `GET /api/prompt-templates/:id` - Get template
- `PUT /api/prompt-templates/:id` - Update template
- `DELETE /api/prompt-templates/:id` - Delete template
- `POST /api/prompt-templates/:id/execute` - Execute template

### Step 3: Create Prompt Service

```typescript
// src/services/prompt-template.service.ts
export class PromptTemplateService {
  // Render template with variables
  renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  // Execute prompt template
  async executeTemplate(
    templateId: string,
    variables: Record<string, any>,
    userId: string
  ): Promise<PromptExecutionResult> {
    // 1. Fetch template
    // 2. Validate variables
    // 3. Render prompts
    // 4. Get AI model config
    // 5. Call OpenAI/Anthropic/etc.
    // 6. Track execution
    // 7. Return result
  }
}
```

### Step 4: Create Frontend UI

Pages to create:
1. **Template List** - `/settings/prompt-templates`
2. **Template Editor** - `/settings/prompt-templates/new`
3. **Template Details** - `/settings/prompt-templates/:id`
4. **Execution History** - `/settings/prompt-templates/:id/executions`

UI Components:
- Template form with variable editor
- Live preview with sample data
- Parameter sliders (temperature, tokens, etc.)
- Test execution interface
- Analytics dashboard

### Step 5: Update Existing Services

Update `diet-plan.service.ts` to use templates:

```typescript
async generateDietPlan(params) {
  // Option 1: Use template
  if (params.templateId) {
    return await promptTemplateService.executeTemplate(
      params.templateId,
      params.variables
    );
  }

  // Option 2: Use direct prompts (backward compatibility)
  // ... existing code
}
```

## Benefits

### 1. **Separation of Concerns**
- Prompts managed separately from code
- Non-technical users can edit prompts
- No code deployments for prompt changes

### 2. **A/B Testing**
- Test different prompts
- Compare performance
- Optimize for better results

### 3. **Cost Optimization**
- Track token usage per template
- Identify expensive prompts
- Optimize prompt length

### 4. **Multi-Use Cases**
- Diet plans
- Customer support
- Email generation
- Content creation
- Data analysis
- Code generation

### 5. **Governance**
- Audit trail for all executions
- Cost tracking
- Usage analytics
- Error monitoring

## Best Practices

### 1. Variable Naming
- Use descriptive names: `patientName` not `name`
- Use camelCase for consistency
- Document variable purpose

### 2. Prompt Design
- Keep system prompts focused and clear
- Use specific instructions
- Provide examples when helpful
- Request structured output (JSON)

### 3. Parameter Tuning
- **Temperature**: Lower (0.3-0.5) for factual, higher (0.7-0.9) for creative
- **Max Tokens**: Set appropriately for expected response length
- **Response Format**: Use `json_object` for structured data

### 4. Error Handling
- Validate variables before execution
- Handle API errors gracefully
- Retry on transient failures
- Log errors for debugging

### 5. Testing
- Test templates with sample data
- Validate output format
- Check edge cases
- Monitor execution success rate

## Migration Path

### Phase 1: Schema & API (✅ Complete)
- ✅ Database schema added
- ⏳ Prisma migration pending (need to restore Supabase)
- ⏳ Backend API endpoints
- ⏳ Prompt template service

### Phase 2: UI
- ⏳ Template management page
- ⏳ Template editor
- ⏳ Execution history viewer
- ⏳ Analytics dashboard

### Phase 3: Integration
- ⏳ Update diet-plan service
- ⏳ Create customer-support template
- ⏳ Add email-generation template
- ⏳ Document API for developers

### Phase 4: Optimization
- ⏳ A/B testing framework
- ⏳ Cost analytics
- ⏳ Performance monitoring
- ⏳ Prompt optimization suggestions

## Next Actions for You

1. **Restore Supabase Database**
   - Go to Supabase dashboard
   - Ensure project is active
   - Run: `npx prisma db push`

2. **Test the Migration**
   ```bash
   npx prisma studio
   # Verify prompt_templates and prompt_executions tables exist
   ```

3. **Create Sample Template**
   - Use Prisma Studio or API
   - Create a diet plan template
   - Test variable substitution

4. **Let me know when database is ready**
   - I'll create the backend API
   - Then build the UI
   - Then update diet-plan service

## Questions?

- How many prompt templates do you anticipate creating?
- What other use cases besides diet plans?
- Do you want template marketplace/sharing between orgs?
- Should templates support conditional logic (if/else)?
- Need multi-language support?

---

**Created by**: Claude Code
**Date**: November 5, 2025
**Status**: Schema ready, awaiting database migration
