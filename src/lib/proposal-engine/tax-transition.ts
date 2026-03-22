// =============================================================================
// Farther Portfolio Proposal Engine -- Tax Transition Analyzer
// =============================================================================
//
// Analyzes the tax impact of transitioning from a current portfolio to a
// proposed portfolio.  Computes 5 distinct strategies with full cost
// breakdowns and recommends the optimal approach based on the client's
// tax situation.
//
// Strategies:
//   1. Full Liquidation     -- Sell everything now, realize all gains
//   2. Phased 3-Year        -- Spread gains over 3 tax years using bracket headroom
//   3. Harvest First        -- Realize losses first, then offset gains
//   4. Direct Indexing      -- Estimate annual tax alpha from DI overlay
//   5. Hold in Place        -- $0 tax, gradual alignment via new contributions
//
// All monetary values are in cents (MoneyCents).
// =============================================================================

import type {
  TaxTransitionAnalysis,
  TransitionStrategyResult,
  TransitionStrategy,
  Holding,
} from './types';
import type { MoneyCents } from '../tax-planning/types';

// =====================================================================
// Public API
// =====================================================================

/**
 * Compute tax transition analysis with all 5 strategies.
 */
export function computeTaxTransition(params: {
  currentHoldings: Holding[];
  taxableAccountOnly: boolean;
  federalCGRate: number;          // e.g. 0.20 for 20%
  niitRate: number;               // e.g. 0.038 for 3.8% NIIT
  stateRate: number;              // e.g. 0.025 for 2.5%
  marginalOrdinaryRate: number;   // for short-term gains
  bracketHeadroom: MoneyCents;    // room in current bracket
  filingStatus: string;
}): TaxTransitionAnalysis {
  const {
    currentHoldings,
    taxableAccountOnly,
    federalCGRate,
    niitRate,
    stateRate,
    marginalOrdinaryRate,
    bracketHeadroom,
  } = params;

  // Filter to taxable account holdings only if specified
  const holdings = taxableAccountOnly
    ? currentHoldings.filter(
        (h) => !h.accountType || h.accountType === 'TAXABLE',
      )
    : currentHoldings;

  // Compute unrealized gains/losses
  const { totalGains, totalLosses, shortTermGainsTotal, longTermGainsTotal, gainHoldings, lossHoldings } =
    categorizeHoldings(holdings);

  const netUnrealized = totalGains + totalLosses; // losses are negative
  const effectiveLTRate = federalCGRate + niitRate + stateRate;
  const effectiveSTRate = marginalOrdinaryRate + niitRate + stateRate;

  // Compute total cost basis and market value
  let totalCostBasis = 0;
  let totalMarketValue = 0;
  for (const h of holdings) {
    totalMarketValue += h.marketValue as number;
    if (h.costBasis !== null && h.costBasis !== undefined) {
      totalCostBasis += h.costBasis as number;
    }
  }

  // Compute all 5 strategies
  const strategies: TransitionStrategyResult[] = [
    computeFullLiquidation(
      holdings,
      gainHoldings,
      lossHoldings,
      totalGains,
      totalLosses,
      federalCGRate,
      niitRate,
      stateRate,
      effectiveLTRate,
      effectiveSTRate,
      totalMarketValue,
    ),
    computePhased3Year(
      holdings,
      gainHoldings,
      lossHoldings,
      totalGains,
      totalLosses,
      federalCGRate,
      niitRate,
      stateRate,
      effectiveLTRate,
      effectiveSTRate,
      bracketHeadroom as number,
      totalMarketValue,
    ),
    computeHarvestFirst(
      holdings,
      gainHoldings,
      lossHoldings,
      totalGains,
      totalLosses,
      federalCGRate,
      niitRate,
      stateRate,
      effectiveLTRate,
      effectiveSTRate,
      totalMarketValue,
    ),
    computeDirectIndexing(
      holdings,
      totalGains,
      totalLosses,
      federalCGRate,
      niitRate,
      stateRate,
      effectiveLTRate,
      totalMarketValue,
    ),
    computeHoldInPlace(holdings, totalMarketValue),
  ];

  // Determine recommended strategy
  const { recommendedStrategy, recommendationRationale } = determineRecommendation(
    strategies,
    totalGains,
    totalLosses,
    bracketHeadroom as number,
    holdings,
  );

  return {
    totalCostBasis: Math.round(totalCostBasis) as MoneyCents,
    currentMarketValue: Math.round(totalMarketValue) as MoneyCents,
    totalUnrealizedGain: Math.round(totalGains) as MoneyCents,
    totalUnrealizedGains: totalGains,
    totalUnrealizedLoss: Math.round(Math.abs(totalLosses)) as MoneyCents,
    totalUnrealizedLosses: Math.abs(totalLosses),
    netUnrealized,
    shortTermGains: Math.round(shortTermGainsTotal) as MoneyCents,
    longTermGains: Math.round(longTermGainsTotal) as MoneyCents,
    effectiveTaxRate: Math.round(effectiveLTRate * 10000) / 10000,
    strategies,
    recommendedStrategy,
    recommendationRationale,
    recommendationReason: recommendationRationale,
  };
}

