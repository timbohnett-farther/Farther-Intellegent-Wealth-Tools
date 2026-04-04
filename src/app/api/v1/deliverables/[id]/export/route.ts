export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/deliverables/:id/export — Export a deliverable
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { DeliverableExportRequestSchema } from '@/lib/tax-planning/deliverables';
import { exportDeliverable, generateExportPayload } from '@/lib/tax-planning/deliverables';
import { store } from '@/lib/tax-planning/store';

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
  if (!hasPermission(authContext.role, 'deliverables:export')) {
    return errorResponse('FORBIDDEN', 'Insufficient permissions to export.', 403);
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // Validate
  const parsed = DeliverableExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed.',
      400,
      { issues: parsed.error.issues }
    );
  }

  // Export
  try {
    const deliverable = store.getDeliverable(id);
    if (!deliverable) {
      return errorResponse('NOT_FOUND', `Deliverable "${id}" not found.`, 404);
    }

    const deliverableExport = exportDeliverable(
      id,
      parsed.data.exportType,
      authContext.userId,
      parsed.data.options
    );

    // Generate export payload for client
    const payload = generateExportPayload(deliverable, parsed.data.exportType);

    return NextResponse.json({
      export: deliverableExport,
      payload,
    });
  } catch (error) {
    console.error('[Deliverables] Export error:', error);
    return errorResponse('EXPORT_ERROR', 'Export failed. Please try again.', 400);
  }
}
