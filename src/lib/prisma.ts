/**
 * Prisma Client Singleton
 *
 * Ensures single Prisma Client instance in development (hot reload safe)
 * and production environments.
 */

import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    accelerateUrl: process.env.PRISMA_ACCELERATE_URL || undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  } as any);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
