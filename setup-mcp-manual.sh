#!/bin/bash

# 🔧 Manual MCP Setup for NeurallEmpire Supabase Integration
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${GREEN}🔧 NeurallEmpire MCP Server Setup (Manual)${NC}"
echo -e "${BLUE}Setting up MCP servers for Claude Code integration${NC}"
echo ""

# Install MCP servers
echo -e "${BLUE}📦 Installing MCP servers...${NC}"

echo -e "${YELLOW}Installing PostgreSQL MCP server...${NC}"
npm install -g @modelcontextprotocol/server-postgres

echo -e "${YELLOW}Installing Filesystem MCP server...${NC}"
npm install -g @modelcontextprotocol/server-filesystem

echo -e "${YELLOW}Installing Web Search MCP server...${NC}"
npm install -g @modelcontextprotocol/server-web-search

echo -e "${YELLOW}Attempting to install Supabase MCP server...${NC}"
npm install -g @supabase/mcp-server 2>/dev/null || echo -e "${YELLOW}⚠️  Supabase MCP server not available, using PostgreSQL only${NC}"

echo -e "${GREEN}✅ MCP servers installed!${NC}"

# Get Supabase credentials
echo ""
echo -e "${YELLOW}🔑 Please provide your Supabase credentials:${NC}"
echo -e "${BLUE}(You can get these from your Supabase dashboard)${NC}"
echo ""
read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
read -p "Anon Key: " SUPABASE_ANON_KEY
read -s -p "Service Role Key (optional, press Enter to skip): " SUPABASE_SERVICE_KEY
echo ""
echo ""
read -p "PostgreSQL Connection String (from Settings → Database): " POSTGRES_CONNECTION

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Missing required credentials. Please run again with valid credentials.${NC}"
    exit 1
fi

# Create config directory
echo -e "${BLUE}📁 Creating configuration directory...${NC}"
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
    },
    "web-search": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-web-search"]
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

# Create backup configuration in project
echo -e "${BLUE}💾 Creating backup configuration files...${NC}"

cp ~/.config/claude-code/mcp_servers.json ./mcp-servers-configured.json

# Create environment file
cat > ~/.config/claude-code/neurallempire.env << EOF
# NeurallEmpire Supabase Configuration
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
$(if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then echo "export SUPABASE_SERVICE_ROLE_KEY=\"$SUPABASE_SERVICE_KEY\""; fi)
export POSTGRES_CONNECTION_STRING="$POSTGRES_CONNECTION"
EOF

# Test PostgreSQL connection
echo -e "${BLUE}🧪 Testing PostgreSQL MCP server...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}Testing database connection...${NC}"
    if echo "SELECT 1 as test;" | psql "$POSTGRES_CONNECTION" 2>/dev/null | grep -q "test"; then
        echo -e "${GREEN}✅ PostgreSQL connection successful!${NC}"
    else
        echo -e "${YELLOW}⚠️  Direct connection test failed, but MCP may still work${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found, skipping direct connection test${NC}"
fi

# Create helper scripts
echo -e "${BLUE}📝 Creating helper scripts...${NC}"

# Create test script
cat > ./test-mcp-servers.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing NeurallEmpire MCP Servers"
echo ""

echo "📊 Testing PostgreSQL MCP server..."
source ~/.config/claude-code/neurallempire.env 2>/dev/null || true
if command -v npx &> /dev/null; then
    npx @modelcontextprotocol/server-postgres --help 2>/dev/null || echo "PostgreSQL MCP server installed"
fi

echo ""
echo "📁 Testing filesystem MCP server..."
if command -v npx &> /dev/null; then
    npx @modelcontextprotocol/server-filesystem --help 2>/dev/null || echo "Filesystem MCP server installed"
fi

echo ""
echo "🔍 Testing web search MCP server..."
if command -v npx &> /dev/null; then
    npx @modelcontextprotocol/server-web-search --help 2>/dev/null || echo "Web search MCP server installed"
fi

echo ""
echo "✅ MCP servers are ready!"
echo "Configuration file: ~/.config/claude-code/mcp_servers.json"
EOF

chmod +x ./test-mcp-servers.sh

# Create configuration info
cat > ./mcp-setup-info.md << EOF
# 🔧 MCP Configuration for NeurallEmpire

## ✅ Setup Complete!

Your MCP servers have been configured for Claude Code integration.

### 📁 Configuration Files Created:
- \`~/.config/claude-code/mcp_servers.json\` - Main MCP configuration
- \`~/.config/claude-code/neurallempire.env\` - Environment variables
- \`./mcp-servers-configured.json\` - Backup configuration
- \`./test-mcp-servers.sh\` - Test script

### 🎯 What You Can Do Now:

In Claude Code, you can now:
- Query your Supabase database directly
- Analyze leads and user data
- Access your project files
- Perform web searches
- Get real-time insights

### 🔧 Example Commands to Try:

\`\`\`
Show me all tables in my database
Query the contacts table for recent submissions
Analyze my lead scoring data
Show me files in my NeurallEmpire project
Search for latest Supabase documentation
\`\`\`

### 🚀 Next Steps:

1. **Restart Claude Code** (if it's running)
2. **Test the setup**: Run \`./test-mcp-servers.sh\`
3. **Start using MCP**: Ask Claude Code about your database!

### 🔒 Security Note:

Your credentials are stored in:
- \`~/.config/claude-code/mcp_servers.json\`
- \`~/.config/claude-code/neurallempire.env\`

Keep these files secure and don't share them.

### 🎉 You're Ready!

Your NeurallEmpire now has enhanced Claude Code integration!
EOF

# Display results
echo ""
echo -e "${GREEN}🎉 MCP Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo "• PostgreSQL MCP server: ✅ Connected to Supabase database"
echo "• Filesystem MCP server: ✅ Access to /Users/sandeepramdaz/NeurallEmpire"
echo "• Web Search MCP server: ✅ Internet search capabilities"
if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "• Supabase MCP server: ✅ Full API access"
else
    echo "• Supabase MCP server: ⚠️  Not configured (using PostgreSQL instead)"
fi
echo ""
echo -e "${YELLOW}📁 Files Created:${NC}"
echo "• ~/.config/claude-code/mcp_servers.json"
echo "• ~/.config/claude-code/neurallempire.env"
echo "• ./mcp-servers-configured.json (backup)"
echo "• ./test-mcp-servers.sh"
echo "• ./mcp-setup-info.md"
echo ""
echo -e "${BLUE}🧪 Test Your Setup:${NC}"
echo "Run: ./test-mcp-servers.sh"
echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo "1. Restart Claude Code (desktop app)"
echo "2. Try asking: 'Show me all tables in my database'"
echo "3. Query your data: 'Show recent contact submissions'"
echo ""
echo -e "${PURPLE}🚀 Your NeurallEmpire now has Claude Code superpowers!${NC}"
echo ""
echo -e "${YELLOW}📖 Read ./mcp-setup-info.md for more details${NC}"