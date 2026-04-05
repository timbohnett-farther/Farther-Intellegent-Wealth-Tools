/**
 * Trust & Estate Intelligence Engine - Database Types
 *
 * Type definitions that match the Prisma schema models for TEIE.
 * These types complement the existing types.ts with database-specific interfaces.
 */

import type {
  EstateAnalysis,
  EstateDocument2,
  AgentExecution,
  EstateFinding,
  EstateReport,
  EstateKnowledgeBase,
  EstateAuditLog
} from '../../generated/prisma';

// ==================== ANALYSIS STATUS ====================

export type AnalysisStatusDB =
  | 'PENDING'
  | 'CLASSIFYING'
  | 'ANALYZING'
  | 'SYNTHESIZING'
  | 'REVIEWING'
  | 'COMPLETE'
  | 'ERROR';

export type AgentExecutionStatusDB =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETE'
  | 'ERROR'
  | 'SKIPPED';

// ==================== DOCUMENT TYPES ====================

export type DocumentTypeDB =
  | 'REVOCABLE_LIVING_TRUST'
  | 'IRREVOCABLE_TRUST'
  | 'IRREVOCABLE_LIFE_INSURANCE_TRUST'
  | 'CHARITABLE_REMAINDER_TRUST'
  | 'CHARITABLE_LEAD_TRUST'
  | 'GRANTOR_RETAINED_ANNUITY_TRUST'
  | 'GRANTOR_RETAINED_UNITRUST'
  | 'QUALIFIED_PERSONAL_RESIDENCE_TRUST'
  | 'QUALIFIED_TERMINABLE_INTEREST_PROPERTY_TRUST'
  | 'BYPASS_TRUST'
  | 'DYNASTY_TRUST'
  | 'SPECIAL_NEEDS_TRUST'
  | 'SPENDTHRIFT_TRUST'
  | 'ASSET_PROTECTION_TRUST'
  | 'QUALIFIED_DOMESTIC_TRUST'
  | 'INTENTIONALLY_DEFECTIVE_GRANTOR_TRUST'
  | 'POUR_OVER_WILL'
  | 'LAST_WILL_AND_TESTAMENT'
  | 'POWER_OF_ATTORNEY'
  | 'HEALTHCARE_DIRECTIVE'
  | 'LIVING_WILL'
  | 'BENEFICIARY_DESIGNATION'
  | 'BUSINESS_SUCCESSION_PLAN'
  | 'BUY_SELL_AGREEMENT'
  | 'LIFE_INSURANCE_POLICY'
  | 'ANNUITY_CONTRACT'
  | 'DEED'
  | 'TITLE_DOCUMENT'
  | 'PRENUPTIAL_AGREEMENT'
  | 'POSTNUPTIAL_AGREEMENT'
  | 'TRUST_AMENDMENT'
  | 'TRUST_RESTATEMENT'
  | 'CERTIFICATE_OF_TRUST'
  | 'UNKNOWN';

export type ClassificationConfidenceDB = 'HIGH' | 'MEDIUM' | 'LOW';

// ==================== AGENT TYPES ====================

export type AgentIdDB =
  // Phase 1: Specialist Agents
  | 'TRUST_STRUCTURE'
  | 'TAX_EXPOSURE'
  | 'BENEFICIARY_ANALYSIS'
  | 'ENTITY_INTEGRATION'
  | 'DIGITAL_ASSETS'
  | 'STATE_COMPLIANCE'
  | 'CHARITABLE_GIFTING'
  | 'INSURANCE_COORDINATION'
  // Phase 2: Meta-Agents
  | 'CONFLICT_RESOLVER'
  | 'SYNTHESIS';

export type AgentPhaseDB = 1 | 2;

// ==================== FINDING TYPES ====================

export type FindingCategoryDB =
  | 'STRUCTURE'
  | 'RISK'
  | 'TAX'
  | 'BENEFICIARY'
  | 'ENTITY'
  | 'DIGITAL'
  | 'STATE'
  | 'CHARITABLE'
  | 'INSURANCE';

export type FindingSeverityDB = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// ==================== METADATA INTERFACES ====================

export interface EstateAnalysisMetadata {
  estimatedNetWorth?: number;
  clientState?: string;
  spouseName?: string;
  childrenCount?: number;
  hasBusinessInterests?: boolean;
  hasCharitableGoals?: boolean;
  notes?: string;
}

export interface DocumentMetadata {
  grantors?: string[];
  trustees?: {
    initial?: string[];
    successor?: string[];
  };
  beneficiaries?: {
    primary?: string[];
    contingent?: string[];
    remainder?: string[];
  };
  creationDate?: string;
  amendmentDates?: string[];
  governingLaw?: string;
  sipCrummeyProvision?: boolean;
  gstExemptionAllocated?: boolean;
  [key: string]: unknown;
}

export interface ProvisionCitation {
  documentId: string;
  documentType: DocumentTypeDB;
  section?: string;
  article?: string;
  paragraph?: string;
  pageNumber?: number;
  excerpt: string;
}

export interface LegalAuthority {
  type: 'IRC' | 'STATE_STATUTE' | 'REGULATION' | 'CASE_LAW';
  citation: string;
  description: string;
  url?: string;
}

export interface TaxImpact {
  amount: number; // in cents
  direction: 'INCREASE' | 'DECREASE' | 'NEUTRAL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  taxType: 'ESTATE' | 'GIFT' | 'GST' | 'INCOME';
  basis?: string;
}

