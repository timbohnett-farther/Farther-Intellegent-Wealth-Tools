export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/copilot/answers — List copilot answers with filters
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { hasPermission } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { CopilotListQuerySchema } from '@/lib/tax-planning/copilot/schemas';

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
  // 1. Auth
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  // 2. RBAC
  if (!hasPermission(authContext.role, 'copilot:read')) {
    return errorResponse(
      'FORBIDDEN',
      `Role "${authContext.role}" does not have permission "copilot:read".`,
      403,
    );
  }

  // 3. Parse query params
  const url = new URL(request.url);
  const rawQuery: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    rawQuery[key] = value;
  }

  const parsed = CopilotListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Query parameter validation failed.',
      400,
      { issues: parsed.error.issues },
    );
  }

  // 4. Query store
  const filters = parsed.data;
  const { answers, total } = store.listCopilotAnswers({
    householdId: filters.household_id,
    promptFamily: filters.prompt_family,
    reviewState: filters.review_state,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });

  return NextResponse.json({
    data: answers,
    total,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });
}
