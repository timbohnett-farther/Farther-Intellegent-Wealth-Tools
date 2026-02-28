// ==================== CALC ENGINE PUBLIC API ====================
// Stage 2 — Farther Prism Financial Planning Calculation Engine

// Types
export type {
  TaxBracket,
  CapitalGainsBracket,
  StandardDeductions,
  NIITConfig,
  IRMAAbracket,
  ContributionLimits,
  FilingStatus,
  AllTaxTables,
  FederalTaxInput,
  FederalTaxResult,
  BracketBreakdown,
  SEInput,
  SEResult,
  SSBenefitInput,
  SSBenefitResult,
  SSTaxationInput,
  SSTaxationResult,
  IRMAAInput,
  IRMAAResult,
  RMDInput,
  RMDResult,
  RothConversionInput,
  RothConversionResult,
  StateTaxInput,
  StateTaxResult,
  CashFlowInput,
  AnnualCashFlow,
  MonteCarloInput,
  MonteCarloResult,
  PercentileBand,
  GoalFundingResult,
  LifeInsuranceNeedsInput,
  LifeInsuranceNeedsResult,
  DisabilityNeedsInput,
  DisabilityNeedsResult,
  LTCNeedsInput,
  LTCNeedsResult,
  PlanResultData,
  GoalResultItem,
  AnnualDataPoint,
  IncomeSourceData,
  ExpenseData,
  AccountData,
  GoalData,
  PlanAssumptions,
} from './types';

// Tax functions
export { calculateFederalTax } from './tax/federal-income-tax';
export { calculateSETax } from './tax/self-employment-tax';
export { calculateCapitalGainsTax } from './tax/capital-gains-tax';
export { calculateNIIT } from './tax/niit';
export { calculateSSTaxation } from './tax/social-security-taxation';
export { calculateIRMAA } from './tax/irmaa';
export { calculateQBI } from './tax/qbi';
export { calculateEstateTax } from './tax/estate-gift-tax';
export { calculateStateTax } from './tax/state-income-tax';

// Retirement functions
export { calculateRMD } from './retirement/rmd';
export { calculateSSBenefit } from './retirement/social-security-benefit';
export { calculateRothConversion } from './retirement/roth-conversion';
export { optimizeWithdrawalSequence } from './retirement/withdrawal-sequence';
export { calculateRetirementReadiness } from './retirement/retirement-readiness';

// Projection functions
export { projectCashFlows } from './projections/cash-flow-engine';
export { projectIncome, projectIncomeByCategory } from './projections/income-projector';
export { projectExpenses, getPreMedicareHealthcareCost } from './projections/expense-projector';
export { adjustForInflation, toRealDollars, inflationAdjustBrackets } from './projections/inflation';
export {
  sumAccountsByBucket,
  sumLiabilities,
  sumRealEstate,
  blendedReturn,
  deriveAssetAllocation,
  calculateContributions,
} from './projections/account-growth';

// Monte Carlo
export { runMonteCarlo } from './monte-carlo/monte-carlo-engine';
export { gaussianRandom, generateCorrelatedReturns, SeededRandom } from './monte-carlo/random-returns';

// Goal funding
export { calculateGoalFunding } from './goals/goal-funding';
export { calculateEducationCost } from './goals/education-cost';
export { prioritizeGoals } from './goals/goal-prioritizer';

// Insurance needs
export { calculateLifeInsuranceNeeds } from './insurance/life-insurance-needs';
export { calculateDisabilityNeeds } from './insurance/disability-needs';
export { calculateLTCNeeds } from './insurance/ltc-needs';

// Utility functions
export {
  ageFromBirthYear,
  ageFromBirthDate,
  isOver65,
  fullRetirementAge,
} from './utils/age-calculator';
export { presentValue, presentValueAnnuity } from './utils/present-value';
export { futureValue, futureValueAnnuity } from './utils/future-value';
export { npv, npvWithInitial, profitabilityIndex } from './utils/npv';
export { irr, mirr } from './utils/irr';
export {
  calculateMonthlyPayment,
  amortizationSchedule,
  remainingBalance,
} from './utils/amortization';
export {
  getDefaultTaxTables,
  getTaxTablesForYear,
  getOrdinaryBrackets,
  getCapitalGainsBrackets,
  getStandardDeduction,
  getRMDDivisor,
  findIRMAABracket,
  getContributionLimits,
  getSSWageBase,
} from './utils/tax-table-loader';
