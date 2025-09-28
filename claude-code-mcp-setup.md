# 🔧 Claude Code MCP Setup for Supabase

This guide will help you connect your Supabase database as an MCP (Model Context Protocol) server for Claude Code, giving you direct database access and enhanced development capabilities.

## 📋 Prerequisites

1. ✅ Supabase project created
2. ✅ Claude Code installed
3. ✅ Node.js 18+ installed

## 🚀 Option 1: Supabase Direct MCP Server

### Step 1: Install Supabase MCP Server
```bash
npm install -g @supabase/mcp-server
```

### Step 2: Get Your Supabase Connection Details

From your Supabase dashboard:
1. **Go to Settings → Database**
2. **Copy the Connection String** (looks like):
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Step 3: Configure Claude Code MCP

Create or update your Claude Code MCP configuration file:

**Location**: `~/.config/claude-code/mcp_servers.json`

```json
{
  "mcpServers": {
    "neurallempire-supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

## 🔗 Option 2: PostgreSQL Direct MCP Server (Recommended)

### Step 1: Install PostgreSQL MCP Server
```bash
npm install -g @modelcontextprotocol/server-postgres
```

### Step 2: Configure PostgreSQL MCP

```json
{
  "mcpServers": {
    "neurallempire-postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
      }
    }
  }
}
```

## 🔧 Option 3: Combined MCP Setup (Best of Both Worlds)

```json
{
  "mcpServers": {
    "neurallempire-supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    },
    "neurallempire-postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "your-postgres-connection-string"
      }
    },
    "neurallempire-filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/sandeepramdaz/NeurallEmpire"]
    },
    "neurallempire-github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
      }
    }
  }
}
```

## 🎯 What You'll Get with MCP Integration

### 🗄️ Direct Database Access
- Query your user_profiles, contacts, payments tables
- Real-time data analysis
- Schema exploration and modifications
- Data validation and debugging

### 🔍 Enhanced Development
- Automated database queries in Claude Code
- Schema suggestions and validation
- Data migration assistance
- Performance optimization recommendations

### 📊 Analytics and Insights
- Lead scoring analysis
- User behavior patterns
- Revenue analytics
- Conversion funnel analysis

## 🛠️ Getting Your Credentials

### For Supabase API Keys:
1. **Supabase Dashboard → Settings → API**
2. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (for admin operations)

### For PostgreSQL Connection:
1. **Supabase Dashboard → Settings → Database**
2. **Connection String → Pooler**
3. Copy the full connection string

## 🧪 Testing Your MCP Setup

### Step 1: Restart Claude Code
After configuring MCP, restart Claude Code to load the new servers.

### Step 2: Test Database Connection
In Claude Code, try these commands:
```
Show me all tables in the neurallempire database
Query the contacts table for recent submissions
Analyze the lead scoring in my contacts
```

### Step 3: Verify Supabase Integration
```
Check my user_profiles table structure
Show me the latest payments
Get analytics on my lead conversion rates
```

## 🔒 Security Best Practices

### Environment Variables
Instead of hardcoding credentials, use environment variables:

```bash
# Add to your ~/.zshrc or ~/.bashrc
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export POSTGRES_CONNECTION_STRING="your-postgres-connection"
```

Then reference in MCP config:
```json
{
  "mcpServers": {
    "neurallempire-supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

## 🚀 Advanced Features

### Real-time Subscriptions
With MCP, you can:
- Monitor real-time contact submissions
- Track user authentication events
- Analyze payment flows as they happen

### Automated Analytics
- Generate daily/weekly reports
- Identify high-value leads automatically
- Monitor conversion funnel performance

### Database Management
- Schema migrations
- Data backup and restoration
- Performance monitoring

## 🔧 Troubleshooting

### Common Issues:

1. **Connection Failed**
   - Verify connection string format
   - Check network connectivity
   - Ensure database is accessible

2. **Permission Denied**
   - Use service role key for admin operations
   - Check Row Level Security policies
   - Verify user permissions

3. **MCP Server Not Found**
   - Install required packages globally
   - Check Node.js version (18+)
   - Restart Claude Code

### Debug Commands:
```bash
# Test connection manually
npx @modelcontextprotocol/server-postgres

# Check installed packages
npm list -g @supabase/mcp-server
npm list -g @modelcontextprotocol/server-postgres
```

## 🎉 Ready to Go!

Once configured, you'll have direct access to your NeurallEmpire database through Claude Code, enabling:
- Real-time data analysis
- Automated reporting
- Enhanced development workflow
- Advanced database operations

Your NeurallEmpire just got superpowers! 🚀