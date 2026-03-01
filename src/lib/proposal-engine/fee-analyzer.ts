// =============================================================================
// Farther Portfolio Proposal Engine -- Fee Analyzer
// =============================================================================
//
// Computes comprehensive fee analysis comparing current vs proposed portfolios.
// Projects fee savings over multiple time horizons showing how reduced fees
// compound into additional wealth.
//
// All monetary values are in cents (MoneyCents).
// =============================================================================

import type {
  FeeAnalysis,
  FeeBreakdown,
  Holding,
} from './types';
import type { MoneyCents } from '../tax-planning/types';

// =====================================================================
// Public API
// =====================================================================

/**
 * Compute fee analysis comparing current vs proposed portfolios.
 *
 * Calculates:
 * - Advisory fees, fund expense ratios, and transaction costs for both portfolios
 * - Annual fee savings
 * - Compounding impact over 5, 10, 15, 20, 25, and 30 year horizons
 */
export function computeFeeAnalysis(params: {
  currentHoldings: Holding[];
  proposedHoldings: Holding[];
  totalValue: MoneyCents;
  currentAdvisoryRate: number;
  proposedAdvisoryRate: number;
  currentTransactionRate?: number;
  proposedTransactionRate?: number;
  growthRate?: number; // for compounding projection, default 7%
}): FeeAnalysis {
  const {
    currentHoldings,
    proposedHoldings,
    totalValue,
    currentAdvisoryRate,
    proposedAdvisoryRate,
    currentTransactionRate = 0,
    proposedTransactionRate = 0,
    growthRate = 0.07,
  } = params;

  const totalValueNum = totalValue as number;

  // Compute fee breakdowns
  const currentFees = computeFeeBreakdown(
    currentHoldings,
    totalValueNum,
    currentAdvisoryRate,
    currentTransactionRate,
  );

  const proposedFees = computeFeeBreakdown(
    proposedHoldings,
    totalValueNum,
    proposedAdvisoryRate,
    proposedTransactionRate,
  );

  // Annual savings
  const annualSavings = (currentFees.totalDollars as number) - (proposedFees.totalDollars as number);

  // Project compounding impact over multiple horizons
  const projectionYears = [5, 10, 15, 20, 25, 30];
  const compoundingImpact = computeProjections(
    totalValueNum,
    currentFees.totalRate,
    proposedFees.totalRate,
    growthRate,
    projectionYears,
  );

  return {
    current: currentFees,
    proposed: proposedFees,
    annualSavings: Math.round(annualSavings) as MoneyCents,
    compoundingImpact,
  };
}

// =====================================================================
// Internal
// =====================================================================

/**
 * Compute fee breakdown for a set of holdings.
 */
function computeFeeBreakdown(
  holdings: Holding[],
  totalValue: number,
  advisoryFeeRate: number,
  transactionCostRate: number,
): FeeBreakdown {
  // Weighted fund expense ratio
  const fundExpenseRatio = computeWeightedExpenseRatio(holdings, totalValue);

  // Fee amounts (annual)
  const advisoryFeeDollars = Math.round(totalValue * advisoryFeeRate);
  const fundExpenseDollars = Math.round(totalValue * fundExpenseRatio);
  const transactionCostDollars = Math.round(totalValue * transactionCostRate);

  const totalRate = advisoryFeeRate + fundExpenseRatio + transactionCostRate;
  const totalDollars = advisoryFeeDollars + fundExpenseDollars + transactionCostDollars;

  return {
    fundExpenseRatio: Math.round(fundExpenseRatio * 100000) / 100000,
    fundExpenseDollars: fundExpenseDollars as MoneyCents,
    advisoryFeeRate,
    advisoryFeeDollars: advisoryFeeDollars as MoneyCents,
    transactionCostRate,
    transactionCostDollars: transactionCostDollars as MoneyCents,
    totalRate: Math.round(totalRate * 100000) / 100000,
    totalDollars: totalDollars as MoneyCents,
  };
}

/**
 * Compute weighted average expense ratio from holdings.
 */
function computeWeightedExpenseRatio(
  holdings: Holding[],
  totalValue: number,
): number {
  if (holdings.length === 0 || totalValue <= 0) return 0;

  let weightedSum = 0;
  let valueSum = 0;

  for (const h of holdings) {
    const mv = h.marketValue as number;
    if (h.expenseRatio !== null) {
      weightedSum += mv * h.expenseRatio;
    }
    valueSum += mv;
  }

  const denominator = valueSum > 0 ? valueSum : totalValue;
  return weightedSum / denominator;
}

/**
 * Project portfolio growth under two fee structures and compute the
 * compounding impact of fee savings over time.
 */
function computeProjections(
  totalValue: number,
  currentTotalRate: number,
  proposedTotalRate: number,
  growthRate: number,
  years: number[],
): FeeAnalysis['compoundingImpact'] {
  const currentNetGrowth = 1 + growthRate - currentTotalRate;
  const proposedNetGrowth = 1 + growthRate - proposedTotalRate;

  return years.map((year) => {
    const currentWealth = Math.round(
      totalValue * Math.pow(currentNetGrowth, year),
    );
    const proposedWealth = Math.round(
      totalValue * Math.pow(proposedNetGrowth, year),
    );
    const difference = proposedWealth - currentWealth;

    return {
      years: year,
      currentWealth: currentWealth as MoneyCents,
      proposedWealth: proposedWealth as MoneyCents,
      difference: difference as MoneyCents,
    };
  });
}
