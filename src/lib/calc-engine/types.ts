import Decimal from 'decimal.js';

// ==================== TAX TYPES ====================

export interface TaxBracket {
  rate: number;
  minIncome: number;
  maxIncome: number | null;
}

export interface CapitalGainsBracket {
  rate: number;
  minIncome: number;
  maxIncome: number | null;
}

export interface StandardDeductions {
  single: number;
  mfj: number;
  mfs: number;
  hoh: number;
  qw: number;
  additional_single_65: number;
  additional_mfj_65: number;
  senior_bonus: number;
  senior_bonus_phaseout_single_start: number;
  senior_bonus_phaseout_single_end: number;
  senior_bonus_phaseout_mfj_start: number;
  senior_bonus_phaseout_mfj_end: number;
}

export interface NIITConfig {
  rate: number;
  threshold_single: number;
  threshold_mfj: number;
  threshold_mfs: number;
  threshold_hoh: number;
}

export interface IRMAAbracket {
  magiMin: number;
  magiMax: number | null;
  partBMonthly: number;
  partDMonthly: number;
}

export interface ContributionLimits {
  k401_traditional: number;
  k401_catchup_50: number;
  k401_catchup_60_63: number;
  ira_traditional: number;
  ira_catchup_50: number;
  hsa_self: number;
  hsa_family: number;
  hsa_catchup_55: number;
  simple_ira: number;
  simple_catchup: number;
  sep_ira_max: number;
  sep_pct_of_comp: number;
  annual_comp_limit: number;
  annual_gift_excl: number;
  roth_phaseout_single_start: number;
  roth_phaseout_single_end: number;
  roth_phaseout_mfj_start: number;
  roth_phaseout_mfj_end: number;
  trad_ira_active_single_start: number;
  trad_ira_active_single_end: number;
  trad_ira_active_mfj_start: number;
  trad_ira_active_mfj_end: number;
}

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qw';

// ==================== ALL TAX TABLES ====================

export interface AllTaxTables {
  ordinaryBrackets: Record<FilingStatus, TaxBracket[]>;
  capitalGainsBrackets: Record<string, CapitalGainsBracket[]>;
  standardDeductions: StandardDeductions;
  niit: NIITConfig;
  irmaa: IRMAAbracket[];
  rmdUniform: Record<number, number>;
  rmdJoint?: Record<string, number>;
  contributionLimits: ContributionLimits;
  ssWageBase: number;
  year: number;
}

// ==================== FEDERAL TAX ====================

export interface FederalTaxInput {
  ordinaryIncome: number;
  qualifiedDividends: number;
  longTermCapitalGains: number;
  shortTermCapitalGains: number;
  otherIncome: number;
  iraDistributions: number;
  rothDistributions: number;
  socialSecurityTaxable: number;
  adjustments: {
    studentLoanInterest: number;
    selfEmploymentDeduction: number;
    iraDeduction: number;
    hsaDeduction: number;
    alimonyPaid: number;
    otherAGIAdjustments: number;
  };
  deductions: {
    type: 'standard' | 'itemized';
    standardAmount: number;
    itemizedTotal: number;
    saltAmount: number;
    mortgageInterest: number;
    charitableCash: number;
    charitableNonCash: number;
    medicalExpenses: number;
    otherItemized: number;
  };
  credits: {
    childTaxCredit: number;
    childCareCredit: number;
    educationCredit: number;
    retirementSaverCredit: number;
    foreignTaxCredit: number;
    otherCredits: number;
  };
  filingStatus: FilingStatus;
  brackets: TaxBracket[];
  cgBrackets: CapitalGainsBracket[];
  year: number;
}

export interface BracketBreakdown {
  rate: number;
  incomeInBracket: number;
  taxInBracket: number;
}

