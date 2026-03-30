/**
 * Tax Input Mapping Configuration — 2025
 *
 * Defines how ApprovedFact canonical fields map to TaxInputValues fields.
 * This configuration is versioned and immutable once published.
 */

export type TransformType =
  | 'identity'
  | 'currency_to_number'
  | 'coalesce_zero'
  | 'sum_fields'
  | 'subtract_fields'
  | 'bool_presence'
  | 'nullable_number'
  | 'safe_positive_currency'
  | 'last_non_null'
  | 'to_integer'
  | 'percentage_to_decimal'
  | 'to_iso_date'
  | 'max_value'
  | 'min_value';

export interface FieldMapping {
  /** Canonical field name from ApprovedFact */
  approvedFactField: string;

  /** Target field in TaxInputValues */
  taxInputField: string;

  /** Transformation to apply */
  transform: TransformType;

  /** Additional transform parameters */
  transformParams?: any[];

  /** Is this field required for baseline calculation? */
  requiredFor: ('baseline' | 'scenario')[];

  /** Field category for grouping */
  category: 'income' | 'deductions' | 'credits' | 'payments' | 'identity' | 'retirement' | 'flags';

  /** Human-readable description */
  description?: string;
}

export interface CompoundMapping {
  /** Target field in TaxInputValues */
  taxInputField: string;

  /** Source fields to combine */
  sourceFields: string[];

  /** How to combine them */
  transform: 'sum_fields' | 'subtract_fields' | 'last_non_null';

  /** Required for calculation types */
  requiredFor: ('baseline' | 'scenario')[];

  /** Field category */
  category: string;

  /** Description */
  description?: string;
}

export interface MappingConfiguration {
  mappingVersion: string;
  taxYear: number;
  publishedAt: string;
  status: 'draft' | 'published';

  /** Simple 1:1 or 1:transform mappings */
  fieldMappings: FieldMapping[];

  /** Compound mappings (multiple sources → one target) */
  compoundMappings: CompoundMapping[];

  /** Fields that must be present for baseline */
  baselineRequiredFields: string[];

  /** Fields that trigger warnings if missing */
  warningIfMissingFields: string[];
}

/**
 * 2025 Federal Tax Input Mapping Configuration
 */
