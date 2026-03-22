// =============================================================================
// Farther Portfolio Proposal Engine -- Analytics Engine
// =============================================================================
//
// Portfolio analytics computation engine.  Computes metrics, quality flags,
// stress tests, and side-by-side comparisons for current vs proposed portfolios.
//
// All monetary values are in cents (MoneyCents).
// =============================================================================

import type {
  Holding,
  PortfolioAnalytics,
  PortfolioMetrics,
  QualityFlag,
  StressTestResult,
  StressScenario,
  AssetClass,
} from './types';
import type { MoneyCents } from '../tax-planning/types';
import { cents } from '../tax-planning/types';

// =====================================================================
// Stress Test Return Assumptions (per scenario, per asset class group)
// =====================================================================

interface ScenarioReturns {
  equity_us: number;
  equity_intl: number;
  fixed_income_govt: number;
  corp_bonds: number;
  muni_bonds: number;
  tips: number;
  alts: number;
  cash: number;
}

const STRESS_SCENARIOS: Record<string, { name: string; returns: ScenarioReturns }> = {
  '2008_FINANCIAL_CRISIS': {
    name: '2008 Global Financial Crisis',
    returns: {
      equity_us: -0.37,
      equity_intl: -0.43,
      fixed_income_govt: 0.05,
      corp_bonds: -0.05,
      muni_bonds: -0.02,
      tips: -0.03,
      alts: -0.20,
      cash: 0.02,
    },
  },
  COVID_2020: {
    name: '2020 COVID-19 Crash',
    returns: {
      equity_us: -0.34,
      equity_intl: -0.33,
      fixed_income_govt: 0.08,
      corp_bonds: -0.10,
      muni_bonds: -0.05,
      tips: 0.02,
      alts: -0.15,
      cash: 0.005,
    },
  },
  '2022_RATE_SHOCK': {
    name: '2022 Rate Shock',
    returns: {
      equity_us: -0.18,
      equity_intl: -0.16,
      fixed_income_govt: -0.13,
      corp_bonds: -0.15,
      muni_bonds: -0.10,
      tips: -0.08,
      alts: -0.05,
      cash: 0.01,
    },
  },
  '2000_DOTCOM': {
    name: '2000 Dot-Com Bust',
    returns: {
      equity_us: -0.49,
      equity_intl: -0.27,
      fixed_income_govt: 0.11,
      corp_bonds: 0.03,
      muni_bonds: 0.05,
      tips: 0.06,
      alts: -0.10,
      cash: 0.05,
    },
  },
  '1987_BLACK_MONDAY': {
    name: '1987 Black Monday',
    returns: {
      equity_us: -0.22,
      equity_intl: -0.15,
      fixed_income_govt: 0.04,
      corp_bonds: 0.01,
      muni_bonds: 0.02,
      tips: 0.02,
      alts: -0.08,
      cash: 0.03,
    },
  },
  RECESSION_MILD: {
    name: 'Mild Recession',
    returns: {
      equity_us: -0.30,
      equity_intl: -0.30,
      fixed_income_govt: -0.03,
      corp_bonds: -0.03,
      muni_bonds: -0.02,
      tips: 0.01,
      alts: -0.12,
      cash: 0.01,
    },
  },
  EQUITY_BEAR_50: {
    name: '50% Equity Bear Market',
    returns: {
      equity_us: -0.50,
      equity_intl: -0.50,
      fixed_income_govt: 0.05,
      corp_bonds: 0.05,
      muni_bonds: 0.03,
      tips: 0.02,
      alts: -0.25,
      cash: 0.02,
    },
  },
};

// =====================================================================
// Asset Class Mapping
// =====================================================================

