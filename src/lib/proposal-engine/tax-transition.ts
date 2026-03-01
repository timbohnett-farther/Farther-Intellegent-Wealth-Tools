// =============================================================================
// Proposal Engine -- Tax Transition Analysis Service
// =============================================================================
//
// Evaluates multiple transition strategies for moving from a current portfolio
// to a proposed model portfolio.  Considers tax lots, holding periods, and
// gain/loss offsets.  Stage 1 provides deterministic results.
// =============================================================================

import type {
  Holding,
  TaxTransitionAnalysis,
  TransitionStrategyResult,
  TransitionStrategy,
} from './types';

// ==================== Constants ====================

const FEDERAL_SHORT_TERM_RATE = 0.37;
const FEDERAL_LONG_TERM_RATE = 0.20;
const NIIT_RATE = 0.038; // Net Investment Income Tax
const DEFAULT_STATE_RATE = 0.05;

// ==================== Helpers ====================

function computeGainLoss(h: Holding): number {
  return h.costBasis !== undefined ? h.marketValue - h.costBasis : 0;
}

function computeTaxOnGain(gainLoss: number, holdingPeriod: 'SHORT_TERM' | 'LONG_TERM', marginalRate: number, stateRate: number): number {
  if (gainLoss <= 0) return 0;
  const federalRate = holdingPeriod === 'SHORT_TERM'
    ? marginalRate
    : FEDERAL_LONG_TERM_RATE;
  return Math.round(gainLoss * (federalRate + NIIT_RATE + stateRate));
}

// ==================== Strategy Analyzers ====================

function analyzeFullLiquidation(
  holdings: Holding[],
  marginalRate: number,
  stateRate: number,
): TransitionStrategyResult {
  let shortTermGains = 0;
  let longTermGains = 0;
  let lossesHarvested = 0;
  let totalTaxCost = 0;

  const holdingActions = holdings.map((h) => {
    const gl = computeGainLoss(h);
    const period = h.holdingPeriod ?? 'LONG_TERM';

    if (gl > 0) {
      if (period === 'SHORT_TERM') shortTermGains += gl;
      else longTermGains += gl;
    } else {
      lossesHarvested += Math.abs(gl);
    }

    const taxCost = computeTaxOnGain(gl, period, marginalRate, stateRate);
    totalTaxCost += taxCost;

    return {
      ticker: h.ticker,
      action: 'SELL' as const,
      shares: h.shares,
      gainLoss: gl,
      taxCost,
    };
  });

  // Offset losses against gains
  const netGains = shortTermGains + longTermGains - lossesHarvested;
  const adjustedTaxCost = netGains > 0
    ? Math.round(netGains * (FEDERAL_LONG_TERM_RATE + NIIT_RATE + stateRate))
    : Math.max(totalTaxCost - Math.round(lossesHarvested * (marginalRate + stateRate)), 0);

  return {
    strategy: 'FULL_LIQUIDATION',
    strategyName: 'Full Liquidation',
    estimatedTaxCost: adjustedTaxCost,
    shortTermGains,
    longTermGains,
    lossesHarvested,
    netGains: Math.max(netGains, 0),
    timeToComplete: 1,
    holdingActions,
    pros: [
      'Immediate full transition to target portfolio',
      'Clean break from legacy positions',
      'Simplifies ongoing management',
    ],
    cons: [
      'Highest upfront tax cost',
      'May push into higher tax bracket',
      'No opportunity to phase in gains',
    ],
  };
}

function analyzePhased3Year(
  holdings: Holding[],
  marginalRate: number,
  stateRate: number,
): TransitionStrategyResult {
  const full = analyzeFullLiquidation(holdings, marginalRate, stateRate);

  // Phased: spread gains over 3 years
  const yearlyTax = Math.round(full.estimatedTaxCost * 0.30); // Lower per-year cost due to bracket management
  const totalTaxCost = yearlyTax * 3;

  const holdingActions = holdings.map((h) => {
    const gl = computeGainLoss(h);
    return {
      ticker: h.ticker,
      action: (gl > 0 ? 'PARTIAL_SELL' : 'SELL') as 'SELL' | 'HOLD' | 'PARTIAL_SELL' | 'TAX_LOSS_HARVEST',
      shares: gl > 0 ? Math.round(h.shares / 3) : h.shares,
      gainLoss: gl,
      taxCost: Math.round(computeTaxOnGain(gl, h.holdingPeriod ?? 'LONG_TERM', marginalRate, stateRate) / 3),
    };
  });

  const yearlyBreakdown = [1, 2, 3].map((year) => ({
    year,
    gainsRealized: Math.round((full.shortTermGains + full.longTermGains) / 3),
    taxCost: yearlyTax,
    bracketHeadroomUsed: Math.round(yearlyTax / (marginalRate + stateRate)),
  }));

  return {
    strategy: 'PHASED_3_YEAR',
    strategyName: 'Phased 3-Year Transition',
    estimatedTaxCost: totalTaxCost,
    shortTermGains: full.shortTermGains,
    longTermGains: full.longTermGains,
    lossesHarvested: full.lossesHarvested,
    netGains: full.netGains,
    timeToComplete: 36,
    yearlyBreakdown,
    holdingActions,
    pros: [
      'Lower annual tax impact through bracket management',
      'Allows short-term positions to convert to long-term',
      'Gradual transition reduces market timing risk',
    ],
    cons: [
      'Slower to reach target allocation',
      'Portfolio remains partially in suboptimal holdings',
      'Requires ongoing monitoring and rebalancing',
    ],
  };
}

