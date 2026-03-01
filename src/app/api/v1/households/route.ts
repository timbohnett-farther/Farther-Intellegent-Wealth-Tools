// =============================================================================
// GET  /api/v1/households       - List/search households
// POST /api/v1/households       - Create a new household
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  Household,
  CreateHouseholdRequest,
  CreateHouseholdResponse,
  ErrorEnvelope,
} from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

// ==================== Helpers ====================

/** US state abbreviation validation (2 uppercase letters). */
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

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) {
    return authError('Missing or invalid Authorization header.');
  }
  if (!hasPermission(auth.role, 'households:read')) {
    return forbiddenError('households:read');
  }

  // ---------- Query params ----------
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;
  const firmId = searchParams.get('firmId') ?? auth.firmId;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)));

  // ---------- Fetch ----------
  const all = store.listHouseholds({ firmId, q });
  const total = all.length;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) {
    return authError('Missing or invalid Authorization header.');
  }
  if (!hasPermission(auth.role, 'households:write')) {
    return forbiddenError('households:write');
  }

  // ---------- Parse body ----------
  let body: CreateHouseholdRequest;
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

  if (!body.displayName || typeof body.displayName !== 'string') {
    errors.displayName = 'displayName is required and must be a string.';
  } else if (body.displayName.length < 1 || body.displayName.length > 120) {
    errors.displayName = 'displayName must be between 1 and 120 characters.';
  }

  if (body.primaryState !== undefined) {
    if (typeof body.primaryState !== 'string' || !STATE_RE.test(body.primaryState)) {
      errors.primaryState = 'primaryState must be a 2-letter uppercase US state code.';
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

  // ---------- Create ----------
  const now = new Date().toISOString();
  const household: Household = {
    household_id: crypto.randomUUID(),
    firm_id: auth.firmId,
    display_name: body.displayName,
    primary_state: body.primaryState,
    created_at: now,
    updated_at: now,
  };

  store.upsertHousehold(household);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'household.create',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: { householdId: household.household_id, displayName: household.display_name },
  });

  const response: CreateHouseholdResponse = household;
  return NextResponse.json(response, { status: 201 });
}
