/**
 * Tests for proposal-engine/analytics-engine.ts
 *
 * Covers: computePortfolioMetrics, generateQualityFlags, runStressTest,
 * computeComparisonAnalytics.
 */

import { describe, it, expect } from 'vitest';

import {
  computePortfolioMetrics,
  generateQualityFlags,
  runStressTest,
  computeComparisonAnalytics,
} from '../analytics-engine';
import type { Holding } from '../types';
import type { MoneyCents } from '../../tax-planning/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeHolding(overrides: Partial<Holding> & { ticker: string }): Holding {
  return {
    ticker: overrides.ticker,
    cusip: null,
    description: overrides.description ?? `${overrides.ticker} Fund`,
    assetClass: overrides.assetClass ?? 'EQUITY_US_LARGE',
    quantity: overrides.quantity ?? 100,
    price: (overrides.price ?? 10000) as MoneyCents,
    marketValue: (overrides.marketValue ?? 1000000) as MoneyCents,
    costBasis: overrides.costBasis !== undefined ? overrides.costBasis : (800000 as MoneyCents),
    unrealizedGain: null,
    gainPct: null,
    holdingPeriod: overrides.holdingPeriod ?? 'LONG',
    expenseRatio: overrides.expenseRatio ?? 0.0003,
    dividendYield: overrides.dividendYield ?? 0.015,
    accountType: overrides.accountType ?? 'TAXABLE',
    accountName: overrides.accountName ?? 'Main Brokerage',
  };
}

const sampleHoldings: Holding[] = [
  makeHolding({
    ticker: 'VTI',
    description: 'Vanguard Total Stock Market ETF',
    assetClass: 'EQUITY_US_LARGE',
    marketValue: 5000000 as MoneyCents,
    costBasis: 4000000 as MoneyCents,
    expenseRatio: 0.0003,
  }),
  makeHolding({
    ticker: 'VXUS',
    description: 'Vanguard Total Intl Stock ETF',
    assetClass: 'EQUITY_INTL_DEVELOPED',
    marketValue: 2000000 as MoneyCents,
    costBasis: 2200000 as MoneyCents,
    expenseRatio: 0.0007,
  }),
  makeHolding({
    ticker: 'BND',
    description: 'Vanguard Total Bond Market ETF',
    assetClass: 'FIXED_INCOME_GOVT',
    marketValue: 2000000 as MoneyCents,
    costBasis: 2100000 as MoneyCents,
    expenseRatio: 0.0003,
  }),
  makeHolding({
    ticker: 'VNQ',
    description: 'Vanguard Real Estate ETF',
    assetClass: 'REAL_ESTATE',
    marketValue: 1000000 as MoneyCents,
    costBasis: 900000 as MoneyCents,
    expenseRatio: 0.0012,
  }),
];

// =============================================================================
// computePortfolioMetrics
// =============================================================================

describe('computePortfolioMetrics()', () => {
  it('returns zero metrics for empty holdings', () => {
    const metrics = computePortfolioMetrics([]);
    expect(metrics.totalValue).toBe(0);
    expect(metrics.holdingCount).toBe(0);
    expect(metrics.weightedExpenseRatio).toBe(0);
  });

  it('computes correct total value', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    // 5M + 2M + 2M + 1M = 10M cents = $100,000
    expect(metrics.totalValue).toBe(10000000);
  });

  it('computes correct holding count', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    expect(metrics.holdingCount).toBe(4);
  });

  it('computes weighted expense ratio', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    // Weighted average should be between the min (0.03%) and max (0.12%)
    expect(metrics.weightedExpenseRatio).toBeGreaterThan(0);
    expect(metrics.weightedExpenseRatio).toBeLessThan(0.01);
  });

  it('computes unrealized gains and losses separately', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    // VTI: +1M gain, VNQ: +100K gain = 1.1M total gain
    expect(metrics.totalUnrealizedGain).toBeGreaterThan(0);
    // VXUS: -200K loss, BND: -100K loss = 300K total loss
    // totalUnrealizedLoss is stored as a positive number (absolute value)
    expect(metrics.totalUnrealizedLoss).toBeGreaterThan(0);
  });

  it('computes allocation percentages', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    expect(metrics.equityPct).toBeGreaterThan(0);
    expect(metrics.fixedIncomePct).toBeGreaterThan(0);
  });

  it('computes estimated yield', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    expect(metrics.estimatedYield).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// generateQualityFlags
// =============================================================================

describe('generateQualityFlags()', () => {
  it('returns an array for well-diversified portfolio', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    const flags = generateQualityFlags(sampleHoldings, metrics);
    expect(Array.isArray(flags)).toBe(true);
  });

  it('flags high expense ratio holdings', () => {
    const expensiveHolding = makeHolding({
      ticker: 'EXPN',
      description: 'Expensive Fund',
      expenseRatio: 0.025, // 2.5% expense ratio
      marketValue: 5000000 as MoneyCents,
    });
    const holdings = [expensiveHolding];
    const metrics = computePortfolioMetrics(holdings);
    const flags = generateQualityFlags(holdings, metrics);
    const expenseFlags = flags.filter((f) => f.category === 'EXPENSE');
    expect(expenseFlags.length).toBeGreaterThan(0);
  });

  it('flags missing international equity', () => {
    const usOnlyHoldings = [
      makeHolding({
        ticker: 'VTI',
        assetClass: 'EQUITY_US_LARGE',
        marketValue: 10000000 as MoneyCents,
      }),
    ];
    const metrics = computePortfolioMetrics(usOnlyHoldings);
    const flags = generateQualityFlags(usOnlyHoldings, metrics);
    const diversificationFlags = flags.filter((f) => f.category === 'DIVERSIFICATION');
    expect(diversificationFlags.length).toBeGreaterThan(0);
  });

  it('flags no fixed income allocation', () => {
    const equityOnly = [
      makeHolding({
        ticker: 'VTI',
        assetClass: 'EQUITY_US_LARGE',
        marketValue: 10000000 as MoneyCents,
      }),
    ];
    const metrics = computePortfolioMetrics(equityOnly);
    const flags = generateQualityFlags(equityOnly, metrics);
    const allocationFlags = flags.filter((f) => f.category === 'ALLOCATION');
    expect(allocationFlags.length).toBeGreaterThan(0);
  });

  it('each flag has type, message, severity, and category', () => {
    const metrics = computePortfolioMetrics(sampleHoldings);
    const flags = generateQualityFlags(sampleHoldings, metrics);
    for (const flag of flags) {
      expect(flag.type).toBeTruthy();
      expect(flag.severity).toBeTruthy();
      expect(flag.category).toBeTruthy();
      expect(flag.message).toBeTruthy();
    }
  });
});

