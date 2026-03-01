// =============================================================================
// GET   /api/v1/scenarios/:id  - Get scenario with overrides
// PATCH /api/v1/scenarios/:id  - Update scenario (name, add/remove overrides)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ScenarioOverride,
  MoneyCents,
  TaxLineRef,
  OverrideMode,
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

const VALID_OVERRIDE_MODES: OverrideMode[] = ['ABSOLUTE', 'DELTA'];

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'scenarios:read')) return forbiddenError('scenarios:read');

  // ---------- Fetch ----------
  const scenario = store.getScenario(id);
  if (!scenario) {
    return notFoundError('Scenario', id);
  }

  // Verify the scenario belongs to a return in the user's firm
  const taxReturn = store.getTaxReturn(scenario.return_id);
  if (!taxReturn) return notFoundError('Scenario', id);

  const household = store.getHousehold(taxReturn.household_id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('Scenario', id);
  }

  const overrides = store.listOverrides(id);
  const calcRuns = store.listCalcRuns(id);

  return NextResponse.json({
    ...scenario,
    overrides,
    calcRuns,
  });
}

// ==================== PATCH ====================

interface PatchScenarioBody {
  name?: string;
  addOverrides?: Array<{
    targetTaxLineRef: string;
    mode: string;
    amountCents: number;
  }>;
  removeOverrideIds?: string[];
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'scenarios:write')) return forbiddenError('scenarios:write');

  // ---------- Fetch ----------
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

  // ---------- Parse body ----------
  let body: PatchScenarioBody;
  try {
    body = await request.json();
  } catch {
    const err: ErrorEnvelope = {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        details: {},
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  const errors: Record<string, string> = {};

  // ---------- Update name ----------
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 80) {
      errors.name = 'name must be a string between 1 and 80 characters.';
    } else {
      scenario.name = body.name;
    }
  }

  // ---------- Add overrides ----------
  const addedOverrides: ScenarioOverride[] = [];
  if (body.addOverrides !== undefined) {
    if (!Array.isArray(body.addOverrides)) {
      errors.addOverrides = 'addOverrides must be an array.';
    } else {
      for (let i = 0; i < body.addOverrides.length; i++) {
        const o = body.addOverrides[i];
        if (!o.targetTaxLineRef || typeof o.targetTaxLineRef !== 'string') {
          errors[`addOverrides[${i}].targetTaxLineRef`] = 'targetTaxLineRef is required.';
          continue;
        }
        if (!o.mode || !VALID_OVERRIDE_MODES.includes(o.mode as OverrideMode)) {
          errors[`addOverrides[${i}].mode`] = `mode must be one of: ${VALID_OVERRIDE_MODES.join(', ')}.`;
          continue;
        }
        if (typeof o.amountCents !== 'number') {
          errors[`addOverrides[${i}].amountCents`] = 'amountCents must be a number.';
          continue;
        }

        const override: ScenarioOverride = {
          override_id: crypto.randomUUID(),
          scenario_id: id,
          target_tax_line_ref: o.targetTaxLineRef as TaxLineRef,
          mode: o.mode as OverrideMode,
          amount_cents: o.amountCents as MoneyCents,
        };
        addedOverrides.push(override);
      }
    }
  }

  // ---------- Remove overrides ----------
  const removedOverrideIds: string[] = [];
  if (body.removeOverrideIds !== undefined) {
    if (!Array.isArray(body.removeOverrideIds)) {
      errors.removeOverrideIds = 'removeOverrideIds must be an array of strings.';
    } else {
      for (const oid of body.removeOverrideIds) {
        if (typeof oid !== 'string') {
          errors.removeOverrideIds = 'Each item in removeOverrideIds must be a string.';
          break;
        }
        const existing = store.getOverride(oid);
        if (!existing || existing.scenario_id !== id) {
          errors[`removeOverride_${oid}`] = `Override "${oid}" not found on this scenario.`;
        } else {
          removedOverrideIds.push(oid);
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    const err: ErrorEnvelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields failed validation.',
        details: errors,
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Persist changes ----------
  scenario.updated_at = new Date().toISOString();
  store.upsertScenario(scenario);

  for (const override of addedOverrides) {
    store.upsertOverride(override);
  }

  for (const oid of removedOverrideIds) {
    store.deleteOverride(oid);
  }

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'scenario.update',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      scenarioId: id,
      nameChanged: body.name !== undefined,
      overridesAdded: addedOverrides.length,
      overridesRemoved: removedOverrideIds.length,
    },
  });

  // ---------- Return updated scenario ----------
  const updatedOverrides = store.listOverrides(id);
  return NextResponse.json({
    ...scenario,
    overrides: updatedOverrides,
  });
}
