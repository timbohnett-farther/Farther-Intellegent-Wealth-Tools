// ==================== ENUM TYPES ====================

export type FirmPlan = 'starter' | 'professional' | 'enterprise';
export type AdvisorRole = 'admin' | 'advisor' | 'associate' | 'read_only';
export type ClientRole = 'primary' | 'co_client' | 'dependent';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'domestic_partner' | 'separated';
export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qw';
export type EmploymentStatus = 'employed' | 'self_employed' | 'retired' | 'part_time' | 'not_employed';
export type WealthTier = 'emerging' | 'mass_affluent' | 'hnw' | 'uhnw';
export type PlanStatus = 'draft' | 'active' | 'needs_review' | 'archived';
export type PlanType = 'comprehensive' | 'retirement_only' | 'tax_only' | 'estate_only';
export type GoalPriority = 'needs' | 'wants' | 'wishes';

export type IncomeType =
  | 'employment_salary' | 'employment_bonus' | 'employment_commission'
  | 'self_employment' | 'business_owner_distribution' | 'partnership_k1'
  | 'rental_real_estate' | 'rental_other'
  | 'pension_defined_benefit' | 'pension_defined_contribution'
  | 'social_security_retirement' | 'social_security_spousal' | 'social_security_survivor' | 'social_security_disability'
  | 'annuity_fixed' | 'annuity_variable' | 'annuity_indexed'
  | 'trust_distribution' | 'estate_distribution'
  | 'alimony_received' | 'child_support_received'
  | 'royalties' | 'intellectual_property'
  | 'farm_income' | 'unemployment_benefits' | 'workers_comp'
  | 'other_taxable' | 'other_nontaxable';

export type Frequency = 'annual' | 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'one_time';

export type TaxCharacter = 'ordinary' | 'qualified_dividend' | 'ltcg' | 'tax_exempt' | 'return_of_basis';

export type ExpenseCategory =
  | 'housing_mortgage' | 'housing_rent' | 'housing_property_tax' | 'housing_insurance' | 'housing_hoa' | 'housing_maintenance' | 'housing_utilities' | 'housing_other'
  | 'transportation_auto_payment' | 'transportation_insurance' | 'transportation_gas' | 'transportation_maintenance' | 'transportation_other'
  | 'food_groceries' | 'food_dining'
  | 'healthcare_insurance_premiums' | 'healthcare_out_of_pocket' | 'healthcare_dental' | 'healthcare_vision' | 'healthcare_ltc_premiums'
  | 'insurance_life' | 'insurance_disability' | 'insurance_umbrella' | 'insurance_property'
  | 'education_tuition' | 'education_k12' | 'education_activities' | 'education_529_contributions'
  | 'debt_student_loan' | 'debt_credit_card' | 'debt_other'
  | 'personal_clothing' | 'personal_personal_care' | 'personal_subscriptions' | 'personal_entertainment' | 'personal_travel' | 'personal_vacation'
  | 'family_childcare' | 'family_dependent_support' | 'family_alimony_paid' | 'family_child_support_paid'
  | 'giving_charitable_cash' | 'giving_charitable_non_cash' | 'giving_tithing' | 'giving_family_gifts' | 'giving_annual_gift_exclusion'
  | 'professional_services' | 'business_expenses'
  | 'taxes_property' | 'taxes_estimated_federal' | 'taxes_estimated_state' | 'taxes_other'
  | 'one_time_home_purchase' | 'one_time_home_renovation' | 'one_time_vehicle' | 'one_time_wedding' | 'one_time_travel' | 'one_time_other'
  | 'ltc_facility' | 'ltc_home_care'
  | 'other';

export type AccountType =
  // Taxable
  | 'brokerage_individual' | 'brokerage_joint' | 'checking' | 'savings' | 'money_market' | 'cd' | 'utma_ugma' | 'crypto_exchange' | 'collectibles' | 'real_estate_investment' | 'private_equity' | 'hedge_fund' | 'private_credit'
  // Tax-deferred
  | 'ira_traditional' | 'ira_sep' | 'ira_simple' | 'ira_rollover' | 'ira_inherited' | '401k_traditional' | '403b_traditional' | '457b' | 'pension_db' | 'nqdc' | 'annuity_non_qualified' | 'hsa_spendable'
  // Tax-free
  | 'roth_ira' | 'roth_401k' | 'roth_403b' | '529_plan' | 'hsa_investable' | 'life_insurance_csv'
  // Non-financial
  | 'real_estate_primary' | 'real_estate_vacation' | 'business_interest' | 'personal_property' | 'other_asset'
  // Liability
  | 'mortgage_primary' | 'mortgage_investment' | 'heloc' | 'auto_loan' | 'student_loan_federal' | 'student_loan_private' | 'credit_card' | 'margin_loan' | 'sbloc' | 'personal_loan' | 'business_loan' | 'other_liability';

