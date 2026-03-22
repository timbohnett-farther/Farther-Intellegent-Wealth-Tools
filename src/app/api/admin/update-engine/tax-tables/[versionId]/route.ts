export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/update-engine/tax-tables/[versionId]
 * Returns a specific tax table version with full data and history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await params;

    // In production: fetch from BigQuery farther_tax_tables.tax_table_versions
    const version = {
      id: versionId,
      tax_year: 2026,
      table_type: 'ordinary_income_brackets',
      filing_status: 'mfj',
      effective_date: '2026-01-01',
      source: 'IRS Rev Proc 2025-45',
      is_current: true,
      version: 3,
      created_at: '2025-11-15T03:00:00Z',
      created_by: 'auto_update_engine',
      validated_by: 'bracket_validator',
      validation_notes: 'All brackets sequential, ascending rates, inflation within 2.4% (CPI: 2.3%)',
      data: {
        brackets: [
          { rate: 0.10, minIncome: 0, maxIncome: 24850 },
          { rate: 0.12, minIncome: 24851, maxIncome: 101400 },
          { rate: 0.22, minIncome: 101401, maxIncome: 197300 },
          { rate: 0.24, minIncome: 197301, maxIncome: 388550 },
          { rate: 0.32, minIncome: 388551, maxIncome: 493300 },
          { rate: 0.35, minIncome: 493301, maxIncome: 751600 },
          { rate: 0.37, minIncome: 751601, maxIncome: null },
        ],
      },
      history: [
        { version: 3, created_at: '2025-11-15T03:00:00Z', created_by: 'auto_update_engine', note: 'Annual 2026 update from Rev Proc 2025-45' },
        { version: 2, created_at: '2025-02-01T03:00:00Z', created_by: 'auto_update_engine', note: 'Mid-year correction — bracket 5 threshold adjusted' },
        { version: 1, created_at: '2024-11-15T03:00:00Z', created_by: 'auto_update_engine', note: 'Initial 2025 tables from Rev Proc 2024-40' },
      ],
    };

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching tax table version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/update-engine/tax-tables/[versionId]
 * Rollback or archive a tax table version.
 * Body: { action: 'rollback' | 'archive' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'rollback') {
      return NextResponse.json({
        id: versionId,
        action: 'rollback',
        message: 'Tax table rolled back to prior version. Affected plans queued for recalculation.',
        plans_queued: 284,
      });
    }

    if (action === 'archive') {
      return NextResponse.json({
        id: versionId,
        action: 'archive',
        message: 'Tax table version archived. No longer marked as current.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating tax table version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
