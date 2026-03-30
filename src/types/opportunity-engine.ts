/**
 * Phase 4: Opportunity Detection Engine Type Definitions
 *
 * Complete TypeScript interfaces for the opportunity detection system.
 * These types define the data structures used throughout the opportunity
 * detection pipeline, from input signals to final opportunities.
 */

import type { TaxOutput, TaxSummary } from './tax-engine';

// ============================================================================
// CORE OPPORTUNITY TYPES
// ============================================================================

export interface Opportunity {
  id: string;
  detectionRunId: string;
  householdId: string;
  taxYear: number;

  // Rule that detected this
  ruleName: string;
  ruleVersion: string;

  // Classification
  category: OpportunityCategory;
  subcategory?: string;

  // Ranking
  priority: 'high' | 'medium' | 'low';
  rank: number; // Within household+year, 1 = top

  // Core fields
  title: string;
  summary: string;
  estimatedValue?: number;
  confidence: 'high' | 'medium' | 'low';

  // Evidence
  evidence: Evidence[];

  // Composite scoring
  score: CompositeScore;
  finalScore: number; // Denormalized for sorting

  // Context
  context: Record<string, any>;

  // Suppression & Deduplication
  isDuplicate: boolean;
  duplicateOfId?: string;
  suppressionReason?: string;

  // Workflow
  status: OpportunityStatus;
  reviewedAt?: Date;
  reviewedBy?: string;
  dismissedAt?: Date;
  dismissedReason?: string;
  implementedAt?: Date;

  // AI enhancement
  aiSummary?: string;
  aiGeneratedAt?: Date;

  // Timestamps
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityCategory =
  | 'roth_conversion'
  | 'irmaa'
  | 'withholding'
  | 'tax_loss_harvest'
  | 'bunching'
  | 'qualified_charitable_distribution'
  | 'capital_gains_management'
  | 'niit_avoidance'
  | 'estimated_tax_planning'
  | 'retirement_contribution'
  | 'donor_advised_fund'
  | 'municipal_bond_allocation'
  | '529_planning'
  | 'hsa_maximization';

export type OpportunityStatus =
  | 'detected'
  | 'reviewed'
  | 'recommended'
  | 'dismissed'
  | 'implemented';

// ============================================================================
// EVIDENCE
// ============================================================================

export interface Evidence {
  type: 'calculation' | 'comparison' | 'threshold' | 'trend' | 'flag';
  label: string;
  value: string | number | boolean;
  displayValue?: string;
  weight: number; // 0.0 to 1.0
  detail?: string;
  sourceField?: string;
}

// ============================================================================
// COMPOSITE SCORING
// ============================================================================

export interface CompositeScore {
  impactScore: number; // 0-100: estimated dollar value normalized
  urgencyScore: number; // 0-100: time sensitivity
  confidenceScore: number; // 0-100: data quality & rule reliability
  complexityScore: number; // 0-100: implementation difficulty (inverse)

  weights: {
    impact: number;
    urgency: number;
    confidence: number;
    complexity: number;
  };

  finalScore: number; // Weighted composite: 0-100
}

// ============================================================================
// DETECTION RUN
// ============================================================================

export interface OpportunityDetectionRun {
  id: string;

  // Input
  calculationRunId: string;
  householdId: string;
  taxYear: number;

  // Metadata
  rulesVersion: string;
  totalRulesEvaluated: number;
  totalRulesPassed: number;

  // Results
  opportunitiesDetected: number;
  highPriorityCount: number;
  estimatedValueTotal?: number;

  // Performance
  computeTimeMs: number;

  // Status
  status: 'running' | 'completed' | 'failed';
  error?: string;

  // Timestamps
  completedAt: Date;
  createdAt: Date;
}

// ============================================================================
// RULE DEFINITION
// ============================================================================

export interface OpportunityRule {
  ruleName: string;
  ruleVersion: string;
  category: OpportunityCategory;
  subcategory?: string;

  // Metadata
  title: string;
  description: string;
  priority: number; // Higher = evaluated first

  // Conditions
  eligibility: RuleCondition[];
  triggers: RuleCondition[];
  blocking?: RuleCondition[];

  // Scoring
  scoringFormula: ScoringFormula;

  // Output
  outputTemplate: OutputTemplate;

  // Control
  isActive: boolean;
}

export interface RuleCondition {
  type: 'threshold' | 'comparison' | 'range' | 'flag' | 'composite';
  field: string;
  operator: ComparisonOperator;
  value: any;
  label?: string;
  description?: string;
}

export type ComparisonOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'contains';

export interface ScoringFormula {
  impact: ImpactFormula;
  urgency: UrgencyFormula;
  confidence: ConfidenceFormula;
  complexity: ComplexityFormula;
  weights: {
    impact: number;
    urgency: number;
    confidence: number;
    complexity: number;
  };
}

export interface ImpactFormula {
  type: 'direct' | 'scaled' | 'tiered' | 'calculated';
  field?: string;
  scale?: { min: number; max: number };
  tiers?: Array<{ threshold: number; score: number }>;
  formula?: string; // JavaScript expression
}

export interface UrgencyFormula {
  type: 'deadline' | 'seasonal' | 'fixed';
  deadline?: Date;
  seasonalWindow?: { start: string; end: string }; // MM-DD format
  fixedScore?: number;
}

export interface ConfidenceFormula {
  type: 'field_based' | 'composite' | 'fixed';
  fields?: Array<{ field: string; weight: number }>;
  fixedScore?: number;
}

export interface ComplexityFormula {
  type: 'fixed' | 'field_count' | 'custom';
  fixedScore?: number;
  fieldCount?: number;
  customFormula?: string;
}

export interface OutputTemplate {
  titleTemplate: string;
  summaryTemplate: string;
  evidenceFields: string[];
  contextFields: string[];
  estimatedValueField?: string;
}

// ============================================================================
// RULE PACKAGE
// ============================================================================

export interface OpportunityRulePackage {
  packageVersion: string;
  taxYear: number;
  rules: OpportunityRule[];
  publishedAt: Date;
  publishedBy: string;
}

// ============================================================================
// EVALUATION CONTEXT
// ============================================================================

export interface EvaluationContext {
  // Tax calculation output
  taxOutput: TaxOutput;

