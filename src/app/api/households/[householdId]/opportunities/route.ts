/**
 * GET /api/households/:householdId/opportunities
 *
 * List all opportunities for a household with filtering, sorting, and pagination.
 * Supports filtering by tax year, category, status, and minimum score.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  ListOpportunitiesQuerySchema,
  type ListHouseholdOpportunitiesResponse,
  type ApiErrorResponse,
} from '@/lib/opportunity-engine/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { householdId: string } }
) {
  try {
    const { householdId } = params;

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = ListOpportunitiesQuerySchema.parse(searchParams);

    // Build Prisma where clause
    const where: any = {
      householdId,
    };

    if (query.taxYear) {
      where.taxYear = query.taxYear;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.minScore !== undefined) {
      where.finalScore = {
        gte: query.minScore,
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortDirection;
    } else {
      // Default sort: finalScore desc
      orderBy.finalScore = 'desc';
    }

    // Fetch total count
    const db = prisma as any;
    const total = await db.opportunity.count({ where });

    // Fetch opportunities with pagination
    const opportunities = await db.opportunity.findMany({
      where,
      orderBy,
      skip: query.offset,
      take: query.limit,
    });

    // Build response
    const response: ListHouseholdOpportunitiesResponse = {
      opportunities: opportunities.map((opp: any) => {
        const evidence = JSON.parse(opp.evidenceJson ?? opp.evidence ?? '[]');
        const score = JSON.parse(opp.scoreJson ?? opp.score ?? '{}');
        const context = JSON.parse(opp.contextJson ?? opp.context ?? '{}');
        const statusHistory = opp.statusHistoryJson ? JSON.parse(opp.statusHistoryJson) : (opp.statusHistory ? JSON.parse(opp.statusHistory) : []);

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
      total,
      hasMore: query.offset + query.limit < total,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorResponse: ApiErrorResponse = {
        error: 'Validation Error',
        message: 'Invalid query parameters',
        statusCode: 400,
        details: error.issues,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error(
      `[API] Error in GET /api/households/${params.householdId}/opportunities:`,
      error
    );

    const errorResponse: ApiErrorResponse = {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: 500,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
