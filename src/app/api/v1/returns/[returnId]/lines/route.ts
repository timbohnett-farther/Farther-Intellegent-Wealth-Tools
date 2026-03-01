// =============================================================================
// GET /api/v1/returns/:returnId/lines
// =============================================================================
// Returns the extracted line table for a return. Aggregates all extracted fields
// from documents associated with the return's household + tax year.
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

type RouteParams = { params: Promise<{ returnId: string }> };

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { returnId } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'returns:read')) return forbiddenError('returns:read');

  // ---------- Fetch return ----------
  const taxReturn = store.getTaxReturn(returnId);
  if (!taxReturn) {
    return notFoundError('TaxReturn', returnId);
  }

  // Verify the return belongs to a household in the user's firm
  const household = store.getHousehold(taxReturn.household_id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('TaxReturn', returnId);
  }

  // ---------- Fetch extracted fields ----------
  const fields = store.listExtractedFieldsByReturn(returnId);

  return NextResponse.json({
    returnId,
    householdId: taxReturn.household_id,
    taxYear: taxReturn.tax_year,
    filingStatus: taxReturn.filing_status,
    fields,
    totalFields: fields.length,
  });
}
