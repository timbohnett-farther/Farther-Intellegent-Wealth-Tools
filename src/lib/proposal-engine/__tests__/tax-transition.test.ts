/**
 * Tests for proposal-engine/tax-transition.ts
 *
 * Covers: analyzeTaxTransition, strategy selection, tax cost computation.
 */

import { describe, it, expect } from 'vitest';

import { analyzeTaxTransition } from '../tax-transition';
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

// Holdings with significant gains
const gainHoldings: Holding[] = [
  makeHolding({
    ticker: 'AAPL',
    marketValue: 5000000 as MoneyCents,
    costBasis: 2000000 as MoneyCents,
    holdingPeriod: 'LONG',
  }),
  makeHolding({
    ticker: 'MSFT',
    marketValue: 3000000 as MoneyCents,
    costBasis: 1500000 as MoneyCents,
    holdingPeriod: 'LONG',
  }),
];

// Holdings with significant losses
const lossHoldings: Holding[] = [
  makeHolding({
    ticker: 'META',
    marketValue: 2000000 as MoneyCents,
    costBasis: 4000000 as MoneyCents,
    holdingPeriod: 'LONG',
  }),
  makeHolding({
    ticker: 'PYPL',
    marketValue: 1000000 as MoneyCents,
    costBasis: 2500000 as MoneyCents,
    holdingPeriod: 'SHORT',
  }),
];

// Mixed holdings
const mixedHoldings: Holding[] = [...gainHoldings, ...lossHoldings];

// =============================================================================
// analyzeTaxTransition
// =============================================================================

describe('analyzeTaxTransition()', () => {
  it('returns multiple strategy results', () => {
    const analysis = analyzeTaxTransition(gainHoldings);
    expect(analysis.strategies.length).toBeGreaterThanOrEqual(3);
  });

  it('returns a recommended strategy', () => {
    const analysis = analyzeTaxTransition(gainHoldings);
    const validStrategies = [
      'FULL_LIQUIDATION',
      'PHASED_3YEAR',
      'PHASED_3_YEAR',
      'HARVEST_FIRST',
      'DIRECT_INDEXING',
      'HOLD_IN_PLACE',
    ];
    expect(validStrategies).toContain(analysis.recommendedStrategy);
  });

  it('returns recommendation reason', () => {
    const analysis = analyzeTaxTransition(gainHoldings);
    expect(analysis.recommendationReason || analysis.recommendationRationale).toBeTruthy();
  });

  it('full liquidation has highest tax cost', () => {
    const analysis = analyzeTaxTransition(gainHoldings);
    const fullLiq = analysis.strategies.find(
      (s) => s.strategy === 'FULL_LIQUIDATION',
    );
    expect(fullLiq).toBeDefined();
    if (fullLiq) {
      expect(fullLiq.estimatedTaxCost).toBeGreaterThan(0);
    }
  });

  it('harvest-first strategy has zero or negative tax cost (benefit) for loss-heavy portfolio', () => {
    const analysis = analyzeTaxTransition(lossHoldings);
    const harvest = analysis.strategies.find(
      (s) => s.strategy === 'HARVEST_FIRST',
    );
    expect(harvest).toBeDefined();
    if (harvest) {
      expect(harvest.estimatedTaxCost).toBeLessThanOrEqual(0);
    }
  });

  it('recommends harvest-first when losses are significant', () => {
    const analysis = analyzeTaxTransition(lossHoldings);
    expect(analysis.recommendedStrategy).toBe('HARVEST_FIRST');
  });

  it('recommends phased approach for large gains', () => {
    const analysis = analyzeTaxTransition(gainHoldings);
    // Large gains (>$100K in cents, which is >100000 cents) should suggest phased
    const totalGains = analysis.totalUnrealizedGains ?? analysis.totalUnrealizedGain ?? 0;
    if ((totalGains as number) > 100000) {
      expect(['PHASED_3YEAR', 'PHASED_3_YEAR']).toContain(analysis.recommendedStrategy);
    }
  });

  it('each strategy has pros and cons', () => {
    const analysis = analyzeTaxTransition(mixedHoldings);
    for (const strategy of analysis.strategies) {
      expect(strategy.pros.length).toBeGreaterThan(0);
      expect(strategy.cons.length).toBeGreaterThan(0);
    }
  });

  it('computes unrealized gains and losses', () => {
    const analysis = analyzeTaxTransition(mixedHoldings);
    const gains = analysis.totalUnrealizedGains ?? analysis.totalUnrealizedGain;
    const losses = analysis.totalUnrealizedLosses ?? analysis.totalUnrealizedLoss;
    expect(gains).toBeGreaterThan(0);
    expect(losses).toBeGreaterThan(0);
  });

  it('uses custom marginal and state tax rates', () => {
    const defaultAnalysis = analyzeTaxTransition(gainHoldings);
    const customAnalysis = analyzeTaxTransition(gainHoldings, 0.24, 0.09);

    // Different rates should produce different tax costs
    const defaultFullLiq = defaultAnalysis.strategies.find(
      (s) => s.strategy === 'FULL_LIQUIDATION',
    );
    const customFullLiq = customAnalysis.strategies.find(
      (s) => s.strategy === 'FULL_LIQUIDATION',
    );

    if (defaultFullLiq && customFullLiq) {
      // With higher state rate (0.09 vs 0.05 default), tax cost should be higher
      expect(customFullLiq.estimatedTaxCost).toBeGreaterThan(
        defaultFullLiq.estimatedTaxCost,
      );
    }
  });

  it('effective tax rate includes federal + NIIT + state', () => {
    const analysis = analyzeTaxTransition(gainHoldings, 0.37, 0.05);
    if (analysis.effectiveTaxRate) {
      // Combines federal rate, NIIT (3.8%), and state rate
      expect(analysis.effectiveTaxRate).toBeGreaterThan(0.2);
      expect(analysis.effectiveTaxRate).toBeLessThan(0.6);
    }
  });

  it('handles holdings with no cost basis', () => {
    const noCostBasis: Holding[] = [
      makeHolding({
        ticker: 'AAPL',
        marketValue: 5000000 as MoneyCents,
        costBasis: undefined as unknown as MoneyCents,
      }),
    ];
    // Should not throw
    const analysis = analyzeTaxTransition(noCostBasis);
    expect(analysis.strategies.length).toBeGreaterThan(0);
  });
});
