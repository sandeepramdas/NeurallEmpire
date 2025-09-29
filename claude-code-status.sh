#!/bin/bash

# 🤖 Claude Code System Status Checker
# Run this script to check Claude Code configuration and MCP connections

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROBOT="🤖"
BRAIN="🧠"

echo -e "${CYAN}============================================${NC}"
echo -e "${PURPLE}${ROBOT} Claude Code System Status Check${NC}"
echo -e "${CYAN}============================================${NC}"
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

# 1. Claude Code Environment Check
echo -e "${BLUE}🔧 Claude Code Environment${NC}"
if [ ! -z "$CLAUDE_CODE" ]; then
    print_status "success" "Running in Claude Code environment"
else
    print_status "info" "Claude Code environment variable not set"
fi

# Check current working directory
current_dir=$(pwd)
print_status "info" "Working directory: $current_dir"

if [[ $current_dir == *"NeurallEmpire"* ]]; then
    print_status "success" "Currently in NeurallEmpire project"
else
    print_status "warning" "Not in NeurallEmpire project directory"
    echo -e "   Run: ${YELLOW}cd ~/NeurallEmpire${NC}"
fi
echo ""

# 2. MCP Server Status
echo -e "${BLUE}🔌 MCP Server Status${NC}"

# Check running MCP processes
mcp_processes=$(ps aux | grep -E "mcp|puppeteer" | grep -v grep | wc -l | tr -d ' ')
if [ "$mcp_processes" -gt 0 ]; then
    print_status "success" "$mcp_processes MCP processes running"
    echo -e "   ${INFO} Active MCP processes:"
    ps aux | grep -E "mcp|puppeteer" | grep -v grep | while IFS= read -r line; do
        echo -e "     • $(echo $line | awk '{print $11, $12, $13}')"
    done
else
    print_status "warning" "No MCP processes detected"
fi

# Check for specific MCP servers
if ps aux | grep -q "mcp-server-filesystem" | grep -v grep; then
    print_status "success" "Filesystem MCP server running"
else
    print_status "info" "Filesystem MCP server not detected"
fi

if ps aux | grep -q "puppeteer-mcp-server" | grep -v grep; then
    print_status "success" "Puppeteer MCP server running"
else
    print_status "warning" "Puppeteer MCP server not running"
fi
echo ""

# 3. MCP Configuration Files
echo -e "${BLUE}⚙️ MCP Configuration${NC}"

# Check Claude Desktop MCP config
claude_desktop_config="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$claude_desktop_config" ]; then
    print_status "success" "Claude Desktop MCP config found"

    # Check for configured servers
    if grep -q "puppeteer" "$claude_desktop_config"; then
        print_status "success" "Puppeteer MCP server configured"
    else
        print_status "warning" "Puppeteer MCP server not configured"
    fi

    if grep -q "filesystem" "$claude_desktop_config"; then
        print_status "success" "Filesystem MCP server configured"
    else
        print_status "info" "Filesystem MCP server not configured"
    fi

    # Show configured servers
    echo -e "   ${INFO} Configured MCP servers:"
    if command -v jq &> /dev/null; then
        jq -r '.mcpServers | keys[]' "$claude_desktop_config" 2>/dev/null | while IFS= read -r server; do
            echo -e "     • $server"
        done
    else
        grep -o '"[^"]*"' "$claude_desktop_config" | grep -v mcpServers | head -5 | while IFS= read -r server; do
            echo -e "     • $server"
        done
    fi
else
    print_status "error" "Claude Desktop MCP config not found"
    echo -e "   Expected at: ${YELLOW}$claude_desktop_config${NC}"
fi

# Check Claude Code specific config
claude_code_config="$HOME/.config/claude-code/claude_desktop_config.json"
if [ -f "$claude_code_config" ]; then
    print_status "success" "Claude Code MCP config found"
else
    print_status "info" "Claude Code MCP config not found"
fi
echo ""

# 4. Browser Access Setup
echo -e "${BLUE}🌐 Browser Access (Chrome MCP)${NC}"

# Check if Chrome is installed
if [ -d "/Applications/Google Chrome.app" ] || command -v google-chrome &> /dev/null; then
    print_status "success" "Google Chrome installed"
else
    print_status "warning" "Google Chrome not found"
fi

# Check Puppeteer MCP server installation
if [ -d "$HOME/puppeteer-mcp-server" ]; then
    print_status "success" "Puppeteer MCP server installed"

    # Check if built
    if [ -f "$HOME/puppeteer-mcp-server/dist/index.js" ]; then
        print_status "success" "Puppeteer MCP server built"
    else
        print_status "warning" "Puppeteer MCP server not built"
        echo -e "   Run: ${YELLOW}cd ~/puppeteer-mcp-server && npm run build${NC}"
    fi
else
    print_status "error" "Puppeteer MCP server not installed"
    echo -e "   Install: ${YELLOW}git clone https://github.com/merajmehrabi/puppeteer-mcp-server.git ~/puppeteer-mcp-server${NC}"
fi
echo ""

# 5. Project-Specific Checks
echo -e "${BLUE}📁 NeurallEmpire Project Status${NC}"

if [ -f "backend/.env" ]; then
    print_status "success" "Backend environment configured"

    # Check key configurations
    if grep -q "DATABASE_URL" backend/.env; then
        if grep -q "supabase.com" backend/.env; then
            print_status "success" "Supabase database configured"
        else
            print_status "warning" "Database URL configured but not Supabase"
        fi
    else
        print_status "error" "DATABASE_URL not configured"
    fi

    if grep -q "JWT_SECRET" backend/.env; then
        print_status "success" "JWT secret configured"
    else
        print_status "warning" "JWT secret not configured"
    fi
