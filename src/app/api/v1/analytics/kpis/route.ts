// =============================================================================
// API Route: GET /api/v1/analytics/kpis
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseAuthContext } from '@/lib/tax-planning/rbac';
import { hasPermission } from '@/lib/tax-planning/rbac';
import { computeKPI } from '@/lib/tax-planning/analytics';
import { kpiQuerySchema } from '@/lib/tax-planning/analytics/schemas';

export async function GET(req: NextRequest) {
  try {
    const authContext = parseAuthContext(req.headers.get('authorization'));
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', retryable: false },
        { status: 401 }
      );
    }

    if (!hasPermission(authContext.role, 'analytics:read')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: analytics:read required', retryable: false },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const params = {
      metricId: url.searchParams.get('metricId') || '',
      scopeType: url.searchParams.get('scopeType') || 'firm',
      scopeRefId: url.searchParams.get('scopeRefId') || '',
      periodStart: url.searchParams.get('periodStart') || '',
      periodEnd: url.searchParams.get('periodEnd') || '',
    };

    const parsed = kpiQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message, retryable: false },
        { status: 400 }
      );
    }

    const kpi = computeKPI(
      parsed.data.metricId,
      parsed.data.scopeType as any,
      parsed.data.scopeRefId,
      parsed.data.periodStart,
      parsed.data.periodEnd
    );

    return NextResponse.json({ success: true, data: kpi, error: null, retryable: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute KPI';
    return NextResponse.json(
      { success: false, data: null, error: message, retryable: true },
      { status: 500 }
    );
  }
}