export interface FederalTaxResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  deductionAmount: number;
  taxableIncome: number;
  ordinaryTaxableIncome: number;
  preferentialIncome: number;
  ordinaryTax: number;
  capitalGainsTax: number;
  niit: number;
  totalTaxBeforeCredits: number;
  totalCredits: number;
  federalIncomeTax: number;
  effectiveRate: number;
  marginalRate: number;
  nextBracketThreshold: number;
  nextBracketHeadroom: number;
  bracketBreakdown: BracketBreakdown[];
}

// ==================== SELF-EMPLOYMENT TAX ====================

export interface SEInput {
  netSelfEmploymentIncome: number;
  year: number;
  sswageBase: number;
  w2Wages?: number;
}

export interface SEResult {
  netEarnings: number;
  ssTaxable: number;
  medicareTaxable: number;
  ssTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalSETax: number;
  deductibleHalf: number;
}

// ==================== SS BENEFIT ====================

export interface SSBenefitInput {
  pia: number;
  fullRetirementAge: number;
  claimAge: number;
  colaRate: number;
  ssHaircut: number;
  wep: boolean;
  wepNoncoveredPension: number;
  gpo: boolean;
  gpoNoncoveredPension: number;
}

export interface SSBenefitResult {
  monthlyBenefitAtFRA: number;
  adjustmentFactor: number;
  monthlyBenefitAtClaimAge: number;
  annualBenefitAtClaimAge: number;
  wepReduction: number;
  gpoReduction: number;
  finalAnnualBenefit: number;
  breakEvenAgeVsAge62: number;
  breakEvenAgeVsFRA: number;
}

// ==================== SS TAXATION ====================

export interface SSTaxationInput {
  grossSocialSecurityBenefit: number;
  otherMAGIIncome: number;
  taxExemptInterest: number;
  filingStatus: FilingStatus;
}

export interface SSTaxationResult {
  provisionalIncome: number;
  taxableSS: number;
  taxableSSPct: number;
  thresholds: {
    lower: number;
    upper: number;
  };
}

// ==================== IRMAA ====================

export interface IRMAAInput {
  magiTwoYearsAgo: number;
  filingStatus: FilingStatus;
  age: number;
  brackets: IRMAAbracket[];
}

export interface IRMAAResult {
  applies: boolean;
  partBMonthlyPremium: number;
  partDMonthlySurcharge: number;
  annualIRMAASurcharge: number;
  basePremiumPartB: number;
  totalAnnualMedicarePremium: number;
  bracketApplied: number;
}

// ==================== RMD ====================

export interface RMDInput {
  accountBalance: number;
  ownerAge: number;
  accountType: string;
  isInherited: boolean;
  beneficiaryType?: string;
  beneficiaryAge?: number;
  isSpouseBeneficiary?: boolean;
  rmdTable: Record<number, number>;
  jointTable?: Record<string, number>;
  yearOfDeath?: number;
  secure2Act: boolean;
  birthYear?: number;
}

export interface RMDResult {
  rmdRequired: boolean;
  distributionPeriod: number;
  rmdAmount: number;
  rmdStartAge: number;
  method: string;
}

// ==================== ROTH CONVERSION ====================

export interface RothConversionInput {
  currentTaxableIncome: number;
  filingStatus: FilingStatus;
  brackets: TaxBracket[];
  cgBrackets: CapitalGainsBracket[];
  targetRate?: number;
  targetAmount?: number;
  rothAccountBalance: number;
  traditionalBalance: number;
  yearsToRetirement: number;
  expectedRetirementRate: number;
  assumedReturn: number;
  irmaaBrackets: IRMAAbracket[];
  irmaaLookbackMagi: number;
  clientAge: number;
  standardDeduction: number;
}

export interface RothConversionResult {
  recommendedConversionAmount: number;
  taxOnConversion: number;
  marginalRateOnConversion: number;
  irmaaImpact: number;
  ssTaxationIncrease: number;
  netTaxCostNow: number;
  projectedTaxSavingsLifetime: number;
  netBenefit: number;
  worthConverting: boolean;
  bracketHeadroom: Array<{
    rate: number;
    headroom: number;
    irmaaTrigger: boolean;
    irmaaThreshold: number;
  }>;
  conversionStrategy: string;
}

