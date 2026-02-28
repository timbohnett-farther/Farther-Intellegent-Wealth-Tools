/**
 * Calc-engine utility barrel export.
 * Re-exports all utility functions from sub-modules.
 */

// Age calculation utilities
export {
  ageFromBirthYear,
  ageFromBirthDate,
  isOver65,
  isOver50,
  isOver55,
  isSuperCatchUpEligible,
  rmdStartAge,
  mustTakeRMD,
  fullRetirementAge,
  yearAtAge,
  yearsUntilAge,
  isMedicareEligible,
  canClaimSS,
} from './age-calculator';

// Present value utilities
export {
  presentValue,
  presentValueAnnuity,
  presentValueAnnuityDue,
  presentValueGrowingAnnuity,
  presentValuePerpetuity,
  presentValueGrowingPerpetuity,
} from './present-value';

// Future value utilities
export {
  futureValue,
  futureValueAnnuity,
  futureValueAnnuityDue,
  futureValueWithContributions,
  futureValueGrowingAnnuity,
  realFutureValue,
  yearsToDouble,
} from './future-value';

// Net present value utilities
export {
  npv,
  npvWithInitial,
  profitabilityIndex,
} from './npv';

// Internal rate of return utilities
export { irr, mirr } from './irr';
export type { IRROptions } from './irr';

// Amortization utilities
export {
  calculateMonthlyPayment,
  amortizationSchedule,
  remainingBalance,
  interestInRange,
} from './amortization';
export type {
  AmortizationRow,
  AmortizationSummary,
  AmortizationResult,
} from './amortization';

// Tax table loader utilities
export {
  getDefaultTaxTables,
  getTaxTablesForYear,
  getOrdinaryBrackets,
  getCapitalGainsBrackets,
  getStandardDeduction,
  getAdditional65Deduction,
  getSeniorBonusDeduction,
  getNIITThreshold,
  getRMDDivisor,
  findIRMAABracket,
  getContributionLimits,
  getSSWageBase,
} from './tax-table-loader';
