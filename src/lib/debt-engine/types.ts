/**
 * Farther Intelligent Debt Analysis Engine (FP-DebtIQ) -- Canonical Data Model
 *
 * This file defines every core type used across the debt analysis engine.
 * FP-DebtIQ provides comprehensive debt analysis covering mortgages, student
 * loans, credit cards, securities-backed lending, auto loans, business debt,
 * and the proprietary Farther Debt Score.
 *
 * All monetary values are plain numbers in dollars (not cents) at the debt
 * engine level.  The tax-planning and calc-engine modules use branded
 * MoneyCents internally; conversion happens at boundaries.
 *
 * All rates are decimals (e.g. 0.065 = 6.5%).
 * All IDs are UUID v4 strings.
 * All dates are ISO 8601 strings unless typed as Date.
 *
 * @module debt-engine/types
 */

// =====================================================================
// Enums / Union Types
// =====================================================================

/** Broad category of a debt instrument. */
export type DebtCategory =
  | 'MORTGAGE'
  | 'HELOC'
  | 'STUDENT_LOAN'
  | 'AUTO_LOAN'
  | 'CREDIT_CARD'
  | 'PERSONAL_LOAN'
  | 'SBLOC'
  | 'MARGIN_LOAN'
  | 'BUSINESS_LOAN'
  | 'OTHER';

/** Rate type for a debt instrument. */
export type RateType = 'FIXED' | 'VARIABLE' | 'HYBRID';

/** How interest is computed. */
export type InterestMethod = 'SIMPLE' | 'COMPOUND' | 'AMORTIZING';

/** Deductibility classification for after-tax cost analysis. */
export type DeductibilityType = 'FULL' | 'ITEMIZED_ONLY' | 'PHASE_OUT' | 'NONE';

/** Federal student loan repayment plan. */
export type FederalRepaymentPlan =
  | 'STANDARD_10YR'
  | 'EXTENDED_25YR'
  | 'GRADUATED'
  | 'IBR_NEW'
  | 'IBR_OLD'
  | 'PAYE'
  | 'SAVE'
  | 'ICR';

/** Federal student loan type. */
export type FederalLoanType =
  | 'DIRECT_SUBSIDIZED'
  | 'DIRECT_UNSUBSIDIZED'
  | 'GRAD_PLUS'
  | 'PARENT_PLUS'
  | 'FFEL'
  | 'PERKINS';

/** Employer type for PSLF eligibility. */
export type EmployerType =
  | 'FOR_PROFIT'
  | 'NONPROFIT_501C3'
  | 'GOVERNMENT'
  | 'TRIBAL'
  | 'SELF_EMPLOYED';

/** Multi-debt payoff strategy. */
export type PayoffStrategy =
  | 'AVALANCHE'
  | 'SNOWBALL'
  | 'HYBRID'
  | 'HIGHEST_PAYMENT'
  | 'SHORTEST_TERM'
  | 'TAX_OPTIMIZED'
  | 'CREDIT_SCORE'
  | 'NET_WORTH_MAX';

/** SBLOC LTV risk rating. */
export type LTVRating = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

/** Business entity type. */
export type BusinessType = 'SOLE_PROP' | 'S_CORP' | 'C_CORP' | 'LLC' | 'PARTNERSHIP';

/** Business debt type. */
export type BusinessDebtType =
  | 'SBA_LOAN'
  | 'COMMERCIAL_REAL_ESTATE'
  | 'EQUIPMENT'
  | 'LINE_OF_CREDIT'
  | 'SELLER_NOTE'
  | 'PARTNER_LOAN';

/** Home equity access method. */
export type HomeEquityOption = 'HELOC' | 'HOME_EQUITY_LOAN' | 'CASH_OUT_REFI';

/** Purpose for accessing home equity. */
export type EquityPurpose =
  | 'HOME_IMPROVEMENT'
  | 'DEBT_CONSOLIDATION'
  | 'INVESTMENT'
  | 'EDUCATION'
  | 'EMERGENCY'
  | 'BUSINESS';

/** Consolidation option type. */
export type ConsolidationType =
  | 'PERSONAL_LOAN'
  | 'HELOC'
  | 'CASH_OUT_REFI'
  | 'SBLOC'
  | '401K_LOAN';

/** Recommendation strength. */
export type RecommendationLevel =
  | 'STRONGLY_RECOMMEND'
  | 'CONSIDER'
  | 'CAUTION'
  | 'AVOID';

