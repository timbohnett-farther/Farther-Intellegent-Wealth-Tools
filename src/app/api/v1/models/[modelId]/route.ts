// =============================================================================
// GET /api/v1/models/[modelId]  - Get a single investment model by ID
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/proposal-engine/types';
import { getModelById } from '@/lib/proposal-engine/model-library';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';

// ==================== Helpers ====================

function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}): NextResponse {
  const err: ErrorEnvelope = {
    error: { code, message, details, correlationId: crypto.randomUUID() },
  };
  return NextResponse.json(err, { status });
}

type RouteParams = { params: Promise<{ modelId: string }> };

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { modelId } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view investment models.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const model = getModelById(modelId);
  if (!model) {
    return errorResponse('NOT_FOUND', `Investment model "${modelId}" not found.`, 404, { resource: 'InvestmentModel', id: modelId });
  }

  return NextResponse.json(model);
}
