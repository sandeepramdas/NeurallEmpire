# Use Node.js 20 LTS (Debian-based for better OpenSSL compatibility)
FROM node:20-slim

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Build frontend first
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Switch to backend
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Copy Prisma schema first (before npm install)
COPY backend/prisma ./prisma

# Install dependencies without running postinstall (to avoid prisma generate before schema is copied)
RUN npm install --ignore-scripts

# Generate Prisma client now that schema is present
RUN npx prisma generate

# Copy backend application code
COPY backend/ .

# Build TypeScript
RUN npm run build

# Copy frontend build to backend public directory
RUN mkdir -p dist/public
COPY --from=0 /frontend/dist ./dist/public

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs neurall

# Change ownership of the app directory
RUN chown -R neurall:nodejs /app
USER neurall

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "run", "start:prod"]