// =============================================================================
// runStressTest
// =============================================================================

describe('runStressTest()', () => {
  it('returns valid stress test result for 2008 crisis', () => {
    const result = runStressTest(sampleHoldings, '2008_FINANCIAL_CRISIS');
    expect(result.scenario).toBe('2008_FINANCIAL_CRISIS');
    expect(result.scenarioLabel).toBeTruthy();
    expect(result.portfolioReturn).toBeLessThan(0);
    expect(result.recoveryMonths).toBeGreaterThan(0);
  });

  it('equity-heavy portfolios suffer more in equity bear markets', () => {
    const equityHeavy = [
      makeHolding({
        ticker: 'VTI',
        assetClass: 'EQUITY_US_LARGE',
        marketValue: 10000000 as MoneyCents,
      }),
    ];
    const bondHeavy = [
      makeHolding({
        ticker: 'BND',
        assetClass: 'FIXED_INCOME_GOVT',
        marketValue: 10000000 as MoneyCents,
      }),
    ];
    const equityResult = runStressTest(equityHeavy, 'EQUITY_BEAR_50');
    const bondResult = runStressTest(bondHeavy, 'EQUITY_BEAR_50');

    expect(equityResult.portfolioReturn).toBeLessThan(bondResult.portfolioReturn);
  });

  it('returns scenario label and recovery months', () => {
    const result = runStressTest(sampleHoldings, 'COVID_2020');
    expect(result.scenarioLabel).toBeTruthy();
    expect(typeof result.recoveryMonths).toBe('number');
    expect(result.recoveryMonths).toBeGreaterThan(0);
  });

  it('throws for unknown scenario', () => {
    expect(() =>
      runStressTest(sampleHoldings, 'UNKNOWN_SCENARIO' as any),
    ).toThrow();
  });
});

// =============================================================================
// computeComparisonAnalytics
// =============================================================================

describe('computeComparisonAnalytics()', () => {
  const proposedHoldings: Holding[] = [
    makeHolding({
      ticker: 'VTI',
      assetClass: 'EQUITY_US_LARGE',
      marketValue: 4000000 as MoneyCents,
      expenseRatio: 0.0003,
    }),
    makeHolding({
      ticker: 'VXUS',
      assetClass: 'EQUITY_INTL_DEVELOPED',
      marketValue: 2000000 as MoneyCents,
      expenseRatio: 0.0007,
    }),
    makeHolding({
      ticker: 'AGG',
      assetClass: 'FIXED_INCOME_GOVT',
      marketValue: 3000000 as MoneyCents,
      expenseRatio: 0.0003,
    }),
    makeHolding({
      ticker: 'GLD',
      assetClass: 'COMMODITIES',
      marketValue: 1000000 as MoneyCents,
      expenseRatio: 0.0040,
    }),
  ];

  it('returns both current and proposed analytics', () => {
    const comparison = computeComparisonAnalytics(sampleHoldings, proposedHoldings);
    expect(comparison.current).toBeDefined();
    expect(comparison.proposed).toBeDefined();
  });

  it('includes returns data for both portfolios', () => {
    const comparison = computeComparisonAnalytics(sampleHoldings, proposedHoldings);
    expect(comparison.current.returns).toBeDefined();
    expect(comparison.proposed.returns).toBeDefined();
    expect(comparison.current.returns.length).toBeGreaterThan(0);
  });

  it('includes risk metrics for both portfolios', () => {
    const comparison = computeComparisonAnalytics(sampleHoldings, proposedHoldings);
    expect(typeof comparison.current.sharpeRatio).toBe('number');
    expect(typeof comparison.proposed.sharpeRatio).toBe('number');
    expect(typeof comparison.current.beta).toBe('number');
  });

  it('includes sector allocation for both portfolios', () => {
    const comparison = computeComparisonAnalytics(sampleHoldings, proposedHoldings);
    expect(comparison.current.sectorAllocation).toBeDefined();
    expect(comparison.proposed.sectorAllocation).toBeDefined();
  });
});
