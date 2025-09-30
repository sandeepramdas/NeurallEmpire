#!/bin/bash

# 🚀 NeurallEmpire OAuth Environment Setup Script
# This script helps you configure OAuth providers and environment variables

set -e

echo "🚀 NeurallEmpire OAuth Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local result

    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Function to generate secure random key
generate_key() {
    openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d "=+/" | cut -c1-32
}

echo -e "${BLUE}📋 This script will help you configure OAuth providers and security settings${NC}"
echo -e "${YELLOW}⚠️  You'll need to create OAuth apps first. See OAUTH_SETUP_GUIDE.md${NC}"
echo ""

# Check if OAuth apps are ready
echo -e "${BLUE}🔐 OAuth Provider Configuration${NC}"
read -p "Have you created OAuth apps for Google, GitHub, LinkedIn, and Microsoft? (y/n): " oauth_ready

if [ "$oauth_ready" != "y" ]; then
    echo -e "${RED}❌ Please create OAuth apps first using OAUTH_SETUP_GUIDE.md${NC}"
    echo -e "${BLUE}💡 Come back and run this script after creating your OAuth apps${NC}"
    exit 1
fi

# OAuth Configuration
echo ""
echo -e "${GREEN}✅ Great! Let's configure your OAuth credentials${NC}"
echo ""

# Google OAuth
echo -e "${BLUE}🔵 Google OAuth Configuration${NC}"
GOOGLE_CLIENT_ID=$(prompt_with_default "Google Client ID" "")
GOOGLE_CLIENT_SECRET=$(prompt_with_default "Google Client Secret" "")

# GitHub OAuth
echo ""
echo -e "${BLUE}⚫ GitHub OAuth Configuration${NC}"
GITHUB_CLIENT_ID=$(prompt_with_default "GitHub Client ID" "")
GITHUB_CLIENT_SECRET=$(prompt_with_default "GitHub Client Secret" "")

# LinkedIn OAuth
echo ""
echo -e "${BLUE}🔵 LinkedIn OAuth Configuration${NC}"
LINKEDIN_CLIENT_ID=$(prompt_with_default "LinkedIn Client ID" "")
LINKEDIN_CLIENT_SECRET=$(prompt_with_default "LinkedIn Client Secret" "")

# Microsoft OAuth
echo ""
echo -e "${BLUE}🔵 Microsoft OAuth Configuration${NC}"
MICROSOFT_CLIENT_ID=$(prompt_with_default "Microsoft Client ID" "")
MICROSOFT_CLIENT_SECRET=$(prompt_with_default "Microsoft Client Secret" "")

# Cloudflare Configuration
echo ""
echo -e "${BLUE}☁️  Cloudflare DNS Configuration (Optional)${NC}"
read -p "Do you want to configure Cloudflare for subdomain management? (y/n): " cloudflare_setup

if [ "$cloudflare_setup" = "y" ]; then
    CLOUDFLARE_API_TOKEN=$(prompt_with_default "Cloudflare API Token" "")
    CLOUDFLARE_ZONE_ID=$(prompt_with_default "Cloudflare Zone ID" "")
else
    CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
    CLOUDFLARE_ZONE_ID="your_cloudflare_zone_id"
fi

# Security Keys Generation
echo ""
echo -e "${BLUE}🔒 Generating Security Keys${NC}"
ENCRYPTION_KEY=$(generate_key)
OAUTH_STATE_SECRET=$(generate_key)
SUBDOMAIN_SIGNING_SECRET=$(generate_key)
echo -e "${GREEN}✅ Security keys generated successfully${NC}"

# Email Configuration
echo ""
echo -e "${BLUE}📧 Email Configuration (Optional)${NC}"
read -p "Do you want to configure email notifications? (y/n): " email_setup

if [ "$email_setup" = "y" ]; then
    SMTP_USER=$(prompt_with_default "Gmail Address" "")
    SMTP_PASS=$(prompt_with_default "Gmail App Password" "")
    EMAIL_FROM=$(prompt_with_default "From Email" "no-reply@neurallempire.com")
else
    SMTP_USER="your_email@gmail.com"
    SMTP_PASS="your_app_password"
    EMAIL_FROM="no-reply@neurallempire.com"
fi

# Backup existing .env
if [ -f "backend/.env" ]; then
    echo ""
    echo -e "${YELLOW}📋 Backing up existing backend/.env to backend/.env.backup${NC}"
    cp backend/.env backend/.env.backup
fi

# Generate new .env content
echo ""
echo -e "${BLUE}📝 Updating backend/.env file${NC}"

cat > backend/.env << EOF
# Environment Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DATABASE_URL="postgresql://postgres.xwncwujgfgqcwzorkngk:pDxhsrhidcB82xpS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Session Secret
SESSION_SECRET=neurall-empire-session-secret

# CORS Configuration
FRONTEND_URL=http://localhost:8000
PRODUCTION_URL=https://www.neurallempire.com

