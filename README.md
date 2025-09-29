# 🧠👑 NeurallEmpire - AI Agent Development Platform

> **Transform your business with intelligent AI agents that work 24/7**

A comprehensive, multi-tenant SaaS platform for building, deploying, and managing AI agents with advanced swarm intelligence capabilities.

## 🚀 Features

### **Elite Eight AI Agents**
- 🎯 **Lead Generator** - Advanced prospect discovery with scoring
- 📧 **Email Marketer** - Personalized campaigns with segmentation
- 📱 **Social Media** - Multi-platform content creation & engagement
- ✍️ **Content Creator** - High-quality content at scale
- 📊 **Analytics** - Data-driven insights and reporting
- 🎧 **Customer Service** - 24/7 automated customer support
- 💼 **Sales** - Automated pipeline management & deal closing
- 🔍 **SEO Optimizer** - Search ranking domination

### **Swarm Intelligence**
- **Sequential Execution** - Step-by-step agent workflows
- **Parallel Processing** - Multiple agents working simultaneously
- **Collaborative Networks** - Agents sharing data and insights
- **Hierarchical Coordination** - Manager-worker agent relationships

### **Platform Features**
- 🏢 **Multi-Tenant Architecture** - Organization-based isolation
- 🔐 **Authentication** - JWT + OAuth (Google, Facebook, GitHub)
- 💳 **Payment Integration** - Stripe & Razorpay support
- 📈 **Real-time Analytics** - Performance monitoring & metrics
- 🎨 **Low-Code Builder** - Visual agent configuration
- 🌐 **API-First Design** - RESTful APIs for everything

## 🏗️ Architecture

```
NeurallEmpire/
├── backend/           # TypeScript/Express API server
│   ├── src/
│   │   ├── agents/    # Elite Eight agent implementations
│   │   ├── controllers/  # API route handlers
│   │   ├── middleware/   # Auth, validation, tenant resolution
│   │   ├── routes/       # Express route definitions
│   │   ├── services/     # Business logic & agent orchestration
│   │   ├── schemas/      # Zod validation schemas
│   │   └── types/        # TypeScript type definitions
│   ├── prisma/        # Database schema & migrations
│   └── package.json   # Backend dependencies
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   ├── services/     # API client & auth
│   │   ├── store/        # Zustand state management
│   │   └── types/        # TypeScript interfaces
│   └── package.json   # Frontend dependencies
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **PostgreSQL** (Supabase recommended)
- **npm/yarn**

### 1. **Clone & Install**
```bash
git clone https://github.com/sandeepramdas/NeurallEmpire.git
cd NeurallEmpire

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. **Database Setup**
```bash
cd backend

# Copy environment variables
cp .env.example .env

# Update DATABASE_URL in .env with your PostgreSQL connection string
# DATABASE_URL="postgresql://user:pass@host:5432/db"

# Run database migrations
npx prisma migrate dev
npx prisma generate
```

### 3. **Start Development Servers**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# 🚀 Backend running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# 🚀 Frontend running on http://localhost:3002
```

### 4. **Access the Platform**
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## 🔧 Configuration

### **Environment Variables**

**Backend (.env):**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
SESSION_SECRET="session-secret"
FRONTEND_URL="http://localhost:3002"
```

**Frontend (.env):**
```env
VITE_API_URL="http://localhost:3001"
VITE_APP_NAME="NeurallEmpire"
```

## 🧪 API Endpoints

### **Authentication**
```
POST   /api/auth/register    # User registration
POST   /api/auth/login       # User login
GET    /api/auth/profile     # Get user profile
POST   /api/auth/logout      # User logout
```

### **Agents**
```
GET    /api/agents           # List all agents
POST   /api/agents           # Create new agent
GET    /api/agents/:id       # Get agent details
PUT    /api/agents/:id       # Update agent
DELETE /api/agents/:id       # Delete agent
POST   /api/agents/:id/start # Start agent
POST   /api/agents/:id/stop  # Stop agent
```

### **Swarms**
```
GET    /api/swarms           # List swarms
POST   /api/swarms           # Create swarm
POST   /api/swarms/:id/execute # Execute swarm
```

### **Analytics**
```
GET    /api/analytics        # Platform analytics
GET    /api/analytics/:id    # Agent performance
```

## 🧠 Agent Types

### **Lead Generator Agent**
```typescript
const leadConfig = {
  type: 'LEAD_GENERATOR',
  configuration: {
    sources: ['linkedin', 'apollo', 'zoominfo'],
    filters: {
      industry: 'Technology',
      companySize: '50-200',
      jobTitles: ['CEO', 'CTO', 'VP']
    },
    dailyLimit: 100
  }
}
```

### **Email Marketer Agent**
```typescript
const emailConfig = {
  type: 'EMAIL_MARKETER',
  configuration: {
    emailProvider: 'sendgrid',
    templates: [/* ... */],
    segmentation: { enabled: true },
    tracking: { opens: true, clicks: true }
  }
}
```

## 🌐 Deployment

### **Railway (Recommended)**
1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically

### **Vercel**
1. Import project to Vercel
2. Configure environment variables
3. Deploy

### **Docker**
```bash
cd backend
docker build -t neurallempire-backend .
docker run -p 3001:3001 neurallempire-backend
```

## 📊 Tech Stack

### **Backend**
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + Passport.js
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, Rate limiting

### **Frontend**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **HTTP**: Fetch API

### **Infrastructure**
- **Database**: Supabase PostgreSQL
- **Hosting**: Railway/Vercel
- **CDN**: Cloudflare
- **Monitoring**: Built-in analytics

## 🔒 Security Features

- **Multi-tenant data isolation**
- **JWT token authentication**
- **OAuth social login**
- **Rate limiting & DDoS protection**
- **Input validation & sanitization**
- **CORS & security headers**
- **Encrypted environment variables**

## 📈 Performance

- **Real-time agent execution**
- **Efficient database queries**
- **Caching strategies**
- **Optimized API responses**
- **Lazy loading & code splitting**

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/sandeepramdas/NeurallEmpire/issues)
- **Email**: support@neurallempire.com
- **Documentation**: [Full API Docs](https://docs.neurallempire.com)

---

**Built with ❤️ by the NeurallEmpire Team**

*Transform your business with AI agents that never sleep* 🧠👑