/**
 * Convenience wrapper that matches the simpler call signature used by the
 * route layer.  Derives full tax params from marginal + state rates.
 */
export function analyzeTaxTransition(
  currentHoldings: Holding[],
  marginalTaxRate?: number,
  stateTaxRate?: number,
): TaxTransitionAnalysis {
  const marginal = marginalTaxRate ?? 0.37;
  const state = stateTaxRate ?? 0.05;

  return computeTaxTransition({
    currentHoldings,
    taxableAccountOnly: false,
    federalCGRate: 0.20,
    niitRate: 0.038,
    stateRate: state,
    marginalOrdinaryRate: marginal,
    bracketHeadroom: 5_000_000 as MoneyCents, // $50K default headroom
    filingStatus: 'MFJ',
  });
}

// =====================================================================
// Holding Categorization
// =====================================================================

interface CategorizedHoldings {
  totalGains: number;
  totalLosses: number;
  shortTermGainsTotal: number;
  longTermGainsTotal: number;
  gainHoldings: Array<Holding & { gainLoss: number }>;
  lossHoldings: Array<Holding & { gainLoss: number }>;
}

function categorizeHoldings(holdings: Holding[]): CategorizedHoldings {
  let totalGains = 0;
  let totalLosses = 0;
  let shortTermGainsTotal = 0;
  let longTermGainsTotal = 0;
  const gainHoldings: Array<Holding & { gainLoss: number }> = [];
  const lossHoldings: Array<Holding & { gainLoss: number }> = [];

  for (const h of holdings) {
    if (h.costBasis === undefined || h.costBasis === null) {
      continue;
    }
    const gainLoss = (h.marketValue as number) - (h.costBasis as number);
    if (gainLoss > 0) {
      totalGains += gainLoss;
      if (h.holdingPeriod === 'SHORT') {
        shortTermGainsTotal += gainLoss;
      } else {
        longTermGainsTotal += gainLoss;
      }
      gainHoldings.push({ ...h, gainLoss });
    } else if (gainLoss < 0) {
      totalLosses += gainLoss; // negative
      lossHoldings.push({ ...h, gainLoss });
    }
  }

  gainHoldings.sort((a, b) => b.gainLoss - a.gainLoss);
  lossHoldings.sort((a, b) => a.gainLoss - b.gainLoss);

  return { totalGains, totalLosses, shortTermGainsTotal, longTermGainsTotal, gainHoldings, lossHoldings };
}

// =====================================================================
// Helper: get number of shares from Holding (quantity or shares alias)
// =====================================================================

function getShares(h: Holding): number {
  return h.shares ?? h.quantity;
}

// =====================================================================
// Strategy 1: Full Liquidation
// =====================================================================