  // Additional context
  householdId: string;
  taxYear: number;
  currentDate: Date;

  // Derived signals (from recommendation signals)
  signals: RecommendationSignals;

  // Household metadata
  householdMetadata?: {
    clientAge?: number;
    spouseAge?: number;
    hasRetirementAccounts?: boolean;
    hasTaxableAccounts?: boolean;
    stateOfResidence?: string;
  };
}

export interface RecommendationSignals {
  // NIIT
  niit: {
    applies: boolean;
    magi?: number;
    niitThreshold?: number;
    distanceToThreshold?: number;
    niitAmount?: number;
  };

  // IRMAA
  irmaa: {
    b1: boolean; // Income within IRMAA Bracket 1
    b2: boolean;
    b3: boolean;
    b4: boolean;
    magi?: number;
    irmaaBracketThreshold?: number;
    distanceToBracket?: number;
  };

  // Withholding
  withholding: {
    shortfall?: number;
    isShortfall: boolean;
    overpayment?: number;
    isOverpayment: boolean;
    totalWithheld?: number;
    totalTax?: number;
  };

  // Roth Conversion
  rothConversion: {
    headroom?: number;
    hasHeadroom: boolean;
    currentBracket?: number;
    nextBracketThreshold?: number;
    marginalRate?: number;
  };

  // Capital Gains
  capitalGains: {
    has0PercentHeadroom: boolean;
    headroom0Percent?: number;
    has15PercentHeadroom: boolean;
    headroom15Percent?: number;
    unrealizedGains?: number;
  };

  // Deductions
  deductions: {
    usingStandard: boolean;
    itemizedAmount?: number;
    standardAmount?: number;
    nearThreshold: boolean; // Within 20% of crossover
    charitableContributions?: number;
  };

  // QBI
  qbi: {
    hasQBI: boolean;
    qbiAmount?: number;
    qbiDeduction?: number;
    phaseoutStart?: number;
    distanceToPhaseout?: number;
  };
}

// ============================================================================
// RANKING & DEDUPLICATION
// ============================================================================

export interface RankingCriteria {
  sortBy: Array<{
    field: 'finalScore' | 'estimatedValue' | 'priority';
    direction: 'desc' | 'asc';
  }>;
  groupBy?: 'category' | 'priority';
}

export interface DeduplicationRule {
  type: 'exact_match' | 'category_limit' | 'threshold_overlap';
  field?: string;
  categoryLimit?: number;
  overlapThreshold?: number;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface DetectOpportunitiesRequest {
  calculationRunId: string;
  rulesVersion?: string; // Defaults to latest active
  options?: {
    includeAiEnhancement?: boolean;
    maxOpportunities?: number;
    minPriority?: 'low' | 'medium' | 'high';
  };
}

export interface DetectOpportunitiesResponse {
  detectionRunId: string;
  opportunitiesDetected: number;
  highPriorityCount: number;
  estimatedValueTotal?: number;
  computeTimeMs: number;
  opportunities: Opportunity[];
}

export interface UpdateOpportunityStatusRequest {
  status: OpportunityStatus;
  reviewedBy?: string;
  dismissedReason?: string;
  notes?: string;
}

export interface GenerateAiSummaryRequest {
  opportunityId: string;
}

export interface GenerateAiSummaryResponse {
  opportunityId: string;
  aiSummary: string;
  generatedAt: Date;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface OpportunityAuditEvent {
  eventId: string;
  eventType:
    | 'opportunity.detected'
    | 'opportunity.reviewed'
    | 'opportunity.dismissed'
    | 'opportunity.recommended'
    | 'opportunity.implemented'
    | 'detection_run.started'
    | 'detection_run.completed'
    | 'detection_run.failed';

  opportunityId?: string;
  detectionRunId?: string;

  payload: Record<string, any>;

  source: string;
  triggeredBy?: string;

  timestamp: Date;
}

export interface OpportunityDetectedPayload {
  opportunityId: string;
  householdId: string;
  taxYear: number;
  category: OpportunityCategory;
  priority: 'high' | 'medium' | 'low';
  estimatedValue?: number;
  ruleName: string;
}

export interface OpportunityReviewedPayload {
  opportunityId: string;
  reviewedBy: string;
  previousStatus: OpportunityStatus;
  newStatus: OpportunityStatus;
}

export interface OpportunityDismissedPayload {
  opportunityId: string;
  dismissedBy: string;
  reason: string;
}

export interface DetectionRunCompletedPayload {
  detectionRunId: string;
  householdId: string;
  taxYear: number;
  opportunitiesDetected: number;
  highPriorityCount: number;
  estimatedValueTotal?: number;
  computeTimeMs: number;
}
