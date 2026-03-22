/**
 * Equity compensation calculation module — re-exports all functions and types.
 */

export {
  calculateRSUVestTax,
  calculateNQSOExercise,
  calculateISOExercise,
  calculateESPPTax,
  analyzeConcentratedPosition,
} from './equity-comp-calc';

export type {
  RSUVestTaxResult,
  NQSOExerciseResult,
  ISOExerciseResult,
  ESPPTaxResult,
  ConcentratedPositionAnalysis,
} from './equity-comp-calc';
