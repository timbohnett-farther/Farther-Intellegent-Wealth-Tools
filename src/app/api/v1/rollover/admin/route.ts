export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { getEngineStats } from '@/lib/rollover-engine/admin-service';

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message, correlationId: crypto.randomUUID() } }, { status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authContext = parseAuthContext(request.headers.get('authorization'));
  if (!authContext) return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);

  try {
    const stats = getEngineStats(authContext);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) return errorResponse('FORBIDDEN', message, 403);
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