export type TaxBucket = 'taxable' | 'tax_deferred' | 'tax_free' | 'non_financial';
export type Registration = 'individual' | 'joint_tenants' | 'joint_community' | 'tenants_common' | 'trust' | 'entity' | 'beneficiary_ira' | 'inherited_ira';

export type GoalType =
  | 'retirement' | 'early_retirement' | 'semi_retirement'
  | 'education_college' | 'education_private_k12' | 'education_graduate'
  | 'home_purchase' | 'home_renovation' | 'home_payoff'
  | 'vehicle_purchase'
  | 'major_travel' | 'sabbatical'
  | 'business_purchase' | 'business_startup'
  | 'legacy_estate' | 'legacy_charity'
  | 'emergency_fund' | 'long_term_care' | 'wedding'
  | 'financial_independence' | 'debt_payoff'
  | 'other_one_time' | 'other_recurring';

export type InsuranceType = 'life_term' | 'life_whole' | 'life_universal' | 'life_vul' | 'life_iul' | 'disability' | 'ltc' | 'umbrella' | 'property' | 'annuity_income';

export type EstateDocType = 'will' | 'revocable_trust' | 'irrevocable_trust' | 'pour_over_will' | 'durable_poa' | 'healthcare_proxy' | 'living_will' | 'guardianship' | 'premarital_agreement' | 'buy_sell_agreement' | 'hipaa_authorization' | 'partnership_agreement';
export type EstateDocStatus = 'in_place' | 'needs_update' | 'not_in_place' | 'unknown';

// Stage 3 types
export type TrustType =
  | 'revocable_living' | 'ilit' | 'slat' | 'grat' | 'qprt'
  | 'crut' | 'crat' | 'clat' | 'clut'
  | 'dynasty' | 'special_needs' | 'spendthrift'
  | 'qdot' | 'marital_qtip' | 'credit_shelter'
  | 'standalone_retirement' | 'blind' | 'foreign' | 'other';

export type TrustStatus = 'in_drafting' | 'executed' | 'funded' | 'partially_funded';

export type EquityGrantType = 'rsu' | 'nqso' | 'iso' | 'espp';

export type BusinessEntityType = 'sole_prop' | 's_corp' | 'c_corp' | 'llc_disregarded' | 'llc_partnership' | 'partnership' | 'lp' | 'llp';

export type CharitableStrategyType = 'daf' | 'qcd' | 'crt' | 'clt' | 'foundation' | 'direct';

export type GiftType = 'annual_exclusion' | 'lifetime_exemption' | '529_superfunding' | 'direct_tuition' | 'direct_medical' | 'appreciated_asset';

export type EstateRoleType = 'executor' | 'successor_executor' | 'trustee' | 'successor_trustee' | 'guardian' | 'poa_agent';

export type LifeEventType = 'marriage' | 'new_child' | 'job_change' | 'home_purchase' | 'inheritance' | 'divorce' | 'death_in_family';

export type ReportType = 'comprehensive' | 'annual_review' | 'tax_strategy' | 'ss_analysis' | 'estate_summary' | 'ips';

export type AlternativeAssetClass = 'pe_buyout' | 'venture' | 'growth' | 'real_assets' | 'infrastructure' | 'private_credit' | 'hedge_fund' | 'commodities';

export type ExitType = 'sale_third_party' | 'sale_co_owner' | 'family_transfer' | 'esop' | 'ipo' | 'liquidation';

export type BuySellType = 'cross_purchase' | 'entity_redemption' | 'hybrid' | 'one_way';

export type ValuationMethod = 'multiple_of_ebitda' | 'revenue_multiple' | 'dcf' | 'book_value' | 'appraised' | 'custom';

export type DependentRelationship = 'child' | 'grandchild' | 'parent' | 'sibling' | 'other';

export type TaxTableType = 'ordinary_income' | 'capital_gains' | 'amt' | 'estate' | 'gift' | 'ss_wage_base' | 'irmaa_part_b' | 'irmaa_part_d' | 'rmd_uniform' | 'rmd_joint' | 'rmd_single' | 'contribution_limits';

// ==================== COMPLETION TRACKER ====================

