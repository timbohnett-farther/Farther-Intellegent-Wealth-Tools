# Phase 4 Technical Build Pack — Opportunity Detection Engine

**Version:** 1.0
**Date:** 2026-03-30
**Status:** Ready for Implementation
**Dependencies:** Phase 2 (Facts), Phase 3 (Tax Calculation)

---

## Table of Contents

1. [TypeScript Schemas](#1-typescript-schemas)
2. [Database Schema (Prisma)](#2-database-schema-prisma)
3. [Rule Package Format](#3-rule-package-format)
4. [Scoring Algorithms](#4-scoring-algorithms)
5. [API Contracts](#5-api-contracts)
6. [Event Payloads](#6-event-payloads)
7. [Sample Outputs](#7-sample-outputs)
8. [Golden Test Cases](#8-golden-test-cases)
9. [Implementation Roadmap](#9-implementation-roadmap)

---

## 1. TypeScript Schemas

### 1.1 Core Opportunity Schema

```typescript
// src/types/opportunity-engine.ts

export type OpportunityCategory =
  | 'roth'
  | 'capital_gains'
  | 'charitable'
  | 'payments'
  | 'retirement_income'
  | 'thresholds'
  | 'transition';

export type OpportunityStatus =
  | 'new'
  | 'reviewed'
  | 'scenario_created'
  | 'presented'
  | 'accepted'
  | 'deferred'
  | 'dismissed';

export type Confidence = 'high' | 'medium' | 'low';
export type Complexity = 'low' | 'medium' | 'high';
export type Urgency = 'low' | 'medium' | 'high';

export interface Opportunity {
  // Identity
  opportunityId: string;
  householdId: string;
  taxYear: number;
  sourceRunId: string; // Links to baseline calculation run
  detectionId: string; // Links to detection run

  // Classification
  opportunityType: string; // e.g., 'roth_conversion_headroom'
  category: OpportunityCategory;

  // Core content
  title: string;
  summary: string;
  whyItSurfaced: string;

  // Supporting data
  evidence: OpportunityEvidence;
  score: OpportunityScore;
  confidence: Confidence;
  estimatedImpact: EstimatedImpact | null;
  complexity: Complexity;
  urgency: Urgency;
  dataCompleteness: number; // 0-100

  // Missing data tracking
  missingInfo: MissingInfoItem[];

  // Lifecycle
  recommendationStatus: OpportunityStatus;

  // Actions
  suggestedNextActions: SuggestedAction[];
  suggestedScenarioTemplates: ScenarioTemplateRef[];

  // Metadata
  detectionRuleId: string;
  engineVersion: string;
  rulesVersion: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy?: string; // 'system' or advisorId
  reviewedBy?: string;
  reviewedAt?: string;
}
```

### 1.2 Evidence Schema

```typescript
export interface OpportunityEvidence {
  supportingFacts: EvidenceFactRef[];
  supportingOutputs: EvidenceOutputRef[];
  supportingThresholds: EvidenceThresholdRef[];
  supportingTraceRefs: string[];
  warnings: string[];
  unsupportedItems: string[];
}

export interface EvidenceFactRef {
  field: string; // e.g., 'iraDistributions'
  value: number | string | boolean | null;
  label: string; // Human-readable label
  sourceFactId?: string;
  sourceFactVersion?: number;
}

export interface EvidenceOutputRef {
  field: string; // e.g., 'agi'
  value: number | string | boolean | null;
  label: string;
  sourceRunId: string;
}

export interface EvidenceThresholdRef {
  thresholdName: string; // e.g., 'irmaa_tier_1_mfj'
  currentValue: number;
  thresholdValue: number;
  delta: number; // currentValue - thresholdValue
  percentToThreshold: number; // (currentValue / thresholdValue) * 100
}
```

### 1.3 Scoring Schema

```typescript
export interface OpportunityScore {
  overall: number; // 0-100 weighted composite
  impactScore: number; // 0-100
  relevanceScore: number; // 0-100
  urgencyScore: number; // 0-100
  confidenceScore: number; // 0-100
  completenessScore: number; // 0-100
  complexityPenalty: number; // 0-100 (subtracted from overall)

  // Metadata
  weightingFormula: ScoringWeights;
  calculatedAt: string;
}

export interface ScoringWeights {
  impact: number; // e.g., 0.30
  relevance: number; // e.g., 0.20
  urgency: number; // e.g., 0.15
  confidence: number; // e.g., 0.15
  completeness: number; // e.g., 0.10
  householdFit: number; // e.g., 0.10
  complexityPenalty: number; // e.g., -0.20
}

// Default weights (firms can override)
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  impact: 0.30,
  relevance: 0.20,
  urgency: 0.15,
  confidence: 0.15,
  completeness: 0.10,
  householdFit: 0.10,
  complexityPenalty: -0.20,
};
```

### 1.4 Estimated Impact Schema

```typescript
export type ImpactType =
  | 'tax_savings'
  | 'tax_cost'
  | 'threshold_management'
  | 'deduction_value'
  | 'cash_flow_alignment'
  | 'scenario_required';

export type QualitativeImpact = 'low' | 'medium' | 'high';

export interface EstimatedImpact {
  type: ImpactType;
  minValue?: number; // Minimum estimated dollar impact
  maxValue?: number; // Maximum estimated dollar impact
  qualitativeLabel?: QualitativeImpact;
  notes?: string;
  calculationMethod?: string; // e.g., 'bracket_fill_projection'
}
```

### 1.5 Missing Info Schema

```typescript
export type MissingInfoSeverity = 'info' | 'warning' | 'blocking';

export interface MissingInfoItem {
  field: string; // e.g., 'iraContributionBasis'
  message: string; // Human-readable description
  severity: MissingInfoSeverity;
  impactOnConfidence?: string; // How this affects confidence
  howToObtain?: string; // Guidance for advisor
}
```

### 1.6 Suggested Actions Schema

```typescript
export type ActionType =
  | 'create_scenario'
  | 'request_data'
  | 'client_discussion'
  | 'coordinate_cpa'
  | 'assign_task'
  | 'specialist_review'
  | 'mark_reviewed'
  | 'defer'
  | 'dismiss';

export type ActionPriority = 'low' | 'medium' | 'high';

export interface SuggestedAction {
  actionType: ActionType;
  label: string; // e.g., 'Create Roth Conversion Scenario'
  priority: ActionPriority;
  details?: string;
  templateId?: string; // For create_scenario or assign_task
  estimatedTime?: string; // e.g., '15 minutes'
}
```

### 1.7 Scenario Template Ref

```typescript
export interface ScenarioTemplateRef {
  scenarioTemplateId: string;
  name: string;
  description: string;
  category: string; // e.g., 'roth_conversion'
  defaultInputs?: Record<string, unknown>;
}
```

### 1.8 Opportunity Rule Schema

```typescript
export type RuleOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'exists'
  | 'missing'
  | 'between'
  | 'in'
  | 'not_in';

export interface RuleCondition {
  field: string; // Dot notation: 'inputs.agi' or 'outputs.taxableIncome'
  operator: RuleOperator;
  value?: unknown;
  values?: unknown[]; // For 'in' and 'not_in'
  minValue?: number; // For 'between'
  maxValue?: number; // For 'between'
  description?: string; // Human-readable condition
}

export interface OpportunityRule {
  // Identity
  ruleId: string;
  name: string;
  version: string; // Semantic versioning

  // Classification
  category: OpportunityCategory;
  opportunityType: string;

  // Metadata
  description: string;
  author?: string;
  lastModified: string;

  // Applicability
  appliesToTaxYears: number[];
  appliesToFilingStatuses?: string[]; // If null, applies to all
  enabled: boolean;
  betaOnly?: boolean; // If true, only enabled for beta firms

  // Logic
  eligibilityConditions: RuleCondition[]; // ALL must pass
  triggerConditions: RuleCondition[]; // ALL must pass
  blockingConditions: RuleCondition[]; // ANY blocks

  // Evidence requirements
  evidenceRequirements: string[]; // Field paths required for evidence

  // Scoring hints
  scoringHints: {
    baseImpactScore?: number;
    baseRelevanceScore?: number;
    baseUrgencyScore?: number;
    complexityLevel?: Complexity;
  };

  // Connections
  suggestedScenarioTemplateIds: string[];
  suggestedActionTemplateIds: string[];

  // Content templates
  titleTemplate: string; // Mustache template
  summaryTemplate: string;
  whySurfacedTemplate: string;

  // Testing
  testCases?: RuleTestCase[];
}

export interface RuleTestCase {
  testId: string;
  description: string;
  inputs: Record<string, unknown>; // Snapshot of test inputs
  expectedTrigger: boolean;
  expectedBlockers?: string[];
  expectedEvidence?: string[];
}
```

### 1.9 Detection Run Schema

```typescript
export type DetectionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'superseded';

export interface OpportunityDetectionRun {
  detectionId: string;
  householdId: string;
  taxYear: number;
  sourceRunId: string; // Baseline calculation run

  // Versions
  engineVersion: string;
  rulePackageVersion: string;
  taxRulesVersion: string;

  // Execution
  status: DetectionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  // Results
  opportunityCount: number;
  ruleEvaluationCount: number;
  triggeredRuleIds: string[];
  blockedRuleIds: string[];

  // Metadata
  triggeredBy?: string; // 'system' | advisorId
  supersededBy?: string; // Next detection ID if superseded

  // Diagnostics
  errors?: string[];
  warnings?: string[];
}
```

---

## 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma additions

model OpportunityDetectionRun {
  id                  String   @id @default(cuid())
  detectionId         String   @unique @map("detection_id")
  householdId         String   @map("household_id")
  household           Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  taxYear             Int      @map("tax_year")
  sourceRunId         String   @map("source_run_id")

  // Versions
  engineVersion       String   @map("engine_version")
  rulePackageVersion  String   @map("rule_package_version")
  taxRulesVersion     String   @map("tax_rules_version")

  // Execution
  status              String   // DetectionStatus enum
  startedAt           DateTime @default(now()) @map("started_at")
  completedAt         DateTime? @map("completed_at")
  durationMs          Int?     @map("duration_ms")

  // Results
  opportunityCount    Int      @default(0) @map("opportunity_count")
  ruleEvaluationCount Int      @default(0) @map("rule_evaluation_count")
  triggeredRuleIds    String   @map("triggered_rule_ids") // JSON array
  blockedRuleIds      String   @map("blocked_rule_ids") // JSON array

  // Metadata
  triggeredBy         String?  @map("triggered_by")
  supersededBy        String?  @map("superseded_by")

  // Diagnostics
  errors              String?  // JSON array
  warnings            String?  // JSON array

  // Relations
  opportunities       Opportunity[]

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([householdId, taxYear])
  @@index([sourceRunId])
  @@index([status])
  @@map("opportunity_detection_runs")
}

model Opportunity {
  id                  String   @id @default(cuid())
  opportunityId       String   @unique @map("opportunity_id")

  // Links
  detectionId         String   @map("detection_id")
  detection           OpportunityDetectionRun @relation(fields: [detectionId], references: [id], onDelete: Cascade)
  householdId         String   @map("household_id")
  household           Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  taxYear             Int      @map("tax_year")
  sourceRunId         String   @map("source_run_id")

  // Classification
  opportunityType     String   @map("opportunity_type")
  category            String   // OpportunityCategory

  // Core content
  title               String
  summary             String   @db.Text
  whyItSurfaced       String   @map("why_it_surfaced") @db.Text

  // Evidence (JSON)
  evidenceJson        String   @map("evidence_json") @db.Text

  // Scoring (JSON)
  scoreJson           String   @map("score_json") @db.Text
  overallScore        Float    @map("overall_score") // Denormalized for querying

  // Attributes
  confidence          String   // Confidence enum
  complexity          String   // Complexity enum
  urgency             String   // Urgency enum
  dataCompleteness    Float    @map("data_completeness") // 0-100

  // Impact (JSON)
  impactJson          String?  @map("impact_json") @db.Text

  // Missing info (JSON array)
  missingInfoJson     String?  @map("missing_info_json") @db.Text

  // Lifecycle
  status              String   @default("new") // OpportunityStatus

  // Actions (JSON arrays)
  actionsJson         String   @map("actions_json") @db.Text
  scenarioTemplatesJson String @map("scenario_templates_json") @db.Text

  // Metadata
  detectionRuleId     String   @map("detection_rule_id")
  engineVersion       String   @map("engine_version")
  rulesVersion        String   @map("rules_version")

  // Audit
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  createdBy           String?  @map("created_by")
  reviewedBy          String?  @map("reviewed_by")
  reviewedAt          DateTime? @map("reviewed_at")

  // Relations
  auditEvents         OpportunityAuditEvent[]

  @@index([householdId, taxYear])
  @@index([detectionId])
  @@index([status])
  @@index([category])
  @@index([overallScore(sort: Desc)])
  @@map("opportunities")
}

model OpportunityAuditEvent {
  id              String   @id @default(cuid())
  eventId         String   @unique @map("event_id")

  opportunityId   String   @map("opportunity_id")
  opportunity     Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  actor           String   // advisorId or 'system'
  actorType       String   @map("actor_type") // 'advisor' | 'system' | 'client'
  action          String   // 'created' | 'status_changed' | 'converted_to_scenario', etc.

  // Change tracking
  beforeJson      String?  @map("before_json") @db.Text
  afterJson       String?  @map("after_json") @db.Text
  metadata        String?  @db.Text // Additional context

  // Session tracking
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @map("user_agent")
  sessionId       String?  @map("session_id")

  timestamp       DateTime @default(now())

  @@index([opportunityId])
  @@index([actor])
  @@index([timestamp])
  @@map("opportunity_audit_events")
}

model OpportunityRule {
  id              String   @id @default(cuid())
  ruleId          String   @unique @map("rule_id")
  name            String
  version         String

  category        String
  opportunityType String   @map("opportunity_type")

  description     String   @db.Text
  author          String?
  lastModified    DateTime @map("last_modified")

  // Applicability
  taxYears        String   @map("tax_years") // JSON array
  filingStatuses  String?  @map("filing_statuses") // JSON array or null
  enabled         Boolean  @default(true)
  betaOnly        Boolean  @default(false) @map("beta_only")

  // Logic (all JSON)
  eligibilityConditions String @map("eligibility_conditions") @db.Text
  triggerConditions     String @map("trigger_conditions") @db.Text
  blockingConditions    String @map("blocking_conditions") @db.Text

  evidenceRequirements  String @map("evidence_requirements") @db.Text
  scoringHints          String @map("scoring_hints") @db.Text

  // Templates
  titleTemplate        String @map("title_template") @db.Text
  summaryTemplate      String @map("summary_template") @db.Text
  whySurfacedTemplate  String @map("why_surfaced_template") @db.Text

  // Connections
  scenarioTemplateIds  String @map("scenario_template_ids") @db.Text // JSON array
  actionTemplateIds    String @map("action_template_ids") @db.Text // JSON array

  // Testing
  testCases           String? @map("test_cases") @db.Text // JSON array

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([category])
  @@index([enabled])
  @@map("opportunity_rules")
}

// Extend existing Household model
model Household {
  // ... existing fields ...
  opportunityDetections OpportunityDetectionRun[]
  opportunities         Opportunity[]
}
```

---

## 3. Rule Package Format

### 3.1 Rule Package Structure

```typescript
// src/lib/opportunity-engine/rules/rule-package-v1.ts

export interface OpportunityRulePackage {
  packageId: string;
  version: string; // Semantic versioning
  name: string;
  description: string;
  releaseDate: string;
  appliesTo: {
    taxYears: number[];
    engineVersions: string[];
  };
  rules: OpportunityRule[];
  changelog?: string;
}

// Example package
export const OPPORTUNITY_RULES_2025_V1: OpportunityRulePackage = {
  packageId: 'opp_rules_2025_v1',
  version: '1.0.0',
  name: 'Opportunity Rules 2025 - Version 1',
  description: 'Initial opportunity detection rules for 2025 tax year',
  releaseDate: '2026-03-30',
  appliesTo: {
    taxYears: [2025],
    engineVersions: ['^1.0.0'],
  },
  rules: [
    // Rules defined below
  ],
};
```

### 3.2 Rule 1: Roth Conversion Headroom

```typescript
{
  ruleId: 'roth_conversion_headroom_v1',
  name: 'Roth Conversion Headroom Detection',
  version: '1.0.0',
  category: 'roth',
  opportunityType: 'roth_conversion_headroom',
  description: 'Identifies households with potential Roth conversion opportunities based on bracket headroom and retirement account presence.',

  appliesToTaxYears: [2025],
  appliesToFilingStatuses: null, // All filing statuses
  enabled: true,

  eligibilityConditions: [
    {
      field: 'facts.iraDistributions',
      operator: 'exists',
      description: 'Household has IRA distributions or accounts'
    },
    {
      field: 'outputs.agi',
      operator: 'exists',
      description: 'AGI has been calculated'
    },
    {
      field: 'household.taxpayerAge',
      operator: 'lt',
      value: 75,
      description: 'Primary taxpayer under age 75'
    }
  ],

  triggerConditions: [
    {
      field: 'outputs.marginalTaxRate',
      operator: 'lte',
      value: 0.24,
      description: 'Current marginal rate at or below 24%'
    },
    {
      field: 'outputs.taxableIncome',
      operator: 'gt',
      value: 0,
      description: 'Positive taxable income'
    },
    {
      field: 'derived.bracketHeadroom',
      operator: 'gte',
      value: 10000,
      description: 'At least $10K headroom in current bracket'
    }
  ],

  blockingConditions: [
    {
      field: 'facts.iraDistributions',
      operator: 'missing',
      description: 'Cannot detect without IRA information'
    }
  ],

  evidenceRequirements: [
    'outputs.agi',
    'outputs.taxableIncome',
    'outputs.marginalTaxRate',
    'derived.bracketHeadroom',
    'facts.iraDistributions'
  ],

  scoringHints: {
    baseImpactScore: 70,
    baseRelevanceScore: 80,
    baseUrgencyScore: 50,
    complexityLevel: 'medium'
  },

  suggestedScenarioTemplateIds: ['roth_conversion_bracket_fill'],
  suggestedActionTemplateIds: ['create_roth_scenario', 'irmaa_review'],

  titleTemplate: 'Roth Conversion Opportunity ({{derived.bracketHeadroom}} headroom)',
  summaryTemplate: 'Client may benefit from partial Roth conversion to fill {{outputs.marginalTaxRate}}% bracket. Estimated headroom: ${{derived.bracketHeadroom}}.',
  whySurfacedTemplate: 'Current marginal rate ({{outputs.marginalTaxRate}}%) is relatively low, and there is approximately ${{derived.bracketHeadroom}} of room before entering the next bracket. Converting traditional IRA funds to Roth now may lock in lower rates.'
}
```

### 3.3 Rule 2: IRMAA Proximity Alert

```typescript
{
  ruleId: 'irmaa_proximity_alert_v1',
  name: 'IRMAA Threshold Proximity Detection',
  version: '1.0.0',
  category: 'thresholds',
  opportunityType: 'irmaa_proximity',
  description: 'Alerts when household income is approaching Medicare IRMAA surcharge thresholds.',

  appliesToTaxYears: [2025],
  enabled: true,

  eligibilityConditions: [
    {
      field: 'household.taxpayerAge',
      operator: 'gte',
      value: 60,
      description: 'Taxpayer approaching or in Medicare age range'
    },
    {
      field: 'outputs.agi',
      operator: 'exists',
      description: 'AGI has been calculated'
    }
  ],

  triggerConditions: [
    {
      field: 'thresholds.irmaa_delta',
      operator: 'between',
      minValue: -25000,
      maxValue: 25000,
      description: 'Within $25K of IRMAA threshold'
    }
  ],

  blockingConditions: [],

  evidenceRequirements: [
    'outputs.agi',
    'outputs.magi',
    'thresholds.irmaa_tier_1',
    'thresholds.irmaa_delta'
  ],

  scoringHints: {
    baseImpactScore: 60,
    baseRelevanceScore: 90,
    baseUrgencyScore: 70,
    complexityLevel: 'low'
  },

  suggestedScenarioTemplateIds: ['income_reduction_irmaa'],
  suggestedActionTemplateIds: ['irmaa_planning_discussion', 'distribution_timing_review'],

  titleTemplate: 'IRMAA Threshold Proximity Alert',
  summaryTemplate: 'Client is approximately ${{thresholds.irmaa_delta}} from Medicare IRMAA surcharge threshold.',
  whySurfacedTemplate: 'Modified Adjusted Gross Income (MAGI) of ${{outputs.magi}} is within ${{thresholds.irmaa_delta}} of the IRMAA surcharge threshold. Crossing this threshold triggers additional Medicare Part B and D premiums. Income reduction strategies may help avoid surcharge.'
}
```

### 3.4 Rule 3: Withholding Mismatch

```typescript
{
  ruleId: 'withholding_payment_mismatch_v1',
  name: 'Withholding and Payment Mismatch Detection',
  version: '1.0.0',
  category: 'payments',
  opportunityType: 'withholding_mismatch',
  description: 'Detects significant overpayment or underpayment scenarios.',

  appliesToTaxYears: [2025],
  enabled: true,

  eligibilityConditions: [
    {
      field: 'outputs.totalTaxBeforeCredits',
      operator: 'exists',
      description: 'Total tax calculated'
    },
    {
      field: 'inputs.totalPayments',
      operator: 'exists',
      description: 'Payments data available'
    }
  ],

  triggerConditions: [
    {
      field: 'derived.paymentMismatchPct',
      operator: 'gt',
      value: 15,
      description: 'Payment mismatch exceeds 15%'
    },
    {
      field: 'derived.paymentMismatchAbs',
      operator: 'gt',
      value: 3000,
      description: 'Absolute mismatch exceeds $3,000'
    }
  ],

  blockingConditions: [],

  evidenceRequirements: [
    'outputs.totalTaxBeforeCredits',
    'inputs.federalTaxWithheld',
    'inputs.estimatedTaxPayments',
    'derived.paymentMismatchAbs',
    'derived.paymentMismatchPct'
  ],

  scoringHints: {
    baseImpactScore: 50,
    baseRelevanceScore: 70,
    baseUrgencyScore: 80,
    complexityLevel: 'low'
  },

  suggestedScenarioTemplateIds: ['withholding_adjustment', 'estimated_payment_plan'],
  suggestedActionTemplateIds: ['w4_review', 'safe_harbor_check', 'estimated_payment_setup'],

  titleTemplate: 'Payment and Withholding Review Needed',
  summaryTemplate: 'Current payments are {{derived.paymentMismatchDirection}} by approximately ${{derived.paymentMismatchAbs}} ({{derived.paymentMismatchPct}}%).',
  whySurfacedTemplate: 'Total payments of ${{inputs.totalPayments}} compared to estimated tax of ${{outputs.totalTaxBeforeCredits}} suggests {{#if paymentMismatchDirection === "under"}}potential underpayment penalty risk{{else}}inefficient use of cash flow{{/if}}. Adjusting withholding or estimated payments may be beneficial.'
}
```

### 3.5 Rule Evaluation Engine

```typescript
// src/lib/opportunity-engine/rule-evaluator.ts

export class RuleEvaluator {
  /**
   * Evaluate a single rule against household context
   */
  evaluateRule(
    rule: OpportunityRule,
    context: OpportunityContext
  ): RuleEvaluationResult {
    // Check eligibility
    const eligibilityResult = this.evaluateConditions(
      rule.eligibilityConditions,
      context
    );

    if (!eligibilityResult.passed) {
      return {
        ruleId: rule.ruleId,
        triggered: false,
        eligible: false,
        reason: 'Eligibility conditions not met',
        failedConditions: eligibilityResult.failedConditions,
      };
    }

    // Check blockers
    const blockerResult = this.evaluateConditions(
      rule.blockingConditions,
      context
    );

    if (blockerResult.passed) {
      return {
        ruleId: rule.ruleId,
        triggered: false,
        eligible: true,
        blocked: true,
        reason: 'Blocking conditions present',
        failedConditions: blockerResult.passedConditions,
      };
    }

    // Check triggers
    const triggerResult = this.evaluateConditions(
      rule.triggerConditions,
      context
    );

    if (!triggerResult.passed) {
      return {
        ruleId: rule.ruleId,
        triggered: false,
        eligible: true,
        blocked: false,
        reason: 'Trigger conditions not met',
        failedConditions: triggerResult.failedConditions,
      };
    }

    // Rule triggered!
    return {
      ruleId: rule.ruleId,
      triggered: true,
      eligible: true,
      blocked: false,
      evidence: this.gatherEvidence(rule, context),
    };
  }

  /**
   * Evaluate a list of conditions
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    context: OpportunityContext
  ): ConditionEvaluationResult {
    const results = conditions.map(condition =>
      this.evaluateCondition(condition, context)
    );

    const passed = results.every(r => r.passed);
    const failedConditions = results.filter(r => !r.passed).map(r => r.condition);
    const passedConditions = results.filter(r => r.passed).map(r => r.condition);

    return {
      passed,
      failedConditions,
      passedConditions,
    };
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: OpportunityContext
  ): { passed: boolean; condition: RuleCondition } {
    const value = this.getFieldValue(condition.field, context);
    const passed = this.compareValues(value, condition);

    return { passed, condition };
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(field: string, context: OpportunityContext): unknown {
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current == null) return null;
      current = current[part];
    }

    return current;
  }

  /**
   * Compare value against condition
   */
  private compareValues(value: unknown, condition: RuleCondition): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (condition.value as number);
      case 'exists':
        return value != null;
      case 'missing':
        return value == null;
      case 'between':
        return (
          typeof value === 'number' &&
          value >= (condition.minValue as number) &&
          value <= (condition.maxValue as number)
        );
      case 'in':
        return condition.values?.includes(value) ?? false;
      case 'not_in':
        return !condition.values?.includes(value) ?? false;
      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }
  }

  /**
   * Gather evidence for triggered rule
   */
  private gatherEvidence(
    rule: OpportunityRule,
    context: OpportunityContext
  ): OpportunityEvidence {
    const supportingFacts: EvidenceFactRef[] = [];
    const supportingOutputs: EvidenceOutputRef[] = [];
    const supportingThresholds: EvidenceThresholdRef[] = [];

    // Extract evidence from required fields
    for (const field of rule.evidenceRequirements) {
      const value = this.getFieldValue(field, context);

      if (field.startsWith('facts.')) {
        supportingFacts.push({
          field: field.replace('facts.', ''),
          value,
          label: this.getFieldLabel(field),
        });
      } else if (field.startsWith('outputs.')) {
        supportingOutputs.push({
          field: field.replace('outputs.', ''),
          value,
          label: this.getFieldLabel(field),
          sourceRunId: context.sourceRunId,
        });
      } else if (field.startsWith('thresholds.')) {
        const thresholdName = field.replace('thresholds.', '');
        const currentValue = this.getFieldValue(`outputs.${thresholdName}`, context) as number;
        const thresholdValue = value as number;

        supportingThresholds.push({
          thresholdName,
          currentValue,
          thresholdValue,
          delta: currentValue - thresholdValue,
          percentToThreshold: (currentValue / thresholdValue) * 100,
        });
      }
    }

    return {
      supportingFacts,
      supportingOutputs,
      supportingThresholds,
      supportingTraceRefs: [], // Populated from trace system
      warnings: context.warnings || [],
      unsupportedItems: context.unsupportedItems || [],
    };
  }
}
```

---

## 4. Scoring Algorithms

### 4.1 Composite Scoring Formula

```typescript
// src/lib/opportunity-engine/scoring.ts

export class OpportunityScorer {
  /**
   * Calculate composite opportunity score
   */
  calculateScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
  ): OpportunityScore {
    // Calculate component scores
    const impactScore = this.calculateImpactScore(opportunity, context);
    const relevanceScore = this.calculateRelevanceScore(opportunity, context);
    const urgencyScore = this.calculateUrgencyScore(opportunity, context);
    const confidenceScore = this.calculateConfidenceScore(opportunity, context);
    const completenessScore = this.calculateCompletenessScore(opportunity, context);
    const complexityPenalty = this.calculateComplexityPenalty(opportunity);

    // Calculate weighted composite
    const overall =
      impactScore * weights.impact +
      relevanceScore * weights.relevance +
      urgencyScore * weights.urgency +
      confidenceScore * weights.confidence +
      completenessScore * weights.completeness -
      complexityPenalty * weights.complexityPenalty;

    return {
      overall: Math.max(0, Math.min(100, overall)),
      impactScore,
      relevanceScore,
      urgencyScore,
      confidenceScore,
      completenessScore,
      complexityPenalty,
      weightingFormula: weights,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Impact Score (0-100)
   * Based on estimated dollar value and household income ratio
   */
  private calculateImpactScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext
  ): number {
    if (!opportunity.estimatedImpact) {
      // Use qualitative if no dollar estimate
      const qualMap = { low: 30, medium: 60, high: 90 };
      return qualMap[opportunity.estimatedImpact?.qualitativeLabel || 'medium'];
    }

    const impact = opportunity.estimatedImpact;
    const avgImpact = ((impact.minValue || 0) + (impact.maxValue || 0)) / 2;
    const agi = context.outputs.agi || 100000;

    // Score based on % of AGI
    const pctOfAGI = (avgImpact / agi) * 100;

    if (pctOfAGI >= 5) return 100; // 5%+ of AGI = max impact
    if (pctOfAGI >= 2) return 80;
    if (pctOfAGI >= 1) return 60;
    if (pctOfAGI >= 0.5) return 40;
    return 20;
  }

  /**
   * Relevance Score (0-100)
   * Based on household profile match and timing
   */
  private calculateRelevanceScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext
  ): number {
    let score = 50; // Base relevance

    // Adjust for household age appropriateness
    if (opportunity.category === 'roth' && context.household.taxpayerAge < 60) {
      score += 20; // Younger = more time to benefit
    }

    if (opportunity.category === 'retirement_income' && context.household.taxpayerAge >= 65) {
      score += 20; // Age-appropriate
    }

    // Adjust for timing
    if (context.taxYear === new Date().getFullYear()) {
      score += 15; // Current year = more relevant
    }

    // Adjust for household wealth tier
    const agi = context.outputs.agi || 0;
    if (opportunity.category === 'capital_gains' && agi > 300000) {
      score += 15; // More relevant for high earners
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Urgency Score (0-100)
   * Based on time sensitivity and deadline proximity
   */
  private calculateUrgencyScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext
  ): number {
    let score = 50; // Base urgency

    // Year-end planning is more urgent in Q4
    const month = new Date().getMonth() + 1;
    if (month >= 10 && month <= 12) {
      score += 20; // Q4 boost
    }

    // Threshold proximity increases urgency
    if (opportunity.category === 'thresholds') {
      score += 30;
    }

    // Payment mismatches are urgent
    if (opportunity.category === 'payments') {
      score += 25;
    }

    // Life transitions are time-sensitive
    if (opportunity.category === 'transition') {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Confidence Score (0-100)
   * Based on data completeness and assumption count
   */
  private calculateConfidenceScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext
  ): number {
    const confidenceMap = {
      high: 90,
      medium: 60,
      low: 30,
    };

    let score = confidenceMap[opportunity.confidence || 'medium'];

    // Adjust for data completeness
    const completeness = opportunity.dataCompleteness || 50;
    const completenessAdjustment = (completeness - 50) / 5; // +/- 10 points
    score += completenessAdjustment;

    // Penalize for warnings
    const warningCount = opportunity.evidence?.warnings?.length || 0;
    score -= warningCount * 5;

    // Penalize for missing info
    const missingCount = opportunity.missingInfo?.length || 0;
    score -= missingCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Completeness Score (0-100)
   * Percentage of required data available
   */
  private calculateCompletenessScore(
    opportunity: Partial<Opportunity>,
    context: OpportunityContext
  ): number {
    return opportunity.dataCompleteness || 50;
  }

  /**
   * Complexity Penalty (0-100)
   * Higher complexity = higher penalty (subtracted from overall)
   */
  private calculateComplexityPenalty(opportunity: Partial<Opportunity>): number {
    const complexityMap = {
      low: 0,
      medium: 10,
      high: 25,
    };

    return complexityMap[opportunity.complexity || 'medium'];
  }
}
```

### 4.2 Ranking and Deduplication

```typescript
// src/lib/opportunity-engine/ranking.ts

export class OpportunityRanker {
  /**
   * Rank and deduplicate opportunities
   */
  rankOpportunities(
    opportunities: Opportunity[],
    options?: RankingOptions
  ): RankedOpportunity[] {
    // Step 1: Deduplicate overlapping opportunities
    const deduplicated = this.deduplicateOpportunities(opportunities);

    // Step 2: Sort by overall score descending
    const sorted = deduplicated.sort((a, b) =>
      b.score.overall - a.score.overall
    );

    // Step 3: Apply grouping
    const grouped = this.groupOpportunities(sorted);

    // Step 4: Apply limits if specified
    const limited = options?.maxOpportunities
      ? sorted.slice(0, options.maxOpportunities)
      : sorted;

    return limited.map((opp, index) => ({
      ...opp,
      rank: index + 1,
    }));
  }

  /**
   * Deduplicate overlapping opportunities
   */
  private deduplicateOpportunities(
    opportunities: Opportunity[]
  ): Opportunity[] {
    const deduplicationRules: DeduplicationRule[] = [
      {
        // Merge Roth conversion + bracket headroom
        primaryType: 'roth_conversion_headroom',
        relatedTypes: ['bracket_fill_opportunity'],
        mergeStrategy: 'merge_as_consideration',
      },
      {
        // Merge IRMAA alert + Roth conversion
        primaryType: 'irmaa_proximity',
        relatedTypes: ['roth_conversion_headroom'],
        mergeStrategy: 'add_caution_note',
      },
      {
        // Merge gain harvesting + NIIT exposure
        primaryType: 'capital_gains_harvesting',
        relatedTypes: ['niit_exposure_alert'],
        mergeStrategy: 'merge_as_consideration',
      },
    ];

    const result: Opportunity[] = [];
    const processed = new Set<string>();

    for (const opp of opportunities) {
      if (processed.has(opp.opportunityId)) continue;

      // Find deduplication rule
      const rule = deduplicationRules.find(
        r => r.primaryType === opp.opportunityType
      );

      if (!rule) {
        result.push(opp);
        processed.add(opp.opportunityId);
        continue;
      }

      // Find related opportunities
      const related = opportunities.filter(
        o => rule.relatedTypes.includes(o.opportunityType) &&
             !processed.has(o.opportunityId)
      );

      if (related.length === 0) {
        result.push(opp);
        processed.add(opp.opportunityId);
        continue;
      }

      // Merge according to strategy
      const merged = this.mergeOpportunities(opp, related, rule);
      result.push(merged);

      processed.add(opp.opportunityId);
      related.forEach(r => processed.add(r.opportunityId));
    }

    return result;
  }

  /**
   * Merge opportunities based on strategy
   */
  private mergeOpportunities(
    primary: Opportunity,
    related: Opportunity[],
    rule: DeduplicationRule
  ): Opportunity {
    if (rule.mergeStrategy === 'merge_as_consideration') {
      // Add related opportunities as considerations
      const considerations = related.map(r => ({
        type: r.opportunityType,
        title: r.title,
        summary: r.summary,
      }));

      return {
        ...primary,
        summary: `${primary.summary}\n\nRelated considerations: ${considerations.map(c => c.title).join(', ')}`,
        // Store considerations in metadata
      };
    }

    if (rule.mergeStrategy === 'add_caution_note') {
      // Add caution notes to missing info
      const cautions: MissingInfoItem[] = related.map(r => ({
        field: r.opportunityType,
        message: `Caution: ${r.title} - ${r.summary}`,
        severity: 'warning',
      }));

      return {
        ...primary,
        missingInfo: [...(primary.missingInfo || []), ...cautions],
      };
    }

    return primary;
  }

  /**
   * Group opportunities by category
   */
  private groupOpportunities(
    opportunities: Opportunity[]
  ): GroupedOpportunities {
    const groups: Record<OpportunityCategory, Opportunity[]> = {
      roth: [],
      capital_gains: [],
      charitable: [],
      payments: [],
      retirement_income: [],
      thresholds: [],
      transition: [],
    };

    for (const opp of opportunities) {
      groups[opp.category].push(opp);
    }

    return {
      all: opportunities,
      byCategory: groups,
      topPriority: opportunities.slice(0, 3),
    };
  }
}
```

---

## 5. API Contracts

### 5.1 Detect Opportunities

**Endpoint:** `POST /api/opportunity-detections`

**Request:**
```typescript
interface DetectOpportunitiesRequest {
  householdId: string;
  taxYear: number;
  sourceRunId: string; // Baseline calculation run ID
  options?: {
    rulePackageVersion?: string; // Default: latest
    maxOpportunities?: number; // Default: unlimited
    enabledCategories?: OpportunityCategory[]; // Default: all
    firmOverrides?: Record<string, unknown>; // Firm-specific settings
  };
}
```

**Response:**
```typescript
interface DetectOpportunitiesResponse {
  detectionId: string;
  status: 'completed' | 'failed';
  householdId: string;
  taxYear: number;
  sourceRunId: string;

  // Results
  opportunityCount: number;
  ruleEvaluationCount: number;

  // Opportunities (abbreviated list)
  opportunities: {
    opportunityId: string;
    title: string;
    category: OpportunityCategory;
    score: number;
    confidence: Confidence;
  }[];

  // Metadata
  engineVersion: string;
  rulePackageVersion: string;
  executionTimeMs: number;

  // Diagnostics
  errors?: string[];
  warnings?: string[];
}
```

**Example:**
```json
{
  "householdId": "hh_123",
  "taxYear": 2025,
  "sourceRunId": "calc_abc123"
}
```

---

### 5.2 List Opportunities

**Endpoint:** `GET /api/households/{householdId}/opportunities`

**Query Parameters:**
```typescript
interface ListOpportunitiesParams {
  taxYear?: number;
  category?: OpportunityCategory;
  status?: OpportunityStatus;
  minScore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'score' | 'created' | 'updated' | 'urgency';
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**
```typescript
interface ListOpportunitiesResponse {
  opportunities: Opportunity[];
  total: number;
  limit: number;
  offset: number;
  grouped?: GroupedOpportunities;
}
```

---

### 5.3 Get Opportunity Detail

**Endpoint:** `GET /api/opportunities/{opportunityId}`

**Response:**
```typescript
interface GetOpportunityResponse {
  opportunity: Opportunity; // Full object with all fields
  relatedScenarios?: ScenarioSummary[];
  relatedTasks?: TaskSummary[];
  auditHistory?: OpportunityAuditEvent[];
}
```

---

### 5.4 Update Opportunity Status

**Endpoint:** `PATCH /api/opportunities/{opportunityId}`

**Request:**
```typescript
interface UpdateOpportunityRequest {
  status?: OpportunityStatus;
  reviewedBy?: string;
  notes?: string;
}
```

**Response:**
```typescript
interface UpdateOpportunityResponse {
  opportunity: Opportunity;
  auditEvent: OpportunityAuditEvent;
}
```

---

### 5.5 Convert to Scenario

**Endpoint:** `POST /api/opportunities/{opportunityId}/create-scenario`

**Request:**
```typescript
interface CreateScenarioFromOpportunityRequest {
  scenarioTemplateId?: string; // Use suggested template or custom
  customInputs?: Record<string, unknown>;
  name?: string;
  description?: string;
}
```

**Response:**
```typescript
interface CreateScenarioFromOpportunityResponse {
  scenarioId: string;
  opportunity: Opportunity; // Updated with scenario_created status
  scenario: ScenarioSummary;
}
```

---

### 5.6 Convert to Task

**Endpoint:** `POST /api/opportunities/{opportunityId}/create-task`

**Request:**
```typescript
interface CreateTaskFromOpportunityRequest {
  taskTemplateId?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}
```

**Response:**
```typescript
interface CreateTaskFromOpportunityResponse {
  taskId: string;
  opportunity: Opportunity; // Updated with converted_to_task status
  task: TaskSummary;
}
```

---

## 6. Event Payloads

### 6.1 Event Schema

```typescript
// src/types/opportunity-events.ts

export type OpportunityEventName =
  | 'opportunity_detection.started'
  | 'opportunity_detection.completed'
  | 'opportunity_detection.failed'
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'opportunity.status_changed'
  | 'opportunity.reviewed'
  | 'opportunity.dismissed'
  | 'opportunity.converted_to_scenario'
  | 'opportunity.converted_to_task'
  | 'opportunity.superseded';

export interface OpportunityEvent {
  eventId: string;
  eventName: OpportunityEventName;
  version: string; // Event schema version
  timestamp: string; // ISO 8601

  // Context
  householdId: string;
  taxYear: number;
  opportunityId?: string; // Not present for detection.* events
  detectionId?: string;

  // Actor
  actor?: string; // 'system' | advisorId
  actorType?: 'system' | 'advisor' | 'client';

  // Payload
  data: Record<string, unknown>;

  // Metadata
  correlationId?: string;
  causationId?: string;
  sessionId?: string;
}
```

### 6.2 Event Examples

**opportunity_detection.completed:**
```json
{
  "eventId": "evt_001",
  "eventName": "opportunity_detection.completed",
  "version": "1.0.0",
  "timestamp": "2026-03-30T21:00:00Z",
  "householdId": "hh_123",
  "taxYear": 2025,
  "detectionId": "det_001",
  "actor": "system",
  "actorType": "system",
  "data": {
    "sourceRunId": "calc_abc123",
    "opportunityCount": 5,
    "ruleEvaluationCount": 12,
    "executionTimeMs": 245,
    "triggeredRuleIds": [
      "roth_conversion_headroom_v1",
      "irmaa_proximity_alert_v1",
      "withholding_payment_mismatch_v1"
    ]
  }
}
```

**opportunity.created:**
```json
{
  "eventId": "evt_002",
  "eventName": "opportunity.created",
  "version": "1.0.0",
  "timestamp": "2026-03-30T21:00:01Z",
  "householdId": "hh_123",
  "taxYear": 2025,
  "opportunityId": "opp_001",
  "detectionId": "det_001",
  "actor": "system",
  "actorType": "system",
  "data": {
    "opportunityType": "roth_conversion_headroom",
    "category": "roth",
    "score": 88.5,
    "confidence": "high",
    "estimatedImpactMin": 5000,
    "estimatedImpactMax": 15000
  }
}
```

**opportunity.status_changed:**
```json
{
  "eventId": "evt_003",
  "eventName": "opportunity.status_changed",
  "version": "1.0.0",
  "timestamp": "2026-03-30T21:15:00Z",
  "householdId": "hh_123",
  "taxYear": 2025,
  "opportunityId": "opp_001",
  "actor": "advisor_456",
  "actorType": "advisor",
  "data": {
    "previousStatus": "new",
    "newStatus": "reviewed",
    "notes": "Discussed with client, will model in Q4"
  }
}
```

**opportunity.converted_to_scenario:**
```json
{
  "eventId": "evt_004",
  "eventName": "opportunity.converted_to_scenario",
  "version": "1.0.0",
  "timestamp": "2026-03-30T21:20:00Z",
  "householdId": "hh_123",
  "taxYear": 2025,
  "opportunityId": "opp_001",
  "actor": "advisor_456",
  "actorType": "advisor",
  "data": {
    "scenarioId": "scn_001",
    "scenarioTemplateId": "roth_conversion_bracket_fill",
    "scenarioName": "Roth Conversion - $30K",
    "inputs": {
      "rothConversionAmount": 30000
    }
  }
}
```

---

## 7. Sample Outputs

### 7.1 Sample Opportunity Object (Roth Conversion)

```json
{
  "opportunityId": "opp_abc123",
  "householdId": "hh_789",
  "taxYear": 2025,
  "sourceRunId": "calc_def456",
  "detectionId": "det_ghi789",

  "opportunityType": "roth_conversion_headroom",
  "category": "roth",

  "title": "Roth Conversion Opportunity ($42,000 headroom)",
  "summary": "Client may benefit from partial Roth conversion to fill 24% bracket. Estimated headroom: $42,000.",
  "whyItSurfaced": "Current marginal rate (24%) is relatively low, and there is approximately $42,000 of room before entering the 32% bracket. Converting traditional IRA funds to Roth now may lock in lower rates and reduce future RMDs.",

  "evidence": {
    "supportingFacts": [
      {
        "field": "iraDistributions",
        "value": 15000,
        "label": "IRA Distributions",
        "sourceFactId": "fact_001",
        "sourceFactVersion": 1
      }
    ],
    "supportingOutputs": [
      {
        "field": "agi",
        "value": 185000,
        "label": "Adjusted Gross Income",
        "sourceRunId": "calc_def456"
      },
      {
        "field": "taxableIncome",
        "value": 155000,
        "label": "Taxable Income",
        "sourceRunId": "calc_def456"
      },
      {
        "field": "marginalTaxRate",
        "value": 0.24,
        "label": "Marginal Tax Rate",
        "sourceRunId": "calc_def456"
      }
    ],
    "supportingThresholds": [
      {
        "thresholdName": "bracket_24_to_32_mfj",
        "currentValue": 155000,
        "thresholdValue": 197000,
        "delta": -42000,
        "percentToThreshold": 78.7
      }
    ],
    "supportingTraceRefs": ["trace_step_09", "trace_step_10"],
    "warnings": [],
    "unsupportedItems": []
  },

  "score": {
    "overall": 88.5,
    "impactScore": 85,
    "relevanceScore": 90,
    "urgencyScore": 60,
    "confidenceScore": 95,
    "completenessScore": 100,
    "complexityPenalty": 10,
    "weightingFormula": {
      "impact": 0.30,
      "relevance": 0.20,
      "urgency": 0.15,
      "confidence": 0.15,
      "completeness": 0.10,
      "householdFit": 0.10,
      "complexityPenalty": -0.20
    },
    "calculatedAt": "2026-03-30T21:00:02Z"
  },

  "confidence": "high",
  "estimatedImpact": {
    "type": "tax_savings",
    "minValue": 5000,
    "maxValue": 15000,
    "qualitativeLabel": "high",
    "notes": "Estimated based on 24% vs projected future 32% rate. Actual value depends on conversion amount and future tax rates.",
    "calculationMethod": "bracket_fill_projection"
  },
  "complexity": "medium",
  "urgency": "medium",
  "dataCompleteness": 100,

  "missingInfo": [],

  "recommendationStatus": "new",

  "suggestedNextActions": [
    {
      "actionType": "create_scenario",
      "label": "Model Roth Conversion Scenarios",
      "priority": "high",
      "details": "Create scenarios for $20K, $30K, and full $42K conversions",
      "estimatedTime": "15 minutes"
    },
    {
      "actionType": "client_discussion",
      "label": "Schedule Planning Discussion",
      "priority": "high",
      "details": "Review Roth conversion strategy and IRMAA considerations"
    },
    {
      "actionType": "coordinate_cpa",
      "label": "Coordinate with CPA",
      "priority": "medium",
      "details": "Confirm timing and tax withholding strategy"
    }
  ],

  "suggestedScenarioTemplates": [
    {
      "scenarioTemplateId": "roth_conversion_bracket_fill",
      "name": "Roth Conversion - Bracket Fill",
      "description": "Model Roth conversion up to next tax bracket threshold",
      "category": "roth_conversion"
    }
  ],

  "detectionRuleId": "roth_conversion_headroom_v1",
  "engineVersion": "1.0.0",
  "rulesVersion": "2025-v1.0.0",

  "createdAt": "2026-03-30T21:00:02Z",
  "updatedAt": "2026-03-30T21:00:02Z",
  "createdBy": "system"
}
```

### 7.2 Sample Grouped Opportunities View

```json
{
  "householdId": "hh_789",
  "taxYear": 2025,
  "total": 5,

  "topPriority": [
    {
      "opportunityId": "opp_abc123",
      "title": "Roth Conversion Opportunity ($42,000 headroom)",
      "category": "roth",
      "score": 88.5,
      "confidence": "high",
      "estimatedImpact": {
        "type": "tax_savings",
        "minValue": 5000,
        "maxValue": 15000
      }
    },
    {
      "opportunityId": "opp_abc124",
      "title": "IRMAA Threshold Proximity Alert",
      "category": "thresholds",
      "score": 82.0,
      "confidence": "high",
      "estimatedImpact": {
        "type": "threshold_management",
        "minValue": 2000,
        "maxValue": 8000
      }
    },
    {
      "opportunityId": "opp_abc125",
      "title": "Withholding Adjustment Needed",
      "category": "payments",
      "score": 75.5,
      "confidence": "high",
      "estimatedImpact": {
        "type": "cash_flow_alignment",
        "minValue": 3000,
        "maxValue": 5000
      }
    }
  ],

  "byCategory": {
    "roth": [
      {
        "opportunityId": "opp_abc123",
        "title": "Roth Conversion Opportunity ($42,000 headroom)",
        "score": 88.5
      }
    ],
    "thresholds": [
      {
        "opportunityId": "opp_abc124",
        "title": "IRMAA Threshold Proximity Alert",
        "score": 82.0
      }
    ],
    "payments": [
      {
        "opportunityId": "opp_abc125",
        "title": "Withholding Adjustment Needed",
        "score": 75.5
      }
    ],
    "charitable": [
      {
        "opportunityId": "opp_abc126",
        "title": "Charitable Bunching Opportunity",
        "score": 68.0
      }
    ],
    "capital_gains": [
      {
        "opportunityId": "opp_abc127",
        "title": "Capital Gains Harvesting Opportunity",
        "score": 62.5
      }
    ],
    "retirement_income": [],
    "transition": []
  }
}
```

---

## 8. Golden Test Cases

### 8.1 Test Household 1: Retiree with IRA + Social Security

```typescript
const goldenHousehold1: GoldenTestCase = {
  testId: 'golden_hh_001',
  name: 'Retiree with IRA + Social Security',
  description: 'Age 68, MFJ, $180K AGI, IRA distributions, SS benefits',

  inputs: {
    householdId: 'test_hh_001',
    taxYear: 2025,
    filingStatus: 'married_filing_jointly',
    taxpayerAge: 68,

    facts: {
      wages: 0,
      iraDistributions: 45000,
      iraDistributionsTaxable: 45000,
      socialSecurityBenefits: 48000,
      socialSecurityBenefitsTaxable: 40800, // 85% taxable
      taxableInterest: 3500,
      ordinaryDividends: 8000,
      qualifiedDividends: 8000,
    },

    outputs: {
      agi: 97300,
      standardDeduction: 30000,
      taxableIncome: 67300,
      ordinaryIncomeTax: 7500,
      marginalTaxRate: 0.12,
      totalTaxBeforeCredits: 7500,
    },

    derived: {
      bracketHeadroom: 27700, // Room in 12% bracket
      irmaa_delta: -97700, // $97,300 AGI vs $195K IRMAA threshold (MFJ)
    }
  },

  expectedOpportunities: [
    {
      opportunityType: 'roth_conversion_headroom',
      shouldTrigger: true,
      expectedConfidence: 'high',
      expectedScore: { min: 80, max: 95 },
      expectedImpact: { minValue: 3000, maxValue: 8000 },
    },
    {
      opportunityType: 'qcd_review',
      shouldTrigger: true,
      expectedConfidence: 'medium',
      expectedScore: { min: 65, max: 80 },
    },
    {
      opportunityType: 'distribution_sequencing_review',
      shouldTrigger: true,
      expectedConfidence: 'medium',
      expectedScore: { min: 60, max: 75 },
    },
  ],

  expectedBlockedOpportunities: [],

  expectedGrouping: {
    primaryOpportunity: 'roth_conversion_headroom',
    relatedConsiderations: ['irmaa_proximity'], // Not triggered but noted
  }
};
```

### 8.2 Test Household 2: High Earner with Capital Gains

```typescript
const goldenHousehold2: GoldenTestCase = {
  testId: 'golden_hh_002',
  name: 'High Earner with Capital Gains',
  description: 'Age 45, MFJ, $450K wages, $75K LT cap gains, near NIIT threshold',

  inputs: {
    householdId: 'test_hh_002',
    taxYear: 2025,
    filingStatus: 'married_filing_jointly',
    taxpayerAge: 45,

    facts: {
      wages: 450000,
      taxableInterest: 8000,
      ordinaryDividends: 15000,
      qualifiedDividends: 15000,
      capitalGainLossNet: 75000,
      childTaxCredit: 4000,
      taxWithheld: 85000,
    },

    outputs: {
      agi: 548000,
      standardDeduction: 30000,
      taxableIncome: 518000,
      ordinaryIncomeTax: 95000,
      capitalGainsTax: 15000,
      niit: 3420, // 3.8% on $90K investment income
      totalTaxBeforeCredits: 113420,
      taxAfterCredits: 109420,
      totalPayments: 85000,
      taxDue: 24420,
    },

    derived: {
      niit_delta: 298000, // $548K AGI vs $250K NIIT threshold
      paymentMismatchAbs: 24420,
      paymentMismatchPct: 22.3,
      paymentMismatchDirection: 'under',
    }
  },

  expectedOpportunities: [
    {
      opportunityType: 'withholding_payment_mismatch',
      shouldTrigger: true,
      expectedConfidence: 'high',
      expectedScore: { min: 75, max: 90 },
      expectedImpact: { minValue: 20000, maxValue: 25000 },
    },
    {
      opportunityType: 'niit_exposure_alert',
      shouldTrigger: true,
      expectedConfidence: 'high',
      expectedScore: { min: 70, max: 85 },
    },
    {
      opportunityType: 'capital_gains_timing',
      shouldTrigger: true,
      expectedConfidence: 'medium',
      expectedScore: { min: 60, max: 75 },
    },
  ],

  expectedBlockedOpportunities: [],

  expectedGrouping: {
    primaryOpportunity: 'withholding_payment_mismatch',
    relatedConsiderations: ['niit_exposure_alert'],
  }
};
```

### 8.3 Test Household 3: Incomplete Data / Missing Basis

```typescript
const goldenHousehold3: GoldenTestCase = {
  testId: 'golden_hh_003',
  name: 'Incomplete Data - Missing IRA Basis',
  description: 'Potential Roth opportunity but IRA basis unknown',

  inputs: {
    householdId: 'test_hh_003',
    taxYear: 2025,
    filingStatus: 'married_filing_jointly',
    taxpayerAge: 62,

    facts: {
      wages: 120000,
      iraDistributions: 10000,
      iraDistributionsTaxable: null, // MISSING
      iraBasis: null, // MISSING
    },

    outputs: {
      agi: 130000,
      taxableIncome: 100000,
      marginalTaxRate: 0.22,
    },

    derived: {
      bracketHeadroom: 55000,
    }
  },

  expectedOpportunities: [
    {
      opportunityType: 'roth_conversion_headroom',
      shouldTrigger: true,
      expectedConfidence: 'medium', // Downgraded due to missing data
      expectedScore: { min: 60, max: 75 },
      expectedMissingInfo: [
        {
          field: 'iraBasis',
          severity: 'warning',
          message: 'IRA contribution basis incomplete'
        }
      ],
    },
  ],

  expectedBlockedOpportunities: [],
};
```

### 8.4 Test Household 4: No Opportunities (Low Income, Simple)

```typescript
const goldenHousehold4: GoldenTestCase = {
  testId: 'golden_hh_004',
  name: 'Simple W-2 Household - No Opportunities',
  description: 'Standard deduction, no investment income, balanced withholding',

  inputs: {
    householdId: 'test_hh_004',
    taxYear: 2025,
    filingStatus: 'married_filing_jointly',
    taxpayerAge: 35,

    facts: {
      wages: 95000,
      taxWithheld: 12000,
    },

    outputs: {
      agi: 95000,
      standardDeduction: 30000,
      taxableIncome: 65000,
      ordinaryIncomeTax: 7300,
      totalTaxBeforeCredits: 7300,
      taxAfterCredits: 7300,
      totalPayments: 12000,
      refund: 4700,
    },

    derived: {
      paymentMismatchAbs: 4700,
      paymentMismatchPct: 64.4,
      paymentMismatchDirection: 'over',
    }
  },

  expectedOpportunities: [
    {
      opportunityType: 'withholding_payment_mismatch',
      shouldTrigger: true,
      expectedConfidence: 'high',
      expectedScore: { min: 55, max: 70 }, // Lower score (less urgent)
      expectedImpact: { minValue: 3000, maxValue: 5000 },
    },
  ],

  expectedBlockedOpportunities: [
    'roth_conversion_headroom', // No IRA distributions
    'niit_exposure_alert', // No investment income
    'irmaa_proximity', // Too young
    'qcd_review', // Too young
  ],
};
```

### 8.5 QA Test Matrix

```typescript
const qaTestMatrix: QATestMatrix = {
  ruleTests: [
    {
      ruleId: 'roth_conversion_headroom_v1',
      positiveTests: ['golden_hh_001', 'golden_hh_003'],
      negativeTests: ['golden_hh_004'],
      blockerTests: [],
      missingDataTests: ['golden_hh_003'],
    },
    {
      ruleId: 'withholding_payment_mismatch_v1',
      positiveTests: ['golden_hh_002', 'golden_hh_004'],
      negativeTests: ['golden_hh_001'],
      blockerTests: [],
      missingDataTests: [],
    },
    {
      ruleId: 'niit_exposure_alert_v1',
      positiveTests: ['golden_hh_002'],
      negativeTests: ['golden_hh_001', 'golden_hh_004'],
      blockerTests: [],
      missingDataTests: [],
    },
  ],

  scoringTests: [
    {
      testId: 'scoring_stability_001',
      description: 'Same inputs produce same score',
      input: 'golden_hh_001',
      expectedScoreVariance: 0,
    },
    {
      testId: 'scoring_order_001',
      description: 'Higher impact scores higher than lower impact',
      inputs: ['golden_hh_001', 'golden_hh_004'],
      expectedOrder: ['golden_hh_001', 'golden_hh_004'],
    },
  ],

  deduplicationTests: [
    {
      testId: 'dedup_roth_irmaa_001',
      description: 'Roth conversion + IRMAA alert merge correctly',
      inputs: [
        { opportunityType: 'roth_conversion_headroom', score: 88 },
        { opportunityType: 'irmaa_proximity', score: 75 },
      ],
      expectedOutput: {
        primaryType: 'roth_conversion_headroom',
        mergedConsiderations: ['irmaa_proximity'],
        resultCount: 1,
      },
    },
  ],
};
```

---

## 9. Implementation Roadmap

### Sprint 1: Foundation (Week 1)
- [ ] Create TypeScript schemas (section 1)
- [ ] Create Prisma database schema (section 2)
- [ ] Set up opportunity context interface
- [ ] Create rule authoring framework
- [ ] Create rule registry structure

**Deliverables:**
- `src/types/opportunity-engine.ts`
- Updated `prisma/schema.prisma`
- `src/lib/opportunity-engine/rule-registry.ts`
- Migration: `npx prisma migrate dev --name add_opportunity_engine`

---

### Sprint 2: First Rules (Week 1-2)
- [ ] Build rule evaluator (section 3.5)
- [ ] Implement Rule 1: Roth Conversion Headroom (section 3.2)
- [ ] Implement Rule 2: IRMAA Proximity (section 3.3)
- [ ] Implement Rule 3: Withholding Mismatch (section 3.4)
- [ ] Create test cases for all 3 rules

**Deliverables:**
- `src/lib/opportunity-engine/rule-evaluator.ts`
- `src/lib/opportunity-engine/rules/roth-conversion-headroom.ts`
- `src/lib/opportunity-engine/rules/irmaa-proximity.ts`
- `src/lib/opportunity-engine/rules/withholding-mismatch.ts`
- `src/lib/opportunity-engine/rules/__tests__/rule-evaluation.test.ts`

---

### Sprint 3: Additional Rules (Week 2)
- [ ] Implement Rule 4: Charitable Bunching
- [ ] Implement Rule 5: QCD Review
- [ ] Implement Rule 6: Capital Gains Harvesting
- [ ] Create OPPORTUNITY_RULES_2025_V1 package

**Deliverables:**
- 3 additional rule modules
- `src/lib/opportunity-engine/rules/rule-package-2025-v1.ts`
- Test coverage for all 6 rules

---

### Sprint 4: Scoring & Ranking (Week 2-3)
- [ ] Implement scoring engine (section 4.1)
- [ ] Implement ranking engine (section 4.2)
- [ ] Implement deduplication logic
- [ ] Implement confidence calculation
- [ ] Implement missing-data framework

**Deliverables:**
- `src/lib/opportunity-engine/scoring.ts`
- `src/lib/opportunity-engine/ranking.ts`
- `src/lib/opportunity-engine/deduplication.ts`
- Scoring QA tests

---

### Sprint 5: Detection Pipeline (Week 3)
- [ ] Build detection orchestrator
- [ ] Implement opportunity persistence
- [ ] Implement audit logging
- [ ] Implement supersede logic
- [ ] Create detection run management

**Deliverables:**
- `src/lib/opportunity-engine/orchestrator.ts`
- `src/lib/opportunity-engine/persistence.ts`
- Detection pipeline end-to-end tests

---

### Sprint 6: API & Events (Week 3-4)
- [ ] Implement API endpoints (section 5)
- [ ] Implement event emission (section 6)
- [ ] Implement scenario conversion hooks
- [ ] Implement task conversion hooks
- [ ] Create API integration tests

**Deliverables:**
- `src/app/api/opportunity-detections/route.ts`
- `src/app/api/opportunities/[id]/route.ts`
- `src/lib/opportunity-engine/events.ts`
- API documentation

---

### Sprint 7: QA & Hardening (Week 4)
- [ ] Create golden test cases (section 8)
- [ ] Run regression tests
- [ ] Implement admin toggles
- [ ] Performance optimization
- [ ] Documentation

**Deliverables:**
- Golden household test suite
- Performance benchmarks (<100ms per detection)
- Admin settings UI
- `OPPORTUNITY_ENGINE_STATUS.md`

---

## Next Steps After Build Pack

1. **Review & Approve** this technical build pack
2. **Assign sprints** to engineering team
3. **Set up project tracking** (GitHub Issues, Linear, etc.)
4. **Begin Sprint 1** (Foundation)
5. **Weekly demos** to stakeholders
6. **Phase 5 planning** (Scenario Modeling) in parallel with Sprint 4-5

---

**Build Pack Complete — Ready for Implementation**

This document provides all the technical specifications needed to build the Phase 4 Opportunity Detection Engine. Each section can be referenced during implementation, and the sprint breakdown ensures incremental delivery with testable milestones.

