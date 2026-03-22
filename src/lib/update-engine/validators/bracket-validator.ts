// =============================================================================
// Update Engine — Bracket Validator
// =============================================================================
//
// Comprehensive validation for tax brackets, contribution limits, IRMAA
// brackets, and AFR rates. Each validator checks structural integrity,
// reasonableness, and consistency with prior-year data.
// =============================================================================

import type { ValidationResult, TaxTableType } from '../types';

// ==================== Constants ====================

/** Expected number of federal income tax brackets per filing status. */
const EXPECTED_FEDERAL_BRACKET_COUNT = 7;

/** Maximum allowable marginal tax rate (100%). */
const MAX_TAX_RATE = 1.0;

/** Expected inflation range for bracket threshold adjustments. */
const INFLATION_RANGE = { min: 0.02, max: 0.04 };

/** Wider inflation range for unusual economic conditions. */
const WIDE_INFLATION_RANGE = { min: 0.01, max: 0.06 };

// ==================== Bracket Entry Interface ====================

interface BracketEntry {
  min: number;
  max: number | null;
  rate: number;
}

interface ContributionLimitEntry {
  accountType: string;
  limit: number;
  catchUpLimit?: number;
  priorYearLimit?: number;
}

interface IRMAAEntry {
  magiMin: number;
  magiMax: number | null;
  premium: number;
}

interface AFREntry {
  shortTerm: number;
  midTerm: number;
  longTerm: number;
  section7520Rate?: number;
}

// ==================== Bracket Validation ====================

/**
 * Validates a set of tax brackets for a given filing status and tax year.
 * Checks for:
 *   - Sequential ordering (no gaps or overlaps)
 *   - Ascending marginal rates
 *   - Maximum rate not exceeding 100%
 *   - Expected bracket count
 *   - Reasonable inflation adjustment vs prior year (if provided)
 *
 * @param brackets - Array of bracket entries to validate.
 * @param filingStatus - The filing status these brackets apply to.
 * @param taxYear - The tax year for context.
 * @param priorBrackets - Optional prior-year brackets for inflation comparison.
 * @returns A ValidationResult with pass/fail, warnings, and errors.
 */
