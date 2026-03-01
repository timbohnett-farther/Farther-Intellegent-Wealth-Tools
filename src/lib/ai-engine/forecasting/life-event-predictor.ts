// ==================== LIFE EVENT PREDICTOR ====================
// Predicts upcoming life events based on client demographics and circumstances,
// producing proactive planning recommendations.
// Pure functional – no React, Next.js, or Prisma imports.

import type { ClientProfile, PredictedLifeEvent } from '../types';

// ---------------------------------------------------------------------------
// Event Definitions
// ---------------------------------------------------------------------------

interface EventRule {
  eventType: string;
  title: string;
  category: PredictedLifeEvent['category'];
  check: (p: ClientProfile) => { applies: boolean; estimatedYear: number; probability: number; description: string };
  planningImplications: string[];
  preparatoryActions: string[];
}

const EVENT_RULES: EventRule[] = [
  {
    eventType: 'retirement',
    title: 'Retirement',
    category: 'retirement',
    check: (p) => ({
      applies: p.retirementYear > p.currentYear && p.retirementYear - p.currentYear <= 10,
      estimatedYear: p.retirementYear,
      probability: 0.85,
      description: `${p.retirementYear - p.currentYear} years until planned retirement. Income sources shift from employment to portfolio withdrawals.`,
    }),
    planningImplications: [
      'Transition income sources from employment to portfolio withdrawals',
      'Medicare enrollment timing and IRMAA management',
      'Social Security claiming strategy becomes critical',
      'Required Minimum Distribution planning begins',
    ],
    preparatoryActions: [
      'Optimize Roth conversion strategy before retirement',
      'Build 2-3 year cash reserve for sequence-of-returns risk',
      'Review asset allocation for distribution phase',
      'Confirm Social Security claiming age and spousal coordination',
    ],
  },
  {
    eventType: 'child_college',
    title: 'Child Enters College',
    category: 'education',
    check: (p) => {
      const collegeAges = p.childrenAges.filter((a) => a >= 14 && a <= 17);
      if (collegeAges.length === 0) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      const youngestCollegeBound = Math.max(...collegeAges);
      const yearsUntil = 18 - youngestCollegeBound;
      return {
        applies: true,
        estimatedYear: p.currentYear + yearsUntil,
        probability: 0.75,
        description: `Child entering college in approximately ${yearsUntil} year(s). Major tuition expenses ahead.`,
      };
    },
    planningImplications: [
      '529 plan distribution strategy',
      'Financial aid (FAFSA/CSS) optimization — AGI management 2 years prior',
      'Shift from growth to preservation in education accounts',
    ],
    preparatoryActions: [
      'Review 529 plan investment allocation and beneficiary',
      'Model FAFSA Expected Family Contribution',
      'Consider accelerating 529 contributions for tax deduction',
    ],
  },
  {
    eventType: 'medicare_enrollment',
    title: 'Medicare Enrollment',
    category: 'health',
    check: (p) => {
      const yearsTo65 = 65 - p.age;
      if (yearsTo65 < 0 || yearsTo65 > 5) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      return {
        applies: true,
        estimatedYear: p.currentYear + yearsTo65,
        probability: 0.95,
        description: `Medicare eligibility in ${yearsTo65} year(s). IRMAA surcharges depend on MAGI from 2 years prior.`,
      };
    },
    planningImplications: [
      'IRMAA surcharge management — MAGI lookback is 2 years prior',
      'Medigap vs. Medicare Advantage decision',
      'Prescription drug plan selection',
      'HSA contribution deadline (must stop at Medicare enrollment)',
    ],
    preparatoryActions: [
      'Manage AGI in the 2-year IRMAA lookback window',
      'Maximize HSA contributions before Medicare enrollment',
      'Research Medigap plans in the client\'s state',
    ],
  },
  {
    eventType: 'rmd_start',
    title: 'Required Minimum Distributions Begin',
    category: 'retirement',
    check: (p) => {
      const rmdAge = p.age < 73 ? 73 : 75; // SECURE 2.0
      const yearsToRMD = rmdAge - p.age;
      if (yearsToRMD < 0 || yearsToRMD > 7) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      return {
        applies: true,
        estimatedYear: p.currentYear + yearsToRMD,
        probability: 0.98,
        description: `RMDs begin in ${yearsToRMD} year(s) at age ${rmdAge}. Pre-tax withdrawals become mandatory.`,
      };
    },
    planningImplications: [
      'Forced taxable distributions increase AGI',
      'May push client into higher IRMAA bracket',
      'Roth conversion window closes when RMDs start',
    ],
    preparatoryActions: [
      'Evaluate multi-year Roth conversion strategy',
      'Consider QCDs (Qualified Charitable Distributions)',
      'Model RMD amounts and tax impact',
    ],
  },
  {
    eventType: 'parent_aging',
    title: 'Parent Care Needs',
    category: 'family',
    check: (p) => {
      if (!p.parentsLiving || p.parentAges.length === 0) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      const maxAge = Math.max(...p.parentAges);
      if (maxAge < 75) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      return {
        applies: true,
        estimatedYear: p.currentYear + Math.max(1, 85 - maxAge),
        probability: maxAge >= 85 ? 0.7 : 0.4,
        description: `Aging parent(s) may need care support. Oldest parent age: ${maxAge}.`,
      };
    },
    planningImplications: [
      'Potential caregiver expenses or reduced work hours',
      'Long-term care decisions for parent(s)',
      'Inheritance or estate settlement planning',
    ],
    preparatoryActions: [
      'Review parent\'s long-term care insurance and estate plan',
      'Discuss family care responsibilities and financial support',
      'Model impact of caregiver role on client\'s own retirement plan',
    ],
  },
  {
    eventType: 'business_succession',
    title: 'Business Succession/Exit',
    category: 'career',
    check: (p) => {
      if (!p.isBusinessOwner) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      const yearsToRetirement = p.retirementYear - p.currentYear;
      if (yearsToRetirement > 10) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      return {
        applies: true,
        estimatedYear: p.retirementYear - 2,
        probability: 0.6,
        description: `Business owner approaching retirement — succession planning window is ${yearsToRetirement} years.`,
      };
    },
    planningImplications: [
      'Business valuation and sale structuring',
      'Installment sale vs. lump sum tax optimization',
      'QSBS exclusion eligibility (Section 1202)',
      'Post-sale asset allocation and income replacement',
    ],
    preparatoryActions: [
      'Obtain current business valuation',
      'Evaluate succession plan (family, key employee, or third-party sale)',
      'Review buy-sell agreement and funding',
      'Model tax impact of sale proceeds',
    ],
  },
  {
    eventType: 'empty_nest',
    title: 'Last Child Leaves Home',
    category: 'family',
    check: (p) => {
      if (p.childrenAges.length === 0) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      const oldestChild = Math.max(...p.childrenAges);
      const yearsUntil = 18 - oldestChild;
      if (yearsUntil < 0 || yearsUntil > 5) return { applies: false, estimatedYear: 0, probability: 0, description: '' };
      return {
        applies: true,
        estimatedYear: p.currentYear + yearsUntil,
        probability: 0.7,
        description: `Last child likely leaving home in ~${yearsUntil} year(s). Major expense reduction opportunity.`,
      };
    },
    planningImplications: [
      'Significant reduction in household expenses',
      'Opportunity to increase retirement savings',
      'Housing downsizing consideration',
      'Life insurance coverage review — may be able to reduce',
    ],
    preparatoryActions: [
      'Model post-empty-nest cash flow and savings rate',
      'Evaluate whether to downsize or age in place',
      'Review life insurance needs with updated dependency count',
    ],
  },
];

// ---------------------------------------------------------------------------
// Predictor
// ---------------------------------------------------------------------------

/**
 * Predict upcoming life events for a client based on their profile.
 * Returns events sorted by estimated year ascending.
 */
export function predictLifeEvents(profile: ClientProfile): PredictedLifeEvent[] {
  const events: PredictedLifeEvent[] = [];

  for (const rule of EVENT_RULES) {
    const result = rule.check(profile);
    if (!result.applies) continue;

    events.push({
      eventType: rule.eventType,
      title: rule.title,
      description: result.description,
      estimatedYear: result.estimatedYear,
      probability: result.probability,
      planningImplications: rule.planningImplications,
      preparatoryActions: rule.preparatoryActions,
      category: rule.category,
    });
  }

  return events.sort((a, b) => a.estimatedYear - b.estimatedYear);
}
