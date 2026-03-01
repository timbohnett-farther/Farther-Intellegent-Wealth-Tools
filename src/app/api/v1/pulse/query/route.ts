// =============================================================================
// POST /api/v1/pulse/query — Natural Language Query Endpoint
//
// Accepts a natural language question about practice metrics and returns
// structured results with data, visualization hints, and confidence scores.
//
// Request body:
//   { question: "What is my total AUM?",
//     firmId: "firm-001",
//     advisorId?: "adv-001",
//     role: "ADVISOR" }
//
// @module api/v1/pulse/query
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  runNaturalLanguageQuery,
} from '@/lib/practice-analytics/query-engine';
import { firmId, advisorId } from '@/lib/practice-analytics/types';
import type { DashboardRole, QueryContext } from '@/lib/practice-analytics/types';

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

const VALID_ROLES: DashboardRole[] = ['MD_PRINCIPAL', 'ADVISOR', 'OPERATIONS'];

// ==================== POST ====================

/**
 * Processes a natural language query about practice analytics.
 *
 * Required body fields:
 * - question: The natural language question string
 * - firmId: The firm identifier
 * - role: One of MD_PRINCIPAL, ADVISOR, OPERATIONS
 *
 * Optional body fields:
 * - advisorId: The advisor identifier (recommended for ADVISOR role)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Parse body ----------
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate question ----------
  const question = body.question as string | undefined;
  if (!question || typeof question !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'Field "question" is required and must be a non-empty string.',
      400,
    );
  }

  if (question.trim().length < 3) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Field "question" must be at least 3 characters long.',
      400,
      { providedLength: question.trim().length },
    );
  }

  if (question.length > 500) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Field "question" must not exceed 500 characters.',
      400,
      { providedLength: question.length },
    );
  }

  // ---------- Validate firmId ----------
  const firmIdParam = body.firmId as string | undefined;
  if (!firmIdParam || typeof firmIdParam !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'Field "firmId" is required and must be a string.',
      400,
    );
  }
  const fId = firmId(firmIdParam);

  // ---------- Validate role ----------
  const roleParam = body.role as string | undefined;
  if (!roleParam || !VALID_ROLES.includes(roleParam as DashboardRole)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Field "role" is required and must be one of: ${VALID_ROLES.join(', ')}.`,
      400,
    );
  }
  const role = roleParam as DashboardRole;

  // ---------- Optional advisorId ----------
  const advisorIdParam = body.advisorId as string | undefined;
  const aId = advisorIdParam ? advisorId(advisorIdParam) : undefined;

  // ---------- Run query ----------
  try {
    const queryContext: QueryContext = {
      firmId: fId,
      advisorId: aId ?? null,
      role,
      timezone: 'America/New_York',
    };
    const result = await runNaturalLanguageQuery(question, queryContext);

    return NextResponse.json({
      success: true,
      query: question,
      result,
      context: {
        firmId: firmIdParam,
        advisorId: advisorIdParam ?? null,
        role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing query.';
    return errorResponse('QUERY_ERROR', message, 500);
  }
}
