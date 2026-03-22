// Farther Prism — Design System (Barrel)
export * from './tokens';
export * from './utils';
export * from './validator';

// FP-Sentinel validators — namespaced to avoid collisions with legacy validator
export {
  type ViolationSeverity,
  type ViolationCategory,
  type DesignViolation as SentinelViolation,
  type ValidationResult,
  hexToRgb,
  relativeLuminance as sentinelRelativeLuminance,
  getAllTokenColors,
  isTokenColor,
  findHardcodedColors,
  findHardcodedSpacingValues,
  validateContrastRatio,
  findMissingTabularNums,
  validateChartMinHeight,
  findRawErrorMessages,
  runFullValidation,
} from './validators';
