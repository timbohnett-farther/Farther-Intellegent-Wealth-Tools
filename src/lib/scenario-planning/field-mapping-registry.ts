/**
 * Field Mapping Registry — Phase 5A
 *
 * Maps scenario override field names to TaxInputSnapshot paths with validation metadata.
 * This registry enables type-safe scenario overrides and validation.
 */

// ==================== TYPES ====================

export type OverrideOperator = 'replace' | 'add' | 'subtract' | 'toggle';
export type FieldCategory = 'income' | 'adjustment' | 'deduction' | 'credit' | 'payment' | 'metadata';
export type FieldDataType = 'number' | 'string' | 'boolean';

export interface FieldMapping {
  scenarioField: string;
  snapshotPath: string; // Path in TaxInputSnapshot (e.g., "inputs.wages")
  dataType: FieldDataType;
  allowedOperators: OverrideOperator[];
  label: string;
  category: FieldCategory;
  description?: string;
  validationRules?: {
    min?: number;
    max?: number;
    mustBePositive?: boolean;
  };
}

// ==================== REGISTRY ====================

const FIELD_MAPPINGS: Record<string, FieldMapping> = {
  // ==================== INCOME ====================
  wages: {
    scenarioField: 'wages',
    snapshotPath: 'inputs.wages',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Wages',
    category: 'income',
    description: 'W-2 wages and salaries',
    validationRules: { mustBePositive: true, min: 0 },
  },
  salaries: {
    scenarioField: 'salaries',
    snapshotPath: 'inputs.salaries',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Salaries',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  taxableInterest: {
    scenarioField: 'taxableInterest',
    snapshotPath: 'inputs.taxableInterest',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Taxable Interest',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  taxExemptInterest: {
    scenarioField: 'taxExemptInterest',
    snapshotPath: 'inputs.taxExemptInterest',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Tax-Exempt Interest',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  ordinaryDividends: {
    scenarioField: 'ordinaryDividends',
    snapshotPath: 'inputs.ordinaryDividends',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Ordinary Dividends',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  qualifiedDividends: {
    scenarioField: 'qualifiedDividends',
    snapshotPath: 'inputs.qualifiedDividends',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Qualified Dividends',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  capitalGainLoss: {
    scenarioField: 'capitalGainLoss',
    snapshotPath: 'inputs.capitalGainLoss',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Capital Gain/Loss',
    category: 'income',
    description: 'Net capital gain or loss from Schedule D',
  },
  businessIncomeLoss: {
    scenarioField: 'businessIncomeLoss',
    snapshotPath: 'inputs.businessIncomeLoss',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Business Income/Loss',
    category: 'income',
    description: 'Schedule C business income or loss',
  },
  iraDistributions: {
    scenarioField: 'iraDistributions',
    snapshotPath: 'inputs.iraDistributions',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'IRA Distributions (Total)',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  iraDistributionsTaxable: {
    scenarioField: 'iraDistributionsTaxable',
    snapshotPath: 'inputs.iraDistributionsTaxable',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'IRA Distributions (Taxable)',
    category: 'income',
    description: 'Taxable portion of IRA distributions (for Roth conversion scenarios)',
    validationRules: { mustBePositive: true, min: 0 },
  },
  pensionsAnnuities: {
    scenarioField: 'pensionsAnnuities',
    snapshotPath: 'inputs.pensionsAnnuities',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Pensions & Annuities (Total)',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  pensionsAnnuitiesTaxable: {
    scenarioField: 'pensionsAnnuitiesTaxable',
    snapshotPath: 'inputs.pensionsAnnuitiesTaxable',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Pensions & Annuities (Taxable)',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  scheduleE: {
    scenarioField: 'scheduleE',
    snapshotPath: 'inputs.scheduleE',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Schedule E Income',
    category: 'income',
    description: 'Rental, royalty, partnership, S-corp income',
  },
  socialSecurityBenefits: {
    scenarioField: 'socialSecurityBenefits',
    snapshotPath: 'inputs.socialSecurityBenefits',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Social Security Benefits',
    category: 'income',
    validationRules: { mustBePositive: true, min: 0 },
  },
  otherIncome: {
    scenarioField: 'otherIncome',
    snapshotPath: 'inputs.otherIncome',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Other Income',
    category: 'income',
  },

  // ==================== ADJUSTMENTS ====================
  hsaDeduction: {
    scenarioField: 'hsaDeduction',
    snapshotPath: 'inputs.hsaDeduction',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'HSA Deduction',
    category: 'adjustment',
    validationRules: { mustBePositive: true, min: 0 },
  },
  iraContributionDeduction: {
    scenarioField: 'iraContributionDeduction',
    snapshotPath: 'inputs.iraContributionDeduction',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'IRA Contribution Deduction',
    category: 'adjustment',
    validationRules: { mustBePositive: true, min: 0 },
  },
  studentLoanInterest: {
    scenarioField: 'studentLoanInterest',
    snapshotPath: 'inputs.studentLoanInterest',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Student Loan Interest',
    category: 'adjustment',
    validationRules: { mustBePositive: true, min: 0, max: 2500 },
  },
  selfEmployedSepSimple: {
    scenarioField: 'selfEmployedSepSimple',
    snapshotPath: 'inputs.selfEmployedSepSimple',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Self-Employed SEP/SIMPLE',
    category: 'adjustment',
    validationRules: { mustBePositive: true, min: 0 },
  },

  // ==================== ITEMIZED DEDUCTIONS ====================
  medicalDentalExpenses: {
    scenarioField: 'medicalDentalExpenses',
    snapshotPath: 'inputs.medicalDentalExpenses',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Medical & Dental Expenses',
    category: 'deduction',
    validationRules: { mustBePositive: true, min: 0 },
  },
  stateLocalIncomeTaxes: {
    scenarioField: 'stateLocalIncomeTaxes',
    snapshotPath: 'inputs.stateLocalIncomeTaxes',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'State & Local Income Taxes',
    category: 'deduction',
    description: 'Part of SALT cap',
    validationRules: { mustBePositive: true, min: 0 },
  },
  realEstateTaxes: {
    scenarioField: 'realEstateTaxes',
    snapshotPath: 'inputs.realEstateTaxes',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Real Estate Taxes',
    category: 'deduction',
    description: 'Part of SALT cap',
    validationRules: { mustBePositive: true, min: 0 },
  },
  mortgageInterest: {
    scenarioField: 'mortgageInterest',
    snapshotPath: 'inputs.mortgageInterest',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Mortgage Interest',
    category: 'deduction',
    validationRules: { mustBePositive: true, min: 0 },
  },
  charitableCashContributions: {
    scenarioField: 'charitableCashContributions',
    snapshotPath: 'inputs.charitableCashContributions',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Charitable Cash Contributions',
    category: 'deduction',
    description: 'For charitable bunching scenarios',
    validationRules: { mustBePositive: true, min: 0 },
  },
  charitableNoncashContributions: {
    scenarioField: 'charitableNoncashContributions',
    snapshotPath: 'inputs.charitableNoncashContributions',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Charitable Non-Cash Contributions',
    category: 'deduction',
    validationRules: { mustBePositive: true, min: 0 },
  },

  // ==================== TAX CREDITS ====================
  childTaxCredit: {
    scenarioField: 'childTaxCredit',
    snapshotPath: 'inputs.childTaxCredit',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Child Tax Credit',
    category: 'credit',
    validationRules: { mustBePositive: true, min: 0 },
  },
  childDependentCareCredit: {
    scenarioField: 'childDependentCareCredit',
    snapshotPath: 'inputs.childDependentCareCredit',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Child & Dependent Care Credit',
    category: 'credit',
    validationRules: { mustBePositive: true, min: 0 },
  },
  educationCredits: {
    scenarioField: 'educationCredits',
    snapshotPath: 'inputs.educationCredits',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Education Credits',
    category: 'credit',
    description: 'American Opportunity or Lifetime Learning Credit',
    validationRules: { mustBePositive: true, min: 0 },
  },
  retirementSavingsCredit: {
    scenarioField: 'retirementSavingsCredit',
    snapshotPath: 'inputs.retirementSavingsCredit',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Retirement Savings Credit',
    category: 'credit',
    description: 'Saver\'s Credit',
    validationRules: { mustBePositive: true, min: 0 },
  },
  foreignTaxCredit: {
    scenarioField: 'foreignTaxCredit',
    snapshotPath: 'inputs.foreignTaxCredit',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Foreign Tax Credit',
    category: 'credit',
    validationRules: { mustBePositive: true, min: 0 },
  },

  // ==================== PAYMENTS ====================
  federalIncomeTaxWithheld: {
    scenarioField: 'federalIncomeTaxWithheld',
    snapshotPath: 'inputs.federalIncomeTaxWithheld',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Federal Income Tax Withheld',
    category: 'payment',
    description: 'For withholding adjustment scenarios',
    validationRules: { mustBePositive: true, min: 0 },
  },
  estimatedTaxPayments: {
    scenarioField: 'estimatedTaxPayments',
    snapshotPath: 'inputs.estimatedTaxPayments',
    dataType: 'number',
    allowedOperators: ['replace', 'add', 'subtract'],
    label: 'Estimated Tax Payments',
    category: 'payment',
    description: 'For estimated payment plan scenarios',
    validationRules: { mustBePositive: true, min: 0 },
  },
};

// ==================== REGISTRY INTERFACE ====================

export const fieldMappingRegistry = {
  /**
   * Get field mapping by scenario field name
   */
  getFieldMapping(scenarioField: string): FieldMapping | null {
    return FIELD_MAPPINGS[scenarioField] || null;
  },

  /**
   * Get snapshot path for a scenario field
   */
  getSnapshotPath(scenarioField: string): string | null {
    const mapping = FIELD_MAPPINGS[scenarioField];
    return mapping ? mapping.snapshotPath : null;
  },

  /**
   * Check if an operator is valid for a given scenario field
   */
  isValidOperator(scenarioField: string, operator: OverrideOperator): boolean {
    const mapping = FIELD_MAPPINGS[scenarioField];
    if (!mapping) return false;
    return mapping.allowedOperators.includes(operator);
  },

  /**
   * Get all available scenario fields
   */
  getAllScenarioFields(): string[] {
    return Object.keys(FIELD_MAPPINGS);
  },

  /**
   * Get all fields by category
   */
  getFieldsByCategory(category: FieldCategory): FieldMapping[] {
    return Object.values(FIELD_MAPPINGS).filter((m) => m.category === category);
  },

  /**
   * Validate field value against mapping rules
   */
  validateFieldValue(scenarioField: string, value: any): { valid: boolean; error?: string } {
    const mapping = FIELD_MAPPINGS[scenarioField];
    if (!mapping) {
      return { valid: false, error: `Unknown field: ${scenarioField}` };
    }

    // Type check
    if (mapping.dataType === 'number' && typeof value !== 'number') {
      return { valid: false, error: `Field ${scenarioField} expects a number` };
    }
    if (mapping.dataType === 'boolean' && typeof value !== 'boolean') {
      return { valid: false, error: `Field ${scenarioField} expects a boolean` };
    }
    if (mapping.dataType === 'string' && typeof value !== 'string') {
      return { valid: false, error: `Field ${scenarioField} expects a string` };
    }

    // Validation rules for numbers
    if (mapping.dataType === 'number' && mapping.validationRules) {
      const rules = mapping.validationRules;
      if (rules.min !== undefined && value < rules.min) {
        return { valid: false, error: `Value must be >= ${rules.min}` };
      }
      if (rules.max !== undefined && value > rules.max) {
        return { valid: false, error: `Value must be <= ${rules.max}` };
      }
      if (rules.mustBePositive && value < 0) {
        return { valid: false, error: `Value must be positive` };
      }
    }

    return { valid: true };
  },

  /**
   * Get field label for UI display
   */
  getFieldLabel(scenarioField: string): string {
    const mapping = FIELD_MAPPINGS[scenarioField];
    return mapping ? mapping.label : scenarioField;
  },

  /**
   * Check if field exists in registry
   */
  fieldExists(scenarioField: string): boolean {
    return scenarioField in FIELD_MAPPINGS;
  },
};

// ==================== EXPORTS ====================
// Note: Types (OverrideOperator, FieldCategory, FieldDataType, FieldMapping) are already exported at the top

export { FIELD_MAPPINGS };