function computeFullLiquidation(
  allHoldings: Holding[],
  gainHoldings: Array<Holding & { gainLoss: number }>,
  _lossHoldings: Array<Holding & { gainLoss: number }>,
  totalGains: number,
  totalLosses: number,
  federalCGRate: number,
  niitRate: number,
  stateRate: number,
  ltRate: number,
  stRate: number,
  totalMarketValue: number,
): TransitionStrategyResult {
  let shortTermGains = 0;
  let longTermGains = 0;
  const lossesHarvested = Math.abs(totalLosses);

  for (const h of gainHoldings) {
    if (h.holdingPeriod === 'SHORT') {
      shortTermGains += h.gainLoss;
    } else {
      longTermGains += h.gainLoss;
    }
  }

  // Net gains after offsetting losses
  const grossGains = shortTermGains + longTermGains;
  const netGains = Math.max(0, grossGains + totalLosses);

  // Apply losses against short-term first (higher rate)
  let taxableShortTerm = shortTermGains;
  let taxableLongTerm = longTermGains;
  let lossOffset = Math.abs(totalLosses);

  if (lossOffset > 0 && taxableShortTerm > 0) {
    const stOffset = Math.min(lossOffset, taxableShortTerm);
    taxableShortTerm -= stOffset;
    lossOffset -= stOffset;
  }
  if (lossOffset > 0 && taxableLongTerm > 0) {
    const ltOffset = Math.min(lossOffset, taxableLongTerm);
    taxableLongTerm -= ltOffset;
    lossOffset -= ltOffset;
  }

  const federalCGTax = Math.round(taxableLongTerm * federalCGRate + taxableShortTerm * federalCGRate);
  const niitTax = Math.round((taxableLongTerm + taxableShortTerm) * niitRate);
  const stateTax = Math.round((taxableLongTerm + taxableShortTerm) * stateRate);
  const taxCost = Math.round(
    taxableShortTerm * stRate + taxableLongTerm * ltRate,
  );

  const netProceeds = Math.round(totalMarketValue - taxCost);

  const holdingActions = allHoldings.map((h) => {
    const gainLoss =
      h.costBasis !== undefined && h.costBasis !== null
        ? (h.marketValue as number) - (h.costBasis as number)
        : 0;
    const isShortTerm = h.holdingPeriod === 'SHORT';
    const rate = isShortTerm ? stRate : ltRate;
    const holdingTax = gainLoss > 0 ? Math.round(gainLoss * rate) : 0;

    return {
      ticker: h.ticker,
      action: 'SELL' as const,
      shares: getShares(h),
      gainLoss,
      taxCost: gainLoss < 0 ? 0 : holdingTax,
    };
  });

  return {
    strategy: 'FULL_LIQUIDATION',
    label: 'Full Liquidation',
    strategyName: 'Full Liquidation',
    description: 'Sell all current holdings immediately, realize all gains and losses, and reinvest in the proposed portfolio.',
    estimatedTaxCost: taxCost,
    federalCGTax: federalCGTax as MoneyCents,
    niitTax: niitTax as MoneyCents,
    stateTax: stateTax as MoneyCents,
    netProceeds: netProceeds as MoneyCents,
    alignmentPct: 100,
    timeToComplete: 1,
    timelineYears: 0,
    shortTermGains,
    longTermGains,
    lossesHarvested,
    netGains,
    holdingActions,
    pros: [
      'Immediate full alignment to proposed portfolio',
      'Clean slate for ongoing tax management',
      'Losses offset gains in the same tax year',
    ],
    cons: [
      `Immediate tax bill of $${(taxCost / 100).toLocaleString()}`,
      'May push client into a higher tax bracket',
      'Wash sale rules apply if repurchasing similar securities within 30 days',
    ],
  };
}

// =====================================================================
// Strategy 2: Phased 3-Year Transition
// =====================================================================

