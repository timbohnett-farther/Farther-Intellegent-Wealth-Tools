/**
 * Drizzle Database Client for FMSS
 *
 * Separate from Prisma — FMSS uses Drizzle ORM exclusively
 * Connects to Railway PostgreSQL via DATABASE_URL
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// PostgreSQL connection (Railway provides DATABASE_URL)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for FMSS');
}

// Create postgres client
const client = postgres(connectionString, {
  max: 10,  // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema';
