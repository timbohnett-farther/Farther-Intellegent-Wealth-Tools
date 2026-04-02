export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/rollover/benchmarks — List fee benchmarks
// POST /api/v1/rollover/benchmarks — Upsert a benchmark entry
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { hasPermission } from '@/lib/tax-planning/rbac';
import { BenchmarkUpsertSchema, BenchmarkListQuerySchema } from '@/lib/rollover-engine/schemas';
import { store } from '@/lib/tax-planning/store';
import { seedRolloverData } from '@/lib/rollover-engine/seed';
import type { BenchmarkEntry } from '@/lib/rollover-engine/types';

// Ensure mock data is loaded
seedRolloverData();

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        correlationId: crypto.randomUUID(),
      },
    },
    { status },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  if (!hasPermission(authContext.role, 'rollover:read')) {
    return errorResponse('FORBIDDEN', 'Authorization denied.', 403);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = BenchmarkListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Query validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  const benchmarks = store.listRolloverBenchmarks({
    planSizeTier: parsed.data.plan_size_tier,
    metricName: parsed.data.metric_name,
  });

  return NextResponse.json({ benchmarks, total: benchmarks.length });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  if (!hasPermission(authContext.role, 'rollover:admin')) {
    return errorResponse('FORBIDDEN', 'Authorization denied: rollover:admin required.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const parsed = BenchmarkUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Request validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  const now = new Date().toISOString();
  const benchmark: BenchmarkEntry = {
    benchmark_id: `bench-${crypto.randomUUID().slice(0, 8)}`,
    ...parsed.data,
    created_at: now,
    updated_at: now,
  };

  const saved = store.upsertRolloverBenchmark(benchmark);
  return NextResponse.json(saved, { status: 201 });
}
