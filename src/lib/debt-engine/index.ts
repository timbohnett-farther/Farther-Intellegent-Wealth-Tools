// =============================================================================
// Farther Intelligent Debt Analysis Engine (FP-DebtIQ) — Public API
// =============================================================================

// Types
export type {
  // Enums / Unions
  DebtCategory,
  RateType,
  InterestMethod,
  DeductibilityType,
  FederalRepaymentPlan,
  FederalLoanType,
  EmployerType,
  PayoffStrategy,
  LTVRating,
  BusinessType,
  BusinessDebtType,
  HomeEquityOption,
  EquityPurpose,
  ConsolidationType,
  RecommendationLevel,
  DTIRating,
  RiskLevel,
  DebtScoreLabel,
  OpportunityUrgency,
  OpportunityComplexity,
  FilingStatus,

  // Core entities
  HouseholdDebt,
  HouseholdTaxProfile,
  HouseholdIncome,
  HouseholdBalanceSheet,

  // Amortization
  AmortizationInput,
  AmortizationRow,
  AmortizationResult,

  // True APR
  TrueAPRInput,
  TrueAPRResult,

  // After-tax cost
  AfterTaxCostInput,
  AfterTaxCostResult,

  // DTI / Metrics
  DebtMetricsResult,

  // Payoff optimizer
  PayoffSequenceItem,
  PayoffPlanSummary,
  PayoffPlan,
  PayoffOptimizerResult,

  // Mortgage refinance
  RefinanceCurrentLoan,
  RefinanceProposedLoan,
  RefinanceScenarioResult,

  // Home equity
  HomeEquityInput,
  HELOCOption,
  HomeEquityLoanOption,
  CashOutRefiOption,
  HomeEquityResult,

  // Mortgage vs invest
  MortgageVsInvestInput,
  MortgageVsInvestResult,

  // PMI
  PMIInput,
  PMIResult,

  // Student loans
  StudentLoan,
  StudentLoanProfile,
  RepaymentPlanResult,
  PSLFAnalysis,
  StudentLoanOptimizerResult,
  StudentLoanTaxResult,

  // Credit cards
  CreditCard,
  BalanceTransferOffer,
  BalanceTransferOpportunity,
  UtilizationAnalysis,
  CreditCardOptimizerResult,

  // Consolidation
  ConsolidationOption,
  ConsolidationScenario,
  ConsolidationResult,

  // Securities-backed lending
  SBLOCInput,
  MarginCallAnalysis,
  SBLOCResult,
  MarginLoanInput,
  MarginLoanResult,

  // Auto loan
  AutoLoanInput,
  AutoLoanResult,

  // Business debt
  BusinessDebt,
  BusinessDebtInput,
  BusinessDebtResult,

  // Farther Debt Score
  DebtScoreDimensions,
  DebtOpportunity,
  FartherDebtScore,
  DebtScoreInput,
} from './types';

// Category 1: Universal debt calculations
export {
  generateAmortizationSchedule,
  calculateTrueAPR,
  calculateAfterTaxCostOfDebt,
  calculateDebtMetrics,
  optimizeDebtPayoff,
} from './universal/calculations';

// Category 2: Mortgage calculations
export {
  analyzeMortgageRefinance,
  analyzeHomeEquity,
  analyzeMortgageVsInvest,
  analyzePMIElimination,
} from './mortgage/calculations';

// Category 3: Student loan calculations
export {
  optimizeStudentLoanRepayment,
  optimizeStudentLoanTax,
} from './student-loan/calculations';

// Category 4: Credit card & consumer debt
export {
  optimizeCreditCardDebt,
  analyzeDebtConsolidation,
} from './credit-card/calculations';

// Category 5: Securities-backed lending
export {
  analyzeSecuritiesBackedLending,
  analyzeMarginLoan,
} from './securities-lending/calculations';

// Category 6: Auto loan
export { analyzeAutoLoan } from './auto-loan/calculations';

// Categories 7-8: Business debt & Farther Debt Score
export {
  analyzeBusinessDebt,
  calculateFartherDebtScore,
} from './debt-score/calculations';
