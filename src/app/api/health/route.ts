import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health Check Endpoint
 *
 * Used by Railway to verify deployment health.
 * Returns 200 if app + database are healthy, 503 if database is down.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Test database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1 as health_check`;

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        responseTime: `${responseTime}ms`,
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('[Health Check] Database connectivity failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
