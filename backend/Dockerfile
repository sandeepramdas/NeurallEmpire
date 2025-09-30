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

# Copy package files and Prisma schema first
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies without running postinstall (to avoid prisma generate before schema is copied)
RUN npm install --ignore-scripts

# Generate Prisma client now that schema is present
RUN npx prisma generate

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S neurall -u 1001

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