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
  FeeProjectionYear,
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
  const annualSavings = currentFees.totalAmount - proposedFees.totalAmount;
  const annualSavingsRate =
    totalValueNum > 0 ? annualSavings / totalValueNum : 0;

  // Project compounding impact over multiple horizons
  const projectionYears = [1, 2, 3, 5, 10, 15, 20, 25, 30];
  const projections = computeProjections(
    totalValueNum,
    currentFees.totalRate,
    proposedFees.totalRate,
    growthRate,
    projectionYears,
  );

  // Extract specific horizon savings
  const tenYearProjection = projections.find((p) => p.year === 10);
  const thirtyYearProjection = projections.find((p) => p.year === 30);

  return {
    currentFees,
    proposedFees,
    annualSavings: Math.round(annualSavings),
    annualSavingsRate: Math.round(annualSavingsRate * 10000) / 10000,
    projections,
    tenYearCompoundedSavings: tenYearProjection
      ? tenYearProjection.compoundedSavings
      : 0,
    thirtyYearCompoundedSavings: thirtyYearProjection
      ? thirtyYearProjection.compoundedSavings
      : 0,
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
  advisoryRate: number,
  transactionRate: number,
): FeeBreakdown {
  // Weighted fund expense ratio
  const fundExpenseRatio = computeWeightedExpenseRatio(holdings, totalValue);

  // Fee amounts (annual)
  const advisoryAmount = Math.round(totalValue * advisoryRate);
  const fundExpenseAmount = Math.round(totalValue * fundExpenseRatio);
  const transactionAmount = Math.round(totalValue * transactionRate);

  const totalRate = advisoryRate + fundExpenseRatio + transactionRate;
  const totalAmount = advisoryAmount + fundExpenseAmount + transactionAmount;

  return {
    advisoryRate,
    advisoryAmount,
    fundExpenseRatio: Math.round(fundExpenseRatio * 10000) / 10000,
    fundExpenseAmount,
    transactionRate,
    transactionAmount,
    totalRate: Math.round(totalRate * 10000) / 10000,
    totalAmount,
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
    weightedSum += h.marketValue * h.expenseRatio;
    valueSum += h.marketValue;
  }

  // Use actual holdings total if available, else fall back to provided totalValue
  const denominator = valueSum > 0 ? valueSum : totalValue;
  return weightedSum / denominator;
}

/**
 * Project portfolio growth under two fee structures and compute the
 * compounding impact of fee savings over time.
 *
 * For each year:
 *   currentFeeValue  = totalValue * (1 + growthRate - currentTotalRate)^year
 *   proposedFeeValue = totalValue * (1 + growthRate - proposedTotalRate)^year
 *   compoundedSavings = proposedFeeValue - currentFeeValue
 *
 * Also tracks cumulative dollar savings (simple, non-compounded) for comparison.
 */
function computeProjections(
  totalValue: number,
  currentTotalRate: number,
  proposedTotalRate: number,
  growthRate: number,
  years: number[],
): FeeProjectionYear[] {
  const currentNetGrowth = 1 + growthRate - currentTotalRate;
  const proposedNetGrowth = 1 + growthRate - proposedTotalRate;

  // Annual savings (simple)
  const annualFeeDifference = Math.round(
    totalValue * (currentTotalRate - proposedTotalRate),
  );

  return years.map((year) => {
    // Compound growth under each fee structure
    const currentFeeValue = Math.round(
      totalValue * Math.pow(currentNetGrowth, year),
    );
    const proposedFeeValue = Math.round(
      totalValue * Math.pow(proposedNetGrowth, year),
    );

    // Cumulative simple savings (just annual savings * years, non-compounded)
    const cumulativeSavings = annualFeeDifference * year;

    // Compounded savings: the actual difference in portfolio values
    const compoundedSavings = proposedFeeValue - currentFeeValue;

    return {
      year,
      currentFeeValue,
      proposedFeeValue,
      cumulativeSavings,
      compoundedSavings,
    };
  });
}