else
    print_status "error" "Backend .env file missing"
    echo -e "   Create: ${YELLOW}cp .env.example backend/.env${NC}"
fi

# Check if dependencies are installed
if [ -d "backend/node_modules" ]; then
    print_status "success" "Backend dependencies installed"
else
    print_status "warning" "Backend dependencies missing"
    echo -e "   Install: ${YELLOW}cd backend && npm install${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    print_status "success" "Frontend dependencies installed"
else
    print_status "warning" "Frontend dependencies missing"
    echo -e "   Install: ${YELLOW}cd frontend && npm install${NC}"
fi
echo ""

# 6. Git & GitHub Integration
echo -e "${BLUE}🐙 Git & GitHub Integration${NC}"

if command -v git &> /dev/null; then
    print_status "success" "Git installed"

    # Check if in git repo
    if git rev-parse --git-dir &> /dev/null; then
        print_status "success" "Git repository initialized"

        # Check remote
        if git remote get-url origin &> /dev/null; then
            remote_url=$(git remote get-url origin)
            if [[ $remote_url == *"NeurallEmpire"* ]]; then
                print_status "success" "Connected to NeurallEmpire repository"
            else
                print_status "warning" "Connected to different repository: $remote_url"
            fi
        else
            print_status "warning" "No remote repository configured"
        fi
    else
        print_status "error" "Not in a git repository"
    fi
else
    print_status "error" "Git not installed"
fi

if command -v gh &> /dev/null; then
    print_status "success" "GitHub CLI installed"

    if gh auth status &> /dev/null; then
        gh_user=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
        print_status "success" "GitHub authenticated as: $gh_user"
    else
        print_status "warning" "GitHub CLI not authenticated"
        echo -e "   Login: ${YELLOW}gh auth login${NC}"
    fi
else
    print_status "warning" "GitHub CLI not installed"
fi
echo ""

# 7. Database Connection Test
echo -e "${BLUE}🗄️ Database Connection Test${NC}"

if [ -f "backend/.env" ] && [ -d "backend/node_modules" ]; then
    echo -e "   ${INFO} Testing database connection..."
    cd backend 2>/dev/null || true

    # Quick connection test
    if timeout 5 npx prisma db pull --preview-feature &> /dev/null; then
        print_status "success" "Database connection successful"
    else
        print_status "warning" "Database connection failed or timed out"
    fi

    cd - &> /dev/null || true
else
    print_status "info" "Cannot test database (missing .env or dependencies)"
fi
echo ""

# 8. Railway Deployment Status
echo -e "${BLUE}🚂 Railway Deployment${NC}"

if command -v railway &> /dev/null; then
    print_status "success" "Railway CLI installed"

    # Check authentication
    railway_status=$(railway whoami 2>/dev/null || echo "Not logged in")
    if [[ $railway_status == *"Logged in"* ]]; then
        print_status "success" "$railway_status"

        # Try to get project status
        if railway status &> /dev/null; then
            print_status "success" "Railway project linked and accessible"
        else
            print_status "warning" "Railway project not linked or accessible"
            echo -e "   Link project: ${YELLOW}railway link${NC}"
        fi
    else
        print_status "warning" "Railway not authenticated"
        echo -e "   Login: ${YELLOW}railway login${NC}"
    fi
else
    print_status "error" "Railway CLI not installed"
fi
echo ""

# 9. Quick Actions for Claude Code
echo -e "${CYAN}⚡ Claude Code Quick Actions${NC}"
echo -e "${GREEN}MCP Setup:${NC}"
echo -e "   • Restart Claude Code to reload MCP: ${YELLOW}(Exit and restart Claude Code)${NC}"
echo -e "   • Test browser access: ${YELLOW}Take a screenshot of google.com${NC}"
echo -e "   • Test filesystem access: ${YELLOW}Read package.json file${NC}"
echo ""
echo -e "${GREEN}Development:${NC}"
echo -e "   • Start development: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "   • Check git status: ${YELLOW}git status${NC}"
echo -e "   • Test database: ${YELLOW}cd backend && npx prisma studio${NC}"
echo ""
echo -e "${GREEN}Troubleshooting:${NC}"
echo -e "   • Rebuild MCP server: ${YELLOW}cd ~/puppeteer-mcp-server && npm run build${NC}"
echo -e "   • Reinstall dependencies: ${YELLOW}cd backend && rm -rf node_modules && npm install${NC}"
echo -e "   • Reset database: ${YELLOW}cd backend && npx prisma db push --force-reset${NC}"
echo ""

# Summary
echo -e "${CYAN}============================================${NC}"
echo -e "${PURPLE}${BRAIN} Claude Code Status Summary${NC}"
echo -e "${CYAN}============================================${NC}"
echo -e "${INFO} This script checks Claude Code's MCP configuration and project status"
echo -e "${INFO} Run anytime with: ${YELLOW}bash claude-code-status.sh${NC} or ${YELLOW}./claude-code-status.sh${NC}"
echo -e "${INFO} For help with Claude Code: ${YELLOW}/help${NC} in Claude Code"
echo ""
echo -e "${ROBOT} ${GREEN}Claude Code is ready to assist with your AI empire!${NC}"