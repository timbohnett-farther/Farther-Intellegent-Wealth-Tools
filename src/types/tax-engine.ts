/**
 * Tax Engine — Phase 3 Type Definitions
 *
 * Complete type system for deterministic tax calculation engine.
 * Principle: "The LLM explains math, but doesn't do math"
 */

// ==================== CORE ENUMS ====================

export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household'
  | 'qualifying_surviving_spouse';

export type TaxYear = 2020 | 2021 | 2022 | 2023 | 2024 | 2025;

export type RunType = 'baseline' | 'scenario';

export type ValidationSeverity = 'pass' | 'pass_with_warning' | 'soft_fail' | 'hard_fail';

export type InterpretationTag =
  | 'tax_increase'
  | 'tax_decrease'
  | 'bracket_shift_up'
  | 'bracket_shift_down'
  | 'niit_triggered'
  | 'niit_avoided'
  | 'irmaa_triggered'
  | 'irmaa_avoided'
  | 'deduction_method_change'
  | 'credit_gained'
  | 'credit_lost'
  | 'phase_out_triggered'
  | 'no_material_change';

// ==================== TAXPAYER IDENTIFICATION ====================

export interface Taxpayer {
  id: string;
  role: 'primary' | 'spouse';
  firstName: string;
  lastName: string;
  ssn?: string; // Last 4 digits only
  dateOfBirth: Date;
  age: number;
  isBlind?: boolean;
}

// ==================== INPUT SNAPSHOT ====================

export interface TaxInputs {
  // Income sources
  wages: number;
  salaries: number;
  tips: number;
  taxableInterest: number;
  taxExemptInterest: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  taxRefundsCredits: number;
  alimonyReceived: number;
  businessIncomeLoss: number; // Schedule C
  capitalGainLoss: number; // Schedule D
  otherGains: number;
  iraDistributions: number;
  iraDistributionsTaxable: number;
  pensionsAnnuities: number;
  pensionsAnnuitiesTaxable: number;
  scheduleE: number; // Rental, royalty, partnership, S-corp, estate, trust
  farmIncomeLoss: number;
  unemploymentCompensation: number;
  socialSecurityBenefits: number;
  socialSecurityBenefitsTaxable?: number; // Calculated
  otherIncome: number;

  // Adjustments to income
  educatorExpenses: number;
  businessExpensesReservists: number;
  hsaDeduction: number;
  movingExpensesArmedForces: number;
  selfEmployedSepSimple: number;
  selfEmploymentTax: number;
  penaltyEarlyWithdrawal: number;
  alimonyPaid: number;
  iraContributionDeduction: number;
  studentLoanInterest: number;
  tuitionFees: number;
  otherAdjustments: number;

  // Itemized deductions
  medicalDentalExpenses: number;
  stateLocalIncomeTaxes: number;
  realEstateTaxes: number;
  personalPropertyTaxes: number;
  mortgageInterest: number;
  investmentInterest: number;
  charitableCashContributions: number;
  charitableNoncashContributions: number;
  casualtyTheftLosses: number;
  otherItemizedDeductions: number;

  // Tax credits
  childTaxCredit: number;
  childDependentCareCredit: number;
  educationCredits: number;
  retirementSavingsCredit: number;
  residentialEnergyCredit: number;
  foreignTaxCredit: number;
  otherCredits: number;

  // Payments
  federalIncomeTaxWithheld: number;
  estimatedTaxPayments: number;
  amountAppliedFromPriorYear: number;
  excessSocialSecurityWithheld: number;
  otherPayments: number;

  // K-1 passthrough (if applicable)
  k1OrdinaryIncome?: number;
  k1NetRentalRealEstateIncome?: number;
  k1OtherNetRentalIncome?: number;
  k1GuaranteedPayments?: number;
  k1InterestIncome?: number;
  k1DividendIncome?: number;
  k1Royalties?: number;
  k1NetShortTermCapitalGain?: number;
  k1NetLongTermCapitalGain?: number;
  k1Section1231Gain?: number;
  k1OtherIncome?: number;
  k1Section199AQualifiedBusinessIncome?: number;

  // Metadata
  hasChildren: boolean;
  numberOfChildren: number;
  numberOfOtherDependents: number;
  spouseAgeOver65: boolean;
  spouseBlind: boolean;
  anyoneDisabled: boolean;
  anyoneOverSixtyFive: boolean;
  claimingDependents: boolean;
}

