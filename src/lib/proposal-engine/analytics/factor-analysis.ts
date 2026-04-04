/**
 * Fama-French Factor Exposure Analysis
 *
 * Analyzes portfolio exposure to standard risk factors (Market, Size, Value,
 * Momentum, Quality, Low Volatility) using holding-level enrichments.
 */

import type { Holding, MoneyCents } from '@/lib/proposal-engine/types'

export interface HoldingEnrichment {
  beta?: number
  marketCap?: number // in cents
  peRatio?: number
  pbRatio?: number
  dividendYield?: number // decimal (e.g., 0.025)
  momentum12m?: number // decimal return (e.g., 0.15)
  roe?: number // return on equity, decimal
  volatility?: number // annualized volatility, decimal
}

export type FactorType = 'MARKET' | 'SIZE' | 'VALUE' | 'MOMENTUM' | 'QUALITY' | 'LOW_VOLATILITY'

export interface FactorExposure {
  factor: FactorType
  exposure: number // coefficient (-2 to +2 typical)
  tStatistic: number
  significant: boolean // |t| > 1.96
  label: string // human-readable summary
  contribution: number // estimated return contribution in bps
}

export interface FactorAnalysis {
  factors: FactorExposure[]
  stylebox: {
    size: 'LARGE' | 'MID' | 'SMALL'
    style: 'VALUE' | 'BLEND' | 'GROWTH'
  }
  rSquared: number // how well factors explain returns (0-1)
  unexplainedReturn: number // alpha estimate in bps
  factorTilts: string[] // human-readable summary of significant tilts
}

/**
 * Analyzes portfolio factor exposures
 */
export function analyzeFactors(
  holdings: Holding[],
  enrichments?: Map<string, HoldingEnrichment>
): FactorAnalysis {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0)

  if (totalValue === 0) {
    return createEmptyAnalysis()
  }

  // Calculate weighted averages for factor estimation
  const weightedStats = calculateWeightedStats(holdings, enrichments, totalValue)

  // Estimate factor exposures
  const marketExposure = estimateMarketExposure(weightedStats)
  const sizeExposure = estimateSizeExposure(weightedStats)
  const valueExposure = estimateValueExposure(weightedStats)
  const momentumExposure = estimateMomentumExposure(weightedStats)
  const qualityExposure = estimateQualityExposure(weightedStats)
  const lowVolExposure = estimateLowVolExposure(weightedStats)

  const factors: FactorExposure[] = [
    marketExposure,
    sizeExposure,
    valueExposure,
    momentumExposure,
    qualityExposure,
    lowVolExposure,
  ]

  // Determine style box
  const stylebox = determineStyleBox(weightedStats)

  // Estimate R-squared (simplified model)
  const rSquared = estimateRSquared(factors)

  // Calculate unexplained return (alpha estimate)
  const unexplainedReturn = estimateAlpha(factors, weightedStats)

  // Generate human-readable factor tilt descriptions
  const factorTilts = generateFactorTilts(factors)

  return {
    factors,
    stylebox,
    rSquared,
    unexplainedReturn,
    factorTilts,
  }
}

interface WeightedStats {
  avgBeta: number
  avgMarketCap: number
  avgPB: number
  avgPE: number
  avgMomentum: number
  avgROE: number
  avgVolatility: number
  avgDividendYield: number
}