export interface ConflictResolution {
  conflictingAgents: AgentIdDB[];
  reasoning: string;
  resolution: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ==================== REPORT TYPES ====================

export type ReportFormatDB = 'WEB' | 'DOCX' | 'PDF' | 'SLIDES';

export interface WebReportData {
  executiveSummary: {
    clientName: string;
    analysisDate: string;
    totalDocuments: number;
    totalFindings: number;
    highSeverityCount: number;
    estimatedTaxExposure?: number;
    keyRisks: string[];
    urgentActions: string[];
  };
  documentInventory: Array<{
    id: string;
    type: DocumentTypeDB;
    filename: string;
    classificationConfidence: ClassificationConfidenceDB;
  }>;
  findingsByCategory: Array<{
    category: FindingCategoryDB;
    findings: EstateFinding[];
    summary: string;
  }>;
  taxSummary: {
    federal: {
      currentExemption: number;
      estateValue: number;
      projectedLiability: number;
    };
    state?: {
      state: string;
      exemption: number;
      projectedLiability: number;
      cliffRisk: boolean;
    };
    gst?: {
      exposure: number;
      exemptionRemaining: number;
    };
  };
  actionItems: Array<{
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    relatedFindings: string[];
    estimatedCost?: number;
    estimatedBenefit?: number;
    deadline?: string;
  }>;
  appendices: {
    agentExecutions: Array<{
      agentId: AgentIdDB;
      status: AgentExecutionStatusDB;
      duration: number;
      findingsCount: number;
    }>;
    citedAuthorities: LegalAuthority[];
  };
}

// ==================== KNOWLEDGE BASE ====================

export type KnowledgeCategoryDB = 'STATE_TAX' | 'IRC' | 'CASE_LAW' | 'REGULATION' | 'EXEMPTION';

export interface StateEstateTax {
  state: string;
  exemption2024: number;
  exemption2025: number;
  topRate: number;
  portabilityAllowed: boolean;
  cliffProvision: boolean;
  notes?: string;
}

// ==================== API TYPES ====================

export interface CreateAnalysisRequest {
  clientId?: string;
  householdId?: string;
  clientName: string;
  advisorId: string;
  firmId: string;
  metadata?: EstateAnalysisMetadata;
}

export interface CreateAnalysisResponse {
  success: boolean;
  data: {
    analysisId: string;
    status: AnalysisStatusDB;
  } | null;
  error: string | null;
  retryable: boolean;
}

export interface UploadDocumentsRequest {
  analysisId: string;
  files: File[];
}

export interface UploadDocumentsResponse {
  success: boolean;
  data: {
    uploadedCount: number;
    documentIds: string[];
  } | null;
  error: string | null;
  retryable: boolean;
}

export interface GetAnalysisStatusResponse {
  success: boolean;
  data: {
    analysis: EstateAnalysis;
    documents: EstateDocument2[];
    agentExecutions: AgentExecution[];
    progress: {
      phase1Complete: boolean;
      phase2Complete: boolean;
      totalAgents: number;
      completedAgents: number;
      percentComplete: number;
    };
  } | null;
  error: string | null;
  retryable: boolean;
}

export interface GetReportResponse {
  success: boolean;
  data: {
    report: EstateReport;
    reportData: WebReportData | null;
  } | null;
  error: string | null;
  retryable: boolean;
}

// ==================== AUDIT LOG ====================

export type ActorTypeDB = 'ADVISOR' | 'SYSTEM' | 'AGENT';

export interface AuditLogDetails {
  action: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

// ==================== WITH RELATIONS TYPES ====================

export type EstateAnalysisWithRelations = EstateAnalysis & {
  estateDocuments: EstateDocument2[];
  agentExecutions: AgentExecution[];
  estateFindings: EstateFinding[];
  estateReports: EstateReport[];
};

export type AgentExecutionWithFindings = AgentExecution & {
  findings: EstateFinding[];
};

export type EstateFindingWithExecution = EstateFinding & {
  agentExecution: AgentExecution;
};

// ==================== HELPER TYPES ====================

export interface AgentConfig {
  id: AgentIdDB;
  phase: AgentPhaseDB;
  name: string;
  description: string;
  requiredDocuments: DocumentTypeDB[];
  outputCategories: FindingCategoryDB[];
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface OrchestrationPlan {
  analysisId: string;
  phase1Agents: AgentIdDB[];
  phase2Agents: AgentIdDB[];
  estimatedDuration: number; // seconds
  estimatedCost: number; // USD
}

export interface AgentTask {
  analysisId: string;
  agentId: AgentIdDB;
  phase: AgentPhaseDB;
  documents: EstateDocument2[];
  previousFindings?: EstateFinding[];
}

export interface AgentResult {
  agentExecutionId: string;
  findings: Array<{
    findingCode: string;
    category: FindingCategoryDB;
    severity: FindingSeverityDB;
    title: string;
    detail: string;
    provisionsCited?: ProvisionCitation[];
    legalAuthority?: LegalAuthority[];
    crossReferences?: string[];
    actionRequired: boolean;
    recommendedAction?: string;
    estimatedTaxImpact?: TaxImpact;
    conflictResolution?: ConflictResolution;
  }>;
  metadata: {
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
  };
}

// ==================== QUALITY GATES ====================

export interface UPLCheckResult {
  passed: boolean;
  violations: Array<{
    type: 'LEGAL_ADVICE' | 'TAX_ADVICE' | 'SPECIFIC_RECOMMENDATION' | 'ATTORNEY_RELATIONSHIP';
    excerpt: string;
    suggestion: string;
  }>;
}

export interface QualityGateResult {
  passed: boolean;
  checks: {
    findingCoverage: { passed: boolean; coverage: number };
    citationQuality: { passed: boolean; uncitedCount: number };
    conflictResolution: { passed: boolean; unresolvedCount: number };
    taxCalculations: { passed: boolean; errors: string[] };
  };
}
