export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/household/stats  - Get household dashboard statistics
// =============================================================================
// Returns aggregate HouseholdDashboardStats for a given firm.
// Query params: firmId (required)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/household/store';

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

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const firmId = searchParams.get('firmId');

  if (!firmId) {
    return errorResponse(
      'VALIDATION_ERROR',
      'firmId query parameter is required.',
      400,
      { requiredParam: 'firmId' },
    );
  }

  const stats = getDashboardStats(firmId);

  return NextResponse.json(stats);
}
