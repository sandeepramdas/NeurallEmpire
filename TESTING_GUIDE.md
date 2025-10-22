# 🧪 Agent Builder Testing Guide

This guide will help you test the custom agent builder on www.neurallempire.com

## Quick Start

### Method 1: Automated Test Script (Recommended)

**Step 1: Get Your Auth Token**

1. Open https://www.neurallempire.com in your browser
2. Login to your account
3. Open Browser DevTools:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
4. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
5. Navigate to **Local Storage** → `https://www.neurallempire.com`
6. Find and copy the `authToken` value

**Step 2: Run the Test Script**

```bash
cd /Users/sandeepramdaz/NeurallEmpire
./test-agent-builder.sh YOUR_AUTH_TOKEN_HERE
```

This will run 9 comprehensive tests:
- ✅ Authentication verification
- ✅ List existing agents
- ✅ Create new agent
- ✅ Get agent details
- ✅ Update agent status
- ✅ Get agent metrics
- ✅ Execute agent
- ✅ Update agent configuration
- ✅ Delete agent (cleanup)

---

### Method 2: Manual Browser Testing

**Step 1: Navigate to Agents Page**
1. Go to https://www.neurallempire.com
2. Login to your account
3. Click on **"Agents"** in the sidebar

**Step 2: Create a Test Agent**
1. Click **"Create Agent"** button
2. Fill out the form:
   ```
   Agent Name: My Test Lead Generator
   Agent Type: Lead Generator
   Description: This agent qualifies incoming leads
   Model: GPT-4
   Temperature: 0.7
   Max Tokens: 2000
   System Prompt: You are a professional lead qualification specialist.
   Capabilities: ✓ Web Search ✓ Email Send
   ```
3. Click **"Create Agent"**
4. ✅ Should see success toast and agent appears in list

**Step 3: Test Agent Management**
1. **Activate Agent**: Click the "Activate" button
   - Agent status should change to "Active"
   - Should see success notification

2. **Clone Agent**: Click the clone icon
   - Should create a copy with "(Copy)" suffix
   - Should see success notification

3. **View Details**: Click on the agent card
   - Should open modal with Overview, Run History, Settings tabs
   - Check that all details are displayed correctly

4. **Update Agent**: In detail modal, go to Settings tab
   - Change description
   - Click "Save Changes"
   - Should see success notification

5. **Pause Agent**: Click pause button
   - Status should change to "Paused"

6. **Delete Agent**: Click delete icon
   - Should show confirmation dialog
   - After confirming, agent should disappear

---

### Method 3: API Testing with cURL

**Prerequisites:**
- Have your auth token ready (see Method 1, Step 1)

**Test 1: List Agents**
```bash
curl -X GET https://www.neurallempire.com/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" | jq
```

**Test 2: Create Agent**
```bash
curl -X POST https://www.neurallempire.com/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Agent",
    "type": "LEAD_GENERATOR",
    "category": "Business",
    "description": "Created via API test",
    "config": {
      "systemPrompt": "You are a helpful assistant.",
      "temperature": 0.7,
      "maxTokens": 2000,
      "model": "gpt-4"
    },
    "capabilities": ["web_search", "email_send"]
  }' | jq
```

**Test 3: Get Agent Details**
```bash
# Replace AGENT_ID with the ID from the create response
curl -X GET https://www.neurallempire.com/api/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" | jq
```

**Test 4: Update Agent Status**
```bash
curl -X PUT https://www.neurallempire.com/api/agents/AGENT_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}' | jq
```

**Test 5: Delete Agent**
```bash
curl -X DELETE https://www.neurallempire.com/api/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" | jq
```

---

## Test Checklist

