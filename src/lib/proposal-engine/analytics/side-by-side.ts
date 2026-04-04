/**
 * Side-by-Side Comparison Engine
 *
 * Compares current vs proposed portfolios across risk, fees, allocation,
 * Sharpe ratio, projected ranges, and diversification metrics.
 */

import type { Holding, MoneyCents, PortfolioMetrics } from '@/lib/proposal-engine/types';
import { computePortfolioMetrics } from '@/lib/proposal-engine/analytics-engine';
import { computeFeeAnalysis } from '@/lib/proposal-engine/fee-analyzer';

/**
 * Asset class allocation comparison
 */
export interface AllocationComparison {
  assetClass: string;
  currentPct: number;
  proposedPct: number;
  delta: number; // proposedPct - currentPct
}

/**
 * Sharpe ratio comparison
 */
export interface SharpeComparison {
  current: number;
  proposed: number;
  delta: number; // proposed - current
}

/**
 * 95% confidence interval projected range
 */
export interface ProjectedRange95 {
  current: {
    low: MoneyCents;
    high: MoneyCents;
  };
  proposed: {
    low: MoneyCents;
    high: MoneyCents;
  };
}

/**
 * Fee savings over multiple time horizons
 */
export interface FeeSavings {
  annual: MoneyCents;
  fiveYear: MoneyCents;
  tenYear: MoneyCents;
  twentyYear: MoneyCents;
}

/**
 * Diversification score (0-100)
 */
export interface DiversificationScore {
  current: number;
  proposed: number;
}

/**
 * Complete side-by-side comparison result
 */
export interface SideBySideResult {
  riskScoreDelta: number;
  currentRiskScore: number;
  proposedRiskScore: number;
  feeSavings: FeeSavings;
  allocationComparison: AllocationComparison[];
  sharpeComparison: SharpeComparison;
  projectedRange95: ProjectedRange95;
  improvementSummary: string[];
  holdingCountDelta: number;
  expenseRatioDelta: number;
  diversificationScore: DiversificationScore;
}

/**
 * Compute side-by-side comparison between current and proposed portfolios
 */
export function computeSideBySide(params: {
  currentHoldings: Holding[];
  proposedHoldings: Holding[];
  currentRiskScore?: number;
  proposedRiskScore?: number;
  advisoryFeeRate?: number; // Annual fee rate (e.g., 0.01 = 1%)
}): SideBySideResult {
  const {
    currentHoldings,
    proposedHoldings,
    currentRiskScore = 50,
    proposedRiskScore = 50,
    advisoryFeeRate = 0.01,
  } = params;

  // Compute metrics for both portfolios
  const currentMetrics = computePortfolioMetrics(currentHoldings);
  const proposedMetrics = computePortfolioMetrics(proposedHoldings);

  // Risk score delta
  const riskScoreDelta = proposedRiskScore - currentRiskScore;

  const portfolioValue = currentMetrics.totalValue;

  // Fee analysis
  const feeAnalysis = computeFeeAnalysis({
    currentHoldings,
    proposedHoldings,
    totalValue: portfolioValue as MoneyCents,
    currentAdvisoryRate: advisoryFeeRate,
    proposedAdvisoryRate: advisoryFeeRate,
  });

  // Fee savings (assuming current portfolio has higher embedded fees)
  const currentTotalFees = currentMetrics.weightedExpenseRatio + advisoryFeeRate;
  const proposedTotalFees = proposedMetrics.weightedExpenseRatio + advisoryFeeRate;
  const annualFeeDelta = currentTotalFees - proposedTotalFees;

  const feeSavings: FeeSavings = {
    annual: Math.round(portfolioValue * annualFeeDelta) as MoneyCents,
    fiveYear: computeCompoundedSavings(portfolioValue as MoneyCents, annualFeeDelta, 5),
    tenYear: computeCompoundedSavings(portfolioValue as MoneyCents, annualFeeDelta, 10),
    twentyYear: computeCompoundedSavings(portfolioValue as MoneyCents, annualFeeDelta, 20),
  };

  // Allocation comparison
  const allocationComparison = computeAllocationComparison(
    currentHoldings,
    proposedHoldings
  );

  // Sharpe ratio comparison (using placeholder values since not in PortfolioMetrics)
  const sharpeComparison: SharpeComparison = {
    current: 0,
    proposed: 0,
    delta: 0,
  };

  // Projected 95% confidence range (using default volatility since not in PortfolioMetrics)
  const projectedRange95 = compute95PercentileRange(
    portfolioValue as MoneyCents,
    0.15, // default 15% volatility for current
    0.15, // default 15% volatility for proposed
    10 // 10-year horizon
  );

  // Diversification scores
  const diversificationScore: DiversificationScore = {
    current: computeDiversificationScore(currentHoldings),
    proposed: computeDiversificationScore(proposedHoldings),
  };

  // Improvement summary
  const improvementSummary = buildImprovementSummary({
    riskScoreDelta,
    feeSavings,
    sharpeComparison,
    diversificationScore,
    expenseRatioDelta: proposedMetrics.weightedExpenseRatio - currentMetrics.weightedExpenseRatio,
  });

  return {
    riskScoreDelta,
    currentRiskScore,
    proposedRiskScore,
    feeSavings,
    allocationComparison,
    sharpeComparison,
    projectedRange95,
    improvementSummary,
    holdingCountDelta: proposedHoldings.length - currentHoldings.length,
    expenseRatioDelta: proposedMetrics.weightedExpenseRatio - currentMetrics.weightedExpenseRatio,
    diversificationScore,
  };
}

/**
 * Compute compounded fee savings over time
 * FV = PV * (1 + r - fee)^n
 */
