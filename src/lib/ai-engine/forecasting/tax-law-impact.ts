// ==================== TAX LAW IMPACT MODELER ====================
// Models the impact of tax law changes (TCJA sunset, bracket changes,
// exemption changes) on a client's financial plan.

import type {
  TaxLawScenario,
  PlanSummary,
  TaxLawImpactResult,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

/**
 * Pre-TCJA (2017) bracket structure for married filing jointly.
 * Used as the reversion target when TCJA sunsets.
 */
const PRE_TCJA_BRACKETS_MFJ = [
  { rate: 0.10, minIncome: 0, maxIncome: 19_050 },
  { rate: 0.15, minIncome: 19_050, maxIncome: 77_400 },
  { rate: 0.25, minIncome: 77_400, maxIncome: 156_150 },
  { rate: 0.28, minIncome: 156_150, maxIncome: 237_950 },
  { rate: 0.33, minIncome: 237_950, maxIncome: 424_950 },
  { rate: 0.35, minIncome: 424_950, maxIncome: 480_050 },
  { rate: 0.396, minIncome: 480_050, maxIncome: null as number | null },
];

const PRE_TCJA_BRACKETS_SINGLE = [
  { rate: 0.10, minIncome: 0, maxIncome: 9_525 },
  { rate: 0.15, minIncome: 9_525, maxIncome: 38_700 },
  { rate: 0.25, minIncome: 38_700, maxIncome: 93_700 },
  { rate: 0.28, minIncome: 93_700, maxIncome: 195_450 },
  { rate: 0.33, minIncome: 195_450, maxIncome: 424_950 },
  { rate: 0.35, minIncome: 424_950, maxIncome: 426_700 },
  { rate: 0.396, minIncome: 426_700, maxIncome: null as number | null },
];

/** Current TCJA bracket structure (2025-era, inflation-adjusted estimates). */
const TCJA_BRACKETS_MFJ = [
  { rate: 0.10, minIncome: 0, maxIncome: 23_200 },
  { rate: 0.12, minIncome: 23_200, maxIncome: 94_300 },
  { rate: 0.22, minIncome: 94_300, maxIncome: 201_050 },
  { rate: 0.24, minIncome: 201_050, maxIncome: 383_900 },
  { rate: 0.32, minIncome: 383_900, maxIncome: 487_450 },
  { rate: 0.35, minIncome: 487_450, maxIncome: 731_200 },
  { rate: 0.37, minIncome: 731_200, maxIncome: null as number | null },
];

const TCJA_BRACKETS_SINGLE = [
  { rate: 0.10, minIncome: 0, maxIncome: 11_600 },
  { rate: 0.12, minIncome: 11_600, maxIncome: 47_150 },
  { rate: 0.22, minIncome: 47_150, maxIncome: 100_525 },
  { rate: 0.24, minIncome: 100_525, maxIncome: 191_950 },
  { rate: 0.32, minIncome: 191_950, maxIncome: 243_725 },
  { rate: 0.35, minIncome: 243_725, maxIncome: 609_350 },
  { rate: 0.37, minIncome: 609_350, maxIncome: null as number | null },
];

/**
 * Calculate tax using a bracket structure.
 */
function calculateTaxFromBrackets(
  taxableIncome: number,
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
): number {
  let tax = 0;
  for (const bracket of brackets) {
    const bracketMax = bracket.maxIncome ?? Infinity;
    if (taxableIncome <= bracket.minIncome) break;

    const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracket.minIncome;
    tax += Math.max(0, taxableInBracket) * bracket.rate;
  }
  return tax;
}

/**
 * Apply inflation adjustment to bracket thresholds.
 */
function inflationAdjustBrackets(
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
  inflationFactor: number,
): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  return brackets.map(b => ({
    rate: b.rate,
    minIncome: Math.round(b.minIncome * inflationFactor),
    maxIncome: b.maxIncome !== null ? Math.round(b.maxIncome * inflationFactor) : null,
  }));
}

/**
 * Get the appropriate bracket set based on filing status and TCJA status.
 */
function getBrackets(
  filingStatus: string,
  isTCJA: boolean,
): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  if (isTCJA) {
    return filingStatus === 'mfj' ? TCJA_BRACKETS_MFJ : TCJA_BRACKETS_SINGLE;
  }
  return filingStatus === 'mfj' ? PRE_TCJA_BRACKETS_MFJ : PRE_TCJA_BRACKETS_SINGLE;
}

/**
 * Apply bracket adjustments from the scenario.
 */
