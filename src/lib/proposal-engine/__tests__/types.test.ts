/**
 * Tests for proposal-engine/types.ts helper functions
 *
 * Covers: formatCurrency, formatPct, formatCompact, riskScoreToLabel,
 * riskScoreToAllocation, constants.
 */

import { describe, it, expect } from 'vitest';

import {
  formatCurrency,
  formatPct,
  formatCompact,
  riskScoreToLabel,
  riskScoreToAllocation,
  DEFAULT_PROPOSAL_SECTIONS,
  RISK_QUESTIONS,
  SUPPORTED_INSTITUTIONS,
  cents,
} from '../types';
import type { MoneyCents } from '../../tax-planning/types';

// =============================================================================
// formatCurrency
// =============================================================================

describe('formatCurrency()', () => {
  it('formats positive cents as dollars', () => {
    expect(formatCurrency(123456 as MoneyCents)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0 as MoneyCents)).toBe('$0.00');
  });

  it('formats negative cents', () => {
    expect(formatCurrency(-50000 as MoneyCents)).toBe('-$500.00');
  });

  it('handles large values', () => {
    const result = formatCurrency(100000000 as MoneyCents);
    expect(result).toContain('$1,000,000');
  });
});

// =============================================================================
// formatPct
// =============================================================================

describe('formatPct()', () => {
  it('formats decimal as percentage', () => {
    expect(formatPct(0.0825)).toBe('8.25%');
  });

  it('formats zero', () => {
    expect(formatPct(0)).toBe('0.00%');
  });

  it('formats negative percentages', () => {
    expect(formatPct(-0.032, 1)).toBe('-3.2%');
  });

  it('respects decimal places parameter', () => {
    expect(formatPct(0.5, 0)).toBe('50%');
    expect(formatPct(0.12345, 3)).toBe('12.345%');
  });
});

// =============================================================================
// formatCompact
// =============================================================================

describe('formatCompact()', () => {
  it('formats thousands as K', () => {
    expect(formatCompact(50000000 as MoneyCents)).toBe('$500K');
  });

  it('formats millions as M', () => {
    expect(formatCompact(123456789 as MoneyCents)).toBe('$1.2M');
  });

  it('formats billions as B', () => {
    expect(formatCompact(250000000000 as MoneyCents)).toBe('$2.5B');
  });

  it('formats small values without suffix', () => {
    expect(formatCompact(99900 as MoneyCents)).toBe('$999');
  });

  it('formats negative values', () => {
    expect(formatCompact(-50000000 as MoneyCents)).toBe('-$500K');
  });
});

// =============================================================================
// riskScoreToLabel
// =============================================================================

describe('riskScoreToLabel()', () => {
  it('returns CONSERVATIVE for scores 1-20', () => {
    expect(riskScoreToLabel(1)).toBe('CONSERVATIVE');
    expect(riskScoreToLabel(20)).toBe('CONSERVATIVE');
  });

  it('returns MODERATELY_CONSERVATIVE for scores 21-40', () => {
    expect(riskScoreToLabel(21)).toBe('MODERATELY_CONSERVATIVE');
    expect(riskScoreToLabel(40)).toBe('MODERATELY_CONSERVATIVE');
  });

  it('returns MODERATE for scores 41-60', () => {
    expect(riskScoreToLabel(41)).toBe('MODERATE');
    expect(riskScoreToLabel(60)).toBe('MODERATE');
  });

  it('returns MODERATELY_AGGRESSIVE for scores 61-80', () => {
    expect(riskScoreToLabel(61)).toBe('MODERATELY_AGGRESSIVE');
    expect(riskScoreToLabel(80)).toBe('MODERATELY_AGGRESSIVE');
  });

  it('returns AGGRESSIVE for scores 81-100', () => {
    expect(riskScoreToLabel(81)).toBe('AGGRESSIVE');
    expect(riskScoreToLabel(100)).toBe('AGGRESSIVE');
  });

  it('throws for scores outside 1-100', () => {
    expect(() => riskScoreToLabel(0)).toThrow();
    expect(() => riskScoreToLabel(101)).toThrow();
  });
});

// =============================================================================
// riskScoreToAllocation
// =============================================================================

describe('riskScoreToAllocation()', () => {
  it('allocations always sum to 100', () => {
    for (let score = 1; score <= 100; score++) {
      const alloc = riskScoreToAllocation(score);
      const sum = alloc.equity + alloc.fixedIncome + alloc.alternatives + alloc.cash;
      expect(sum).toBe(100);
    }
  });

  it('conservative score produces low equity', () => {
    const alloc = riskScoreToAllocation(1);
    expect(alloc.equity).toBe(20);
    expect(alloc.fixedIncome).toBe(60);
  });

  it('aggressive score produces high equity', () => {
    const alloc = riskScoreToAllocation(100);
    expect(alloc.equity).toBe(90);
    expect(alloc.fixedIncome).toBe(5);
  });

  it('equity increases monotonically with score', () => {
    let prevEquity = 0;
    for (let score = 1; score <= 100; score++) {
      const alloc = riskScoreToAllocation(score);
      expect(alloc.equity).toBeGreaterThanOrEqual(prevEquity);
      prevEquity = alloc.equity;
    }
  });

  it('alternatives is constant at 5%', () => {
    for (const score of [1, 25, 50, 75, 100]) {
      expect(riskScoreToAllocation(score).alternatives).toBe(5);
    }
  });

  it('throws for scores outside 1-100', () => {
    expect(() => riskScoreToAllocation(0)).toThrow();
    expect(() => riskScoreToAllocation(101)).toThrow();
  });
});

// =============================================================================
// Constants
// =============================================================================

describe('DEFAULT_PROPOSAL_SECTIONS', () => {
  it('has at least 15 sections', () => {
    expect(DEFAULT_PROPOSAL_SECTIONS.length).toBeGreaterThanOrEqual(15);
  });

  it('has cover page as first required section', () => {
    const cover = DEFAULT_PROPOSAL_SECTIONS.find((s) => s.key === 'cover');
    expect(cover).toBeDefined();
    expect(cover!.required).toBe(true);
    expect(cover!.included).toBe(true);
  });

  it('has disclosures as required section', () => {
    const disc = DEFAULT_PROPOSAL_SECTIONS.find((s) => s.key === 'disclosures');
    expect(disc).toBeDefined();
    expect(disc!.required).toBe(true);
  });

  it('each section has unique key', () => {
    const keys = DEFAULT_PROPOSAL_SECTIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('RISK_QUESTIONS', () => {
  it('has 8 questions', () => {
    expect(RISK_QUESTIONS.length).toBe(8);
  });

  it('weights sum to approximately 1.0', () => {
    const totalWeight = RISK_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('each question has a unique id', () => {
    const ids = RISK_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each question has valid type', () => {
    const validTypes = ['SLIDER', 'SINGLE_CHOICE', 'VISUAL_CHART', 'INTERACTIVE_BAR', 'GAMBLE'];
    for (const q of RISK_QUESTIONS) {
      expect(validTypes).toContain(q.type);
    }
  });
});

describe('SUPPORTED_INSTITUTIONS', () => {
  it('has at least 30 institutions', () => {
    expect(SUPPORTED_INSTITUTIONS.length).toBeGreaterThanOrEqual(30);
  });

  it('includes major custodians', () => {
    expect(SUPPORTED_INSTITUTIONS).toContain('Schwab');
    expect(SUPPORTED_INSTITUTIONS).toContain('Fidelity');
    expect(SUPPORTED_INSTITUTIONS).toContain('Vanguard');
  });
});