export function validateBrackets(
  brackets: BracketEntry[],
  filingStatus: string,
  taxYear: number,
  priorBrackets?: BracketEntry[]
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check: brackets array is non-empty
  if (!brackets || brackets.length === 0) {
    errors.push(`No brackets provided for ${filingStatus} (tax year ${taxYear}).`);
    return { passed: false, warnings, errors, reason: 'No bracket data.' };
  }

  // Check: expected bracket count
  const isFederal = filingStatus === 'single' ||
    filingStatus === 'married_filing_jointly' ||
    filingStatus === 'married_filing_separately' ||
    filingStatus === 'head_of_household';

  if (isFederal && brackets.length !== EXPECTED_FEDERAL_BRACKET_COUNT) {
    warnings.push(
      `Expected ${EXPECTED_FEDERAL_BRACKET_COUNT} brackets for ${filingStatus}, got ${brackets.length}.`
    );
  }

  // Check: sequential ordering (no gaps, no overlaps)
  for (let i = 0; i < brackets.length - 1; i++) {
    const current = brackets[i];
    const next = brackets[i + 1];

    if (current.max === null) {
      errors.push(
        `Bracket ${i} has null max but is not the last bracket. ` +
        `Only the top bracket should have null max.`
      );
    }

    if (current.max !== null && current.max !== next.min) {
      errors.push(
        `Gap or overlap between bracket ${i} (max=${current.max}) ` +
        `and bracket ${i + 1} (min=${next.min}).`
      );
    }
  }

  // Check: first bracket starts at 0
  if (brackets[0].min !== 0) {
    errors.push(`First bracket should start at 0, but starts at ${brackets[0].min}.`);
  }

  // Check: last bracket has null max (open-ended top bracket)
  const lastBracket = brackets[brackets.length - 1];
  if (lastBracket.max !== null) {
    warnings.push(
      `Last bracket has a finite max of ${lastBracket.max}. ` +
      `Typically the top bracket has null max (open-ended).`
    );
  }

  // Check: ascending rates
  for (let i = 0; i < brackets.length - 1; i++) {
    if (brackets[i].rate >= brackets[i + 1].rate) {
      errors.push(
        `Rates are not strictly ascending: bracket ${i} rate=${brackets[i].rate} ` +
        `>= bracket ${i + 1} rate=${brackets[i + 1].rate}.`
      );
    }
  }

  // Check: no rate exceeds 100%
  for (let i = 0; i < brackets.length; i++) {
    if (brackets[i].rate > MAX_TAX_RATE) {
      errors.push(
        `Bracket ${i} rate of ${brackets[i].rate} exceeds maximum of ${MAX_TAX_RATE} (100%).`
      );
    }
    if (brackets[i].rate < 0) {
      errors.push(`Bracket ${i} has a negative rate of ${brackets[i].rate}.`);
    }
  }

  // Check: inflation adjustment range (compare to prior year if available)
  if (priorBrackets && priorBrackets.length === brackets.length) {
    for (let i = 1; i < brackets.length; i++) {
      const priorMin = priorBrackets[i].min;
      const currentMin = brackets[i].min;

      if (priorMin > 0) {
        const pctChange = (currentMin - priorMin) / priorMin;

        if (pctChange < INFLATION_RANGE.min || pctChange > INFLATION_RANGE.max) {
          if (pctChange < WIDE_INFLATION_RANGE.min || pctChange > WIDE_INFLATION_RANGE.max) {
            errors.push(
              `Bracket ${i} threshold change of ${(pctChange * 100).toFixed(1)}% ` +
              `is outside the acceptable range (${WIDE_INFLATION_RANGE.min * 100}%-${WIDE_INFLATION_RANGE.max * 100}%).`
            );
          } else {
            warnings.push(
              `Bracket ${i} threshold change of ${(pctChange * 100).toFixed(1)}% ` +
              `is outside typical CPI range (${INFLATION_RANGE.min * 100}%-${INFLATION_RANGE.max * 100}%) ` +
              `but within acceptable bounds.`
            );
          }
        }
      }
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? `All ${brackets.length} brackets validated for ${filingStatus} (${taxYear}).`
    : `${errors.length} error(s) found in brackets for ${filingStatus} (${taxYear}).`;

  return { passed, warnings, errors, reason };
}

// ==================== Contribution Limits Validation ====================

/**
 * Validates contribution limits for reasonableness.
 * Checks:
 *   - Limits are positive
 *   - Limits are >= prior year (contributions never decrease)
 *   - Changes are within expected inflation range
 *
 * @param limits - The contribution limit entries to validate.
 * @param taxYear - The tax year for context.
 * @param priorLimits - Optional prior-year limits for comparison.
 * @returns A ValidationResult.
 */
export function validateContributionLimits(
  limits: ContributionLimitEntry[],
  taxYear: number,
  priorLimits?: ContributionLimitEntry[]
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!limits || limits.length === 0) {
    errors.push(`No contribution limits provided for tax year ${taxYear}.`);
    return { passed: false, warnings, errors, reason: 'No limit data.' };
  }

  const priorMap = new Map(
    (priorLimits ?? []).map((l) => [l.accountType, l])
  );

  for (const limit of limits) {
    // Check: limit is positive
    if (limit.limit <= 0) {
      errors.push(`${limit.accountType} has a non-positive limit of ${limit.limit}.`);
    }

    // Check: catch-up limit is non-negative
    if (limit.catchUpLimit !== undefined && limit.catchUpLimit < 0) {
      errors.push(`${limit.accountType} has a negative catch-up limit of ${limit.catchUpLimit}.`);
    }

    // Check against prior year
    const prior = priorMap.get(limit.accountType);
    if (prior) {
      // Limits should not decrease
      if (limit.limit < prior.limit) {
        errors.push(
          `${limit.accountType} limit decreased from ${prior.limit} to ${limit.limit}. ` +
          `Contribution limits should not decrease year-over-year.`
        );
      }

      // Check inflation range
      if (prior.limit > 0) {
        const pctChange = (limit.limit - prior.limit) / prior.limit;
        if (pctChange > WIDE_INFLATION_RANGE.max) {
          warnings.push(
            `${limit.accountType} limit increased by ${(pctChange * 100).toFixed(1)}%, ` +
            `which exceeds the expected range.`
          );
        }
      }
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? `All ${limits.length} contribution limits validated for ${taxYear}.`
    : `${errors.length} error(s) found in contribution limits for ${taxYear}.`;

  return { passed, warnings, errors, reason };
}

// ==================== IRMAA Bracket Validation ====================

/**
 * Validates IRMAA brackets for structural integrity and reasonableness.
 * Checks:
 *   - Sequential MAGI thresholds (no gaps/overlaps)
 *   - Part B premiums >= prior year base premium
 *   - Premiums increase with MAGI tier
 *
 * @param brackets - The IRMAA bracket entries to validate.
 * @param taxYear - The tax year.
 * @param priorBasePremium - Optional prior-year base premium for comparison.
 * @returns A ValidationResult.
 */
export function validateIRMAAbrackets(
  brackets: IRMAAEntry[],
  taxYear: number,
  priorBasePremium?: number
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!brackets || brackets.length === 0) {
    errors.push(`No IRMAA brackets provided for tax year ${taxYear}.`);
    return { passed: false, warnings, errors, reason: 'No IRMAA data.' };
  }

  // Check: sequential MAGI thresholds
  for (let i = 0; i < brackets.length - 1; i++) {
    const current = brackets[i];
    const next = brackets[i + 1];

    if (current.magiMax !== null && current.magiMax !== next.magiMin) {
      errors.push(
        `Gap or overlap between IRMAA bracket ${i} (magiMax=${current.magiMax}) ` +
        `and bracket ${i + 1} (magiMin=${next.magiMin}).`
      );
    }
  }

  // Check: premiums are positive and non-decreasing
  for (let i = 0; i < brackets.length; i++) {
    if (brackets[i].premium <= 0) {
      errors.push(`IRMAA bracket ${i} has non-positive premium of ${brackets[i].premium}.`);
    }

    if (i > 0 && brackets[i].premium < brackets[i - 1].premium) {
      warnings.push(
        `IRMAA bracket ${i} premium (${brackets[i].premium}) is less than ` +
        `bracket ${i - 1} premium (${brackets[i - 1].premium}). ` +
        `Premiums typically increase with MAGI.`
      );
    }
  }

  // Check: base premium >= prior year
  if (priorBasePremium !== undefined && brackets.length > 0) {
    const basePremium = brackets[0].premium;
    if (basePremium < priorBasePremium) {
      warnings.push(
        `Base Part B premium (${basePremium}) is less than prior year (${priorBasePremium}). ` +
        `This is unusual but not impossible.`
      );
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? `All ${brackets.length} IRMAA brackets validated for ${taxYear}.`
    : `${errors.length} error(s) found in IRMAA brackets for ${taxYear}.`;

  return { passed, warnings, errors, reason };
}

// ==================== AFR Rate Validation ====================

/**
 * Validates Applicable Federal Rates for reasonableness.
 * Checks:
 *   - All rates are positive
 *   - Typical yield curve: short <= mid <= long
 *   - Rates are within reasonable historical range (0.01% to 15%)
 *
 * @param afr - The AFR rate entry to validate.
 * @returns A ValidationResult.
 */
export function validateAFRRates(afr: AFREntry): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const MIN_RATE = 0.0001; // 0.01%
  const MAX_RATE = 0.15;   // 15%

  // Check: all rates are positive
  if (afr.shortTerm <= 0) {
    errors.push(`Short-term AFR (${afr.shortTerm}) must be positive.`);
  }
  if (afr.midTerm <= 0) {
    errors.push(`Mid-term AFR (${afr.midTerm}) must be positive.`);
  }
  if (afr.longTerm <= 0) {
    errors.push(`Long-term AFR (${afr.longTerm}) must be positive.`);
  }

  // Check: rates within historical range
  for (const [label, rate] of [
    ['Short-term', afr.shortTerm],
    ['Mid-term', afr.midTerm],
    ['Long-term', afr.longTerm],
  ] as [string, number][]) {
    if (rate < MIN_RATE) {
      warnings.push(`${label} AFR (${rate}) is below typical minimum of ${MIN_RATE}.`);
    }
    if (rate > MAX_RATE) {
      errors.push(`${label} AFR (${rate}) exceeds maximum expected rate of ${MAX_RATE}.`);
    }
  }

  // Check: typical yield curve (short <= mid <= long)
  if (afr.shortTerm > afr.midTerm) {
    warnings.push(
      `Inverted yield curve detected: short-term (${afr.shortTerm}) > mid-term (${afr.midTerm}). ` +
      `This is unusual but can occur during economic stress.`
    );
  }
  if (afr.midTerm > afr.longTerm) {
    warnings.push(
      `Inverted yield curve detected: mid-term (${afr.midTerm}) > long-term (${afr.longTerm}). ` +
      `This is unusual but can occur during economic stress.`
    );
  }

  // Check: Section 7520 rate if present
  if (afr.section7520Rate !== undefined) {
    if (afr.section7520Rate <= 0) {
      errors.push(`Section 7520 rate (${afr.section7520Rate}) must be positive.`);
    }
    if (afr.section7520Rate > MAX_RATE) {
      errors.push(`Section 7520 rate (${afr.section7520Rate}) exceeds maximum expected rate.`);
    }
  }

  const passed = errors.length === 0;
  const reason = passed
    ? 'AFR rates validated successfully.'
    : `${errors.length} error(s) found in AFR rates.`;

  return { passed, warnings, errors, reason };
}

// Re-export for convenience
export type { ValidationResult, TaxTableType };
