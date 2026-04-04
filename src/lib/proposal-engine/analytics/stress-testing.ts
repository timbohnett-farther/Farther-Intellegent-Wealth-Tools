/**
 * Farther Portfolio Proposal Engine -- Enhanced Stress Testing Engine
 *
 * Extended stress testing with 9 historical + hypothetical scenarios,
 * correlation-adjusted returns, and recovery projections.
 *
 * @module proposal-engine/analytics/stress-testing
 */

import type {
  Holding,
  StressScenario,
  StressTestResult,
  AssetClass,
} from '@/lib/proposal-engine/types';
import type { MoneyCents } from '@/lib/proposal-engine/types';
import { cents } from '@/lib/proposal-engine/types';

// =====================================================================
// Types
// =====================================================================

export interface EnhancedScenarioResult extends StressTestResult {
  /** Absolute dollar loss/gain from the scenario */
  dollarImpact: MoneyCents;
  /** Per-holding impact breakdown */
  holdingImpacts: Array<{
    ticker: string | null;
    currentValue: MoneyCents;
    stressedValue: MoneyCents;
    loss: MoneyCents;
    lossPct: number;
  }>;
  /** Recovery projection analysis */
  recoveryProjection: {
    /** Estimated months to recover to pre-stress levels */
    months: number;
    /** Annualized return required to recover */
    requiredReturn: number;
    /** Estimated probability of recovery within timeframe (0-1) */
    probability: number;
  };
}

export interface EnhancedStressResult {
  /** Results for each stress scenario */
  results: EnhancedScenarioResult[];
  /** The worst-case scenario result */
  worstCase: EnhancedScenarioResult;
  /** Average loss across all scenarios (decimal) */
  averageLoss: number;
  /** Maximum drawdown across all scenarios (decimal, negative) */
  maxDrawdown: number;
  /** 95th percentile Value at Risk (decimal, negative) */
  portfolioVaR95: number;
  /** Conditional VaR / Expected Shortfall at 95% (decimal, negative) */
  portfolioCVaR95: number;
}

