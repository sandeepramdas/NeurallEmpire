#!/bin/bash

# 🔍 NeurallEmpire System Status Checker
# Run this script to check all system connections and configurations

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

echo -e "${BLUE}===========================================${NC}"
echo -e "${PURPLE}🧠👑 NeurallEmpire System Status Check${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" == "success" ]; then
        echo -e "${CHECK} ${GREEN}$message${NC}"
    elif [ "$status" == "error" ]; then
        echo -e "${CROSS} ${RED}$message${NC}"
    elif [ "$status" == "warning" ]; then
        echo -e "${WARNING} ${YELLOW}$message${NC}"
    else
        echo -e "${INFO} ${BLUE}$message${NC}"
    fi
}

# Function to test URL with timeout
test_url() {
    local url=$1
    local timeout=${2:-5}
    curl -s --max-time $timeout "$url" > /dev/null 2>&1
}

# 1. Check Project Directory
echo -e "${BLUE}📁 Project Directory Check${NC}"
if [ -d "/Users/sandeepramdaz/NeurallEmpire" ]; then
    cd /Users/sandeepramdaz/NeurallEmpire
    print_status "success" "NeurallEmpire directory found"
    print_status "info" "Current directory: $(pwd)"
else
    print_status "error" "NeurallEmpire directory not found"
    exit 1
fi
echo ""

# 2. Git Repository Status
echo -e "${BLUE}📋 Git Repository Status${NC}"
if [ -d ".git" ]; then
    print_status "success" "Git repository initialized"

    # Check git status
    git_status=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    if [ "$git_status" -gt 0 ]; then
        print_status "warning" "$git_status uncommitted changes found"
        echo -e "   Run: ${YELLOW}git status${NC} to see details"
    else
        print_status "success" "Working directory clean"
    fi

    # Check current branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    print_status "info" "Current branch: $current_branch"
else
    print_status "error" "Not a git repository"
fi
echo ""

# 3. GitHub CLI Status
echo -e "${BLUE}🐙 GitHub Integration${NC}"
if command -v gh &> /dev/null; then
    print_status "success" "GitHub CLI installed"

    # Check authentication
    if gh auth status &> /dev/null; then
        gh_user=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
        print_status "success" "GitHub authenticated as: $gh_user"
    else
        print_status "error" "GitHub not authenticated"
    fi
else
    print_status "error" "GitHub CLI not installed"
fi
echo ""

# 4. Node.js & Dependencies
echo -e "${BLUE}📦 Node.js & Dependencies${NC}"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    print_status "success" "Node.js installed: $node_version"
else
    print_status "error" "Node.js not installed"
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    print_status "success" "npm installed: v$npm_version"
else
    print_status "error" "npm not installed"
fi

# Check backend dependencies
if [ -f "backend/package.json" ]; then
    if [ -d "backend/node_modules" ]; then
        print_status "success" "Backend dependencies installed"
    else
        print_status "warning" "Backend dependencies not installed"
        echo -e "   Run: ${YELLOW}cd backend && npm install${NC}"
    fi
else
    print_status "error" "Backend package.json not found"
fi

# Check frontend dependencies
if [ -f "frontend/package.json" ]; then
    if [ -d "frontend/node_modules" ]; then
        print_status "success" "Frontend dependencies installed"
    else
        print_status "warning" "Frontend dependencies not installed"
        echo -e "   Run: ${YELLOW}cd frontend && npm install${NC}"
    fi
else
    print_status "error" "Frontend package.json not found"
fi
echo ""

# 5. Database Connection (Supabase)
echo -e "${BLUE}🗄️ Database Connection (Supabase)${NC}"
if [ -f "backend/.env" ]; then
    print_status "success" "Environment file found"

    # Check if DATABASE_URL exists
    if grep -q "DATABASE_URL" backend/.env; then
        db_host=$(grep "DATABASE_URL" backend/.env | grep -o 'supabase.com' || echo "")
        if [ ! -z "$db_host" ]; then
            print_status "success" "Supabase DATABASE_URL configured"

            # Test database connection
            if [ -f "backend/node_modules/.bin/prisma" ]; then
                echo -e "   ${INFO} Testing database connection..."
                if cd backend && timeout 10 npx prisma db pull --preview-feature &> /dev/null; then
                    print_status "success" "Database connection successful"
                else
                    print_status "warning" "Database connection test failed or timed out"
                fi
                cd ..
            else
                print_status "warning" "Prisma not installed, cannot test connection"
            fi
        else
            print_status "error" "DATABASE_URL not configured for Supabase"
        fi
    else
        print_status "error" "DATABASE_URL not found in .env"
    fi
else
    print_status "error" "Backend .env file not found"
    echo -e "   Copy: ${YELLOW}cp .env.example backend/.env${NC}"
fi
echo ""

