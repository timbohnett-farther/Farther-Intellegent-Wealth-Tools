/**
 * Portfolio Risk Scoring Engine
 *
 * Per PRD Section 4.1 — Computes security-level and portfolio-level risk scores
 * using weighted volatility, beta, max drawdown, and sector concentration metrics.
 */

import type { Holding, MoneyCents, RiskLabel } from '@/lib/proposal-engine/types';
import { riskScoreToLabel } from '@/lib/proposal-engine/types';

/**
 * Enrichment metadata for risk scoring (from external data sources)
 */
export interface HoldingEnrichment {
  beta?: number;
  stdDev?: number;
  maxDrawdown?: number;
  sector?: string;
}

/**
 * Security-level risk score breakdown
 */
export interface SecurityRiskScore {
  ticker: string;
  score: number; // 1-100
  contribution: number; // Weighted contribution to portfolio score
  components: {
    volatility: number;
    beta: number;
    drawdown: number;
    sector: number;
  };
}

/**
 * Portfolio-level risk score result
 */
export interface PortfolioRiskResult {
  score: number; // 1-100
  label: RiskLabel;
  securityScores: SecurityRiskScore[];
  concentrationPenalty: number;
  correlationBonus: number;
  details: {
    volatilityComponent: number;
    betaComponent: number;
    drawdownComponent: number;
    sectorComponent: number;
  };
}

/**
 * Compute risk score for a single security
 *
 * Formula: Vol (35%) + Beta (25%) + MaxDD (20%) + Sector (20%)
 * All inputs normalized to 1-100 scale before weighting
 */
export function computeSecurityRiskScore(params: {
  volatility: number; // Annualized stdDev (0-1 scale, e.g. 0.15 = 15%)
  beta: number; // Market beta (typically 0-2)
  maxDrawdown: number; // Max drawdown (0-1 scale, e.g. 0.25 = 25% loss)
  sectorConcentration: number; // Sector weight in portfolio (0-1)
}): number {
  // Normalize inputs to 1-100 scale
  const volScore = Math.min(100, params.volatility * 500); // 20% vol = 100
  const betaScore = Math.min(100, (params.beta / 2) * 100); // Beta 2.0 = 100
  const ddScore = Math.min(100, params.maxDrawdown * 200); // 50% drawdown = 100
  const sectorScore = Math.min(100, params.sectorConcentration * 100); // 100% concentration = 100

  // Weighted sum
  const score =
    volScore * 0.35 +
    betaScore * 0.25 +
    ddScore * 0.20 +
    sectorScore * 0.20;

  return Math.round(Math.max(1, Math.min(100, score)));
}

/**
 * Compute portfolio-level risk score with concentration penalty and correlation bonus
 */
export function computePortfolioRiskScore(
  holdings: Holding[],
  enrichments?: Map<string, HoldingEnrichment>
): PortfolioRiskResult {
  if (holdings.length === 0) {
    return {
      score: 1,
      label: 'CONSERVATIVE',
      securityScores: [],
      concentrationPenalty: 0,
      correlationBonus: 0,
      details: {
        volatilityComponent: 0,
        betaComponent: 0,
        drawdownComponent: 0,
        sectorComponent: 0,
      },
    };
  }

  // Calculate total portfolio value
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // Compute security-level scores and weighted portfolio components
  const securityScores: SecurityRiskScore[] = [];
  let portfolioVolComp = 0;
  let portfolioBetaComp = 0;
  let portfolioDrawdownComp = 0;
  let portfolioSectorComp = 0;

  // Track sector allocations for concentration penalty
  const sectorAllocations = new Map<string, number>();

  for (const holding of holdings) {
    const weight = totalValue > 0 ? (holding.marketValue as number) / totalValue : 0;
    const enrichment = holding.ticker ? enrichments?.get(holding.ticker) : undefined;

    // Default fallback values if enrichment missing
    const volatility = enrichment?.stdDev ?? 0.15; // 15% default
    const beta = enrichment?.beta ?? 1.0;
    const maxDrawdown = enrichment?.maxDrawdown ?? 0.20; // 20% default
    const sector = enrichment?.sector ?? 'Unknown';

    // Track sector concentration
    const currentSector = sectorAllocations.get(sector) ?? 0;
    sectorAllocations.set(sector, currentSector + weight);

    const sectorConcentration = (currentSector + weight);

    // Compute security score
    const score = computeSecurityRiskScore({
      volatility,
      beta,
      maxDrawdown,
      sectorConcentration,
    });

    // Weighted contribution to portfolio
    const contribution = score * weight;

    // Component tracking
    const volScore = Math.min(100, volatility * 500);
    const betaScore = Math.min(100, (beta / 2) * 100);
    const ddScore = Math.min(100, maxDrawdown * 200);
    const sectorScore = Math.min(100, sectorConcentration * 100);

    portfolioVolComp += volScore * weight * 0.35;
    portfolioBetaComp += betaScore * weight * 0.25;
    portfolioDrawdownComp += ddScore * weight * 0.20;
    portfolioSectorComp += sectorScore * weight * 0.20;

    securityScores.push({
      ticker: holding.ticker ?? 'UNKNOWN',
      score,
      contribution,
      components: {
        volatility: volScore,
        beta: betaScore,
        drawdown: ddScore,
        sector: sectorScore,
      },
    });
  }

  // Base portfolio score (weighted sum of security scores)
  const baseScore = securityScores.reduce((sum, s) => sum + s.contribution, 0);

  // Concentration penalty (Herfindahl-Hirschman Index)
  const hhi = holdings.reduce((sum, h) => {
    const weight = totalValue > 0 ? (h.marketValue as number) / totalValue : 0;
    return sum + weight * weight;
  }, 0);

  // HHI > 0.15 triggers penalty (scaled 0-10 points)
  const concentrationPenalty = hhi > 0.15 ? Math.min(10, (hhi - 0.15) * 50) : 0;

  // Correlation bonus (estimated from asset class diversity)
  const assetClasses = new Set(holdings.map(h => h.assetClass));
  const diversityRatio = assetClasses.size / Math.max(1, holdings.length);
  const correlationBonus = Math.min(5, diversityRatio * 10); // Up to 5 points

  // Final score
  const finalScore = Math.round(
    Math.max(1, Math.min(100, baseScore + concentrationPenalty - correlationBonus))
  );

  return {
    score: finalScore,
    label: riskScoreToLabel(finalScore),
    securityScores,
    concentrationPenalty,
    correlationBonus,
    details: {
      volatilityComponent: portfolioVolComp,
      betaComponent: portfolioBetaComp,
      drawdownComponent: portfolioDrawdownComp,
      sectorComponent: portfolioSectorComp,
    },
  };
}
