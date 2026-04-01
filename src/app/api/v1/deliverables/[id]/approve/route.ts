export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/deliverables/:id/approve — Approve a deliverable
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { DeliverableApproveRequestSchema } from '@/lib/tax-planning/deliverables';
import { approveDeliverable } from '@/lib/tax-planning/deliverables';

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
  if (!hasPermission(authContext.role, 'deliverables:approve')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions to approve.', 403);
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const parsed = DeliverableApproveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Approve
  try {
    const approved = approveDeliverable(
      id,
      authContext.userId,
      parsed.data.approvalNotes
    );
    return NextResponse.json(approved);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval failed';
    return errorResponse('APPROVAL_ERROR', message, 400);
  }
}
