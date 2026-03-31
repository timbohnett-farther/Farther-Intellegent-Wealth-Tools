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
    const result = await opportunityDetectionOrchestrator.detectOpportunities(validatedRequest);

    // Return successful response
    const response: DetectOpportunitiesResponse = {
      detectionRun: {
        id: result.detectionRunId,
        calculationRunId: validatedRequest.calculationRunId,
        householdId: result.householdId,
        taxYear: result.taxYear,
        rulesVersion: result.rulesVersion,
        totalRulesEvaluated: result.totalRulesEvaluated,
        totalRulesPassed: result.totalRulesPassed,
        opportunitiesDetected: result.opportunityCount,
        highPriorityCount: result.highPriorityCount,
        totalEstimatedValue: result.totalEstimatedValue,
        computeTimeMs: result.computeTimeMs,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
      },
      opportunities: result.opportunities.map((opp) => ({
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
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Handle other errors
    console.error('[API] Error in /api/opportunities/detect:', error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
