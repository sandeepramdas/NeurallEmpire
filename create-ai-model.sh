#!/bin/bash

# ==============================================================================
# AI Model Creation Script for NeurallEmpire
# ==============================================================================
# This script creates a GPT-4o Mini model configuration via API
# ==============================================================================

set -e

# Configuration
API_URL="https://neurallempire-production.up.railway.app"
OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

echo "=================================================="
echo "NeurallEmpire AI Model Creation"
echo "=================================================="
echo ""

# Step 1: Check if user is already logged in (requires manual login first)
echo "⚠️  IMPORTANT: You must be logged in to the web application first!"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open your browser and go to: https://www.neurallempire.com"
echo "2. Login or register an account"
echo "3. Go to Settings > AI Models"
echo "4. Click 'Add AI Model' button"
echo "5. Fill in the form with these values:"
echo ""
echo "   ┌─────────────────────────────────────────────────────────┐"
echo "   │ FORM VALUES FOR GPT-4o MINI MODEL                       │"
echo "   ├─────────────────────────────────────────────────────────┤"
echo "   │ Provider:     OpenAI GPT Models                         │"
echo "   │ Model ID:     gpt-4o-mini                               │"
echo "   │ Display Name: GPT-4o Mini - Fast & Efficient            │"
echo "   │ Description:  Ultra-efficient model for low-latency     │"
echo "   │               high-speed inference                      │"
echo "   │ API Key:      $OPENAI_API_KEY"
echo "   │ Max Tokens:   2000                                      │"
echo "   │ Temperature:  0.7                                       │"
echo "   │ Top P:        0.95                                      │"
echo "   └─────────────────────────────────────────────────────────┘"
echo ""
echo "6. Click 'Test Connection' to verify it works"
echo "7. Click 'Save' to create the model"
echo ""
echo "=================================================="
echo ""

# Alternative: Test the model connection directly
echo "Testing OpenAI API Key connectivity..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Key is valid and working!"
    echo ""
    echo "Available models include:"
    echo "$BODY" | grep -o '"id":"[^"]*"' | head -10 | sed 's/"id":"/  - /' | sed 's/"$//'
else
    echo "❌ API Key validation failed (HTTP $HTTP_CODE)"
    echo ""
    echo "Response:"
    echo "$BODY"
    echo ""
    echo "Possible issues:"
    echo "  - API key may be invalid"
    echo "  - API key may have exceeded rate limits"
    echo "  - API key may lack proper permissions"
fi

echo ""
echo "=================================================="
echo "Next Steps:"
echo "=================================================="
echo "1. Go to: https://www.neurallempire.com/org/sr/settings/ai-models"
echo "2. Follow the form values shown above"
echo "3. Create your GPT-4o Mini model"
echo ""
