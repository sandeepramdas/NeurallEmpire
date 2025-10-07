# NeurallEmpire Infrastructure Setup

## 📋 Overview

Complete infrastructure implementation for monitoring, email, file storage, analytics, and system settings.

## ✅ Implemented Modules

### 1. Error Monitoring (Sentry)
- **Location**: `/backend/src/config/sentry.ts`
- **Features**:
  - Express integration with tracing
  - Performance profiling
  - User context tracking
  - Error filtering & breadcrumbs
  - Sensitive data removal
- **Status**: Ready (needs `SENTRY_DSN` env var)

### 2. Email Service (SendGrid)
- **Location**: `/backend/src/infrastructure/email/email.service.ts`
- **Features**:
  - Transactional email delivery
  - Database tracking
  - Delivery status monitoring
  - Click/open tracking
  - HTML templates (welcome, password reset, verification, invite)
- **Status**: Ready (needs `SENDGRID_API_KEY` env var)
- **Env Vars**:
  ```
  SENDGRID_API_KEY=your_key_here
  FROM_EMAIL=noreply@neurallempire.com
  FROM_NAME=NeurallEmpire
  ```

### 3. File Storage (AWS S3)
- **Location**: `/backend/src/infrastructure/storage/storage.service.ts`
- **Features**:
  - File upload with S3 integration
  - Automatic thumbnail generation (Sharp)
  - Signed URLs for private files
  - File category detection
  - Storage usage analytics
  - Soft delete
- **Status**: Ready (needs AWS credentials)
- **Env Vars**:
  ```
  AWS_ACCESS_KEY_ID=your_access_key
  AWS_SECRET_ACCESS_KEY=your_secret_key
  AWS_REGION=us-east-1
  S3_BUCKET_NAME=neurallempire-files
  CDN_URL=https://cdn.neurallempire.com (optional)
  ```

### 4. System Settings
- **Location**: `/backend/src/modules/system-settings/`
- **Features**:
  - Configuration management
  - Feature flags
  - Category-based organization
  - Bulk updates
  - Default value management
  - Public/private settings
- **Status**: ✅ Active

### 5. Analytics Event Tracking
- **Location**: `/backend/src/modules/analytics/`
- **Features**:
  - Event tracking
  - Page view analytics
  - User activity monitoring
  - Conversion funnels
  - Dashboard summaries
  - Session tracking
- **Status**: ✅ Active

### 6. Health Monitoring
- **Endpoint**: `GET /health`
- **Monitors**:
  - Database connectivity
  - Sentry configuration
  - Email service status
  - Storage service status
- **Status**: ✅ Active

## 📊 Database Models

### SystemSetting
```prisma
- id, organizationId, key, value
- type: 'global' | 'organization' | 'user' | 'feature_flag'
- category: 'general' | 'security' | 'billing' | 'features' | 'ui' | 'integrations'
- isPublic, isEditable, validationRules, defaultValue
```

### File
```prisma
- id, organizationId, uploadedBy, filename, originalName
- mimeType, size, extension, path, url, thumbnailUrl
- bucket, storageProvider, folder, tags, category, metadata
- isPublic, downloadCount, expiresAt, lastAccessedAt
```

### EmailNotification
```prisma
- id, organizationId, to[], cc[], bcc[], from, replyTo
- subject, body, bodyHtml, templateId, templateData
- status: 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'delivered' | 'opened' | 'clicked'
- provider, providerId, sentAt, deliveredAt, openedAt, clickedAt
- openCount, clickCount, error, retryCount, priority, tags
```

### AnalyticsEvent
```prisma
- id, userId, organizationId, sessionId
- eventName, eventType, category, action, label, value, properties
- pageUrl, pagePath, pageTitle, referrer
- userAgent, ipAddress, country, city, device, browser, os
- timestamp, duration, source, medium, campaign
```

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-07T04:25:55.130Z",
  "uptime": 6078.76,
  "environment": "development",
  "version": "2.0.0",
  "database": "connected",
  "sentry": "not configured",
  "email": "not configured",
  "storage": "not configured"
}
```

### Settings API
```bash
# Get all settings
GET /api/settings
GET /api/settings?category=ui&type=organization