# 6. Railway Connection
echo -e "${BLUE}🚂 Railway Deployment${NC}"
if command -v railway &> /dev/null; then
    print_status "success" "Railway CLI installed"

    # Check authentication
    railway_user=$(railway whoami 2>/dev/null | head -1 || echo "")
    if [[ $railway_user == *"Logged in"* ]]; then
        print_status "success" "$railway_user"

        # Check if project is linked
        if railway status &> /dev/null; then
            print_status "success" "Railway project linked"
        else
            print_status "warning" "Railway project not linked"
            echo -e "   Run: ${YELLOW}railway link${NC} to connect"
        fi

        # List available projects
        echo -e "   ${INFO} Available projects:"
        railway list 2>/dev/null | tail -n +2 | while IFS= read -r line; do
            echo -e "     • $line"
        done
    else
        print_status "error" "Railway not authenticated"
        echo -e "   Run: ${YELLOW}railway login${NC}"
    fi
else
    print_status "error" "Railway CLI not installed"
fi
echo ""

# 7. MCP Browser Access
echo -e "${BLUE}🌐 MCP Browser Access${NC}"
if [ -f "$HOME/puppeteer-mcp-server/package.json" ]; then
    print_status "success" "Puppeteer MCP server installed"
else
    print_status "error" "Puppeteer MCP server not found"
fi

# Check Claude Desktop configuration
claude_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$claude_config" ]; then
    print_status "success" "Claude Desktop MCP config found"
    if grep -q "puppeteer" "$claude_config"; then
        print_status "success" "Puppeteer MCP server configured"
    else
        print_status "warning" "Puppeteer not configured in MCP"
    fi
else
    print_status "warning" "Claude Desktop MCP config not found"
fi
echo ""

# 8. Running Services
echo -e "${BLUE}🔄 Running Services${NC}"

# Check for running backend
if lsof -i :3001 &> /dev/null; then
    backend_pid=$(lsof -ti :3001)
    print_status "success" "Backend running on port 3001 (PID: $backend_pid)"
else
    print_status "info" "Backend not running on port 3001"
fi

# Check for running frontend
for port in 3000 3002 5173 8000; do
    if lsof -i :$port &> /dev/null; then
        frontend_pid=$(lsof -ti :$port)
        print_status "success" "Frontend running on port $port (PID: $frontend_pid)"
        break
    fi
done

# Check for common development ports
if ! lsof -i :3000 &> /dev/null && ! lsof -i :3002 &> /dev/null && ! lsof -i :5173 &> /dev/null && ! lsof -i :8000 &> /dev/null; then
    print_status "info" "Frontend not running"
fi
echo ""

# 9. URLs and Endpoints
echo -e "${BLUE}🔗 URLs & Endpoints${NC}"

# Local development URLs
print_status "info" "Local development URLs:"
echo -e "   • Backend: ${BLUE}http://localhost:3001${NC}"
echo -e "   • Frontend: ${BLUE}http://localhost:3000${NC} or ${BLUE}http://localhost:8000${NC}"
echo -e "   • API Docs: ${BLUE}http://localhost:3001/api${NC}"
echo -e "   • Health Check: ${BLUE}http://localhost:3001/health${NC}"

# GitHub Pages URL
echo -e "   • GitHub Pages: ${BLUE}https://sandeepramdas.github.io/NeurallEmpire${NC}"

# Test GitHub Pages if accessible
if test_url "https://sandeepramdas.github.io/NeurallEmpire" 10; then
    print_status "success" "GitHub Pages deployment accessible"
else
    print_status "warning" "GitHub Pages deployment not accessible"
fi
echo ""

# 10. Quick Actions
echo -e "${BLUE}⚡ Quick Actions${NC}"
echo -e "${GREEN}Development:${NC}"
echo -e "   • Start backend: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "   • Start frontend: ${YELLOW}cd frontend && npm run dev${NC}"
echo -e "   • Install deps: ${YELLOW}cd backend && npm install && cd ../frontend && npm install${NC}"
echo ""
echo -e "${GREEN}Database:${NC}"
echo -e "   • Prisma studio: ${YELLOW}cd backend && npm run studio${NC}"
echo -e "   • Generate client: ${YELLOW}cd backend && npm run generate${NC}"
echo -e "   • Push schema: ${YELLOW}cd backend && npx prisma db push${NC}"
echo ""
echo -e "${GREEN}Deployment:${NC}"
echo -e "   • Deploy to Railway: ${YELLOW}railway up${NC}"
echo -e "   • Link Railway: ${YELLOW}railway link${NC}"
echo -e "   • Build frontend: ${YELLOW}cd frontend && npm run build${NC}"
echo ""

# Summary
echo -e "${BLUE}===========================================${NC}"
echo -e "${PURPLE}📊 System Status Summary${NC}"
echo -e "${BLUE}===========================================${NC}"

# Count successful checks
success_count=0
total_checks=8

# This is a simplified count - in a real implementation you'd track each check
echo -e "${INFO} Run this script anytime with: ${YELLOW}./system-status.sh${NC}"
echo -e "${INFO} For detailed logs: ${YELLOW}./system-status.sh | tee status.log${NC}"
echo ""
echo -e "${ROCKET} ${GREEN}Ready to build the future with AI agents!${NC}"