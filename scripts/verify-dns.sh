#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 NeurallEmpire DNS & Domain Verification"
echo "=========================================="
echo ""

# Railway Configuration
echo -e "${BLUE}📡 Railway Configuration:${NC}"
echo "----------------------------------------"
railway domain 2>/dev/null || echo "Run 'railway login' first"
echo ""

# DNS Records Check
echo -e "${BLUE}🌐 DNS Records Check:${NC}"
echo "----------------------------------------"

echo "1️⃣ Checking neurallempire.com (apex):"
dig +short neurallempire.com A | while read ip; do
  echo "  → A: $ip"
done
dig +short neurallempire.com CNAME | while read cname; do
  echo "  → CNAME: $cname"
done
echo ""

echo "2️⃣ Checking www.neurallempire.com:"
dig +short www.neurallempire.com CNAME | while read cname; do
  echo "  → CNAME: $cname"
done
dig +short www.neurallempire.com A | while read ip; do
  echo "  → A: $ip"
done
echo ""

echo "3️⃣ Checking wildcard (*.neurallempire.com):"
dig +short test.neurallempire.com CNAME | while read cname; do
  echo "  → CNAME: $cname"
done
dig +short test.neurallempire.com A | while read ip; do
  echo "  → A: $ip"
done
echo ""

echo "4️⃣ Expected Railway CNAME target:"
echo "  → ff0f0dsk.up.railway.app"
echo ""

# HTTP/HTTPS Checks
echo -e "${BLUE}🔒 HTTP/HTTPS Response Check:${NC}"
echo "----------------------------------------"

echo "1️⃣ https://neurallempire.com"
STATUS1=$(curl -s -o /dev/null -w "%{http_code}" https://neurallempire.com/health 2>/dev/null || echo "ERROR")
if [ "$STATUS1" = "200" ]; then
  echo -e "  ${GREEN}✅ Status: $STATUS1${NC}"
else
  echo -e "  ${RED}❌ Status: $STATUS1${NC}"
fi

echo "2️⃣ https://www.neurallempire.com"
STATUS2=$(curl -s -o /dev/null -w "%{http_code}" https://www.neurallempire.com/health 2>/dev/null || echo "ERROR")
if [ "$STATUS2" = "200" ]; then
  echo -e "  ${GREEN}✅ Status: $STATUS2${NC}"
else
  echo -e "  ${RED}❌ Status: $STATUS2${NC}"
fi

echo "3️⃣ https://test.neurallempire.com (wildcard test)"
STATUS3=$(curl -s -o /dev/null -w "%{http_code}" https://test.neurallempire.com/health 2>/dev/null || echo "ERROR")
if [ "$STATUS3" = "200" ]; then
  echo -e "  ${GREEN}✅ Status: $STATUS3${NC}"
else
  echo -e "  ${YELLOW}⚠️  Status: $STATUS3 (Expected if DNS not propagated)${NC}"
fi
echo ""

# SSL Certificate Check
echo -e "${BLUE}🔐 SSL Certificate Check:${NC}"
echo "----------------------------------------"
echo "1️⃣ www.neurallempire.com SSL:"
echo | openssl s_client -servername www.neurallempire.com -connect www.neurallempire.com:443 2>/dev/null | openssl x509 -noout -subject -issuer 2>/dev/null || echo "  ⚠️  SSL check failed"
echo ""

# CORS Headers Check
echo -e "${BLUE}🌍 CORS Headers Check:${NC}"
echo "----------------------------------------"
echo "Testing with Origin: https://www.neurallempire.com"
CORS_HEADERS=$(curl -s -X OPTIONS https://www.neurallempire.com/api/auth/login \
  -H "Origin: https://www.neurallempire.com" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep -i "access-control")

if echo "$CORS_HEADERS" | grep -q "access-control-allow-origin"; then
  echo -e "${GREEN}✅ CORS headers present:${NC}"
  echo "$CORS_HEADERS" | sed 's/^/  /'
else
  echo -e "${RED}❌ No CORS headers found${NC}"
fi
echo ""

# Login Test
echo -e "${BLUE}🔑 Login Endpoint Test:${NC}"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST https://www.neurallempire.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.neurallempire.com" \
  -d '{"email":"admin@neurallempire.com","password":"NeurallEmpire2024!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Login successful${NC}"
  echo "$LOGIN_RESPONSE" | jq -r '.data.user.email, .data.organization.slug' | sed 's/^/  → /'
else
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' | sed 's/^/  /'
fi
echo ""

# Recommendations
echo -e "${BLUE}📋 Recommendations:${NC}"
echo "----------------------------------------"

# Check if apex points to Railway
APEX_CNAME=$(dig +short neurallempire.com CNAME)
if [ -z "$APEX_CNAME" ]; then
  echo -e "${YELLOW}⚠️  Apex domain (neurallempire.com) has no CNAME${NC}"
  echo "   Action: Add CNAME neurallempire.com → ff0f0dsk.up.railway.app"
elif [[ "$APEX_CNAME" == *"railway"* ]]; then
  echo -e "${GREEN}✅ Apex domain points to Railway${NC}"
else
  echo -e "${YELLOW}⚠️  Apex CNAME: $APEX_CNAME (should be Railway)${NC}"
fi

# Check if wildcard points to Railway
WILDCARD_CNAME=$(dig +short test.neurallempire.com CNAME)
if [[ "$WILDCARD_CNAME" == *"railway"* ]]; then
  echo -e "${GREEN}✅ Wildcard subdomain points to Railway${NC}"
elif [[ "$WILDCARD_CNAME" == *"www.neurallempire.com"* ]]; then
  echo -e "${YELLOW}⚠️  Wildcard points to www (should point to Railway)${NC}"
  echo "   Action: Change * CNAME to ff0f0dsk.up.railway.app"
else
  echo -e "${RED}❌ Wildcard misconfigured: $WILDCARD_CNAME${NC}"
fi

echo ""
echo -e "${GREEN}✅ Verification Complete!${NC}"