function calculateWeightedStats(
  holdings: Holding[],
  enrichments: Map<string, HoldingEnrichment> | undefined,
  totalValue: number
): WeightedStats {
  let sumBeta = 0
  let sumMarketCap = 0
  let sumPB = 0
  let sumPE = 0
  let sumMomentum = 0
  let sumROE = 0
  let sumVolatility = 0
  let sumDividendYield = 0

  let countBeta = 0
  let countMarketCap = 0
  let countPB = 0
  let countPE = 0
  let countMomentum = 0
  let countROE = 0
  let countVolatility = 0
  let countDividendYield = 0

  for (const holding of holdings) {
    const weight = holding.marketValue / totalValue
    const enrichment = holding.ticker ? enrichments?.get(holding.ticker) : undefined

    if (enrichment?.beta !== undefined) {
      sumBeta += enrichment.beta * weight
      countBeta += weight
    }
    if (enrichment?.marketCap !== undefined) {
      sumMarketCap += enrichment.marketCap * weight
      countMarketCap += weight
    }
    if (enrichment?.pbRatio !== undefined) {
      sumPB += enrichment.pbRatio * weight
      countPB += weight
    }
    if (enrichment?.peRatio !== undefined) {
      sumPE += enrichment.peRatio * weight
      countPE += weight
    }
    if (enrichment?.momentum12m !== undefined) {
      sumMomentum += enrichment.momentum12m * weight
      countMomentum += weight
    }
    if (enrichment?.roe !== undefined) {
      sumROE += enrichment.roe * weight
      countROE += weight
    }
    if (enrichment?.volatility !== undefined) {
      sumVolatility += enrichment.volatility * weight
      countVolatility += weight
    }
    if (enrichment?.dividendYield !== undefined) {
      sumDividendYield += enrichment.dividendYield * weight
      countDividendYield += weight
    }
  }

  return {
    avgBeta: countBeta > 0 ? sumBeta / countBeta : 1.0,
    avgMarketCap: countMarketCap > 0 ? sumMarketCap / countMarketCap : 50_000_000_000_00, // default 50B
    avgPB: countPB > 0 ? sumPB / countPB : 2.5,
    avgPE: countPE > 0 ? sumPE / countPE : 18,
    avgMomentum: countMomentum > 0 ? sumMomentum / countMomentum : 0,
    avgROE: countROE > 0 ? sumROE / countROE : 0.12,
    avgVolatility: countVolatility > 0 ? sumVolatility / countVolatility : 0.18,
    avgDividendYield: countDividendYield > 0 ? sumDividendYield / countDividendYield : 0.02,
  }
}

function estimateMarketExposure(stats: WeightedStats): FactorExposure {
  const exposure = stats.avgBeta
  const tStatistic = (exposure - 1.0) * 5 // simplified t-stat estimation
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral market exposure'
  if (exposure > 1.2) label = 'High market sensitivity'
  else if (exposure > 1.05) label = 'Above-market sensitivity'
  else if (exposure < 0.8) label = 'Low market sensitivity'
  else if (exposure < 0.95) label = 'Below-market sensitivity'

  return {
    factor: 'MARKET',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round((exposure - 1.0) * 700 * 100), // bps
  }
}

function estimateSizeExposure(stats: WeightedStats): FactorExposure {
  // Large cap = negative size exposure, small cap = positive
  const marketCapB = stats.avgMarketCap / 100_000_000_00 // convert cents to billions

  let exposure = 0
  if (marketCapB > 50) exposure = -0.5
  else if (marketCapB > 10) exposure = -0.2
  else if (marketCapB > 2) exposure = 0.1
  else exposure = 0.6

  const tStatistic = exposure * 3.5
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral size tilt'
  if (exposure > 0.4) label = 'Strong small-cap tilt'
  else if (exposure > 0.15) label = 'Moderate small-cap tilt'
  else if (exposure < -0.3) label = 'Strong large-cap tilt'
  else if (exposure < -0.1) label = 'Moderate large-cap tilt'

  return {
    factor: 'SIZE',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round(exposure * 150 * 100), // SMB premium ~1.5% historically
  }
}

function estimateValueExposure(stats: WeightedStats): FactorExposure {
  // Low P/B = positive value exposure
  const exposure = (2.5 - stats.avgPB) / 2.5
  const tStatistic = exposure * 4
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral value tilt'
  if (exposure > 0.5) label = 'Strong value tilt'
  else if (exposure > 0.2) label = 'Moderate value tilt'
  else if (exposure < -0.5) label = 'Strong growth tilt'
  else if (exposure < -0.2) label = 'Moderate growth tilt'

  return {
    factor: 'VALUE',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round(exposure * 300 * 100), // HML premium ~3% historically
  }
}

