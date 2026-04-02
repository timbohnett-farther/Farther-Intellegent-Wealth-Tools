// =============================================================================
// Rollover Engine — Farther IRA Fee Schedule
// =============================================================================

import { FARTHER_IRA_FEES } from '../mock-data';
import type { FartherIRAFees, BasisPoints, AmountCents } from '../types';

/**
 * Returns the current Farther IRA fee schedule.
 */
export function getFartherIRAFees(): FartherIRAFees {
  return { ...FARTHER_IRA_FEES };
}

/**
 * Calculates the annual dollar cost of Farther IRA fees for a given balance.
 */
export function calculateFartherAnnualCost(balanceCents: AmountCents): {
  advisory_cost_cents: number;
  fund_expense_cents: number;
  total_cost_cents: number;
} {
  const fees = FARTHER_IRA_FEES;
  const balanceDollars = balanceCents / 100;

  const advisoryCost = balanceDollars * (fees.advisory_fee_bps / 10000);
  const fundExpense = balanceDollars * (fees.average_fund_expense_bps / 10000);
  const totalCost = advisoryCost + fundExpense;

  return {
    advisory_cost_cents: Math.round(advisoryCost * 100),
    fund_expense_cents: Math.round(fundExpense * 100),
    total_cost_cents: Math.round(totalCost * 100),
  };
}

/**
 * Calculates projected fee savings over a time horizon.
 * Assumes the balance grows at the given annual return rate.
 */
export function projectFeeSavings(
  balanceCents: AmountCents,
  planFeeBps: BasisPoints,
  years: number,
  annualReturnPct: number = 7,
): {
  plan_total_fees_cents: number;
  farther_total_fees_cents: number;
  savings_cents: number;
  year_by_year: Array<{
    year: number;
    balance_cents: number;
    plan_fee_cents: number;
    farther_fee_cents: number;
    cumulative_savings_cents: number;
  }>;
} {
  const fartherFeeBps = FARTHER_IRA_FEES.total_all_in_bps;
  let balance = balanceCents / 100;
  let planTotalFees = 0;
  let fartherTotalFees = 0;
  const yearByYear: Array<{
    year: number;
    balance_cents: number;
    plan_fee_cents: number;
    farther_fee_cents: number;
    cumulative_savings_cents: number;
  }> = [];

  for (let year = 1; year <= years; year++) {
    // Grow balance
    balance *= 1 + annualReturnPct / 100;

    const planFee = balance * (planFeeBps / 10000);
    const fartherFee = balance * (fartherFeeBps / 10000);

    planTotalFees += planFee;
    fartherTotalFees += fartherFee;

    yearByYear.push({
      year,
      balance_cents: Math.round(balance * 100),
      plan_fee_cents: Math.round(planFee * 100),
      farther_fee_cents: Math.round(fartherFee * 100),
      cumulative_savings_cents: Math.round((planTotalFees - fartherTotalFees) * 100),
    });
  }

  return {
    plan_total_fees_cents: Math.round(planTotalFees * 100),
    farther_total_fees_cents: Math.round(fartherTotalFees * 100),
    savings_cents: Math.round((planTotalFees - fartherTotalFees) * 100),
    year_by_year: yearByYear,
  };
}