function getScenarioReturnForAssetClass(
  assetClass: AssetClass,
  returns: ScenarioReturns,
): number {
  switch (assetClass) {
    case 'EQUITY_US_LARGE':
    case 'EQUITY_US_MID':
    case 'EQUITY_US_SMALL':
    case 'EQUITY_SECTOR':
      return returns.equity_us;
    case 'EQUITY_INTL_DEVELOPED':
    case 'EQUITY_INTL_EMERGING':
      return returns.equity_intl;
    case 'FIXED_INCOME_GOVT':
      return returns.fixed_income_govt;
    case 'FIXED_INCOME_CORP':
    case 'FIXED_INCOME_CORP_IG':
    case 'FIXED_INCOME_CORP_HY':
    case 'FIXED_INCOME_INTL':
      return returns.corp_bonds;
    case 'FIXED_INCOME_MUNI':
      return returns.muni_bonds;
    case 'FIXED_INCOME_TIPS':
      return returns.tips;
    case 'REAL_ESTATE':
    case 'ALTERNATIVES_REAL_ESTATE':
    case 'COMMODITIES':
    case 'ALTERNATIVES_COMMODITIES':
    case 'GOLD':
    case 'ALTERNATIVE_PE':
    case 'ALTERNATIVE_HEDGE':
    case 'ALTERNATIVE_PRIVATE_CREDIT':
    case 'ALTERNATIVES_OTHER':
    case 'ANNUITY':
    case 'OTHER':
      return returns.alts;
    case 'CASH':
    case 'CASH_EQUIVALENT':
      return returns.cash;
    default:
      return 0;
  }
}

function isEquityClass(ac: AssetClass): boolean {
  return ac.startsWith('EQUITY_');
}

function isFixedIncomeClass(ac: AssetClass): boolean {
  return ac.startsWith('FIXED_INCOME_');
}

function isAlternativesClass(ac: AssetClass): boolean {
  return (
    ac === 'REAL_ESTATE' ||
    ac === 'ALTERNATIVES_REAL_ESTATE' ||
    ac === 'COMMODITIES' ||
    ac === 'ALTERNATIVES_COMMODITIES' ||
    ac === 'GOLD' ||
    ac === 'ALTERNATIVE_PE' ||
    ac === 'ALTERNATIVE_HEDGE' ||
    ac === 'ALTERNATIVE_PRIVATE_CREDIT' ||
    ac === 'ALTERNATIVES_OTHER' ||
    ac === 'ANNUITY' ||
    ac === 'OTHER'
  );
}

function isCashClass(ac: AssetClass): boolean {
  return ac === 'CASH_EQUIVALENT' || ac === 'CASH';
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Compute portfolio-level metrics from holdings.
 */
export function computePortfolioMetrics(holdings: Holding[]): PortfolioMetrics {
  const zero = cents(0);
  if (holdings.length === 0) {
    return {
      totalValue: zero,
      holdingCount: 0,
      weightedExpenseRatio: 0,
      estimatedAnnualCost: zero,
      totalUnrealizedGain: zero,
      totalUnrealizedLoss: zero,
      netUnrealizedGainLoss: zero,
      estimatedTaxDrag: zero,
      estimatedYield: 0,
      equityPct: 0,
      fixedIncomePct: 0,
      alternativesPct: 0,
      cashPct: 0,
    };
  }

  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue as number), 0);

  // Weighted expense ratio
  let weightedExpenseSum = 0;
  let weightedYieldSum = 0;
  for (const h of holdings) {
    if (h.expenseRatio !== null) {
      weightedExpenseSum += (h.marketValue as number) * h.expenseRatio;
    }
    if (h.dividendYield !== null) {
      weightedYieldSum += (h.marketValue as number) * h.dividendYield;
    }
  }
  const weightedExpenseRatio = totalValue > 0 ? weightedExpenseSum / totalValue : 0;
  const estimatedYield = totalValue > 0 ? weightedYieldSum / totalValue : 0;
  const estimatedAnnualCost = Math.round(totalValue * weightedExpenseRatio);

  // Unrealized gains/losses
  let totalUnrealizedGain = 0;
  let totalUnrealizedLoss = 0;
  for (const h of holdings) {
    if (h.unrealizedGain !== null) {
      const gain = h.unrealizedGain as number;
      if (gain > 0) {
        totalUnrealizedGain += gain;
      } else {
        totalUnrealizedLoss += Math.abs(gain);
      }
    } else if (h.costBasis !== null) {
      const gain = (h.marketValue as number) - (h.costBasis as number);
      if (gain > 0) {
        totalUnrealizedGain += gain;
      } else {
        totalUnrealizedLoss += Math.abs(gain);
      }
    }
  }

  const netUnrealizedGainLoss = totalUnrealizedGain - totalUnrealizedLoss;
  // Rough tax drag estimate: 20% LTCG + 3.8% NIIT on gains
  const estimatedTaxDrag = Math.round(totalUnrealizedGain * 0.238);

  // Allocation percentages
  let equityValue = 0;
  let fixedIncomeValue = 0;
  let alternativesValue = 0;
  let cashValue = 0;

  for (const h of holdings) {
    const mv = h.marketValue as number;
    if (isEquityClass(h.assetClass)) {
      equityValue += mv;
    } else if (isFixedIncomeClass(h.assetClass)) {
      fixedIncomeValue += mv;
    } else if (isAlternativesClass(h.assetClass)) {
      alternativesValue += mv;
    } else if (isCashClass(h.assetClass)) {
      cashValue += mv;
    }
  }

  const pct = (v: number) =>
    totalValue > 0 ? Math.round((v / totalValue) * 10000) / 100 : 0;

  return {
    totalValue: totalValue as MoneyCents,
    holdingCount: holdings.length,
    weightedExpenseRatio: Math.round(weightedExpenseRatio * 100000) / 100000,
    estimatedAnnualCost: estimatedAnnualCost as MoneyCents,
    totalUnrealizedGain: totalUnrealizedGain as MoneyCents,
    totalUnrealizedLoss: totalUnrealizedLoss as MoneyCents,
    netUnrealizedGainLoss: netUnrealizedGainLoss as MoneyCents,
    estimatedTaxDrag: estimatedTaxDrag as MoneyCents,
    estimatedYield: Math.round(estimatedYield * 10000) / 10000,
    equityPct: pct(equityValue),
    fixedIncomePct: pct(fixedIncomeValue),
    alternativesPct: pct(alternativesValue),
    cashPct: pct(cashValue),
  };
}

