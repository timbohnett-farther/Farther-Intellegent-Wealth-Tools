/**
 * Charitable planning calculation module — re-exports all functions and types.
 */

export {
  compareDAFFunding,
  optimizeBunching,
  compareQCDvsCash,
} from './charitable-calc';

export type {
  DAFFundingComparison,
  BunchingResult,
  QCDComparison,
} from './charitable-calc';
