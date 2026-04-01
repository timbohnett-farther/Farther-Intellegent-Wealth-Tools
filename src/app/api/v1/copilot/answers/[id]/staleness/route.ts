export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/copilot/answers/:id/staleness — Check answer staleness
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { checkStaleness } from '@/lib/tax-planning/copilot/staleness';

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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // Auth
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  // RBAC
  if (!hasPermission(authContext.role, 'copilot:read')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions.', 403);
  }

  // Check staleness
  const result = checkStaleness(id);
  if (!result) {
    return errorResponse('NOT_FOUND', `Copilot answer "${id}" not found.`, 404);
  }

  return NextResponse.json(result);
}