export interface CompletionSection {
  profile: boolean;
  income: boolean;
  expenses: boolean;
  netWorth: boolean;
  goals: boolean;
  insurance: boolean;
  assumptions: boolean;
}

export type CompletionBadge = 'incomplete' | 'basic' | 'standard' | 'comprehensive' | 'optimized';

export function getCompletionBadge(score: number): CompletionBadge {
  if (score >= 90) return 'optimized';
  if (score >= 80) return 'comprehensive';
  if (score >= 60) return 'standard';
  if (score >= 40) return 'basic';
  return 'incomplete';
}

export function getCompletionBadgeColor(badge: CompletionBadge): string {
  switch (badge) {
    case 'optimized': return 'bg-green-700 text-white';
    case 'comprehensive': return 'bg-green-100 text-green-700';
    case 'standard': return 'bg-blue-100 text-blue-700';
    case 'basic': return 'bg-yellow-100 text-yellow-700';
    case 'incomplete': return 'bg-gray-100 text-gray-500';
  }
}

// ==================== DISPLAY HELPERS ====================

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  employment_salary: 'Employment Salary',
  employment_bonus: 'Bonus',
  employment_commission: 'Commission',
  self_employment: 'Self-Employment',
  business_owner_distribution: 'Business Distribution',
  partnership_k1: 'Partnership K-1',
  rental_real_estate: 'Rental Real Estate',
  rental_other: 'Rental (Other)',
  pension_defined_benefit: 'Pension (DB)',
  pension_defined_contribution: 'Pension (DC)',
  social_security_retirement: 'Social Security (Retirement)',
  social_security_spousal: 'Social Security (Spousal)',
  social_security_survivor: 'Social Security (Survivor)',
  social_security_disability: 'Social Security (Disability)',
  annuity_fixed: 'Annuity (Fixed)',
  annuity_variable: 'Annuity (Variable)',
  annuity_indexed: 'Annuity (Indexed)',
  trust_distribution: 'Trust Distribution',
  estate_distribution: 'Estate Distribution',
  alimony_received: 'Alimony Received',
  child_support_received: 'Child Support Received',
  royalties: 'Royalties',
  intellectual_property: 'Intellectual Property',
  farm_income: 'Farm Income',
  unemployment_benefits: 'Unemployment Benefits',
  workers_comp: "Workers' Comp",
  other_taxable: 'Other (Taxable)',
  other_nontaxable: 'Other (Non-taxable)',
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  housing_mortgage: 'Mortgage',
  housing_rent: 'Rent',
  housing_property_tax: 'Property Tax',
  housing_insurance: 'Home Insurance',
  housing_hoa: 'HOA',
  housing_maintenance: 'Home Maintenance',
  housing_utilities: 'Utilities',
  housing_other: 'Housing (Other)',
  transportation_auto_payment: 'Auto Payment',
  transportation_insurance: 'Auto Insurance',
  transportation_gas: 'Gas / Fuel',
  transportation_maintenance: 'Auto Maintenance',
  transportation_other: 'Transportation (Other)',
  food_groceries: 'Groceries',
  food_dining: 'Dining Out',
  healthcare_insurance_premiums: 'Health Insurance',
  healthcare_out_of_pocket: 'Medical (Out of Pocket)',
  healthcare_dental: 'Dental',
  healthcare_vision: 'Vision',
  healthcare_ltc_premiums: 'LTC Premiums',
  insurance_life: 'Life Insurance',
  insurance_disability: 'Disability Insurance',
  insurance_umbrella: 'Umbrella Insurance',
  insurance_property: 'Property Insurance',
  education_tuition: 'Tuition',
  education_k12: 'K-12 Education',
  education_activities: 'Activities / Extracurriculars',
  education_529_contributions: '529 Contributions',
  debt_student_loan: 'Student Loan',
  debt_credit_card: 'Credit Card',
  debt_other: 'Other Debt',
  personal_clothing: 'Clothing',
  personal_personal_care: 'Personal Care',
  personal_subscriptions: 'Subscriptions',
  personal_entertainment: 'Entertainment',
  personal_travel: 'Travel',
  personal_vacation: 'Vacation',
  family_childcare: 'Childcare',
  family_dependent_support: 'Dependent Support',
  family_alimony_paid: 'Alimony Paid',
  family_child_support_paid: 'Child Support Paid',
  giving_charitable_cash: 'Charitable (Cash)',
  giving_charitable_non_cash: 'Charitable (Non-Cash)',
  giving_tithing: 'Tithing',
  giving_family_gifts: 'Family Gifts',
  giving_annual_gift_exclusion: 'Annual Gift Exclusion',
  professional_services: 'Professional Services',
  business_expenses: 'Business Expenses',
  taxes_property: 'Property Taxes',
  taxes_estimated_federal: 'Estimated Federal Tax',
  taxes_estimated_state: 'Estimated State Tax',
  taxes_other: 'Other Taxes',
  one_time_home_purchase: 'Home Purchase',
  one_time_home_renovation: 'Home Renovation',
  one_time_vehicle: 'Vehicle Purchase',
  one_time_wedding: 'Wedding',
  one_time_travel: 'Major Travel',
  one_time_other: 'One-Time (Other)',
  ltc_facility: 'LTC Facility',
  ltc_home_care: 'LTC Home Care',
  other: 'Other',
};

