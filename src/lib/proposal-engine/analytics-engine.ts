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
  FlagSeverity,
  FlagCategory,
} from './types';

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

const STRESS_SCENARIOS: Record<StressScenario, { name: string; returns: ScenarioReturns }> = {
  GFC_2008: {
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
  RATE_SHOCK_2022: {
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
  DOTCOM_2000: {
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
      return returns.equity_us;
    case 'EQUITY_INTL_DEVELOPED':
    case 'EQUITY_INTL_EMERGING':
      return returns.equity_intl;
    case 'FIXED_INCOME_GOVT':
      return returns.fixed_income_govt;
    case 'FIXED_INCOME_CORP':
      return returns.corp_bonds;
    case 'FIXED_INCOME_MUNI':
      return returns.muni_bonds;
    case 'FIXED_INCOME_TIPS':
      return returns.tips;
    case 'ALTERNATIVES_REAL_ESTATE':
    case 'ALTERNATIVES_COMMODITIES':
    case 'ALTERNATIVES_OTHER':
      return returns.alts;
    case 'CASH':
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
  return ac.startsWith('ALTERNATIVES_');
}

function isUsEquityClass(ac: AssetClass): boolean {
  return ac === 'EQUITY_US_LARGE' || ac === 'EQUITY_US_MID' || ac === 'EQUITY_US_SMALL';
}

function isIntlEquityClass(ac: AssetClass): boolean {
  return ac === 'EQUITY_INTL_DEVELOPED' || ac === 'EQUITY_INTL_EMERGING';
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Compute portfolio-level metrics from holdings.
 */
export function computePortfolioMetrics(holdings: Holding[]): PortfolioMetrics {
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      weightedExpenseRatio: 0,
      totalUnrealizedGain: 0,
      totalUnrealizedLoss: 0,
      holdingCount: 0,
      equityPct: 0,
      fixedIncomePct: 0,
      alternativesPct: 0,
      cashPct: 0,
      usEquityPct: 0,
      intlEquityPct: 0,
      weightedDividendYield: 0,
      topHoldings: [],
    };
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // Weighted expense ratio
  const weightedExpenseRatio =
    totalValue > 0
      ? holdings.reduce((sum, h) => sum + h.marketValue * h.expenseRatio, 0) / totalValue
      : 0;

  // Unrealized gains/losses
  let totalUnrealizedGain = 0;
  let totalUnrealizedLoss = 0;
  for (const h of holdings) {
    if (h.costBasis !== undefined && h.costBasis !== null) {
      const gainLoss = h.marketValue - h.costBasis;
      if (gainLoss > 0) {
        totalUnrealizedGain += gainLoss;
      } else {
        totalUnrealizedLoss += gainLoss; // negative
      }
    }
  }

  // Allocation percentages
  let equityValue = 0;
  let fixedIncomeValue = 0;
  let alternativesValue = 0;
  let cashValue = 0;
  let usEquityValue = 0;
  let intlEquityValue = 0;

  for (const h of holdings) {
    if (isEquityClass(h.assetClass)) {
      equityValue += h.marketValue;
      if (isUsEquityClass(h.assetClass)) {
        usEquityValue += h.marketValue;
      } else if (isIntlEquityClass(h.assetClass)) {
        intlEquityValue += h.marketValue;
      }
    } else if (isFixedIncomeClass(h.assetClass)) {
      fixedIncomeValue += h.marketValue;
    } else if (isAlternativesClass(h.assetClass)) {
      alternativesValue += h.marketValue;
    } else if (h.assetClass === 'CASH') {
      cashValue += h.marketValue;
    }
  }

  const pct = (v: number) => (totalValue > 0 ? Math.round((v / totalValue) * 10000) / 100 : 0);

  // Weighted dividend yield
  const weightedDividendYield =
    totalValue > 0
      ? holdings.reduce((sum, h) => sum + h.marketValue * (h.dividendYield ?? 0), 0) / totalValue
      : 0;

  // Top 10 holdings
  const holdingsWithWeight = holdings
    .map((h) => ({
      ticker: h.ticker,
      name: h.name,
      weight: totalValue > 0 ? Math.round((h.marketValue / totalValue) * 10000) / 100 : 0,
      marketValue: h.marketValue,
    }))
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 10)
    .map(({ ticker, name, weight }) => ({ ticker, name, weight }));

  return {
    totalValue,
    weightedExpenseRatio: Math.round(weightedExpenseRatio * 10000) / 10000,
    totalUnrealizedGain,
    totalUnrealizedLoss,
    holdingCount: holdings.length,
    equityPct: pct(equityValue),
    fixedIncomePct: pct(fixedIncomeValue),
    alternativesPct: pct(alternativesValue),
    cashPct: pct(cashValue),
    usEquityPct: pct(usEquityValue),
    intlEquityPct: pct(intlEquityValue),
    weightedDividendYield: Math.round(weightedDividendYield * 10000) / 10000,
    topHoldings: holdingsWithWeight,
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
  let flagIndex = 0;
  const nextId = () => `flag-${++flagIndex}`;

  // --- Single stock concentration > 20% ---
  for (const h of holdings) {
    if (h.isSingleStock) {
      const weight = metrics.totalValue > 0 ? h.marketValue / metrics.totalValue : 0;
      if (weight > 0.2) {
        flags.push({
          flagId: nextId(),
          severity: 'HIGH',
          category: 'CONCENTRATION',
          title: `High single-stock concentration: ${h.ticker}`,
          description: `${h.ticker} (${h.name}) represents ${(weight * 100).toFixed(1)}% of the portfolio, exceeding the 20% single-stock threshold.`,
          affectedTickers: [h.ticker],
          recommendation: `Consider diversifying the ${h.ticker} position through systematic sales, exchange funds, or protective collar strategies.`,
        });
      }
    }
  }

  // --- Holding expense ratio > 1% ---
  for (const h of holdings) {
    if (h.expenseRatio > 0.01) {
      flags.push({
        flagId: nextId(),
        severity: 'MEDIUM',
        category: 'EXPENSE',
        title: `High expense ratio: ${h.ticker}`,
        description: `${h.ticker} has an expense ratio of ${(h.expenseRatio * 100).toFixed(2)}%, which exceeds the 1% threshold. This fund costs $${((h.marketValue / 100) * h.expenseRatio).toFixed(0)} per year in fees.`,
        affectedTickers: [h.ticker],
        recommendation: `Replace ${h.ticker} with a lower-cost alternative in the same asset class.`,
      });
    }
  }

  // --- No international equity ---
  if (metrics.intlEquityPct === 0 && metrics.equityPct > 0) {
    const usOnlyTickers = holdings
      .filter((h) => isUsEquityClass(h.assetClass))
      .map((h) => h.ticker);
    flags.push({
      flagId: nextId(),
      severity: 'HIGH',
      category: 'DIVERSIFICATION',
      title: 'No international equity exposure',
      description:
        'The portfolio has no international equity allocation. International diversification has historically reduced volatility and improved risk-adjusted returns.',
      affectedTickers: usOnlyTickers.slice(0, 5),
      recommendation:
        'Add international developed and emerging market equity funds (e.g., VXUS, IXUS, VWO) targeting 20-40% of equity allocation.',
    });
  }

  // --- Overlapping funds (same asset class, multiple holdings) ---
  const assetClassHoldings = new Map<AssetClass, Holding[]>();
  for (const h of holdings) {
    const existing = assetClassHoldings.get(h.assetClass) ?? [];
    existing.push(h);
    assetClassHoldings.set(h.assetClass, existing);
  }
  for (const [ac, acHoldings] of assetClassHoldings) {
    if (acHoldings.length >= 3) {
      flags.push({
        flagId: nextId(),
        severity: 'MEDIUM',
        category: 'OVERLAP',
        title: `Potential fund overlap in ${formatAssetClass(ac)}`,
        description: `${acHoldings.length} holdings in the ${formatAssetClass(ac)} category may have significant overlap, increasing hidden concentration and fee drag.`,
        affectedTickers: acHoldings.map((h) => h.ticker),
        recommendation: `Consolidate overlapping ${formatAssetClass(ac)} funds to reduce redundancy and lower costs.`,
      });
    }
  }

  // --- Unrealized losses > $10K (tax-loss harvesting opportunity) ---
  const lossTickers: string[] = [];
  let totalLosses = 0;
  for (const h of holdings) {
    if (h.costBasis !== undefined && h.costBasis !== null) {
      const gainLoss = h.marketValue - h.costBasis;
      if (gainLoss < 0) {
        totalLosses += Math.abs(gainLoss);
        lossTickers.push(h.ticker);
      }
    }
  }
  // $10K in cents = 1_000_000
  if (totalLosses > 1_000_000) {
    flags.push({
      flagId: nextId(),
      severity: 'OPPORTUNITY',
      category: 'TAX',
      title: 'Tax-loss harvesting opportunity',
      description: `The portfolio has $${(totalLosses / 100).toLocaleString()} in unrealized losses across ${lossTickers.length} holding(s). These losses can be harvested to offset gains and reduce tax liability.`,
      affectedTickers: lossTickers,
      recommendation:
        'Harvest losses by selling positions with unrealized losses and replacing with tax-lot equivalent or similar-but-not-identical funds to maintain market exposure.',
    });
  }

  // --- No bond allocation for age > 50 ---
  // We check if there's zero fixed income and make a general warning
  if (metrics.fixedIncomePct === 0 && metrics.totalValue > 0) {
    flags.push({
      flagId: nextId(),
      severity: 'MEDIUM',
      category: 'ALLOCATION',
      title: 'No fixed income allocation',
      description:
        'The portfolio has no fixed income allocation. Bonds provide income, reduce portfolio volatility, and serve as a buffer during equity drawdowns.',
      recommendation:
        'Consider adding a fixed income allocation appropriate for the client\'s risk tolerance and time horizon.',
    });
  }

  // --- Very high equity concentration (>90%) ---
  if (metrics.equityPct > 90) {
    flags.push({
      flagId: nextId(),
      severity: 'MEDIUM',
      category: 'ALLOCATION',
      title: 'Very high equity concentration',
      description: `The portfolio is ${metrics.equityPct.toFixed(1)}% equity. While appropriate for aggressive long-term investors, this creates significant drawdown risk.`,
      recommendation:
        'Review whether this equity-heavy allocation aligns with the client\'s risk profile, time horizon, and income needs.',
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

  const portfolioValueBefore = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const holdingImpacts = holdings.map((h) => {
    const scenarioReturn = getScenarioReturnForAssetClass(
      h.assetClass,
      scenarioConfig.returns,
    );
    const valueAfter = Math.round(h.marketValue * (1 + scenarioReturn));
    const change = valueAfter - h.marketValue;
    return {
      ticker: h.ticker,
      assetClass: h.assetClass,
      valueBefore: h.marketValue,
      valueAfter,
      change,
      percentChange: Math.round(scenarioReturn * 10000) / 100,
    };
  });

  const portfolioValueAfter = holdingImpacts.reduce((sum, hi) => sum + hi.valueAfter, 0);
  const dollarChange = portfolioValueAfter - portfolioValueBefore;
  const percentChange =
    portfolioValueBefore > 0
      ? Math.round((dollarChange / portfolioValueBefore) * 10000) / 100
      : 0;

  return {
    scenario,
    scenarioName: scenarioConfig.name,
    portfolioValueBefore,
    portfolioValueAfter,
    dollarChange,
    percentChange,
    holdingImpacts,
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
    'GFC_2008',
    'COVID_2020',
    'RATE_SHOCK_2022',
    'DOTCOM_2000',
    'RECESSION_MILD',
    'EQUITY_BEAR_50',
  ];

  const computeAnalytics = (holdings: Holding[]): PortfolioAnalytics => {
    const metrics = computePortfolioMetrics(holdings);
    const qualityFlags = generateQualityFlags(holdings, metrics);
    const stressTests = allScenarios.map((s) => runStressTest(holdings, s));
    return { metrics, qualityFlags, stressTests };
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
    FIXED_INCOME_GOVT: 'Government Bonds',
    FIXED_INCOME_CORP: 'Corporate Bonds',
    FIXED_INCOME_MUNI: 'Municipal Bonds',
    FIXED_INCOME_TIPS: 'TIPS',
    ALTERNATIVES_REAL_ESTATE: 'Real Estate',
    ALTERNATIVES_COMMODITIES: 'Commodities',
    ALTERNATIVES_OTHER: 'Other Alternatives',
    CASH: 'Cash & Equivalents',
  };
  return labels[ac] ?? ac;
}
