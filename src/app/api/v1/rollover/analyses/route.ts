export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/rollover/analyses — Create a new rollover analysis
// GET  /api/v1/rollover/analyses — List rollover analyses
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { CreateAnalysisSchema, AnalysisListQuerySchema } from '@/lib/rollover-engine/schemas';
import { createAnalysis, listAnalyses } from '@/lib/rollover-engine/analysis-service';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const parsed = CreateAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Request validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const analysis = createAnalysis(parsed.data, authContext, ip);
    return NextResponse.json(analysis, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = AnalysisListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Query validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const result = listAnalyses(authContext, {
      householdId: parsed.data.household_id,
      status: parsed.data.status,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
