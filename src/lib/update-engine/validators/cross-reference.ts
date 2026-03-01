// =============================================================================
// Update Engine — Cross-Reference Validator
// =============================================================================
//
// Cross-references tax table data against known source patterns, prior-year
// values, and CPI data. Provides a second layer of validation beyond
// structural checks to catch data quality issues.
// =============================================================================

import type { ValidationResult, TaxTableType } from '../types';

// ==================== Constants ====================

/**
 * Expected inflation range for CPI-based consistency checks.
 * Widens to 1-6% to accommodate volatile economic periods.
 */
export const EXPECTED_INFLATION_RANGE = { min: 0.01, max: 0.06 };

/**
 * Expected number of brackets by filing status and table type.
 * Used to cross-reference scraped data against known IRS structures.
 */
export const KNOWN_BRACKET_COUNTS: Record<string, Record<string, number>> = {
  ordinary_income_brackets: {
    single: 7,
    married_filing_jointly: 7,
    married_filing_separately: 7,
    head_of_household: 7,
  },
  capital_gains_brackets: {
    single: 3,
    married_filing_jointly: 3,
    married_filing_separately: 3,
    head_of_household: 3,
  },
  amt_exemptions: {
    single: 2,
    married_filing_jointly: 2,
    married_filing_separately: 2,
  },
};

/**
 * Known sources with expected patterns for cross-referencing.
 */
const KNOWN_SOURCE_PATTERNS: Record<string, RegExp> = {
  'IRS Rev Proc': /^IRS\s+Rev\.?\s*Proc/i,
  'IRS Notice': /^IRS\s+Notice/i,
  'SSA COLA': /^SSA/i,
  'CMS': /^CMS/i,
  'IRS Revenue Ruling': /^IRS\s+Rev(enue)?\s*Rul/i,
  'Congress.gov': /congress\.gov/i,
};

// ==================== Cross-Reference With Source ====================

/**
 * Validates scraped data against known patterns for the declared source.
 * Checks that the data structure matches what is typically produced by
 * the given source type.
 *
 * @param data - The scraped data to validate.
 * @param tableType - The type of table this data represents.
 * @param source - The declared data source (e.g. "IRS Rev Proc 2026-45").
 * @returns A ValidationResult.
 */