function applyBracketAdjustments(
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
  adjustments: Record<string, number>,
): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  return brackets.map(b => {
    const rateKey = b.rate.toString();
    const newRate = adjustments[rateKey];
    return {
      ...b,
      rate: newRate !== undefined ? newRate : b.rate,
    };
  });
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Models the impact of a tax law change on a client's financial plan.
 *
 * Scenarios modeled include:
 * - **TCJA sunset**: Brackets revert to pre-2018 rates (10/15/25/28/33/35/39.6%)
 * - **Bracket changes**: Custom rate adjustments
 * - **Estate exemption changes**: Impact on estate tax exposure
 * - **Standard deduction changes**: Impact on taxable income
 * - **Capital gains rate changes**: Impact on investment tax efficiency
 *
 * The modeler projects year-by-year tax impact over a 10-year horizon,
 * calculating cumulative impact and suggesting mitigation strategies.
 *
 * @param scenario - Description of the tax law change to model
 * @param planData - Client's current plan summary
 * @returns TaxLawImpactResult with year-by-year impact and mitigation strategies
 *
 * @example
 * ```ts
 * const result = modelTaxLawChange(
 *   { name: 'TCJA Sunset', tcjaSunset: true, effectiveYear: 2026, ... },
 *   planSummary,
 * );
 * console.log(`Cumulative impact: ${result.cumulativeImpact}`);
 * ```
 */
