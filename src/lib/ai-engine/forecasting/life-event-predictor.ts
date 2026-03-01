// ==================== LIFE EVENT PREDICTOR ====================
// Predicts likely upcoming life events based on demographics, family
// composition, career stage, and statistical patterns. Used for
// proactive planning and advisor conversation starters.
// Pure functional — no React, Next.js, or Prisma imports.

import type {
  ClientProfile,
  PredictedLifeEvent,
} from '../types';

// ---------------------------------------------------------------------------
// Prediction rules
// ---------------------------------------------------------------------------

/** Each rule evaluates a client profile and returns a predicted event or null. */
type PredictionRule = (profile: ClientProfile) => PredictedLifeEvent | null;

/**
 * Rule: Retirement transition.
 * Predicts the transition from working to retired status.
 */
function predictRetirement(profile: ClientProfile): PredictedLifeEvent | null {
  if (profile.careerStage === 'retired') return null;

  const yearsToRetirement = profile.retirementYear - profile.currentYear;
  if (yearsToRetirement <= 0 || yearsToRetirement > 10) return null;

  const probability = yearsToRetirement <= 2 ? 0.90
    : yearsToRetirement <= 5 ? 0.75
    : 0.60;

  return {
    eventType: 'retirement',
    title: 'Retirement Transition',
    description: `Based on the planned retirement year of ${profile.retirementYear}, the transition from employment to retirement is expected in approximately ${yearsToRetirement} years. This represents a significant shift in income sources, tax situation, and healthcare coverage.`,
    estimatedYear: profile.retirementYear,
    probability,
    planningImplications: [
      'Income will shift from employment to Social Security, pensions, and portfolio distributions',
      'Healthcare coverage will transition to Medicare (if age 65+) or marketplace insurance',
      'Tax bracket may decrease significantly, creating Roth conversion opportunities',
      'Required Minimum Distributions may begin within a few years of retirement',
      'Cash flow management becomes critical as savings shift to drawdown phase',
    ],
    preparatoryActions: [
      'Finalize Social Security claiming strategy',
      'Review and optimize withdrawal sequencing',
      'Evaluate healthcare bridge strategy if retiring before age 65',
      'Accelerate Roth conversions during years between retirement and RMD start',
      'Adjust asset allocation for distribution phase',
      'Build 2-3 year cash reserve for early retirement spending',
    ],
    category: 'retirement',
  };
}

/**
 * Rule: Medicare enrollment.
 * Predicts Medicare enrollment at age 65.
 */
function predictMedicareEnrollment(profile: ClientProfile): PredictedLifeEvent | null {
  const yearsTo65 = 65 - profile.age;
  if (yearsTo65 <= 0 || yearsTo65 > 5) return null;

  return {
    eventType: 'medicare_enrollment',
    title: 'Medicare Enrollment',
    description: `Medicare eligibility begins at age 65, which is approximately ${yearsTo65} year${yearsTo65 > 1 ? 's' : ''} away. The initial enrollment period is 7 months centered on the 65th birthday. Missing enrollment can result in permanent premium penalties.`,
    estimatedYear: profile.currentYear + yearsTo65,
    probability: 0.95,
    planningImplications: [
      'IRMAA surcharges are based on MAGI from 2 years prior — current income affects future premiums',
      'Employer coverage coordination rules apply if still working',
      'Medigap (supplement) and Medicare Advantage plan selection is critical',
      'Part D prescription drug coverage must be evaluated',
      'HSA contributions must stop at Medicare enrollment',
    ],
    preparatoryActions: [
      'Review MAGI from two years prior and plan for IRMAA impact',
      'Maximize HSA contributions before Medicare enrollment',
      'Research Medicare Supplement (Medigap) vs. Medicare Advantage options',
      'Evaluate Part D prescription drug plans',
      'Mark the initial enrollment period on the calendar (3 months before through 3 months after 65th birthday)',
      'Coordinate with employer coverage if still working',
    ],
    category: 'health',
  };
}

/**
 * Rule: Social Security eligibility.
 * Predicts reaching SS early eligibility at age 62.
 */