export interface TaxInputSnapshot {
  snapshotId: string;
  householdId: string;
  taxYear: number;
  filingStatus: FilingStatus;
  taxpayers: Taxpayer[];
  inputs: TaxInputs;
  missingInputs: string[];
  warnings: string[];
  sourceFactVersions: Record<string, number>; // Maps factId -> version
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

// ==================== VALIDATION ====================

export interface ValidationRule {
  ruleId: string;
  field: string;
  severity: ValidationSeverity;
  message: string;
  condition: string; // Human-readable rule
  category: 'completeness' | 'consistency' | 'range' | 'dependency' | 'logic';
}

export interface ValidationResult {
  snapshotId: string;
  pass: boolean;
  summary: {
    total: number;
    pass: number;
    pass_with_warning: number;
    soft_fail: number;
    hard_fail: number;
  };
  violations: ValidationViolation[];
  canProceed: boolean; // false if any hard_fail
  timestamp: Date;
}

export interface ValidationViolation {
  ruleId: string;
  field: string;
  severity: ValidationSeverity;
  message: string;
  actualValue: any;
  expectedCondition: string;
}

// ==================== TAX RULES ====================

export interface OrdinaryBracket {
  min: number;
  max: number | null; // null for top bracket
  rate: number;
  baseAmount: number;
}

export interface CapitalGainBracket {
  min: number;
  max: number | null;
  rate: number; // 0%, 15%, 20%
}

export interface TaxRulesPackage {
  rulesVersion: string; // e.g. "2025_federal_v1"
  taxYear: number;
  jurisdiction: string; // "federal" | "state:CA" | etc.
  publishedAt: Date;
  publishedBy: string;
  isActive: boolean;
  checksum: string;

  metadata: {
    description: string;
    changeLog: string[];
    authoredBy: string;
    sources?: string[];
  };

  // Ordinary income brackets (by filing status)
  ordinaryBrackets: Record<FilingStatus, OrdinaryBracket[]>;

  // Capital gains brackets (by filing status)
  capitalGainBrackets: Record<FilingStatus, CapitalGainBracket[]>;

  // Standard deduction
  standardDeduction: Record<FilingStatus, number>;

  // Additional standard deduction
  additionalStandardDeduction?: {
    age65OrBlind: Record<FilingStatus, number>;
  };

  // NIIT (Net Investment Income Tax)
  niit: {
    rate: number; // 0.038
    thresholds: Record<FilingStatus, number>;
  };

  // Social Security taxability
  socialSecurityTaxability: {
    thresholds: Record<FilingStatus, { tier1: number; tier2: number }>;
  };

  // AMT (Alternative Minimum Tax)
  amt: {
    exemption: Record<FilingStatus, number>;
    phaseoutThreshold: Record<FilingStatus, number>;
    phaseoutRate: number;
    rates: {
      tier1: { threshold: number; rate: number };
      tier2: { threshold: number; rate: number };
    };
  };

  // Child tax credit
  childTaxCredit: {
    creditAmount: number;
    phaseoutThreshold: Record<FilingStatus, number>;
    phaseoutRate: number;
    refundableAmount: number;
    otherDependentCredit: number;
  };

  // Retirement contribution limits
  retirementContributions: {
    traditionalIRA: {
      limit: number;
      catchUpAge: number;
      catchUpAmount: number;
      totalWithCatchUp: number;
    };
    rothIRA: {
      limit: number;
      catchUpAge: number;
      catchUpAmount: number;
      totalWithCatchUp: number;
      phaseoutThresholds: Record<string, { lower: number; upper: number }>;
    };
    traditional401k: {
      limit: number;
      catchUpAge: number;
      catchUpAmount: number;
      totalWithCatchUp: number;
    };
    hsa: {
      individual: number;
      family: number;
      catchUpAge: number;
      catchUpAmount: number;
    };
  };

  // EITC (Earned Income Tax Credit)
  eitc: {
    maxCredit: Record<string, number>;
    phaseoutBegins: Record<string, Record<string, number>>;
    phaseoutEnds: Record<string, Record<string, number>>;
  };

  // Deduction limits
  deductionLimits: {
    saltCap: number;
    mortgageInterestCap: number;
    charitableCashLimit: number;
    charitablePropertyLimit: number;
    medicalExpenseFloor: number;
  };

  // Kiddie tax
  kiddieTax: {
    threshold: number;
    rate: string;
  };