function computePhased3Year(
  allHoldings: Holding[],
  gainHoldings: Array<Holding & { gainLoss: number }>,
  _lossHoldings: Array<Holding & { gainLoss: number }>,
  totalGains: number,
  totalLosses: number,
  federalCGRate: number,
  niitRate: number,
  stateRate: number,
  ltRate: number,
  _stRate: number,
  bracketHeadroom: number,
  totalMarketValue: number,
): TransitionStrategyResult {
  const lossesHarvested = Math.abs(totalLosses);
  let remainingGains = totalGains;
  let totalTaxCost = 0;
  let totalFederalCGTax = 0;
  let totalNiitTax = 0;
  let totalStateTax = 0;
  const yearlyGainBudget = Math.max(bracketHeadroom, 0);

  const yearlyBreakdown: Array<{
    year: number;
    gainsRealized: number;
    taxCost: number;
    bracketHeadroomUsed: number;
  }> = [];

  // Year 1: harvest losses + realize gains up to headroom + loss offset
  const year1LossOffset = lossesHarvested;
  const year1GainBudget = yearlyGainBudget + year1LossOffset;
  const year1Gains = Math.min(remainingGains, year1GainBudget);
  const year1TaxableGains = Math.max(0, year1Gains - year1LossOffset);
  const year1Tax = Math.round(year1TaxableGains * ltRate);
  remainingGains -= year1Gains;
  totalTaxCost += year1Tax;
  totalFederalCGTax += Math.round(year1TaxableGains * federalCGRate);
  totalNiitTax += Math.round(year1TaxableGains * niitRate);
  totalStateTax += Math.round(year1TaxableGains * stateRate);

  yearlyBreakdown.push({
    year: 1,
    gainsRealized: year1Gains,
    taxCost: year1Tax,
    bracketHeadroomUsed: Math.min(yearlyGainBudget, year1Gains),
  });

  // Years 2 and 3
  for (let y = 2; y <= 3; y++) {
    if (remainingGains <= 0) {
      yearlyBreakdown.push({
        year: y,
        gainsRealized: 0,
        taxCost: 0,
        bracketHeadroomUsed: 0,
      });
      continue;
    }

    const yearGains = Math.min(remainingGains, yearlyGainBudget);
    const yearTax = Math.round(yearGains * ltRate);
    remainingGains -= yearGains;
    totalTaxCost += yearTax;
    totalFederalCGTax += Math.round(yearGains * federalCGRate);
    totalNiitTax += Math.round(yearGains * niitRate);
    totalStateTax += Math.round(yearGains * stateRate);

    yearlyBreakdown.push({
      year: y,
      gainsRealized: yearGains,
      taxCost: yearTax,
      bracketHeadroomUsed: Math.min(yearlyGainBudget, yearGains),
    });
  }

  // Remaining gains after 3 years
  if (remainingGains > 0) {
    const remainingTax = Math.round(remainingGains * ltRate);
    totalTaxCost += remainingTax;
    totalFederalCGTax += Math.round(remainingGains * federalCGRate);
    totalNiitTax += Math.round(remainingGains * niitRate);
    totalStateTax += Math.round(remainingGains * stateRate);
  }

  const totalRealized = totalGains - remainingGains;
  const realizationRatio = totalGains > 0 ? totalRealized / totalGains : 0;
  const netProceeds = Math.round(totalMarketValue - totalTaxCost);

  // Alignment % after year 1 (partial transition in progress)
  const year1Pct = totalGains > 0 ? Math.min(100, Math.round((year1Gains / totalGains) * 100)) : 100;
  const alignmentPct = Math.min(100, year1Pct + Math.round((100 - year1Pct) * 0.5));

  const holdingActions = allHoldings.map((h) => {
    const gainLoss =
      h.costBasis !== undefined && h.costBasis !== null
        ? (h.marketValue as number) - (h.costBasis as number)
        : 0;

    if (gainLoss < 0) {
      return {
        ticker: h.ticker,
        action: 'TAX_LOSS_HARVEST' as const,
        shares: getShares(h),
        gainLoss,
        taxCost: 0,
      };
    }

    if (gainLoss > 0 && realizationRatio < 1) {
      const sellShares = Math.round(getShares(h) * realizationRatio);
      return {
        ticker: h.ticker,
        action: 'PARTIAL_SELL' as const,
        shares: sellShares,
        gainLoss: Math.round(gainLoss * realizationRatio),
        taxCost: Math.round(gainLoss * realizationRatio * ltRate),
      };
    }

    return {
      ticker: h.ticker,
      action: 'SELL' as const,
      shares: getShares(h),
      gainLoss,
      taxCost: Math.round(Math.max(0, gainLoss) * ltRate),
    };
  });

  return {
    strategy: 'PHASED_3YEAR',
    label: 'Phased 3-Year Transition',
    strategyName: 'Phased 3-Year Transition',
    description: 'Spread gain realization across 3 tax years, using bracket headroom each year and harvesting available losses in year 1.',
    estimatedTaxCost: totalTaxCost,
    federalCGTax: totalFederalCGTax as MoneyCents,
    niitTax: totalNiitTax as MoneyCents,
    stateTax: totalStateTax as MoneyCents,
    netProceeds: netProceeds as MoneyCents,
    alignmentPct,
    timeToComplete: 36,
    timelineYears: 3,
    shortTermGains: 0,
    longTermGains: totalGains,
    lossesHarvested,
    netGains: Math.max(0, totalGains + totalLosses),
    yearlyBreakdown,
    holdingActions,
    pros: [
      'Spreads tax impact over multiple tax years',
      'Uses bracket headroom efficiently each year',
      'Harvests losses in year 1 for immediate offset',
      'Avoids pushing into higher brackets',
    ],
    cons: [
      'Portfolio remains partially misaligned for up to 3 years',
      'Market risk on unrealized positions during transition',
      'Requires annual monitoring and rebalancing',
      'Total tax cost may be similar or higher if rates increase',
    ],
  };
}

