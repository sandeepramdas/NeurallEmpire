#!/bin/bash

# 🚀 NeurallEmpire Deployment Script
# This script handles deployment to various hosting platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Configuration
DEPLOYMENT_TYPE=${1:-"netlify"}
BUILD_DIR="dist"
SOURCE_DIR="."

# Create build directory
create_build() {
    log_info "Creating build directory..."

    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi

    mkdir -p "$BUILD_DIR"

    # Copy all necessary files
    cp -r assets "$BUILD_DIR/"
    cp -r images "$BUILD_DIR/"
    cp index.html "$BUILD_DIR/"
    cp favicon.ico "$BUILD_DIR/" 2>/dev/null || log_warning "favicon.ico not found"
    cp robots.txt "$BUILD_DIR/" 2>/dev/null || log_warning "robots.txt not found"
    cp sitemap.xml "$BUILD_DIR/" 2>/dev/null || log_warning "sitemap.xml not found"

    # Copy Supabase files if they exist
    cp supabase-setup.sql "$BUILD_DIR/" 2>/dev/null || log_warning "supabase-setup.sql not found"

    log_success "Build directory created successfully"
}

# Minify assets (optional optimization)
optimize_build() {
    log_info "Optimizing build assets..."

    # You can add minification tools here
    # For now, we'll keep the assets as-is for easier debugging

    log_success "Build optimization completed"
}

# Deploy to Netlify
deploy_netlify() {
    log_info "Deploying to Netlify..."

    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI is not installed. Install it with: npm install -g netlify-cli"
        exit 1
    fi

    # Create _redirects file for SPA routing
    cat > "$BUILD_DIR/_redirects" << EOF
# Redirect all routes to index.html for SPA
/*    /index.html   200

# API redirects (if using serverless functions)
/api/*  /.netlify/functions/:splat  200
EOF

    # Deploy to Netlify
    netlify deploy --dir="$BUILD_DIR" --prod

    log_success "Deployed to Netlify successfully!"
}

# Deploy to Vercel
deploy_vercel() {
    log_info "Deploying to Vercel..."

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Install it with: npm install -g vercel"
        exit 1
    fi

    # Create vercel.json configuration
    cat > "$BUILD_DIR/vercel.json" << EOF
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
EOF

    # Deploy to Vercel
    vercel --prod --cwd "$BUILD_DIR"

    log_success "Deployed to Vercel successfully!"
}

# Deploy to GitHub Pages
deploy_github_pages() {
    log_info "Preparing for GitHub Pages deployment..."

    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI not found. Manual deployment required."
        log_info "To deploy manually:"
        log_info "1. Push the $BUILD_DIR folder to gh-pages branch"
        log_info "2. Enable GitHub Pages in repository settings"
        return
    fi

    # Create a temporary git repo for deployment
    cd "$BUILD_DIR"
    git init
    git add .
    git commit -m "Deploy NeurallEmpire $(date)"

    # Push to gh-pages branch
    git branch -M gh-pages
    git remote add origin $(git config --get remote.origin.url) 2>/dev/null || true
    git push -f origin gh-pages

    cd ..

    log_success "Prepared for GitHub Pages deployment!"
    log_info "Enable GitHub Pages in your repository settings to complete deployment"
}

# Deploy to Surge.sh
deploy_surge() {
    log_info "Deploying to Surge.sh..."

    # Check if Surge CLI is installed
    if ! command -v surge &> /dev/null; then
        log_error "Surge CLI is not installed. Install it with: npm install -g surge"
        exit 1
    fi

    # Deploy to Surge
    cd "$BUILD_DIR"
    surge . neurallempire.surge.sh
    cd ..

    log_success "Deployed to Surge.sh successfully!"
}

# Deploy static files to AWS S3
deploy_s3() {
    log_info "Deploying to AWS S3..."

    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Install it first."
        exit 1
    fi

    # Check for required environment variables
    if [ -z "$AWS_S3_BUCKET" ]; then
        log_error "AWS_S3_BUCKET environment variable is required"
        exit 1
    fi

    # Sync files to S3
    aws s3 sync "$BUILD_DIR" "s3://$AWS_S3_BUCKET" --delete

    # Set proper content types and caching
    aws s3 cp "s3://$AWS_S3_BUCKET" "s3://$AWS_S3_BUCKET" --recursive \
        --metadata-directive REPLACE \
        --cache-control "public, max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.json"

    aws s3 cp "s3://$AWS_S3_BUCKET" "s3://$AWS_S3_BUCKET" --recursive \
        --metadata-directive REPLACE \
        --cache-control "public, max-age=0, must-revalidate" \
        --include "*.html" \
        --include "*.json"

    log_success "Deployed to AWS S3 successfully!"
}

# Pre-deployment checks
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."

    # Check if Supabase is configured
    if grep -q "YOUR_SUPABASE_URL" assets/js/supabase-config.js 2>/dev/null; then
        log_warning "Supabase is not configured. Update assets/js/supabase-config.js"
    fi

    # Check if EmailJS is configured
    if grep -q "YOUR_EMAILJS_PUBLIC_KEY" assets/js/config.js 2>/dev/null; then
        log_warning "EmailJS is not configured. Update assets/js/config.js"
    fi

    # Validate HTML
    if command -v html5validator &> /dev/null; then
        html5validator --root "$SOURCE_DIR" --also-check-css
        log_success "HTML validation passed"
    else
        log_warning "html5validator not found. Install with: pip install html5validator"
    fi

    log_success "Pre-deployment checks completed"
}

# Main deployment logic
main() {
    log_info "Starting NeurallEmpire deployment..."
    log_info "Deployment type: $DEPLOYMENT_TYPE"

    # Run pre-deployment checks
    pre_deploy_checks

    # Create build
    create_build
    optimize_build

    # Deploy based on type
    case $DEPLOYMENT_TYPE in
        "netlify")
            deploy_netlify
            ;;
        "vercel")
            deploy_vercel
            ;;
        "github")
            deploy_github_pages
            ;;
        "surge")
            deploy_surge
            ;;
        "s3")
            deploy_s3
            ;;
        *)
            log_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            log_info "Available options: netlify, vercel, github, surge, s3"
            exit 1
            ;;
    esac

    log_success "🚀 NeurallEmpire deployment completed successfully!"
    log_info "Your empire is now live and ready to dominate!"
}

# Help function
show_help() {
    echo "NeurallEmpire Deployment Script"
    echo ""
    echo "Usage: $0 [deployment_type]"
    echo ""
    echo "Deployment types:"
    echo "  netlify    Deploy to Netlify (default)"
    echo "  vercel     Deploy to Vercel"
    echo "  github     Deploy to GitHub Pages"
    echo "  surge      Deploy to Surge.sh"
    echo "  s3         Deploy to AWS S3"
    echo ""
    echo "Examples:"
    echo "  $0 netlify"
    echo "  $0 vercel"
    echo "  AWS_S3_BUCKET=my-bucket $0 s3"
    echo ""
    echo "Prerequisites:"
    echo "  - Install respective CLI tools (netlify-cli, vercel, surge, aws-cli)"
    echo "  - Configure authentication for chosen platform"
    echo "  - Update Supabase and EmailJS configurations"
}

# Check if help is requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main