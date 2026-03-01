// =============================================================================
// GET /api/v1/proposals/stats  - Get proposal dashboard stats
// =============================================================================
// Returns aggregate ProposalDashboardStats for the authenticated firm.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/proposal-engine/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';

// ==================== Helpers ====================

function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}): NextResponse {
  const err: ErrorEnvelope = {
    error: { code, message, details, correlationId: crypto.randomUUID() },
  };
  return NextResponse.json(err, { status });
}

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view proposal stats.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Compute ----------
  const stats = proposalStore.getDashboardStats();

  return NextResponse.json(stats);
}
