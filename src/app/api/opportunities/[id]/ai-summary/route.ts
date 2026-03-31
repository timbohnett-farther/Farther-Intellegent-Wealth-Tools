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

    // TODO (Sprint 4): Integrate Claude API for summary generation
    // - Load tax knowledge base (IRS publications)
    // - Build prompt with opportunity details, evidence, and context
    // - Call Claude API with structured output
    // - Validate citations against knowledge base
    // - Extract citations and summary
    // - Store in database

    // Placeholder response for Sprint 3
    const placeholderSummary = `
**Tax Planning Opportunity: ${opportunity.title}**

This opportunity was detected based on your ${opportunity.taxYear} tax return analysis.

**Key Findings:**
- Category: ${opportunity.category}
- Priority: ${opportunity.priority}
- Estimated Value: $${(opportunity.estimatedValue ?? 0).toLocaleString()}
- Confidence: ${opportunity.confidence}

**Next Steps:**
1. Review the evidence and scoring details
2. Consult with your tax professional
3. Consider implementing this strategy before year-end

**Important:** This is a preliminary analysis. Consult a qualified tax professional before making any tax-related decisions.

---
*AI-generated summary (placeholder for Sprint 4)*
    `.trim();

    const placeholderCitations = [
      {
        source: 'IRS Publication 590-B',
        section: 'Distributions from IRAs',
        url: 'https://www.irs.gov/publications/p590b',
      },
      {
        source: 'IRS Publication 554',
        section: 'Tax Guide for Seniors',
        url: 'https://www.irs.gov/publications/p554',
      },
    ];

    // Build response
    const response: GenerateAiSummaryResponse = {
      opportunityId: id,
      summary: placeholderSummary,
      citations: validatedRequest.includeCitations ? placeholderCitations : undefined,
      generatedAt: new Date(),
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
