export const dynamic = 'force-dynamic';
// =============================================================================
// GET    /api/v1/copilot/answers/:id — Get a single copilot answer
// PATCH  /api/v1/copilot/answers/:id — Update review state
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { auditService } from '@/lib/tax-planning/audit';
import { CopilotAnswerUpdateSchema } from '@/lib/tax-planning/copilot/schemas';

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

// ==================== GET ====================

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

  // Lookup
  const answer = store.getCopilotAnswer(id);
  if (!answer) {
    return errorResponse('NOT_FOUND', `Copilot answer "${id}" not found.`, 404);
  }

  return NextResponse.json(answer);
}

// ==================== PATCH ====================

export async function PATCH(
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
  if (!hasPermission(authContext.role, 'copilot:review')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions for review.', 403);
  }

  // Lookup existing
  const existing = store.getCopilotAnswer(id);
  if (!existing) {
    return errorResponse('NOT_FOUND', `Copilot answer "${id}" not found.`, 404);
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const parsed = CopilotAnswerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues },
    );
  }

  // Basic transition validation (full state machine in Sprint 4)
  const newState = parsed.data.review_state;
  const currentState = existing.review_state;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['reviewed', 'discarded'],
    reviewed: ['approved_for_use', 'discarded', 'draft'],
    approved_for_use: ['superseded', 'discarded'],
    discarded: [],
    superseded: [],
  };

  const allowed = VALID_TRANSITIONS[currentState] ?? [];
  if (!allowed.includes(newState)) {
    return errorResponse(
      'INVALID_TRANSITION',
      `Cannot transition from "${currentState}" to "${newState}".`,
      400,
      { currentState, requestedState: newState, allowedTransitions: allowed },
    );
  }

  // Apply update
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    review_state: newState,
    reviewed_by: authContext.userId,
    reviewed_at: now,
    review_notes: parsed.data.review_notes ?? existing.review_notes,
    updated_at: now,
  };

  store.upsertCopilotAnswer(updated);

  // Audit
  const eventKeyMap: Record<string, string> = {
    reviewed: 'copilot.answer.reviewed',
    approved_for_use: 'copilot.answer.approved',
    discarded: 'copilot.answer.discarded',
    superseded: 'copilot.answer.superseded',
  };

  const eventKey = eventKeyMap[newState];
  if (eventKey) {
    auditService.emit({
      firmId: authContext.firmId,
      userId: authContext.userId,
      eventKey: eventKey as Parameters<typeof auditService.emit>[0]['eventKey'],
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      payload: {
        answer_id: id,
        from_state: currentState,
        to_state: newState,
        review_notes: parsed.data.review_notes,
      },
    });
  }

  return NextResponse.json(updated);
}
