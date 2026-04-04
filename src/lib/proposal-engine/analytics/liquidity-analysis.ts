/**
 * Portfolio Liquidity Analysis
 *
 * Analyzes portfolio liquidity based on asset class, trading volume,
 * redemption restrictions, and market depth. Assigns holdings to liquidity
 * tiers and estimates days-to-liquidate for various portfolio percentages.
 */

import type { Holding, AssetClass, MoneyCents } from '../types';

// ============================================================================
// Types
// ============================================================================

export type LiquidityTier =
  | 'IMMEDIATE'
  | 'T_PLUS_1'
  | 'T_PLUS_3'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'LOCKED';

export interface LiquidityAnalysis {
  overallScore: number; // 1-100 (100 = most liquid)
  overallLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'ILLIQUID';
  liquidityTiers: Array<{
    tier: LiquidityTier;
    value: MoneyCents;
    pct: number; // 0-100
    holdings: string[]; // tickers
  }>;
  daysToLiquidate: {
    pct25: number; // days to liquidate 25% of portfolio
    pct50: number;
    pct75: number;
    pct100: number;
  };
  illiquidHoldings: Array<{
    ticker: string | null;
    description: string;
    value: MoneyCents;
    reason: string;
  }>;
  cashReserveAdequacy: {
    currentCashPct: number;
    recommendedCashPct: number;
    adequate: boolean;
  };
}

interface EnrichedHolding extends Holding {
  avgVolume?: number;
}

// ============================================================================
// Constants
// ============================================================================

const RECOMMENDED_CASH_RESERVE_PCT = 5; // 5% minimum cash reserve

const LIQUIDITY_TIER_SCORES: Record<LiquidityTier, number> = {
  IMMEDIATE: 100,
  T_PLUS_1: 90,
  T_PLUS_3: 70,
  WEEKLY: 50,
  MONTHLY: 30,
  QUARTERLY: 10,
  LOCKED: 0,
};

const TIER_LIQUIDATION_DAYS: Record<LiquidityTier, number> = {
  IMMEDIATE: 0,
  T_PLUS_1: 1,
  T_PLUS_3: 3,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  LOCKED: 365, // Conservative estimate
};

// ============================================================================
// Core Analysis Function
// ============================================================================

/**
 * Analyze portfolio liquidity
 */
