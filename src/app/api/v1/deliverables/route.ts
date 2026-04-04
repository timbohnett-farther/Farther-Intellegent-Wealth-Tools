export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/deliverables — Create a new deliverable
// GET  /api/v1/deliverables — List deliverables with filters
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { auditService } from '@/lib/tax-planning/audit';
import {
  DeliverableCreateRequestSchema,
  DeliverableListQuerySchema,
} from '@/lib/tax-planning/deliverables';
import { assembleDeliverable } from '@/lib/tax-planning/deliverables';
import { validateDeliverable } from '@/lib/tax-planning/deliverables';

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

// ==================== POST ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const parsed = DeliverableCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Assemble deliverable
  try {
    const deliverable = assembleDeliverable(parsed.data, authContext.userId);

    // Validate assembled deliverable
    const validation = validateDeliverable(deliverable);
    if (validation.status === 'hard_fail_block_creation') {
      return errorResponse(
        'ASSEMBLY_ERROR',
        'Deliverable assembly failed validation.',
        400,
        { validation }
      );
    }

    // Store
    store.upsertDeliverable(deliverable);

    // Audit
    auditService.emit({
      firmId: authContext.firmId,
      userId: authContext.userId,
      eventKey: 'deliverable.created',
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      payload: {
        deliverable_id: deliverable.deliverableId,
        household_id: deliverable.householdId,
        tax_year: deliverable.taxYear,
        deliverable_type: deliverable.deliverableType,
        audience_mode: deliverable.audienceMode,
      },
    });

    return NextResponse.json(
      { data: deliverable, validation },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Deliverables] Assembly error:', error);
    return errorResponse('ASSEMBLY_ERROR', 'Assembly failed. Please try again.', 500);
  }
}

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  // Parse query params
  const url = new URL(request.url);
  const rawQuery: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    rawQuery[key] = value;
  }

  const parsed = DeliverableListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Query parameter validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Query store
  const filters = parsed.data;
  const { deliverables, total } = store.listDeliverables({
    householdId: filters.householdId,
    taxYear: filters.taxYear,
    deliverableType: filters.deliverableType,
    status: filters.status,
    audienceMode: filters.audienceMode,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });

  return NextResponse.json({
    data: deliverables,
    total,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  });
}
