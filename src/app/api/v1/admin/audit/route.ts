// =============================================================================
// GET /api/v1/admin/audit  - Query audit events with filters
// =============================================================================
// Requires the admin:audit permission. Supports filtering by:
//   - eventKey: specific audit event key
//   - userId: filter by acting user
//   - from: ISO 8601 start timestamp
//   - to: ISO 8601 end timestamp
//   - limit: page size (default 100, max 500)
//   - offset: pagination offset
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/tax-planning/types';
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

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'admin:audit')) return forbiddenError('admin:audit');

  // ---------- Query params ----------
  const { searchParams } = new URL(request.url);
  const eventKey = searchParams.get('eventKey') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

  // ---------- Validate date formats ----------
  if (from !== undefined) {
    const d = new Date(from);
    if (isNaN(d.getTime())) {
      const err: ErrorEnvelope = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter "from" must be a valid ISO 8601 timestamp.',
          details: { field: 'from', value: from },
          correlationId: crypto.randomUUID(),
        },
      };
      return NextResponse.json(err, { status: 400 });
    }
  }

  if (to !== undefined) {
    const d = new Date(to);
    if (isNaN(d.getTime())) {
      const err: ErrorEnvelope = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter "to" must be a valid ISO 8601 timestamp.',
          details: { field: 'to', value: to },
          correlationId: crypto.randomUUID(),
        },
      };
      return NextResponse.json(err, { status: 400 });
    }
  }

  // ---------- Query ----------
  const result = auditService.query({
    firmId: auth.firmId,
    eventKey,
    userId,
    from,
    to,
    limit,
    offset,
  });

  return NextResponse.json({
    events: result.events,
    total: result.total,
    limit,
    offset,
  });
}
