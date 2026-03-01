/**
 * Tests for proposal-engine/fee-analyzer.ts
 *
 * Covers: computeFeeAnalysis, fee breakdowns, compounding projections.
 */

import { describe, it, expect } from 'vitest';

import { computeFeeAnalysis } from '../fee-analyzer';
import type { Holding } from '../types';
import type { MoneyCents } from '../../tax-planning/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeHolding(ticker: string, marketValue: number, expenseRatio: number): Holding {
  return {
    ticker,
    cusip: null,
    description: `${ticker} Fund`,
    assetClass: 'EQUITY_US_LARGE',
    quantity: 100,
    price: (marketValue / 100) as MoneyCents,
    marketValue: marketValue as MoneyCents,
    costBasis: (marketValue * 0.9) as MoneyCents,
    unrealizedGain: null,
    gainPct: null,
    holdingPeriod: 'LONG',
    expenseRatio,
    dividendYield: 0.015,
    accountType: 'TAXABLE',
    accountName: 'Main Brokerage',
  };
}

const currentHoldings: Holding[] = [
  makeHolding('FXAIX', 5000000, 0.0015), // 0.15% ER
  makeHolding('VFIAX', 3000000, 0.0004), // 0.04% ER
  makeHolding('BND', 2000000, 0.0003),   // 0.03% ER
];

const proposedHoldings: Holding[] = [
  makeHolding('VTI', 5000000, 0.0003),   // 0.03% ER
  makeHolding('VXUS', 3000000, 0.0007),  // 0.07% ER
  makeHolding('AGG', 2000000, 0.0003),   // 0.03% ER
];

// =============================================================================
// computeFeeAnalysis
// =============================================================================

describe('computeFeeAnalysis()', () => {
  const totalValue = 10000000 as MoneyCents; // $100K in cents

  it('returns current and proposed fee breakdowns', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    expect(analysis.current).toBeDefined();
    expect(analysis.proposed).toBeDefined();
    expect(typeof analysis.current.totalRate).toBe('number');
    expect(typeof analysis.proposed.totalRate).toBe('number');
  });

  it('computes positive annual savings when proposed fees are lower', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    expect(analysis.annualSavings).toBeGreaterThan(0);
  });

  it('computes negative savings when proposed fees are higher', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.005,
      proposedAdvisoryRate: 0.012,
    });

    expect(analysis.annualSavings).toBeLessThan(0);
  });

  it('includes advisory fee in total rate', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    expect(analysis.current.totalRate).toBeGreaterThanOrEqual(0.01);
    expect(analysis.proposed.totalRate).toBeGreaterThanOrEqual(0.008);
  });

  it('includes compounding impact projections', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    expect(analysis.compoundingImpact).toBeDefined();
    expect(analysis.compoundingImpact.length).toBeGreaterThan(0);
  });

  it('compounding differences increase over time', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    const impact = analysis.compoundingImpact;
    const fiveYear = impact.find((p) => p.years === 5);
    const thirtyYear = impact.find((p) => p.years === 30);

    if (fiveYear && thirtyYear) {
      expect(thirtyYear.difference).toBeGreaterThan(fiveYear.difference);
    }
  });

  it('compounding impact includes long-term projections', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    const tenYear = analysis.compoundingImpact.find((p) => p.years === 10);
    const thirtyYear = analysis.compoundingImpact.find((p) => p.years === 30);
    expect(tenYear).toBeDefined();
    expect(thirtyYear).toBeDefined();
    expect((thirtyYear!.difference as number)).toBeGreaterThan(
      (tenYear!.difference as number),
    );
  });

  it('handles zero total value gracefully', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings: [],
      proposedHoldings: [],
      totalValue: 0 as MoneyCents,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    expect(analysis.annualSavings).toBe(0);
    expect(analysis.current.totalDollars).toBe(0);
  });

  it('includes transaction costs when specified', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
      currentTransactionRate: 0.002,
      proposedTransactionRate: 0.001,
    });

    expect(analysis.current.transactionCostRate).toBe(0.002);
    expect(analysis.proposed.transactionCostRate).toBe(0.001);
    expect(analysis.current.totalRate).toBeGreaterThan(0.012); // advisory + fund ER + transaction
  });

  it('uses default 7% growth rate for projections', () => {
    const analysis = computeFeeAnalysis({
      currentHoldings,
      proposedHoldings,
      totalValue,
      currentAdvisoryRate: 0.01,
      proposedAdvisoryRate: 0.008,
    });

    // With 7% growth rate, 10-year projection should show significant growth
    const tenYear = analysis.compoundingImpact.find((p) => p.years === 10);
    if (tenYear) {
      expect(tenYear.currentWealth as number).toBeGreaterThan(totalValue as number);
      expect(tenYear.proposedWealth as number).toBeGreaterThan(totalValue as number);
    }
  });
});