# Payment Gateway Configuration (Live Keys)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_demo_stripe_key
STRIPE_SECRET_KEY=sk_test_demo_stripe_secret

# OAuth Configuration (Production Ready)
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
LINKEDIN_CLIENT_ID=$LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET=$LINKEDIN_CLIENT_SECRET
MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET

# OAuth Redirect URLs
OAUTH_GOOGLE_REDIRECT_URI=http://localhost:3001/api/oauth/google/callback
OAUTH_GITHUB_REDIRECT_URI=http://localhost:3001/api/oauth/github/callback
OAUTH_LINKEDIN_REDIRECT_URI=http://localhost:3001/api/oauth/linkedin/callback
OAUTH_MICROSOFT_REDIRECT_URI=http://localhost:3001/api/oauth/microsoft/callback

# Production OAuth Redirect URLs
OAUTH_GOOGLE_REDIRECT_URI_PROD=https://api.neurallempire.com/api/oauth/google/callback
OAUTH_GITHUB_REDIRECT_URI_PROD=https://api.neurallempire.com/api/oauth/github/callback
OAUTH_LINKEDIN_REDIRECT_URI_PROD=https://api.neurallempire.com/api/oauth/linkedin/callback
OAUTH_MICROSOFT_REDIRECT_URI_PROD=https://api.neurallempire.com/api/oauth/microsoft/callback

# Subdomain & DNS Management
MAIN_DOMAIN=neurallempire.com
SUBDOMAIN_SUFFIX=neurallempire.com
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
CLOUDFLARE_ZONE_ID=$CLOUDFLARE_ZONE_ID
DNS_PROVIDER=cloudflare

# SSL Configuration
SSL_PROVIDER=cloudflare
SSL_AUTO_PROVISION=true

# Security & Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY
OAUTH_STATE_SECRET=$OAUTH_STATE_SECRET
SUBDOMAIN_SIGNING_SECRET=$SUBDOMAIN_SIGNING_SECRET

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OAUTH_RATE_LIMIT_MAX=10

# Session Configuration
SESSION_DOMAIN=.neurallempire.com
SESSION_SECURE=false
SESSION_SAME_SITE=lax

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
EMAIL_FROM=$EMAIL_FROM
EOF

echo -e "${GREEN}✅ Backend .env file updated successfully${NC}"

# Update frontend .env if needed
if [ ! -f "frontend/.env" ] || [ ! -s "frontend/.env" ]; then
    echo ""
    echo -e "${BLUE}📝 Creating frontend/.env file${NC}"

cat > frontend/.env << EOF
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_API_URL_PROD=https://api.neurallempire.com/api

# Application Configuration
VITE_APP_NAME=NeurallEmpire
VITE_APP_URL=http://localhost:3000
VITE_APP_URL_PROD=https://www.neurallempire.com

# Domain Configuration
VITE_MAIN_DOMAIN=neurallempire.com
VITE_SUBDOMAIN_SUFFIX=neurallempire.com

# OAuth Configuration
VITE_OAUTH_PROVIDERS=google,github,linkedin,microsoft

# Feature Flags
VITE_ENABLE_SUBDOMAIN_ROUTING=true
VITE_ENABLE_OAUTH=true
VITE_ENABLE_SSO=true
VITE_ENABLE_ANALYTICS=true

# Environment
VITE_NODE_ENV=development
EOF

    echo -e "${GREEN}✅ Frontend .env file created successfully${NC}"
fi

# Installation and setup commands
echo ""
echo -e "${BLUE}🔧 Next Steps${NC}"
echo -e "${YELLOW}1. Install dependencies:${NC}"
echo "   cd backend && npm install"
echo "   cd frontend && npm install"
echo ""
echo -e "${YELLOW}2. Run database migration:${NC}"
echo "   cd backend && npx prisma db push"
echo "   cd backend && npx prisma generate"
echo ""
echo -e "${YELLOW}3. Start development servers:${NC}"
echo "   # Terminal 1"
echo "   cd backend && npm run dev"
echo ""
echo "   # Terminal 2"
echo "   cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}4. Test OAuth setup:${NC}"
echo "   - Navigate to http://localhost:3000/login"
echo "   - Test each OAuth provider"
echo "   - Create an organization and test subdomain routing"
echo ""

# Security reminder
echo -e "${RED}🔒 IMPORTANT SECURITY NOTES:${NC}"
echo -e "${YELLOW}• Keep your OAuth client secrets secure${NC}"
echo -e "${YELLOW}• Never commit .env files to version control${NC}"
echo -e "${YELLOW}• Use different OAuth apps for production${NC}"
echo -e "${YELLOW}• Enable 2FA on all OAuth provider accounts${NC}"
echo ""

echo -e "${GREEN}🎉 OAuth environment setup completed successfully!${NC}"
echo -e "${BLUE}📖 Check OAUTH_SETUP_GUIDE.md for detailed provider setup instructions${NC}"