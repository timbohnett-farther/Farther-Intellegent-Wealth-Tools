// =============================================================================
// Tax Planning Platform -- Computation Engine v0 (Stage 1 Stub)
// =============================================================================
//
// Applies scenario overrides to extracted baseline lines and computes basic
// federal tax metrics using real progressive bracket tables from the policy
// registry.
//
// Stage 1 scope:
//   - Ordinary income tax via real IRS brackets
//   - Standard deduction (no itemized deduction logic yet)
//   - Effective marginal rate estimation (next-$1,000 ordinary & LTCG)
//
// Stage 2+ additions:
//   - NIIT, AMT, SE tax, IRMAA, SS benefit taxation
//   - Itemized deductions, QBI, child credits
//   - State tax modules
// =============================================================================

import {
  MoneyCents,
  TaxYear,
  FilingStatus,
  CalcRunStatus,
  ComputeResult,
  ScenarioOverride,
  TaxLineRef,
  cents,
  toDollars,
  COMMON_TAX_LINE_REFS,
} from './types';
import { policyRegistry, TaxPolicyTables } from './policy-registry';

// =====================================================================
// Public Types
// =====================================================================

/**
 * Input to the computation engine.
 */
export interface ComputeInput {
  /** UUID of the scenario being computed. */
  scenarioId: string;
  /** Tax year for policy lookup. */
  taxYear: TaxYear;
  /** Filing status for bracket selection. */
  filingStatus: FilingStatus;
  /** Baseline line values (typically from extraction). */
  baselineLines: Array<{ taxLineRef: TaxLineRef; valueCents: MoneyCents }>;
  /** Scenario overrides to apply on top of baseline. */
  overrides: ScenarioOverride[];
  /** Engine version label (defaults to '0.1.0-stub'). */
  engineVersion?: string;
}

// =====================================================================
// Internal Types
// =====================================================================

