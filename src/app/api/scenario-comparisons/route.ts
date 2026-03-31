/**
 * POST /api/scenario-comparisons
 *
 * Compare baseline and scenario(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { compareScenarios } from '@/lib/scenario-planning/comparison-service';
import { CompareScenariosRequestSchema, type ApiErrorResponse } from '@/lib/scenario-planning/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = CompareScenariosRequestSchema.parse(body);
    const userId = request.headers.get('x-user-id') || 'system';

    const comparison = await compareScenarios(validatedRequest, userId);

    return NextResponse.json(comparison, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: 'Validation Error',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('[API] Error in POST /api/scenario-comparisons:', error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
