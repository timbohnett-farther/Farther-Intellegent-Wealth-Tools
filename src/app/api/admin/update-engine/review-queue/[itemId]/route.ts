import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/admin/update-engine/review-queue/[itemId]
 * Updates a review queue item (approve, reject, create scenario).
 * Body: { action: 'approve' | 'reject' | 'create_scenario', reviewedBy: string, notes?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { action, reviewedBy, notes } = body;

    if (!action || !reviewedBy) {
      return NextResponse.json(
        { error: 'action and reviewedBy are required' },
        { status: 400 },
      );
    }

    const validActions = ['approve', 'reject', 'create_scenario'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // In production: update Cloud SQL review_queue table + trigger downstream effects
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      create_scenario: 'scenario_created',
    };

    const result = {
      id: itemId,
      status: statusMap[action],
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      notes: notes || null,
      message:
        action === 'approve'
          ? 'Item approved. Tax tables will be updated and affected plans queued for recalculation.'
          : action === 'reject'
            ? 'Item rejected. No table changes will be made. Monitoring continues.'
            : 'Scenario created. Advisors can now model this as a "What-If" without affecting baseline tables.',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating review item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/update-engine/review-queue/[itemId]
 * Returns a single review queue item with full detail.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;

    // In production: fetch from Cloud SQL
    const item = {
      id: itemId,
      source: 'congress',
      title: 'SALT Cap Extension Act (S.1234)',
      change_type: 'pending_legislation',
      severity: 'medium',
      detected_at: '2026-02-28T06:00:00Z',
      status: 'pending',
      message: `Review item ${itemId} retrieved. Full detail would include table comparison and AI analysis.`,
    };

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching review item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
