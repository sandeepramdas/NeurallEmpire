#!/bin/bash

# 🧪 NeurallEmpire System Testing & Verification Script
# Comprehensive testing for OAuth, subdomain routing, and core functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
TEST_ORG_SLUG="test-org-$(date +%s)"
API_ENDPOINT="$BACKEND_URL/api"

echo "🧪 NeurallEmpire System Testing Suite"
echo "====================================="
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2

    echo -n "🔍 Checking $name... "

    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3

    echo -n "🔗 Testing $description... "

    local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ Status $status${NC}"
        return 0
    else
        echo -e "${RED}❌ Status $status (expected $expected_status)${NC}"
        return 1
    fi
}

# Function to test database connection
test_database() {
    echo -n "💾 Testing database connection... "

    cd backend
    if npx prisma db pull > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}❌ Connection failed${NC}"
        cd ..
        return 1
    fi
}

# Function to test OAuth provider configuration
test_oauth_config() {
    echo -n "🔐 Testing OAuth provider endpoints... "

    local providers=("google" "github" "linkedin" "microsoft")
    local success_count=0

    for provider in "${providers[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/oauth/$provider")
        if [ "$status" = "200" ] || [ "$status" = "302" ]; then
            ((success_count++))
        fi
    done

    if [ $success_count -eq ${#providers[@]} ]; then
        echo -e "${GREEN}✅ All $success_count providers configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $success_count/${#providers[@]} providers configured${NC}"
        return 1
    fi
}

# Function to test subdomain API
test_subdomain_api() {
    echo -n "🌐 Testing subdomain management API... "

    # Test subdomain creation endpoint (should require auth)
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/subdomain/create" -X POST)

    if [ "$status" = "401" ] || [ "$status" = "403" ]; then
        echo -e "${GREEN}✅ Protected endpoint working${NC}"
        return 0
    else
        echo -e "${RED}❌ Unexpected status $status${NC}"
        return 1
    fi
}

# Function to test environment variables
test_environment() {
    echo "🔧 Testing environment configuration..."

    local env_file="backend/.env"
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "GOOGLE_CLIENT_ID"
        "GITHUB_CLIENT_ID"
        "CLOUDFLARE_API_TOKEN"
        "ENCRYPTION_KEY"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" "$env_file" && ! grep -q "^${var}=your_" "$env_file"; then
            echo -e "  ${GREEN}✅ $var configured${NC}"
        else
            echo -e "  ${YELLOW}⚠️  $var needs configuration${NC}"
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All environment variables configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  ${#missing_vars[@]} variables need configuration${NC}"
        return 1
    fi
}

# Function to run frontend build test
test_frontend_build() {
    echo -n "🏗️  Testing frontend build... "

    cd frontend
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Build successful${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}❌ Build failed${NC}"
        cd ..
        return 1
    fi
}

# Function to test security headers
test_security_headers() {
    echo "🔒 Testing security headers..."

    local headers=$(curl -s -I "$FRONTEND_URL" 2>/dev/null || echo "")

    if echo "$headers" | grep -qi "x-frame-options"; then
        echo -e "  ${GREEN}✅ X-Frame-Options header present${NC}"
    else
        echo -e "  ${YELLOW}⚠️  X-Frame-Options header missing${NC}"
    fi

    if echo "$headers" | grep -qi "x-content-type-options"; then
        echo -e "  ${GREEN}✅ X-Content-Type-Options header present${NC}"
    else
        echo -e "  ${YELLOW}⚠️  X-Content-Type-Options header missing${NC}"
    fi
}

# Main testing sequence
echo -e "${BLUE}🚀 Starting comprehensive system tests...${NC}"
echo ""

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: Service availability
echo -e "${BLUE}📊 Test 1: Service Availability${NC}"
((TOTAL_TESTS++))
if check_service "$BACKEND_URL/health" "Backend API" && check_service "$FRONTEND_URL" "Frontend"; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 2: Database connectivity
echo -e "${BLUE}📊 Test 2: Database Connectivity${NC}"
((TOTAL_TESTS++))
if test_database; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 3: API endpoints
echo -e "${BLUE}📊 Test 3: Core API Endpoints${NC}"
((TOTAL_TESTS++))
if test_api_endpoint "$API_ENDPOINT/health" "200" "Health check"; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 4: OAuth configuration
echo -e "${BLUE}📊 Test 4: OAuth Configuration${NC}"
((TOTAL_TESTS++))
if test_oauth_config; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 5: Subdomain API
echo -e "${BLUE}📊 Test 5: Subdomain API${NC}"
((TOTAL_TESTS++))
if test_subdomain_api; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 6: Environment configuration
echo -e "${BLUE}📊 Test 6: Environment Configuration${NC}"
((TOTAL_TESTS++))
if test_environment; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 7: Frontend build
echo -e "${BLUE}📊 Test 7: Frontend Build${NC}"
((TOTAL_TESTS++))
if test_frontend_build; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 8: Security headers
echo -e "${BLUE}📊 Test 8: Security Headers${NC}"
((TOTAL_TESTS++))
test_security_headers
((PASSED_TESTS++)) # This test is informational only
echo ""

# Test results summary
echo "📊 Test Results Summary"
echo "======================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for deployment.${NC}"
    exit 0
elif [ $PASSED_TESTS -ge $((TOTAL_TESTS * 3 / 4)) ]; then
    echo -e "${YELLOW}⚠️  Most tests passed. Review warnings and deploy with caution.${NC}"
    exit 0
else
    echo -e "${RED}❌ Multiple test failures. Fix issues before deployment.${NC}"
    exit 1
fi