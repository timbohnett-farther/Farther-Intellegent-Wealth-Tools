/**
 * Estate planning calculation module — re-exports all estate functions and types.
 */

export {
  calculateFullEstateTax,
  calculateGRATRemainder,
  calculateCRTDeduction,
  calculateCLATRemainder,
  compareEstateScenarios,
} from './estate-planning-calc';

export type {
  EstateCalcInput,
  EstateCalcResult,
  GRATResult,
  CRTResult,
  CLATResult,
  EstateScenarioComparison,
} from './estate-planning-calc';
