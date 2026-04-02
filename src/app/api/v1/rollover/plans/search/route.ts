export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/rollover/plans/search — Search for 401(k) plans
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { PlanSearchQuerySchema } from '@/lib/rollover-engine/schemas';
import { searchPlans } from '@/lib/rollover-engine/plan-search-service';
import type { PlanType } from '@/lib/rollover-engine/types';

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

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = PlanSearchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Query validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const results = searchPlans(parsed.data.q, authContext, {
      planType: parsed.data.plan_type as PlanType | undefined,
      limit: parsed.data.limit,
    });
    return NextResponse.json({ plans: results, total: results.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
