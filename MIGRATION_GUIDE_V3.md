# 🚀 NeurallEmpire V3.0 Migration Guide

## **Zero-Downtime Migration Strategy**

### **Pre-Migration Checklist**

```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Create backup of current codebase
git tag -a v2.0.0 -m "Pre-V3 migration backup"
git push --tags

# 3. Verify all services are running
./scripts/claude-code-status.sh

# 4. Take note of current metrics
curl https://www.neurallempire.com/health
```

### **Migration Steps (Production-Safe)**

#### **Step 1: Database Migration (5-10 minutes)**

```bash
cd backend

# Merge new schema with existing
# The new schema adds tables without modifying existing ones
cat prisma/schema.prisma prisma/schema-context-ai.prisma > prisma/schema-merged.prisma

# Review the merged schema
code prisma/schema-merged.prisma

# Create migration (does NOT apply yet)
npx prisma migrate dev --name "add_context_ai_v3" --create-only

# Review the SQL migration
cat prisma/migrations/*/migration.sql

# Apply migration (this is the moment of truth)
npx prisma migrate deploy

# Verify migration success
npx prisma migrate status

# Generate new Prisma client
npx prisma generate
```

#### **Step 2: Install New Dependencies (2-3 minutes)**

```bash
# Backend dependencies
cd backend
npm install \
  @anthropic-ai/sdk@latest \
  @pinecone-database/pinecone@latest \
  ioredis@latest \
  bull@latest \
  zod@latest \
  opentelemetry@latest \
  @sentry/node@latest \
  winston@latest

# Frontend dependencies
cd ../frontend
npm install \
  @tanstack/react-query@latest \
  recharts@latest \
  framer-motion@latest \
  react-hook-form@latest \
  @hookform/resolvers@latest
```

#### **Step 3: Environment Variables (Critical)**

```bash
# Add to backend/.env
cat >> backend/.env << 'EOF'

# ==================== CONTEXT AI V3 CONFIGURATION ====================

# AI/ML Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here

# Vector Database (Pinecone)
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=neurallempire-prod

# Redis (Session & Caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS_ENABLED=true

# Encryption (Generate secure keys!)
ENCRYPTION_KEY=$(openssl rand -hex 32)
ENCRYPTION_IV=$(openssl rand -hex 16)

# Monitoring & Observability
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=neurallempire-logs

# Feature Flags
ENABLE_CONNECTORS=true
ENABLE_CANVAS=true
ENABLE_RAG=true
ENABLE_WORKFLOWS=true

# Performance Tuning
MAX_CONCURRENT_AGENTS=10
MAX_CONNECTOR_REQUESTS=100
VECTOR_SEARCH_CACHE_TTL=3600

EOF
```

#### **Step 4: Deploy Backend Code (Rolling Update)**

```bash
# Build with new code
cd backend
npm run build

# Run tests to ensure nothing broke
npm test

# If tests pass, deploy
# Railway will auto-deploy on git push
git add .
git commit -m "feat: Add Context AI V3 capabilities"
git push origin main

# Monitor deployment
railway logs --follow
```

#### **Step 5: Deploy Frontend Code**

```bash
cd frontend

# Build production bundle
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=neurallempire

# Monitor
curl https://www.neurallempire.com/health
```

#### **Step 6: Smoke Tests**

```bash
# Test 1: Health check
curl https://www.neurallempire.com/health

# Test 2: Create a connector
curl -X POST https://www.neurallempire.com/api/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Database",
    "type": "DATABASE",
    "config": {"host": "localhost", "port": 5432},
    "credentials": {"username": "test", "password": "test123"}
  }'

# Test 3: Execute agent with connector
curl -X POST https://www.neurallempire.com/api/agents/:agentId/execute \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": {"message": "Show me my data"}}'

# Test 4: Generate UI
curl -X POST https://www.neurallempire.com/api/canvas/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"intent": "Show dashboard"}'
```

### **Rollback Plan (If Something Goes Wrong)**

```bash
# 1. Rollback database migration
npx prisma migrate resolve --rolled-back $(prisma migrate status | grep pending)

# 2. Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Revert code
git revert HEAD
git push origin main

# 4. Redeploy previous version
railway rollback
```

### **Post-Migration Tasks**

#### **1. Data Seeding (Optional)**

```bash
# Create default connectors for existing users
npx tsx backend/src/scripts/seed-connectors.ts

# Initialize vector database
npx tsx backend/src/scripts/init-vector-db.ts
```

#### **2. Feature Rollout Strategy**

**Week 1: Internal Testing**
- Enable for admin accounts only
- Test all connectors
- Test UI generation
- Collect feedback

**Week 2: Beta Users (10%)**
- Enable for beta program users
- Monitor error rates
- Adjust based on feedback

**Week 3: Gradual Rollout (50%)**
- Enable for 50% of organizations
- Monitor performance
- Scale infrastructure if needed

**Week 4: Full Rollout (100%)**
- Enable for all users
- Announce launch
- Marketing push

#### **3. Monitoring Setup**

```bash
# Set up alerts
# Sentry: Error rate > 1%
# Axiom: API latency > 500ms
# PostHog: User drop-off

# Create dashboards
# Grafana: System metrics
# PostHog: User behavior
# Admin panel: Usage analytics
```

---

## **Performance Benchmarks (Expected)**

### **Before V3:**
- Agent execution: 2-5s
- API response: 100-300ms
- Database queries: 50-150ms

### **After V3:**
- Agent execution: 3-8s (includes connector calls + UI generation)
- API response: 150-500ms (more features = slightly slower)
- Connector queries: 100-500ms (depends on external systems)
- UI generation: 1-3s (Claude API call)
- Vector search: 50-200ms (Pinecone is fast)

### **Optimization Targets:**
- 95th percentile API response: <800ms
- Agent execution success rate: >98%
- Connector uptime: >99.5%
- UI generation success rate: >95%

---

## **Common Issues & Solutions**

### **Issue: Migration fails with foreign key error**
```bash
# Solution: Disable foreign key checks temporarily
psql $DATABASE_URL -c "SET session_replication_role = replica;"
npx prisma migrate deploy
psql $DATABASE_URL -c "SET session_replication_role = origin;"
```

### **Issue: Prisma client out of sync**
```bash
# Solution: Regenerate client
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

### **Issue: Redis connection timeout**
```bash
# Solution: Check Redis is running and accessible
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
# Should return: PONG
```

### **Issue: Pinecone index not found**
```bash
# Solution: Create index first
npx tsx backend/src/scripts/create-pinecone-index.ts
```

### **Issue: High memory usage after migration**
```bash
# Solution: Vector embeddings can be memory-intensive
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart all
```

---

## **Success Criteria**

✅ All existing functionality still works
✅ New connector system operational
✅ UI generation working
✅ Vector search responsive
✅ No increase in error rates
✅ Performance within acceptable ranges
✅ All tests passing
✅ Zero data loss

---

## **Support & Escalation**

**If migration fails:**
1. Check logs: `railway logs --tail=1000`
2. Check Sentry for errors
3. Rollback using procedure above
4. Contact tech lead

**Emergency contacts:**
- Tech Lead: [Your contact]
- DevOps: [Your contact]
- Database Admin: [Your contact]

---

**Estimated Total Migration Time: 1-2 hours**
**Recommended Migration Window: Low-traffic period (e.g., Sunday 2AM-4AM UTC)**
