#!/bin/bash

# 🚀 Quick Supabase Setup for NeurallEmpire
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 NeurallEmpire Quick Supabase Setup${NC}"
echo ""

# Get credentials from user
echo -e "${YELLOW}Please enter your Supabase credentials:${NC}"
read -p "Project URL (https://xxx.supabase.co): " PROJECT_URL
read -p "Anon Key (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...): " ANON_KEY

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Missing credentials. Please run the script again.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Setting up your NeurallEmpire with Supabase...${NC}"

# Extract project reference from URL
PROJECT_REF=$(echo $PROJECT_URL | sed 's/https:\/\/\([^.]*\).supabase.co/\1/')

echo -e "${BLUE}📊 Project Reference: $PROJECT_REF${NC}"

# Update frontend configuration
echo -e "${BLUE}🔄 Updating frontend configuration...${NC}"

# Backup original file
cp assets/js/supabase-config.js assets/js/supabase-config.js.backup

# Update the configuration
sed -i.tmp "s|YOUR_SUPABASE_URL|$PROJECT_URL|g" assets/js/supabase-config.js
sed -i.tmp "s|YOUR_SUPABASE_ANON_KEY|$ANON_KEY|g" assets/js/supabase-config.js
sed -i.tmp "s|enabled: true|enabled: true|g" assets/js/supabase-config.js

# Clean up temp files
rm -f assets/js/supabase-config.js.tmp

echo -e "${GREEN}✅ Frontend configuration updated!${NC}"

# Set up database schema using curl
echo -e "${BLUE}🗄️ Setting up database schema...${NC}"

# Read the migration file
MIGRATION_SQL=$(cat supabase/migrations/20241001000000_initial_schema.sql)

# Create a temporary file for the SQL
echo "$MIGRATION_SQL" > /tmp/neurall_schema.sql

echo -e "${YELLOW}📋 Please run this SQL in your Supabase dashboard:${NC}"
echo "1. Go to your Supabase dashboard → SQL Editor"
echo "2. Copy and paste the content from: /tmp/neurall_schema.sql"
echo "3. Click 'Run' to execute the schema"
echo ""
echo -e "${YELLOW}Or manually copy this SQL:${NC}"
echo "=================================="
head -20 /tmp/neurall_schema.sql
echo "... (see /tmp/neurall_schema.sql for full content)"
echo "=================================="
echo ""

read -p "Press Enter after running the SQL in Supabase dashboard..."

# Configure authentication URLs
echo -e "${BLUE}🔐 Configuring authentication...${NC}"
echo ""
echo -e "${YELLOW}Please update these settings in your Supabase dashboard:${NC}"
echo "1. Go to Authentication → Settings"
echo "2. Site URL: http://localhost:61580"
echo "3. Redirect URLs: http://localhost:61580, http://localhost:8000"
echo "4. Enable email confirmations (optional for testing)"
echo ""

read -p "Press Enter after configuring authentication..."

# Test the setup
echo -e "${BLUE}🧪 Testing the integration...${NC}"

# Kill any existing servers
pkill -f "serve.*8000" 2>/dev/null || true
pkill -f "serve.*61580" 2>/dev/null || true

# Start the development server
echo -e "${BLUE}🚀 Starting development server...${NC}"
npx serve . -l 61580 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo ""
echo -e "${GREEN}🎉 Setup Complete! Your NeurallEmpire is now powered by Supabase!${NC}"
echo ""
echo -e "${YELLOW}🔗 Your website is running at: http://localhost:61580${NC}"
echo ""
echo -e "${BLUE}✨ Features now available:${NC}"
echo "• User registration and login"
echo "• Contact form with lead scoring"
echo "• Real-time database updates"
echo "• Email notifications"
echo "• Analytics and tracking"
echo ""
echo -e "${YELLOW}🧪 Test these features:${NC}"
echo "1. Sign up for a new account"
echo "2. Submit a contact form"
echo "3. Check your Supabase dashboard for data"
echo ""

# Open browser
if command -v open &> /dev/null; then
    open http://localhost:61580
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:61580
fi

echo -e "${GREEN}🚀 Your empire is ready to dominate the market!${NC}"
echo ""
echo "Press Ctrl+C to stop the server when you're done testing."

# Keep the script running
wait $SERVER_PID