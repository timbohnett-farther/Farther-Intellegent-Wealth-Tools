/**
 * Retirement calculation module.
 *
 * Re-exports all retirement-related calculation functions and types.
 */

export { calculateRMD } from './rmd';
export { calculateSSBenefit } from './social-security-benefit';
export { calculateRothConversion } from './roth-conversion';
export {
  optimizeWithdrawalSequence,
  type WithdrawalPlan,
} from './withdrawal-sequence';
export {
  calculateRetirementReadiness,
  type RetirementReadinessInput,
  type RetirementReadinessResult,
} from './retirement-readiness';
