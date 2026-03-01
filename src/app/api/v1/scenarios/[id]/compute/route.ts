// =============================================================================
// POST /api/v1/scenarios/:id/compute
// =============================================================================
// Run tax computation for a scenario.
// Stage 1: Returns stub deterministic values based on extracted fields and
// overrides. The stub engine computes:
//   - federal.taxable_income_cents = AGI - standard deduction ($30,000 for MFJ)
//   - federal.total_tax_cents = ~15% of taxable income
//   - emr.next_1000_ordinary_bps = 2200 (22% marginal rate stub)
//   - emr.next_1000_ltcg_bps = 1500 (15% LTCG rate stub)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  CalcRun,
  CalcLine,
  ComputeResult,
  MoneyCents,
  TaxLineRef,
  ErrorEnvelope,
} from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

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

// ==================== Stub Tax Engine ====================

/** Standard deduction for MFJ (2025 stub). */
const STANDARD_DEDUCTIONS: Record<string, number> = {
  MFJ: 3000000,   // $30,000
  SINGLE: 1550000, // $15,500
  MFS: 1550000,    // $15,500
  HOH: 2290000,    // $22,900
  QW: 3000000,     // $30,000
};

/** Stub effective tax rate in basis points. */
const STUB_EFFECTIVE_RATE_BPS = 1500; // 15%

/**
 * Stage 1 stub tax computation engine.
 * Computes deterministic values from extracted fields + overrides.
 */
function computeStub(
  scenarioId: string,
  returnId: string,
  firmId: string
): { calcRun: CalcRun; calcLines: CalcLine[]; result: ComputeResult } {
  const taxReturn = store.getTaxReturn(returnId)!;
  const fields = store.listExtractedFieldsByReturn(returnId);
  const overrides = store.listOverrides(scenarioId);

  // Build a map of tax_line_ref -> value_cents from extracted fields
  const lineValues = new Map<string, number>();
  for (const f of fields) {
    if (f.value_cents !== undefined) {
      lineValues.set(f.tax_line_ref, f.value_cents);
    }
  }

  // Apply overrides
  for (const o of overrides) {
    const base = lineValues.get(o.target_tax_line_ref) ?? 0;
    if (o.mode === 'ABSOLUTE') {
      lineValues.set(o.target_tax_line_ref, o.amount_cents);
    } else {
      // DELTA
      lineValues.set(o.target_tax_line_ref, base + o.amount_cents);
    }
  }

  // Compute derived values
  const agi = lineValues.get('f1040:l11:agi') ?? (taxReturn.agi_cents ?? 0);
  const stdDeduction = STANDARD_DEDUCTIONS[taxReturn.filing_status] ?? STANDARD_DEDUCTIONS.SINGLE;
  const taxableIncome = Math.max(0, agi - stdDeduction);
  const totalTax = Math.round(taxableIncome * STUB_EFFECTIVE_RATE_BPS / 10000);

  // Build metrics
  const metrics: Record<string, MoneyCents> = {
    'federal.agi_cents': agi as MoneyCents,
    'federal.standard_deduction_cents': stdDeduction as MoneyCents,
    'federal.taxable_income_cents': taxableIncome as MoneyCents,
    'federal.total_tax_cents': totalTax as MoneyCents,
    'emr.next_1000_ordinary_bps': 2200 as MoneyCents,
    'emr.next_1000_ltcg_bps': 1500 as MoneyCents,
  };

  // Build calc lines
  const calcRunId = crypto.randomUUID();
  const calcLines: CalcLine[] = [
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'federal.agi',
      value_cents: agi as MoneyCents,
      source: 'extracted',
    },
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'federal.standard_deduction',
      value_cents: stdDeduction as MoneyCents,
      source: 'computed',
    },
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'federal.taxable_income',
      value_cents: taxableIncome as MoneyCents,
      source: 'computed',
    },
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'federal.total_tax',
      value_cents: totalTax as MoneyCents,
      source: 'computed',
    },
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'emr.next_1000_ordinary',
      value_cents: 2200 as MoneyCents,
      source: 'computed',
    },
    {
      calc_line_id: crypto.randomUUID(),
      calc_run_id: calcRunId,
      metric_id: 'emr.next_1000_ltcg',
      value_cents: 1500 as MoneyCents,
      source: 'computed',
    },
  ];

  const calcRun: CalcRun = {
    calc_run_id: calcRunId,
    scenario_id: scenarioId,
    engine_version: '0.1.0-stub',
    policy_version: 'stub-2025-v1',
    status: 'OK',
    computed_at: new Date().toISOString(),
    metrics,
  };

  const result: ComputeResult = {
    calcRunId,
    status: 'OK',
    metrics,
    lines: calcLines.map((cl) => ({
      taxLineRef: cl.metric_id as TaxLineRef,
      valueCents: cl.value_cents,
      source: cl.source,
    })),
  };

  return { calcRun, calcLines, result };
}

// ==================== POST ====================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'compute:run')) return forbiddenError('compute:run');

  // ---------- Fetch scenario ----------
  const scenario = store.getScenario(id);
  if (!scenario) {
    return notFoundError('Scenario', id);
  }

  // Verify ownership chain
  const taxReturn = store.getTaxReturn(scenario.return_id);
  if (!taxReturn) return notFoundError('Scenario', id);
  const household = store.getHousehold(taxReturn.household_id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('Scenario', id);
  }

  // ---------- Compute ----------
  const { calcRun, calcLines, result } = computeStub(id, scenario.return_id, auth.firmId);

  // Persist calc run and lines
  store.upsertCalcRun(calcRun);
  for (const line of calcLines) {
    store.upsertCalcLine(line);
  }

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'calc.run',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      scenarioId: id,
      calcRunId: calcRun.calc_run_id,
      returnId: scenario.return_id,
      status: calcRun.status,
      engineVersion: calcRun.engine_version,
    },
  });

  return NextResponse.json(result, { status: 200 });
}
