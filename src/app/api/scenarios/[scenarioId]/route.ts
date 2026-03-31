/**
 * GET /api/scenarios/:scenarioId
 * PATCH /api/scenarios/:scenarioId
 *
 * Get or update a planning scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getScenario, updateScenario } from '@/lib/scenario-planning/scenario-service';
import { UpdateScenarioRequestSchema, type ApiErrorResponse } from '@/lib/scenario-planning/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const { scenarioId } = params;

    // Fetch scenario
    const scenario = await getScenario(scenarioId);

    if (!scenario) {
      const errorResponse: ApiErrorResponse = {
        error: 'Not Found',
        message: `Scenario with ID ${scenarioId} not found`,
        statusCode: 404,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    return NextResponse.json(scenario, { status: 200 });
  } catch (error) {
    console.error(`[API] Error in GET /api/scenarios/${params.scenarioId}:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const { scenarioId } = params;

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = UpdateScenarioRequestSchema.parse(body);

    // Get user ID from auth (placeholder)
    const userId = request.headers.get('x-user-id') || 'system';

    // Update scenario
    const scenario = await updateScenario(scenarioId, validatedRequest, userId);

    return NextResponse.json(scenario, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: 'Validation Error',
        message: 'Invalid request data',
        statusCode: 400,
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error(`[API] Error in PATCH /api/scenarios/${params.scenarioId}:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
