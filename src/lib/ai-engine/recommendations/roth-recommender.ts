// ==================== ROTH CONVERSION RECOMMENDER ====================
// Analyzes bracket headroom, IRMAA proximity, Social Security taxation impact,
// and multi-year optimization to produce a detailed Roth conversion recommendation.

import type {
  RothRecommendationInput,
  RothRecommendation,
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
 * Calculate tax on a given amount of ordinary income through the bracket structure.
 * Assumes income is stacked on top of existing taxable income.
 */
function calculateMarginalTax(
  additionalIncome: number,
  existingTaxableIncome: number,
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
): number {
  let remaining = additionalIncome;
  let totalTax = 0;
  const baseIncome = existingTaxableIncome;

  for (const bracket of brackets) {
    const bracketMax = bracket.maxIncome ?? Infinity;
    if (baseIncome >= bracketMax) continue;

    const bracketStart = Math.max(bracket.minIncome, baseIncome);
    const taxableInBracket = Math.min(remaining, bracketMax - bracketStart);

    if (taxableInBracket <= 0) continue;

    totalTax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;

    if (remaining <= 0) break;
  }

  return totalTax;
}

/**
 * Find the marginal rate for a given income level.
 */
function findMarginalRate(
  taxableIncome: number,
  brackets: Array<{ rate: number; minIncome: number; maxIncome: number | null }>,
): number {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome >= brackets[i].minIncome) {
      return brackets[i].rate;
    }
  }
  return brackets[0]?.rate ?? 0.10;
}

/**
 * Calculate IRMAA impact for a given MAGI.
 */
function calculateIRMAAImpact(
  magi: number,
  irmaaBrackets: Array<{ magiMin: number; magiMax: number | null; annualSurcharge: number }>,
): number {
  for (let i = irmaaBrackets.length - 1; i >= 0; i--) {
    if (magi >= irmaaBrackets[i].magiMin) {
      return irmaaBrackets[i].annualSurcharge;
    }
  }
  return 0;
}

/**
 * Estimate the increase in Social Security taxation from additional income.
 * SS becomes up to 85% taxable based on provisional income thresholds.
 */
