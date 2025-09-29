# 🤖 Claude Code Quick Reference

## Status Check
Run this whenever you start Claude Code to check all system connections:

```bash
./claude-code-status.sh
```

## Key Information for Claude Code

### Project Status
- **Database**: Supabase PostgreSQL connected ✅
- **Backend**: TypeScript/Express API ready
- **Frontend**: React SPA configured
- **MCP**: Browser automation via Puppeteer configured
- **GitHub**: Repository connected
- **Railway**: CLI installed, needs linking

### Common Commands
```bash
# Check system status
./claude-code-status.sh

# Start development
cd backend && npm run dev          # Backend on :3001
cd frontend && npm run dev         # Frontend on :3000

# Database operations
cd backend && npx prisma studio    # Database GUI
cd backend && npx prisma db push   # Update database schema
cd backend && npm run generate     # Generate Prisma client

# Git operations
git status                         # Check changes
git add . && git commit -m "msg"   # Commit changes
git push origin main               # Push to GitHub

# Railway deployment
railway login                      # Login to Railway
railway link                       # Link project
railway status                     # Check deployment status
```

### Environment Setup
- **Backend .env**: Contains Supabase DATABASE_URL, JWT secrets
- **MCP Config**: Browser automation via Puppeteer configured
- **GitHub**: CLI authenticated as sandeepramdas

### URLs
- **Local Backend**: http://localhost:3001
- **Local Frontend**: http://localhost:3000 or :8000
- **GitHub Pages**: https://sandeepramdas.github.io/NeurallEmpire
- **API Docs**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

### MCP Capabilities
With the configured MCP servers, Claude Code can:
- 🌐 **Browser Control**: Navigate websites, take screenshots, click elements
- 📁 **File Access**: Read/write files in Desktop and Downloads
- 🔍 **Code Search**: Find and analyze code across the project
- 🗄️ **Database**: Direct Prisma database operations

### Quick Health Check
Ask Claude Code:
- "Check system status" → Runs the status script
- "Take a screenshot of google.com" → Tests browser MCP
- "Show me the current git status" → Tests project access
- "Connect to the database" → Tests Supabase connection

---
*This file helps Claude Code understand your setup instantly* 🧠👑