// ==================== STATE TAX ====================

export interface StateTaxInput {
  agi: number;
  state: string;
  filingStatus: FilingStatus;
  year: number;
  ssIncome: number;
  pensionIncome: number;
  retirementDistributions: number;
  age: number;
}

export interface StateTaxResult {
  stateAGI: number;
  stateDeduction: number;
  stateTaxableIncome: number;
  stateTax: number;
  effectiveRate: number;
  notes: string[];
}

export interface StateTaxConfig {
  type: 'none' | 'flat' | 'graduated';
  rate?: number;
  brackets?: TaxBracket[];
  ssExempt: boolean;
  pensionExempt: boolean | 'partial';
  retirementExempt: boolean | 'partial';
  personalExemption?: Record<string, number>;
  standardDeduction?: Record<string, number>;
  seniorExemption?: number;
}

// ==================== CASH FLOW ====================

export interface IncomeSourceData {
  id: string;
  type: string;
  annualAmount: number;
  growthRate?: number;
  startYear?: number;
  endYear?: number;
  inflationAdjusted?: boolean;
  ssClaimAge?: number;
  ssPia?: number;
  clientId?: string;
  ownerType?: string;
}

export interface ExpenseData {
  id: string;
  category: string;
  annualAmount: number;
  growthRate?: number;
  startYear?: number;
  endYear?: number;
  inflationAdjusted?: boolean;
  retirementPct?: number;
}

export interface AccountData {
  id: string;
  accountType: string;
  taxBucket: string;
  currentBalance: number;
  costBasis?: number;
  equityPct?: number;
  bondPct?: number;
  cashPct?: number;
  altPct?: number;
  contributionAmount?: number;
  contributionFrequency?: string;
  interestRate?: number;
  monthlyPayment?: number;
  remainingTerm?: number;
  maturityDate?: string;
}

export interface GoalData {
  id: string;
  type: string;
  name: string;
  targetAmount: number;
  targetYear: number;
  priority: string;
  inflationAdjusted?: boolean;
  fundingAccountIds?: string[];
  legacyAmount?: number;
}

export interface PlanAssumptions {
  inflationRate: number;
  equityReturn: number;
  bondReturn: number;
  cashReturn: number;
  altReturn: number;
  retirementSpendingPct: number;
  healthcareInflation: number;
  ssCola: number;
  monteCarloRuns: number;
  successThreshold: number;
  planningHorizonAge: number;
  equityStdDev?: number;
  bondStdDev?: number;
  altStdDev?: number;
  correlationEquityBond?: number;
}

export interface CashFlowInput {
  startYear: number;
  endYear: number;
  clientBirthYear: number;
  coBirthYear?: number;
  retirementYearClient: number;
  retirementYearCo?: number;
  incomeSources: IncomeSourceData[];
  expenses: ExpenseData[];
  accounts: AccountData[];
  goals: GoalData[];
  assumptions: PlanAssumptions;
  taxTables: AllTaxTables;
  filingStatus: FilingStatus;
  stateCode: string;
  clientAge65Year?: number;
}