function estimateSSTaxationIncrease(
  additionalIncome: number,
  currentAGI: number,
  ssBenefit: number,
  marginalRate: number,
  filingStatus: string,
): number {
  if (ssBenefit <= 0) return 0;

  const provisionalBase = filingStatus === 'mfj' ? 32_000 : 25_000;
  const provisionalUpper = filingStatus === 'mfj' ? 44_000 : 34_000;

  const currentProvisional = currentAGI + ssBenefit * 0.5;
  const newProvisional = currentProvisional + additionalIncome;

  // Calculate taxable SS percentage at current and new provisional income
  const calcTaxablePct = (provisional: number): number => {
    if (provisional <= provisionalBase) return 0;
    if (provisional <= provisionalUpper) return 0.50;
    return 0.85;
  };

  const currentPct = calcTaxablePct(currentProvisional);
  const newPct = calcTaxablePct(newProvisional);

  const currentTaxableSS = ssBenefit * currentPct;
  const newTaxableSS = ssBenefit * newPct;
  const additionalTaxableSS = newTaxableSS - currentTaxableSS;

  return additionalTaxableSS * marginalRate;
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Produces a comprehensive Roth conversion recommendation.
 *
 * Analysis performed:
 * 1. **Bracket headroom**: Calculates how much can be converted within each bracket
 * 2. **IRMAA proximity**: Checks whether conversion would trigger Medicare surcharges
 * 3. **SS taxation impact**: Estimates increase in Social Security taxation
 * 4. **Multi-year optimization**: Suggests a multi-year strategy based on time horizon
 * 5. **Net benefit calculation**: Compares current tax cost to projected lifetime savings
 *
 * @param input - Detailed input including tax brackets, balances, and assumptions
 * @returns A RothRecommendation with amount, tax cost, and multi-year strategy
 *
 * @example
 * ```ts
 * const rec = recommendRothConversion(input);
 * if (rec.shouldConvert) {
 *   console.log(`Convert ${rec.recommendedAmount} this year`);
 * }
 * ```
 */
export function recommendRothConversion(input: RothRecommendationInput): RothRecommendation {
  const {
    clientAge,
    filingStatus,
    taxableIncome,
    agi,
    taxBrackets,
    standardDeduction,
    preTaxBalance,
    rothBalance,
    retirementYear,
    currentYear,
    expectedRetirementRate,
    expectedReturn,
    magiTwoYearsAgo,
    irmaaBrackets,
    socialSecurityBenefit,
    rmdStartAge,
    planningHorizonAge,
  } = input;

  const yearsToRetirement = Math.max(0, retirementYear - currentYear);
  const yearsToRMD = Math.max(0, rmdStartAge - clientAge);
  const planningYears = Math.max(1, planningHorizonAge - clientAge);

  // ── Step 1: Bracket headroom analysis ──────────────────────────────────
  const bracketHeadroom: RothRecommendation['bracketHeadroom'] = [];
  let cumulativeConversion = 0;

  for (const bracket of taxBrackets) {
    const bracketMax = bracket.maxIncome ?? Infinity;
    if (taxableIncome >= bracketMax) {
      bracketHeadroom.push({
        bracketRate: bracket.rate,
        headroom: 0,
        conversionInBracket: 0,
        taxInBracket: 0,
      });
      continue;
    }

    const bracketStart = Math.max(bracket.minIncome, taxableIncome);
    const headroom = bracketMax === Infinity ? 500_000 : bracketMax - bracketStart;

    if (headroom <= 0) {
      bracketHeadroom.push({
        bracketRate: bracket.rate,
        headroom: 0,
        conversionInBracket: 0,
        taxInBracket: 0,
      });
      continue;
    }

    // Only fill brackets where current rate is less than expected retirement rate
    const conversionInBracket = bracket.rate < expectedRetirementRate + 0.02
      ? Math.min(headroom, preTaxBalance - cumulativeConversion)
      : 0;

    bracketHeadroom.push({
      bracketRate: bracket.rate,
      headroom: Math.max(0, headroom),
      conversionInBracket: Math.max(0, conversionInBracket),
      taxInBracket: Math.max(0, conversionInBracket) * bracket.rate,
    });

    cumulativeConversion += Math.max(0, conversionInBracket);
  }

  // ── Step 2: Determine recommended conversion amount ────────────────────
  // Start with bracket-filling amount, then constrain by IRMAA
  let recommendedAmount = cumulativeConversion;

  // ── Step 3: IRMAA constraint ───────────────────────────────────────────
  const currentIRMAA = calculateIRMAAImpact(magiTwoYearsAgo, irmaaBrackets);
  const projectedMAGI = agi + recommendedAmount;
  const newIRMAA = calculateIRMAAImpact(projectedMAGI, irmaaBrackets);
  const irmaaImpact = newIRMAA - currentIRMAA;

  // If IRMAA would be triggered, cap conversion to stay under threshold
  if (irmaaImpact > 0 && currentIRMAA === 0) {
    // Find the highest MAGI that doesn't trigger IRMAA
    const lowestIRMAAThreshold = irmaaBrackets
      .filter(b => b.annualSurcharge > 0)
      .reduce((min, b) => Math.min(min, b.magiMin), Infinity);

    if (lowestIRMAAThreshold < Infinity) {
      const maxConversionWithoutIRMAA = Math.max(0, lowestIRMAAThreshold - agi - 1_000);
      // Only constrain if the IRMAA cost exceeds the tax benefit of the additional conversion
      const additionalConversion = recommendedAmount - maxConversionWithoutIRMAA;
      const additionalTaxBenefit = additionalConversion * (expectedRetirementRate - findMarginalRate(taxableIncome + maxConversionWithoutIRMAA, taxBrackets));

      if (irmaaImpact * 2 > additionalTaxBenefit) {
        // IRMAA cost outweighs benefit over 2 years of surcharges
        recommendedAmount = Math.max(0, maxConversionWithoutIRMAA);
      }
    }
  }

  // Constrain to available pre-tax balance
  recommendedAmount = Math.min(recommendedAmount, preTaxBalance);
  recommendedAmount = Math.max(0, recommendedAmount);

  // ── Step 4: Calculate current-year tax cost ────────────────────────────
  const currentYearTaxCost = calculateMarginalTax(recommendedAmount, taxableIncome, taxBrackets);
  const marginalRateOnConversion = recommendedAmount > 0
    ? findMarginalRate(taxableIncome + recommendedAmount, taxBrackets)
    : findMarginalRate(taxableIncome, taxBrackets);

  // ── Step 5: SS taxation impact ─────────────────────────────────────────
  const ssTaxationImpact = estimateSSTaxationIncrease(
    recommendedAmount,
    agi,
    socialSecurityBenefit,
    marginalRateOnConversion,
    filingStatus,
  );

  // Recalculate IRMAA with final recommended amount
  const finalMAGI = agi + recommendedAmount;
  const finalIRMAA = calculateIRMAAImpact(finalMAGI, irmaaBrackets);
  const finalIrmaaImpact = finalIRMAA - currentIRMAA;

  // ── Step 6: Projected lifetime savings ─────────────────────────────────
  // The converted amount grows tax-free in Roth instead of being taxed on withdrawal
  const growthYears = Math.max(1, planningYears);
  const futureValueOfConversion = recommendedAmount * Math.pow(1 + expectedReturn, growthYears);
  const taxOnFutureWithdrawal = futureValueOfConversion * expectedRetirementRate;
  const taxOnConversionNow = currentYearTaxCost + ssTaxationImpact + Math.max(0, finalIrmaaImpact);

  // Also account for RMD avoidance: Roth has no RMDs
  const rmdYears = Math.max(0, planningHorizonAge - rmdStartAge);
  const avgRMDRate = 0.04; // approximate
  const rmdTaxAvoided = recommendedAmount * avgRMDRate * expectedRetirementRate * rmdYears;

  const projectedLifetimeSavings = taxOnFutureWithdrawal + rmdTaxAvoided;
  const netBenefit = projectedLifetimeSavings - taxOnConversionNow;

  // ── Step 7: Multi-year strategy ────────────────────────────────────────
  let multiYearStrategy: string;
  const annualConversionTarget = yearsToRetirement > 0
    ? Math.min(preTaxBalance / yearsToRetirement, cumulativeConversion)
    : cumulativeConversion;

  if (yearsToRetirement <= 0) {
    multiYearStrategy = `Post-retirement: Convert ${formatCurrency(recommendedAmount)} this year to fill the current bracket. Continue annual conversions through age ${rmdStartAge - 1} to reduce future RMDs.`;
  } else if (yearsToRetirement <= 5) {
    multiYearStrategy = `Short window: With ${yearsToRetirement} years to retirement, target ${formatCurrency(annualConversionTarget)}/year in conversions to systematically move ${formatCurrency(preTaxBalance * 0.5)} from pre-tax to Roth before RMDs begin.`;
  } else if (yearsToRetirement <= 15) {
    multiYearStrategy = `Steady conversion: Convert approximately ${formatCurrency(annualConversionTarget)}/year over the next ${yearsToRetirement} years, adjusting annually based on income fluctuations and bracket changes.`;
  } else {
    multiYearStrategy = `Long horizon: Focus on maximizing bracket-filling conversions each year. The ${yearsToRetirement}-year runway provides flexibility to time conversions around low-income years.`;
  }

  // ── Step 8: Should convert decision ────────────────────────────────────
  const shouldConvert = netBenefit > 0 && recommendedAmount > 0;

  // ── Step 9: Build reasoning ────────────────────────────────────────────
  let reasoning: string;
  if (!shouldConvert && recommendedAmount === 0) {
    reasoning = `No Roth conversion is recommended this year. The current tax bracket does not provide sufficient headroom, or the IRMAA impact outweighs the projected savings.`;
  } else if (!shouldConvert) {
    reasoning = `Although ${formatCurrency(recommendedAmount)} of bracket headroom exists, the net lifetime benefit is negative (${formatCurrency(netBenefit)}). The current marginal rate of ${(marginalRateOnConversion * 100).toFixed(0)}% is too close to or above the expected retirement rate of ${(expectedRetirementRate * 100).toFixed(0)}%.`;
  } else {
    const benefitSources: string[] = [];
    if (taxOnFutureWithdrawal > taxOnConversionNow) {
      benefitSources.push(`paying ${(marginalRateOnConversion * 100).toFixed(0)}% now versus a projected ${(expectedRetirementRate * 100).toFixed(0)}% in retirement`);
    }
    if (rmdTaxAvoided > 1_000) {
      benefitSources.push(`avoiding ${formatCurrency(rmdTaxAvoided)} in RMD-related taxes`);
    }
    if (finalIrmaaImpact <= 0) {
      benefitSources.push(`no IRMAA surcharge triggered`);
    }
    reasoning = `Recommend converting ${formatCurrency(recommendedAmount)} this year. The net benefit of ${formatCurrency(netBenefit)} comes from ${benefitSources.join(', ')}. ${multiYearStrategy}`;
  }

  return {
    shouldConvert,
    recommendedAmount,
    currentYearTaxCost,
    marginalRateOnConversion,
    irmaaImpact: Math.max(0, finalIrmaaImpact),
    ssTaxationImpact,
    bracketHeadroom,
    projectedLifetimeSavings,
    netBenefit,
    multiYearStrategy,
    reasoning,
  };
}
