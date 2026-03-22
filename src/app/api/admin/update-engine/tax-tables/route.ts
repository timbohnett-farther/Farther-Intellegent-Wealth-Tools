export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Demo tax table versions — production reads from BigQuery farther_tax_tables
// ---------------------------------------------------------------------------

const DEMO_TABLE_VERSIONS = [
  {
    id: 'TTV-2026-FED-01',
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
  },
  {
    id: 'TTV-2026-SD-01',
    tax_year: 2026,
    table_type: 'standard_deductions',
    filing_status: null,
    effective_date: '2026-01-01',
    source: 'IRS Rev Proc 2025-45',
    is_current: true,
    version: 1,
    created_at: '2025-11-15T03:00:00Z',
    created_by: 'auto_update_engine',
    validated_by: 'bracket_validator',
    data: {
      single: 15700,
      mfj: 31400,
      mfs: 15700,
      hoh: 23500,
      additional_65_blind_single: 2050,
      additional_65_blind_mfj: 1650,
    },
  },
  {
    id: 'TTV-2026-CL-01',
    tax_year: 2026,
    table_type: 'contribution_limits',
    filing_status: null,
    effective_date: '2026-01-01',
    source: 'IRS Rev Proc 2025-45',
    is_current: true,
    version: 1,
    created_at: '2025-11-15T03:00:00Z',
    created_by: 'auto_update_engine',
    validated_by: 'bracket_validator',
    data: {
      k401_under50: 24000,
      k401_catchup: 7500,
      k401_total_under50: 71000,
      ira_under50: 7000,
      ira_catchup: 1000,
      hsa_self: 4400,
      hsa_family: 8750,
      hsa_catchup: 1000,
      sep_max: 70000,
      simple_under50: 16500,
      simple_catchup: 3500,
    },
  },
  {
    id: 'TTV-2026-AFR-03',
    tax_year: 2026,
    table_type: 'afr_rates',
    filing_status: null,
    effective_date: '2026-02-01',
    source: 'IRS Rev Rul 2026-4',
    is_current: true,
    version: 3,
    created_at: '2026-02-03T08:00:00Z',
    created_by: 'auto_update_engine',
    validated_by: 'afr_validator',
    data: {
      short_term: 4.67,
      mid_term: 4.23,
      long_term: 4.68,
      sec_7520: 5.2,
      effective_month: 'February 2026',
    },
  },
  {
    id: 'TTV-2026-IRMAA-02',
    tax_year: 2026,
    table_type: 'irmaa_part_b',
    filing_status: null,
    effective_date: '2026-01-01',
    source: 'CMS 2026 Announcement',
    is_current: true,
    version: 2,
    created_at: '2025-11-20T03:00:00Z',
    created_by: 'auto_update_engine',
    validated_by: 'irmaa_validator',
    data: {
      brackets: [
        { magiMin: 0, magiMax: 106000, partBMonthly: 185.0, partDSurcharge: 0 },
        { magiMin: 106001, magiMax: 133000, partBMonthly: 259.0, partDSurcharge: 13.7 },
        { magiMin: 133001, magiMax: 167000, partBMonthly: 370.0, partDSurcharge: 35.3 },
        { magiMin: 167001, magiMax: 200000, partBMonthly: 480.9, partDSurcharge: 56.9 },
        { magiMin: 200001, magiMax: 500000, partBMonthly: 591.9, partDSurcharge: 78.5 },
        { magiMin: 500001, magiMax: null, partBMonthly: 628.9, partDSurcharge: 85.5 },
      ],
    },
  },
];

/**
 * GET /api/admin/update-engine/tax-tables
 * Returns current tax table versions. Supports ?taxYear=2026&tableType=ordinary_income_brackets
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taxYear = searchParams.get('taxYear');
    const tableType = searchParams.get('tableType');
    const currentOnly = searchParams.get('currentOnly') !== 'false';

    let tables = DEMO_TABLE_VERSIONS;

    if (taxYear) {
      tables = tables.filter((t) => t.tax_year === parseInt(taxYear, 10));
    }
    if (tableType) {
      tables = tables.filter((t) => t.table_type === tableType);
    }
    if (currentOnly) {
      tables = tables.filter((t) => t.is_current);
    }

    return NextResponse.json({ data: tables, total: tables.length });
  } catch (error) {
    console.error('Error fetching tax tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
