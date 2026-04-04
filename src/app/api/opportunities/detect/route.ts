/**
 * POST /api/opportunities/detect
 *
 * Detect tax planning opportunities for a household based on a calculation run.
 * This endpoint triggers the opportunity detection pipeline and returns
 * all detected opportunities ranked by priority and score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { opportunityDetectionOrchestrator } from '@/lib/opportunity-engine';
import {
  DetectOpportunitiesRequestSchema,
  type DetectOpportunitiesResponse,
  type ApiErrorResponse,
} from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = DetectOpportunitiesRequestSchema.parse(body);

    // Run opportunity detection
    const result = await opportunityDetectionOrchestrator.detectOpportunities(validatedRequest as any);

    // Return successful response
    const response: DetectOpportunitiesResponse = {
      detectionRun: {
        id: result.detectionRunId,
        calculationRunId: validatedRequest.calculationRunId,
        householdId: (result as any).householdId,
        taxYear: (result as any).taxYear,
        rulesVersion: (result as any).rulesVersion,
        totalRulesEvaluated: (result as any).totalRulesEvaluated,
        totalRulesPassed: (result as any).totalRulesPassed,
        opportunitiesDetected: result.opportunitiesDetected,
        highPriorityCount: result.highPriorityCount,
        estimatedValueTotal: result.estimatedValueTotal,
        computeTimeMs: result.computeTimeMs,
        status: 'completed',
        completedAt: new Date(),
        createdAt: new Date(),
      },
      opportunities: result.opportunities.map((opp: any) => ({
        ...opp,
        statusHistory: [],
      })),
    };

    return NextResponse.json(response, { status: 200 });
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

    // Handle other errors
    console.error('[API] Error in /api/opportunities/detect:', error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
