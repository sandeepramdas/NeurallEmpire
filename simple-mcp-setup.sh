#!/bin/bash

# 🚀 Simple MCP Setup for NeurallEmpire
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Simple MCP Setup for NeurallEmpire${NC}"
echo -e "${BLUE}Setting up database access for Claude Code${NC}"
echo ""

# Get Supabase PostgreSQL connection string
echo -e "${YELLOW}To set up MCP, I need your Supabase PostgreSQL connection string.${NC}"
echo ""
echo -e "${BLUE}📋 How to get it:${NC}"
echo "1. Go to your Supabase dashboard"
echo "2. Go to Settings → Database"
echo "3. Find 'Connection string' section"
echo "4. Copy the 'URI' connection string (starts with postgresql://)"
echo ""
echo -e "${YELLOW}Example format:${NC}"
echo "postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
echo ""

read -p "Enter your Supabase PostgreSQL connection string: " POSTGRES_CONNECTION

if [ -z "$POSTGRES_CONNECTION" ]; then
    echo -e "${RED}❌ Connection string is required. Please run again.${NC}"
    exit 1
fi

# Create MCP configuration
echo -e "${BLUE}⚙️  Creating MCP configuration...${NC}"

cat > ~/.config/claude-code/mcp_servers.json << EOF
{
  "mcpServers": {
    "neurallempire-database": {
      "command": "npx",
      "args": ["enhanced-postgres-mcp-server"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "$POSTGRES_CONNECTION"
      }
    },
    "neurallempire-files": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/sandeepramdaz/NeurallEmpire"]
    }
  }
}
EOF

# Create backup
cp ~/.config/claude-code/mcp_servers.json ./mcp-servers-working.json

# Test the setup
echo -e "${BLUE}🧪 Testing database connection...${NC}"
if command -v psql &> /dev/null; then
    if echo "SELECT current_database();" | psql "$POSTGRES_CONNECTION" &>/dev/null; then
        echo -e "${GREEN}✅ Database connection successful!${NC}"
    else
        echo -e "${YELLOW}⚠️  Connection test failed, but MCP might still work${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found, skipping connection test${NC}"
fi

# Create test script
cat > ./test-mcp-connection.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing MCP Configuration"
echo ""
echo "📁 Config file: ~/.config/claude-code/mcp_servers.json"
echo ""
if [ -f ~/.config/claude-code/mcp_servers.json ]; then
    echo "✅ MCP configuration file exists"
    echo ""
    echo "📊 Configured servers:"
    cat ~/.config/claude-code/mcp_servers.json | grep -o '"[^"]*": {' | sed 's/": {//g' | sed 's/"//g' | sed 's/^/  • /'
else
    echo "❌ MCP configuration file not found"
fi
echo ""
echo "🔄 Next steps:"
echo "1. Restart Claude Code (desktop app)"
echo "2. Try asking: 'Show me all tables in my database'"
EOF

chmod +x ./test-mcp-connection.sh

# Display success
echo ""
echo -e "${GREEN}🎉 MCP Setup Complete!${NC}"
echo ""
echo -e "${BLUE}✅ What's been configured:${NC}"
echo "• Enhanced PostgreSQL MCP server for your Supabase database"
echo "• Filesystem MCP server for your project files"
echo ""
echo -e "${YELLOW}📁 Files created:${NC}"
echo "• ~/.config/claude-code/mcp_servers.json (main config)"
echo "• ./mcp-servers-working.json (backup)"
echo "• ./test-mcp-connection.sh (test script)"
echo ""
echo -e "${GREEN}🚀 Next Steps:${NC}"
echo "1. Restart Claude Code (close and reopen the desktop app)"
echo "2. Run: ./test-mcp-connection.sh (to verify setup)"
echo "3. In Claude Code, try asking:"
echo "   • 'Show me all tables in my database'"
echo "   • 'Query my contacts table'"
echo "   • 'Show me recent user registrations'"
echo ""
echo -e "${BLUE}🎯 You can now access your Supabase database directly in Claude Code!${NC}"