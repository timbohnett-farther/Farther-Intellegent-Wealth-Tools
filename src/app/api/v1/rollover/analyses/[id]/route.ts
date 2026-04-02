export const dynamic = 'force-dynamic';
// =============================================================================
// GET    /api/v1/rollover/analyses/:id — Get analysis detail
// PATCH  /api/v1/rollover/analyses/:id — Update analysis
// DELETE /api/v1/rollover/analyses/:id — Delete analysis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { UpdateAnalysisSchema } from '@/lib/rollover-engine/schemas';
import {
  getAnalysis,
  updateAnalysis,
  deleteAnalysis,
} from '@/lib/rollover-engine/analysis-service';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  try {
    const { id } = await params;
    const analysis = getAnalysis(id, authContext);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', message, 404);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const parsed = UpdateAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', 'Request validation failed.', 400, {
      issues: parsed.error.issues,
    });
  }

  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const analysis = updateAnalysis(id, parsed.data, authContext, ip);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', message, 404);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const authContext = parseAuthContext(authHeader);
  if (!authContext) {
    return errorResponse('UNAUTHORIZED', 'Valid Bearer token required.', 401);
  }

  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    deleteAnalysis(id, authContext, ip);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('Authorization denied')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', message, 404);
    }
    if (message.includes('Cannot delete')) {
      return errorResponse('FORBIDDEN', message, 403);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
