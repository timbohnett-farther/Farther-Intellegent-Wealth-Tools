/**
 * GET /api/households/:householdId/scenarios
 *
 * List scenarios for a household
 */

import { NextRequest, NextResponse } from 'next/server';
import { listScenarios } from '@/lib/scenario-planning/scenario-service';
import type { ApiErrorResponse } from '@/lib/scenario-planning/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { householdId: string } }
) {
  try {
    const { householdId } = params;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const taxYear = searchParams.get('taxYear');
    const status = searchParams.get('status');

    // Fetch scenarios
    const scenarios = await listScenarios(
      householdId,
      taxYear ? parseInt(taxYear) : undefined,
      status || undefined
    );

    return NextResponse.json(scenarios, { status: 200 });
  } catch (error) {
    console.error(`[API] Error in GET /api/households/${params.householdId}/scenarios:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
