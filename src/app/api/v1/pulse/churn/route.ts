// =============================================================================
// GET /api/v1/pulse/churn — Churn Signals & Risk Analysis
//
// Returns churn prediction signals for a firm's clients with optional
// filtering by advisor and risk level. Includes summary statistics.
//
//   ?firmId=xxx                     (required)
//   &advisorId=yyy                  (optional — filter by advisor)
//   &riskLevel=critical|high|moderate|low  (optional — filter by risk)
//   &limit=25                       (optional — max results, default 25)
//   &offset=0                       (optional — pagination offset)
//
// @module api/v1/pulse/churn
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  generateChurnSignals,
  getChurnSummary,
} from '@/lib/practice-analytics/churn-prediction';
import { firmId, advisorId } from '@/lib/practice-analytics/types';
import type { ChurnRiskLabel, ChurnSignal } from '@/lib/practice-analytics/types';

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

const VALID_RISK_LEVELS: ChurnRiskLabel[] = ['critical', 'elevated', 'watch', 'healthy'];

// ==================== GET ====================

/**
 * Returns churn prediction signals with filtering and summary statistics.
 *
 * Results are sorted by churn probability (highest risk first).
 * Includes total AUM and revenue at risk in the summary.
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
  const riskLevelParam = searchParams.get('riskLevel') ?? undefined;
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)),
  );
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

  // Validate riskLevel
  if (riskLevelParam && !VALID_RISK_LEVELS.includes(riskLevelParam as ChurnRiskLabel)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Invalid riskLevel "${riskLevelParam}". Must be one of: ${VALID_RISK_LEVELS.join(', ')}.`,
      400,
    );
  }

  try {
    const aId = advisorIdParam ? advisorId(advisorIdParam) : undefined;

    // Generate all signals for the firm
    let signals = generateChurnSignals(fId);

    // Filter by advisor if specified
    if (aId) {
      signals = signals.filter((s: ChurnSignal) => s.advisorId === aId);
    }

    // Filter by risk level if specified
    if (riskLevelParam) {
      signals = signals.filter((s: ChurnSignal) => s.churnRiskLabel === riskLevelParam);
    }

    // Sort by churn risk score descending (highest risk first)
    signals.sort((a: ChurnSignal, b: ChurnSignal) => b.churnRiskScore - a.churnRiskScore);

    // Compute summary before pagination
    const summary = getChurnSummary(signals);

    // Apply pagination
    const total = signals.length;
    const paginatedSignals = signals.slice(offset, offset + limit);

    return NextResponse.json({
      signals: paginatedSignals,
      total,
      limit,
      offset,
      summary,
      filters: {
        firmId: firmIdParam,
        advisorId: advisorIdParam ?? null,
        riskLevel: riskLevelParam ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error generating churn signals.';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