### ✅ Frontend Tests
- [ ] Can access Agents page
- [ ] Can see "Create Agent" button
- [ ] Create Agent modal opens
- [ ] Can fill out all form fields
- [ ] Form validation works (try empty name)
- [ ] Can select different agent types
- [ ] Can select different models
- [ ] Can adjust temperature and max tokens
- [ ] Can enter system prompt
- [ ] Can select capabilities (checkboxes work)
- [ ] Can successfully create agent
- [ ] New agent appears in list
- [ ] Can see agent stats (Total Runs, Success Rate)
- [ ] Can filter by status
- [ ] Can filter by model
- [ ] Can search agents by name
- [ ] Can switch between grid/list view
- [ ] Can activate/pause agents
- [ ] Can clone agents
- [ ] Can delete agents
- [ ] Can view agent details modal
- [ ] All tabs work (Overview, Run History, Settings)
- [ ] Loading states show properly
- [ ] Error messages display correctly

### ✅ Backend API Tests
- [ ] GET /api/agents returns list
- [ ] POST /api/agents creates agent
- [ ] GET /api/agents/:id returns details
- [ ] PUT /api/agents/:id updates agent
- [ ] PUT /api/agents/:id/status changes status
- [ ] GET /api/agents/:id/metrics returns metrics
- [ ] POST /api/agents/:id/execute works
- [ ] DELETE /api/agents/:id soft deletes
- [ ] Authentication required for all endpoints
- [ ] Invalid data returns proper errors
- [ ] Organization isolation works (can't see other org's agents)

### ✅ Database Tests
- [ ] Agents persist in database
- [ ] Updates are saved
- [ ] Soft delete sets isActive=false
- [ ] Metrics update correctly
- [ ] Audit logs are created

---

## Expected Results

### Successful Agent Creation
```json
{
  "success": true,
  "message": "Agent created successfully",
  "data": {
    "id": "cm...",
    "name": "My Test Agent",
    "type": "LEAD_GENERATOR",
    "status": "DRAFT",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "systemPrompt": "You are a helpful assistant.",
    "capabilities": ["web_search", "email_send"],
    "createdAt": "2025-10-21T...",
    "updatedAt": "2025-10-21T..."
  }
}
```

### Successful Agent Listing
```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "name": "My Test Agent",
      "type": "LEAD_GENERATOR",
      "status": "ACTIVE",
      "usageCount": 0,
      "successRate": 0,
      "avgResponseTime": 0,
      ...
    }
  ]
}
```

---

## Troubleshooting

### Issue: "Access token required"
**Solution:** Make sure you're including the Authorization header with your token

### Issue: "Agent limit reached"
**Solution:** Your organization has reached the maximum number of agents for your plan. Delete unused agents or upgrade your plan.

### Issue: Agent creation fails
**Solution:**
1. Check that all required fields are filled (name, type)
2. Verify token is valid and not expired
3. Check browser console for errors
4. Check network tab for API response

### Issue: Agents not loading
**Solution:**
1. Check that you're logged in
2. Refresh the page
3. Clear browser cache
4. Check browser console for errors

---

## Performance Benchmarks

Expected API response times:
- GET /api/agents: < 500ms
- POST /api/agents: < 1000ms
- GET /api/agents/:id: < 300ms
- PUT /api/agents/:id: < 800ms
- DELETE /api/agents/:id: < 500ms

---

## Next Steps After Testing

Once you've verified everything works:

1. **Create Your Production Agents**
   - Lead Qualifier
   - Email Responder
   - Content Generator
   - etc.

2. **Configure Each Agent**
   - Fine-tune system prompts
   - Adjust temperature for your use case
   - Select appropriate capabilities

3. **Activate Agents**
   - Set status to ACTIVE
   - Monitor initial performance

4. **Monitor Metrics**
   - Track usage count
   - Monitor success rate
   - Check average response time

5. **Iterate and Improve**
   - Refine prompts based on results
   - Adjust configuration
   - Add new capabilities as needed

---

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the Network tab for failed requests
3. Verify your authentication token is valid
4. Review the API response for error messages

---

**Happy Testing! 🚀**
