import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Demo run history — would come from BigQuery farther_update_engine.update_runs
// ---------------------------------------------------------------------------

const DEMO_RUNS = [
  {
    run_id: 'UPD-2026-Q1',
    trigger: 'quarterly',
    run_date: '2026-03-01T03:00:00Z',
    duration_ms: 272000,
    sources_checked: 57,
    changes_detected: 14,
    tables_updated: 8,
    plans_recalculated: 284,
    human_review_count: 2,
    advisor_alerts: 6,
    errors: [],
    status: 'completed',
    summary: 'Q1 2026 update: 8 numeric adjustments auto-published. 2 items pending human review.',
  },
  {
    run_id: 'UPD-2026-M02',
    trigger: 'monthly_afr',
    run_date: '2026-02-03T08:00:00Z',
    duration_ms: 18000,
    sources_checked: 2,
    changes_detected: 1,
    tables_updated: 1,
    plans_recalculated: 0,
    human_review_count: 0,
    advisor_alerts: 0,
    errors: [],
    status: 'completed',
    summary: 'Monthly AFR update: Short 4.67%, Mid 4.23%, Long 4.68%, 7520 Rate 5.2%.',
  },
];

/**
 * GET /api/admin/update-engine/runs
 * Returns update engine run history. Supports ?trigger=quarterly&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trigger = searchParams.get('trigger');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let runs = DEMO_RUNS;
    if (trigger) {
      runs = runs.filter((r) => r.trigger === trigger);
    }

    return NextResponse.json({
      data: runs.slice(0, limit),
      pagination: { total: runs.length, limit },
    });
  } catch (error) {
    console.error('Error fetching update runs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/update-engine/runs
 * Triggers a manual update engine run. Body: { trigger: 'quarterly' | 'monthly_afr' | 'daily_congress' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trigger = body.trigger || 'quarterly';

    // In production this would publish to Cloud Pub/Sub to trigger a Cloud Run Job
    const run = {
      run_id: `UPD-MANUAL-${Date.now()}`,
      trigger,
      run_date: new Date().toISOString(),
      status: 'queued',
      message: `Manual ${trigger} run queued. Check back for results.`,
    };

    return NextResponse.json(run, { status: 202 });
  } catch (error) {
    console.error('Error triggering update run:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