function analyzeHarvestFirst(
  holdings: Holding[],
  marginalRate: number,
  stateRate: number,
): TransitionStrategyResult {
  let lossesHarvested = 0;
  let gainsDeferred = 0;

  const holdingActions = holdings.map((h) => {
    const gl = computeGainLoss(h);
    if (gl < 0) {
      lossesHarvested += Math.abs(gl);
      return {
        ticker: h.ticker,
        action: 'TAX_LOSS_HARVEST' as const,
        shares: h.shares,
        gainLoss: gl,
        taxCost: 0,
      };
    } else {
      gainsDeferred += gl;
      return {
        ticker: h.ticker,
        action: 'HOLD' as const,
        gainLoss: gl,
        taxCost: 0,
      };
    }
  });

  const taxBenefit = Math.round(lossesHarvested * (marginalRate + stateRate));

  return {
    strategy: 'HARVEST_FIRST',
    strategyName: 'Harvest Losses First',
    estimatedTaxCost: -taxBenefit, // Negative = tax benefit
    shortTermGains: 0,
    longTermGains: 0,
    lossesHarvested,
    netGains: 0,
    timeToComplete: 6,
    holdingActions,
    pros: [
      'Immediate tax benefit from loss harvesting',
      'No gains realized in year 1',
      'Can offset up to $3,000 of ordinary income',
    ],
    cons: [
      'Only partially transitions to target',
      'Gain positions remain in place',
      'May need follow-up strategy for remaining positions',
    ],
  };
}

// ==================== Public API ====================

/**
 * Computes a full tax transition analysis across multiple strategies.
 *
 * @param currentHoldings - Current portfolio holdings with cost basis data.
 * @param marginalTaxRate - Client's marginal federal tax rate (0-1).
 * @param stateTaxRate - Client's state tax rate (0-1).
 * @returns A TaxTransitionAnalysis with strategy comparisons and recommendation.
 */
export function analyzeTaxTransition(
  currentHoldings: Holding[],
  marginalTaxRate?: number,
  stateTaxRate?: number,
): TaxTransitionAnalysis {
  const mRate = marginalTaxRate ?? FEDERAL_SHORT_TERM_RATE;
  const sRate = stateTaxRate ?? DEFAULT_STATE_RATE;

  let totalGains = 0;
  let totalLosses = 0;

  for (const h of currentHoldings) {
    const gl = computeGainLoss(h);
    if (gl >= 0) totalGains += gl;
    else totalLosses += Math.abs(gl);
  }

  const strategies: TransitionStrategyResult[] = [
    analyzeFullLiquidation(currentHoldings, mRate, sRate),
    analyzePhased3Year(currentHoldings, mRate, sRate),
    analyzeHarvestFirst(currentHoldings, mRate, sRate),
  ];

  // Pick recommended strategy
  let recommended: TransitionStrategy;
  let reason: string;

  if (totalLosses > totalGains * 0.5) {
    recommended = 'HARVEST_FIRST';
    reason = 'Significant unrealized losses present an immediate tax-loss harvesting opportunity before transitioning gain positions.';
  } else if (totalGains > 100000) {
    recommended = 'PHASED_3_YEAR';
    reason = 'Large unrealized gains warrant a phased approach to manage annual tax bracket impact.';
  } else {
    recommended = 'FULL_LIQUIDATION';
    reason = 'Modest gains allow a clean transition to the target portfolio with manageable tax impact.';
  }

  return {
    strategies,
    recommendedStrategy: recommended,
    recommendationReason: reason,
    totalUnrealizedGains: totalGains,
    totalUnrealizedLosses: totalLosses,
    netUnrealized: totalGains - totalLosses,
    effectiveTaxRate: Math.round((mRate + NIIT_RATE + sRate) * 10000) / 10000,
  };
}
