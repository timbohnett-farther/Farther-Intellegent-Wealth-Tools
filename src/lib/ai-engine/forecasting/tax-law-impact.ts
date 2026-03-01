// ==================== TAX LAW IMPACT MODELER ====================
// Models the impact of potential tax law changes (e.g., TCJA sunset,
// bracket changes, exemption changes) on a client's financial plan.

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
 * Simplified tax calculation for scenario modeling.
 * Uses a progressive bracket structure to compute total tax on ordinary income.
 */
function calculateSimplifiedTax(
  taxableIncome: number,
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
): number {
  let remainingIncome = taxableIncome;
  let totalTax = 0;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketWidth = bracket.maxIncome !== null
      ? bracket.maxIncome - bracket.minIncome
      : remainingIncome;

    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    totalTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return totalTax;
}

/**
 * Get the default 2025 TCJA brackets for a filing status (simplified).
 * These are the current-law brackets.
 */
function getCurrentLawBrackets(filingStatus: string): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  if (filingStatus === 'mfj') {
    return [
      { rate: 0.10, minIncome: 0, maxIncome: 23_200 },
      { rate: 0.12, minIncome: 23_200, maxIncome: 94_300 },
      { rate: 0.22, minIncome: 94_300, maxIncome: 201_050 },
      { rate: 0.24, minIncome: 201_050, maxIncome: 383_900 },
      { rate: 0.32, minIncome: 383_900, maxIncome: 487_450 },
      { rate: 0.35, minIncome: 487_450, maxIncome: 731_200 },
      { rate: 0.37, minIncome: 731_200, maxIncome: null },
    ];
  }
  // Single / default
  return [
    { rate: 0.10, minIncome: 0, maxIncome: 11_600 },
    { rate: 0.12, minIncome: 11_600, maxIncome: 47_150 },
    { rate: 0.22, minIncome: 47_150, maxIncome: 100_525 },
    { rate: 0.24, minIncome: 100_525, maxIncome: 191_950 },
    { rate: 0.32, minIncome: 191_950, maxIncome: 243_725 },
    { rate: 0.35, minIncome: 243_725, maxIncome: 609_350 },
    { rate: 0.37, minIncome: 609_350, maxIncome: null },
  ];
}

/**
 * Get the pre-TCJA brackets (approximation of 2017 brackets with inflation adjustments).
 * These represent the reversion if TCJA sunsets.
 */
function getPreTCJABrackets(filingStatus: string): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  if (filingStatus === 'mfj') {
    return [
      { rate: 0.10, minIncome: 0, maxIncome: 20_550 },
      { rate: 0.15, minIncome: 20_550, maxIncome: 83_550 },
      { rate: 0.25, minIncome: 83_550, maxIncome: 159_800 },
      { rate: 0.28, minIncome: 159_800, maxIncome: 243_500 },
      { rate: 0.33, minIncome: 243_500, maxIncome: 435_600 },
      { rate: 0.35, minIncome: 435_600, maxIncome: 500_000 },
      { rate: 0.396, minIncome: 500_000, maxIncome: null },
    ];
  }
  return [
    { rate: 0.10, minIncome: 0, maxIncome: 10_275 },
    { rate: 0.15, minIncome: 10_275, maxIncome: 41_775 },
    { rate: 0.25, minIncome: 41_775, maxIncome: 89_075 },
    { rate: 0.28, minIncome: 89_075, maxIncome: 170_050 },
    { rate: 0.33, minIncome: 170_050, maxIncome: 215_950 },
    { rate: 0.35, minIncome: 215_950, maxIncome: 540_000 },
    { rate: 0.396, minIncome: 540_000, maxIncome: null },
  ];
}

/**
 * Apply bracket adjustments from a scenario.
 * Returns modified brackets.
 */
function applyBracketAdjustments(
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
  adjustments: Record<string, number>,
  newTopRate: number | null,
): Array<{ rate: number; minIncome: number; maxIncome: number | null }> {
  let result = brackets.map(b => ({ ...b }));

  // Apply specific rate adjustments
  for (const [oldRateStr, newRate] of Object.entries(adjustments)) {
    const oldRate = parseFloat(oldRateStr);
    for (const bracket of result) {
      if (Math.abs(bracket.rate - oldRate) < 0.001) {
        bracket.rate = newRate;
      }
    }
  }

  // Apply new top rate if specified
  if (newTopRate !== null) {
    const lastBracket = result[result.length - 1];
    if (lastBracket) {
      lastBracket.rate = newTopRate;
    }
  }

  return result;
}

