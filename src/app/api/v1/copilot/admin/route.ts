export const dynamic = 'force-dynamic';
// =============================================================================
// GET   /api/v1/copilot/admin — Get copilot configuration
// PATCH /api/v1/copilot/admin — Update copilot configuration
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { getCopilotConfig, updateCopilotConfig } from '@/lib/tax-planning/copilot/admin';
import { CopilotAdminConfigSchema } from '@/lib/tax-planning/copilot/schemas';

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

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  if (!hasPermission(authContext.role, 'copilot:admin')) {
    return errorResponse('FORBIDDEN', 'Admin role required.', 403);
  }

  const config = getCopilotConfig(authContext.firmId);
  return NextResponse.json(config);
}

// ==================== PATCH ====================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  if (!hasPermission(authContext.role, 'copilot:admin')) {
    return errorResponse('FORBIDDEN', 'Admin role required.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const parsed = CopilotAdminConfigSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues },
    );
  }

  const updated = updateCopilotConfig(authContext.firmId, parsed.data);
  return NextResponse.json(updated);
}