interface WorkingLine {
  taxLineRef: TaxLineRef;
  valueCents: MoneyCents;
  source: 'extracted' | 'override' | 'computed';
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Compute tax metrics for a scenario.
 *
 * Applies overrides to baseline lines, then computes federal ordinary income
 * tax using real progressive brackets from the policy registry. Returns a
 * {@link ComputeResult} with summary metrics and individual line items.
 *
 * @param input - Scenario computation parameters.
 * @returns Computed results including metrics and line breakdown.
 */
export function computeScenario(input: ComputeInput): ComputeResult {
  const engineVersion = input.engineVersion ?? '0.1.0-stub';

  // Look up policy tables for the requested tax year
  const policy = policyRegistry.getPolicy(input.taxYear);
  if (!policy) {
    return {
      calcRunId: generateId(),
      status: 'ERROR' as CalcRunStatus,
      metrics: {
        'error.reason': cents(0),
      },
      lines: [],
    };
  }

  // 1. Apply overrides to baseline lines
  const workingLines = applyOverrides(input.baselineLines, input.overrides);

  // 2. Read key values from working lines
  const getValue = (ref: TaxLineRef): MoneyCents => {
    const line = workingLines.find((l) => l.taxLineRef === ref);
    return line ? line.valueCents : (0 as MoneyCents);
  };

  const agi = getValue(COMMON_TAX_LINE_REFS.AGI);
  const wages = getValue(COMMON_TAX_LINE_REFS.WAGES);
  const interest = getValue(COMMON_TAX_LINE_REFS.TAXABLE_INTEREST);
  const qualDivs = getValue(COMMON_TAX_LINE_REFS.QUALIFIED_DIVIDENDS);
  const ordDivs = getValue(COMMON_TAX_LINE_REFS.ORDINARY_DIVIDENDS);
  const capGain = getValue(COMMON_TAX_LINE_REFS.CAPITAL_GAIN_LOSS);

  // 3. Compute standard deduction from policy
  const standardDeduction =
    policy.standardDeduction[input.filingStatus] ?? (0 as MoneyCents);

  // 4. Compute taxable income = AGI - standard deduction (floor at 0)
  const taxableIncome = Math.max(
    0,
    (agi as number) - (standardDeduction as number)
  ) as MoneyCents;

  // 5. Compute ordinary income tax using real progressive brackets
  const brackets = policy.ordinaryBrackets[input.filingStatus];
  if (!brackets) {
    return {
      calcRunId: generateId(),
      status: 'ERROR' as CalcRunStatus,
      metrics: {},
      lines: [],
    };
  }

  // For the Stage 1 stub, we apply ordinary rates to all taxable income.
  // Stage 2 will separate ordinary income from preferential-rate income
  // (qualified dividends and LTCG) and apply the correct rate schedules.
  const ordinaryTax = computeProgressiveTax(taxableIncome, brackets);

  // 6. Total tax = ordinary tax (Stage 1 -- no NIIT, AMT, SE tax, etc.)
  const totalTax = ordinaryTax;

  // 7. Compute effective marginal rates (EMR)
  //    next_1000_ordinary_bps: add $1,000 of ordinary income, see tax delta
  const taxableIncomePlus1000 = ((taxableIncome as number) +
    100_000) as MoneyCents; // $1,000 = 100,000 cents
  const taxPlus1000 = computeProgressiveTax(taxableIncomePlus1000, brackets);
  const taxDelta = (taxPlus1000 as number) - (ordinaryTax as number);
  // Convert delta to basis points: (delta / $1,000) * 10,000
  const nextOrdinaryBps = Math.round((taxDelta / 100_000) * 10_000);

  //    next_1000_ltcg_bps: Stage 1 stub uses LTCG brackets for a rough estimate
  const ltcgBrackets = policy.ltcgThresholds[input.filingStatus];
  let nextLtcgBps = 1500; // default 15% if no brackets available
  if (ltcgBrackets) {
    // Find which LTCG bracket the current taxable income falls in
    nextLtcgBps = findMarginalRate(taxableIncome, ltcgBrackets);
  }

  // 8. Build output lines
  const outputLines: Array<{
    taxLineRef: TaxLineRef;
    valueCents: MoneyCents;
    source: string;
  }> = [
    ...workingLines.map((wl) => ({
      taxLineRef: wl.taxLineRef,
      valueCents: wl.valueCents,
      source: wl.source,
    })),
    // Add computed lines
    {
      taxLineRef: COMMON_TAX_LINE_REFS.TAXABLE_INCOME,
      valueCents: taxableIncome,
      source: 'computed',
    },
    {
      taxLineRef: COMMON_TAX_LINE_REFS.TAX,
      valueCents: totalTax,
      source: 'computed',
    },
  ];

  // Deduplicate: computed lines take precedence over extracted/override
  const lineMap = new Map<
    TaxLineRef,
    { taxLineRef: TaxLineRef; valueCents: MoneyCents; source: string }
  >();
  for (const line of outputLines) {
    const existing = lineMap.get(line.taxLineRef);
    // Computed > override > extracted
    if (
      !existing ||
      line.source === 'computed' ||
      (line.source === 'override' && existing.source === 'extracted')
    ) {
      lineMap.set(line.taxLineRef, line);
    }
  }

  // 9. Build metrics map
  const metrics: Record<string, MoneyCents> = {
    'federal.agi_cents': agi,
    'federal.deduction_cents': standardDeduction,
    'federal.taxable_income_cents': taxableIncome,
    'federal.ordinary_tax_cents': ordinaryTax,
    'federal.total_tax_cents': totalTax,
    'emr.next_1000_ordinary_bps': nextOrdinaryBps as MoneyCents,
    'emr.next_1000_ltcg_bps': nextLtcgBps as MoneyCents,
  };

  // 10. Determine status
  let status: CalcRunStatus = 'OK';
  // Warn if AGI is zero or negative (unusual)
  if ((agi as number) <= 0) {
    status = 'WARN';
  }

  return {
    calcRunId: generateId(),
    status,
    metrics,
    lines: Array.from(lineMap.values()),
  };
}

/**
 * Compute progressive tax using a bracket table.
 *
 * This is a real implementation of the standard progressive tax algorithm
 * that will continue to be used in Stage 2+.
 *
 * @param taxableIncome - Taxable income in cents.
 * @param brackets - Sorted ascending array of bracket thresholds and rates.
 *   Each entry has `threshold` (lower bound in cents) and `rate` (in basis points).
 *   Tax = sum of (min(income, nextThreshold) - thisThreshold) * rate/10000
 *   for each bracket where income exceeds the threshold.
 * @returns Computed tax in cents as MoneyCents.
 */
export function computeProgressiveTax(
  taxableIncome: MoneyCents,
  brackets: Array<{ threshold: MoneyCents; rate: number }>
): MoneyCents {
  const income = taxableIncome as number;
  if (income <= 0) {
    return 0 as MoneyCents;
  }

  let totalTax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracketLower = brackets[i].threshold as number;
    const rate = brackets[i].rate / 10_000; // Convert bps to decimal

    // If income doesn't reach this bracket, we're done
    if (income <= bracketLower) {
      break;
    }

    // Upper bound is either the next bracket's threshold or the income itself
    const bracketUpper =
      i + 1 < brackets.length
        ? Math.min(income, brackets[i + 1].threshold as number)
        : income;

    // Taxable amount in this bracket
    const amountInBracket = bracketUpper - bracketLower;
    totalTax += amountInBracket * rate;
  }