export interface AnnualCashFlow {
  year: number;
  clientAge: number;
  coAge?: number;
  isRetired: boolean;
  salaryIncome: number;
  selfEmploymentIncome: number;
  pensionIncome: number;
  socialSecurityClientGross: number;
  socialSecurityCoGross: number;
  socialSecurityTaxable: number;
  rentalIncome: number;
  investmentIncome: number;
  qualifiedDividends: number;
  capitalGainsRealized: number;
  rmdIncome: number;
  rothDistributions: number;
  annuityIncome: number;
  trustIncome: number;
  businessDistributions: number;
  otherIncome: number;
  totalGrossIncome: number;
  agi: number;
  livingExpenses: number;
  healthcarePremiums: number;
  ltcExpenses: number;
  goalWithdrawals: number;
  debtPayments: number;
  totalExpenses: number;
  federalTax: number;
  stateTax: number;
  seTax: number;
  niit: number;
  totalTax: number;
  effectiveFedRate: number;
  netCashFlow: number;
  surplusDeficit: number;
  portfolioContributions: number;
  portfolioWithdrawals: number;
  portfolioGrowth: number;
  taxablePortfolio: number;
  taxDeferredPortfolio: number;
  taxFreePortfolio: number;
  totalInvestablePortfolio: number;
  realEstateValue: number;
  otherAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// ==================== MONTE CARLO ====================

export interface MonteCarloInput {
  runs: number;
  years: number;
  startYear: number;
  initialPortfolio: number;
  annualContributions: number[];
  annualWithdrawals: number[];
  assetAllocation: {
    equityPct: number;
    bondPct: number;
    cashPct: number;
    altPct: number;
  };
  returns: {
    equityMean: number;
    equityStdDev: number;
    bondMean: number;
    bondStdDev: number;
    cashMean: number;
    altMean: number;
    altStdDev: number;
    correlation_equity_bond: number;
  };
  inflationMean: number;
  inflationStdDev: number;
  successThreshold: number;
  legacyGoal?: number;
}

export interface PercentileBand {
  year: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface MonteCarloResult {
  probabilityOfSuccess: number;
  probabilityOfSuccess_adj: number;
  runs: number;
  medianTerminalValue: number;
  percentiles: {
    p5: number; p10: number; p25: number;
    p50: number; p75: number; p90: number; p95: number;
  };
  averageTerminalValue: number;
  worstCase: number;
  bestCase: number;
  annualPercentileBands: PercentileBand[];
  depletionYears: number[];
  averageDepletionYear: number | null;
}

// ==================== GOAL FUNDING ====================

export interface GoalFundingResult {
  goalId: string;
  goalName: string;
  goalType: string;
  targetAmount: number;
  targetYear: number;
  currentFunding: number;
  projectedFunding: number;
  fundedRatio: number;
  probabilityOfMeeting: number;
  status: 'on_track' | 'at_risk' | 'funded' | 'underfunded';
  shortfall: number;
  additionalMonthlySavingsNeeded: number;
}

// ==================== INSURANCE NEEDS ====================

export interface LifeInsuranceNeedsInput {
  annualIncome: number;
  yearsOfIncomeReplacement: number;
  outstandingDebts: number;
  mortgageBalance: number;
  futureCosts: number;
  existingLifeInsurance: number;
  existingAssets: number;
  finalExpenses: number;
  numberOfChildren: number;
  annualChildcareOrEducation: number;
  yearsOfChildExpenses: number;
}

export interface LifeInsuranceNeedsResult {
  totalNeed: number;
  incomeReplacementNeed: number;
  debtPayoffNeed: number;
  futureObligationsNeed: number;
  finalExpensesNeed: number;
  existingCoverage: number;
  gap: number;
  recommendation: string;
}

export interface DisabilityNeedsInput {
  annualIncome: number;
  existingDisabilityCoverage: number;
  monthlyExpenses: number;
  emergencyFund: number;
  targetReplacementRatio: number;
}

export interface DisabilityNeedsResult {
  monthlyIncomeNeed: number;
  existingMonthlyBenefit: number;
  gap: number;
  recommendation: string;
}

export interface LTCNeedsInput {
  currentAge: number;
  gender: string;
  state: string;
  desiredBenefitPeriod: number;
  inflationRate: number;
  existingLTCCoverage: number;
}

export interface LTCNeedsResult {
  estimatedAnnualCost: number;
  projectedCostAtNeed: number;
  totalBenefitNeeded: number;
  existingCoverage: number;
  gap: number;
  recommendation: string;
}

// ==================== PLAN RESULT ====================

export interface GoalResultItem {
  goalId: string;
  name: string;
  type: string;
  targetAmount: number;
  targetYear: number;
  fundedRatio: number;
  probability: number;
  status: string;
}

export interface AnnualDataPoint {
  year: number;
  amount: number;
}

export interface PlanResultData {
  planId: string;
  probabilityOfSuccess: number;
  mcRuns: number;
  mcMedianTerminalValue: number;
  mcPercentiles: {
    p5: number; p10: number; p25: number;
    p50: number; p75: number; p90: number; p95: number;
  };
  annualPercentileBands: PercentileBand[];
  annualIncome: AnnualDataPoint[];
  annualExpenses: AnnualDataPoint[];
  annualTaxes: AnnualDataPoint[];
  annualPortfolio: AnnualDataPoint[];
  annualNetWorth: AnnualDataPoint[];
  annualRmd: AnnualDataPoint[];
  annualCashFlow: AnnualDataPoint[];
  annualFederalTax: AnnualDataPoint[];
  annualStateTax: AnnualDataPoint[];
  annualEffectiveRate: AnnualDataPoint[];
  annualMarginalRate: AnnualDataPoint[];
  goalResults: GoalResultItem[];
  totalTaxesLifetime: number;
  avgEffectiveTaxRate: number;
  projectedEstateValue: number;
  rothConversionOpportunities: RothConversionResult[];
  cashFlows: AnnualCashFlow[];
}

// ==================== ESTATE PLANNING ====================

export interface EstateCalcInput {
  grossEstate: number;
  adjustedTaxableGifts: number;
  maritalDeduction: number;
  charitableDeduction: number;
  debts: number;
  expenses: number;
  stateEstateTaxApplicable: boolean;
  state: string;
  lifeInsuranceProceedsIncluded: boolean;
  year: number;
  exemptionAmount: number;
  topRate: number;
  portabilityElected: boolean;
  predeceasedSpouseUnusedExemption: number;
}

export interface EstateCalcResult {
  grossEstate: number;
  maritalDeduction: number;
  charitableDeduction: number;
  debtsAndExpenses: number;
  adjustedGrossEstate: number;
  adjustedTaxableGifts: number;
  tentativeTaxBase: number;
  tentativeTax: number;
  applicableCredit: number;
  giftTaxesPaid: number;
  netEstateTax: number;
  stateEstateTax: number;
  totalTransferTax: number;
  netToHeirs: number;
  effectiveRate: number;
}

export interface GRATResult {
  initialTransfer: number;
  annuityPayment: number;
  term: number;
  rate7520: number;
  annuityFactor: number;
  retainedInterest: number;
  remainderInterest: number;
  giftTaxableAmount: number;
  projectedEndValue: number;
  projectedTransferToRemaindermen: number;
  wealthTransferred: number;
  estateTaxSavings: number;
}

export interface CRTResult {
  fmv: number;
  payoutRate: number;
  termYears: number;
  rate7520: number;
  type: 'crut' | 'crat';
  annuityOrUnitrust: number;
  presentValueOfIncome: number;
  remainderInterest: number;
  charitableDeduction: number;
  deductionPct: number;
}

export interface CLATResult {
  annuityAmount: number;
  termYears: number;
  rate7520: number;
  presentValueOfAnnuity: number;
  giftTaxableRemainder: number;
  projectedEndValue: number;
  projectedRemainderToFamily: number;
  transferTaxSavings: number;
}

export interface EstateScenarioComparison {
  noPlanning: EstateCalcResult;
  maritalDeduction: EstateCalcResult;
  creditShelter: EstateCalcResult & { creditShelterAmount: number; maritalAmount: number };
  charitableTrust: EstateCalcResult & { charitableDeductionUsed: number };
  ilit: EstateCalcResult & { insuranceRemovedFromEstate: number };
  summary: {
    scenario: string;
    netToHeirs: number;
    totalTax: number;
    taxSavingsVsNoPlan: number;
  }[];
}

// ==================== BUSINESS VALUATION ====================

export interface BusinessValuationInput {
  grossRevenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerSalary: number;
  marketRateReplacement: number;
  personalExpensesInBusiness: number;
  businessDebt: number;
  ownershipPct: number;
  ebitdaMultiple: number;
  revenueMultiple: number;
  dcfProjections: number[];
  terminalGrowthRate: number;
  discountRate: number;
  weights: { income: number; market: number; dcf: number };
}

export interface BusinessValuationResult {
  rawEBITDA: number;
  normalizedEBITDA: number;
  incomeApproachValue: number;
  marketApproachValue: number;
  dcfValue: number;
  blendedEnterpriseValue: number;
  equityValue100: number;
  clientEquityInterest: number;
}

export interface BusinessSaleInput {
  grossSalePrice: number;
  ownershipPct: number;
  entityType: string;
  basis: number;
  saleYear: number;
  otherIncomeInSaleYear: number;
  filingStatus: string;
  saleStructure: 'asset_sale' | 'stock_sale';
  stateCapGainsRate: number;
  transactionCostPct: number;
  debtPayoff: number;
  installmentElected: boolean;
  installmentTermYears: number;
  installmentRate: number;
}

export interface BusinessSaleResult {
  grossProceeds: number;
  basis: number;
  totalGain: number;
  federalCGTax: number;
  niitOnSale: number;
  stateTax: number;
  transactionCosts: number;
  debtPayoff: number;
  netProceeds: number;
  effectiveTaxRate: number;
  installmentSchedule?: Array<{
    year: number;
    payment: number;
    principalPortion: number;
    interestPortion: number;
    gainRecognized: number;
    taxDue: number;
  }>;
}

// ==================== EQUITY COMPENSATION ====================

export interface RSUVestTaxResult {
  sharesVesting: number;
  fmvPerShare: number;
  ordinaryIncome: number;
  federalWithholding: number;
  ficaWithholding: number;
  stateWithholding: number;
  netSharesDelivered: number;
  netCashValue: number;
}

export interface NQSOExerciseResult {
  sharesExercised: number;
  exercisePrice: number;
  currentFMV: number;
  spreadPerShare: number;
  grossOrdinaryIncome: number;
  federalTax: number;
  ficaTax: number;
  stateTax: number;
  netAfterTax: number;
}

export interface ISOExerciseResult {
  sharesExercised: number;
  exercisePrice: number;
  currentFMV: number;
  spreadPerShare: number;
  amtPreferenceItem: number;
  estimatedAMT: number;
  qualifyingDispositionDate: Date;
  qualifyingTreatment: { totalGain: number; allLTCG: boolean; tax: number };
  disqualifyingTreatment: { ordinaryPortion: number; ltcgPortion: number; tax: number };
}

export interface ESPPTaxResult {
  purchasePrice: number;
  fmvAtPurchase: number;
  fmvAtSale: number;
  sharesAcquired: number;
  totalCost: number;
  qualifyingDisposition: {
    ordinaryIncome: number;
    ltcg: number;
    totalTax: number;
  };
  disqualifyingDisposition: {
    ordinaryIncome: number;
    stcgOrLtcg: number;
    totalTax: number;
  };
}

export interface ConcentratedPositionAnalysis {
  currentValue: number;
  pctOfPortfolio: number;
  unrealizedGain: number;
  if50Drop: number;
  if75Drop: number;
  outrightSaleTax: number;
  outrightSaleNetProceeds: number;
}

// ==================== CHARITABLE PLANNING ====================

export interface DAFFundingComparison {
  cashGiftDeduction: number;
  cashGiftNetCost: number;
  stockGiftDeduction: number;
  stockGiftCGTaxAvoided: number;
  stockGiftNetCost: number;
  taxSavingsOfStock: number;
}

export interface BunchingResult {
  annualCharitableBudget: number;
  standardDeduction: number;
  optimalBunchingInterval: number;
  annualTaxSavings: number;
  bunchedDeduction: number;
  withoutBunchingAnnualBenefit: number;
  withBunchingAnnualBenefit: number;
}

export interface QCDComparison {
  amount: number;
  cashGift: { agiImpact: number; ssTaxImpact: number; irmaaImpact: number; netTaxCost: number };
  qcd: { agiReduction: number; ssTaxSavings: number; irmaaSavings: number; netTaxCost: number };
  netSavingsOfQCD: number;
}
