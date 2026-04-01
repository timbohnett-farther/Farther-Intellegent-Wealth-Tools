export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/deliverables/:id/duplicate — Duplicate a deliverable
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { auditService } from '@/lib/tax-planning/audit';
import { DeliverableDuplicateRequestSchema } from '@/lib/tax-planning/deliverables';
import type { Deliverable } from '@/lib/tax-planning/deliverables';
import { randomUUID } from 'crypto';

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

export async function POST(
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

  // Lookup source deliverable
  const source = store.getDeliverable(id);
  if (!source) {
    return errorResponse('NOT_FOUND', `Deliverable "${id}" not found.`, 404);
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Empty body is OK for duplicate
    body = {};
  }

  // Validate
  const parsed = DeliverableDuplicateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Create duplicate
  const now = new Date().toISOString();
  const duplicate: Deliverable = {
    ...source,
    deliverableId: randomUUID(),
    title: parsed.data.title ?? `${source.title} (Copy)`,
    audienceMode: parsed.data.audienceMode ?? source.audienceMode,
    status: 'draft', // Reset to draft
    version: 1, // Reset version
    approvedBy: undefined,
    approvedAt: undefined,
    reviewNote: undefined,
    createdBy: authContext.userId,
    createdAt: now,
    updatedAt: now,
  };

  store.upsertDeliverable(duplicate);

  // Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'deliverable.created',
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    payload: {
      deliverable_id: duplicate.deliverableId,
      household_id: duplicate.householdId,
      tax_year: duplicate.taxYear,
      deliverable_type: duplicate.deliverableType,
      audience_mode: duplicate.audienceMode,
      duplicated_from: id,
    },
  });

  return NextResponse.json(duplicate, { status: 201 });
}