  return Math.round(totalTax) as MoneyCents;
}

// =====================================================================
// Internal Helpers
// =====================================================================

/**
 * Apply scenario overrides to a set of baseline lines.
 *
 * - ABSOLUTE: replaces the value entirely.
 * - DELTA: adds the override amount to the existing value.
 *
 * Lines not targeted by any override are passed through unchanged with
 * source='extracted'. Overridden lines get source='override'.
 *
 * @param lines - Baseline extracted lines.
 * @param overrides - Scenario overrides to apply.
 * @returns New array of working lines with source provenance.
 */
function applyOverrides(
  lines: Array<{ taxLineRef: TaxLineRef; valueCents: MoneyCents }>,
  overrides: ScenarioOverride[]
): WorkingLine[] {
  // Start with a mutable copy of baseline lines
  const lineMap = new Map<TaxLineRef, WorkingLine>();

  for (const line of lines) {
    lineMap.set(line.taxLineRef, {
      taxLineRef: line.taxLineRef,
      valueCents: line.valueCents,
      source: 'extracted',
    });
  }

  // Apply each override
  for (const override of overrides) {
    const ref = override.target_tax_line_ref;
    const existing = lineMap.get(ref);

    if (override.mode === 'ABSOLUTE') {
      // Replace value entirely
      lineMap.set(ref, {
        taxLineRef: ref,
        valueCents: override.amount_cents,
        source: 'override',
      });
    } else if (override.mode === 'DELTA') {
      // Add to existing value (or start from 0 if line doesn't exist)
      const baseValue = existing ? (existing.valueCents as number) : 0;
      const newValue = (baseValue +
        (override.amount_cents as number)) as MoneyCents;
      lineMap.set(ref, {
        taxLineRef: ref,
        valueCents: newValue,
        source: 'override',
      });
    }
  }

  return Array.from(lineMap.values());
}

/**
 * Find the marginal rate for a given income level within a bracket table.
 * Returns the rate in basis points.
 */
function findMarginalRate(
  income: MoneyCents,
  brackets: Array<{ threshold: MoneyCents; rate: number }>
): number {
  let marginalRate = 0;

  for (let i = 0; i < brackets.length; i++) {
    if ((income as number) >= (brackets[i].threshold as number)) {
      marginalRate = brackets[i].rate as number;
    } else {
      break;
    }
  }

  return marginalRate;
}

/**
 * Generate a pseudo-UUID for Stage 1 (no crypto dependency required).
 * In production, this would use crypto.randomUUID().
 */
function generateId(): string {
  // Use a simple timestamp + random approach for the stub
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `calc-${ts}-${rand}`;
}
