/**
 * POST /api/opportunities/:id/ai-summary
 *
 * Generate AI-powered summary and explanation for an opportunity.
 * Uses Claude API to create plain-language explanations with citations.
 *
 * NOTE: Full implementation in Sprint 4 (AI Enhancement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  GenerateAiSummaryRequestSchema,
  type GenerateAiSummaryResponse,
  type ApiErrorResponse,
} from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = GenerateAiSummaryRequestSchema.parse(body);

    // Fetch opportunity from database
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      const errorResponse: ApiErrorResponse = {
        error: 'Not Found',
        message: `Opportunity with ID ${id} not found`,
        statusCode: 404,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Parse opportunity fields
    const evidence = JSON.parse(opportunity.evidence as string);
    const score = JSON.parse(opportunity.score as string);
    const context = JSON.parse(opportunity.context as string);

    // Build full opportunity object
    const fullOpportunity = {
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
      detectedAt: opportunity.detectedAt,
      reviewedAt: opportunity.reviewedAt ?? undefined,
      implementedAt: opportunity.implementedAt ?? undefined,
      dismissedAt: opportunity.dismissedAt ?? undefined,
      dismissedReason: opportunity.dismissedReason ?? undefined,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    };

    // Generate AI summary
    const { generateAiSummary } = await import('@/lib/opportunity-engine/ai-service');
    const aiResult = await generateAiSummary({
      opportunity: fullOpportunity,
      includeComparisons: validatedRequest.includeComparisons,
      includeCitations: validatedRequest.includeCitations,
    });

    // Log hallucinations if detected
    if (aiResult.hallucinations.length > 0) {
      console.warn('[AI Summary] Hallucinations detected:', aiResult.hallucinations);
    }

    // Build response
    const response: GenerateAiSummaryResponse = {
      opportunityId: id,
      summary: aiResult.summary,
      citations: validatedRequest.includeCitations ? aiResult.citations : undefined,
      generatedAt: aiResult.generatedAt,
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

    console.error(`[API] Error in POST /api/opportunities/${params.id}/ai-summary:`, error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
