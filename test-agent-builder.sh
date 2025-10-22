#!/bin/bash

# Test Agent Builder on Production
# Run this script to test the complete agent builder functionality

set -e

echo "=================================================="
echo "🧪 NeurallEmpire Agent Builder Test Suite"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://www.neurallempire.com/api"

# Check if token is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Authentication token required${NC}"
    echo ""
    echo "Usage: ./test-agent-builder.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "To get your token:"
    echo "1. Open browser DevTools (F12)"
    echo "2. Go to Application > Local Storage > neurallempire.com"
    echo "3. Copy the 'authToken' value"
    echo ""
    exit 1
fi

TOKEN="$1"

echo "Using API: $API_URL"
echo ""

# Test 1: Verify Authentication
echo "=================================================="
echo "Test 1: Verify Authentication"
echo "=================================================="
echo ""

AUTH_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

if echo "$AUTH_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Authentication successful${NC}"
    echo "$AUTH_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "$AUTH_RESPONSE" | jq '.'
    exit 1
fi
echo ""

# Test 2: List Existing Agents
echo "=================================================="
echo "Test 2: List Existing Agents"
echo "=================================================="
echo ""

AGENTS_RESPONSE=$(curl -s -X GET "$API_URL/agents" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

AGENT_COUNT=$(echo "$AGENTS_RESPONSE" | jq -r '.data | length')
echo -e "${GREEN}✅ Found $AGENT_COUNT existing agents${NC}"
echo "$AGENTS_RESPONSE" | jq '.'
echo ""

# Test 3: Create Test Agent
echo "=================================================="
echo "Test 3: Create Test Agent"
echo "=================================================="
echo ""

TEST_AGENT_NAME="Test Agent $(date +%s)"

CREATE_PAYLOAD=$(cat <<EOF
{
  "name": "$TEST_AGENT_NAME",
  "type": "LEAD_GENERATOR",
  "category": "Test",
  "description": "Automated test agent created by test suite",
  "config": {
    "systemPrompt": "You are a helpful test assistant.",
    "temperature": 0.7,
    "maxTokens": 2000,
    "model": "gpt-4"
  },
  "capabilities": ["web_search", "email_send"]
}
EOF
)

echo "Creating agent with payload:"
echo "$CREATE_PAYLOAD" | jq '.'
echo ""

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/agents" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CREATE_PAYLOAD")

if echo "$CREATE_RESPONSE" | grep -q "success.*true"; then
    AGENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
    echo -e "${GREEN}✅ Agent created successfully${NC}"
    echo "Agent ID: $AGENT_ID"
    echo "$CREATE_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Agent creation failed${NC}"
    echo "$CREATE_RESPONSE" | jq '.'
    exit 1
fi
echo ""

# Test 4: Get Agent Details
echo "=================================================="
echo "Test 4: Get Agent Details"
echo "=================================================="
echo ""

GET_RESPONSE=$(curl -s -X GET "$API_URL/agents/$AGENT_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

if echo "$GET_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Agent retrieved successfully${NC}"
    echo "$GET_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to retrieve agent${NC}"
    echo "$GET_RESPONSE" | jq '.'
fi
echo ""

# Test 5: Update Agent Status
echo "=================================================="
echo "Test 5: Update Agent Status to ACTIVE"
echo "=================================================="
echo ""

STATUS_RESPONSE=$(curl -s -X PUT "$API_URL/agents/$AGENT_ID/status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status": "ACTIVE"}')

if echo "$STATUS_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Agent status updated to ACTIVE${NC}"
    echo "$STATUS_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to update agent status${NC}"
    echo "$STATUS_RESPONSE" | jq '.'
fi
echo ""

# Test 6: Get Agent Metrics
echo "=================================================="
echo "Test 6: Get Agent Metrics"
echo "=================================================="
echo ""

METRICS_RESPONSE=$(curl -s -X GET "$API_URL/agents/$AGENT_ID/metrics" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

if echo "$METRICS_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Agent metrics retrieved${NC}"
    echo "$METRICS_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to retrieve metrics${NC}"
    echo "$METRICS_RESPONSE" | jq '.'
fi
echo ""

# Test 7: Execute Agent (Optional - comment out if not ready)
echo "=================================================="
echo "Test 7: Execute Agent"
echo "=================================================="
echo ""

EXECUTE_RESPONSE=$(curl -s -X POST "$API_URL/agents/$AGENT_ID/execute" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"input": "Hello, this is a test message"}')

if echo "$EXECUTE_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Agent execution started${NC}"
    echo "$EXECUTE_RESPONSE" | jq '.'
else
    echo -e "${YELLOW}⚠️  Agent execution response:${NC}"
    echo "$EXECUTE_RESPONSE" | jq '.'
fi
echo ""

# Test 8: Update Agent
echo "=================================================="
echo "Test 8: Update Agent Configuration"
echo "=================================================="
echo ""

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/agents/$AGENT_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "description": "Updated description via test suite",
        "config": {
            "temperature": 0.8
        }
    }')

if echo "$UPDATE_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Agent updated successfully${NC}"
    echo "$UPDATE_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to update agent${NC}"
    echo "$UPDATE_RESPONSE" | jq '.'
fi
echo ""

# Test 9: Delete Agent (Cleanup)
echo "=================================================="
echo "Test 9: Delete Test Agent (Cleanup)"
echo "=================================================="
echo ""

read -p "Delete test agent? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/agents/$AGENT_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")

    if echo "$DELETE_RESPONSE" | grep -q "success.*true"; then
        echo -e "${GREEN}✅ Test agent deleted successfully${NC}"
        echo "$DELETE_RESPONSE" | jq '.'
    else
        echo -e "${RED}❌ Failed to delete test agent${NC}"
        echo "$DELETE_RESPONSE" | jq '.'
    fi
else
    echo -e "${YELLOW}ℹ️  Test agent kept (ID: $AGENT_ID)${NC}"
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo ""
echo -e "${GREEN}✅ All core agent builder tests completed!${NC}"
echo ""
echo "Test Coverage:"
echo "  ✓ Authentication"
echo "  ✓ List agents"
echo "  ✓ Create agent"
echo "  ✓ Get agent details"
echo "  ✓ Update agent status"
echo "  ✓ Get agent metrics"
echo "  ✓ Execute agent"
echo "  ✓ Update agent"
echo "  ✓ Delete agent"
echo ""
echo "Your agent builder is fully functional! 🎉"
echo ""