# Get public settings
GET /api/settings/public

# Get specific setting
GET /api/settings/:key
GET /api/settings/:key/details

# Get by category
GET /api/settings/category/:category

# Create/update setting
PUT /api/settings/:key
Body: { "value": "dark", "category": "ui", "description": "Theme", "isPublic": true }

# Delete setting
DELETE /api/settings/:key

# Reset to default
POST /api/settings/:key/reset

# Bulk update
POST /api/settings/bulk-update
Body: { "settings": [{"key": "theme", "value": "dark"}, ...] }

# Feature flags
GET /api/settings/features/:featureName
POST /api/settings/features/:featureName/enable
POST /api/settings/features/:featureName/disable
```

### Files API
```bash
# Upload file
POST /api/files/upload
Form-Data: file, folder, isPublic, tags, metadata

# List files
GET /api/files
GET /api/files?folder=avatars

# Get file details
GET /api/files/:fileId

# Get download URL
GET /api/files/:fileId/download

# Delete file
DELETE /api/files/:fileId

# Get storage usage
GET /api/files/storage/usage
```

### Analytics API
```bash
# Track event
POST /api/analytics/track
Body: {
  "eventName": "page_view",
  "eventType": "page_view",
  "category": "navigation",
  "sessionId": "session-123",
  "pageUrl": "http://localhost:3000/dashboard",
  "pagePath": "/dashboard",
  "pageTitle": "Dashboard"
}

# Get events
GET /api/analytics/events
GET /api/analytics/events?startDate=2025-01-01&endDate=2025-01-31&eventType=page_view

# Get event counts
GET /api/analytics/event-counts
GET /api/analytics/event-counts?startDate=2025-01-01

# Get user activity
GET /api/analytics/user-activity/:userId
GET /api/analytics/user-activity/:userId?startDate=2025-01-01

# Get page views
GET /api/analytics/page-views
GET /api/analytics/page-views?startDate=2025-01-01

# Get funnel data
POST /api/analytics/funnel
Body: {
  "funnelSteps": ["page_view", "signup_click", "signup_complete"],
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}

# Get dashboard summary
GET /api/analytics/dashboard
GET /api/analytics/dashboard?days=30
```

## 🧪 CLI Testing

### Test Script Location
```bash
/tmp/test-infrastructure-apis.sh
```

### Quick Test Commands
```bash
# Check health
curl http://localhost:3001/health | jq

# View API documentation
curl http://localhost:3001/api/ | jq

# Test with authentication
TOKEN="your_token_here"

# Create a setting
curl -X PUT "http://localhost:3001/api/settings/app_theme" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"dark","category":"ui","isPublic":true}' | jq

# Track analytics event
curl -X POST "http://localhost:3001/api/analytics/track" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventName":"button_click",
    "eventType":"user_action",
    "category":"engagement",
    "action":"click",
    "label":"create_agent"
  }' | jq

# Get storage usage
curl -X GET "http://localhost:3001/api/files/storage/usage" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 📁 File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── sentry.ts                    # Sentry configuration
│   ├── infrastructure/
│   │   ├── email/
│   │   │   └── email.service.ts          # Email service
│   │   └── storage/
│   │       └── storage.service.ts        # File storage service
│   ├── modules/
│   │   ├── system-settings/
│   │   │   ├── services/
│   │   │   │   └── settings.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── settings.controller.ts
│   │   │   └── routes/
│   │   │       └── settings.routes.ts
│   │   ├── files/
│   │   │   ├── controllers/
│   │   │   │   └── files.controller.ts
│   │   │   └── routes/
│   │   │       └── files.routes.ts
│   │   └── analytics/
│   │       ├── services/
│   │       │   └── analytics.service.ts
│   │       ├── controllers/
│   │       │   └── analytics.controller.ts
│   │       └── routes/
│   │           └── analytics.routes.ts
│   ├── routes/
│   │   └── index.ts                     # Main router (updated)
│   └── server.ts                        # Enhanced health check
└── prisma/
    └── schema.prisma                    # Added 4 new models
