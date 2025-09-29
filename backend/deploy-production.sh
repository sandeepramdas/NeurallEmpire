#!/bin/bash

# 🚀 NeurallEmpire Backend Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
DEPLOYMENT_METHOD=${1:-"docker"}
DOMAIN="neurallempire.com"
API_SUBDOMAIN="api.${DOMAIN}"

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    log_error "This script must be run from the backend directory"
    exit 1
fi

# Update production environment
update_production_env() {
    log_info "Updating production environment variables..."

    # Create production .env if it doesn't exist
    if [ ! -f ".env.production" ]; then
        cp .env .env.production
        log_info "Created .env.production from .env"
    fi

    # Update key production values
    sed -i.bak "s|NODE_ENV=development|NODE_ENV=production|g" .env.production
    sed -i.bak "s|FRONTEND_URL=http://localhost:8000|FRONTEND_URL=https://www.${DOMAIN}|g" .env.production
    sed -i.bak "s|PRODUCTION_URL=https://www.neurallempire.com|PRODUCTION_URL=https://www.${DOMAIN}|g" .env.production

    # Update MongoDB URI for production
    if grep -q "mongodb://localhost" .env.production; then
        log_warning "MongoDB URI is still localhost. Please update MONGODB_URI in .env.production"
        log_info "Example: MONGODB_URI=mongodb://mongodb:27017/neurallempire"
    fi

    log_success "Production environment updated"
}

# Build Docker image
build_docker() {
    log_info "Building Docker image..."

    docker build -t neurallempire-backend:latest .

    log_success "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."

    # Use production environment
    export $(cat .env.production | xargs)

    # Build and start services
    docker-compose up -d --build

    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10

    # Check health
    if curl -f "http://localhost:3001/health" > /dev/null 2>&1; then
        log_success "Backend is running and healthy!"
    else
        log_error "Backend health check failed"
        docker-compose logs neurall-backend
        exit 1
    fi
}

# Deploy to VPS/Server
deploy_vps() {
    log_info "Preparing for VPS deployment..."

    # Create deployment package
    log_info "Creating deployment package..."

    # Create deployment directory
    mkdir -p deploy-package

    # Copy necessary files
    cp -r . deploy-package/
    rm -rf deploy-package/node_modules
    rm -rf deploy-package/deploy-package

    # Create deployment script for server
    cat > deploy-package/server-deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Installing NeurallEmpire Backend on Server..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install dependencies
npm ci --only=production

# Create production environment
cp .env.production .env

# Start/Restart with PM2
pm2 delete neurallempire-backend || true
pm2 start server.js --name neurallempire-backend
pm2 save
pm2 startup

echo "✅ Backend deployed successfully!"
echo "API available at: http://localhost:3001"
EOF

    chmod +x deploy-package/server-deploy.sh

    # Create archive
    tar -czf neurallempire-backend-deploy.tar.gz deploy-package/

    log_success "Deployment package created: neurallempire-backend-deploy.tar.gz"
    log_info "Upload this to your server and run: tar -xzf neurallempire-backend-deploy.tar.gz && cd deploy-package && ./server-deploy.sh"
}

# Deploy to Railway
deploy_railway() {
    log_info "Deploying to Railway..."

    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI not found. Install with: npm install -g @railway/cli"
        exit 1
    fi

    # Initialize Railway project if needed
    if [ ! -f "railway.toml" ]; then
        railway init
    fi

    # Deploy
    railway up

    log_success "Deployed to Railway!"
}

# Deploy to Render
deploy_render() {
    log_info "Preparing for Render deployment..."

    # Create render.yaml
    cat > render.yaml << EOF
services:
  - type: web
    name: neurallempire-backend
    env: node
    plan: free
    buildCommand: npm ci
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: MONGODB_URI
        fromDatabase:
          name: neurallempire-db
          property: connectionString
    domains:
      - ${API_SUBDOMAIN}

databases:
  - name: neurallempire-db
    plan: free
EOF

    log_success "render.yaml created"
    log_info "Connect your GitHub repo to Render and it will auto-deploy"
}

# Setup reverse proxy with Nginx
setup_nginx() {
    log_info "Setting up Nginx reverse proxy..."

    cat > nginx-neurallempire.conf << EOF
server {
    listen 80;
    server_name ${API_SUBDOMAIN};

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${API_SUBDOMAIN};

    # SSL Configuration (update paths to your certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
    }
}
EOF

    log_success "Nginx configuration created: nginx-neurallempire.conf"
    log_info "Copy this to /etc/nginx/sites-available/ and enable it"
}

# Configure Razorpay webhooks
configure_webhooks() {
    log_info "Webhook configuration information:"
    echo ""
    echo "Configure the following webhook URLs in your Razorpay dashboard:"
    echo "🔗 Razorpay Webhook URL: https://${API_SUBDOMAIN}/api/webhooks/razorpay"
    echo "🔗 Stripe Webhook URL: https://${API_SUBDOMAIN}/api/webhooks/stripe"
    echo ""
    echo "Required webhook events:"
    echo "📋 Razorpay: payment.captured, payment.failed, subscription.charged"
    echo "📋 Stripe: payment_intent.succeeded, payment_intent.payment_failed"
    echo ""
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."

    local base_url="http://localhost:3001"
    if [ "$DEPLOYMENT_METHOD" != "docker" ]; then
        base_url="https://${API_SUBDOMAIN}"
    fi

    # Test health endpoint
    if curl -f "${base_url}/health" > /dev/null 2>&1; then
        log_success "✅ Health check passed"
    else
        log_error "❌ Health check failed"
    fi

    # Test plans endpoint
    if curl -f "${base_url}/api/payments/plans" > /dev/null 2>&1; then
        log_success "✅ Plans API working"
    else
        log_error "❌ Plans API failed"
    fi
}

# Main deployment function
main() {
    log_info "🚀 Starting NeurallEmpire Backend Deployment"
    log_info "Deployment method: $DEPLOYMENT_METHOD"
    echo ""

    # Update environment
    update_production_env

    case $DEPLOYMENT_METHOD in
        "docker")
            build_docker
            deploy_docker_compose
            setup_nginx
            ;;
        "vps")
            deploy_vps
            ;;
        "railway")
            deploy_railway
            ;;
        "render")
            deploy_render
            ;;
        *)
            log_error "Unknown deployment method: $DEPLOYMENT_METHOD"
            log_info "Available options: docker, vps, railway, render"
            exit 1
            ;;
    esac

    echo ""
    configure_webhooks
    test_deployment

    echo ""
    log_success "🎉 Deployment completed!"
    log_info "Your NeurallEmpire backend is ready to dominate!"
}

# Show help
show_help() {
    echo "NeurallEmpire Backend Deployment Script"
    echo ""
    echo "Usage: $0 [method]"
    echo ""
    echo "Deployment methods:"
    echo "  docker    Deploy with Docker Compose (default)"
    echo "  vps       Create package for VPS deployment"
    echo "  railway   Deploy to Railway"
    echo "  render    Prepare for Render deployment"
    echo ""
}

# Check for help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run deployment
main