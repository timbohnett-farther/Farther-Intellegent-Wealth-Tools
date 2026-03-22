/**
 * Tests for tax-planning/types.ts helper functions and constants.
 *
 * Covers: cents(), toDollars(), bps(), toPercent(), parseTaxLineRef(),
 * formatTaxLineRef(), and COMMON_TAX_LINE_REFS.
 */

import { describe, it, expect } from 'vitest';

import {
  cents,
  toDollars,
  bps,
  toPercent,
  parseTaxLineRef,
  formatTaxLineRef,
  COMMON_TAX_LINE_REFS,
} from '../types';

import type { MoneyCents, RateBps, TaxLineRef } from '../types';

// =============================================================================
// cents()
// =============================================================================

describe('cents()', () => {
  it('converts whole dollar amounts to cents', () => {
    expect(cents(1)).toBe(100);
    expect(cents(0)).toBe(0);
    expect(cents(1000)).toBe(100_000);
  });

  it('converts dollar amounts with decimals to cents', () => {
    expect(cents(19.99)).toBe(1999);
    expect(cents(0.01)).toBe(1);
    expect(cents(0.50)).toBe(50);
    expect(cents(1234.56)).toBe(123_456);
  });

  it('rounds to the nearest cent to avoid floating-point drift', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    expect(cents(0.1 + 0.2)).toBe(30);
    // 19.995 should round to 2000 cents ($20.00)
    expect(cents(19.995)).toBe(2000);
    // 19.994 should round to 1999 cents ($19.99)
    expect(cents(19.994)).toBe(1999);
  });

  it('handles negative dollar amounts', () => {
    expect(cents(-50)).toBe(-5000);
    expect(cents(-0.99)).toBe(-99);
  });

  it('handles very large dollar amounts safely', () => {
    // $1,000,000.00
    expect(cents(1_000_000)).toBe(100_000_000);
    // $10,000,000.50
    expect(cents(10_000_000.50)).toBe(1_000_000_050);
  });

  it('returns a value that is assignable to MoneyCents (branded type)', () => {
    const result: MoneyCents = cents(42);
    expect(typeof result).toBe('number');
  });
});

// =============================================================================
// toDollars()
// =============================================================================

describe('toDollars()', () => {
  it('converts cents back to dollars', () => {
    expect(toDollars(100 as MoneyCents)).toBe(1);
    expect(toDollars(0 as MoneyCents)).toBe(0);
    expect(toDollars(1999 as MoneyCents)).toBe(19.99);
  });

  it('handles sub-dollar amounts', () => {
    expect(toDollars(1 as MoneyCents)).toBe(0.01);
    expect(toDollars(50 as MoneyCents)).toBe(0.50);
    expect(toDollars(99 as MoneyCents)).toBe(0.99);
  });

  it('handles negative cent values', () => {
    expect(toDollars(-5000 as MoneyCents)).toBe(-50);
    expect(toDollars(-99 as MoneyCents)).toBe(-0.99);
  });

  it('is the inverse of cents() for clean values', () => {
    expect(toDollars(cents(123.45))).toBe(123.45);
    expect(toDollars(cents(0))).toBe(0);
    expect(toDollars(cents(1_000_000))).toBe(1_000_000);
  });

  it('handles large cent values', () => {
    expect(toDollars(100_000_000 as MoneyCents)).toBe(1_000_000);
  });
});

// =============================================================================
// bps()
// =============================================================================

describe('bps()', () => {
  it('converts percentage to basis points', () => {
    expect(bps(1)).toBe(100);
    expect(bps(5)).toBe(500);
    expect(bps(100)).toBe(10_000);
  });

  it('converts fractional percentages', () => {
    expect(bps(5.25)).toBe(525);
    expect(bps(3.8)).toBe(380);
    expect(bps(0.01)).toBe(1);
    expect(bps(0.5)).toBe(50);
  });

  it('rounds to the nearest integer bps', () => {
    expect(bps(5.255)).toBe(526);
    expect(bps(5.254)).toBe(525);
  });

  it('handles zero', () => {
    expect(bps(0)).toBe(0);
  });

  it('handles negative rates', () => {
    expect(bps(-1)).toBe(-100);
    expect(bps(-0.5)).toBe(-50);
  });

  it('returns a value that is assignable to RateBps (branded type)', () => {
    const result: RateBps = bps(10);
    expect(typeof result).toBe('number');
  });
});

// =============================================================================
// toPercent()
// =============================================================================

describe('toPercent()', () => {
  it('converts basis points back to percentage', () => {
    expect(toPercent(100 as RateBps)).toBe(1);
    expect(toPercent(500 as RateBps)).toBe(5);
    expect(toPercent(10_000 as RateBps)).toBe(100);
  });

  it('handles fractional basis point conversions', () => {
    expect(toPercent(525 as RateBps)).toBe(5.25);
    expect(toPercent(380 as RateBps)).toBe(3.8);
    expect(toPercent(1 as RateBps)).toBe(0.01);
  });

  it('handles zero', () => {
    expect(toPercent(0 as RateBps)).toBe(0);
  });

  it('handles negative basis points', () => {
    expect(toPercent(-100 as RateBps)).toBe(-1);
  });

  it('is the inverse of bps() for clean values', () => {
    expect(toPercent(bps(12.4))).toBe(12.4);
    expect(toPercent(bps(0))).toBe(0);
    expect(toPercent(bps(37))).toBe(37);
  });
});

// =============================================================================
// parseTaxLineRef()
// =============================================================================