  // Education credits
  educationCredits: {
    americanOpportunityCredit: {
      maxCredit: number;
      qualifiedExpenses: number;
      phaseoutThreshold: Record<string, number>;
      phaseoutEnd: Record<string, number>;
      refundablePercentage: number;
    };
    lifetimeLearningCredit: {
      maxCredit: number;
      rate: number;
      qualifiedExpensesLimit: number;
      phaseoutThreshold: Record<string, number>;
      phaseoutEnd: Record<string, number>;
    };
  };

  // Capital loss limits
  capitalLoss: {
    annualDeductionLimit: number;
    carryforwardIndefinite: boolean;
  };

  // Estate & gift tax
  estateAndGift: {
    exemption: number;
    annualGiftExclusion: number;
    topRate: number;
  };

  // Self-employment tax
  selfEmploymentTax: {
    socialSecurityRate: number;
    medicareRate: number;
    additionalMedicareRate: number;
    additionalMedicareThreshold: Record<FilingStatus, number>;
    socialSecurityWageBase: number;
  };

  // Section 199A (QBI deduction)
  section199A: {
    deductionRate: number;
    thresholdAmount: Record<FilingStatus, number>;
    phaseoutRange: number;
    phaseoutRangeMFJ: number;
  };
}

// ==================== CALCULATION OUTPUT ====================

export interface TaxSummary {
  agi: number;
  taxableIncome: number;
  ordinaryIncomePortion: number;
  preferentialIncomePortion: number;
  ordinaryIncomeTax: number;
  preferentialIncomeTax: number;
  niit: number;
  totalTax: number;
  paymentsTotal: number;
  refundOrBalanceDue: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface TaxOutput {
  runId: string;
  snapshotId: string;
  householdId: string;
  taxYear: number;
  filingStatus: FilingStatus;
  rulesVersion: string;
  runType: RunType;

  // Calculation results
  summary: TaxSummary;

  // Detailed breakdown
  incomeBreakdown: {
    totalIncome: number;
    adjustments: number;
    agi: number;
  };

  deductionBreakdown: {
    standardDeduction: number;
    itemizedDeduction: number;
    deductionMethod: 'standard' | 'itemized';
    qualifiedBusinessIncomeDeduction: number;
  };

  taxCalculation: {
    ordinaryTaxableIncome: number;
    ordinaryIncomeTax: number;
    preferentialIncome: number;
    preferentialIncomeTax: number;
    subtotal: number;
    niit: number;
    amt: number;
    total: number;
  };

  credits: {
    childTaxCredit: number;
    otherCredits: number;
    total: number;
  };

  payments: {
    withheld: number;
    estimated: number;
    otherPayments: number;
    total: number;
  };

  // Calculation metadata
  warnings: string[];
  computeTimeMs: number;
  outputHash: string; // SHA-256 of serialized output
  createdAt: Date;
}

// ==================== CALCULATION TRACE ====================

export interface TraceStep {
  stepNumber: number;
  moduleName: string;
  operation: string;
  inputs: Record<string, any>;
  formula: string; // Human-readable formula
  result: any;
  warnings: string[];
  dependencies: number[]; // Step numbers this depends on
}

export interface CalculationTrace {
  runId: string;
  steps: TraceStep[];
  totalSteps: number;
  completedAt: Date;
}

// ==================== SCENARIO SYSTEM ====================

export interface ScenarioOverride {
  field: string; // e.g. "rothConversion"
  value: number;
  description: string;
}

export interface ScenarioOverrideSet {
  overrideSetId: string;
  name: string;
  description: string;
  householdId: string;
  taxYear: number;
  overrides: ScenarioOverride[];
  createdBy: string;
  createdAt: Date;
}

export interface ScenarioRun {
  scenarioRunId: string;
  baselineRunId: string;
  overrideSetId: string;
  scenarioOutputId: string;
  householdId: string;
  taxYear: number;
  createdAt: Date;
}

// ==================== COMPARISON & DIFF ====================

export interface FieldDiff {
  field: string;
  baseline: number;
  scenario: number;
  delta: number;
  percentChange: number;
  interpretation: InterpretationTag[];
}

export interface TaxComparison {
  comparisonId: string;
  baselineRunId: string;
  scenarioRunId: string;
  householdId: string;
  taxYear: number;

  summaryDiff: {
    agiDelta: number;
    taxableIncomeDelta: number;
    totalTaxDelta: number;
    effectiveRateDelta: number;
    marginalRateDelta: number;
    refundDelta: number;
  };

