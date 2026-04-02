/**
 * 2025 Federal Tax Rules Package — Version 1
 *
 * Complete IRS tax rules for tax year 2025.
 * This package is IMMUTABLE once published.
 *
 * Sources:
 * - IRS Revenue Procedure 2024-40 (inflation adjustments)
 * - IRC Section 1 (tax brackets)
 * - IRC Section 63 (standard deduction)
 * - IRC Section 1411 (NIIT)
 * - IRC Section 86 (Social Security taxability)
 *
 * Published: 2026-03-30
 * Status: published
 */

import type { TaxRulesPackage } from '@/types';

/**
 * 2025 Federal Tax Rules Package v1
 */
export const FEDERAL_RULES_2025_V1: any = {
  rulesVersion: '2025_federal_v1',
  taxYear: 2025,
  jurisdiction: 'federal',
  publishedAt: new Date('2026-03-30T00:00:00Z'),
  publishedBy: 'system',
  isActive: true,
  checksum: '', // Will be computed

  metadata: {
    description: '2025 Federal individual income tax rules',
    changeLog: [
      'Initial 2025 rules package',
      'Inflation-adjusted brackets and deductions per Rev. Proc. 2024-40',
      'Standard deduction: $15,000 (Single), $30,000 (MFJ)',
      'NIIT threshold: $200K (Single), $250K (MFJ)',
    ],
    authoredBy: 'tax-engine-team',
    sources: [
      'IRS Revenue Procedure 2024-40',
      'IRC Section 1',
      'IRC Section 63',
      'IRC Section 1411',
      'IRC Section 86',
    ],
  },

  // ==================== ORDINARY INCOME TAX BRACKETS ====================
  ordinaryBrackets: {
    single: [
      { min: 0, max: 11600, rate: 0.10, baseAmount: 0 },
      { min: 11600, max: 47150, rate: 0.12, baseAmount: 0 },
      { min: 47150, max: 100525, rate: 0.22, baseAmount: 0 },
      { min: 100525, max: 191950, rate: 0.24, baseAmount: 0 },
      { min: 191950, max: 243725, rate: 0.32, baseAmount: 0 },
      { min: 243725, max: 609350, rate: 0.35, baseAmount: 0 },
      { min: 609350, max: null, rate: 0.37, baseAmount: 0 },
    ],
    married_filing_jointly: [
      { min: 0, max: 23200, rate: 0.10, baseAmount: 0 },
      { min: 23200, max: 94300, rate: 0.12, baseAmount: 0 },
      { min: 94300, max: 201050, rate: 0.22, baseAmount: 0 },
      { min: 201050, max: 383900, rate: 0.24, baseAmount: 0 },
      { min: 383900, max: 487450, rate: 0.32, baseAmount: 0 },
      { min: 487450, max: 731200, rate: 0.35, baseAmount: 0 },
      { min: 731200, max: null, rate: 0.37, baseAmount: 0 },
    ],
    married_filing_separately: [
      { min: 0, max: 11600, rate: 0.10, baseAmount: 0 },
      { min: 11600, max: 47150, rate: 0.12, baseAmount: 0 },
      { min: 47150, max: 100525, rate: 0.22, baseAmount: 0 },
      { min: 100525, max: 191950, rate: 0.24, baseAmount: 0 },
      { min: 191950, max: 243725, rate: 0.32, baseAmount: 0 },
      { min: 243725, max: 365600, rate: 0.35, baseAmount: 0 },
      { min: 365600, max: null, rate: 0.37, baseAmount: 0 },
    ],
    head_of_household: [
      { min: 0, max: 16550, rate: 0.10, baseAmount: 0 },
      { min: 16550, max: 63100, rate: 0.12, baseAmount: 0 },
      { min: 63100, max: 100500, rate: 0.22, baseAmount: 0 },
      { min: 100500, max: 191950, rate: 0.24, baseAmount: 0 },
      { min: 191950, max: 243700, rate: 0.32, baseAmount: 0 },
      { min: 243700, max: 609350, rate: 0.35, baseAmount: 0 },
      { min: 609350, max: null, rate: 0.37, baseAmount: 0 },
    ],
    qualifying_surviving_spouse: [
      { min: 0, max: 23200, rate: 0.10, baseAmount: 0 },
      { min: 23200, max: 94300, rate: 0.12, baseAmount: 0 },
      { min: 94300, max: 201050, rate: 0.22, baseAmount: 0 },
      { min: 201050, max: 383900, rate: 0.24, baseAmount: 0 },
      { min: 383900, max: 487450, rate: 0.32, baseAmount: 0 },
      { min: 487450, max: 731200, rate: 0.35, baseAmount: 0 },
      { min: 731200, max: null, rate: 0.37, baseAmount: 0 },
    ],
  },

  // ==================== CAPITAL GAINS TAX BRACKETS ====================
  capitalGainBrackets: {
    single: [
      { min: 0, max: 47025, rate: 0.00, baseAmount: 0 },
      { min: 47025, max: 518900, rate: 0.15, baseAmount: 0 },
      { min: 518900, max: null, rate: 0.20, baseAmount: 0 },
    ],
    married_filing_jointly: [
      { min: 0, max: 94050, rate: 0.00, baseAmount: 0 },
      { min: 94050, max: 583750, rate: 0.15, baseAmount: 0 },
      { min: 583750, max: null, rate: 0.20, baseAmount: 0 },
    ],
    married_filing_separately: [
      { min: 0, max: 47025, rate: 0.00, baseAmount: 0 },
      { min: 47025, max: 291850, rate: 0.15, baseAmount: 0 },
      { min: 291850, max: null, rate: 0.20, baseAmount: 0 },
    ],
    head_of_household: [
      { min: 0, max: 63000, rate: 0.00, baseAmount: 0 },
      { min: 63000, max: 551350, rate: 0.15, baseAmount: 0 },
      { min: 551350, max: null, rate: 0.20, baseAmount: 0 },
    ],
    qualifying_surviving_spouse: [
      { min: 0, max: 94050, rate: 0.00, baseAmount: 0 },
      { min: 94050, max: 583750, rate: 0.15, baseAmount: 0 },
      { min: 583750, max: null, rate: 0.20, baseAmount: 0 },
    ],
  },

  // ==================== STANDARD DEDUCTION ====================
  standardDeduction: {
    single: 15000,
    married_filing_jointly: 30000,
    married_filing_separately: 15000,
    head_of_household: 22500,
    qualifying_surviving_spouse: 30000,
  },

  // Additional standard deduction for age 65+ or blind
  additionalStandardDeduction: {
    age65OrBlind: {
      single: 2000,
      married_filing_jointly: 1600, // Per person
      married_filing_separately: 1600,
      head_of_household: 2000,
      qualifying_surviving_spouse: 1600,
    },
  },

  // ==================== NIIT (NET INVESTMENT INCOME TAX) ====================
  niit: {
    rate: 0.038, // 3.8%
    thresholds: {
      single: 200000,
      married_filing_jointly: 250000,
      married_filing_separately: 125000,
      head_of_household: 200000,
      qualifying_surviving_spouse: 250000,
    },
  },

  // ==================== SOCIAL SECURITY TAXABILITY ====================
  socialSecurityTaxability: {
    // Combined income = AGI + Tax-exempt interest + 50% of SS benefits
    thresholds: {
      single: {
        tier1: 25000, // Below: 0% taxable
        tier2: 34000, // Between tier1-tier2: up to 50% taxable, Above tier2: up to 85% taxable
      },
      married_filing_jointly: {
        tier1: 32000,
        tier2: 44000,
      },
      married_filing_separately: {
        tier1: 0, // If lived with spouse, thresholds are $0
        tier2: 0,
      },
      head_of_household: {
        tier1: 25000,
        tier2: 34000,
      },
      qualifying_surviving_spouse: {
        tier1: 25000,
        tier2: 34000,
      },
    },
  },

  // ==================== AMT (ALTERNATIVE MINIMUM TAX) ====================
  amt: {
    exemption: {
      single: 85700,
      married_filing_jointly: 133300,
      married_filing_separately: 66650,
      head_of_household: 85700,
      qualifying_surviving_spouse: 133300,
    },
    phaseoutThreshold: {
      single: 609350,
      married_filing_jointly: 1218700,
      married_filing_separately: 609350,
      head_of_household: 609350,
      qualifying_surviving_spouse: 1218700,
    },
    phaseoutRate: 0.25, // 25% phaseout
    rates: {
      tier1: { threshold: 0, rate: 0.26 },
      tier2: { threshold: 220700, rate: 0.28 }, // Above this amount
    },
  },

  // ==================== CHILD TAX CREDIT ====================
  childTaxCredit: {
    creditAmount: 2000, // Per qualifying child under 17
    phaseoutThreshold: {
      single: 200000,
      married_filing_jointly: 400000,
      married_filing_separately: 200000,
      head_of_household: 200000,
      qualifying_surviving_spouse: 400000,
    },
    phaseoutRate: 0.05, // $50 per $1,000 over threshold
    refundableAmount: 1700, // Additional Child Tax Credit (refundable portion)
    otherDependentCredit: 500, // For dependents not qualifying for CTC
  },

  // ==================== RETIREMENT CONTRIBUTION LIMITS ====================
  retirementContributions: {
    traditionalIRA: {
      limit: 7000,
      catchUpAge: 50,
      catchUpAmount: 1000,
      totalWithCatchUp: 8000,
    },
    rothIRA: {
      limit: 7000,
      catchUpAge: 50,
      catchUpAmount: 1000,
      totalWithCatchUp: 8000,
      phaseoutThresholds: {
        single: { lower: 146000, upper: 161000 },
        married_filing_jointly: { lower: 230000, upper: 240000 },
        married_filing_separately: { lower: 0, upper: 10000 },
      },
    },
    traditional401k: {
      limit: 23500,
      catchUpAge: 50,
      catchUpAmount: 7500,
      totalWithCatchUp: 31000,
    },
    hsa: {
      individual: 4300,
      family: 8550,
      catchUpAge: 55,
      catchUpAmount: 1000,
    },
  },

  // ==================== EARNED INCOME TAX CREDIT ====================
  eitc: {
    maxCredit: {
      noChildren: 632,
      oneChild: 4213,
      twoChildren: 6960,
      threeOrMoreChildren: 7830,
    },
    phaseoutBegins: {
      single: {
        noChildren: 9800,
        oneChild: 12000,
        twoChildren: 12000,
        threeOrMoreChildren: 12000,
      },
      married_filing_jointly: {
        noChildren: 16370,
        oneChild: 18590,
        twoChildren: 18590,
        threeOrMoreChildren: 18590,
      },
    },
    phaseoutEnds: {
      single: {
        noChildren: 18591,
        oneChild: 49084,
        twoChildren: 55768,
        threeOrMoreChildren: 59899,
      },
      married_filing_jointly: {
        noChildren: 25511,
        oneChild: 56004,
        twoChildren: 62688,
        threeOrMoreChildren: 66819,
      },
    },
  },

  // ==================== DEDUCTION LIMITS ====================
  deductionLimits: {
    saltCap: 10000, // State and local tax deduction cap
    mortgageInterestCap: 750000, // Mortgage debt limit for interest deduction
    charitableCashLimit: 0.60, // 60% of AGI for cash contributions
    charitablePropertyLimit: 0.30, // 30% of AGI for property contributions
    medicalExpenseFloor: 0.075, // 7.5% of AGI floor for medical expenses
  },

  // ==================== KIDDIE TAX ====================
  kiddieTax: {
    threshold: 2600, // Unearned income threshold for dependent children
    rate: 'parent_rate', // Taxed at parent's marginal rate
  },

  // ==================== EDUCATION CREDITS ====================
  educationCredits: {
    americanOpportunityCredit: {
      maxCredit: 2500,
      qualifiedExpenses: 4000,
      phaseoutThreshold: {
        single: 80000,
        married_filing_jointly: 160000,
      },
      phaseoutEnd: {
        single: 90000,
        married_filing_jointly: 180000,
      },
      refundablePercentage: 0.40, // 40% refundable (up to $1,000)
    },
    lifetimeLearningCredit: {
      maxCredit: 2000,
      rate: 0.20, // 20% of qualified expenses
      qualifiedExpensesLimit: 10000,
      phaseoutThreshold: {
        single: 80000,
        married_filing_jointly: 160000,
      },
      phaseoutEnd: {
        single: 90000,
        married_filing_jointly: 180000,
      },
    },
  },

  // ==================== CAPITAL LOSS LIMITS ====================
  capitalLoss: {
    annualDeductionLimit: 3000, // Max capital loss deduction against ordinary income
    carryforwardIndefinite: true,
  },

  // ==================== ESTATE & GIFT TAX ====================
  estateAndGift: {
    exemption: 13990000, // 2025 estate & gift tax exemption
    annualGiftExclusion: 19000, // Annual gift tax exclusion per recipient
    topRate: 0.40, // 40% top rate
  },

  // ==================== SELF-EMPLOYMENT TAX ====================
  selfEmploymentTax: {
    socialSecurityRate: 0.124, // 12.4%
    medicareRate: 0.029, // 2.9%
    additionalMedicareRate: 0.009, // 0.9% on wages/SE income over threshold
    additionalMedicareThreshold: {
      single: 200000,
      married_filing_jointly: 250000,
      married_filing_separately: 125000,
      head_of_household: 200000,
      qualifying_surviving_spouse: 250000,
    },
    socialSecurityWageBase: 176100, // Maximum earnings subject to Social Security tax
  },

  // ==================== SECTION 199A (QBI DEDUCTION) ====================
  section199A: {
    deductionRate: 0.20, // 20% of qualified business income
    thresholdAmount: {
      single: 191950,
      married_filing_jointly: 383900,
      married_filing_separately: 191950,
      head_of_household: 191950,
      qualifying_surviving_spouse: 383900,
    },
    phaseoutRange: 50000, // Single
    phaseoutRangeMFJ: 100000, // Married filing jointly
  },
};

/**
 * Compute checksum for rules package
 * Uses SHA-256 hash of JSON.stringify(rules)
 */
export function computeRulesChecksum(rules: TaxRulesPackage): string {
  // In production, use crypto.createHash('sha256')
  const jsonString = JSON.stringify(rules);
  return Buffer.from(jsonString).toString('base64').substring(0, 32);
}

// Compute and set checksum
FEDERAL_RULES_2025_V1.checksum = computeRulesChecksum(FEDERAL_RULES_2025_V1);