export const WEALTH_TIER_LABELS: Record<WealthTier, string> = {
  emerging: 'Emerging (<$500K)',
  mass_affluent: 'Mass Affluent ($500K–$2M)',
  hnw: 'HNW ($2M–$10M)',
  uhnw: 'UHNW ($10M+)',
};

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married Filing Jointly',
  mfs: 'Married Filing Separately',
  hoh: 'Head of Household',
  qw: 'Qualifying Widow(er)',
};

export const TRUST_TYPE_LABELS: Record<TrustType, string> = {
  revocable_living: 'Revocable Living Trust',
  ilit: 'Irrevocable Life Insurance Trust (ILIT)',
  slat: 'Spousal Lifetime Access Trust (SLAT)',
  grat: 'Grantor Retained Annuity Trust (GRAT)',
  qprt: 'Qualified Personal Residence Trust (QPRT)',
  crut: 'Charitable Remainder Unitrust (CRUT)',
  crat: 'Charitable Remainder Annuity Trust (CRAT)',
  clat: 'Charitable Lead Annuity Trust (CLAT)',
  clut: 'Charitable Lead Unitrust (CLUT)',
  dynasty: 'Dynasty Trust',
  special_needs: 'Special Needs Trust',
  spendthrift: 'Spendthrift Trust',
  qdot: 'Qualified Domestic Trust (QDOT)',
  marital_qtip: 'Marital QTIP Trust',
  credit_shelter: 'Credit Shelter (Bypass) Trust',
  standalone_retirement: 'Standalone Retirement Trust',
  blind: 'Blind Trust',
  foreign: 'Foreign Trust',
  other: 'Other',
};

export const ESTATE_DOC_TYPE_LABELS: Record<string, string> = {
  will: 'Last Will and Testament',
  revocable_trust: 'Revocable Living Trust',
  irrevocable_trust: 'Irrevocable Trust',
  pour_over_will: 'Pour-Over Will',
  durable_poa: 'Durable Power of Attorney (Financial)',
  healthcare_proxy: 'Healthcare Proxy / HCPOA',
  living_will: 'Living Will / Advance Directive',
  guardianship: 'Guardianship Designation',
  premarital_agreement: 'Premarital / Postnuptial Agreement',
  buy_sell_agreement: 'Buy-Sell Agreement',
  hipaa_authorization: 'HIPAA Authorization',
  partnership_agreement: 'Partnership / Operating Agreement',
};

export const EQUITY_GRANT_TYPE_LABELS: Record<EquityGrantType, string> = {
  rsu: 'Restricted Stock Units (RSU)',
  nqso: 'Non-Qualified Stock Options (NQSO)',
  iso: 'Incentive Stock Options (ISO)',
  espp: 'Employee Stock Purchase Plan (ESPP)',
};

export const BUSINESS_ENTITY_LABELS: Record<BusinessEntityType, string> = {
  sole_prop: 'Sole Proprietorship',
  s_corp: 'S Corporation',
  c_corp: 'C Corporation',
  llc_disregarded: 'LLC (Disregarded Entity)',
  llc_partnership: 'LLC (Partnership)',
  partnership: 'Partnership',
  lp: 'Limited Partnership',
  llp: 'Limited Liability Partnership',
};

export const LIFE_EVENT_LABELS: Record<LifeEventType, string> = {
  marriage: 'Got Married',
  new_child: 'Had a Child',
  job_change: 'Changed Jobs',
  home_purchase: 'Bought a Home',
  inheritance: 'Received an Inheritance',
  divorce: 'Divorce',
  death_in_family: 'Death in Family',
};

export const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
] as const;
