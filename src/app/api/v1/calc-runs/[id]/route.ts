export const dynamic = 'force-dynamic';
// =============================================================================
// GET /api/v1/calc-runs/:id  - Get calc run status and results
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';

// ==================== Helpers ====================

function authError(message: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'UNAUTHORIZED',
      message,
      details: {},
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 401 });
}

function forbiddenError(permission: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'FORBIDDEN',
      message: `You do not have the "${permission}" permission.`,
      details: { requiredPermission: permission },
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 403 });
}

function notFoundError(resource: string, id: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'NOT_FOUND',
      message: `${resource} "${id}" not found.`,
      details: { resource, id },
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 404 });
}

type RouteParams = { params: Promise<{ id: string }> };

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'compute:read')) return forbiddenError('compute:read');

  // ---------- Fetch calc run ----------
  const calcRun = store.getCalcRun(id);
  if (!calcRun) {
    return notFoundError('CalcRun', id);
  }

  // Verify ownership chain: calcRun -> scenario -> return -> household -> firm
  const scenario = store.getScenario(calcRun.scenario_id);
  if (!scenario) return notFoundError('CalcRun', id);

  const taxReturn = store.getTaxReturn(scenario.return_id);
  if (!taxReturn) return notFoundError('CalcRun', id);

  const household = store.getHousehold(taxReturn.household_id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('CalcRun', id);
  }

  // ---------- Fetch calc lines ----------
  const calcLines = store.listCalcLines(id);

  return NextResponse.json({
    ...calcRun,
    lines: calcLines,
    scenario: {
      scenario_id: scenario.scenario_id,
      name: scenario.name,
      is_baseline: scenario.is_baseline,
    },
    taxReturn: {
      return_id: taxReturn.return_id,
      household_id: taxReturn.household_id,
      tax_year: taxReturn.tax_year,
      filing_status: taxReturn.filing_status,
    },
  });
}