// =====================================================================
// Strategy 3: Harvest First
// =====================================================================

function computeHarvestFirst(
  allHoldings: Holding[],
  gainHoldings: Array<Holding & { gainLoss: number }>,
  _lossHoldings: Array<Holding & { gainLoss: number }>,
  totalGains: number,
  totalLosses: number,
  federalCGRate: number,
  niitRate: number,
  stateRate: number,
  ltRate: number,
  stRate: number,
  totalMarketValue: number,
): TransitionStrategyResult {
  const lossesHarvested = Math.abs(totalLosses);
  const netGainsAfterOffset = Math.max(0, totalGains + totalLosses);

  let remainingLossOffset = lossesHarvested;
  let totalTaxCost = 0;
  let totalFederalCGTax = 0;
  let totalNiitTax = 0;
  let totalStateTax = 0;

  const holdingActions = allHoldings.map((h) => {
    const gainLoss =
      h.costBasis !== undefined && h.costBasis !== null
        ? (h.marketValue as number) - (h.costBasis as number)
        : 0;

    if (gainLoss < 0) {
      return {
        ticker: h.ticker,
        action: 'TAX_LOSS_HARVEST' as const,
        shares: getShares(h),
        gainLoss,
        taxCost: 0,
      };
    }

    if (gainLoss > 0) {
      const offset = Math.min(remainingLossOffset, gainLoss);
      remainingLossOffset -= offset;
      const taxableGain = gainLoss - offset;
      const rate = h.holdingPeriod === 'SHORT' ? stRate : ltRate;
      const taxCost = Math.round(taxableGain * rate);
      totalTaxCost += taxCost;

      // Break down by tax type
      const holdingFederalRate = h.holdingPeriod === 'SHORT' ? federalCGRate : federalCGRate;
      totalFederalCGTax += Math.round(taxableGain * holdingFederalRate);
      totalNiitTax += Math.round(taxableGain * niitRate);
      totalStateTax += Math.round(taxableGain * stateRate);

      return {
        ticker: h.ticker,
        action: 'SELL' as const,
        shares: getShares(h),
        gainLoss,
        taxCost,
      };
    }

    return {
      ticker: h.ticker,
      action: 'SELL' as const,
      shares: getShares(h),
      gainLoss: 0,
      taxCost: 0,
    };
  });

  const shortTermGains = gainHoldings
    .filter((h) => h.holdingPeriod === 'SHORT')
    .reduce((sum, h) => sum + h.gainLoss, 0);
  const longTermGains = gainHoldings
    .filter((h) => h.holdingPeriod !== 'SHORT')
    .reduce((sum, h) => sum + h.gainLoss, 0);

  const netProceeds = Math.round(totalMarketValue - totalTaxCost);

  return {
    strategy: 'HARVEST_FIRST',
    label: 'Harvest Losses First',
    strategyName: 'Harvest Losses First',
    description: 'Realize all available losses first to offset gains, then sell gain positions with the loss offset applied.',
    estimatedTaxCost: totalTaxCost,
    federalCGTax: totalFederalCGTax as MoneyCents,
    niitTax: totalNiitTax as MoneyCents,
    stateTax: totalStateTax as MoneyCents,
    netProceeds: netProceeds as MoneyCents,
    alignmentPct: 100,
    timeToComplete: 2,
    timelineYears: 0,
    shortTermGains,
    longTermGains,
    lossesHarvested,
    netGains: netGainsAfterOffset,
    holdingActions,
    pros: [
      'Maximizes loss offsets against gains',
      'Reduces total tax bill compared to full liquidation',
      'Faster than phased approach',
      `Harvests $${(lossesHarvested / 100).toLocaleString()} in losses`,
    ],
    cons: [
      'Still realizes all gains (net of offsets) immediately',
      'Wash sale rule: cannot repurchase substantially identical securities for 30 days',
      'May still push into higher bracket if net gains are large',
    ],
  };
}