function predictSSEligibility(profile: ClientProfile): PredictedLifeEvent | null {
  const yearsTo62 = 62 - profile.age;
  if (yearsTo62 <= 0 || yearsTo62 > 5) return null;

  return {
    eventType: 'ss_eligibility',
    title: 'Social Security Eligibility',
    description: `Early Social Security eligibility begins at age 62, approximately ${yearsTo62} year${yearsTo62 > 1 ? 's' : ''} away. The claiming age decision has significant lifetime financial impact — the difference between claiming at 62 versus 70 can be hundreds of thousands of dollars.`,
    estimatedYear: profile.currentYear + yearsTo62,
    probability: 0.95,
    planningImplications: [
      'Each year of delay from 62 to 70 increases benefits by approximately 6-8% per year',
      'Claiming early while working may result in benefits being withheld due to the earnings test',
      'SS benefits may be up to 85% taxable depending on other income',
      'Claiming strategy affects spousal and survivor benefits',
    ],
    preparatoryActions: [
      'Run Social Security optimization analysis comparing all claiming ages',
      'Coordinate spousal claiming strategies if applicable',
      'Evaluate bridge income strategy if delaying benefits',
      'Review SSA statement for accuracy and estimated benefits',
    ],
    category: 'retirement',
  };
}

/**
 * Rule: Children leaving home / college.
 * Predicts when children will reach college age (18).
 */
function predictChildMilestones(profile: ClientProfile): PredictedLifeEvent | null {
  if (profile.childrenAges.length === 0) return null;

  // Find the next child reaching age 18
  const childrenToCollege = profile.childrenAges
    .filter(age => age < 18 && age >= 10)
    .map(age => ({
      currentAge: age,
      yearsToCollege: 18 - age,
      estimatedYear: profile.currentYear + (18 - age),
    }))
    .filter(c => c.yearsToCollege <= 8)
    .sort((a, b) => a.yearsToCollege - b.yearsToCollege);

  if (childrenToCollege.length === 0) return null;

  const nextChild = childrenToCollege[0];
  const probability = nextChild.yearsToCollege <= 3 ? 0.90 : 0.75;

  return {
    eventType: 'child_college',
    title: `Child Reaching College Age (Currently ${nextChild.currentAge})`,
    description: `A child currently age ${nextChild.currentAge} will reach college age in approximately ${nextChild.yearsToCollege} years. This represents a significant financial event with education costs, potential changes to household expenses, and possible financial aid considerations.`,
    estimatedYear: nextChild.estimatedYear,
    probability,
    planningImplications: [
      'Education funding needs (529 plans, financial aid, loans) should be quantified',
      'Household expenses may change as dependent moves out',
      'Financial aid applications use 2 years of prior tax returns (CSS Profile may use more)',
      'Changes to tax filing status and dependent credits',
      'Life insurance needs may decrease as dependents become independent',
    ],
    preparatoryActions: [
      'Review 529 plan funding and projected education costs',
      'Evaluate financial aid eligibility and income positioning strategies',
      'Consider the impact on household cash flow',
      'Update life insurance coverage needs analysis',
      'Review estate plan provisions for minor children',
    ],
    category: 'education',
  };
}

/**
 * Rule: RMD commencement.
 * Predicts Required Minimum Distributions starting.
 */
function predictRMDStart(profile: ClientProfile): PredictedLifeEvent | null {
  // SECURE Act 2.0: RMD age is 73 (born 1951-1959) or 75 (born 1960+)
  const birthYear = profile.currentYear - profile.age;
  const rmdAge = birthYear >= 1960 ? 75 : 73;
  const yearsToRMD = rmdAge - profile.age;

  if (yearsToRMD <= 0 || yearsToRMD > 7) return null;

  return {
    eventType: 'rmd_start',
    title: 'Required Minimum Distributions Begin',
    description: `Required Minimum Distributions from tax-deferred accounts will begin at age ${rmdAge}, approximately ${yearsToRMD} year${yearsToRMD > 1 ? 's' : ''} from now. RMDs create mandatory taxable income that may push into higher brackets and trigger IRMAA surcharges.`,
    estimatedYear: profile.currentYear + yearsToRMD,
    probability: 0.95,
    planningImplications: [
      'RMDs create mandatory taxable income that cannot be deferred',
      'Large pre-tax balances can create unexpectedly high tax bills',
      'RMDs may trigger IRMAA Medicare premium surcharges',
      'QCDs (Qualified Charitable Distributions) can satisfy RMDs tax-efficiently',
      'The window between retirement and RMD start is optimal for Roth conversions',
    ],
    preparatoryActions: [
      'Accelerate Roth conversions before RMDs begin',
      'Estimate first-year RMD and its tax impact',
      'Evaluate Qualified Charitable Distribution (QCD) strategy',
      'Consider establishing a systematic withdrawal plan',
      'Review asset location across tax-deferred and Roth accounts',
    ],
    category: 'retirement',
  };
}

