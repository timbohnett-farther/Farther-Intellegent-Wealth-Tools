/**
 * POST /api/scenarios
 *
 * Create a new planning scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createScenario } from '@/lib/scenario-planning/scenario-service';
import { CreateScenarioRequestSchema, type ApiErrorResponse } from '@/lib/scenario-planning/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = CreateScenarioRequestSchema.parse(body);

    // Get user ID from auth (placeholder - would use actual auth)
    const userId = request.headers.get('x-user-id') || 'system';

    // Create scenario
    const scenario = await createScenario(validatedRequest, userId);

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: 'Validation Error',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.issues,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('[API] Error in POST /api/scenarios:', error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
