export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/copilot/ask — Ask the copilot a question or generate a draft
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { CopilotAskRequestSchema } from '@/lib/tax-planning/copilot/schemas';
import { askCopilot } from '@/lib/tax-planning/copilot/service';

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
  // 1. Auth
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // 3. Validate
  const parsed = CopilotAskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues },
    );
  }

  // 4. Call service
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;
    const answer = await askCopilot({
      request: parsed.data,
      authContext,
      ip,
    });

    return NextResponse.json(answer, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', message, 404);
    }
    if (message.includes('not configured')) {
      return errorResponse('SERVICE_UNAVAILABLE', message, 503);
    }

    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