/**
 * Get the standard deduction under current law.
 */
function getCurrentStandardDeduction(filingStatus: string): number {
  const deductions: Record<string, number> = {
    single: 14_600,
    mfj: 29_200,
    mfs: 14_600,
    hoh: 21_900,
  };
  return deductions[filingStatus] ?? 14_600;
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Models the financial impact of a tax law change scenario on a client's plan.
 *
 * Analysis performed:
 * 1. **Bracket impact**: Calculates year-by-year tax under current law vs. new law
 * 2. **Standard deduction changes**: Models impact of deduction multiplier
 * 3. **Estate impact**: Calculates additional estate tax from exemption changes
 * 4. **Effective rate change**: Shows the change in overall effective tax rate
 * 5. **Mitigation strategies**: Suggests actions to reduce negative impacts
 *
 * The projection covers years from the effective year through a 10-year horizon.
 *
 * @param scenario - The tax law change to model
 * @param planData - Client's current plan summary
 * @returns Detailed impact analysis with year-by-year comparison
 *
 * @example
 * ```ts
 * const impact = modelTaxLawChange(tcjaSunsetScenario, planSummary);
 * console.log(`Cumulative impact: ${impact.cumulativeImpact}`);
 * ```
 */
export function modelTaxLawChange(
  scenario: TaxLawScenario,
  planData: PlanSummary,
): TaxLawImpactResult {
  const projectionYears = 10;
  const incomeGrowthRate = 0.025; // 2.5% annual income growth assumption

  // ── Step 1: Determine current-law and new-law brackets ─────────────────
  const currentBrackets = getCurrentLawBrackets(planData.filingStatus);
  let newLawBrackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>;

  if (scenario.tcjaSunset) {
    // Revert to pre-TCJA brackets
    newLawBrackets = getPreTCJABrackets(planData.filingStatus);
  } else {
    // Start from current brackets and apply adjustments
    newLawBrackets = applyBracketAdjustments(
      currentBrackets,
      scenario.bracketAdjustments,
      scenario.newTopRate,
    );
  }

  // Apply any additional bracket adjustments on top of sunset
  if (scenario.tcjaSunset && Object.keys(scenario.bracketAdjustments).length > 0) {
    newLawBrackets = applyBracketAdjustments(
      newLawBrackets,
      scenario.bracketAdjustments,
      scenario.newTopRate,
    );
  }

  // ── Step 2: Standard deduction adjustment ──────────────────────────────
  const currentStdDeduction = getCurrentStandardDeduction(planData.filingStatus);
  const newStdDeduction = scenario.tcjaSunset
    ? currentStdDeduction * 0.5 // Pre-TCJA standard deduction was roughly half
    : currentStdDeduction * scenario.standardDeductionMultiplier;

  // ── Step 3: Year-by-year tax comparison ────────────────────────────────
  const annualImpact: TaxLawImpactResult['annualImpact'] = [];
  let cumulativeImpact = 0;

  for (let i = 0; i < projectionYears; i++) {
    const year = scenario.effectiveYear + i;
    const yearsFromNow = year - planData.currentYear;

    // Project income forward
    const projectedAGI = planData.agi * Math.pow(1 + incomeGrowthRate, yearsFromNow);

    // Taxable income under current law
    const currentLawTaxable = Math.max(0, projectedAGI - currentStdDeduction);
    const currentLawTax = calculateSimplifiedTax(currentLawTaxable, currentBrackets);

    // Taxable income under new law
    const newLawTaxable = Math.max(0, projectedAGI - newStdDeduction);
    const newLawTax = calculateSimplifiedTax(newLawTaxable, newLawBrackets);

    const difference = newLawTax - currentLawTax;
    cumulativeImpact += difference;

    annualImpact.push({
      year,
      currentLawTax: Math.round(currentLawTax),
      newLawTax: Math.round(newLawTax),
      difference: Math.round(difference),
    });
  }

  // ── Step 4: Estate tax impact ──────────────────────────────────────────
  let estateImpact = 0;
  if (scenario.newEstateExemption !== null) {
    const currentEstateExposure = Math.max(0, planData.grossEstateValue - planData.estateExemptionAmount);
    const newEstateExposure = Math.max(0, planData.grossEstateValue - scenario.newEstateExemption);
    const additionalExposure = newEstateExposure - currentEstateExposure;
    estateImpact = additionalExposure * 0.40; // 40% estate tax rate
  } else if (scenario.tcjaSunset) {
    // TCJA sunset roughly halves the estate exemption
    const postSunsetExemption = planData.estateExemptionAmount * 0.5;
    const currentEstateExposure = Math.max(0, planData.grossEstateValue - planData.estateExemptionAmount);
    const newEstateExposure = Math.max(0, planData.grossEstateValue - postSunsetExemption);
    const additionalExposure = newEstateExposure - currentEstateExposure;
    estateImpact = additionalExposure * 0.40;
  }

  // ── Step 5: Effective rate change ──────────────────────────────────────
  const currentEffectiveRate = planData.agi > 0
    ? calculateSimplifiedTax(Math.max(0, planData.agi - currentStdDeduction), currentBrackets) / planData.agi
    : 0;
  const newEffectiveRate = planData.agi > 0
    ? calculateSimplifiedTax(Math.max(0, planData.agi - newStdDeduction), newLawBrackets) / planData.agi
    : 0;
  const effectiveRateChange = newEffectiveRate - currentEffectiveRate;

  // ── Step 6: Mitigation strategies ──────────────────────────────────────
  const mitigationStrategies: string[] = [];

  if (cumulativeImpact > 0) {
    // Tax increase scenario
    if (planData.preTaxBalance > 100_000) {
      mitigationStrategies.push(
        `Accelerate Roth conversions before ${scenario.effectiveYear} to lock in current lower rates. ${formatCurrency(planData.bracketHeadroom)} of headroom is available this year.`
      );
    }

    if (scenario.tcjaSunset || (scenario.newEstateExemption !== null && scenario.newEstateExemption < planData.estateExemptionAmount)) {
      mitigationStrategies.push(
        'Use the current elevated estate exemption before it decreases. Consider Spousal Lifetime Access Trusts (SLATs), Irrevocable Life Insurance Trusts (ILITs), or outright gifts.'
      );
    }

    if (scenario.newSaltCap === -1) {
      mitigationStrategies.push(
        'If the SALT cap is removed, evaluate whether itemizing deductions becomes more favorable than the standard deduction.'
      );
    } else if (scenario.tcjaSunset) {
      mitigationStrategies.push(
        'With the lower standard deduction under sunset, review whether itemizing deductions becomes more beneficial.'
      );
    }

    if (planData.hasAppreciatedStock) {
      mitigationStrategies.push(
        'Consider accelerating charitable giving of appreciated stock or funding a Donor-Advised Fund before higher rates take effect.'
      );
    }

    mitigationStrategies.push(
      `Review income timing around ${scenario.effectiveYear}: defer income into pre-change years where possible, or accelerate deductions into post-change years.`
    );
  } else if (cumulativeImpact < 0) {
    // Tax decrease scenario
    mitigationStrategies.push(
      'Consider deferring Roth conversions to post-change years when rates may be lower.'
    );
    mitigationStrategies.push(
      'Evaluate whether the tax savings create opportunities for additional retirement savings or investment.'
    );
  }

  // ── Step 7: Build summary ──────────────────────────────────────────────
  const direction = cumulativeImpact > 0 ? 'increase' : cumulativeImpact < 0 ? 'decrease' : 'not change';
  let summary = `Under the "${scenario.name}" scenario, income taxes would ${direction} by a cumulative ${formatCurrency(Math.abs(cumulativeImpact))} over ${projectionYears} years. `;

  if (annualImpact.length > 0) {
    const firstYearImpact = annualImpact[0].difference;
    summary += `In the first year (${annualImpact[0].year}), the annual tax ${firstYearImpact >= 0 ? 'increase' : 'decrease'} would be approximately ${formatCurrency(Math.abs(firstYearImpact))}. `;
  }

  summary += `The effective tax rate would ${effectiveRateChange >= 0 ? 'increase' : 'decrease'} by ${(Math.abs(effectiveRateChange) * 100).toFixed(1)} percentage points.`;

  if (estateImpact > 0) {
    summary += ` Estate taxes would increase by an estimated ${formatCurrency(estateImpact)}.`;
  }

  return {
    scenarioName: scenario.name,
    annualImpact,
    cumulativeImpact: Math.round(cumulativeImpact),
    estateImpact: Math.round(estateImpact),
    effectiveRateChange,
    mitigationStrategies,
    summary,
  };
}
