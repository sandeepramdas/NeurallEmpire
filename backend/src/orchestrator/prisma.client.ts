/**
 * ==================== ORCHESTRATOR PRISMA CLIENT ====================
 *
 * Shared Prisma client instance for orchestrator services
 * Uses lazy initialization via Proxy to avoid blocking server startup
 *
 * @module orchestrator/prisma-client
 */

import { PrismaClient } from '@prisma/client';

// Lazy-loaded Prisma client - NOT initialized at module load time
let prismaInstance: PrismaClient | null = null;

/**
 * Get or create the shared Prisma client instance
 * This is lazy-loaded only when first accessed
 */
function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

// Export as Proxy for lazy loading
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const instance = getPrisma();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export default prisma;
