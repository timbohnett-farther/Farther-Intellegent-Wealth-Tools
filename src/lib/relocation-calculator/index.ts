/**
 * Interstate Tax Migration Calculator
 *
 * Main export module for relocation calculator functionality
 */

// Export all types
export type {
  // Jurisdiction types
  JurisdictionType,
  IncomeTaxSystemType,
  CapitalGainsTreatment,
  TaxBracket,
  JurisdictionTaxRules,

  // Puerto Rico
  Act60Cohort,
  PuertoRicoExtension,

  // User input
  FilingStatus,
  UserInputFacts,

  // Results
  JurisdictionTaxResult,
  TaxComparisonResult,

  // Update workflow
  UpdateSourceType,
  CandidateRuleUpdate,
  PublishedRuleVersion,
  ScraperSource,

  // Helper types
  CalculationError,
  CalculationValidation,
} from './types';

// Export calculation functions
export {
  calculateStateTax,
  estimateEstateTax,
  calculateTaxComparison,
} from './engine/calculator';