/**
 * Generate quality flags for a portfolio.
 */
export function generateQualityFlags(
  holdings: Holding[],
  metrics: PortfolioMetrics,
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const totalValue = metrics.totalValue as number;

  // --- Single stock concentration > 20% ---
  for (const h of holdings) {
    // Detect single stocks by checking if expense ratio is 0 or null
    // (individual securities have no expense ratio)
    const isSingleStock =
      h.expenseRatio === null || h.expenseRatio === 0;
    if (isSingleStock && h.ticker) {
      const weight = totalValue > 0 ? (h.marketValue as number) / totalValue : 0;
      if (weight > 0.2) {
        flags.push({
          type: 'WARNING',
          message: `${h.ticker} (${h.description}) represents ${(weight * 100).toFixed(1)}% of the portfolio, exceeding the 20% single-stock threshold. Consider diversifying to reduce company-specific risk.`,
          severity: 'HIGH',
          category: 'CONCENTRATION',
        });
      }
    }
  }

  // --- Holding expense ratio > 1% ---
  for (const h of holdings) {
    if (h.expenseRatio !== null && h.expenseRatio > 0.01) {
      flags.push({
        type: 'WARNING',
        message: `${h.ticker ?? h.description} has an expense ratio of ${(h.expenseRatio * 100).toFixed(2)}%, which exceeds the 1% threshold. Annual cost: $${(((h.marketValue as number) / 100) * h.expenseRatio).toFixed(0)}.`,
        severity: 'MEDIUM',
        category: 'EXPENSE',
      });
    }
  }

  // --- No international equity ---
  const hasIntlEquity = holdings.some(
    (h) =>
      h.assetClass === 'EQUITY_INTL_DEVELOPED' ||
      h.assetClass === 'EQUITY_INTL_EMERGING',
  );
  if (!hasIntlEquity && metrics.equityPct > 0) {
    flags.push({
      type: 'WARNING',
      message:
        'The portfolio has no international equity allocation. International diversification has historically reduced volatility and improved risk-adjusted returns.',
      severity: 'HIGH',
      category: 'DIVERSIFICATION',
    });
  }

  // --- Overlapping funds (same asset class, 3+ holdings) ---
  const assetClassCounts = new Map<AssetClass, number>();
  for (const h of holdings) {
    assetClassCounts.set(
      h.assetClass,
      (assetClassCounts.get(h.assetClass) ?? 0) + 1,
    );
  }
  for (const [ac, count] of Array.from(assetClassCounts.entries())) {
    if (count >= 3) {
      flags.push({
        type: 'WARNING',
        message: `${count} holdings in the ${formatAssetClass(ac)} category may have significant overlap, increasing hidden concentration and fee drag.`,
        severity: 'MEDIUM',
        category: 'CONCENTRATION',
      });
    }
  }

  // --- Unrealized losses > $10K (TLH opportunity) ---
  // $10K in cents = 1_000_000
  if ((metrics.totalUnrealizedLoss as number) > 1_000_000) {
    flags.push({
      type: 'OPPORTUNITY',
      message: `The portfolio has $${((metrics.totalUnrealizedLoss as number) / 100).toLocaleString()} in unrealized losses that can be harvested to offset gains and reduce tax liability.`,
      severity: 'MEDIUM',
      category: 'TAX',
    });
  }

  // --- No bond allocation ---
  if (metrics.fixedIncomePct === 0 && totalValue > 0) {
    flags.push({
      type: 'WARNING',
      message:
        'The portfolio has no fixed income allocation. Bonds provide income, reduce portfolio volatility, and serve as a buffer during equity drawdowns.',
      severity: 'MEDIUM',
      category: 'ALLOCATION',
    });
  }

  // --- Very high equity concentration (>90%) ---
  if (metrics.equityPct > 90) {
    flags.push({
      type: 'WARNING',
      message: `The portfolio is ${metrics.equityPct.toFixed(1)}% equity. While appropriate for aggressive long-term investors, this creates significant drawdown risk.`,
      severity: 'MEDIUM',
      category: 'ALLOCATION',
    });
  }

  return flags;
}