function computeCompoundedSavings(
  principal: MoneyCents,
  feeDelta: number,
  years: number
): MoneyCents {
  const assumedReturn = 0.07; // 7% annual return assumption
  const futureValueWithSavings = principal * Math.pow(1 + assumedReturn, years);
  const futureValueWithoutSavings = principal * Math.pow(1 + assumedReturn - feeDelta, years);
  return Math.round(futureValueWithSavings - futureValueWithoutSavings) as MoneyCents;
}

/**
 * Compare asset class allocations between portfolios
 */
function computeAllocationComparison(
  currentHoldings: Holding[],
  proposedHoldings: Holding[]
): AllocationComparison[] {
  const currentTotal = currentHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const proposedTotal = proposedHoldings.reduce((sum, h) => sum + h.marketValue, 0);

  // Build allocation maps
  const currentAlloc = new Map<string, number>();
  const proposedAlloc = new Map<string, number>();

  for (const h of currentHoldings) {
    const pct = currentTotal > 0 ? ((h.marketValue as number) / currentTotal) * 100 : 0;
    currentAlloc.set(h.assetClass, (currentAlloc.get(h.assetClass) ?? 0) + pct);
  }

  for (const h of proposedHoldings) {
    const pct = proposedTotal > 0 ? ((h.marketValue as number) / proposedTotal) * 100 : 0;
    proposedAlloc.set(h.assetClass, (proposedAlloc.get(h.assetClass) ?? 0) + pct);
  }

  // Merge unique asset classes
  const allAssetClasses = new Set([...currentAlloc.keys(), ...proposedAlloc.keys()]);

  const comparison: AllocationComparison[] = [];
  for (const assetClass of allAssetClasses) {
    const currentPct = currentAlloc.get(assetClass) ?? 0;
    const proposedPct = proposedAlloc.get(assetClass) ?? 0;
    comparison.push({
      assetClass,
      currentPct,
      proposedPct,
      delta: proposedPct - currentPct,
    });
  }

  return comparison.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Compute 95% confidence interval for portfolio value after 10 years
 * Range = value ± 1.96 * stdDev * sqrt(horizon)
 */
function compute95PercentileRange(
  portfolioValue: MoneyCents,
  currentVolatility: number,
  proposedVolatility: number,
  horizonYears: number
): ProjectedRange95 {
  const assumedReturn = 0.07; // 7% annual return
  const futureValue = portfolioValue * Math.pow(1 + assumedReturn, horizonYears);

  // Current portfolio range
  const currentStdDev = futureValue * currentVolatility * Math.sqrt(horizonYears);
  const currentLow = Math.round(futureValue - 1.96 * currentStdDev) as MoneyCents;
  const currentHigh = Math.round(futureValue + 1.96 * currentStdDev) as MoneyCents;

  // Proposed portfolio range
  const proposedStdDev = futureValue * proposedVolatility * Math.sqrt(horizonYears);
  const proposedLow = Math.round(futureValue - 1.96 * proposedStdDev) as MoneyCents;
  const proposedHigh = Math.round(futureValue + 1.96 * proposedStdDev) as MoneyCents;

  return {
    current: { low: currentLow, high: currentHigh },
    proposed: { low: proposedLow, high: proposedHigh },
  };
}

/**
 * Compute diversification score (0-100)
 * Based on holding count, asset class diversity, and concentration (inverse HHI)
 */
function computeDiversificationScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // Component 1: Holding count (max 40 points)
  const holdingScore = Math.min(40, holdings.length * 2);

  // Component 2: Asset class diversity (max 30 points)
  const assetClasses = new Set(holdings.map(h => h.assetClass));
  const diversityScore = Math.min(30, assetClasses.size * 6);

  // Component 3: Concentration (inverse HHI, max 30 points)
  const hhi = holdings.reduce((sum, h) => {
    const weight = totalValue > 0 ? (h.marketValue as number) / totalValue : 0;
    return sum + weight * weight;
  }, 0);
  const concentrationScore = Math.min(30, (1 - hhi) * 50);

  return Math.round(holdingScore + diversityScore + concentrationScore);
}

/**
 * Build human-readable improvement summary
 */
function buildImprovementSummary(params: {
  riskScoreDelta: number;
  feeSavings: FeeSavings;
  sharpeComparison: SharpeComparison;
  diversificationScore: DiversificationScore;
  expenseRatioDelta: number;
}): string[] {
  const summary: string[] = [];

  if (params.riskScoreDelta < -5) {
    summary.push(`Reduced portfolio risk score by ${Math.abs(params.riskScoreDelta)} points`);
  } else if (params.riskScoreDelta > 5) {
    summary.push(`Increased portfolio risk score by ${params.riskScoreDelta} points (higher growth potential)`);
  }

  if (params.feeSavings.annual > 0) {
    const annualSavings = (params.feeSavings.annual / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    summary.push(`Save ${annualSavings} annually in fees`);
  }

  if (params.sharpeComparison.delta > 0.1) {
    summary.push(`Improved risk-adjusted returns (Sharpe ratio +${params.sharpeComparison.delta.toFixed(2)})`);
  }

  if (params.diversificationScore.proposed > params.diversificationScore.current + 5) {
    summary.push(`Enhanced diversification score by ${Math.round(params.diversificationScore.proposed - params.diversificationScore.current)} points`);
  }

  if (params.expenseRatioDelta < -0.001) {
    const bpsSaved = Math.abs(params.expenseRatioDelta * 10000);
    summary.push(`Reduced expense ratio by ${bpsSaved.toFixed(0)} basis points`);
  }

  if (summary.length === 0) {
    summary.push('Portfolio rebalanced to align with target allocation');
  }

  return summary;
}
