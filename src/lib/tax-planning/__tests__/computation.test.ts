/**
 * Tests for tax-planning/computation.ts
 *
 * Covers: computeProgressiveTax, computeScenario, override application.
 */

import { describe, it, expect } from 'vitest';

import { computeScenario, computeProgressiveTax, ComputeInput } from '../computation';
import {
  cents,
  toDollars,
  MoneyCents,
  TaxYear,
  TaxLineRef,
  FilingStatus,
  ScenarioOverride,
  COMMON_TAX_LINE_REFS,
} from '../types';

// =============================================================================
// computeProgressiveTax
// =============================================================================

describe('computeProgressiveTax()', () => {
  // Simplified bracket table for testing:
  // 10% on first $10,000, 20% on $10,001-$50,000, 30% over $50,000
  const simpleBrackets = [
    { threshold: cents(0), rate: 1000 },       // 10% starting at $0
    { threshold: cents(10_000), rate: 2000 },   // 20% starting at $10k
    { threshold: cents(50_000), rate: 3000 },   // 30% starting at $50k
  ];

  it('returns 0 for zero income', () => {
    expect(computeProgressiveTax(cents(0), simpleBrackets)).toBe(0);
  });

  it('returns 0 for negative income', () => {
    expect(computeProgressiveTax(cents(-5_000), simpleBrackets)).toBe(0);
  });

  it('computes tax correctly within the first bracket', () => {
    // $5,000 at 10% = $500
    const tax = computeProgressiveTax(cents(5_000), simpleBrackets);
    expect(toDollars(tax)).toBe(500);
  });

  it('computes tax correctly at first bracket boundary', () => {
    // $10,000 at 10% = $1,000
    const tax = computeProgressiveTax(cents(10_000), simpleBrackets);
    expect(toDollars(tax)).toBe(1_000);
  });

  it('computes tax correctly across two brackets', () => {
    // $30,000: first $10k at 10% = $1,000, next $20k at 20% = $4,000 → $5,000
    const tax = computeProgressiveTax(cents(30_000), simpleBrackets);
    expect(toDollars(tax)).toBe(5_000);
  });

  it('computes tax correctly across all three brackets', () => {
    // $100,000:
    //   $10k at 10%  = $1,000
    //   $40k at 20%  = $8,000
    //   $50k at 30%  = $15,000
    //   Total        = $24,000
    const tax = computeProgressiveTax(cents(100_000), simpleBrackets);
    expect(toDollars(tax)).toBe(24_000);
  });

  it('handles a single-bracket table', () => {
    const flatBrackets = [{ threshold: cents(0), rate: 1500 }]; // 15% flat
    // $80,000 at 15% = $12,000
    const tax = computeProgressiveTax(cents(80_000), flatBrackets);
    expect(toDollars(tax)).toBe(12_000);
  });
});

// =============================================================================
// computeScenario
// =============================================================================

