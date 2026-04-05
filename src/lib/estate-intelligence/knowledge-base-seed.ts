/**
 * Estate Intelligence Knowledge Base Seed Data
 *
 * This file contains the state estate tax matrix and other reference data
 * used by the Trust & Estate Intelligence Engine (TEIE).
 */

interface StateEstateTax {
  state: string;
  exemption2024: number; // in dollars
  exemption2025: number;
  topRate: number; // percentage
  portabilityAllowed: boolean;
  cliffProvision: boolean;
  notes?: string;
}

/**
 * State Estate Tax Matrix (2024-2025)
 *
 * These 13 states + DC impose estate taxes separate from federal.
 * Data sourced from state revenue departments as of 2025.
 */
export const STATE_ESTATE_TAX_MATRIX: StateEstateTax[] = [
  {
    state: 'Connecticut',
    exemption2024: 12_920_000,
    exemption2025: 13_610_000,
    topRate: 12.0,
    portabilityAllowed: true,
    cliffProvision: false,
    notes: 'Phased increase toward federal exemption parity'
  },
  {
    state: 'District of Columbia',
    exemption2024: 4_528_800,
    exemption2025: 4_528_800,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Static exemption, highest top rate'
  },
  {
    state: 'Hawaii',
    exemption2024: 5_490_000,
    exemption2025: 5_490_000,
    topRate: 20.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Highest marginal rate among state estate taxes'
  },
  {
    state: 'Illinois',
    exemption2024: 4_000_000,
    exemption2025: 4_000_000,
    topRate: 16.0,
    portabilityAllowed: true,
    cliffProvision: false,
    notes: 'Portability added 2018'
  },
  {
    state: 'Maine',
    exemption2024: 6_410_000,
    exemption2025: 6_800_000,
    topRate: 12.0,
    portabilityAllowed: true,
    cliffProvision: false,
    notes: 'Annual inflation adjustments'
  },
  {
    state: 'Maryland',
    exemption2024: 5_000_000,
    exemption2025: 5_000_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Both estate and inheritance tax states'
  },
  {
    state: 'Massachusetts',
    exemption2024: 2_000_000,
    exemption2025: 2_000_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: true,
    notes: 'CLIFF PROVISION: entire estate taxable if exceeds exemption by $60k+ (dollar-one taxation)'
  },
  {
    state: 'Minnesota',
    exemption2024: 3_000_000,
    exemption2025: 3_000_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'No inflation adjustments since 2020'
  },
  {
    state: 'New York',
    exemption2024: 6_940_000,
    exemption2025: 7_160_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: true,
    notes: 'CLIFF PROVISION: if estate > 105% of exemption, entire exemption lost (recapture tax)'
  },
  {
    state: 'Oregon',
    exemption2024: 1_000_000,
    exemption2025: 1_000_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Lowest exemption in nation; no portability'
  },
  {
    state: 'Rhode Island',
    exemption2024: 1_733_264,
    exemption2025: 1_802_653,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Inflation-adjusted annually'
  },
  {
    state: 'Vermont',
    exemption2024: 5_000_000,
    exemption2025: 5_000_000,
    topRate: 16.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'Progressive rate structure 0.8% to 16%'
  },
  {
    state: 'Washington',
    exemption2024: 2_193_000,
    exemption2025: 2_193_000,
    topRate: 20.0,
    portabilityAllowed: false,
    cliffProvision: false,
    notes: 'No state income tax; estate tax funds education'
  }
];

/**
 * Federal Estate Tax Parameters (2024-2025)
 */
export const FEDERAL_ESTATE_TAX = {
  exemption2024: 13_610_000,
  exemption2025: 13_990_000,
  topRate: 40.0,
  portability: true,
  sunset2026: true,
  sunsettedExemption: 7_000_000, // estimated after TCJA sunset (inflation-adjusted)
  notes: 'TCJA sunset in 2026 reverts exemption to ~$7M (inflation-adjusted)'
};

/**
 * Gift Tax Parameters (unified with estate tax)
 */