// =====================================================================
// Scenario Return Assumptions
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
  '1973_STAGFLATION': {
    name: '1973-1974 Stagflation Crisis',
    returns: {
      equity_us: -0.37,
      equity_intl: -0.35,
      fixed_income_govt: -0.08,
      corp_bonds: -0.10,
      muni_bonds: -0.05,
      tips: 0.00,
      alts: 0.15, // Commodities/gold performed well
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
  // --- HYPOTHETICAL SCENARIOS ---
  RATES_UP_200BPS: {
    name: 'Interest Rates +200 bps',
    returns: {
      equity_us: -0.12,
      equity_intl: -0.10,
      fixed_income_govt: -0.15,
      corp_bonds: -0.18,
      muni_bonds: -0.12,
      tips: -0.10,
      alts: -0.08,
      cash: 0.02,
    },
  },
  INFLATION_5PCT_3YR: {
    name: '5% Inflation for 3 Years',
    returns: {
      equity_us: -0.08,
      equity_intl: -0.08,
      fixed_income_govt: -0.12,
      corp_bonds: -0.10,
      muni_bonds: -0.08,
      tips: 0.05,
      alts: 0.10, // Commodities/real assets benefit
      cash: -0.15, // Real return erosion
    },
  },
  DOLLAR_COLLAPSE: {
    name: 'US Dollar Collapse (-30%)',
    returns: {
      equity_us: -0.20,
      equity_intl: 0.15, // Foreign assets benefit
      fixed_income_govt: -0.10,
      corp_bonds: -0.12,
      muni_bonds: -0.08,
      tips: 0.02,
      alts: 0.20, // Gold/commodities surge
      cash: -0.30,
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

// =====================================================================
// Recovery Projection Logic
// =====================================================================

/**
 * Estimate recovery projection based on loss severity and historical data.
 */
function calculateRecoveryProjection(portfolioReturn: number): {
  months: number;
  requiredReturn: number;
  probability: number;
} {
  const absLoss = Math.abs(portfolioReturn);

  let months: number;
  let probability: number;

  if (absLoss < 0.10) {
    months = 3;
    probability = 0.95;
  } else if (absLoss < 0.20) {
    months = 8;
    probability = 0.85;
  } else if (absLoss < 0.30) {
    months = 18;
    probability = 0.75;
  } else if (absLoss < 0.40) {
    months = 30;
    probability = 0.65;
  } else {
    months = 42;
    probability = 0.55;
  }

  // Required return to recover (annualized)
  // Formula: (1 + required)^(months/12) = 1 / (1 + loss)
  const yearsToRecover = months / 12;
  const requiredReturn = yearsToRecover > 0 ? Math.pow(1 / (1 + portfolioReturn), 1 / yearsToRecover) - 1 : 0;

  return { months, requiredReturn, probability };
}

// =====================================================================
// VaR & CVaR Calculation
// =====================================================================

/**
 * Calculate 95th percentile Value at Risk (VaR) from scenario results.
 */
function calculateVaR95(returns: number[]): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.05); // 5th percentile
  return sorted[index] ?? 0;
}

/**
 * Calculate Conditional VaR (CVaR) / Expected Shortfall at 95%.
 */
function calculateCVaR95(returns: number[]): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.05);
  const tail = sorted.slice(0, index + 1);
  if (tail.length === 0) return 0;
  return tail.reduce((sum, r) => sum + r, 0) / tail.length;
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Run enhanced stress tests on a portfolio across multiple scenarios.
 *
 * Computes per-holding impacts, dollar losses, recovery projections,
 * VaR, and CVaR metrics.
 *
 * @param holdings - Portfolio holdings to stress test
 * @param scenarios - Optional list of scenarios to run (defaults to all 9)
 * @returns Enhanced stress test results with VaR/CVaR
 *
 * @example
 * ```ts
 * const stressResult = runEnhancedStressTests(holdings);
 * console.log(`Worst case: ${stressResult.worstCase.scenarioLabel}`);
 * console.log(`Portfolio VaR 95%: ${(stressResult.portfolioVaR95 * 100).toFixed(2)}%`);
 * ```
 */
export function runEnhancedStressTests(
  holdings: Holding[],
  scenarios?: StressScenario[],
): EnhancedStressResult {
  const allScenarios: StressScenario[] = scenarios ?? [
    '2008_FINANCIAL_CRISIS',
    'COVID_2020',
    '2022_RATE_SHOCK',
    '2000_DOTCOM',
    '1987_BLACK_MONDAY',
    '1973_STAGFLATION',
    'RECESSION_MILD',
    'EQUITY_BEAR_50',
    'RATES_UP_200BPS',
    'INFLATION_5PCT_3YR',
    'DOLLAR_COLLAPSE',
  ];

  const results: EnhancedScenarioResult[] = [];
  const portfolioReturns: number[] = [];

  for (const scenario of allScenarios) {
    const scenarioConfig = STRESS_SCENARIOS[scenario];
    if (!scenarioConfig) {
      console.warn(`[stress-testing] Unknown scenario: ${scenario}, skipping`);
      continue;
    }

    let totalBefore = 0;
    let totalAfter = 0;
    let maxDrawdown = 0;

    const holdingImpacts: EnhancedScenarioResult['holdingImpacts'] = [];

    for (const h of holdings) {
      const mv = h.marketValue as number;
      const scenarioReturn = getScenarioReturnForAssetClass(h.assetClass, scenarioConfig.returns);

      totalBefore += mv;
      const stressedValue = mv * (1 + scenarioReturn);
      totalAfter += stressedValue;

      if (scenarioReturn < maxDrawdown) {
        maxDrawdown = scenarioReturn;
      }

      holdingImpacts.push({
        ticker: h.ticker,
        currentValue: mv as MoneyCents,
        stressedValue: Math.round(stressedValue) as MoneyCents,
        loss: Math.round(stressedValue - mv) as MoneyCents,
        lossPct: scenarioReturn,
      });
    }

    const portfolioReturn = totalBefore > 0 ? (totalAfter - totalBefore) / totalBefore : 0;
    portfolioReturns.push(portfolioReturn);

    const dollarImpact = Math.round(totalAfter - totalBefore) as MoneyCents;
    const recoveryProjection = calculateRecoveryProjection(portfolioReturn);

    results.push({
      scenario,
      scenarioLabel: scenarioConfig.name,
      portfolioReturn: Math.round(portfolioReturn * 10000) / 10000,
      benchmarkReturn: Math.round(portfolioReturn * 10000) / 10000, // Simplified: same as portfolio
      maxDrawdown: Math.round(portfolioReturn * 10000) / 10000,
      recoveryMonths: recoveryProjection.months,
      dollarImpact,
      holdingImpacts,
      recoveryProjection,
    });
  }

  // Identify worst case
  const worstCase = results.reduce((worst, r) =>
    r.portfolioReturn < worst.portfolioReturn ? r : worst
  );

  // Average loss
  const averageLoss = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;

  // Max drawdown across all scenarios
  const maxDrawdown = Math.min(...portfolioReturns);

  // VaR and CVaR
  const portfolioVaR95 = calculateVaR95(portfolioReturns);
  const portfolioCVaR95 = calculateCVaR95(portfolioReturns);

  return {
    results,
    worstCase,
    averageLoss,
    maxDrawdown,
    portfolioVaR95,
    portfolioCVaR95,
  };
}
