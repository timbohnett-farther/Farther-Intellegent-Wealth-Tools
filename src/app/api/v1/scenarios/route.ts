export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/scenarios  - Create a baseline or what-if scenario
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  Scenario,
  CreateScenarioRequest,
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

// ==================== POST ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'scenarios:write')) return forbiddenError('scenarios:write');

  // ---------- Parse body ----------
  let body: CreateScenarioRequest;
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

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.returnId || typeof body.returnId !== 'string') {
    errors.returnId = 'returnId is required.';
  } else {
    const taxReturn = store.getTaxReturn(body.returnId);
    if (!taxReturn) {
      errors.returnId = 'TaxReturn not found.';
    } else {
      // Verify the return belongs to a household in the user's firm
      const household = store.getHousehold(taxReturn.household_id);
      if (!household || household.firm_id !== auth.firmId) {
        errors.returnId = 'TaxReturn not found or access denied.';
      }
    }
  }

  if (!body.name || typeof body.name !== 'string') {
    errors.name = 'name is required and must be a string.';
  } else if (body.name.length < 1 || body.name.length > 80) {
    errors.name = 'name must be between 1 and 80 characters.';
  }

  if (typeof body.isBaseline !== 'boolean') {
    errors.isBaseline = 'isBaseline is required and must be a boolean.';
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

  // If creating a baseline, check if one already exists for this return
  if (body.isBaseline) {
    const existing = store.listScenarios(body.returnId);
    const existingBaseline = existing.find((s) => s.is_baseline);
    if (existingBaseline) {
      const err: ErrorEnvelope = {
        error: {
          code: 'CONFLICT',
          message: `A baseline scenario already exists for return "${body.returnId}".`,
          details: { existingScenarioId: existingBaseline.scenario_id },
          correlationId: crypto.randomUUID(),
        },
      };
      return NextResponse.json(err, { status: 400 });
    }
  }

  // ---------- Create ----------
  const now = new Date().toISOString();
  const scenario: Scenario = {
    scenario_id: crypto.randomUUID(),
    return_id: body.returnId,
    name: body.name,
    is_baseline: body.isBaseline,
    created_at: now,
    updated_at: now,
  };

  store.upsertScenario(scenario);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'scenario.create',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      scenarioId: scenario.scenario_id,
      returnId: body.returnId,
      name: body.name,
      isBaseline: body.isBaseline,
    },
  });

  return NextResponse.json(scenario, { status: 201 });
}
