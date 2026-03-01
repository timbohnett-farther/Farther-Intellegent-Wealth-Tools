// ==================== SOCIAL SECURITY RECOMMENDER ====================
// Performs break-even analysis, spousal coordination, and survivor
// optimization to recommend an optimal claiming strategy.

import type {
  SSRecommendationInput,
  SSRecommendation,
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
 * Calculate the monthly SS benefit at a given claiming age.
 * Uses the standard early/late adjustment factors.
 *
 * - Before FRA: reduced by 5/9 of 1% per month for first 36 months, then 5/12 of 1% per month
 * - After FRA: increased by 2/3 of 1% per month (8% per year) up to age 70
 */
function calculateMonthlyBenefit(pia: number, claimAge: number, fra: number): number {
  if (claimAge === fra) return pia;

  const monthsDiff = Math.round((claimAge - fra) * 12);

  if (monthsDiff < 0) {
    // Early claiming — reduction
    const earlyMonths = Math.abs(monthsDiff);
    const first36 = Math.min(earlyMonths, 36);
    const beyond36 = Math.max(0, earlyMonths - 36);

    const reduction = first36 * (5 / 900) + beyond36 * (5 / 1200);
    return pia * (1 - reduction);
  } else {
    // Delayed claiming — delayed retirement credits
    const delayMonths = Math.min(monthsDiff, Math.round((70 - fra) * 12));
    const increase = delayMonths * (2 / 300); // 8% per year = 2/3 of 1% per month
    return pia * (1 + increase);
  }
}

/**
 * Calculate the NPV of lifetime SS benefits for a given claiming age.
 */
function calculateLifetimeNPV(
  monthlyBenefit: number,
  claimAge: number,
  lifeExpectancy: number,
  colaRate: number,
  discountRate: number,
  currentAge: number,
): number {
  const annualBenefit = monthlyBenefit * 12;
  let npv = 0;
  const yearsUntilClaiming = Math.max(0, claimAge - currentAge);

  for (let year = 0; year <= lifeExpectancy - claimAge; year++) {
    const totalYearsFromNow = yearsUntilClaiming + year;
    const adjustedBenefit = annualBenefit * Math.pow(1 + colaRate, year);
    const presentValue = adjustedBenefit / Math.pow(1 + discountRate, totalYearsFromNow);
    npv += presentValue;
  }

  return npv;
}

/**
 * Calculate the break-even age where cumulative benefits at a later claiming age
 * surpass cumulative benefits at age 62.
 */
function calculateBreakEvenVs62(
  monthlyAt62: number,
  monthlyAtClaim: number,
  claimAge: number,
  colaRate: number,
): number | null {
  if (claimAge <= 62) return null;

  let cumulative62 = 0;
  let cumulativeClaim = 0;

  for (let age = 62; age <= 100; age++) {
    const yearIndex62 = age - 62;
    const yearIndexClaim = age - claimAge;

    cumulative62 += monthlyAt62 * 12 * Math.pow(1 + colaRate, yearIndex62);

    if (yearIndexClaim >= 0) {
      cumulativeClaim += monthlyAtClaim * 12 * Math.pow(1 + colaRate, yearIndexClaim);
    }

    if (cumulativeClaim > cumulative62 && yearIndexClaim >= 0) {
      return age;
    }
  }

  return null; // Never breaks even
}

/**
 * Calculate spousal benefit amount.
 * Spousal benefit = max(own benefit, 50% of higher-earning spouse's PIA).
 */
function calculateSpousalBenefit(
  ownPia: number,
  ownClaimAge: number,
  ownFRA: number,
  higherPia: number,
): number {
  const ownBenefit = calculateMonthlyBenefit(ownPia, ownClaimAge, ownFRA);
  const spousalBenefit = higherPia * 0.50;
  return Math.max(ownBenefit, spousalBenefit);
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Recommends an optimal Social Security claiming strategy.
 *
 * Analysis performed:
 * 1. **Break-even analysis**: Compares cumulative benefits at each claiming age
 * 2. **NPV comparison**: Discounted lifetime benefits for ages 62 through 70
 * 3. **Spousal coordination**: Optimizes combined household benefits
 * 4. **Survivor optimization**: Ensures the surviving spouse receives the maximum benefit
 *
 * @param input - Client and spouse SS parameters
 * @returns A comprehensive SSRecommendation
 *
 * @example
 * ```ts
 * const rec = recommendSSStrategy(input);
 * console.log(`Claim at age ${rec.recommendedClientClaimAge}`);
 * ```
 */
export function recommendSSStrategy(input: SSRecommendationInput): SSRecommendation {
  const {
    clientPia,
    clientAge,
    clientFRA,
    spousePia,
    spouseAge,
    spouseFRA,
    colaRate,
    discountRate,
    clientLifeExpectancy,
    spouseLifeExpectancy,
    otherRetirementIncome,
    filingStatus,
  } = input;

  const hasSpouse = spousePia !== null && spouseAge !== null && spouseFRA !== null;

  // ── Step 1: Break-even analysis for all claiming ages ──────────────────
  const claimingAges = [62, 63, 64, 65, 66, 67, 68, 69, 70];
  const monthlyAt62 = calculateMonthlyBenefit(clientPia, 62, clientFRA);

  const breakEvenAnalysis: SSRecommendation['breakEvenAnalysis'] = claimingAges.map((claimAge) => {
    const monthlyBenefit = calculateMonthlyBenefit(clientPia, claimAge, clientFRA);
    const annualBenefit = monthlyBenefit * 12;
    const breakEvenVs62 = calculateBreakEvenVs62(monthlyAt62, monthlyBenefit, claimAge, colaRate);
    const lifetimeNPV = calculateLifetimeNPV(
      monthlyBenefit,
      claimAge,
      clientLifeExpectancy,
      colaRate,
      discountRate,
      clientAge,
    );

    return {
      claimAge,
      monthlyBenefit: Math.round(monthlyBenefit),
      annualBenefit: Math.round(annualBenefit),
      breakEvenVs62: breakEvenVs62,
      lifetimeNPV: Math.round(lifetimeNPV),
    };
  });

  // ── Step 2: Find optimal claiming age (maximum NPV) ────────────────────
  let bestClientAge = 62;
  let bestClientNPV = 0;
  let worstClientNPV = Infinity;
  let worstClientAge = 62;

  for (const entry of breakEvenAnalysis) {
    if (entry.claimAge < clientAge) continue; // Can't claim before current age
    if (entry.lifetimeNPV > bestClientNPV) {
      bestClientNPV = entry.lifetimeNPV;
      bestClientAge = entry.claimAge;
    }
    if (entry.lifetimeNPV < worstClientNPV) {
      worstClientNPV = entry.lifetimeNPV;
      worstClientAge = entry.claimAge;
    }
  }

  // ── Step 3: Spousal coordination ───────────────────────────────────────
  let recommendedSpouseClaimAge: number | null = null;
  let spousalStrategy: string | null = null;
  let survivorOptimization: string | null = null;

  if (hasSpouse && spousePia !== null && spouseAge !== null && spouseFRA !== null && spouseLifeExpectancy !== null) {
    // Determine higher and lower earner
    const clientIsHigherEarner = clientPia >= spousePia;
    const higherPia = clientIsHigherEarner ? clientPia : spousePia;
    const lowerPia = clientIsHigherEarner ? spousePia : clientPia;
    const higherFRA = clientIsHigherEarner ? clientFRA : spouseFRA;
    const lowerFRA = clientIsHigherEarner ? spouseFRA : clientFRA;
    const higherAge = clientIsHigherEarner ? clientAge : spouseAge;
    const lowerAge = clientIsHigherEarner ? spouseAge : clientAge;
    const higherLE = clientIsHigherEarner ? clientLifeExpectancy : spouseLifeExpectancy;
    const lowerLE = clientIsHigherEarner ? spouseLifeExpectancy : clientLifeExpectancy;

    // Strategy: Higher earner delays for larger survivor benefit;
    // lower earner claims at or near FRA for early household income
    let bestCombinedNPV = 0;
    let bestHigherAge = 67;
    let bestLowerAge = 67;

    for (const hAge of claimingAges) {
      if (hAge < higherAge) continue;
      for (const lAge of claimingAges) {
        if (lAge < lowerAge) continue;

        const higherMonthly = calculateMonthlyBenefit(higherPia, hAge, higherFRA);
        const lowerMonthly = calculateMonthlyBenefit(lowerPia, lAge, lowerFRA);

        // Combined NPV during both lifetimes
        const higherNPV = calculateLifetimeNPV(higherMonthly, hAge, higherLE, colaRate, discountRate, higherAge);
        const lowerNPV = calculateLifetimeNPV(lowerMonthly, lAge, lowerLE, colaRate, discountRate, lowerAge);

        // Survivor benefit: surviving spouse gets the greater of their own or deceased spouse's benefit
        const survivorYears = Math.max(0, Math.max(higherLE, lowerLE) - Math.min(higherLE, lowerLE));
        const survivorBenefit = Math.max(higherMonthly, lowerMonthly);
        const survivorNPV = calculateLifetimeNPV(
          survivorBenefit,
          Math.min(higherLE, lowerLE),
          Math.max(higherLE, lowerLE),
          colaRate,
          discountRate,
          Math.min(higherAge, lowerAge),
        );

        const combinedNPV = higherNPV + lowerNPV + survivorNPV;

        if (combinedNPV > bestCombinedNPV) {
          bestCombinedNPV = combinedNPV;
          bestHigherAge = hAge;
          bestLowerAge = lAge;
        }
      }
    }

    if (clientIsHigherEarner) {
      bestClientAge = bestHigherAge;
      recommendedSpouseClaimAge = bestLowerAge;
    } else {
      bestClientAge = bestLowerAge;
      recommendedSpouseClaimAge = bestHigherAge;
    }

    // Recalculate client NPV with optimal age
    bestClientNPV = calculateLifetimeNPV(
      calculateMonthlyBenefit(clientPia, bestClientAge, clientFRA),
      bestClientAge,
      clientLifeExpectancy,
      colaRate,
      discountRate,
      clientAge,
    );

    const higherEarnerLabel = clientIsHigherEarner ? 'client' : 'spouse';
    const lowerEarnerLabel = clientIsHigherEarner ? 'spouse' : 'client';

    spousalStrategy = `Recommended: The ${higherEarnerLabel} (higher earner, PIA ${formatCurrency(higherPia)}) delays to age ${clientIsHigherEarner ? bestClientAge : recommendedSpouseClaimAge} to maximize the survivor benefit. The ${lowerEarnerLabel} (PIA ${formatCurrency(lowerPia)}) claims at age ${clientIsHigherEarner ? recommendedSpouseClaimAge : bestClientAge} to provide early household income.`;

    // Survivor optimization
    const higherBenefitAt70 = calculateMonthlyBenefit(higherPia, 70, clientIsHigherEarner ? clientFRA : spouseFRA);
    survivorOptimization = `The surviving spouse will receive the greater of their own benefit or the deceased spouse's benefit. By delaying the higher earner's claim, the survivor benefit locks in at ${formatCurrency(higherBenefitAt70)}/month. This provides insurance against longevity risk for the surviving spouse.`;
  }

  // ── Step 4: Calculate strategy value difference ────────────────────────
  const strategyValueDifference = Math.round(bestClientNPV - worstClientNPV);

  // ── Step 5: Build reasoning ────────────────────────────────────────────
  const recommendedMonthly = calculateMonthlyBenefit(clientPia, bestClientAge, clientFRA);
  const recommendedAnnual = recommendedMonthly * 12;
  const breakEvenEntry = breakEvenAnalysis.find(e => e.claimAge === bestClientAge);

  let reasoning = `Recommended claiming age: ${bestClientAge}. `;

  if (bestClientAge > 62) {
    reasoning += `Delaying from 62 to ${bestClientAge} increases the monthly benefit from ${formatCurrency(monthlyAt62)} to ${formatCurrency(recommendedMonthly)} (${formatCurrency(recommendedAnnual)}/year). `;
    if (breakEvenEntry?.breakEvenVs62) {
      reasoning += `The break-even age versus claiming at 62 is ${breakEvenEntry.breakEvenVs62}. `;
    }
  }

  if (clientLifeExpectancy > (breakEvenEntry?.breakEvenVs62 ?? 100)) {
    reasoning += `Given a life expectancy of ${clientLifeExpectancy}, delaying benefits is projected to maximize lifetime income. `;
  }

  reasoning += `The value difference between the best and worst claiming strategies is ${formatCurrency(strategyValueDifference)}.`;

  if (spousalStrategy) {
    reasoning += ` ${spousalStrategy}`;
  }

  return {
    recommendedClientClaimAge: bestClientAge,
    recommendedSpouseClaimAge,
    breakEvenAnalysis,
    spousalStrategy,
    survivorOptimization,
    recommendedStrategyNPV: Math.round(bestClientNPV),
    worstStrategyNPV: Math.round(worstClientNPV),
    strategyValueDifference,
    reasoning,
  };
}