/**
 * Rule: Parent aging / caregiving.
 * Predicts potential caregiving responsibilities for aging parents.
 */
function predictParentCaregiving(profile: ClientProfile): PredictedLifeEvent | null {
  if (!profile.parentsLiving || profile.parentAges.length === 0) return null;

  const oldestParent = Math.max(...profile.parentAges);
  if (oldestParent < 75) return null;

  const probability = oldestParent >= 85 ? 0.70
    : oldestParent >= 80 ? 0.50
    : 0.30;

  return {
    eventType: 'parent_caregiving',
    title: 'Potential Parent Caregiving Responsibilities',
    description: `With a parent at age ${oldestParent}, there is an increasing likelihood of caregiving responsibilities in the near future. Caregiving can have significant financial and professional impacts, including reduced work hours, direct care costs, and emotional stress.`,
    estimatedYear: profile.currentYear + Math.max(1, Math.round((90 - oldestParent) / 2)),
    probability,
    planningImplications: [
      'Caregiving may require reduced work hours or career changes',
      'Direct care costs (home care, assisted living, nursing home) can be substantial',
      'May need to provide financial support for parent care expenses',
      'Potential inheritance timing and amount may be affected by care costs',
      'Emotional and time demands can affect personal financial planning engagement',
    ],
    preparatoryActions: [
      'Discuss care preferences and financial resources with aging parents',
      'Review parents\' insurance coverage (LTC, Medicare, supplemental)',
      'Understand parents\' estate plan and Powers of Attorney',
      'Research local care resources and costs',
      'Consider the impact on work and retirement timeline',
    ],
    category: 'family',
  };
}

/**
 * Rule: Business succession / exit.
 * Predicts business transition events for business owners.
 */
function predictBusinessSuccession(profile: ClientProfile): PredictedLifeEvent | null {
  if (!profile.isBusinessOwner) return null;
  if (profile.careerStage === 'retired') return null;

  const yearsToRetirement = profile.retirementYear - profile.currentYear;
  if (yearsToRetirement > 10 || yearsToRetirement <= 0) return null;

  const probability = yearsToRetirement <= 3 ? 0.70
    : yearsToRetirement <= 5 ? 0.50
    : 0.35;

  return {
    eventType: 'business_succession',
    title: 'Business Succession / Exit Planning',
    description: `As a business owner approaching retirement in ${yearsToRetirement} years, succession and exit planning become critical. Business transition typically requires 3-5 years of preparation for optimal results.`,
    estimatedYear: profile.retirementYear - 2,
    probability,
    planningImplications: [
      'Business sale or transfer timing affects retirement funding',
      'Capital gains tax on business sale can be substantial',
      'Installment sale vs. lump-sum affects tax bracket management',
      'Key person insurance and buy-sell agreement funding',
      'Successor identification and training timeline',
    ],
    preparatoryActions: [
      'Obtain a current business valuation',
      'Review and update buy-sell agreement',
      'Evaluate sale structure options (asset sale vs. stock sale)',
      'Consider installment sale for tax bracket management',
      'Develop successor training plan',
      'Review key person insurance needs',
    ],
    category: 'career',
  };
}

/**
 * Rule: Estate planning milestone.
 * Predicts when estate planning documents should be reviewed based on age.
 */
function predictEstatePlanningMilestone(profile: ClientProfile): PredictedLifeEvent | null {
  // Key estate planning review ages: 50, 60, 70, 75, 80
  const milestoneAges = [50, 60, 70, 75, 80];
  const nextMilestone = milestoneAges.find(age => age - profile.age > 0 && age - profile.age <= 3);

  if (!nextMilestone) return null;

  const yearsToMilestone = nextMilestone - profile.age;

  return {
    eventType: 'estate_planning_milestone',
    title: `Estate Planning Review at Age ${nextMilestone}`,
    description: `Age ${nextMilestone} is a recommended milestone for comprehensive estate plan review. Tax laws, family circumstances, and asset values may have changed since the last review.`,
    estimatedYear: profile.currentYear + yearsToMilestone,
    probability: 0.85,
    planningImplications: [
      'Estate tax exemption amounts may have changed',
      'Family circumstances (marriages, divorces, births) may affect beneficiaries',
      'Asset values and titling should be reviewed',
      'Healthcare directives and powers of attorney need updating',
      'Trust provisions may need modification',
    ],
    preparatoryActions: [
      'Schedule comprehensive estate document review',
      'Audit beneficiary designations on all accounts',
      'Review asset titling and ownership structures',
      'Update healthcare directives and powers of attorney',
      'Consider charitable planning strategies',
    ],
    category: 'estate',
  };
}

