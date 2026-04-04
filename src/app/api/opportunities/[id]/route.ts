/**
 * GET /api/opportunities/:id
 *
 * Fetch a single opportunity by ID with complete details including
 * evidence, scoring breakdown, and status history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type GetOpportunityResponse, type ApiErrorResponse } from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Fetch opportunity from database
    const opportunity = await (prisma as any).opportunity.findUnique({
      where: { id },
      include: {
        detectionRun: true,
      },
    });

    if (!opportunity) {
      const errorResponse: ApiErrorResponse = {
        error: 'Not Found',
        message: `Opportunity with ID ${id} not found`,
        statusCode: 404,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Parse JSON fields
    const evidence = JSON.parse(opportunity.evidenceJson as string);
    const score = JSON.parse(opportunity.scoreJson as string);
    const context = JSON.parse(opportunity.contextJson as string);
    const statusHistory: any[] = []; // TODO: Derive from audit events or remove

    // Build response
    const response: GetOpportunityResponse = {
      opportunity: {
        id: opportunity.id,
        detectionRunId: opportunity.detectionRunId,
        householdId: opportunity.householdId,
        taxYear: opportunity.taxYear,
        ruleName: opportunity.ruleName,
        ruleVersion: opportunity.ruleVersion,
        category: opportunity.category as any,
        priority: opportunity.priority as any,
        rank: opportunity.rank,
        title: opportunity.title,
        summary: opportunity.summary,
        estimatedValue: opportunity.estimatedValue ?? undefined,
        confidence: opportunity.confidence as any,
        evidence,
        score,
        finalScore: opportunity.finalScore,
        context,
        isDuplicate: opportunity.isDuplicate,
        duplicateOfId: opportunity.duplicateOfId ?? undefined,
        suppressionReason: opportunity.suppressionReason ?? undefined,
        status: opportunity.status as any,
        statusHistory,
        detectedAt: opportunity.detectedAt,
        reviewedAt: opportunity.reviewedAt ?? undefined,
        implementedAt: opportunity.implementedAt ?? undefined,
        dismissedAt: opportunity.dismissedAt ?? undefined,
        dismissedReason: opportunity.dismissedReason ?? undefined,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`[API] Error in GET /api/opportunities/${params.id}:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