describe('computeScenario()', () => {
  const baselineLines = [
    { taxLineRef: COMMON_TAX_LINE_REFS.WAGES, valueCents: cents(150_000) },
    { taxLineRef: COMMON_TAX_LINE_REFS.TAXABLE_INTEREST, valueCents: cents(5_000) },
    { taxLineRef: COMMON_TAX_LINE_REFS.ORDINARY_DIVIDENDS, valueCents: cents(10_000) },
    { taxLineRef: COMMON_TAX_LINE_REFS.QUALIFIED_DIVIDENDS, valueCents: cents(8_000) },
    { taxLineRef: COMMON_TAX_LINE_REFS.CAPITAL_GAIN_LOSS, valueCents: cents(20_000) },
    { taxLineRef: COMMON_TAX_LINE_REFS.AGI, valueCents: cents(185_000) },
  ];

  const baseInput: ComputeInput = {
    scenarioId: 'scenario-001',
    taxYear: 2025 as TaxYear,
    filingStatus: 'MFJ',
    baselineLines,
    overrides: [],
  };

  it('returns status OK for valid input', () => {
    const result = computeScenario(baseInput);
    expect(result.status).toBe('OK');
  });

  it('returns a calcRunId', () => {
    const result = computeScenario(baseInput);
    expect(result.calcRunId).toBeTruthy();
    expect(typeof result.calcRunId).toBe('string');
  });

  it('computes federal AGI metric from baseline lines', () => {
    const result = computeScenario(baseInput);
    expect(result.metrics['federal.agi_cents']).toBe(cents(185_000));
  });

  it('computes standard deduction for MFJ 2025', () => {
    const result = computeScenario(baseInput);
    // 2025 MFJ standard deduction = $30,000
    expect(toDollars(result.metrics['federal.deduction_cents'])).toBe(30_000);
  });

  it('computes taxable income as AGI minus standard deduction', () => {
    const result = computeScenario(baseInput);
    // $185,000 AGI - $30,000 std ded = $155,000
    expect(toDollars(result.metrics['federal.taxable_income_cents'])).toBe(155_000);
  });

  it('computes a non-zero total tax', () => {
    const result = computeScenario(baseInput);
    const totalTax = toDollars(result.metrics['federal.total_tax_cents']);
    expect(totalTax).toBeGreaterThan(0);
  });

  it('computes EMR on next $1,000 ordinary income in basis points', () => {
    const result = computeScenario(baseInput);
    const emrOrdinary = result.metrics['emr.next_1000_ordinary_bps'] as number;
    // Should be a valid bracket rate (e.g., 2200 = 22% or 2400 = 24%)
    expect(emrOrdinary).toBeGreaterThan(0);
    expect(emrOrdinary).toBeLessThanOrEqual(3700); // max bracket is 37%
  });

  it('returns lines array with sources', () => {
    const result = computeScenario(baseInput);
    expect(result.lines.length).toBeGreaterThan(0);
    const sources = new Set(result.lines.map((l) => l.source));
    expect(sources.has('extracted')).toBe(true);
    expect(sources.has('computed')).toBe(true);
  });

  it('returns ERROR status for unsupported tax year', () => {
    const result = computeScenario({
      ...baseInput,
      taxYear: 2010 as TaxYear,
    });
    expect(result.status).toBe('ERROR');
  });

  it('returns WARN status for zero AGI', () => {
    const result = computeScenario({
      ...baseInput,
      baselineLines: [
        { taxLineRef: COMMON_TAX_LINE_REFS.AGI, valueCents: cents(0) },
      ],
    });
    expect(result.status).toBe('WARN');
  });

  describe('with overrides', () => {
    it('ABSOLUTE override replaces a line value', () => {
      const overrides: ScenarioOverride[] = [
        {
          override_id: 'ov-001',
          scenario_id: 'scenario-001',
          target_tax_line_ref: COMMON_TAX_LINE_REFS.AGI,
          mode: 'ABSOLUTE',
          amount_cents: cents(200_000),
        },
      ];

      const result = computeScenario({ ...baseInput, overrides });
      expect(result.metrics['federal.agi_cents']).toBe(cents(200_000));
    });

    it('DELTA override adds to the existing line value', () => {
      const overrides: ScenarioOverride[] = [
        {
          override_id: 'ov-002',
          scenario_id: 'scenario-001',
          target_tax_line_ref: COMMON_TAX_LINE_REFS.AGI,
          mode: 'DELTA',
          amount_cents: cents(50_000),
        },
      ];

      const result = computeScenario({ ...baseInput, overrides });
      // $185,000 + $50,000 = $235,000
      expect(result.metrics['federal.agi_cents']).toBe(cents(235_000));
    });

    it('higher AGI produces higher tax', () => {
      const baseResult = computeScenario(baseInput);
      const higherResult = computeScenario({
        ...baseInput,
        overrides: [
          {
            override_id: 'ov-003',
            scenario_id: 'scenario-001',
            target_tax_line_ref: COMMON_TAX_LINE_REFS.AGI,
            mode: 'ABSOLUTE',
            amount_cents: cents(500_000),
          },
        ],
      });

      const baseTax = baseResult.metrics['federal.total_tax_cents'] as number;
      const higherTax = higherResult.metrics['federal.total_tax_cents'] as number;
      expect(higherTax).toBeGreaterThan(baseTax);
    });
  });

  describe('filing status variations', () => {
    it('SINGLE has a lower standard deduction than MFJ', () => {
      const singleResult = computeScenario({ ...baseInput, filingStatus: 'SINGLE' });
      const mfjResult = computeScenario(baseInput);

      const singleDed = singleResult.metrics['federal.deduction_cents'] as number;
      const mfjDed = mfjResult.metrics['federal.deduction_cents'] as number;
      expect(singleDed).toBeLessThan(mfjDed);
    });

    it('SINGLE filer pays more tax than MFJ on same income', () => {
      const singleResult = computeScenario({ ...baseInput, filingStatus: 'SINGLE' });
      const mfjResult = computeScenario(baseInput);

      const singleTax = singleResult.metrics['federal.total_tax_cents'] as number;
      const mfjTax = mfjResult.metrics['federal.total_tax_cents'] as number;
      expect(singleTax).toBeGreaterThan(mfjTax);
    });
  });
});