```

## 🚀 Next Steps

### Required Environment Variables
Add to `/backend/.env`:
```env
# Sentry (Optional)
SENTRY_DSN=https://your-key@sentry.io/your-project

# SendGrid (Required for email)
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=noreply@neurallempire.com
FROM_NAME=NeurallEmpire

# AWS S3 (Required for file uploads)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=neurallempire-files
CDN_URL=https://cdn.neurallempire.com  # Optional
```

### Database Migration
Schema changes need to be applied when database is accessible:
```bash
cd backend
npx prisma db push
# or
npx prisma migrate dev --name add_infrastructure_models
```

### Frontend Integration
1. Configure Sentry for frontend
2. Build file upload UI component
3. Build settings management UI
4. Integrate analytics tracking hooks

## 📖 Service Usage Examples

### Email Service
```typescript
import EmailService from '@/infrastructure/email/email.service';

// Send welcome email
await EmailService.sendWelcomeEmail(
  'user@example.com',
  'John',
  organizationId
);

// Send custom email
await EmailService.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello!</h1>',
  organizationId,
  tags: ['welcome'],
  priority: 'high'
});
```

### Storage Service
```typescript
import StorageService from '@/infrastructure/storage/storage.service';

// Upload file
const result = await StorageService.uploadFile({
  file: buffer,
  filename: 'avatar.jpg',
  mimeType: 'image/jpeg',
  organizationId,
  uploadedBy: userId,
  folder: 'avatars',
  isPublic: true,
  tags: ['profile'],
});

// Get signed URL
const url = await StorageService.getDownloadUrl(fileId, organizationId);
```

### Analytics Service
```typescript
import AnalyticsService from '@/modules/analytics/services/analytics.service';

// Track page view
await AnalyticsService.trackPageView(
  organizationId,
  userId,
  sessionId,
  'http://localhost:3000/dashboard',
  '/dashboard',
  'Dashboard'
);

// Track action
await AnalyticsService.trackAction(
  'button_click',
  organizationId,
  userId,
  sessionId,
  'engagement',
  'click',
  'create_agent_button'
);

// Get dashboard summary
const summary = await AnalyticsService.getDashboardSummary(organizationId, 7);
```

### Settings Service
```typescript
import SystemSettingsService from '@/modules/system-settings/services/settings.service';

// Get setting
const theme = await SystemSettingsService.getSetting('app_theme', organizationId);

// Set setting
await SystemSettingsService.setSetting('app_theme', 'dark', organizationId, {
  category: 'ui',
  description: 'Application theme',
  isPublic: true
});

// Feature flags
const isEnabled = await SystemSettingsService.isFeatureEnabled('advanced_analytics', organizationId);
await SystemSettingsService.enableFeature('advanced_analytics', organizationId);
```

## 🔍 Monitoring & Debugging

### Check Backend Logs
```bash
# Backend is running on port 3001
# Check server output for:
# - ✅ Sentry error monitoring initialized
# - ✅ SendGrid email service initialized (if configured)
# - 📧 Email sending disabled (if not configured)
```

### Verify Routes
```bash
curl http://localhost:3001/api/ | jq '.endpoints | keys'
# Should include: settings, files, analytics
```

### Test Health Endpoint
```bash
curl http://localhost:3001/health | jq
# Check status of all services
```

---

**Last Updated**: October 7, 2025
**Backend Status**: ✅ Running on port 3001
**Frontend Status**: ✅ Running on port 3000
**Infrastructure**: ✅ Complete
