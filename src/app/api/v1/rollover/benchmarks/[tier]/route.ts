export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/rollover/benchmarks/:tier — Get benchmarks by plan size tier
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { getBenchmarksByTier } from '@/lib/rollover-engine/benchmarks/benchmark-db';
import type { PlanSizeTier } from '@/lib/rollover-engine/types';

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, correlationId: crypto.randomUUID() } },
    { status },
  );
}

const VALID_TIERS = ['MICRO', 'SMALL', 'MID', 'LARGE', 'MEGA'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> },
): Promise<NextResponse> {
  const authContext = parseAuthContext(request.headers.get('authorization'));
  if (!authContext) return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  if (!hasPermission(authContext.role, 'rollover:read')) {
    return errorResponse('FORBIDDEN', 'Authorization denied.', 403);
  }

  const { tier } = await params;
  const upperTier = tier.toUpperCase();

  if (!VALID_TIERS.includes(upperTier)) {
    return errorResponse('VALIDATION_ERROR', `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`, 400);
  }

  const benchmarks = getBenchmarksByTier(upperTier as PlanSizeTier);
  return NextResponse.json({ tier: upperTier, benchmarks, total: benchmarks.length });
}