export function analyzeLiquidity(
  holdings: Holding[],
  enrichments?: Map<string, { avgVolume?: number }>
): LiquidityAnalysis {
  // Enrich holdings with volume data if available
  const enrichedHoldings: EnrichedHolding[] = holdings.map(h => ({
    ...h,
    avgVolume: h.ticker ? enrichments?.get(h.ticker)?.avgVolume : undefined,
  }));

  // Assign liquidity tiers
  const holdingsWithTiers = enrichedHoldings.map(h => ({
    holding: h,
    tier: assignLiquidityTier(h),
  }));

  // Calculate total portfolio value
  const totalValue = enrichedHoldings.reduce((sum, h) => sum + (h.marketValue as number), 0);

  // Group by tier
  const tierMap = new Map<LiquidityTier, { value: number; holdings: string[] }>();
  for (const { holding, tier } of holdingsWithTiers) {
    const existing = tierMap.get(tier) || { value: 0, holdings: [] };
    existing.value += (holding.marketValue as number);
    if (holding.ticker) existing.holdings.push(holding.ticker);
    tierMap.set(tier, existing);
  }

  // Build liquidity tiers array
  const liquidityTiers = Array.from(tierMap.entries()).map(([tier, data]) => ({
    tier,
    value: data.value as MoneyCents,
    pct: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    holdings: data.holdings,
  }));

  // Sort by tier (most liquid first)
  liquidityTiers.sort((a, b) => LIQUIDITY_TIER_SCORES[b.tier] - LIQUIDITY_TIER_SCORES[a.tier]);

  // Calculate overall score (weighted by value)
  const overallScore = calculateOverallScore(liquidityTiers, totalValue);
  const overallLabel = scoreToLabel(overallScore);

  // Calculate days to liquidate
  const daysToLiquidate = calculateDaysToLiquidate(liquidityTiers, totalValue);

  // Identify illiquid holdings
  const illiquidHoldings = holdingsWithTiers
    .filter(({ tier }) => tier === 'QUARTERLY' || tier === 'LOCKED')
    .map(({ holding, tier }) => ({
      ticker: holding.ticker,
      description: holding.description,
      value: holding.marketValue as MoneyCents,
      reason: getIlliquidityReason(holding.assetClass, tier),
    }));

  // Assess cash reserve adequacy
  const cashReserveAdequacy = assessCashReserve(enrichedHoldings, totalValue);

  return {
    overallScore,
    overallLabel,
    liquidityTiers,
    daysToLiquidate,
    illiquidHoldings,
    cashReserveAdequacy,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

function assignLiquidityTier(holding: EnrichedHolding): LiquidityTier {
  const { assetClass, avgVolume, quantity } = holding;

  // Cash and cash equivalents — immediate
  if (assetClass === 'CASH' || assetClass === 'CASH_EQUIVALENT') {
    return 'IMMEDIATE';
  }

  // Large cap equities and government bonds — T+1
  if (
    assetClass === 'EQUITY_US_LARGE' ||
    assetClass === 'FIXED_INCOME_GOVT'
  ) {
    return 'T_PLUS_1';
  }

  // Mid/small cap equities, corporate bonds — T+3
  if (
    assetClass === 'EQUITY_US_MID' ||
    assetClass === 'EQUITY_US_SMALL' ||
    assetClass === 'FIXED_INCOME_CORP' ||
    assetClass === 'EQUITY_INTL_DEVELOPED'
  ) {
    return 'T_PLUS_3';
  }

  // Emerging markets, real estate — weekly
  if (
    assetClass === 'EQUITY_INTL_EMERGING' ||
    assetClass === 'REAL_ESTATE'
  ) {
    // Check volume if available — large positions may take longer
    if (avgVolume && quantity > avgVolume * 0.1) {
      return 'MONTHLY';
    }
    return 'WEEKLY';
  }

  // Private equity, hedge funds — quarterly or locked
  if (
    assetClass === 'ALTERNATIVE_PE' ||
    assetClass === 'ALTERNATIVE_HEDGE'
  ) {
    return 'QUARTERLY';
  }

  // Default to weekly for anything else
  return 'WEEKLY';
}

function calculateOverallScore(
  tiers: Array<{ tier: LiquidityTier; value: number }>,
  totalValue: number
): number {
  if (totalValue === 0) return 0;

  const weightedScore = tiers.reduce((sum, tier) => {
    const weight = tier.value / totalValue;
    const tierScore = LIQUIDITY_TIER_SCORES[tier.tier];
    return sum + weight * tierScore;
  }, 0);

  return Math.round(weightedScore);
}

function scoreToLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'ILLIQUID' {
  if (score >= 80) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'ILLIQUID';
}

function calculateDaysToLiquidate(
  tiers: Array<{ tier: LiquidityTier; value: number; pct: number }>,
  totalValue: number
): {
  pct25: number;
  pct50: number;
  pct75: number;
  pct100: number;
} {
  if (totalValue === 0) {
    return { pct25: 0, pct50: 0, pct75: 0, pct100: 0 };
  }

  // Sort by liquidity (most liquid first)
  const sortedTiers = [...tiers].sort(
    (a, b) => LIQUIDITY_TIER_SCORES[b.tier] - LIQUIDITY_TIER_SCORES[a.tier]
  );

  let cumulativeValue = 0;
  let pct25 = 0;
  let pct50 = 0;
  let pct75 = 0;
  let pct100 = 0;

  for (const tier of sortedTiers) {
    cumulativeValue += tier.value;
    const cumulativePct = (cumulativeValue / totalValue) * 100;
    const days = TIER_LIQUIDATION_DAYS[tier.tier];

    if (cumulativePct >= 25 && pct25 === 0) pct25 = days;
    if (cumulativePct >= 50 && pct50 === 0) pct50 = days;
    if (cumulativePct >= 75 && pct75 === 0) pct75 = days;
    pct100 = Math.max(pct100, days);
  }

  return { pct25, pct50, pct75, pct100 };
}

function assessCashReserve(
  holdings: EnrichedHolding[],
  totalValue: number
): {
  currentCashPct: number;
  recommendedCashPct: number;
  adequate: boolean;
} {
  const cashValue = holdings
    .filter(h => h.assetClass === 'CASH' || h.assetClass === 'CASH_EQUIVALENT')
    .reduce((sum, h) => sum + (h.marketValue as number), 0);

  const currentCashPct = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
  const recommendedCashPct = RECOMMENDED_CASH_RESERVE_PCT;
  const adequate = currentCashPct >= recommendedCashPct;

  return {
    currentCashPct: Math.round(currentCashPct * 10) / 10,
    recommendedCashPct,
    adequate,
  };
}

function getIlliquidityReason(assetClass: AssetClass, tier: LiquidityTier): string {
  if (assetClass === 'ALTERNATIVE_PE') {
    return 'Private equity investment with quarterly redemption windows';
  }
  if (assetClass === 'ALTERNATIVE_HEDGE') {
    return 'Hedge fund with redemption restrictions';
  }
  if (tier === 'LOCKED') {
    return 'Locked investment with no near-term liquidity';
  }
  if (tier === 'QUARTERLY') {
    return 'Quarterly redemption schedule';
  }
  return 'Illiquid asset class';
}

// ============================================================================
// Exports
// ============================================================================

export {
  assignLiquidityTier,
  calculateOverallScore,
  scoreToLabel,
  LIQUIDITY_TIER_SCORES,
  TIER_LIQUIDATION_DAYS,
  RECOMMENDED_CASH_RESERVE_PCT,
};
