// =============================================================================
// Rollover Engine — DOL EFAST Extraction (Mock)
// =============================================================================
//
// In production, this will query the DOL EFAST system for Form 5500 filings.
// For now, returns mock data based on EIN lookup.
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import type { EFASTFiling, ScrapeResult } from './types';
import { seedRolloverData } from '../seed';

seedRolloverData();

/**
 * Searches DOL EFAST for plan filings by EIN.
 * Mock: looks up plan from store and synthesizes a filing.
 */
export async function searchEFAST(ein: string): Promise<EFASTFiling[]> {
  // Simulate network delay
  await delay(200);

  const plans = store.listRolloverPlans({ ein });
  if (plans.length === 0) return [];

  return plans.map((plan) => ({
    filing_id: `efast-${plan.plan_id}`,
    ein: plan.ein,
    plan_name: plan.plan_name,
    plan_year: parseInt(plan.plan_year_end.substring(0, 4), 10),
    total_assets: plan.total_assets_cents / 100,
    total_participants: plan.participant_count,
    total_active_participants: Math.round(plan.participant_count * 0.85),
    plan_type_code: plan.plan_type,
    admin_expenses: plan.admin_fees_cents / 100,
    investment_expenses: 0,
    total_expenses: plan.admin_fees_cents / 100,
    filing_date: plan.data_freshness,
  }));
}

/**
 * Gets a specific plan filing from EFAST.
 */
export async function getPlanFiling(
  ein: string,
  planYear?: number,
): Promise<EFASTFiling | null> {
  const filings = await searchEFAST(ein);
  if (filings.length === 0) return null;
  if (planYear) {
    return filings.find((f) => f.plan_year === planYear) ?? filings[0];
  }
  return filings[0];
}

/**
 * Extracts structured plan data from an EFAST filing.
 * Returns a ScrapeResult with the extracted data points.
 */
export async function extractPlanData(ein: string): Promise<ScrapeResult> {
  const start = Date.now();

  try {
    const filing = await getPlanFiling(ein);
    if (!filing) {
      return {
        source: 'DOL_EFAST',
        success: false,
        data_points: 0,
        data: {},
        error: `No EFAST filing found for EIN ${ein}`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      source: 'DOL_EFAST',
      success: true,
      data_points: 10,
      data: {
        filing,
        total_assets: filing.total_assets,
        participant_count: filing.total_participants,
        admin_expenses: filing.admin_expenses,
        plan_type: filing.plan_type_code,
        plan_year: filing.plan_year,
      },
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      source: 'DOL_EFAST',
      success: false,
      data_points: 0,
      data: {},
      error: err instanceof Error ? err.message : 'Unknown error',
      duration_ms: Date.now() - start,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
