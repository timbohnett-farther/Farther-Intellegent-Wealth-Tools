// =============================================================================
// GET /api/v1/pulse/scorecards — Advisor Scorecards
//
// Returns advisor performance scorecards for a firm.
//   ?firmId=xxx                        → All advisor scorecards for the firm
//   &sortBy=AUM|REVENUE|CLIENTS|GROWTH|RETENTION|COMPOSITE
//   &advisorId=yyy                     → Single advisor scorecard
//
// @module api/v1/pulse/scorecards
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  computeAdvisorScorecards,
  rankAdvisors,
} from '@/lib/practice-analytics/analytics-service';
import { firmId } from '@/lib/practice-analytics/types';
import type { AdvisorScorecardSort, AdvisorScorecard } from '@/lib/practice-analytics/types';

// ==================== Helpers ====================

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        correlationId: crypto.randomUUID(),
      },
    },
    { status },
  );
}

const VALID_SORT_OPTIONS: AdvisorScorecardSort[] = [
  'AUM',
  'REVENUE',
  'CLIENT_COUNT',
  'AUM_GROWTH',
  'PLAN_HEALTH',
  'ENGAGEMENT_SCORE',
];

// ==================== GET ====================

/**
 * Returns advisor scorecards for the specified firm.
 *
 * When advisorId is provided, returns only that advisor's scorecard.
 * Otherwise returns all advisors, optionally sorted by the given criterion.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // ---------- Validate firmId ----------
  const firmIdParam = searchParams.get('firmId');
  if (!firmIdParam) {
    return errorResponse(
      'MISSING_PARAMETER',
      'Query parameter "firmId" is required.',
      400,
    );
  }
  const fId = firmId(firmIdParam);

  // ---------- Optional filters ----------
  const advisorIdParam = searchParams.get('advisorId') ?? undefined;
  const sortByParam = searchParams.get('sortBy') ?? 'AUM';

  // Validate sortBy
  if (!VALID_SORT_OPTIONS.includes(sortByParam as AdvisorScorecardSort)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Invalid sortBy "${sortByParam}". Must be one of: ${VALID_SORT_OPTIONS.join(', ')}.`,
      400,
    );
  }
  const sortBy = sortByParam as AdvisorScorecardSort;

  try {
    const allScorecards = computeAdvisorScorecards(fId);

    // If specific advisor requested, filter to that one
    if (advisorIdParam) {
      const scorecard = allScorecards.find(
        (sc: AdvisorScorecard) => sc.advisorId === advisorIdParam,
      );
      if (!scorecard) {
        return errorResponse(
          'NOT_FOUND',
          `Advisor "${advisorIdParam}" not found in firm "${firmIdParam}".`,
          404,
        );
      }
      return NextResponse.json({
        scorecard,
        firmId: firmIdParam,
      });
    }

    // Return all, sorted
    const sorted = rankAdvisors(allScorecards, sortBy);

    return NextResponse.json({
      scorecards: sorted,
      total: sorted.length,
      sortBy,
      firmId: firmIdParam,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error computing scorecards.';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
