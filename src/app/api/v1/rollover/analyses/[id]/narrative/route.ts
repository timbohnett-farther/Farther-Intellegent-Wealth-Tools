export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { generateNarrative, getNarrative } from '@/lib/rollover-engine/narrative/narrative-service';

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message, correlationId: crypto.randomUUID() } }, { status });
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
    const narrative = await generateNarrative(id, authContext, ip);
    return NextResponse.json(narrative, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) return errorResponse('FORBIDDEN', message, 403);
    if (message.includes('not found')) return errorResponse('NOT_FOUND', message, 404);
    if (message.includes('must be scored')) return errorResponse('PRECONDITION_FAILED', message, 412);
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
    const narrative = getNarrative(id, authContext);
    if (!narrative) return errorResponse('NOT_FOUND', 'Narrative not found.', 404);
    return NextResponse.json(narrative);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) return errorResponse('FORBIDDEN', message, 403);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
