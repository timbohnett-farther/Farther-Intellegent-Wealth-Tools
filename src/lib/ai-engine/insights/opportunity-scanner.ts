// ==================== OPPORTUNITY SCANNER ====================
// Scans plan data for financial planning opportunities the advisor
// should consider raising with the client.

import type {
  PlanSummary,
  OpportunityResult,
  AlertCategory,
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

// ---------------------------------------------------------------------------
// Individual opportunity scanners
// ---------------------------------------------------------------------------

/** Scan for Roth conversion windows. */
function scanRothConversion(plan: PlanSummary): OpportunityResult | null {
  const yearsToRetirement = plan.retirementYear - plan.currentYear;
  if (yearsToRetirement <= 0 || plan.preTaxBalance < 50_000) return null;

  const headroom = plan.bracketHeadroom;
  if (headroom <= 0) return null;

  const conversionAmount = Math.min(headroom, plan.preTaxBalance * 0.15);
  const taxCost = conversionAmount * plan.marginalRate;
  // Conservative estimate: save 5% rate differential over retirement years
  const estimatedSavings = conversionAmount * 0.05 * Math.min(25, yearsToRetirement + 20);

  if (estimatedSavings <= taxCost) return null;

  return {
    opportunityType: 'roth_conversion_window',
    title: 'Roth Conversion Bracket-Filling Opportunity',
    description: `There is ${formatCurrency(headroom)} of headroom in the current ${(plan.marginalRate * 100).toFixed(0)}% tax bracket. Converting up to ${formatCurrency(conversionAmount)} from pre-tax to Roth accounts could save approximately ${formatCurrency(estimatedSavings - taxCost)} in lifetime taxes by paying at today's rate rather than potentially higher future rates.`,
    estimatedValue: estimatedSavings - taxCost,
    urgency: yearsToRetirement <= 5 ? 'high' : 'medium',
    category: 'tax',
    recommendedSteps: [
      `Calculate exact bracket headroom considering all income sources`,
      `Verify conversion won't trigger IRMAA surcharges (MAGI threshold: ${formatCurrency(plan.irmaaThreshold)})`,
      `Execute Roth conversion before December 31`,
      `Ensure taxes are paid from non-retirement funds to maximize the benefit`,
    ],
    applicableWindow: `Before December 31, ${plan.currentYear}`,
  };
}

/** Scan for tax-loss harvesting opportunities. */
function scanTaxLossHarvesting(plan: PlanSummary): OpportunityResult | null {
  if (!plan.hasUnrealizedLosses || plan.unrealizedLossAmount <= 1_000) return null;

  // Harvestable amount capped at $3,000/year deduction for net losses,
  // but can offset unlimited gains
  const harvestableAmount = plan.unrealizedLossAmount;
  const taxSavings = Math.min(harvestableAmount, 3_000) * plan.marginalRate
    + Math.max(0, harvestableAmount - 3_000) * 0.15; // assume offsetting LTCG

  return {
    opportunityType: 'tax_loss_harvesting',
    title: 'Tax-Loss Harvesting Available',
    description: `The taxable portfolio contains ${formatCurrency(harvestableAmount)} in unrealized losses. Harvesting these losses would generate approximately ${formatCurrency(taxSavings)} in tax savings by offsetting capital gains and up to $3,000 of ordinary income. Losses can be carried forward to future years.`,
    estimatedValue: taxSavings,
    urgency: 'medium',
    category: 'tax',
    recommendedSteps: [
      `Review positions with unrealized losses for harvesting candidates`,
      `Verify no wash-sale rule violations (avoid repurchasing substantially identical securities within 30 days)`,
      `Replace harvested positions with similar (but not identical) investments to maintain target allocation`,
      `Document the transactions for year-end tax reporting`,
    ],
    applicableWindow: `Before December 31, ${plan.currentYear}`,
  };
}

/** Scan for charitable giving timing opportunities. */
function scanCharitableGiving(plan: PlanSummary): OpportunityResult | null {
  // Only relevant if client has appreciated stock and is charitably inclined
  if (!plan.hasAppreciatedStock || plan.appreciatedStockAmount < 5_000) return null;

  // Donating appreciated stock avoids capital gains tax
  const donationAmount = Math.min(plan.appreciatedStockAmount, plan.agi * 0.30); // 30% AGI limit for stock
  const capitalGainsAvoided = donationAmount * 0.20; // assume 20% LTCG + NIIT
  const deductionValue = donationAmount * plan.marginalRate;
  const totalBenefit = capitalGainsAvoided + deductionValue;

  // Check if QCD might be applicable (age 70.5+)
  const isQCDEligible = plan.clientAge >= 70;

  return {
    opportunityType: 'charitable_giving_optimization',
    title: isQCDEligible
      ? 'Charitable Giving: QCD & Appreciated Stock Opportunity'
      : 'Charitable Giving: Appreciated Stock Donation',
    description: isQCDEligible
      ? `Donating appreciated stock (${formatCurrency(donationAmount)}) or using a Qualified Charitable Distribution from IRAs could generate up to ${formatCurrency(totalBenefit)} in combined tax benefits. QCDs reduce AGI, which can lower IRMAA surcharges and Social Security taxation.`
      : `Donating appreciated stock worth ${formatCurrency(donationAmount)} to charity or a Donor-Advised Fund would avoid ${formatCurrency(capitalGainsAvoided)} in capital gains tax and generate a ${formatCurrency(deductionValue)} income tax deduction, for a total benefit of ${formatCurrency(totalBenefit)}.`,
    estimatedValue: totalBenefit,
    urgency: 'medium',
    category: 'tax',
    recommendedSteps: [
      `Identify the most appreciated positions for donation`,
      `Consider a Donor-Advised Fund for flexible timing of charitable distributions`,
      ...(isQCDEligible ? [`Evaluate QCD from IRA to satisfy RMD and reduce AGI`] : []),
      `Verify the 30% AGI limitation for appreciated property donations`,
      `Consider bunching charitable gifts with a DAF for greater tax efficiency`,
    ],
    applicableWindow: `Before December 31, ${plan.currentYear}`,
  };
}

/** Scan for Social Security optimization opportunities. */
function scanSSOptimization(plan: PlanSummary): OpportunityResult | null {
  // Relevant for clients approaching claiming age
  if (plan.ssPia <= 0) return null;
  if (plan.clientAge < 58 || plan.clientAge > 70) return null;

  const earlyBenefitAnnual = plan.ssPia * 0.70 * 12;
  const delayedBenefitAnnual = plan.ssPia * 1.24 * 12;
  const annualDifference = delayedBenefitAnnual - earlyBenefitAnnual;
  const lifetimeDifference = annualDifference * 15; // approximate

  // Check if spouse exists for coordination opportunities
  const hasSpouse = plan.spouseAge !== null;

  return {
    opportunityType: 'ss_optimization',
    title: hasSpouse
      ? 'Social Security Spousal Coordination Opportunity'
      : 'Social Security Claiming Strategy Optimization',
    description: hasSpouse
      ? `Coordinating Social Security claiming strategies between spouses could increase combined lifetime benefits by up to ${formatCurrency(lifetimeDifference)}. The optimal strategy depends on relative PIAs, age difference, and survivor benefit considerations.`
      : `Optimizing the Social Security claiming age could increase lifetime benefits by up to ${formatCurrency(lifetimeDifference)}. Delaying from age 62 to 70 increases the annual benefit from approximately ${formatCurrency(earlyBenefitAnnual)} to ${formatCurrency(delayedBenefitAnnual)}.`,
    estimatedValue: lifetimeDifference,
    urgency: plan.clientAge >= 61 ? 'high' : 'medium',
    category: 'social_security',
    recommendedSteps: [
      `Run the Social Security optimizer with current assumptions`,
      `Analyze break-even ages for each claiming strategy`,
      ...(hasSpouse ? [
        `Model spousal benefit coordination scenarios`,
        `Evaluate survivor benefit implications`,
      ] : []),
      `Consider the impact of claiming age on income taxes and IRMAA`,
      `Review bridge income needs if delaying benefits`,
    ],
    applicableWindow: `Ages 62–70 (decision needed before claiming)`,
  };
}

/** Scan for annual gifting windows. */
function scanGiftingWindows(plan: PlanSummary): OpportunityResult | null {
  // Only relevant for clients with estate exposure
  const estateExposure = plan.grossEstateValue - plan.estateExemptionAmount;
  if (estateExposure < 0 && plan.grossEstateValue < plan.estateExemptionAmount * 0.5) return null;
  if (plan.giftRecipientCount <= 0) return null;

  const annualCapacity = plan.annualGiftExclusion * plan.giftRecipientCount;
  const estateTaxRate = 0.40; // top federal estate tax rate
  const potentialSavings = annualCapacity * estateTaxRate;

  // For couples, double the capacity
  const filingMfj = plan.filingStatus === 'mfj';
  const totalCapacity = filingMfj ? annualCapacity * 2 : annualCapacity;
  const totalSavings = filingMfj ? potentialSavings * 2 : potentialSavings;

  return {
    opportunityType: 'gifting_window',
    title: 'Annual Gift Exclusion Window',
    description: `${filingMfj ? 'As a couple, you' : 'You'} can gift up to ${formatCurrency(totalCapacity)} this year (${plan.giftRecipientCount} recipients x ${formatCurrency(plan.annualGiftExclusion)}${filingMfj ? ' x 2 spouses' : ''}) without using any lifetime gift/estate exemption. With an estate of ${formatCurrency(plan.grossEstateValue)}, annual gifting could save up to ${formatCurrency(totalSavings)} in potential estate taxes.`,
    estimatedValue: totalSavings,
    urgency: 'low',
    category: 'estate',
    recommendedSteps: [
      `Determine which recipients should receive gifts this year`,
      `Consider gifting appreciated assets to shift future gains to lower-bracket recipients`,
      `Evaluate 529 plan super-funding (5-year election) for education-focused gifting`,
      `Document all gifts for proper reporting if over $18,000 per recipient (informational return)`,
      `Coordinate with estate planning attorney on overall gifting strategy`,
    ],
    applicableWindow: `Before December 31, ${plan.currentYear}`,
  };
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Scans plan data for financial planning opportunities.
 *
 * Opportunity categories scanned:
 * - **Roth conversion windows**: Bracket headroom for tax-efficient conversions
 * - **Tax-loss harvesting**: Unrealized losses available for harvesting
 * - **Charitable giving timing**: Appreciated stock donations and QCDs
 * - **Social Security optimization**: Claiming strategy and spousal coordination
 * - **Gifting windows**: Annual exclusion gifting for estate reduction
 *
 * @param planData - Condensed plan summary
 * @returns Array of identified opportunities, sorted by estimated value
 *
 * @example
 * ```ts
 * const opportunities = scanOpportunities(planSummary);
 * const highValue = opportunities.filter(o => o.estimatedValue > 10_000);
 * ```
 */
export function scanOpportunities(planData: PlanSummary): OpportunityResult[] {
  const scanners = [
    scanRothConversion,
    scanTaxLossHarvesting,
    scanCharitableGiving,
    scanSSOptimization,
    scanGiftingWindows,
  ];

  const opportunities: OpportunityResult[] = [];

  for (const scanner of scanners) {
    try {
      const result = scanner(planData);
      if (result !== null) {
        opportunities.push(result);
      }
    } catch {
      // Silently skip scanners that throw due to missing data
    }
  }

  // Sort by estimated value descending
  opportunities.sort((a, b) => b.estimatedValue - a.estimatedValue);

  return opportunities;
}
