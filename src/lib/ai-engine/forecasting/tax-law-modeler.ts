// ==================== TAX LAW CHANGE MODELER ====================
// Models the impact of hypothetical tax law changes on a client's financial plan.
// Pure functional – no React, Next.js, or Prisma imports.

import type {
  TaxLawScenario,
  TaxLawImpactResult,
  PlanSummary,
} from '../types';

// ---------------------------------------------------------------------------
// Predefined Scenarios
// ---------------------------------------------------------------------------

/** TCJA expiration (scheduled for 2026): brackets revert, exemption halves. */
export const TCJA_SUNSET_SCENARIO: TaxLawScenario = {
  name: 'TCJA Sunset (2026)',
  description:
    'Tax Cuts and Jobs Act provisions expire: individual brackets revert to pre-2018 levels, estate exemption drops to ~$7M (indexed), standard deduction roughly halved.',
  effectiveYear: 2026,
  tcjaSunset: true,
  newTopRate: 0.396,
  newEstateExemption: 7_000_000,
  newSaltCap: null, // SALT cap also sunsets – unlimited again
  newLTCGTopRate: null,
  standardDeductionMultiplier: 0.54, // roughly halves
  bracketAdjustments: {
    '0.10': 0.10,
    '0.12': 0.15,
    '0.22': 0.25,
    '0.24': 0.28,
    '0.32': 0.33,
    '0.35': 0.35,
    '0.37': 0.396,
  },
};

/** Higher capital-gains tax scenario. */
export const HIGHER_LTCG_SCENARIO: TaxLawScenario = {
  name: 'Higher Capital Gains Rate',
  description:
    'Long-term capital gains top rate increases from 20% to 28% for high earners.',
  effectiveYear: 2027,
  tcjaSunset: false,
  newTopRate: null,
  newEstateExemption: null,
  newSaltCap: null,
  newLTCGTopRate: 0.28,
  standardDeductionMultiplier: 1.0,
  bracketAdjustments: {},
};

/** All predefined tax-law scenarios. */
export const PREDEFINED_SCENARIOS: TaxLawScenario[] = [
  TCJA_SUNSET_SCENARIO,
  HIGHER_LTCG_SCENARIO,
];

// ---------------------------------------------------------------------------
// Impact Modeler
// ---------------------------------------------------------------------------

/**
 * Estimate the yearly tax delta if `scenario` takes effect.
 * Uses a simplified marginal-rate model over a 10-year window.
 */
export function modelTaxLawImpact(
  plan: PlanSummary,
  scenario: TaxLawScenario,
  projectionYears = 10,
): TaxLawImpactResult {
  const annualImpact: TaxLawImpactResult['annualImpact'] = [];
  let cumulativeImpact = 0;

  const baseIncome = plan.taxableIncome;
  const inflationRate = 0.025;

  for (let y = 0; y < projectionYears; y++) {
    const year = plan.currentYear + y;
    const projectedIncome = baseIncome * Math.pow(1 + inflationRate, y);

    // Simplified current-law tax estimate
    const currentLawTax = projectedIncome * plan.marginalRate;

    // New-law estimate
    let newRate = plan.marginalRate;
    if (year >= scenario.effectiveYear) {
      if (scenario.newTopRate !== null && plan.marginalRate >= 0.35) {
        newRate = scenario.newTopRate;
      } else if (scenario.tcjaSunset) {
        // Map current bracket to reverted bracket
        const currentRateStr = plan.marginalRate.toFixed(2);
        newRate =
          scenario.bracketAdjustments[currentRateStr] ?? plan.marginalRate + 0.03;
      }
    }
    const newLawTax = projectedIncome * newRate;
    const difference = newLawTax - currentLawTax;
    cumulativeImpact += difference;

    annualImpact.push({ year, currentLawTax: Math.round(currentLawTax), newLawTax: Math.round(newLawTax), difference: Math.round(difference) });
  }

  // Estate impact
  let estateImpact = 0;
  if (scenario.newEstateExemption !== null && plan.grossEstateValue > scenario.newEstateExemption) {
    const currentExposure = Math.max(0, plan.grossEstateValue - plan.estateExemptionAmount);
    const newExposure = Math.max(0, plan.grossEstateValue - scenario.newEstateExemption);
    estateImpact = Math.round((newExposure - currentExposure) * 0.40);
  }

  const effectiveRateChange = annualImpact.length > 0
    ? annualImpact[annualImpact.length - 1].difference / (baseIncome * Math.pow(1 + inflationRate, projectionYears - 1))
    : 0;

  const mitigationStrategies: string[] = [];
  if (scenario.tcjaSunset) {
    mitigationStrategies.push('Accelerate income recognition before sunset year');
    mitigationStrategies.push('Consider Roth conversions in the lower-bracket window');
    mitigationStrategies.push('Maximize charitable giving in current-law years');
  }
  if (scenario.newEstateExemption !== null) {
    mitigationStrategies.push('Utilize remaining gift/estate exemption before reduction');
    mitigationStrategies.push('Establish irrevocable trusts while exemption is higher');
  }
  if (scenario.newLTCGTopRate !== null) {
    mitigationStrategies.push('Harvest gains at current lower rate before increase');
    mitigationStrategies.push('Consider Qualified Opportunity Zone deferrals');
  }

  const summary = `Under "${scenario.name}", projected cumulative tax increase of $${Math.abs(Math.round(cumulativeImpact)).toLocaleString()} over ${projectionYears} years.${estateImpact > 0 ? ` Estate tax exposure increases by $${estateImpact.toLocaleString()}.` : ''}`;

  return {
    scenarioName: scenario.name,
    annualImpact,
    cumulativeImpact: Math.round(cumulativeImpact),
    estateImpact,
    effectiveRateChange: Math.round(effectiveRateChange * 10000) / 10000,
    mitigationStrategies,
    summary,
  };
}