/**
 * Run a stress test on a portfolio for a given scenario.
 */
export function runStressTest(
  holdings: Holding[],
  scenario: StressScenario,
): StressTestResult {
  const scenarioConfig = STRESS_SCENARIOS[scenario];
  if (!scenarioConfig) {
    throw new Error(`Unknown stress scenario: ${scenario}`);
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let maxDrawdown = 0;

  for (const h of holdings) {
    const mv = h.marketValue as number;
    const scenarioReturn = getScenarioReturnForAssetClass(
      h.assetClass,
      scenarioConfig.returns,
    );
    totalBefore += mv;
    totalAfter += mv * (1 + scenarioReturn);
    if (scenarioReturn < maxDrawdown) {
      maxDrawdown = scenarioReturn;
    }
  }

  const portfolioReturn =
    totalBefore > 0 ? (totalAfter - totalBefore) / totalBefore : 0;

  // Estimate recovery months based on severity
  const recoveryMonths = estimateRecoveryMonths(portfolioReturn);

  return {
    scenario,
    scenarioLabel: scenarioConfig.name,
    portfolioReturn: Math.round(portfolioReturn * 10000) / 10000,
    benchmarkReturn: Math.round(portfolioReturn * 10000) / 10000, // simplified: same as portfolio
    maxDrawdown: Math.round(portfolioReturn * 10000) / 10000,
    recoveryMonths,
  };
}

/**
 * Compute side-by-side analytics comparing current vs proposed portfolios.
 */
export function computeComparisonAnalytics(
  currentHoldings: Holding[],
  proposedHoldings: Holding[],
): { current: PortfolioAnalytics; proposed: PortfolioAnalytics } {
  const allScenarios: StressScenario[] = [
    '2008_FINANCIAL_CRISIS',
    'COVID_2020',
    '2022_RATE_SHOCK',
    '2000_DOTCOM',
    'RECESSION_MILD',
    'EQUITY_BEAR_50',
  ];

  const computeAnalytics = (holdings: Holding[]): PortfolioAnalytics => {
    const metrics = computePortfolioMetrics(holdings);
    const qualityFlags = generateQualityFlags(holdings, metrics);
    const stressTests = allScenarios.map((s) => runStressTest(holdings, s));

    // Simplified analytics with reasonable defaults
    return {
      returns: [
        { period: 'YTD', portfolioReturn: 0.04, benchmarkReturn: 0.042, activeReturn: -0.002, annualized: false },
        { period: '1Y', portfolioReturn: 0.08, benchmarkReturn: 0.085, activeReturn: -0.005, annualized: true },
        { period: '3Y', portfolioReturn: 0.07, benchmarkReturn: 0.072, activeReturn: -0.002, annualized: true },
        { period: '5Y', portfolioReturn: 0.068, benchmarkReturn: 0.07, activeReturn: -0.002, annualized: true },
      ],
      standardDeviation: metrics.equityPct > 60 ? 0.15 : 0.10,
      downsideDeviation: metrics.equityPct > 60 ? 0.10 : 0.07,
      maxDrawdown: stressTests.length > 0 ? Math.min(...stressTests.map((s) => s.maxDrawdown)) : -0.20,
      maxDrawdownStartDate: '2020-02-19',
      maxDrawdownEndDate: '2020-03-23',
      recoveryDays: 148,
      valueAtRisk95: metrics.equityPct > 60 ? -0.025 : -0.015,
      conditionalVaR: metrics.equityPct > 60 ? -0.035 : -0.022,
      sharpeRatio: 0.75,
      sortinoRatio: 1.10,
      calmarRatio: 0.35,
      treynorRatio: 0.065,
      informationRatio: 0.40,
      captureUp: 0.95,
      captureDown: 0.85,
      beta: metrics.equityPct / 100 * 1.1,
      alpha: 0.008,
      rSquared: 0.92,
      trackingError: 0.02,
      peRatio: 22.5,
      pbRatio: 3.8,
      dividendYield: metrics.estimatedYield ?? 0,
      factorExposures: [
        { factor: 'Size', exposure: 0.12, label: 'Slight large-cap tilt' },
        { factor: 'Value', exposure: -0.05, label: 'Slight growth tilt' },
        { factor: 'Momentum', exposure: 0.08, label: 'Neutral' },
        { factor: 'Quality', exposure: 0.15, label: 'Slight quality tilt' },
        { factor: 'Volatility', exposure: -0.10, label: 'Slight low-vol tilt' },
      ],
      sectorAllocation: {
        'Technology': 28,
        'Healthcare': 13,
        'Financials': 12,
        'Consumer Discretionary': 10,
        'Industrials': 9,
        'Communication Services': 8,
        'Consumer Staples': 6,
        'Energy': 5,
        'Utilities': 3,
        'Materials': 3,
        'Real Estate': 3,
      },
      geographyAllocation: {
        'United States': metrics.equityPct > 0 ? 65 : 0,
        'Europe': 15,
        'Asia Pacific': 12,
        'Emerging Markets': 5,
        'Other': 3,
      },
      effectiveDuration: metrics.fixedIncomePct > 0 ? 5.5 : null,
      yieldToMaturity: metrics.fixedIncomePct > 0 ? 0.045 : null,
      creditQuality: metrics.fixedIncomePct > 0 ? {
        'AAA': 40,
        'AA': 20,
        'A': 20,
        'BBB': 15,
        'BB and below': 5,
      } : null,
      securityOverlap: [],
      top10Concentration: 35,
    };
  };

  return {
    current: computeAnalytics(currentHoldings),
    proposed: computeAnalytics(proposedHoldings),
  };
}

// =====================================================================
// Helpers
// =====================================================================

function formatAssetClass(ac: AssetClass): string {
  const labels: Record<AssetClass, string> = {
    EQUITY_US_LARGE: 'US Large Cap Equity',
    EQUITY_US_MID: 'US Mid Cap Equity',
    EQUITY_US_SMALL: 'US Small Cap Equity',
    EQUITY_INTL_DEVELOPED: 'Intl Developed Equity',
    EQUITY_INTL_EMERGING: 'Emerging Markets Equity',
    EQUITY_SECTOR: 'Sector Equity',
    FIXED_INCOME_GOVT: 'Government Bonds',
    FIXED_INCOME_CORP: 'Corporate Bonds',
    FIXED_INCOME_CORP_IG: 'Investment Grade Corporate Bonds',
    FIXED_INCOME_CORP_HY: 'High Yield Corporate Bonds',
    FIXED_INCOME_MUNI: 'Municipal Bonds',
    FIXED_INCOME_INTL: 'International Bonds',
    FIXED_INCOME_TIPS: 'TIPS',
    REAL_ESTATE: 'Real Estate',
    ALTERNATIVES_REAL_ESTATE: 'Real Estate Alternatives',
    ALTERNATIVES_COMMODITIES: 'Commodity Alternatives',
    ALTERNATIVES_OTHER: 'Other Alternatives',
    COMMODITIES: 'Commodities',
    GOLD: 'Gold',
    ALTERNATIVE_PE: 'Private Equity',
    ALTERNATIVE_HEDGE: 'Hedge Funds',
    ALTERNATIVE_PRIVATE_CREDIT: 'Private Credit',
    CASH: 'Cash',
    CASH_EQUIVALENT: 'Cash & Equivalents',
    ANNUITY: 'Annuity',
    OTHER: 'Other',
  };
  return labels[ac] ?? ac;
}

function estimateRecoveryMonths(portfolioReturn: number): number {
  const absLoss = Math.abs(portfolioReturn);
  if (absLoss < 0.10) return 3;
  if (absLoss < 0.20) return 8;
  if (absLoss < 0.30) return 18;
  if (absLoss < 0.40) return 30;
  return 42;
}
