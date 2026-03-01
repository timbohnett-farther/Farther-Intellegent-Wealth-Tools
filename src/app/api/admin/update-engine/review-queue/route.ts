import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory demo review queue — production would use Cloud SQL
// ---------------------------------------------------------------------------

const DEMO_QUEUE = [
  {
    id: 'REV-001',
    source: 'congress',
    title: 'SALT Cap Extension Act (S.1234)',
    change_type: 'pending_legislation',
    severity: 'medium',
    detected_at: '2026-02-28T06:00:00Z',
    affected_clients: 847,
    affected_tables: ['standard_deductions', 'state_income_tax'],
    summary: 'Proposes raising SALT deduction cap from $10K to $30K for taxpayers with AGI under $400K.',
    ai_analysis: 'Bipartisan co-sponsors, moderate probability of passage. Benefits clients in high-tax states.',
    status: 'pending',
    bill_number: 'S.1234',
    effective_date: '2027-01-01',
    reviewed_by: null,
    reviewed_at: null,
    notes: null,
  },
  {
    id: 'REV-002',
    source: 'state_me',
    title: 'Maine Estate Tax Exemption Increase',
    change_type: 'law_change',
    severity: 'low',
    detected_at: '2026-03-01T03:00:00Z',
    affected_clients: 12,
    affected_tables: ['state_estate_tax'],
    summary: 'Maine estate tax exemption increased from $6.8M to $7.1M effective Jan 1, 2027.',
    ai_analysis: 'Minor inflation adjustment. Only 12 firm clients affected.',
    status: 'pending',
    bill_number: null,
    effective_date: '2027-01-01',
    reviewed_by: null,
    reviewed_at: null,
    notes: null,
  },
];

/**
 * GET /api/admin/update-engine/review-queue
 * Returns human review queue items. Supports ?status=pending
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let items = DEMO_QUEUE;
    if (status) {
      items = items.filter((i) => i.status === status);
    }

    return NextResponse.json({ data: items, total: items.length });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