function estimateMomentumExposure(stats: WeightedStats): FactorExposure {
  const exposure = stats.avgMomentum / 0.15 // normalize to typical range
  const tStatistic = exposure * 3
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral momentum'
  if (exposure > 0.5) label = 'Strong momentum tilt'
  else if (exposure > 0.2) label = 'Moderate momentum tilt'
  else if (exposure < -0.5) label = 'Strong contrarian tilt'
  else if (exposure < -0.2) label = 'Moderate contrarian tilt'

  return {
    factor: 'MOMENTUM',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round(exposure * 400 * 100), // UMD premium ~4% historically
  }
}

function estimateQualityExposure(stats: WeightedStats): FactorExposure {
  const exposure = (stats.avgROE - 0.12) / 0.12
  const tStatistic = exposure * 3.5
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral quality'
  if (exposure > 0.5) label = 'Strong quality tilt'
  else if (exposure > 0.2) label = 'Moderate quality tilt'
  else if (exposure < -0.3) label = 'Lower quality tilt'

  return {
    factor: 'QUALITY',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round(exposure * 200 * 100), // QMJ premium ~2% historically
  }
}

function estimateLowVolExposure(stats: WeightedStats): FactorExposure {
  // Low beta/volatility = positive low-vol exposure
  const exposure = (0.18 - stats.avgVolatility) / 0.18
  const tStatistic = exposure * 3
  const significant = Math.abs(tStatistic) > 1.96

  let label = 'Neutral volatility'
  if (exposure > 0.3) label = 'Strong low-volatility tilt'
  else if (exposure > 0.15) label = 'Moderate low-volatility tilt'
  else if (exposure < -0.3) label = 'High-volatility tilt'

  return {
    factor: 'LOW_VOLATILITY',
    exposure,
    tStatistic,
    significant,
    label,
    contribution: Math.round(exposure * 250 * 100), // low-vol premium ~2.5%
  }
}

function determineStyleBox(stats: WeightedStats): FactorAnalysis['stylebox'] {
  const marketCapB = stats.avgMarketCap / 100_000_000_00

  let size: 'LARGE' | 'MID' | 'SMALL'
  if (marketCapB > 10) size = 'LARGE'
  else if (marketCapB > 2) size = 'MID'
  else size = 'SMALL'

  let style: 'VALUE' | 'BLEND' | 'GROWTH'
  if (stats.avgPB < 1.5) style = 'VALUE'
  else if (stats.avgPB > 3.5) style = 'GROWTH'
  else style = 'BLEND'

  return { size, style }
}

function estimateRSquared(factors: FactorExposure[]): number {
  // Simplified: sum of squared significant factor exposures
  const sumSquaredExposures = factors
    .filter(f => f.significant)
    .reduce((sum, f) => sum + f.exposure * f.exposure, 0)

  // Cap at 0.95
  return Math.min(0.95, sumSquaredExposures / 6)
}

function estimateAlpha(factors: FactorExposure[], stats: WeightedStats): number {
  // Simplified alpha estimate: assume 7% market return, subtract factor contributions
  const marketReturn = 700 // 7% in bps
  const factorContribution = factors.reduce((sum, f) => sum + f.contribution, 0)
  return marketReturn - factorContribution
}

function generateFactorTilts(factors: FactorExposure[]): string[] {
  return factors
    .filter(f => f.significant)
    .sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure))
    .map(f => f.label)
}

function createEmptyAnalysis(): FactorAnalysis {
  return {
    factors: [],
    stylebox: { size: 'MID', style: 'BLEND' },
    rSquared: 0,
    unexplainedReturn: 0,
    factorTilts: [],
  }
}
