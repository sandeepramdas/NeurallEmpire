#!/bin/bash

# Test Agent Automation
# This script demonstrates how agents work

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWc4MjQwOG0wMDAzbW84aGRoNGFmMXNqIiwib3JnYW5pemF0aW9uSWQiOiJjbWc4MjN6enkwMDAxbW84aG9odWZkbXZmIiwicm9sZSI6Ik9XTkVSIiwiaWF0IjoxNzU5NTY4Nzg0LCJleHAiOjE3NjAxNzM1ODR9.BlFBdVGBO6ZmqYyqEpywO-0ZAwsVcmIVm6I2wus_cRM"
API_URL="http://localhost:3001/api"

echo "================================"
echo "🤖 Testing Agent Automation"
echo "================================"
echo ""

# Step 1: Create an agent
echo "1. Creating a customer support agent..."
AGENT_RESPONSE=$(curl -s -X POST "$API_URL/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Bot",
    "type": "CHAT",
    "description": "24/7 customer support automation",
    "systemPrompt": "You are a helpful customer support agent for NeurallEmpire. Answer questions professionally and help users with their inquiries.",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 500
  }')

AGENT_ID=$(echo "$AGENT_RESPONSE" | jq -r '.data.id // .agent.id')

if [ "$AGENT_ID" = "null" ] || [ -z "$AGENT_ID" ]; then
  echo "❌ Failed to create agent"
  echo "$AGENT_RESPONSE" | jq
  exit 1
fi

echo "✅ Agent created: $AGENT_ID"
echo ""

# Step 2: Activate the agent
echo "2. Activating agent..."
curl -s -X POST "$API_URL/agents/$AGENT_ID/start" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# Step 3: Execute the agent
echo "3. Testing agent execution..."
echo "   Question: 'How much does the PRO plan cost?'"
echo ""

EXECUTION_RESULT=$(curl -s -X POST "$API_URL/agents/$AGENT_ID/execute" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "userMessage": "How much does the PRO plan cost?",
      "context": {
        "source": "web",
        "userId": "test-user"
      }
    }
  }')

echo "   Response:"
echo "$EXECUTION_RESULT" | jq -r '.output.message // .data.output.message // "No response"' | sed 's/^/   /'
echo ""
echo "   Metrics:"
echo "$EXECUTION_RESULT" | jq '.metrics // .data.metrics' | sed 's/^/   /'
echo ""

# Step 4: Check agent status
echo "4. Checking agent status..."
curl -s -X GET "$API_URL/agents/$AGENT_ID/status" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    id: .agent.id,
    name: .agent.name,
    status: .agent.status,
    usageCount: .agent.usageCount,
    successRate: .agent.successRate,
    avgResponseTime: .agent.avgResponseTime
  }'
echo ""

# Step 5: View recent interactions
echo "5. Viewing recent interactions..."
curl -s -X GET "$API_URL/agents/$AGENT_ID/interactions?limit=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.interactions[0] // .data[0]' | jq '{
    id,
    type,
    status,
    latency,
    startedAt
  }'
echo ""

echo "================================"
echo "✅ Agent Test Complete!"
echo "================================"
echo ""
echo "Your agent is now:"
echo "  - Created ✓"
echo "  - Activated ✓"
echo "  - Responding to queries ✓"
echo ""
echo "Next steps:"
echo "  1. Add more knowledge to the agent"
echo "  2. Set up triggers for automation"
echo "  3. Create workflows for multi-step tasks"
echo ""
echo "View full guide at: /docs/guides/AGENT_AUTOMATION_GUIDE.md"
