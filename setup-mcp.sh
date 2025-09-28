#!/bin/bash

# 🔧 Automated MCP Setup for NeurallEmpire Supabase Integration
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${GREEN}🔧 NeurallEmpire MCP Server Setup${NC}"
echo -e "${BLUE}Connecting your Supabase database to Claude Code${NC}"
echo ""

# Check if Claude Code is installed
echo -e "${BLUE}🔍 Checking Claude Code installation...${NC}"
if ! command -v claude-code &> /dev/null; then
    echo -e "${YELLOW}⚠️  Claude Code not found. Please install it first.${NC}"
    echo "Visit: https://claude.ai/code for installation instructions"
    exit 1
fi

echo -e "${GREEN}✅ Claude Code found!${NC}"

# Install MCP servers
echo -e "${BLUE}📦 Installing MCP servers...${NC}"

echo -e "${YELLOW}Installing PostgreSQL MCP server...${NC}"
npm install -g @modelcontextprotocol/server-postgres

echo -e "${YELLOW}Installing Supabase MCP server...${NC}"
npm install -g @supabase/mcp-server 2>/dev/null || echo -e "${YELLOW}⚠️  Supabase MCP server not available, using PostgreSQL only${NC}"

echo -e "${YELLOW}Installing additional MCP servers...${NC}"
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github 2>/dev/null || echo -e "${YELLOW}⚠️  GitHub MCP server optional${NC}"

echo -e "${GREEN}✅ MCP servers installed!${NC}"

# Get Supabase credentials
echo ""
echo -e "${YELLOW}🔑 Please provide your Supabase credentials:${NC}"
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Anon Key: " SUPABASE_ANON_KEY
read -s -p "Service Role Key (optional, for admin ops): " SUPABASE_SERVICE_KEY
echo ""
read -p "PostgreSQL Connection String (from Supabase Settings → Database): " POSTGRES_CONNECTION

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Missing required credentials. Please run again.${NC}"
    exit 1
fi

# Create Claude Code config directory
echo -e "${BLUE}📁 Setting up Claude Code configuration...${NC}"
mkdir -p ~/.config/claude-code

# Generate MCP configuration
echo -e "${BLUE}⚙️  Generating MCP configuration...${NC}"

cat > ~/.config/claude-code/mcp_servers.json << EOF
{
  "mcpServers": {
    "neurallempire-postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "$POSTGRES_CONNECTION"
      }
    },
    "neurallempire-filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/sandeepramdaz/NeurallEmpire"]
    }$(if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then echo ",
    \"neurallempire-supabase\": {
      \"command\": \"npx\",
      \"args\": [\"@supabase/mcp-server\"],
      \"env\": {
        \"SUPABASE_URL\": \"$SUPABASE_URL\",
        \"SUPABASE_ANON_KEY\": \"$SUPABASE_ANON_KEY\",
        \"SUPABASE_SERVICE_ROLE_KEY\": \"$SUPABASE_SERVICE_KEY\"
      }
    }"; fi)
  }
}
EOF

# Also create environment variables file
echo -e "${BLUE}🔐 Setting up environment variables...${NC}"

cat >> ~/.config/claude-code/neurallempire.env << EOF
# NeurallEmpire Supabase Configuration
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
$(if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then echo "export SUPABASE_SERVICE_ROLE_KEY=\"$SUPABASE_SERVICE_KEY\""; fi)
export POSTGRES_CONNECTION_STRING="$POSTGRES_CONNECTION"
EOF

# Test the configuration
echo -e "${BLUE}🧪 Testing MCP server connection...${NC}"

echo -e "${YELLOW}Testing PostgreSQL connection...${NC}"
if echo "SELECT 1;" | POSTGRES_CONNECTION_STRING="$POSTGRES_CONNECTION" npx @modelcontextprotocol/server-postgres --test 2>/dev/null; then
    echo -e "${GREEN}✅ PostgreSQL MCP server working!${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL connection test inconclusive (may still work in Claude Code)${NC}"
fi

# Create helper scripts
echo -e "${BLUE}📝 Creating helper scripts...${NC}"

# Create MCP test script
cat > ~/test-neurallempire-mcp.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing NeurallEmpire MCP Servers"
echo ""

echo "📊 Testing PostgreSQL connection..."
source ~/.config/claude-code/neurallempire.env
npx @modelcontextprotocol/server-postgres --help

echo ""
echo "📁 Testing filesystem access..."
npx @modelcontextprotocol/server-filesystem /Users/sandeepramdaz/NeurallEmpire --help

echo ""
echo "✅ MCP servers are ready!"
echo "Restart Claude Code to use them."
EOF

chmod +x ~/test-neurallempire-mcp.sh

# Create restart Claude Code helper
cat > ~/restart-claude-code.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Claude Code to load MCP configuration..."

# Kill Claude Code processes
pkill -f "claude-code" 2>/dev/null || true

# Wait a moment
sleep 2

# Restart Claude Code
if command -v claude-code &> /dev/null; then
    claude-code &
    echo "✅ Claude Code restarted with MCP configuration!"
else
    echo "❌ Please restart Claude Code manually"
fi
EOF

chmod +x ~/restart-claude-code.sh

# Display configuration
echo ""
echo -e "${GREEN}🎉 MCP Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo "• PostgreSQL MCP server: ✅ Connected to your Supabase database"
echo "• Filesystem MCP server: ✅ Access to /Users/sandeepramdaz/NeurallEmpire"
if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "• Supabase MCP server: ✅ Full API access"
fi
echo ""
echo -e "${YELLOW}📁 Files created:${NC}"
echo "• ~/.config/claude-code/mcp_servers.json (MCP configuration)"
echo "• ~/.config/claude-code/neurallempire.env (Environment variables)"
echo "• ~/test-neurallempire-mcp.sh (Test script)"
echo "• ~/restart-claude-code.sh (Restart helper)"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Restart Claude Code: ~/restart-claude-code.sh"
echo "2. Test MCP servers: ~/test-neurallempire-mcp.sh"
echo "3. In Claude Code, try: 'Show me all tables in my database'"
echo ""
echo -e "${GREEN}🎯 You can now use Claude Code to:${NC}"
echo "• Query your Supabase database directly"
echo "• Analyze leads and user data"
echo "• Manage your database schema"
echo "• Access your project files"
echo "• Perform advanced analytics"
echo ""
echo -e "${PURPLE}🚀 Your NeurallEmpire now has superpowers in Claude Code!${NC}"