export const FEDERAL_GIFT_TAX = {
  annualExclusion2024: 18_000,
  annualExclusion2025: 19_000,
  medicalEducationExemption: true, // unlimited if paid directly to institution
  lifetimeExemption2024: 13_610_000, // same as estate
  lifetimeExemption2025: 13_990_000,
  notes: 'Annual exclusion gifts reduce lifetime exemption only if exceeded'
};

/**
 * Generation-Skipping Transfer Tax Parameters
 */
export const GST_TAX = {
  exemption2024: 13_610_000,
  exemption2025: 13_990_000,
  flatRate: 40.0,
  allocation: 'AUTOMATIC', // or MANUAL via Form 709
  sunset2026: true,
  notes: 'Mirrors estate tax exemption; applies to transfers 2+ generations down'
};

/**
 * IRC References for Estate Planning
 */
export const IRC_SECTIONS = {
  '2001': 'Estate tax imposed',
  '2010': 'Unified credit (exemption)',
  '2013': 'Estate tax rates',
  '2033': 'Property in which decedent had an interest',
  '2036': 'Transfers with retained life estate',
  '2038': 'Revocable transfers',
  '2039': 'Annuities',
  '2041': 'Powers of appointment',
  '2042': 'Life insurance proceeds',
  '2053': 'Deductions for expenses, debts, taxes',
  '2056': 'Marital deduction',
  '2056A': 'QDOT (Qualified Domestic Trust)',
  '2503': 'Annual exclusion gifts',
  '2522': 'Charitable gift deduction',
  '2601': 'GST tax',
  '2631': 'GST exemption allocation',
  '2642': 'Inclusion ratio',
  '7520': 'Applicable federal rate (AFR) for valuations'
};

/**
 * Common Trust Types for Classification
 */
export const TRUST_TYPES = [
  'REVOCABLE_LIVING_TRUST',
  'IRREVOCABLE_LIFE_INSURANCE_TRUST',
  'CHARITABLE_REMAINDER_TRUST',
  'CHARITABLE_LEAD_TRUST',
  'GRANTOR_RETAINED_ANNUITY_TRUST',
  'GRANTOR_RETAINED_UNITRUST',
  'QUALIFIED_PERSONAL_RESIDENCE_TRUST',
  'QUALIFIED_TERMINABLE_INTEREST_PROPERTY_TRUST',
  'BYPASS_TRUST',
  'DYNASTY_TRUST',
  'SPECIAL_NEEDS_TRUST',
  'SPENDTHRIFT_TRUST',
  'ASSET_PROTECTION_TRUST',
  'QUALIFIED_DOMESTIC_TRUST',
  'INTENTIONALLY_DEFECTIVE_GRANTOR_TRUST'
] as const;

export type TrustType = typeof TRUST_TYPES[number];

/**
 * Document Subtypes
 */
export const DOCUMENT_SUBTYPES = {
  REVOCABLE_LIVING_TRUST: [
    'ORIGINAL',
    'FIRST_AMENDMENT',
    'SECOND_AMENDMENT',
    'RESTATEMENT',
    'CERTIFICATE_OF_TRUST'
  ],
  IRREVOCABLE_LIFE_INSURANCE_TRUST: [
    'TRUST_AGREEMENT',
    'CRUMMEY_NOTICE',
    'PREMIUM_GIFT_LETTER',
    'POLICY_ASSIGNMENT'
  ],
  POUR_OVER_WILL: [
    'ORIGINAL',
    'CODICIL',
    'SELF_PROVING_AFFIDAVIT'
  ]
} as const;

/**
 * Red Flags for Document Review
 */
