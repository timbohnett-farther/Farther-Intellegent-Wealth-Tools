export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/rollover/analyses/:id/score — Score an analysis
// GET  /api/v1/rollover/analyses/:id/score — Get score breakdown
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { scoreAnalysis, getScore } from '@/lib/rollover-engine/scoring/score-service';

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    { error: { code, message, details, correlationId: crypto.randomUUID() } },
    { status },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authContext = parseAuthContext(request.headers.get('authorization'));
  if (!authContext) return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);

  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const score = scoreAnalysis(id, authContext, ip);
    return NextResponse.json(score, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) return errorResponse('FORBIDDEN', message, 403);
    if (message.includes('not found')) return errorResponse('NOT_FOUND', message, 404);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authContext = parseAuthContext(request.headers.get('authorization'));
  if (!authContext) return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);

  try {
    const { id } = await params;
    const score = getScore(id, authContext);
    if (!score) return errorResponse('NOT_FOUND', 'Score not found for this analysis.', 404);
    return NextResponse.json(score);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) return errorResponse('FORBIDDEN', message, 403);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