// =====================================================================
// Strategy 4: Direct Indexing
// =====================================================================

function computeDirectIndexing(
  allHoldings: Holding[],
  totalGains: number,
  totalLosses: number,
  federalCGRate: number,
  niitRate: number,
  stateRate: number,
  ltRate: number,
  totalMarketValue: number,
): TransitionStrategyResult {
  // Direct indexing tax alpha: 0.8-1.5% per year, use 1.2% mid-range
  const estimatedTaxAlpha = 0.012;
  const annualTaxSavings = Math.round(totalMarketValue * estimatedTaxAlpha * ltRate);

  // Only ~30% of portfolio needs to transition for DI setup
  const transitionGains = Math.round(totalGains * 0.3);
  const transitionLossOffset = Math.min(
    Math.abs(totalLosses),
    transitionGains,
  );
  const netTransitionGains = Math.max(0, transitionGains - transitionLossOffset);
  const initialTaxCost = Math.round(netTransitionGains * ltRate);

  // Tax breakdown
  const initialFederalCGTax = Math.round(netTransitionGains * federalCGRate);
  const initialNiitTax = Math.round(netTransitionGains * niitRate);
  const initialStateTax = Math.round(netTransitionGains * stateRate);

  // 5-year net benefit
  const fiveYearSavings = annualTaxSavings * 5;
  const netCost = Math.max(0, initialTaxCost - fiveYearSavings);

  const netProceeds = Math.round(totalMarketValue - netCost);

  // Alignment: ~70% immediately (untouched holdings) + 30% transitioned
  const alignmentPct = 85;

  const holdingActions = allHoldings.map((h) => {
    const gainLoss =
      h.costBasis !== undefined && h.costBasis !== null
        ? (h.marketValue as number) - (h.costBasis as number)
        : 0;

    if (h.isSingleStock) {
      return {
        ticker: h.ticker,
        action: 'HOLD' as const,
        gainLoss,
        taxCost: 0,
      };
    }

    return {
      ticker: h.ticker,
      action: 'SELL' as const,
      shares: getShares(h),
      gainLoss,
      taxCost: gainLoss > 0 ? Math.round(gainLoss * 0.3 * ltRate) : 0,
    };
  });

  return {
    strategy: 'DIRECT_INDEXING',
    label: 'Direct Indexing Overlay',
    strategyName: 'Direct Indexing Overlay',
    description: 'Transition ~30% of portfolio to a direct indexing strategy that provides ongoing systematic tax-loss harvesting at the individual security level.',
    estimatedTaxCost: netCost,
    federalCGTax: initialFederalCGTax as MoneyCents,
    niitTax: initialNiitTax as MoneyCents,
    stateTax: initialStateTax as MoneyCents,
    netProceeds: netProceeds as MoneyCents,
    alignmentPct,
    timeToComplete: 6,
    timelineYears: 1,
    shortTermGains: 0,
    longTermGains: transitionGains,
    lossesHarvested: Math.abs(totalLosses) + fiveYearSavings,
    netGains: netTransitionGains,
    holdingActions,
    pros: [
      `Estimated ${(estimatedTaxAlpha * 100).toFixed(1)}% annual tax alpha`,
      `~$${(annualTaxSavings / 100).toLocaleString()} annual tax savings`,
      'Ongoing systematic loss harvesting at individual security level',
      'Maintains broad market exposure while maximizing tax efficiency',
      'Break-even vs full liquidation in ~2-3 years',
    ],
    cons: [
      'Requires minimum portfolio size (typically $250K+)',
      'More complex portfolio management',
      'Tax alpha diminishes over time as cost basis resets',
      'Higher advisory costs may offset some tax benefits',
      'Not suitable for all account types',
    ],
  };
}

// =====================================================================
// Strategy 5: Hold in Place
// =====================================================================