export function modelTaxLawChange(
  scenario: TaxLawScenario,
  planData: PlanSummary,
): TaxLawImpactResult {
  const projectionYears = 10;
  const inflationRate = 0.025; // assumed annual inflation
  const incomeGrowthRate = 0.03; // assumed annual income growth

  const annualImpact: TaxLawImpactResult['annualImpact'] = [];
  let cumulativeImpact = 0;

  // ── Year-by-year tax comparison ────────────────────────────────────────
  for (let yearOffset = 0; yearOffset < projectionYears; yearOffset++) {
    const year = planData.currentYear + yearOffset;
    const inflationFactor = Math.pow(1 + inflationRate, yearOffset);
    const projectedIncome = planData.taxableIncome * Math.pow(1 + incomeGrowthRate, yearOffset);

    // Standard deduction adjustment
    const currentLawStdDeduction = (planData.filingStatus === 'mfj' ? 29_200 : 14_600) * inflationFactor;
    const newLawStdDeduction = currentLawStdDeduction * scenario.standardDeductionMultiplier;

    // Current law taxable income
    const currentLawTaxableIncome = Math.max(0, projectedIncome - currentLawStdDeduction);

    // New law taxable income
    const newLawTaxableIncome = Math.max(0, projectedIncome - newLawStdDeduction);

    // Determine brackets
    const isBeforeEffective = year < scenario.effectiveYear;

    let currentLawBrackets = getBrackets(planData.filingStatus, true);
    let newLawBrackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>;

    if (isBeforeEffective) {
      // Before effective year, both use current law
      newLawBrackets = currentLawBrackets;
    } else if (scenario.tcjaSunset) {
      // After TCJA sunset, new law uses pre-TCJA brackets
      newLawBrackets = getBrackets(planData.filingStatus, false);
    } else {
      // Use current brackets with modifications
      newLawBrackets = [...currentLawBrackets];
    }

    // Apply bracket adjustments
    if (!isBeforeEffective && Object.keys(scenario.bracketAdjustments).length > 0) {
      newLawBrackets = applyBracketAdjustments(newLawBrackets, scenario.bracketAdjustments);
    }

    // Apply top rate override
    if (!isBeforeEffective && scenario.newTopRate !== null) {
      newLawBrackets = newLawBrackets.map((b, i) =>
        i === newLawBrackets.length - 1 ? { ...b, rate: scenario.newTopRate! } : b
      );
    }

    // Inflation-adjust brackets
    currentLawBrackets = inflationAdjustBrackets(currentLawBrackets, inflationFactor);
    newLawBrackets = inflationAdjustBrackets(newLawBrackets, inflationFactor);

    // Calculate taxes under each scenario
    const currentLawTax = calculateTaxFromBrackets(currentLawTaxableIncome, currentLawBrackets);
    const newLawTax = calculateTaxFromBrackets(newLawTaxableIncome, newLawBrackets);
    const difference = newLawTax - currentLawTax;

    annualImpact.push({
      year,
      currentLawTax: Math.round(currentLawTax),
      newLawTax: Math.round(newLawTax),
      difference: Math.round(difference),
    });

    cumulativeImpact += difference;
  }

  // ── Estate tax impact ──────────────────────────────────────────────────
  let estateImpact = 0;
  if (scenario.newEstateExemption !== null) {
    const currentExposure = Math.max(0, planData.grossEstateValue - planData.estateExemptionAmount);
    const newExposure = Math.max(0, planData.grossEstateValue - scenario.newEstateExemption);
    const additionalExposure = newExposure - currentExposure;
    estateImpact = additionalExposure * 0.40; // 40% estate tax rate
  } else if (scenario.tcjaSunset) {
    // TCJA sunset halves the exemption
    const sunsetExemption = planData.estateExemptionAmount * 0.5;
    const currentExposure = Math.max(0, planData.grossEstateValue - planData.estateExemptionAmount);
    const newExposure = Math.max(0, planData.grossEstateValue - sunsetExemption);
    estateImpact = (newExposure - currentExposure) * 0.40;
  }

  // ── Effective rate change ──────────────────────────────────────────────
  const currentEffectiveRate = planData.taxableIncome > 0
    ? calculateTaxFromBrackets(planData.taxableIncome, getBrackets(planData.filingStatus, true)) / planData.taxableIncome
    : 0;

  const newBrackets = scenario.tcjaSunset
    ? getBrackets(planData.filingStatus, false)
    : applyBracketAdjustments(
        getBrackets(planData.filingStatus, true),
        scenario.bracketAdjustments,
      );

  const adjustedIncome = scenario.standardDeductionMultiplier !== 1
    ? planData.taxableIncome * (1 + (1 - scenario.standardDeductionMultiplier) * 0.1)
    : planData.taxableIncome;

  const newEffectiveRate = adjustedIncome > 0
    ? calculateTaxFromBrackets(adjustedIncome, newBrackets) / adjustedIncome
    : 0;

  const effectiveRateChange = newEffectiveRate - currentEffectiveRate;

  // ── Mitigation strategies ──────────────────────────────────────────────
  const mitigationStrategies: string[] = [];

  if (scenario.tcjaSunset || cumulativeImpact > 0) {
    mitigationStrategies.push(
      'Accelerate Roth conversions before rates increase to lock in current lower rates'
    );

    if (planData.preTaxBalance > 100_000) {
      mitigationStrategies.push(
        `Convert pre-tax balances (${formatCurrency(planData.preTaxBalance)}) to Roth at current rates before sunset`
      );
    }

    if (scenario.standardDeductionMultiplier < 1) {
      mitigationStrategies.push(
        'Evaluate bunching itemized deductions in alternating years to maximize deduction benefit'
      );
    }
  }

  if (estateImpact > 0) {
    mitigationStrategies.push(
      `Use the current elevated estate exemption before sunset through lifetime gifts or irrevocable trusts`
    );
    mitigationStrategies.push(
      'Consider Spousal Lifetime Access Trusts (SLATs) to use both spouses\' exemptions'
    );
  }

  if (scenario.newLTCGTopRate !== null && scenario.newLTCGTopRate > 0.20) {
    mitigationStrategies.push(
      'Accelerate realization of long-term capital gains before the rate increase takes effect'
    );
    mitigationStrategies.push(
      'Increase allocation to tax-loss harvesting strategies to offset future higher-rate gains'
    );
  }

  if (scenario.newSaltCap !== null && scenario.newSaltCap === -1) {
    mitigationStrategies.push(
      'If the SALT cap is removed, review itemized deductions as they may now exceed the standard deduction'
    );
  }

  if (mitigationStrategies.length === 0) {
    mitigationStrategies.push('No specific mitigation actions required under this scenario');
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const direction = cumulativeImpact > 0 ? 'increase' : cumulativeImpact < 0 ? 'decrease' : 'not change';
  const totalImpact = Math.abs(cumulativeImpact) + Math.max(0, estateImpact);

  let summary = `Under the "${scenario.name}" scenario, cumulative income taxes would ${direction} by ${formatCurrency(Math.abs(Math.round(cumulativeImpact)))} over the next ${projectionYears} years.`;

  if (estateImpact > 0) {
    summary += ` Estate tax exposure would increase by approximately ${formatCurrency(Math.round(estateImpact))}.`;
  }

  if (effectiveRateChange > 0.01) {
    summary += ` The effective tax rate would increase by approximately ${(effectiveRateChange * 100).toFixed(1)} percentage points.`;
  }

  if (mitigationStrategies.length > 0 && totalImpact > 5_000) {
    summary += ` ${mitigationStrategies.length} mitigation strategies are available to reduce the impact.`;
  }

  return {
    scenarioName: scenario.name,
    annualImpact,
    cumulativeImpact: Math.round(cumulativeImpact),
    estateImpact: Math.round(estateImpact),
    effectiveRateChange: Math.round(effectiveRateChange * 10000) / 10000,
    mitigationStrategies,
    summary,
  };
}