export function crossReferenceWithSource(
  data: Record<string, unknown>,
  tableType: TaxTableType | string,
  source: string
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check: source matches a known pattern
  let sourceRecognized = false;
  for (const [name, pattern] of Object.entries(KNOWN_SOURCE_PATTERNS)) {
    if (pattern.test(source)) {
      sourceRecognized = true;

      // Verify the source is expected for this table type
      const expectedSources = getExpectedSources(tableType);
      if (!expectedSources.includes(name)) {
        warnings.push(
          `Source "${source}" (matched as "${name}") is not the typical source for ${tableType}. ` +
          `Expected: ${expectedSources.join(', ')}.`
        );
      }
      break;
    }
  }

  if (!sourceRecognized) {
    warnings.push(`Source "${source}" does not match any known source pattern.`);
  }

  // Check: data is non-empty
  if (Object.keys(data).length === 0) {
    errors.push('Data object is empty — expected at least one field.');
  }

  // Check: bracket count if applicable
  const knownCounts = KNOWN_BRACKET_COUNTS[tableType];
  if (knownCounts) {
    const brackets = data.brackets as unknown[] | undefined;
    const filingStatus = data.filingStatus as string | undefined;

    if (brackets && filingStatus && knownCounts[filingStatus]) {
      const expected = knownCounts[filingStatus];
      if (brackets.length !== expected) {
        warnings.push(
          `Expected ${expected} brackets for ${tableType}/${filingStatus}, got ${brackets.length}.`
        );
      }
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? `Cross-reference with source "${source}" passed for ${tableType}.`
    : `Cross-reference with source "${source}" failed for ${tableType}.`;

  return { passed, warnings, errors, reason };
}

/**
 * Returns the expected source names for a given table type.
 */
function getExpectedSources(tableType: TaxTableType | string): string[] {
  const sourceMap: Record<string, string[]> = {
    ordinary_income_brackets: ['IRS Rev Proc'],
    capital_gains_brackets: ['IRS Rev Proc'],
    amt_exemptions: ['IRS Rev Proc'],
    contribution_limits_401k: ['IRS Notice', 'IRS Rev Proc'],
    contribution_limits_ira: ['IRS Notice', 'IRS Rev Proc'],
    contribution_limits_hsa: ['IRS Notice', 'IRS Rev Proc'],
    irmaa_part_b: ['CMS'],
    irmaa_part_d: ['CMS'],
    ss_cola: ['SSA COLA'],
    ss_wage_base: ['SSA COLA'],
    ss_bend_points: ['SSA COLA'],
    afr_rates: ['IRS Revenue Ruling'],
    estate_exemption: ['IRS Rev Proc'],
    gift_exemption: ['IRS Rev Proc'],
    standard_deductions: ['IRS Rev Proc'],
    state_income_tax: [],
    rmd_tables: ['IRS Notice', 'IRS Rev Proc'],
  };

  return sourceMap[tableType] ?? [];
}

// ==================== Cross-Reference With Prior Year ====================

/**
 * Cross-references current-year data against prior-year data to ensure
 * changes are within expected ranges. Detects anomalies like sudden large
 * jumps or decreases that might indicate scraping errors.
 *
 * @param current - The proposed current-year data.
 * @param prior - The prior-year data to compare against.
 * @param tableType - The table type for context.
 * @returns A ValidationResult.
 */
export function crossReferenceWithPriorYear(
  current: Record<string, unknown>,
  prior: Record<string, unknown>,
  tableType: TaxTableType | string
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Extract numeric fields and compare
  const currentNumeric = extractNumericFields(current);
  const priorNumeric = extractNumericFields(prior);

  for (const [field, currentValue] of currentNumeric) {
    const priorValue = priorNumeric.get(field);
    if (priorValue === undefined || priorValue === 0) continue;

    const pctChange = (currentValue - priorValue) / Math.abs(priorValue);

    // Check for decreases (unusual for most tax parameters)
    if (pctChange < -0.001) {
      const isDecreaseable = tableType === 'afr_rates' ||
        tableType === 'ss_cola';

      if (!isDecreaseable) {
        warnings.push(
          `${field} decreased by ${(Math.abs(pctChange) * 100).toFixed(1)}% ` +
          `(${priorValue} -> ${currentValue}). Decreases are unusual for ${tableType}.`
        );
      }
    }

    // Check for abnormally large increases
    if (pctChange > EXPECTED_INFLATION_RANGE.max * 2) {
      errors.push(
        `${field} increased by ${(pctChange * 100).toFixed(1)}% ` +
        `(${priorValue} -> ${currentValue}), which is more than 2x the max expected ` +
        `inflation rate of ${EXPECTED_INFLATION_RANGE.max * 100}%. ` +
        `This may indicate a data error.`
      );
    } else if (pctChange > EXPECTED_INFLATION_RANGE.max) {
      warnings.push(
        `${field} increased by ${(pctChange * 100).toFixed(1)}% ` +
        `(${priorValue} -> ${currentValue}), which exceeds the typical inflation range.`
      );
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? `Prior-year cross-reference passed for ${tableType}.`
    : `Prior-year cross-reference found ${errors.length} error(s) for ${tableType}.`;

  return { passed, warnings, errors, reason };
}

/**
 * Recursively extracts all numeric fields from an object with their dot-path keys.
 */
function extractNumericFields(
  obj: Record<string, unknown>,
  prefix?: string
): Map<string, number> {
  const result = new Map<string, number>();

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'number' && isFinite(value)) {
      result.set(path, value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = extractNumericFields(value as Record<string, unknown>, path);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    }
  }

  return result;
}

// ==================== CPI Consistency Check ====================

/**
 * Verifies that a bracket inflation adjustment is consistent with
 * the reported CPI data. Used to catch cases where the IRS applies
 * rounding that differs from raw CPI calculations.
 *
 * @param bracketChange - The percent change in bracket thresholds.
 * @param cpiData - CPI inflation data to compare against.
 * @returns A ValidationResult.
 */
export function verifyCPIConsistency(
  bracketChange: number,
  cpiData: { annualRate: number; period: string }
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const cpiRate = cpiData.annualRate;

  // IRS rounds bracket thresholds to nearest $50 or $100, so allow
  // a wider tolerance than the raw CPI rate would suggest
  const tolerance = 0.015; // 1.5% tolerance for rounding effects
  const lowerBound = cpiRate - tolerance;
  const upperBound = cpiRate + tolerance;

  if (bracketChange < lowerBound) {
    warnings.push(
      `Bracket adjustment (${(bracketChange * 100).toFixed(2)}%) is below CPI ` +
      `(${(cpiRate * 100).toFixed(2)}%) minus tolerance. ` +
      `Period: ${cpiData.period}. This may be due to IRS rounding.`
    );
  }

  if (bracketChange > upperBound) {
    warnings.push(
      `Bracket adjustment (${(bracketChange * 100).toFixed(2)}%) exceeds CPI ` +
      `(${(cpiRate * 100).toFixed(2)}%) plus tolerance. ` +
      `Period: ${cpiData.period}. Verify the IRS applied the correct chained CPI-U.`
    );
  }

  // Hard error for extreme divergence (> 3% away from CPI)
  if (Math.abs(bracketChange - cpiRate) > 0.03) {
    errors.push(
      `Bracket adjustment diverges from CPI by more than 3%. ` +
      `Bracket change: ${(bracketChange * 100).toFixed(2)}%, ` +
      `CPI: ${(cpiRate * 100).toFixed(2)}%. ` +
      `This likely indicates a data error.`
    );
  }

  const passed = errors.length === 0;
  const reason = passed
    ? 'CPI consistency check passed.'
    : 'CPI consistency check failed — significant divergence detected.';

  return { passed, warnings, errors, reason };
}
