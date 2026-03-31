/**
 * GET /api/opportunities/runs/:runId
 *
 * Fetch a detection run by ID with all associated opportunities.
 * Useful for reviewing the complete results of a detection pipeline execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  type GetDetectionRunResponse,
  type ApiErrorResponse,
} from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { runId: string } }) {
  try {
    const { runId } = params;

    // Fetch detection run with opportunities
    const detectionRun = await prisma.opportunityDetectionRun.findUnique({
      where: { id: runId },
      include: {
        opportunities: {
          orderBy: [{ rank: 'asc' }],
        },
      },
    });

    if (!detectionRun) {
      const errorResponse: ApiErrorResponse = {
        error: 'Not Found',
        message: `Detection run with ID ${runId} not found`,
        statusCode: 404,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Build response
    const response: GetDetectionRunResponse = {
      detectionRun: {
        id: detectionRun.id,
        calculationRunId: detectionRun.calculationRunId,
        householdId: detectionRun.householdId,
        taxYear: detectionRun.taxYear,
        rulesVersion: detectionRun.rulesVersion,
        totalRulesEvaluated: detectionRun.totalRulesEvaluated,
        totalRulesPassed: detectionRun.totalRulesPassed,
        opportunitiesDetected: detectionRun.opportunitiesDetected,
        highPriorityCount: detectionRun.highPriorityCount,
        totalEstimatedValue: detectionRun.totalEstimatedValue,
        computeTimeMs: detectionRun.computeTimeMs,
        status: detectionRun.status as any,
        error: detectionRun.error ?? undefined,
        startedAt: detectionRun.startedAt,
        completedAt: detectionRun.completedAt ?? undefined,
        createdAt: detectionRun.createdAt,
      },
      opportunities: detectionRun.opportunities.map((opp) => {
        const evidence = JSON.parse(opp.evidence as string);
        const score = JSON.parse(opp.score as string);
        const context = JSON.parse(opp.context as string);
        const statusHistory = opp.statusHistory ? JSON.parse(opp.statusHistory as string) : [];

        return {
          id: opp.id,
          detectionRunId: opp.detectionRunId,
          householdId: opp.householdId,
          taxYear: opp.taxYear,
          ruleName: opp.ruleName,
          ruleVersion: opp.ruleVersion,
          category: opp.category as any,
          priority: opp.priority as any,
          rank: opp.rank,
          title: opp.title,
          summary: opp.summary,
          estimatedValue: opp.estimatedValue ?? undefined,
          confidence: opp.confidence as any,
          evidence,
          score,
          finalScore: opp.finalScore,
          context,
          isDuplicate: opp.isDuplicate,
          duplicateOfId: opp.duplicateOfId ?? undefined,
          suppressionReason: opp.suppressionReason ?? undefined,
          status: opp.status as any,
          statusHistory,
          detectedAt: opp.detectedAt,
          reviewedAt: opp.reviewedAt ?? undefined,
          implementedAt: opp.implementedAt ?? undefined,
          dismissedAt: opp.dismissedAt ?? undefined,
          dismissedReason: opp.dismissedReason ?? undefined,
          createdAt: opp.createdAt,
          updatedAt: opp.updatedAt,
        };
      }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[API] Error in GET /api/opportunities/runs/${params.runId}:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
