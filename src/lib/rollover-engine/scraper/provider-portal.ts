// =============================================================================
// Rollover Engine — Provider Portal Scraping (Mock)
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import type { FundLineupEntry, ProviderPortalData, ScrapeResult } from './types';
import { seedRolloverData } from '../seed';

seedRolloverData();

/**
 * Scrapes fund lineup from provider portal.
 * Mock: generates realistic fund data based on plan characteristics.
 */
export async function scrapeFundLineup(planId: string): Promise<FundLineupEntry[]> {
  await delay(300);

  const plan = store.getRolloverPlan(planId);
  if (!plan) return [];

  const funds: FundLineupEntry[] = [];

  // Generate index funds
  const indexFunds = [
    { name: 'S&P 500 Index Fund', ticker: 'FXAIX', class: 'Large Cap', er: 3, rating: 5 },
    { name: 'Total Market Index', ticker: 'FSKAX', class: 'Large Cap', er: 2, rating: 5 },
    { name: 'International Index', ticker: 'FTIHX', class: 'International', er: 6, rating: 4 },
    { name: 'Bond Market Index', ticker: 'FXNAX', class: 'Fixed Income', er: 3, rating: 4 },
    { name: 'Small Cap Index', ticker: 'FSSNX', class: 'Small Cap', er: 3, rating: 4 },
    { name: 'Mid Cap Index', ticker: 'FSMDX', class: 'Mid Cap', er: 3, rating: 4 },
    { name: 'REIT Index', ticker: 'FSRNX', class: 'Real Estate', er: 7, rating: 4 },
    { name: 'Emerging Markets Index', ticker: 'FPADX', class: 'International', er: 8, rating: 3 },
  ];

  for (let i = 0; i < Math.min(plan.index_fund_count, indexFunds.length); i++) {
    const f = indexFunds[i];
    funds.push({
      fund_name: f.name,
      ticker: f.ticker,
      asset_class: f.class,
      expense_ratio_bps: f.er,
      assets_cents: Math.round((plan.total_assets_cents / plan.fund_count) * (1.5 - Math.random())),
      is_index: true,
      is_target_date: false,
      morningstar_rating: f.rating,
    });
  }

  // Generate target date funds
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < plan.target_date_fund_count; i++) {
    const targetYear = currentYear + 5 + i * 5;
    funds.push({
      fund_name: `Target Date ${targetYear} Fund`,
      asset_class: 'Target Date',
      expense_ratio_bps: 12 + Math.round(Math.random() * 8),
      assets_cents: Math.round(plan.total_assets_cents / plan.fund_count),
      is_index: false,
      is_target_date: true,
      morningstar_rating: 3 + Math.round(Math.random()),
    });
  }

  // Fill remaining with active funds
  const remainingCount = plan.fund_count - funds.length;
  for (let i = 0; i < Math.max(0, remainingCount); i++) {
    funds.push({
      fund_name: `Active ${['Growth', 'Value', 'Balanced', 'Income'][i % 4]} Fund ${i + 1}`,
      asset_class: ['Large Cap', 'Mid Cap', 'Fixed Income', 'International'][i % 4],
      expense_ratio_bps: 45 + Math.round(Math.random() * 80),
      assets_cents: Math.round(plan.total_assets_cents / plan.fund_count * 0.5),
      is_index: false,
      is_target_date: false,
      morningstar_rating: 2 + Math.round(Math.random() * 2),
    });
  }

  return funds;
}

/**
 * Scrapes full provider portal data.
 */
export async function scrapeProviderPortal(planId: string): Promise<ScrapeResult> {
  const start = Date.now();

  try {
    const plan = store.getRolloverPlan(planId);
    if (!plan) {
      return {
        source: 'PROVIDER_PORTAL',
        success: false,
        data_points: 0,
        data: {},
        error: `Plan not found: ${planId}`,
        duration_ms: Date.now() - start,
      };
    }

    const fundLineup = await scrapeFundLineup(planId);

    const portalData: ProviderPortalData = {
      plan_features: [
        ...(plan.roth_option ? ['Roth 401(k) option'] : []),
        ...(plan.loan_provision ? ['Loan provision'] : []),
        ...(plan.hardship_withdrawal ? ['Hardship withdrawal'] : []),
        ...(plan.self_directed_brokerage ? ['Self-directed brokerage window'] : []),
        ...(plan.auto_enrollment ? ['Auto-enrollment'] : []),
        ...(plan.auto_escalation ? ['Auto-escalation'] : []),
      ],
      fund_lineup: fundLineup,
      admin_fee_schedule: {
        annual_admin_fee: plan.admin_fees_cents / 100,
        per_participant_fee: plan.per_participant_fee_cents / 100,
        investment_management_bps: plan.investment_management_fees_bps,
      },
      service_options: [
        'Online portal access',
        'Phone support',
        ...(plan.self_directed_brokerage ? ['Brokerage window'] : []),
        'Retirement planning tools',
      ],
    };

    return {
      source: 'PROVIDER_PORTAL',
      success: true,
      data_points: fundLineup.length + portalData.plan_features.length + 4,
      data: portalData as unknown as Record<string, unknown>,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      source: 'PROVIDER_PORTAL',
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
