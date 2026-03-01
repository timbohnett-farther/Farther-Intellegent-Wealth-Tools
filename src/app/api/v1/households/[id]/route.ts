// =============================================================================
// GET    /api/v1/households/:id  - Get household detail with persons, returns, documents
// PATCH  /api/v1/households/:id  - Update household
// DELETE /api/v1/households/:id  - Soft delete household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

// ==================== Helpers ====================

const STATE_RE = /^[A-Z]{2}$/;

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
  if (!hasPermission(auth.role, 'households:read')) return forbiddenError('households:read');

  // ---------- Fetch ----------
  const household = store.getHousehold(id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('Household', id);
  }

  const persons = store.listPersons(id);
  const returns = store.listTaxReturns(id);
  const documents = store.listDocuments(id);

  return NextResponse.json({
    ...household,
    persons,
    returns,
    documents,
  });
}

// ==================== PATCH ====================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'households:write')) return forbiddenError('households:write');

  // ---------- Fetch existing ----------
  const household = store.getHousehold(id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('Household', id);
  }

  // ---------- Parse body ----------
  let body: Record<string, unknown>;
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

  // ---------- Validate and apply ----------
  const errors: Record<string, string> = {};

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || body.displayName.length < 1 || body.displayName.length > 120) {
      errors.displayName = 'displayName must be a string between 1 and 120 characters.';
    } else {
      household.display_name = body.displayName;
    }
  }

  if (body.primaryState !== undefined) {
    if (body.primaryState === null) {
      household.primary_state = undefined;
    } else if (typeof body.primaryState !== 'string' || !STATE_RE.test(body.primaryState)) {
      errors.primaryState = 'primaryState must be a 2-letter uppercase US state code or null.';
    } else {
      household.primary_state = body.primaryState;
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

  household.updated_at = new Date().toISOString();
  store.upsertHousehold(household);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'household.update',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: { householdId: id, changes: body },
  });

  return NextResponse.json(household);
}

// ==================== DELETE ====================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'households:write')) return forbiddenError('households:write');

  // ---------- Fetch existing ----------
  const household = store.getHousehold(id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('Household', id);
  }

  // ---------- Soft delete ----------
  // Stage 1: we do a hard delete from the in-memory store.
  // Stage 2: this will set a `deleted_at` timestamp instead.
  store.deleteHousehold(id);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'household.delete',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: { householdId: id, displayName: household.display_name },
  });

  return NextResponse.json({ deleted: true, householdId: id });
}