/**
 * Rule: Downsizing / housing transition.
 * Predicts potential housing changes near retirement.
 */
function predictHousingTransition(profile: ClientProfile): PredictedLifeEvent | null {
  if (profile.careerStage !== 'late' && profile.careerStage !== 'retired') return null;

  const yearsToRetirement = profile.retirementYear - profile.currentYear;
  if (yearsToRetirement > 5) return null;

  // More likely if children have left or approaching retirement
  const childrenGrown = profile.childrenAges.every(age => age >= 18);
  if (!childrenGrown && profile.childrenAges.length > 0) return null;

  const probability = profile.age >= 65 ? 0.40
    : profile.age >= 60 ? 0.30
    : 0.20;

  return {
    eventType: 'housing_transition',
    title: 'Potential Housing Transition',
    description: `As retirement approaches and family size changes, many clients consider downsizing, relocating, or transitioning to a lower-maintenance living arrangement. This decision has significant financial and lifestyle implications.`,
    estimatedYear: Math.max(profile.currentYear + 1, profile.retirementYear),
    probability,
    planningImplications: [
      'Home sale may generate substantial capital gains (Section 121 exclusion applies up to $250k/$500k)',
      'Relocation to a different state affects income tax, estate tax, and property tax',
      'Downsizing can free up home equity for retirement funding',
      'Aging-in-place modifications vs. move to continuing care community',
      'Mortgage payoff vs. maintaining debt in retirement',
    ],
    preparatoryActions: [
      'Obtain current home valuation and estimate after-tax proceeds',
      'Research cost of living in potential relocation destinations',
      'Evaluate state income tax and estate tax implications of relocation',
      'Consider aging-in-place home modifications vs. move',
      'Review mortgage payoff strategy',
    ],
    category: 'housing',
  };
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/** All prediction rules, evaluated in sequence. */
const PREDICTION_RULES: PredictionRule[] = [
  predictRetirement,
  predictMedicareEnrollment,
  predictSSEligibility,
  predictChildMilestones,
  predictRMDStart,
  predictParentCaregiving,
  predictBusinessSuccession,
  predictEstatePlanningMilestone,
  predictHousingTransition,
];

/**
 * Predicts likely upcoming life events based on client demographics and circumstances.
 *
 * Events predicted:
 * - **Retirement transition**: Based on planned retirement year
 * - **Medicare enrollment**: Age 65 approaching
 * - **Social Security eligibility**: Age 62 approaching
 * - **Child milestones**: Children reaching college age
 * - **RMD commencement**: Required Minimum Distributions starting
 * - **Parent caregiving**: Aging parent care needs
 * - **Business succession**: Exit planning for business owners
 * - **Estate planning milestones**: Age-based review triggers
 * - **Housing transition**: Downsizing/relocation near retirement
 *
 * Each prediction includes probability, planning implications, and
 * recommended preparatory actions.
 *
 * @param clientProfile - Client demographics and circumstances
 * @returns Array of predicted life events, sorted by estimated year
 *
 * @example
 * ```ts
 * const events = predictLifeEvents(profile);
 * const nearTerm = events.filter(e => e.estimatedYear - profile.currentYear <= 3);
 * ```
 */
export function predictLifeEvents(clientProfile: ClientProfile): PredictedLifeEvent[] {
  const predictions: PredictedLifeEvent[] = [];

  for (const rule of PREDICTION_RULES) {
    try {
      const prediction = rule(clientProfile);
      if (prediction !== null) {
        predictions.push(prediction);
      }
    } catch {
      // Silently skip rules that throw due to missing data
    }
  }

  // Sort by estimated year (nearest first), then by probability (highest first)
  predictions.sort((a, b) => {
    const yearDiff = a.estimatedYear - b.estimatedYear;
    if (yearDiff !== 0) return yearDiff;
    return b.probability - a.probability;
  });

  return predictions;
}
