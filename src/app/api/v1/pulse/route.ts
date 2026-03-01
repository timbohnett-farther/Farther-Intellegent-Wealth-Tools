// =============================================================================
// GET  /api/v1/pulse  — FP-Pulse Main Dashboard
//
// Returns the appropriate dashboard data based on the user's role:
//   ?role=MD_PRINCIPAL&firmId=xxx          → MD/Principal dashboard
//   ?role=ADVISOR&firmId=xxx&advisorId=yyy → Advisor dashboard
//   ?role=OPERATIONS&firmId=xxx            → Operations dashboard
//
// @module api/v1/pulse
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  buildMDDashboard,
  buildAdvisorDashboard,
  buildOperationsDashboard,
} from '@/lib/practice-analytics/dashboard-service';
import type { DashboardRole } from '@/lib/practice-analytics/types';
import { firmId, advisorId } from '@/lib/practice-analytics/types';

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

// ==================== GET ====================

/**
 * Returns the FP-Pulse dashboard data appropriate for the caller's role.
 *
 * Required query params:
 * - role: One of MD_PRINCIPAL, ADVISOR, OPERATIONS
 * - firmId: The firm identifier
 *
 * Additional params for ADVISOR role:
 * - advisorId: The advisor identifier (required when role=ADVISOR)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // ---------- Validate role ----------
  const roleParam = searchParams.get('role');
  if (!roleParam) {
    return errorResponse(
      'MISSING_PARAMETER',
      'Query parameter "role" is required. Must be one of: MD_PRINCIPAL, ADVISOR, OPERATIONS.',
      400,
    );
  }

  if (!VALID_ROLES.includes(roleParam as DashboardRole)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Invalid role "${roleParam}". Must be one of: ${VALID_ROLES.join(', ')}.`,
      400,
      { providedRole: roleParam },
    );
  }
  const role = roleParam as DashboardRole;

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

  // ---------- Validate advisorId for ADVISOR role ----------
  const advisorIdParam = searchParams.get('advisorId');
  if (role === 'ADVISOR' && !advisorIdParam) {
    return errorResponse(
      'MISSING_PARAMETER',
      'Query parameter "advisorId" is required when role is ADVISOR.',
      400,
    );
  }

  // ---------- Build dashboard ----------
  try {
    switch (role) {
      case 'MD_PRINCIPAL': {
        const dashboard = buildMDDashboard(fId);
        return NextResponse.json({
          role,
          firmId: firmIdParam,
          dashboard,
          generatedAt: new Date().toISOString(),
        });
      }

      case 'ADVISOR': {
        const aId = advisorId(advisorIdParam!);
        const dashboard = buildAdvisorDashboard(aId, fId);
        return NextResponse.json({
          role,
          firmId: firmIdParam,
          advisorId: advisorIdParam,
          dashboard,
          generatedAt: new Date().toISOString(),
        });
      }

      case 'OPERATIONS': {
        const dashboard = buildOperationsDashboard(fId);
        return NextResponse.json({
          role,
          firmId: firmIdParam,
          dashboard,
          generatedAt: new Date().toISOString(),
        });
      }

      default:
        return errorResponse(
          'INTERNAL_ERROR',
          'Unexpected role value.',
          500,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error building dashboard.';
    return errorResponse(
      'INTERNAL_ERROR',
      message,
      500,
    );
  }
}