describe('parseTaxLineRef()', () => {
  it('parses a valid three-part ref into form, line, and slot', () => {
    const result = parseTaxLineRef('f1040:l1z:wages' as TaxLineRef);
    expect(result).toEqual({ form: 'f1040', line: 'l1z', slot: 'wages' });
  });

  it('parses refs with different form identifiers', () => {
    const result = parseTaxLineRef('schedD:l21:net_gain' as TaxLineRef);
    expect(result).toEqual({ form: 'schedD', line: 'l21', slot: 'net_gain' });
  });

  it('throws an error for a ref with fewer than 3 parts', () => {
    expect(() => parseTaxLineRef('f1040:l1z' as TaxLineRef)).toThrow(
      'Invalid TaxLineRef'
    );
  });

  it('throws an error for a ref with more than 3 parts', () => {
    expect(() => parseTaxLineRef('f1040:l1z:wages:extra' as TaxLineRef)).toThrow(
      'Invalid TaxLineRef'
    );
  });

  it('throws an error for an empty string', () => {
    expect(() => parseTaxLineRef('' as TaxLineRef)).toThrow('Invalid TaxLineRef');
  });

  it('throws an error for a string with no colons', () => {
    expect(() => parseTaxLineRef('f1040_l1z_wages' as TaxLineRef)).toThrow(
      'Invalid TaxLineRef'
    );
  });

  it('parses a ref with empty slot (edge case)', () => {
    // While unusual, the function only checks for 3 parts
    const result = parseTaxLineRef('f1040:l1z:' as TaxLineRef);
    expect(result).toEqual({ form: 'f1040', line: 'l1z', slot: '' });
  });
});

// =============================================================================
// formatTaxLineRef()
// =============================================================================

describe('formatTaxLineRef()', () => {
  it('creates a valid ref from three components', () => {
    const ref = formatTaxLineRef('f1040', 'l1z', 'wages');
    expect(ref).toBe('f1040:l1z:wages');
  });

  it('returns a value assignable to TaxLineRef (branded type)', () => {
    const ref: TaxLineRef = formatTaxLineRef('f1040', 'l11', 'agi');
    expect(typeof ref).toBe('string');
  });

  it('round-trips with parseTaxLineRef', () => {
    const ref = formatTaxLineRef('f1040', 'l16', 'tax');
    const parsed = parseTaxLineRef(ref);
    expect(parsed).toEqual({ form: 'f1040', line: 'l16', slot: 'tax' });
  });

  it('handles schedule-style form identifiers', () => {
    const ref = formatTaxLineRef('schedC', 'l31', 'net_profit');
    expect(ref).toBe('schedC:l31:net_profit');
  });

  it('creates a ref that can be parsed back identically', () => {
    const original = { form: 'f8949', line: 'col_h', slot: 'proceeds' };
    const ref = formatTaxLineRef(original.form, original.line, original.slot);
    expect(parseTaxLineRef(ref)).toEqual(original);
  });
});

// =============================================================================
// COMMON_TAX_LINE_REFS
// =============================================================================

describe('COMMON_TAX_LINE_REFS', () => {
  it('contains exactly 8 entries', () => {
    expect(Object.keys(COMMON_TAX_LINE_REFS)).toHaveLength(8);
  });

  it('has a WAGES ref pointing to f1040:l1z:wages', () => {
    expect(COMMON_TAX_LINE_REFS.WAGES).toBe('f1040:l1z:wages');
  });

  it('has a TAXABLE_INTEREST ref pointing to f1040:l2b:taxable_interest', () => {
    expect(COMMON_TAX_LINE_REFS.TAXABLE_INTEREST).toBe('f1040:l2b:taxable_interest');
  });

  it('has a QUALIFIED_DIVIDENDS ref pointing to f1040:l3a:qualified_dividends', () => {
    expect(COMMON_TAX_LINE_REFS.QUALIFIED_DIVIDENDS).toBe('f1040:l3a:qualified_dividends');
  });

  it('has an ORDINARY_DIVIDENDS ref pointing to f1040:l3b:ordinary_dividends', () => {
    expect(COMMON_TAX_LINE_REFS.ORDINARY_DIVIDENDS).toBe('f1040:l3b:ordinary_dividends');
  });

  it('has a CAPITAL_GAIN_LOSS ref pointing to f1040:l7:capital_gain_loss', () => {
    expect(COMMON_TAX_LINE_REFS.CAPITAL_GAIN_LOSS).toBe('f1040:l7:capital_gain_loss');
  });

  it('has an AGI ref pointing to f1040:l11:agi', () => {
    expect(COMMON_TAX_LINE_REFS.AGI).toBe('f1040:l11:agi');
  });

  it('has a TAXABLE_INCOME ref pointing to f1040:l15:taxable_income', () => {
    expect(COMMON_TAX_LINE_REFS.TAXABLE_INCOME).toBe('f1040:l15:taxable_income');
  });

  it('has a TAX ref pointing to f1040:l16:tax', () => {
    expect(COMMON_TAX_LINE_REFS.TAX).toBe('f1040:l16:tax');
  });

  it('all refs are parseable by parseTaxLineRef', () => {
    for (const [key, ref] of Object.entries(COMMON_TAX_LINE_REFS)) {
      expect(() => parseTaxLineRef(ref)).not.toThrow();
      const parsed = parseTaxLineRef(ref);
      expect(parsed.form).toBe('f1040');
      expect(parsed.line).toBeTruthy();
      expect(parsed.slot).toBeTruthy();
    }
  });

  it('all refs are on Form 1040', () => {
    for (const ref of Object.values(COMMON_TAX_LINE_REFS)) {
      const parsed = parseTaxLineRef(ref);
      expect(parsed.form).toBe('f1040');
    }
  });
});