export const RED_FLAGS = {
  MISSING_TRUSTEE_SUCCESSION: {
    severity: 'HIGH',
    description: 'No backup trustees named',
    recommendation: 'Add successor trustee provisions'
  },
  OUTDATED_TAX_REFERENCES: {
    severity: 'MEDIUM',
    description: 'References pre-TCJA exemption amounts',
    recommendation: 'Review and update tax planning clauses'
  },
  NO_DIGITAL_ASSET_CLAUSE: {
    severity: 'LOW',
    description: 'No provision for cryptocurrency or digital assets',
    recommendation: 'Add digital asset management clause'
  },
  ESTATE_TAX_CLIFF_RISK: {
    severity: 'HIGH',
    description: 'Estate within 10% of state exemption with cliff provision',
    recommendation: 'Urgent lifetime gifting or trust restructuring needed'
  },
  PORTABILITY_NOT_CLAIMED: {
    severity: 'MEDIUM',
    description: 'Surviving spouse may lose deceased spouse unused exclusion (DSUE)',
    recommendation: 'File Form 706 within 5 years of death'
  }
} as const;

/**
 * Seed function for populating EstateKnowledgeBase table
 */
export function getKnowledgeBaseSeedData() {
  const seedData: Array<{
    category: string;
    key: string;
    value: string;
    effectiveDate: string;
    expirationDate?: string;
    source?: string;
  }> = [];

  // State estate tax data
  STATE_ESTATE_TAX_MATRIX.forEach(state => {
    seedData.push({
      category: 'STATE_TAX',
      key: state.state,
      value: JSON.stringify(state),
      effectiveDate: '2024-01-01',
      expirationDate: '2025-12-31',
      source: `${state.state} Department of Revenue`
    });
  });

  // Federal parameters
  seedData.push({
    category: 'EXEMPTION',
    key: 'FEDERAL_ESTATE_2024',
    value: JSON.stringify(FEDERAL_ESTATE_TAX),
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    source: 'IRS Rev. Proc. 2023-34'
  });

  seedData.push({
    category: 'EXEMPTION',
    key: 'FEDERAL_GIFT_2024',
    value: JSON.stringify(FEDERAL_GIFT_TAX),
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    source: 'IRS Rev. Proc. 2023-34'
  });

  seedData.push({
    category: 'EXEMPTION',
    key: 'GST_2024',
    value: JSON.stringify(GST_TAX),
    effectiveDate: '2024-01-01',
    expirationDate: '2024-12-31',
    source: 'IRC §2631'
  });

  // IRC sections
  Object.entries(IRC_SECTIONS).forEach(([section, description]) => {
    seedData.push({
      category: 'IRC',
      key: `IRC_${section}`,
      value: JSON.stringify({ section, description }),
      effectiveDate: '2024-01-01',
      source: 'Internal Revenue Code'
    });
  });

  // Red flags
  Object.entries(RED_FLAGS).forEach(([code, flag]) => {
    seedData.push({
      category: 'REGULATION',
      key: `RED_FLAG_${code}`,
      value: JSON.stringify(flag),
      effectiveDate: '2024-01-01',
      source: 'TEIE Best Practices'
    });
  });

  return seedData;
}

/**
 * Helper: Get state estate tax info by state name
 */
export function getStateEstateTax(stateName: string): StateEstateTax | undefined {
  return STATE_ESTATE_TAX_MATRIX.find(
    s => s.state.toLowerCase() === stateName.toLowerCase()
  );
}

/**
 * Helper: Check if estate is at risk for cliff provision
 */
export function checkCliffRisk(
  estateValue: number,
  state: string
): { atRisk: boolean; margin: number; severity: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const stateInfo = getStateEstateTax(state);
  if (!stateInfo || !stateInfo.cliffProvision) {
    return { atRisk: false, margin: 0, severity: 'LOW' };
  }

  const margin = estateValue - stateInfo.exemption2025;
  const percentOver = (margin / stateInfo.exemption2025) * 100;

  if (percentOver > 0 && percentOver <= 10) {
    return { atRisk: true, margin, severity: 'HIGH' };
  } else if (percentOver > -10 && percentOver <= 0) {
    return { atRisk: true, margin: Math.abs(margin), severity: 'MEDIUM' };
  }

  return { atRisk: false, margin, severity: 'LOW' };
}
