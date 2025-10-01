#!/bin/bash

echo "🧪 Testing NeurallEmpire Login Flow"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://www.neurallempire.com/api"

echo "1️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s "$API_URL/../health")
echo "$HEALTH" | jq '.'
echo ""

echo "2️⃣ Testing CORS Preflight (OPTIONS)..."
curl -s -X OPTIONS "$API_URL/auth/login" \
  -H "Origin: https://www.neurallempire.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-tenant" \
  -v 2>&1 | grep "< access-control"
echo ""

echo "3️⃣ Testing Login WITHOUT x-tenant header..."
RESPONSE1=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Origin: https://www.neurallempire.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@neurallempire.com","password":"NeurallEmpire2024!"}')
echo "$RESPONSE1" | jq '.'
echo ""

echo "4️⃣ Testing Login WITH x-tenant: neurallempire..."
RESPONSE2=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Origin: https://www.neurallempire.com" \
  -H "Content-Type: application/json" \
  -H "x-tenant: neurallempire" \
  -d '{"email":"admin@neurallempire.com","password":"NeurallEmpire2024!"}')
echo "$RESPONSE2" | jq '.'
echo ""

echo "5️⃣ Testing with different credentials..."
RESPONSE3=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Origin: https://www.neurallempire.com" \
  -H "Content-Type: application/json" \
  -H "x-tenant: neurallempire" \
  -d '{"email":"test@example.com","password":"test123"}')
echo "$RESPONSE3" | jq '.'
echo ""

echo "6️⃣ Checking rate limit headers..."
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -v 2>&1 | grep -i "rate\|ratelimit\|x-ratelimit"
echo ""

echo "✅ Test Complete!"