/** DTI health rating. */
export type DTIRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'CONCERNING' | 'CRITICAL';

/** Risk level. */
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/** Debt Score label (mirrors FICO familiarity). */
export type DebtScoreLabel =
  | 'DEBT_FREE'
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'CONCERNING'
  | 'CRITICAL';

/** Opportunity urgency. */
export type OpportunityUrgency = 'IMMEDIATE' | '6_MONTHS' | '1_YEAR' | 'PLANNING_HORIZON';

/** Opportunity complexity. */
export type OpportunityComplexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

/** Filing status for tax calculations. */
export type FilingStatus = 'SINGLE' | 'MFJ' | 'MFS' | 'HOH' | 'QW';

// =====================================================================
// Core Entity Types
// =====================================================================

/**
 * A single debt instrument in a household's liability profile.
 * This is the atomic unit of the debt engine.
 */
export interface HouseholdDebt {
  id: string;
  householdId: string;
  category: DebtCategory;
  name: string;
  lender: string;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  rateType: RateType;
  monthlyPayment: number;
  minimumPayment: number;
  remainingTermMonths: number;
  originationDate: string;
  maturityDate?: string;
  isDeductible: boolean;
  deductibilityType: DeductibilityType;
  collateral?: string;
  hasPrePaymentPenalty: boolean;
  prePaymentPenaltyDetail?: string;
  isPersonallyGuaranteed?: boolean;
  accountNumber?: string;
  notes?: string;
}

/**
 * Tax profile for a household — used for after-tax cost calculations.
 */
export interface HouseholdTaxProfile {
  filingStatus: FilingStatus;
  federalMarginalRate: number;
  stateMarginalRate: number;
  effectiveFederalRate: number;
  effectiveStateRate: number;
  agi: number;
  taxableIncome: number;
  itemizingDeductions: boolean;
  standardDeduction: number;
  totalItemizedDeductions: number;
  niitApplies: boolean;
  niitRate: number;
  state: string;
}

/**
 * Household income data for DTI and cash flow calculations.
 */
export interface HouseholdIncome {
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  annualGrossIncome: number;
  sources: Array<{
    type: string;
    annualAmount: number;
    isStable: boolean;
  }>;
}

/**
 * Household balance sheet data for leverage and solvency calculations.
 */
