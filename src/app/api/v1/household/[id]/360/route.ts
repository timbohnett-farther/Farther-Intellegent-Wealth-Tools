// =============================================================================
// GET /api/v1/household/:id/360  - Get Household 360 view
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { computeHousehold360 } from '@/lib/household/store';
import { householdId } from '@/lib/household/types';

// ==================== Helpers ====================

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
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const hhId = householdId(id);

  const view = computeHousehold360(hhId);
  if (!view) {
    return errorResponse(
      'NOT_FOUND',
      `Household "${id}" not found.`,
      404,
      { resource: 'Household', id },
    );
  }

  return NextResponse.json(view);
}
