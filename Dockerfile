# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build && ls -la /frontend/dist

# Stage 2: Build backend and combine
FROM node:20-slim

# Install OpenSSL and other required dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Copy Prisma schema first (before npm install)
COPY backend/prisma ./prisma

# Install dependencies without running postinstall
RUN npm install --ignore-scripts

# Generate Prisma client
RUN npx prisma generate

# Copy backend application code
COPY backend/ .

# Build TypeScript
RUN npm run build

# Copy frontend build from stage 1
COPY --from=frontend-build /frontend/dist /app/dist/public
RUN ls -la /app/dist/public

# Remove devDependencies
RUN npm prune --production

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs neurall

# Change ownership
RUN chown -R neurall:nodejs /app
USER neurall

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "run", "start:prod"]