  fieldDiffs: FieldDiff[];
  interpretations: InterpretationTag[];
  narrative?: string; // AI-generated summary

  createdAt: Date;
}

// ==================== RECOMMENDATION SIGNALS ====================

export interface RecommendationSignals {
  runId: string;
  householdId: string;
  taxYear: number;

  signals: {
    // Tax planning signals
    marginalBracket: number;
    nextBracketThreshold: number | null;
    distanceToNextBracket: number | null;

    niitApplies: boolean;
    niitProximity: number | null; // Distance to NIIT threshold

    irmaaB1: boolean; // Medicare Part B IRMAA bracket 1
    irmaaProximity: number | null;

    // Opportunity indicators
    hasTraditionalIraBalance: boolean;
    rothConversionSpace: number | null; // How much to convert before next bracket

    hasUnrealizedLongTermGains: boolean;
    capitalGainHarvestingSpace: number | null; // 0% bracket space

    itemizationStatus: 'standard' | 'itemized' | 'near_threshold';
    charitableBunchingOpportunity: boolean;

    hasQualifiedBusinessIncome: boolean;
    qbiDeductionSpace: number | null;

    // Risk flags
    estimatedTaxShortfall: number | null;
    potentialPenalty: boolean;
  };

  computedAt: Date;
}

// ==================== SUPERSEDE LOGIC ====================

export interface SupersedeEvent {
  oldRunId: string;
  newRunId: string;
  reason: 'fact_update' | 'rules_update' | 'manual_recalc';
  triggeredBy: string; // userId or 'system'
  triggeredAt: Date;
  changedFacts?: string[]; // List of factIds that changed
}

// ==================== CALCULATION EVENTS ====================

export interface BaseEvent {
  eventId: string;
  timestamp: Date;
  source: 'tax-engine';
}

export interface CalculationRunCompletedEvent extends BaseEvent {
  eventType: 'calculation_run.completed';
  payload: {
    runId: string;
    householdId: string;
    runType: RunType;
    rulesVersion: string;
    outputHash: string;
    warningCount: number;
    computeTimeMs: number;
  };
}

export interface CalculationRunSupersededEvent extends BaseEvent {
  eventType: 'calculation_run.superseded';
  payload: {
    oldRunId: string;
    newRunId: string;
    reason: string;
    triggeredBy: string;
  };
}

export interface ValidationFailedEvent extends BaseEvent {
  eventType: 'validation.failed';
  payload: {
    snapshotId: string;
    householdId: string;
    severity: ValidationSeverity;
    violationCount: number;
  };
}

export type TaxEngineEvent =
  | CalculationRunCompletedEvent
  | CalculationRunSupersededEvent
  | ValidationFailedEvent;

// ==================== API RESPONSES ====================

export interface CreateSnapshotResponse {
  success: boolean;
  snapshotId: string;
  missingInputs: string[];
  warnings: string[];
}

export interface ValidateSnapshotResponse {
  success: boolean;
  canProceed: boolean;
  validationResult: ValidationResult;
}

export interface CalculateBaselineResponse {
  success: boolean;
  runId: string;
  output: TaxOutput;
  warnings: string[];
}

export interface GetTraceResponse {
  success: boolean;
  trace: CalculationTrace;
}

export interface CalculateScenarioResponse {
  success: boolean;
  scenarioRunId: string;
  output: TaxOutput;
  comparison: TaxComparison;
}

export interface GetComparisonResponse {
  success: boolean;
  comparison: TaxComparison;
}

export interface GetExplanationResponse {
  success: boolean;
  narrative: string;
  citations: Array<{
    source: string;
    section: string;
    quote: string;
  }>;
}

export interface GetSignalsResponse {
  success: boolean;
  signals: RecommendationSignals;
}

export interface SupersedeRunResponse {
  success: boolean;
  newRunId: string;
  oldRunId: string;
}

// ==================== ERROR TYPES ====================

export class TaxEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TaxEngineError';
  }
}

export class ValidationError extends TaxEngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class CalculationError extends TaxEngineError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CALCULATION_ERROR', details);
    this.name = 'CalculationError';
  }
}

export class RulesNotFoundError extends TaxEngineError {
  constructor(rulesVersion: string) {
    super(`Tax rules package not found: ${rulesVersion}`, 'RULES_NOT_FOUND', {
      rulesVersion,
    });
    this.name = 'RulesNotFoundError';
  }
}

// ==================== UTILITY TYPES ====================

export type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
