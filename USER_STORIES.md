# 🧠👑 NeurallEmpire - User Stories & Journey Map

## 📋 Table of Contents
1. [Routing Architecture Overview](#routing-architecture-overview)
2. [User Personas](#user-personas)
3. [User Stories by Role](#user-stories-by-role)
4. [User Journey Maps](#user-journey-maps)
5. [API Endpoint Mapping](#api-endpoint-mapping)
6. [Frontend Routes](#frontend-routes)

---

## Routing Architecture Overview

### Backend Routes (API)
```
Base URL: https://api.neurallempire.com or http://localhost:3001

PUBLIC ROUTES:
├── /health                              # Health check
├── /api/auth/register                   # Register new organization + owner
├── /api/auth/join                       # Join existing organization
├── /api/auth/login                      # User login
├── /api/oauth/:provider/login           # OAuth login (Google, GitHub, etc.)
└── /api/auth/:provider/callback         # OAuth callback

PROTECTED ROUTES (Require JWT):
├── /api/auth/
│   ├── GET /profile                     # Get current user profile
│   └── POST /logout                     # Logout user
│
├── /api/agents/
│   ├── GET /                            # List all agents
│   ├── POST /                           # Create new agent
│   ├── GET /:id                         # Get agent details
│   ├── PUT /:id                         # Update agent
│   ├── DELETE /:id                      # Delete agent
│   ├── POST /:id/execute                # Execute agent
│   ├── GET /:id/metrics                 # Get agent metrics
│   └── PUT /:id/status                  # Update agent status
│
├── /api/swarms/
│   ├── GET /                            # List all swarms
│   ├── POST /                           # Create swarm
│   ├── GET /types                       # Get swarm types
│   ├── GET /roles                       # Get swarm roles
│   ├── GET /:id                         # Get swarm details
│   ├── POST /:id/agents                 # Add agent to swarm
│   ├── DELETE /:id/agents/:agentId      # Remove agent from swarm
│   └── POST /:id/execute                # Execute swarm
│
├── /api/workflows/
│   ├── GET /                            # List workflows
│   ├── POST /                           # Create workflow
│   ├── GET /:id                         # Get workflow details
│   ├── PUT /:id                         # Update workflow
│   ├── DELETE /:id                      # Delete workflow
│   ├── POST /:id/execute                # Execute workflow
│   ├── GET /:id/executions              # Get workflow executions
│   ├── POST /template/:templateId       # Create from template
│   └── PUT /:id/status                  # Update workflow status
│
├── /api/organization/
│   ├── GET /                            # Get organization details
│   ├── PUT /                            # Update organization
│   ├── GET /users                       # List organization users
│   ├── PUT /users/:id                   # Update user role
│   ├── GET /usage                       # Get usage metrics
│   └── GET /billing                     # Get billing info
│
├── /api/subdomain/
│   ├── POST /create                     # Create subdomain
│   ├── GET /check/:subdomain            # Check subdomain availability
│   ├── POST /verify                     # Verify subdomain DNS
│   └── DELETE /:subdomain               # Delete subdomain
│
├── /api/oauth/
│   ├── GET /config                      # Get OAuth configuration
│   ├── POST /config                     # Update OAuth configuration
│   └── GET /accounts                    # List connected OAuth accounts
│
├── /api/payments/
│   ├── POST /subscription               # Create subscription
│   ├── GET /subscription                # Get subscription details
│   ├── POST /cancel                     # Cancel subscription
│   └── GET /invoices                    # Get invoices
│
├── /api/analytics/
│   ├── GET /                            # Platform analytics
│   └── GET /:id                         # Agent performance
│
└── /api/webhooks/
    ├── GET /                            # List webhooks
    ├── POST /                           # Create webhook
    ├── PUT /:id                         # Update webhook
    └── DELETE /:id                      # Delete webhook

ADMIN ROUTES (Require ADMIN/SUPER_ADMIN role):
└── /api/admin/
    ├── GET /organizations               # List all organizations
    ├── GET /users                       # List all users
    ├── GET /stats                       # Platform statistics
    ├── GET /audit                       # Audit logs
    ├── PUT /organizations/:id/status    # Update org status
    ├── PUT /organizations/:id/plan      # Update org plan
    ├── PUT /users/:id/status            # Update user status
    └── POST /admins                     # Create new admin
```

### Frontend Routes (React SPA)
```
Main Domain: https://neurallempire.com
Subdomain: https://{org-slug}.neurallempire.com
Local Dev: http://localhost:3002

PUBLIC ROUTES:
├── /                                    # Landing page
├── /login                               # Login page
├── /register                            # Registration page
└── /auth/:provider/callback             # OAuth callback handler

PROTECTED ROUTES (Require authentication):
└── /dashboard                           # Dashboard container
    ├── /                                # Dashboard overview (index)
    ├── /agents                          # Agents management
    ├── /campaigns                       # Campaigns (workflows)
    ├── /analytics                       # Analytics & reporting
    └── /settings                        # Organization settings

SUBDOMAIN ROUTING:
- Main domain: Public routes + redirects to org subdomain after login
- Org subdomain: All dashboard routes for that organization
- Development: Uses ?org={slug} query parameter instead of subdomain
```

---

## User Personas

### 1. **Sarah - Marketing Agency Owner** 🎯
- **Role**: Organization Owner
- **Goals**: Automate lead generation and email campaigns for clients
- **Pain Points**: Managing multiple client campaigns manually, time-consuming
- **Technical Level**: Medium (familiar with SaaS tools, not a developer)

### 2. **Marcus - Solo Entrepreneur** 💼
- **Role**: Organization Owner (Solo)
- **Goals**: Build personal brand, automate social media, generate leads
- **Pain Points**: Limited budget, wearing too many hats
- **Technical Level**: Low-Medium

### 3. **Priya - Enterprise Sales Director** 🏢
- **Role**: Organization Admin
- **Goals**: Manage sales team's AI agents, track performance
- **Pain Points**: Team coordination, data visibility
- **Technical Level**: Low (business user)

### 4. **Alex - Developer/Technical Lead** 👨‍💻
- **Role**: Developer
- **Goals**: Build custom AI agents, integrate with company systems
- **Pain Points**: Need API access, custom workflows
- **Technical Level**: High

### 5. **Jordan - Data Analyst** 📊
- **Role**: Analyst
- **Goals**: Monitor agent performance, generate reports
- **Pain Points**: Data access, visualization tools
- **Technical Level**: Medium-High

---

## User Stories by Role

### 🔹 Organization Owner Stories

#### **Epic 1: Onboarding & Setup**

**US-001: Register New Organization**
```
As a marketing agency owner,
I want to register my agency and create a branded workspace,
So that I can start using AI agents for my business.

Acceptance Criteria:
- ✅ Navigate to neurallempire.com
- ✅ Click "Get Started" or "Sign Up"
- ✅ Fill registration form (org name, slug, email, password)
- ✅ Receive email verification
- ✅ Auto-redirect to {org-slug}.neurallempire.com/dashboard
- ✅ See welcome wizard/onboarding tour

API Calls:
POST /api/auth/register
{
  "organizationName": "Sarah's Marketing Agency",
  "organizationSlug": "sarah-marketing",
  "email": "sarah@example.com",
  "password": "SecurePass123!",
  "firstName": "Sarah",
  "lastName": "Johnson"
}

Frontend Flow:
1. User visits: https://neurallempire.com
2. Clicks "Sign Up" → /register
3. Submits form → API call
4. Redirects to: https://sarah-marketing.neurallempire.com/dashboard
   (Dev: http://localhost:3002/dashboard?org=sarah-marketing)
```

**US-002: Configure Organization Branding**
```
As an organization owner,
I want to customize my workspace with logo and colors,
So that my team recognizes our branded environment.

Acceptance Criteria:
- Navigate to /dashboard/settings
- Upload organization logo
- Set brand colors (primary, secondary)
- Preview changes
- Save successfully

API Calls:
PUT /api/organization
{
  "logo": "https://cdn.example.com/logo.png",
  "brandColors": {
    "primary": "#3B82F6",
    "secondary": "#10B981"
  }
}
```

**US-003: Setup Custom Subdomain**
```
As an organization owner,
I want my own subdomain (my-company.neurallempire.com),
So that my team has a professional branded URL.

Acceptance Criteria:
- Check subdomain availability in real-time
- Configure DNS automatically (Cloudflare)
- Generate SSL certificate
- Verify subdomain is live
- Receive confirmation email

API Calls:
POST /api/subdomain/create
GET /api/subdomain/check/{subdomain}
POST /api/subdomain/verify
```

#### **Epic 2: Agent Management**

**US-004: Create First AI Agent (Lead Generator)**
```
As a marketing agency owner,
I want to create a Lead Generator agent,
So that I can find potential clients automatically.

Acceptance Criteria:
- Navigate to /dashboard/agents
- Click "Create Agent"
- Select "Lead Generator" from Elite Eight
- Configure targeting parameters (industry, role, company size)
- Set daily lead limit
- Test agent with sample query
- Activate agent

API Calls:
POST /api/agents
{
  "name": "LinkedIn Tech Leads",
  "type": "LEAD_GENERATOR",
  "configuration": {
    "sources": ["linkedin", "apollo"],
    "filters": {
      "industry": "Technology",
      "companySize": "50-200",
      "jobTitles": ["CEO", "CTO", "VP Engineering"]
    },
    "dailyLimit": 100
  }
}

Frontend Flow:
/dashboard/agents → Click "New Agent" → Agent Type Selection → Configuration Form → Test → Save
```

**US-005: View Agent Performance Dashboard**
```
As an organization owner,
I want to see how my agents are performing,
So that I can optimize their configurations.

Acceptance Criteria:
- View all agents in a grid/list
- See status (active/paused/error)
- View key metrics (executions, success rate, avg. response time)
- Filter by agent type
- Sort by performance

API Calls:
GET /api/agents
GET /api/agents/:id/metrics
```

**US-006: Execute Agent Manually**
```
As an organization owner,
I want to run an agent on-demand,
So that I can test it or get immediate results.

Acceptance Criteria:
- Navigate to agent details page
- Click "Execute Now"
- Provide input parameters
- See real-time execution progress
- View results immediately

API Calls:
POST /api/agents/:id/execute
{
  "input": {
    "query": "Find CTOs in San Francisco"
  }
}
```

#### **Epic 3: Swarm Intelligence**

**US-007: Create Sequential Swarm (Marketing Pipeline)**
```
As a marketing agency owner,
I want to create a swarm that runs Lead Generator → Email Marketer → CRM Update,
So that my entire marketing funnel is automated.

Acceptance Criteria:
- Navigate to /dashboard/swarms (or workflows)
- Click "Create Swarm"
- Select "Sequential" type
- Add agents in order:
  1. Lead Generator (leader)
  2. Email Marketer (worker)
  3. CRM Integration (worker)
- Configure data flow between agents
- Test swarm
- Schedule or activate

API Calls:
POST /api/swarms
{
  "name": "Marketing Pipeline",
  "type": "SEQUENTIAL",
  "members": [
    { "agentId": "agent-1", "role": "LEADER", "order": 1 },
    { "agentId": "agent-2", "role": "WORKER", "order": 2 },
    { "agentId": "agent-3", "role": "WORKER", "order": 3 }
  ]
}

POST /api/swarms/:id/execute
```

**US-008: Create Parallel Swarm (Content Creation)**
```
As an organization owner,
I want to run Content Creator + SEO Optimizer + Social Media agents simultaneously,
So that I can produce optimized content across all channels at once.

Acceptance Criteria:
- Create swarm with "Parallel" type
- Add multiple agents to execute simultaneously
- Each agent processes same input independently
- View aggregated results
- Schedule for daily execution

API Calls:
POST /api/swarms
{
  "name": "Content Syndication",
  "type": "PARALLEL",
  "members": [
    { "agentId": "content-creator", "role": "WORKER" },
    { "agentId": "seo-optimizer", "role": "WORKER" },
    { "agentId": "social-media", "role": "WORKER" }
  ]
}
```

#### **Epic 4: Team Management**

**US-009: Invite Team Members**
```
As an organization owner,
I want to invite my team members to the workspace,
So that they can collaborate on agent management.

Acceptance Criteria:
- Navigate to /dashboard/settings/team
- Click "Invite User"
- Enter email and select role (ADMIN, DEVELOPER, ANALYST, MEMBER)
- Send invitation email
- New user receives email with signup link
- New user joins organization via /api/auth/join

API Calls:
POST /api/organization/invite
{
  "email": "developer@example.com",
  "role": "DEVELOPER"
}
```

**US-010: Manage User Permissions**
```
As an organization owner,
I want to control what each user can do,
So that I maintain security and proper access control.

Acceptance Criteria:
- View all organization users
- See each user's role and last login
- Change user role (upgrade/downgrade)
- Deactivate users
- Remove users from organization

API Calls:
GET /api/organization/users
PUT /api/organization/users/:id
{
  "role": "ADMIN",
  "canCreateAgents": true,
  "canManageWorkflows": true
}
```

#### **Epic 5: Billing & Subscription**

**US-011: Upgrade from Trial to Paid Plan**
```
As an organization owner,
I want to upgrade to a paid plan when my trial ends,
So that I can continue using the platform.

Acceptance Criteria:
- See trial expiration banner
- Navigate to /dashboard/settings/billing
- View plan comparison (Starter, Growth, Scale, Enterprise)
- Select plan and billing cycle (monthly/yearly)
- Enter payment details (Stripe)
- Confirm subscription
- Receive invoice via email

API Calls:
POST /api/payments/subscription
{
  "planType": "GROWTH",
  "billingCycle": "MONTHLY",
  "paymentMethod": "stripe_pm_123"
}
```

---

### 🔹 Developer User Stories

**US-012: Access API Keys**
```
As a developer,
I want to generate API keys,
So that I can integrate NeurallEmpire agents into my applications.

Acceptance Criteria:
- Navigate to /dashboard/settings/api-keys
- Click "Generate New Key"
- Set permissions and rate limits
- Copy API key (shown once)
- Test API key with sample request

API Calls:
POST /api/api-keys
GET /api/api-keys
```

**US-013: Create Custom Agent via API**
```
As a developer,
I want to programmatically create agents,
So that I can automate agent deployment.

Acceptance Criteria:
- Use API key for authentication
- Send POST request to /api/agents
- Receive agent ID in response
- Configure agent via API
- Execute agent via API

API Example:
curl -X POST https://api.neurallempire.com/api/agents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Lead Generator",
    "type": "LEAD_GENERATOR",
    "configuration": {...}
  }'
```

**US-014: Setup Webhooks**
```
As a developer,
I want to receive webhook notifications when agents complete tasks,
So that my application can react to agent events.

Acceptance Criteria:
- Navigate to /dashboard/settings/webhooks
- Create webhook with URL
- Select events to subscribe to
- Verify webhook with test event
- Receive payloads in my application

API Calls:
POST /api/webhooks
{
  "url": "https://myapp.com/webhooks/neurallempire",
  "events": ["agent.completed", "swarm.finished"],
  "secret": "webhook_secret"
}
```

---

### 🔹 Analyst User Stories

**US-015: View Organization Analytics**
```
As a data analyst,
I want to see comprehensive analytics for all agents,
So that I can report on ROI and performance.

Acceptance Criteria:
- Navigate to /dashboard/analytics
- View time-series charts for:
  - Agent executions
  - Success rates
  - Response times
  - Cost per execution
- Filter by date range, agent type
- Export data to CSV

API Calls:
GET /api/analytics?start=2024-01-01&end=2024-12-31
GET /api/organization/usage
```

**US-016: Download Usage Reports**
```
As a data analyst,
I want to download detailed usage reports,
So that I can analyze data in Excel/BI tools.

Acceptance Criteria:
- Navigate to /dashboard/analytics/reports
- Select report type (usage, billing, performance)
- Choose date range
- Download as CSV or PDF
- Receive email with download link

API Calls:
GET /api/analytics/export?format=csv&type=usage
```

---

### 🔹 Admin User Stories

**US-017: Monitor Platform Health (Platform Admin)**
```
As a platform administrator,
I want to monitor all organizations and system health,
So that I can ensure platform reliability.

Acceptance Criteria:
- Navigate to /admin/dashboard
- View platform-wide statistics
- See all organizations
- View system metrics (CPU, memory, requests/sec)
- Access audit logs

API Calls:
GET /api/admin/stats
GET /api/admin/organizations
GET /api/admin/audit
```

**US-018: Manage Organization Plans**
```
As a platform administrator,
I want to upgrade/downgrade organization plans,
So that I can handle customer requests.

Acceptance Criteria:
- Navigate to /admin/organizations
- Search for organization
- View current plan and usage
- Change plan type
- Add notes/reason for change
- Log action in audit trail

API Calls:
PUT /api/admin/organizations/:id/plan
{
  "planType": "ENTERPRISE",
  "reason": "Customer upgrade request"
}
```

---

## User Journey Maps

### Journey 1: New User Registration → First Agent Execution

```
Step 1: Discovery
├─ User visits https://neurallempire.com
├─ Views landing page features
└─ Clicks "Get Started Free"

Step 2: Registration
├─ Route: /register
├─ Fills form:
│  ├─ Organization name: "Acme Corp"
│  ├─ Slug: "acme-corp" (auto-suggested)
│  ├─ Email: user@acme.com
│  └─ Password: ********
├─ API: POST /api/auth/register
└─ Redirects to: acme-corp.neurallempire.com/dashboard

Step 3: Onboarding Wizard
├─ Welcome screen
├─ Quick tour of dashboard
├─ Prompts to create first agent
└─ Shows trial information (14 days)

Step 4: Create First Agent
├─ Route: /dashboard/agents
├─ Clicks "Create Your First Agent"
├─ Selects "Lead Generator" from Elite Eight
├─ Configures:
│  ├─ Name: "LinkedIn Leads"
│  ├─ Target industry: Technology
│  ├─ Job titles: CTO, VP Engineering
│  └─ Daily limit: 50
├─ API: POST /api/agents
└─ Agent created successfully

Step 5: Execute Agent
├─ Clicks "Test Agent"
├─ Provides sample query: "Find CTOs in San Francisco"
├─ API: POST /api/agents/:id/execute
├─ Views results in real-time
└─ Success! 🎉

Step 6: Activation
├─ Clicks "Activate Agent"
├─ Sets schedule: Daily at 9 AM
├─ Agent now runs automatically
└─ Receives email notification when leads are found
```

### Journey 2: Team Collaboration on Marketing Swarm

```
Step 1: Owner Creates Swarm
├─ Sarah (Owner) logs in to acme-corp.neurallempire.com
├─ Route: /dashboard/swarms (or workflows)
├─ Creates "Marketing Pipeline" swarm (Sequential)
├─ Adds agents:
│  1. Lead Generator
│  2. Email Marketer
│  3. Analytics Tracker
└─ API: POST /api/swarms

Step 2: Invite Developer
├─ Route: /dashboard/settings/team
├─ Invites Alex (Developer)
├─ API: POST /api/organization/invite
└─ Alex receives email invitation

Step 3: Developer Joins
├─ Alex clicks email link → /auth/join?token=...
├─ Sets password
├─ API: POST /api/auth/join
└─ Redirects to: acme-corp.neurallempire.com/dashboard

Step 4: Developer Configures Integration
├─ Alex navigates to /dashboard/settings/webhooks
├─ Creates webhook for swarm completion
├─ API: POST /api/webhooks
└─ Integrates with company CRM

Step 5: Analyst Monitors Performance
├─ Jordan (Analyst) logs in
├─ Route: /dashboard/analytics
├─ Views swarm performance metrics
├─ API: GET /api/analytics
└─ Downloads CSV report for stakeholders
```

### Journey 3: OAuth Login Flow

```
Step 1: User Chooses OAuth Login
├─ User visits: neurallempire.com/login
├─ Sees login form + OAuth buttons:
│  ├─ "Sign in with Google"
│  ├─ "Sign in with GitHub"
│  └─ "Sign in with LinkedIn"
└─ Clicks "Sign in with Google"

Step 2: OAuth Initiation
├─ Frontend calls: GET /api/oauth/google/login
├─ Backend redirects to Google OAuth consent screen
└─ User approves permissions

Step 3: OAuth Callback
├─ Google redirects to: neurallempire.com/auth/google/callback?code=...
├─ Frontend sends code to: POST /api/oauth/google/callback
├─ Backend:
│  ├─ Exchanges code for tokens
│  ├─ Fetches user info from Google
│  ├─ Creates/links user account
│  ├─ Creates session
│  └─ Returns JWT token
└─ Frontend stores token

Step 4: Redirect to Dashboard
├─ Frontend determines user's organization
├─ Redirects to: {org-slug}.neurallempire.com/dashboard
└─ User is logged in ✅
```

---

## API Endpoint Mapping

### Complete Backend API Reference

| Method | Endpoint | Controller | Description | Auth Required |
|--------|----------|-----------|-------------|---------------|
| **Authentication** |
| POST | `/api/auth/register` | auth.register | Register new org + user | No |
| POST | `/api/auth/join` | auth.joinOrganization | Join existing org | No |
| POST | `/api/auth/login` | auth.login | Login with email/password | No |
| GET | `/api/auth/profile` | auth.getProfile | Get current user profile | Yes |
| POST | `/api/auth/logout` | auth.logout | Logout user | Yes |
| **OAuth** |
| GET | `/api/oauth/:provider/login` | oauth.initiateLogin | Start OAuth flow | No |
| GET | `/api/oauth/:provider/callback` | oauth.handleCallback | Handle OAuth callback | No |
| GET | `/api/oauth/config` | oauth.getConfig | Get OAuth configuration | Yes (Admin) |
| POST | `/api/oauth/config` | oauth.updateConfig | Update OAuth config | Yes (Admin) |
| **Agents** |
| GET | `/api/agents` | agents.list | List all agents | Yes |
| POST | `/api/agents` | agents.create | Create new agent | Yes |
| GET | `/api/agents/:id` | agents.get | Get agent details | Yes |
| PUT | `/api/agents/:id` | agents.update | Update agent | Yes |
| DELETE | `/api/agents/:id` | agents.delete | Delete agent | Yes |
| POST | `/api/agents/:id/execute` | agents.execute | Execute agent | Yes |
| GET | `/api/agents/:id/metrics` | agents.metrics | Get agent metrics | Yes |
| **Swarms** |
| GET | `/api/swarms` | swarms.list | List all swarms | Yes |
| POST | `/api/swarms` | swarms.create | Create swarm | Yes |
| GET | `/api/swarms/:id` | swarms.get | Get swarm details | Yes |
| POST | `/api/swarms/:id/agents` | swarms.addAgent | Add agent to swarm | Yes |
| DELETE | `/api/swarms/:id/agents/:agentId` | swarms.removeAgent | Remove agent from swarm | Yes |
| POST | `/api/swarms/:id/execute` | swarms.execute | Execute swarm | Yes |
| **Workflows** |
| GET | `/api/workflows` | workflows.list | List workflows | Yes |
| POST | `/api/workflows` | workflows.create | Create workflow | Yes |
| GET | `/api/workflows/:id` | workflows.get | Get workflow details | Yes |
| POST | `/api/workflows/:id/execute` | workflows.execute | Execute workflow | Yes |
| **Organization** |
| GET | `/api/organization` | org.get | Get org details | Yes |
| PUT | `/api/organization` | org.update | Update org | Yes (Admin) |
| GET | `/api/organization/users` | org.listUsers | List org users | Yes |
| GET | `/api/organization/usage` | org.usage | Get usage metrics | Yes (Admin) |
| **Subdomain** |
| POST | `/api/subdomain/create` | subdomain.create | Create subdomain | Yes (Admin) |
| GET | `/api/subdomain/check/:subdomain` | subdomain.check | Check availability | Yes |
| POST | `/api/subdomain/verify` | subdomain.verify | Verify DNS | Yes (Admin) |
| **Analytics** |
| GET | `/api/analytics` | analytics.get | Get platform analytics | Yes |
| GET | `/api/analytics/:id` | analytics.getAgent | Get agent analytics | Yes |
| **Payments** |
| POST | `/api/payments/subscription` | payments.createSubscription | Create subscription | Yes (Owner) |
| GET | `/api/payments/subscription` | payments.getSubscription | Get subscription | Yes |
| POST | `/api/payments/cancel` | payments.cancel | Cancel subscription | Yes (Owner) |
| **Admin** |
| GET | `/api/admin/organizations` | admin.listOrgs | List all orgs | Yes (Admin) |
| GET | `/api/admin/stats` | admin.stats | Platform stats | Yes (Admin) |
| PUT | `/api/admin/organizations/:id/plan` | admin.updatePlan | Update org plan | Yes (Admin) |

---

## Frontend Routes

### Public Routes
| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/` | LandingPage | Homepage with features | No |
| `/login` | LoginPage | Login form + OAuth buttons | No |
| `/register` | RegisterPage | Registration form | No |
| `/auth/:provider/callback` | OAuthCallback | OAuth callback handler | No |

### Protected Routes (Dashboard)
| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/dashboard` | Dashboard | Overview/home | Yes |
| `/dashboard/agents` | Agents | Agent management | Yes |
| `/dashboard/campaigns` | Campaigns | Workflow management | Yes |
| `/dashboard/analytics` | Analytics | Reports & metrics | Yes |
| `/dashboard/settings` | Settings | Org settings, team, billing | Yes |

---

## Routing Flow Diagrams

### Subdomain-Based Routing
```
User Access Pattern:

Development:
http://localhost:3002/login?org=acme-corp
http://localhost:3002/dashboard?org=acme-corp

Production:
https://neurallempire.com → Landing page
https://acme-corp.neurallempire.com/login → Org-specific login
https://acme-corp.neurallempire.com/dashboard → Org dashboard

Frontend Logic:
1. Check if on subdomain (window.location.hostname)
2. Extract org slug from subdomain or ?org query param
3. Load organization context in state
4. Apply org-specific branding/configuration
5. All API calls include organization context (JWT contains org ID)
```

### Authentication Flow
```
Login Flow:
1. User enters credentials
2. POST /api/auth/login
3. Backend validates credentials
4. Backend creates session + JWT token
5. Frontend stores token in localStorage
6. Frontend calls GET /api/auth/profile to fetch user + org data
7. Frontend stores user/org in Zustand store
8. Redirect to /dashboard

OAuth Flow:
1. User clicks "Sign in with Google"
2. GET /api/oauth/google/login
3. Redirect to Google consent screen
4. User approves → Google redirects to callback
5. Frontend: /auth/google/callback?code=xyz
6. POST /api/oauth/google/callback { code }
7. Backend exchanges code for token, creates/links account
8. Returns JWT token
9. Same as steps 5-8 above
```

---

## Implementation Status

### ✅ Completed
- Backend API structure (routes, controllers)
- Database schema with all models
- Authentication middleware
- Multi-tenant architecture
- OAuth route structure
- Swarm management API

### 🚧 In Progress
- OAuth provider integration (Google, GitHub)
- Subdomain DNS automation
- Frontend OAuth buttons
- Stripe payment integration

### 📋 Planned
- Workflow builder UI
- Agent marketplace
- Real-time execution monitoring
- Email notifications
- Usage analytics dashboard

---

## Next Steps for Development

1. **Complete OAuth Integration**
   - Implement Google OAuth provider
   - Add GitHub OAuth provider
   - Test OAuth login flow end-to-end

2. **Subdomain Automation**
   - Integrate Cloudflare API
   - Automate DNS record creation
   - SSL certificate generation

3. **Frontend Agent Builder**
   - Visual agent configuration UI
   - Form validation for agent types
   - Test execution interface

4. **Swarm/Workflow UI**
   - Visual workflow builder (drag-drop nodes)
   - Agent connection interface
   - Execution monitoring dashboard

5. **Billing Integration**
   - Stripe subscription checkout
   - Invoice generation
   - Usage-based billing alerts

---

**Generated for NeurallEmpire v2.0**
*Last Updated: October 2024*