export const MAPPING_CONFIG_2025: MappingConfiguration = {
  mappingVersion: '2025_input_mapper_v1',
  taxYear: 2025,
  publishedAt: '2026-03-30T00:00:00Z',
  status: 'published',

  fieldMappings: [
    // ==================== INCOME ====================
    {
      approvedFactField: 'wages',
      taxInputField: 'wages',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: 'W-2 wages, salaries, tips',
    },
    {
      approvedFactField: 'salaries',
      taxInputField: 'salaries',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
    },
    {
      approvedFactField: 'tips',
      taxInputField: 'tips',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
    },
    {
      approvedFactField: 'taxable_interest',
      taxInputField: 'taxableInterest',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: '1099-INT taxable interest',
    },
    {
      approvedFactField: 'tax_exempt_interest',
      taxInputField: 'taxExemptInterest',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: 'Municipal bond interest',
    },
    {
      approvedFactField: 'ordinary_dividends',
      taxInputField: 'ordinaryDividends',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: '1099-DIV ordinary dividends',
    },
    {
      approvedFactField: 'qualified_dividends',
      taxInputField: 'qualifiedDividends',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: '1099-DIV qualified dividends (preferential rate)',
    },
    {
      approvedFactField: 'capital_gain_loss_net',
      taxInputField: 'capitalGainLossNet',
      transform: 'currency_to_number', // Can be negative
      requiredFor: [],
      category: 'income',
      description: 'Schedule D net capital gain or loss',
    },
    {
      approvedFactField: 'capital_loss_carryforward',
      taxInputField: 'capitalLossCarryforward',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: 'Prior year capital loss carryforward',
    },
    {
      approvedFactField: 'ira_distributions_total',
      taxInputField: 'iraDistributionsTotal',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'retirement',
      description: 'Total IRA distributions (1099-R)',
    },
    {
      approvedFactField: 'ira_distributions_taxable',
      taxInputField: 'iraDistributionsTaxable',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'retirement',
      description: 'Taxable portion of IRA distributions',
    },
    {
      approvedFactField: 'pension_income_total',
      taxInputField: 'pensionIncomeTotal',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'retirement',
      description: 'Total pension/annuity income',
    },
    {
      approvedFactField: 'pension_income_taxable',
      taxInputField: 'pensionIncomeTaxable',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'retirement',
      description: 'Taxable portion of pension/annuity',
    },
    {
      approvedFactField: 'social_security_total',
      taxInputField: 'socialSecurityTotal',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'retirement',
      description: 'Total Social Security benefits',
    },
    {
      approvedFactField: 'social_security_taxable_override',
      taxInputField: 'socialSecurityTaxableOverride',
      transform: 'nullable_number',
      requiredFor: [],
      category: 'retirement',
      description: 'Manual override for taxable Social Security (if computed incorrectly)',
    },
    {
      approvedFactField: 'business_income',
      taxInputField: 'businessIncome',
      transform: 'currency_to_number', // Can be negative
      requiredFor: [],
      category: 'income',
      description: 'Schedule C business income/loss',
    },
    {
      approvedFactField: 'rental_income',
      taxInputField: 'rentalIncome',
      transform: 'currency_to_number', // Can be negative
      requiredFor: [],
      category: 'income',
      description: 'Schedule E rental income/loss',
    },
    {
      approvedFactField: 'unemployment_income',
      taxInputField: 'unemploymentIncome',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'income',
      description: 'Unemployment compensation',
    },
    {
      approvedFactField: 'other_income',
      taxInputField: 'otherIncome',
      transform: 'currency_to_number',
      requiredFor: [],
      category: 'income',
      description: 'Other miscellaneous income',
    },

    // ==================== ADJUSTMENTS TO INCOME ====================
    {
      approvedFactField: 'deductible_ira_contribution',
      taxInputField: 'deductibleIraContribution',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Traditional IRA contribution deduction',
    },
    {
      approvedFactField: 'hsa_contribution_deduction',
      taxInputField: 'hsaContributionDeduction',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'HSA contribution deduction',
    },
    {
      approvedFactField: 'self_employed_health_insurance',
      taxInputField: 'selfEmployedHealthInsuranceDeduction',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Self-employed health insurance deduction',
    },
    {
      approvedFactField: 'other_adjustments',
      taxInputField: 'otherAdjustments',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Other above-the-line adjustments',
    },

    // ==================== ITEMIZED DEDUCTIONS ====================
    {
      approvedFactField: 'itemized_deductions_total',
      taxInputField: 'itemizedDeductionsTotal',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Total itemized deductions (Schedule A)',
    },
    {
      approvedFactField: 'charitable_contributions_cash',
      taxInputField: 'charitableContributionsCash',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Cash charitable contributions',
    },
    {
      approvedFactField: 'charitable_contributions_noncash',
      taxInputField: 'charitableContributionsNoncash',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Non-cash charitable contributions',
    },
    {
      approvedFactField: 'salt_deduction',
      taxInputField: 'saltDeduction',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'State and local tax deduction (capped at $10K)',
    },
    {
      approvedFactField: 'mortgage_interest',
      taxInputField: 'mortgageInterest',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Mortgage interest paid (1098)',
    },
    {
      approvedFactField: 'medical_expenses',
      taxInputField: 'medicalExpenses',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'deductions',
      description: 'Qualified medical expenses',
    },

    // ==================== PAYMENTS ====================
    {
      approvedFactField: 'federal_withholding',
      taxInputField: 'federalWithholding',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'payments',
      description: 'Federal income tax withheld',
    },
    {
      approvedFactField: 'estimated_tax_payments',
      taxInputField: 'estimatedTaxPayments',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'payments',
      description: 'Estimated tax payments made',
    },
    {
      approvedFactField: 'extension_payments',
      taxInputField: 'extensionPayments',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'payments',
      description: 'Payments made with extension',
    },
    {
      approvedFactField: 'refundable_credits',
      taxInputField: 'refundableCredits',
      transform: 'safe_positive_currency',
      requiredFor: [],
      category: 'credits',
      description: 'Refundable credits total',
    },

    // ==================== SPECIAL FIELDS ====================
    {
      approvedFactField: 'basis_in_ira',
      taxInputField: 'basisInIra',
      transform: 'nullable_number',
      requiredFor: [],
      category: 'retirement',
      description: 'After-tax basis in traditional IRA (Form 8606)',
    },
    {
      approvedFactField: 'qbi_deduction_override',
      taxInputField: 'qbiDeduction',
      transform: 'nullable_number',
      requiredFor: [],
      category: 'deductions',
      description: 'Qualified Business Income deduction (Section 199A)',
    },
    {
      approvedFactField: 'niit_candidate_investment_income',
      taxInputField: 'niitCandidateInvestmentIncome',
      transform: 'nullable_number',
      requiredFor: [],
      category: 'income',
      description: 'Net investment income for NIIT calculation',
    },

    // ==================== FLAGS ====================
    {
      approvedFactField: 'form_8606_present',
      taxInputField: 'form8606Present',
      transform: 'bool_presence',
      requiredFor: [],
      category: 'flags',
      description: 'Form 8606 (Nondeductible IRAs) present',
    },
    {
      approvedFactField: 'schedule_d_present',
      taxInputField: 'scheduleDPresent',
      transform: 'bool_presence',
      requiredFor: [],
      category: 'flags',
      description: 'Schedule D (Capital Gains) present',
    },
    {
      approvedFactField: 'form_8949_present',
      taxInputField: 'form8949Present',
      transform: 'bool_presence',
      requiredFor: [],
      category: 'flags',
      description: 'Form 8949 (Sales of Capital Assets) present',
    },
  ],

  compoundMappings: [
    // Example: If we need to sum multiple sources into one field
    // {
    //   taxInputField: 'totalWagesAndSalaries',
    //   sourceFields: ['wages', 'salaries'],
    //   transform: 'sum_fields',
    //   requiredFor: [],
    //   category: 'income',
    //   description: 'Combined wages and salaries',
    // },
  ],

  baselineRequiredFields: [
    // No hard requirements for baseline - we can calculate even with sparse data
    // Missing fields will be flagged in validation warnings
  ],

  warningIfMissingFields: [
    'wages',
    'ordinary_dividends',
    'federal_withholding',
  ],
};
