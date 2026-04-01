export const dynamic = 'force-dynamic';
// =============================================================================
// GET   /api/v1/deliverables/:id — Get a single deliverable
// PATCH /api/v1/deliverables/:id — Update deliverable title, blocks, or notes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { auditService } from '@/lib/tax-planning/audit';
import { DeliverableUpdateRequestSchema } from '@/lib/tax-planning/deliverables';
import type { Deliverable } from '@/lib/tax-planning/deliverables';

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {}
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
    { status }
  );
}

type RouteParams = { params: Promise<{ id: string }> };

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // Auth
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  // RBAC
  if (!hasPermission(authContext.role, 'deliverables:read')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions.', 403);
  }

  // Lookup
  const deliverable = store.getDeliverable(id);
  if (!deliverable) {
    return errorResponse('NOT_FOUND', `Deliverable "${id}" not found.`, 404);
  }

  return NextResponse.json(deliverable);
}

// ==================== PATCH ====================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // Auth
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  // RBAC
  if (!hasPermission(authContext.role, 'deliverables:write')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions.', 403);
  }

  // Lookup existing
  const existing = store.getDeliverable(id);
  if (!existing) {
    return errorResponse('NOT_FOUND', `Deliverable "${id}" not found.`, 404);
  }

  // Cannot modify approved/exported/superseded deliverables
  if (['approved', 'exported', 'superseded'].includes(existing.status)) {
    return errorResponse(
      'FORBIDDEN',
      `Cannot modify deliverable in status "${existing.status}".`,
      403
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const parsed = DeliverableUpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Apply update
  const now = new Date().toISOString();
  const updated: Deliverable = {
    ...existing,
    title: parsed.data.title ?? existing.title,
    sectionBlocks: (parsed.data.sectionBlocks ?? existing.sectionBlocks) as Deliverable['sectionBlocks'],
    reviewNote: parsed.data.reviewNote ?? existing.reviewNote,
    version: existing.version + 1,
    updatedAt: now,
  };

  store.upsertDeliverable(updated);

  // Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'deliverable.updated',
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    payload: {
      deliverable_id: id,
      household_id: existing.householdId,
      tax_year: existing.taxYear,
      changes: {
        title: parsed.data.title !== undefined,
        sectionBlocks: parsed.data.sectionBlocks !== undefined,
        reviewNote: parsed.data.reviewNote !== undefined,
      },
    },
  });

  return NextResponse.json(updated);
}