function computeHoldInPlace(
  allHoldings: Holding[],
  totalMarketValue: number,
): TransitionStrategyResult {
  const holdingActions = allHoldings.map((h) => {
    const gainLoss =
      h.costBasis !== undefined && h.costBasis !== null
        ? (h.marketValue as number) - (h.costBasis as number)
        : 0;
    return {
      ticker: h.ticker,
      action: 'HOLD' as const,
      gainLoss,
      taxCost: 0,
    };
  });

  return {
    strategy: 'HOLD_IN_PLACE',
    label: 'Hold in Place (Gradual Alignment)',
    strategyName: 'Hold in Place (Gradual Alignment)',
    description: 'Keep all current holdings with $0 tax cost. Direct new contributions, dividends, and distributions toward the proposed allocation over time.',
    estimatedTaxCost: 0,
    federalCGTax: 0 as MoneyCents,
    niitTax: 0 as MoneyCents,
    stateTax: 0 as MoneyCents,
    netProceeds: Math.round(totalMarketValue) as MoneyCents,
    alignmentPct: 0,
    timeToComplete: 60,
    timelineYears: 5,
    shortTermGains: 0,
    longTermGains: 0,
    lossesHarvested: 0,
    netGains: 0,
    holdingActions,
    pros: [
      '$0 immediate tax cost',
      'No wash sale concerns',
      'New contributions directed to proposed allocation',
      'Dividends and distributions reinvested per proposed model',
      'Most tax-efficient approach in the short term',
    ],
    cons: [
      'Portfolio remains misaligned for years',
      'Cannot capture proposed model benefits immediately',
      'Opportunity cost of holding suboptimal positions',
      'Client may not see improvement for an extended period',
      'Works poorly for large legacy positions with significant drift',
    ],
  };
}

// =====================================================================
// Recommendation Engine
// =====================================================================

function determineRecommendation(
  strategies: TransitionStrategyResult[],
  totalGains: number,
  totalLosses: number,
  bracketHeadroom: number,
  holdings: Holding[],
): { recommendedStrategy: TransitionStrategy; recommendationRationale: string } {
  const netGains = totalGains + totalLosses;
  const lossesAvailable = Math.abs(totalLosses);
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue as number), 0);

  // Case 1: Net losses or very small net gains -- harvest first is essentially free
  if (netGains <= 0) {
    return {
      recommendedStrategy: 'HARVEST_FIRST',
      recommendationRationale:
        'The portfolio has more unrealized losses than gains. Harvesting losses first allows a nearly tax-free transition while generating a loss carryforward for future tax years.',
    };
  }

  // Case 2: Gains fit within bracket headroom over 3 years
  if (netGains <= bracketHeadroom * 3) {
    return {
      recommendedStrategy: 'PHASED_3YEAR',
      recommendationRationale:
        'Net unrealized gains can be spread across 3 tax years within the current bracket headroom, minimizing the tax impact while achieving full portfolio alignment.',
    };
  }

  // Case 3: Significant losses to offset
  if (lossesAvailable > totalGains * 0.3) {
    return {
      recommendedStrategy: 'HARVEST_FIRST',
      recommendationRationale:
        'Significant unrealized losses are available to offset gains. Harvesting losses first reduces the tax bill substantially compared to a full liquidation.',
    };
  }

  // Case 4: Large portfolio suitable for direct indexing ($250K+, $50K+ gains)
  if (totalGains > 5_000_000 && totalValue > 25_000_000) {
    return {
      recommendedStrategy: 'DIRECT_INDEXING',
      recommendationRationale:
        'Given the portfolio size and significant embedded gains, a direct indexing overlay provides ongoing tax alpha that will offset transition costs within 2-3 years.',
    };
  }

  // Case 5: Moderate gains -- phased approach
  if (netGains <= bracketHeadroom * 6) {
    return {
      recommendedStrategy: 'PHASED_3YEAR',
      recommendationRationale:
        'A phased 3-year transition best balances tax efficiency with timely portfolio alignment. Bracket headroom will be utilized each year to minimize the marginal tax rate on gains.',
    };
  }

  // Default: phased approach
  return {
    recommendedStrategy: 'PHASED_3YEAR',
    recommendationRationale:
      'The phased approach provides the best balance of tax efficiency and portfolio alignment. Gains will be spread over 3 years, using bracket headroom and any available loss offsets.',
  };
}
