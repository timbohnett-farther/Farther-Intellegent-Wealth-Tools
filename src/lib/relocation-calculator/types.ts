/**
 * Interstate Tax Migration Calculator — Phase 1 Types
 *
 * Type definitions for the relocation calculator including:
 * - Jurisdiction tax rules
 * - User input facts
 * - Calculation results
 * - Update workflow metadata
 */

// ==================== JURISDICTION TAX RULES ====================

export type JurisdictionType = 'state' | 'district' | 'territory';

export type IncomeTaxSystemType =
  | 'none' // No state income tax
  | 'flat' // Single flat rate
  | 'graduated' // Graduated brackets
  | 'special'; // Special rules (e.g., Puerto Rico)

export type CapitalGainsTreatment =
  | 'as_ordinary' // Taxed at ordinary rates
  | 'separate_rate' // Separate preferential rate
  | 'exempt' // Exempt from state tax
  | 'special'; // Special treatment (e.g., Act 60)

export interface TaxBracket {
  minIncome: number;
  maxIncome: number | null; // null for top bracket
  rate: number; // As decimal (e.g., 0.0935 for 9.35%)
}

export interface JurisdictionTaxRules {
  // Identification
  jurisdictionCode: string; // e.g., 'CA', 'NY', 'PR'
  jurisdictionName: string; // e.g., 'California'
  jurisdictionType: JurisdictionType;

  // Version and freshness
  effectiveDate: string; // ISO date
  taxYear: number; // e.g., 2026
  rulesVersion: string; // Semantic version, e.g., '1.0.0'
  lastReviewed: string; // ISO date
  sourceUrls: string[]; // Authoritative sources

  // Income Tax System
  incomeTaxSystemType: IncomeTaxSystemType;
  flatRate?: number; // For flat tax states (as decimal)
  brackets?: {
    single: TaxBracket[];
    marriedJoint: TaxBracket[];
    marriedSeparate: TaxBracket[];
    headOfHousehold: TaxBracket[];
  };

  // Capital Gains
  capitalGainsTreatment: CapitalGainsTreatment;
  capitalGainsRate?: number; // If separate rate (as decimal)
  capitalGainsNotes?: string;

  // Estate and Inheritance Tax
  hasEstateTax: boolean;
  estateExemption?: number; // Exemption amount in dollars
  estateTopRate?: number; // Top rate as decimal
  hasInheritanceTax: boolean;
  inheritanceExemption?: number;
  inheritanceTopRate?: number;
  transferTaxNotes?: string;

  // Residency and Planning Notes
  residencyNotes?: string;
  planningNotes?: string;
}

// ==================== PUERTO RICO EXTENSION ====================

export type Act60Cohort =
  | 'pre_2026' // Decree issued before March 2026
  | 'post_2026' // Decree issued after March 2026 (Act 38-2026 changes)
  | 'not_applicable';

export interface PuertoRicoExtension {
  // Bona fide residency assumption
  assumeBonaFideResidency: boolean;
  bonaFideResidencyNotes?: string;

  // Act 60 scenario
  act60Enabled: boolean;
  act60Cohort?: Act60Cohort;
  act60CapitalGainsRate?: number; // As decimal
  act60PassiveinComeRate?: number; // As decimal
  act60Notes?: string;

  // 2026 regime changes (Act 38-2026)
  act38_2026Changes?: string;
}

// ==================== USER INPUT FACTS ====================

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export interface UserInputFacts {
  // Jurisdictions
  leavingStateCode: string;
  destinationStateCode: string;

  // Filing info
  filingStatus: FilingStatus;

  // Income
  annualOrdinaryIncome: number; // Dollars
  annualCapitalGains: number; // Dollars

  // Estate
  netWorth?: number; // Dollars

  // Puerto Rico specific (if destination is PR)
  puertoRico?: PuertoRicoExtension;
}

// ==================== CALCULATION RESULTS ====================

export interface JurisdictionTaxResult {
  jurisdictionCode: string;
  jurisdictionName: string;

  // Income Tax
  ordinaryIncomeTax: number; // Dollars
  capitalGainsTax: number; // Dollars
  totalIncomeTax: number; // Dollars

  // Estate/Inheritance Tax Indicators
  estateOrInheritanceTaxApplies: boolean;
  estateOrInheritanceTaxExposure?: {
    taxableAmount: number; // Amount over exemption
    estimatedTax: number; // Rough estimate
    notes: string;
  };

  // Calculation metadata
  effectiveTaxRate: number; // As decimal
  marginalTaxRate: number; // As decimal
}

export interface TaxComparisonResult {
  // User inputs
  userFacts: UserInputFacts;

  // Origin state results
  originState: JurisdictionTaxResult;

  // Destination state results
  destinationState: JurisdictionTaxResult;

  // Comparison
  annualTaxDifference: number; // Destination - Origin (negative = savings)
  tenYearIllustration: number; // Simple 10x annual difference

  // Assumptions and caveats
  assumptions: string[];
  caveats: string[];
  jurisdictionSpecificNotes: string[];

  // Metadata
  calculationDate: string; // ISO date
  rulesVersionUsed: {
    origin: string;
    destination: string;
  };
}

// ==================== UPDATE WORKFLOW ====================

export type UpdateSourceType =
  | 'tax_foundation'
  | 'ncsl_state_tax_actions'
  | 'actec_death_tax_chart'
  | 'puerto_rico_official'
  | 'state_legislature'
  | 'other';

export interface CandidateRuleUpdate {
  updateId: string; // UUID
  jurisdictionCode: string;
  sourceType: UpdateSourceType;
  sourceUrl: string;
  detectedDate: string; // ISO date

  // Proposed changes (structured delta)
  proposedChanges: Partial<JurisdictionTaxRules>;

  // AI extraction metadata
  extractedBy: string; // AI model identifier
  confidenceScore: number; // 0-1
  extractionSummary: string;

  // Review status
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'superseded';
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}

export interface PublishedRuleVersion {
  versionId: string; // UUID
  jurisdictionCode: string;
  rules: JurisdictionTaxRules;

  // Publishing metadata
  publishedDate: string; // ISO date
  publishedBy: string;
  changeLog: string;
  sourceUpdates: string[]; // Array of CandidateRuleUpdate IDs

  // Versioning
  priorVersionId?: string; // Previous version for history
  isActive: boolean; // Currently active version
}

// ==================== SCRAPER CONFIG ====================

export interface ScraperSource {
  sourceId: string;
  sourceName: string;
  sourceType: UpdateSourceType;
  baseUrl: string;
  scrapingFrequency: 'weekly' | 'monthly' | 'on_demand';
  lastScraped?: string; // ISO date
  isActive: boolean;
}

// ==================== HELPER TYPES ====================

export interface CalculationError {
  errorCode: string;
  errorMessage: string;
  field?: string;
}

export interface CalculationValidation {
  isValid: boolean;
  errors: CalculationError[];
  warnings: string[];
}
