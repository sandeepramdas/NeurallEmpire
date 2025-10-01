# Multi-stage build for NeurallEmpire
FROM node:20-slim AS builder

# Install OpenSSL and required dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./

# Copy frontend package files and build
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

# Copy backend package files
COPY backend/package*.json ./backend/

# Copy Prisma schema
COPY backend/prisma ./backend/prisma

# Install backend dependencies
RUN cd backend && npm install --ignore-scripts

# Generate Prisma client
RUN cd backend && npx prisma generate

# Copy backend source code
COPY backend/ ./backend/

# Build backend TypeScript
RUN cd backend && npm run build

# Copy frontend build to backend dist/public
RUN mkdir -p /app/backend/dist/public && \
    cp -r /app/frontend/dist/* /app/backend/dist/public/ && \
    ls -la /app/backend/dist/public

# Production stage
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package files
COPY --from=builder /app/backend/package*.json ./

# Copy Prisma schema
COPY --from=builder /app/backend/prisma ./prisma

# Install production dependencies only
RUN npm install --production --ignore-scripts

# Generate Prisma client
RUN npx prisma generate

# Copy built backend and frontend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs neurall && \
    chown -R neurall:nodejs /app

USER neurall

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["node", "dist/server.js"]