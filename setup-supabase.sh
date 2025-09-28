#!/bin/bash

# 🚀 Automated Supabase Setup for NeurallEmpire
# This script will guide you through the entire Supabase setup process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Welcome message
echo -e "${GREEN}🚀 Welcome to NeurallEmpire Supabase Setup${NC}"
echo -e "${BLUE}This script will help you set up Supabase for your empire!${NC}"
echo ""

# Step 1: Check if Supabase CLI is installed
log_step "1. Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    log_info "Installing Supabase CLI..."
    if command -v npm &> /dev/null; then
        npm install -g supabase
    elif command -v brew &> /dev/null; then
        brew install supabase/tap/supabase
    else
        log_error "Please install Node.js or Homebrew first"
        exit 1
    fi
    log_success "Supabase CLI installed!"
else
    log_success "Supabase CLI already installed!"
fi

# Step 2: Login to Supabase
log_step "2. Logging into Supabase..."
echo -e "${YELLOW}Please use this email: ramdassandeep5130@gmail.com${NC}"
supabase login

# Step 3: Create or link project
log_step "3. Setting up Supabase project..."
echo ""
echo -e "${YELLOW}Choose an option:${NC}"
echo "1. Create a new project (recommended)"
echo "2. Link to existing project"
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    log_info "Creating new Supabase project..."

    # Initialize Supabase project
    supabase init

    # Create project on Supabase platform
    echo -e "${YELLOW}Please create your project at https://supabase.com with these details:${NC}"
    echo "- Project name: neurallempire"
    echo "- Region: us-east-1"
    echo "- Email: ramdassandeep5130@gmail.com"
    echo ""
    read -p "Press Enter after creating the project..."

    # Link to the created project
    read -p "Enter your project reference (from the URL): " project_ref
    supabase link --project-ref "$project_ref"

elif [ "$choice" = "2" ]; then
    log_info "Linking to existing project..."
    read -p "Enter your project reference: " project_ref
    supabase link --project-ref "$project_ref"
else
    log_error "Invalid choice. Exiting."
    exit 1
fi

# Step 4: Apply database schema
log_step "4. Setting up database schema..."
log_info "Applying NeurallEmpire database schema..."

# Apply the schema
supabase db push

log_success "Database schema applied successfully!"

# Step 5: Get project credentials
log_step "5. Getting project credentials..."

# Get project details
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
    log_warning "Could not auto-detect credentials. Please get them manually:"
    echo "1. Go to your Supabase dashboard"
    echo "2. Go to Settings → API"
    echo "3. Copy the Project URL and anon/public key"
    read -p "Enter Project URL: " PROJECT_URL
    read -p "Enter Anon Key: " ANON_KEY
fi

# Step 6: Update frontend configuration
log_step "6. Updating frontend configuration..."

# Update supabase-config.js
sed -i.bak "s|YOUR_SUPABASE_URL|$PROJECT_URL|g" assets/js/supabase-config.js
sed -i.bak "s|YOUR_SUPABASE_ANON_KEY|$ANON_KEY|g" assets/js/supabase-config.js
sed -i.bak "s|enabled: false|enabled: true|g" assets/js/supabase-config.js

log_success "Frontend configuration updated!"

# Step 7: Set up authentication
log_step "7. Configuring authentication..."

echo -e "${YELLOW}Setting up authentication in Supabase dashboard:${NC}"
echo "1. Go to Authentication → Settings"
echo "2. Set Site URL to: http://localhost:61580"
echo "3. Add redirect URLs as needed"
echo "4. Configure email templates (optional)"
echo ""
read -p "Press Enter after configuring authentication..."

# Step 8: Test the setup
log_step "8. Testing the setup..."

log_info "Starting test server..."
npm run dev &
SERVER_PID=$!

sleep 3

log_info "Opening browser for testing..."
if command -v open &> /dev/null; then
    open http://localhost:61580
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:61580
else
    echo "Please open http://localhost:61580 in your browser"
fi

echo ""
echo -e "${GREEN}🎉 Supabase setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test user registration and login"
echo "2. Submit a contact form"
echo "3. Check your Supabase dashboard for data"
echo "4. Configure email templates (optional)"
echo ""
echo -e "${BLUE}Your NeurallEmpire is now powered by Supabase!${NC}"

# Cleanup
read -p "Press Enter to stop the test server..."
kill $SERVER_PID 2>/dev/null || true

log_success "Setup complete! Your empire is ready to dominate! 🚀"