export interface HouseholdBalanceSheet {
  totalAssets: number;
  liquidAssets: number;
  investmentAssets: number;
  realEstateValue: number;
  retirementAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// =====================================================================
// Amortization Types
// =====================================================================

export interface AmortizationInput {
  principal: number;
  annualRate: number;
  termMonths: number;
  extraPayment: number;
  startDate: Date;
}

export interface AmortizationRow {
  paymentNumber: number;
  paymentDate: Date;
  payment: number;
  principal: number;
  interest: number;
  extraPayment: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface AmortizationResult {
  schedule: AmortizationRow[];
  payoffDate: Date;
  totalInterest: number;
  totalPaid: number;
  monthsSaved: number;
  interestSaved: number;
}

// =====================================================================
// True APR Types
// =====================================================================

export interface TrueAPRInput {
  loanAmount: number;
  statedRate: number;
  termMonths: number;
  originationFee: number;
  discountPoints: number;
  pmiMonthly: number;
  pmiMonthsRemaining: number;
  otherFees: number;
}

export interface TrueAPRResult {
  trueAPR: number;
  nominalRate: number;
  rateDifference: number;
  totalFees: number;
  feeAsMonthlyRate: number;
  breakEvenMonths: number;
}

// =====================================================================
// After-Tax Cost of Debt Types
// =====================================================================

export interface AfterTaxCostInput {
  nominalRate: number;
  isInterestDeductible: boolean;
  deductibilityType: DeductibilityType;
  federalMarginalRate: number;
  stateMarginalRate: number;
  niitApplies: boolean;
  itemizingDeductions: boolean;
  loanBalance: number;
  mortgageDebtLimit: number;
}

export interface AfterTaxCostResult {
  afterTaxRate: number;
  taxBenefit: number;
  taxBenefitPV: number;
  effectiveCost: string;
  deductibilityNote: string;
}

// =====================================================================
// DTI / Debt Metrics Types
// =====================================================================

export interface DebtMetricsResult {
  frontEndDTI: number;
  backEndDTI: number;
  dtiRating: DTIRating;
  debtToNetWorth: number;
  debtToAssets: number;
  liquidityRatio: number;
  monthsCovered: number;
  additionalDebtCapacity: number;
  mortgageQualifyingAmount: number;
}

// =====================================================================
// Multi-Debt Payoff Optimizer Types
// =====================================================================

export interface PayoffSequenceItem {
  debtId: string;
  debtName: string;
  payoffMonth: number;
  payoffDate: Date;
  totalInterestPaid: number;
  payoffPayment: number;
  rolloverAmount: number;
}

export interface PayoffPlanSummary {
  totalDebtFreeDate: Date;
  totalInterestPaid: number;
  totalInterestSaved: number;
  monthsSavedVsMinimum: number;
  netWorthAt10Years: number;
}

export interface PayoffPlan {
  strategy: PayoffStrategy;
  monthlyExtraPayment: number;
  debtPayoffSequence: PayoffSequenceItem[];
  summary: PayoffPlanSummary;
}

export interface PayoffOptimizerResult {
  strategies: Partial<Record<PayoffStrategy, PayoffPlan>>;
  recommendation: PayoffStrategy;
  recommendationReason: string;
  winnerByMetric: {
    lowestTotalInterest: PayoffStrategy;
    fastestDebtFree: PayoffStrategy;
    highestNetWorth: PayoffStrategy;
    bestCashFlow: PayoffStrategy;
  };
}

// =====================================================================
// Mortgage Refinance Types
// =====================================================================

export interface RefinanceCurrentLoan {
  balance: number;
  rate: number;
  remainingTermMonths: number;
  monthlyPayment: number;
}

export interface RefinanceProposedLoan {
  label: string;
  newRate: number;
  newTermMonths: number;
  closingCosts: number;
  discountPoints: number;
  lenderCredit: number;
}

export interface RefinanceScenarioResult {
  scenario: string;
  newMonthlyPayment: number;
  monthlyChange: number;
  breakEvenMonths: number;
  breakEvenDate: Date;
  willBreakEven: boolean;
  totalInterestCurrent: number;
  totalInterestNew: number;
  totalInterestSavings: number;
  netSavingsAfterCosts: number;
  afterTaxCurrentRate: number;
  afterTaxNewRate: number;
  afterTaxMonthlySavings: number;
  afterTaxNPV: number;
  recommendRefinance: boolean;
  recommendation: string;
}

// =====================================================================
// Home Equity Types
// =====================================================================

export interface HomeEquityInput {
  homeValue: number;
  mortgageBalance: number;
  currentRate: number;
  creditScore: number;
  purpose: EquityPurpose;
  amountNeeded: number;
  taxProfile: HouseholdTaxProfile;
}

export interface HELOCOption {
  estimatedRate: number;
  maxLine: number;
  drawPeriodYears: number;
  repaymentPeriodYears: number;
  interestDeductible: boolean;
  monthlyInterestOnly: number;
  fullyAmortized: number;
}

export interface HomeEquityLoanOption {
  estimatedRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  interestDeductible: boolean;
}

export interface CashOutRefiOption {
  estimatedRate: number;
  newLoanAmount: number;
  newMonthlyPayment: number;
  closingCosts: number;
  breakEvenMonths: number;
  totalInterest: number;
}

export interface HomeEquityResult {
  currentEquity: number;
  currentLTV: number;
  maxBorrowable: number;
  options: {
    heloc: HELOCOption;
    homeEquityLoan: HomeEquityLoanOption;
    cashOutRefi: CashOutRefiOption;
  };
  recommendation: string;
  taxNote: string;
  opportunityCost: {
    ifInvestedInstead: number;
    portfolioReturn: number;
    netAdvantage: string;
  };
}

// =====================================================================
// Mortgage vs. Invest Types
// =====================================================================

export interface MortgageVsInvestInput {
  mortgageBalance: number;
  mortgageRate: number;
  remainingTermMonths: number;
  monthlyExtraCapacity: number;
  investmentReturn: number;
  taxProfile: HouseholdTaxProfile;
  timeHorizon: number;
  riskTolerance: number;
}

export interface MortgageVsInvestResult {
  pathA_MortgageFree: {
    mortgagePayoffDate: Date;
    monthsSaved: number;
    interestSaved: number;
    afterTaxInterestSaved: number;
    investmentAfterPayoff: number;
    netWorthAt: Record<number, number>;
  };
  pathB_Invest: {
    investmentValue: Record<number, number>;
    portfolioAtHorizon: number;
    afterTaxGains: number;
    netWorthAt: Record<number, number>;
  };
  netWorthDifference: Record<number, number>;
  crossoverYear: number | null;
  recommendation: 'PAY_MORTGAGE' | 'INVEST' | 'SPLIT';
  confidenceLevel: 'STRONG' | 'MODERATE' | 'CLOSE_CALL';
  sensitivityToReturn: Array<{
    investmentReturn: number;
    recommendation: 'PAY_MORTGAGE' | 'INVEST';
    npvDifference: number;
  }>;
  breakEvenInvestmentReturn: number;
  narrative: string;
}

// =====================================================================
// PMI Elimination Types
// =====================================================================

export interface PMIInput {
  homeValue: number;
  currentBalance: number;
  monthlyPMI: number;
  pmiRate: number;
  monthlyPayment: number;
  lumpSumAvailable: number;
}

export interface PMIResult {
  currentLTV: number;
  targetLTVForRemoval: number;
  principalNeeded: number;
  monthsToAutomaticRemoval: number;
  lumpSumStrategy: {
    lumpSumNeeded: number;
    monthsSaved: number;
    pmiSaved: number;
    roiOnLumpSum: number;
  };
  extraPaymentStrategy: {
    extraMonthlyNeeded: number;
    breakEvenMonths: number;
    pmiSavings: number;
  };
  recommendation: string;
  appealAppraisal: boolean;
}

// =====================================================================
// Student Loan Types
// =====================================================================

export interface StudentLoan {
  id: string;
  type: FederalLoanType;
  balance: number;
  interestRate: number;
  disbursementDate: string;
  isConsolidated: boolean;
}

export interface StudentLoanProfile {
  loans: StudentLoan[];
  agi: number;
  agiGrowthRate: number;
  familySize: number;
  stateOfResidence: string;
  filingStatus: FilingStatus;
  employerType: EmployerType;
  isPSLFEligible: boolean;
  pslfQualifyingPaymentsMade: number;
  expectedAgiChanges: Array<{ year: number; agi: number }>;
  planningToMarry: boolean;
  spouseAgi: number | null;
  expectedFamilySizeChanges: Array<{ year: number; size: number }>;
}

export interface RepaymentPlanResult {
  monthlyPayments: number[];
  totalPaid: number;
  totalInterestPaid: number;
  forgiveness: number;
  forgivenessYear: number;
  taxOnForgiveness: number;
  netCost: number;
  npv: number;
  monthlyPaymentNow: number;
  payoffDate: Date;
}

export interface PSLFAnalysis {
  isEligible: boolean;
  qualifyingPaymentsMade: number;
  paymentsRemaining: number;
  projectedForgiveness: number;
  taxFreeForgivenessValue: number;
  totalPaidUnderPSLF: number;
  vsPrivateRefinance: {
    privatePayoff: number;
    pslfNetCost: number;
    pslfAdvantage: number;
  };
  shouldPursueOptimalIDR: FederalRepaymentPlan;
}

export interface StudentLoanOptimizerResult {
  plans: Partial<Record<FederalRepaymentPlan, RepaymentPlanResult>>;
  pslfAnalysis: PSLFAnalysis;
  privateRefinanceAnalysis: {
    estimatedPrivateRate: number;
    totalPaidIfRefinanced: number;
    monthlyPayment: number;
    vsStandardPlan: {
      savings: number;
      recommendation: 'REFINANCE' | 'STAY_FEDERAL';
      caution: string;
    };
  };
  recommendation: FederalRepaymentPlan;
  recommendationReason: string;
  topInsights: string[];
  savePlanRiskScenario: {
    currentPlanPayment: number;
    worstCasePlanPayment: number;
    difference: number;
    contingencyPlan: FederalRepaymentPlan;
  };
}

export interface StudentLoanTaxResult {
  strategies: Array<{
    strategy: string;
    agiReduction: number;
    annualPaymentSavings: number;
    taxSavings: number;
    combinedAnnualBenefit: number;
    recommendation: string;
  }>;
  marriagePenalty: {
    payingJointly: number;
    payingSeparately: number;
    annualPenalty: number;
    shouldFileSeparately: boolean;
    taxCostOfFilingSeparately: number;
    netAdvantage: number;
  };
  interestDeduction: {
    paidThisYear: number;
    deductibleAmount: number;
    taxSavings: number;
    isPhaseOut: boolean;
    phaseOutReduction: number;
  };
}

// =====================================================================
// Credit Card Types
// =====================================================================

export interface CreditCard {
  id: string;
  issuer: string;
  balance: number;
  apr: number;
  creditLimit: number;
  minimumPayment: number;
  promoPeriod: {
    isPromo: boolean;
    promoRate: number;
    promoEndDate: string | null;
    postPromoRate: number;
  } | null;
}

export interface BalanceTransferOffer {
  offerLabel: string;
  promoRate: number;
  promoPeriodMonths: number;
  postPromoRate: number;
  transferFee: number;
  creditLimit: number;
}

export interface BalanceTransferOpportunity {
  fromCard: string;
  toOffer: string;
  amountToTransfer: number;
  transferFee: number;
  interestSaved: number;
  netSavings: number;
  breakEvenMonths: number;
  recommendation: 'DO_IT' | 'MARGINAL' | 'SKIP';
  caution: string;
}

export interface UtilizationAnalysis {
  currentTotal: number;
  currentPerCard: Record<string, number>;
  targetUtilization: number;
  paydownToImprove: {
    to30pct: number;
    to10pct: number;
    estimatedScoreLift: {
      to30pct: number;
      to10pct: number;
    };
  };
}

export interface CreditCardOptimizerResult {
  strategies: Partial<Record<string, PayoffPlan>>;
  balanceTransferOpportunities: BalanceTransferOpportunity[];
  utilizationAnalysis: UtilizationAnalysis;
  minimumPaymentPath: {
    payoffMonths: number;
    totalInterest: number;
    trueAPREffect: string;
  };
  recommendation: string;
}

// =====================================================================
// Debt Consolidation Types
// =====================================================================

export interface ConsolidationOption {
  type: ConsolidationType;
  rate: number;
  termMonths: number;
  originationFee: number;
  maxAmount: number;
}

export interface ConsolidationScenario {
  option: string;
  newRate: number;
  newMonthlyPayment: number;
  monthlyRelief: number;
  totalInterestNew: number;
  totalInterestSaved: number;
  consolidationFee: number;
  netSavings: number;
  breakEvenMonths: number;
  risks: string[];
  taxImplications: string;
  recommendation: RecommendationLevel;
}

export interface ConsolidationResult {
  currentState: {
    totalBalance: number;
    weightedAvgAPR: number;
    totalMonthlyPayment: number;
    totalInterestRemaining: number;
  };
  consolidationScenarios: ConsolidationScenario[];
  bestOption: string;
  bestOptionReason: string;
}

// =====================================================================
// Securities-Backed Lending Types
// =====================================================================

export interface SBLOCInput {
  portfolio: {
    totalValue: number;
    eligibleCollateral: number;
  };
  proposedLoan: {
    amount: number;
    purpose: string;
    rate: number;
    termMonths: number;
    interestOnly: boolean;
  };
  taxProfile: HouseholdTaxProfile;
  alternativeFunding: {
    liquidateCostBasis: number;
    liquidateGain: number;
    mortgageRate: number;
    cashAvailable: number;
  };
}

export interface MarginCallAnalysis {
  marginCallThreshold: number;
  bufferAmount: number;
  portfolioDropToCall: number;
  probabilityOfCall: {
    next6Months: number;
    next12Months: number;
    nextBearMarket: number;
  };
  maintenanceCallAmount: number;
  remedyOptions: string[];
}

export interface SBLOCResult {
  maxBorrowingPower: number;
  loanToValue: number;
  ltvRating: LTVRating;
  marginCallAnalysis: MarginCallAnalysis;
  costAnalysis: {
    annualInterestCost: number;
    afterTaxInterestCost: number;
    vsLiquidatingPortfolio: {
      capitalGainsTaxAvoided: number;
      portfolioGrowthLost: number;
      netAdvantageOfSBLOC: number;
    };
    vsMortgage: {
      mortgageInterest: number;
      sblocInterest: number;
      netDifference: number;
      speedAdvantage: string;
    };
  };
  recommendation: string;
  riskWarnings: string[];
  taxStrategy: string;
  rateStressTest: Array<{
    rateScenario: string;
    newMonthlyPayment: number;
    annualCostIncrease: number;
    recommendation: string;
  }>;
}

// =====================================================================
// Margin Loan Types
// =====================================================================

export interface MarginLoanInput {
  portfolioValue: number;
  marginableValue: number;
  proposedBorrow: number;
  marginRate: number;
  holdingPeriod: 'DAYS' | 'WEEKS' | 'MONTHS';
  portfolioVolatility: number;
}

export interface MarginLoanResult {
  initialMarginRequired: number;
  maintenanceMarginLevel: number;
  currentEquity: number;
  bufferToMarginCall: number;
  portfolioDropToCall: number;
  dailyVaR: number;
  marginCallProbability: number;
  annualInterestCost: number;
  recommendation: string;
  redFlags: string[];
}

// =====================================================================
// Auto Loan Types
// =====================================================================

export interface AutoLoanInput {
  vehicleValue: number;
  loanBalance: number;
  interestRate: number;
  remainingMonths: number;
  monthlyPayment: number;
  lumpSumAvailable: number;
  investmentReturn: number;
  leaseOption?: {
    monthlyLease: number;
    leaseTerm: number;
    residualValue: number;
    acquisitionFee: number;
    moneyFactor: number;
    allowedMileage: number;
    mileageOverageFee: number;
  };
}

export interface AutoLoanResult {
  currentStatus: {
    equity: number;
    ltv: number;
    isUnderwaterFlag: boolean;
    totalInterestRemaining: number;
    effectiveAPR: number;
  };
  payoffAnalysis: {
    totalInterestSavedByPayoff: number;
    opportunityCostOfPayoff: number;
    netAdvantage: number;
    recommendation: 'PAY_OFF' | 'INVEST_INSTEAD' | 'NEUTRAL';
  };
  leaseVsBuyAnalysis?: {
    totalLeaseOutflow: number;
    totalBuyOutflow: number;
    vehicleValueRetained: number;
    netLeaseCost: number;
    netBuyCost: number;
    moneyFactorAsAPR: number;
    recommendation: 'LEASE' | 'BUY' | 'DEPENDS';
    taxNote: string;
  };
}

// =====================================================================
// Business Debt Types
// =====================================================================

export interface BusinessDebt {
  type: BusinessDebtType;
  balance: number;
  rate: number;
  termMonths: number;
  isPersonallyGuaranteed: boolean;
  collateral: string;
  taxDeductible: boolean;
  section163jApplies: boolean;
}

export interface BusinessDebtInput {
  businessType: BusinessType;
  businessDebts: BusinessDebt[];
  businessIncome: number;
  ebitda: number;
  personalGuaranteesTotal: number;
  taxProfile: HouseholdTaxProfile;
  netWorth: number;
}

export interface BusinessDebtResult {
  businessLeverageMetrics: {
    debtToEBITDA: number;
    debtServiceCoverage: number;
    totalDebtToRevenue: number;
  };
  personalExposure: {
    personallyGuaranteed: number;
    percentOfNetWorth: number;
    riskRating: RiskLevel;
  };
  taxDeductibility: {
    section163jLimit: number;
    deductibleThisYear: number;
    disallowedCarryforward: number;
    taxSavings: number;
  };
  recommendations: string[];
}

// =====================================================================
// Farther Debt Score Types
// =====================================================================

export interface DebtScoreDimensions {
  leverage: number;
  cost: number;
  structure: number;
  risk: number;
  trajectory: number;
}

export interface DebtOpportunity {
  type: string;
  annualSavings: number;
  complexity: OpportunityComplexity;
  urgency: OpportunityUrgency;
  action: string;
}

export interface FartherDebtScore {
  score: number;
  label: DebtScoreLabel;
  dimensions: DebtScoreDimensions;
  scoreChange: number;
  keyDrivers: string[];
  topOpportunities: DebtOpportunity[];
  calculatedAt: Date;
}

// =====================================================================
// Debt Score Calculation Input
// =====================================================================

export interface DebtScoreInput {
  debts: HouseholdDebt[];
  taxProfile: HouseholdTaxProfile;
  income: HouseholdIncome;
  balanceSheet: HouseholdBalanceSheet;
  previousScore?: number;
  previousDebts?: HouseholdDebt[];
  investmentReturn?: number;
}
