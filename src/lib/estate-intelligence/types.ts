// =============================================================================
// Trust & Estate Intelligence Engine — Core Type Definitions
// =============================================================================
//
// Defines all types for document classification, agent findings, orchestration
// state, and report generation. These types flow through the entire TEIE
// pipeline from document upload → classification → agent analysis → synthesis.
//
// =============================================================================

// ── Document Types & Subtypes ────────────────────────────────────────────────

export type DocumentType =
  | 'REVOCABLE_LIVING_TRUST'
  | 'IRREVOCABLE_TRUST'
  | 'LAST_WILL_AND_TESTAMENT'
  | 'POUR_OVER_WILL'
  | 'TRUST_AMENDMENT'
  | 'TRUST_RESTATEMENT'
  | 'POWER_OF_ATTORNEY'
  | 'ADVANCE_DIRECTIVE'
  | 'LLC_OPERATING_AGREEMENT'
  | 'PARTNERSHIP_AGREEMENT'
  | 'CORPORATE_DOCUMENTS'
  | 'BENEFICIARY_DESIGNATION'
  | 'DEED'
  | 'LIFE_INSURANCE_POLICY'
  | 'ACCOUNT_STATEMENT'
  | 'TAX_RETURN'
  | 'APPRAISAL'
  | 'PRENUPTIAL_POSTNUPTIAL_AGREEMENT'
  | 'COURT_ORDER'
  | 'LETTER_OF_INSTRUCTION'
  | 'DIGITAL_ASSET_INVENTORY'
  | 'OTHER';

export type DocumentSubtype =
  // Revocable Living Trust subtypes
  | 'RLT_JOINT'
  | 'RLT_INDIVIDUAL'
  | 'RLT_AB_TRUST'
  | 'RLT_QTIP'
  // Irrevocable Trust subtypes
  | 'IRREV_LIFE_INSURANCE'
  | 'IRREV_CHARITABLE_REMAINDER'
  | 'IRREV_CHARITABLE_LEAD'
  | 'IRREV_GRANTOR_RETAINED_ANNUITY'
  | 'IRREV_QUALIFIED_PERSONAL_RESIDENCE'
  | 'IRREV_INTENTIONALLY_DEFECTIVE_GRANTOR'
  | 'IRREV_DYNASTY'
  | 'IRREV_SPECIAL_NEEDS'
  | 'IRREV_SPENDTHRIFT'
  | 'IRREV_ASSET_PROTECTION'
  // Power of Attorney subtypes
  | 'POA_FINANCIAL'
  | 'POA_HEALTHCARE'
  | 'POA_LIMITED'
  | 'POA_SPRINGING'
  // Advance Directive subtypes
  | 'AD_LIVING_WILL'
  | 'AD_HEALTHCARE_PROXY'
  | 'AD_DNR'
  // Beneficiary Designation subtypes
  | 'BENE_RETIREMENT_ACCOUNT'
  | 'BENE_LIFE_INSURANCE'
  | 'BENE_TRANSFER_ON_DEATH'
  | 'BENE_PAYABLE_ON_DEATH'
  // Deed subtypes
  | 'DEED_WARRANTY'
  | 'DEED_QUITCLAIM'
  | 'DEED_JOINT_TENANCY'
  | 'DEED_TENANTS_IN_COMMON'
  | 'DEED_COMMUNITY_PROPERTY'
  // Tax Return subtypes
  | 'TAX_1040'
  | 'TAX_1041'
  | 'TAX_709'
  | 'TAX_706'
  | 'TAX_STATE'
  // Other
  | 'OTHER';

// ── Classification Result ────────────────────────────────────────────────────

export interface ClassificationMetadata {
  grantors?: string[];
  trustees?: string[];
  beneficiaries?: string[];
  execution_date?: string; // ISO date string
  governing_law?: string; // State code (e.g., "CA", "NY")
  attorney?: string;
  trust_name?: string;
  policy_number?: string;
  account_number?: string;
  tax_year?: string;
}

export interface ClassificationResult {
  document_type: DocumentType;
  document_subtype: DocumentSubtype | null;
  metadata: ClassificationMetadata;
  confidence: number; // 0-1
  cross_references: string[]; // Referenced documents not uploaded
  red_flags: string[]; // Immediate attention items
  page_count: number;
  key_provisions_summary: string;
}

// ── Agent Findings ───────────────────────────────────────────────────────────

export type FindingCategory =
  | 'STRUCTURAL_INEFFICIENCY'
  | 'TAX_OPTIMIZATION'
  | 'ASSET_PROTECTION'
  | 'BENEFICIARY_ALIGNMENT'
  | 'CHARITABLE_STRATEGY'
  | 'ESTATE_TAX_EXPOSURE'
  | 'PROBATE_RISK'
  | 'LIQUIDITY_GAP'
  | 'BUSINESS_SUCCESSION'
  | 'MARITAL_DEDUCTION'
  | 'GENERATIONAL_TRANSFER'
  | 'SPECIAL_NEEDS'
  | 'TRUST_ADMINISTRATION'
  | 'CROSS_BORDER'
  | 'COMPLIANCE'
  | 'OTHER';

export type FindingSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AgentFinding {
  finding_id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  detail: string;
  provisions_cited: string[]; // Document + clause references
  legal_authority?: string; // IRC § or case law
  cross_references: string[]; // Other finding IDs
  action_required: boolean;
  recommended_action?: string;
  estimated_tax_impact?: {
    annual?: number;
    lifetime?: number;
    description: string;
  };
}

export interface AgentOutput {
  agent_id: AgentId;
  analysis_timestamp: string; // ISO timestamp
  documents_analyzed: string[]; // Document IDs
  findings: AgentFinding[];
  summary_statistics: {
    total_findings: number;
    high_severity: number;
    medium_severity: number;
    low_severity: number;
    estimated_total_tax_impact?: number;
  };
}

// ── Analysis Status & Orchestration ──────────────────────────────────────────

export type AnalysisStatus =
  | 'PENDING'
  | 'CLASSIFYING'
  | 'ANALYZING'
  | 'SYNTHESIZING'
  | 'REVIEWING'
  | 'COMPLETE'
  | 'ERROR';

export type AgentId =
  | 'TRUST_STRUCTURE_ANALYST'
  | 'TAX_OPTIMIZATION_AGENT'
  | 'ASSET_PROTECTION_AGENT'
  | 'BENEFICIARY_ALIGNMENT_AGENT'
  | 'CHARITABLE_PLANNING_AGENT'
  | 'ESTATE_TAX_CALCULATOR'
  | 'LIQUIDITY_ANALYZER'
  | 'BUSINESS_SUCCESSION_AGENT'
  | 'MARITAL_DEDUCTION_OPTIMIZER'
  | 'GENERATIONAL_TRANSFER_AGENT'
  | 'SPECIAL_NEEDS_PLANNER'
  | 'COMPLIANCE_REVIEWER'
  | 'STRATEGIC_SYNTHESIS_AGENT';

export interface EstateAnalysisConfig {
  client_name: string;
  advisor_id: string;
  firm_id: string;
  documents: Array<{
    id: string;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
  }>;
}

export interface OrchestratorState {
  analysis_id: string;
  config: EstateAnalysisConfig;
  status: AnalysisStatus;
  current_phase: 'classification' | 'phase1' | 'phase2' | 'synthesis' | 'complete';
  classified_documents: ClassifiedDocument[];
  active_agents: AgentId[];
  completed_agents: AgentId[];
  all_findings: AgentOutput[];
  error?: string;
  created_at: string;
  updated_at: string;
}

// ── Report Generation ────────────────────────────────────────────────────────

export interface ReportSection {
  section_id: string;
  title: string;
  summary: string;
  findings: AgentFinding[];
  subsections?: ReportSection[];
}

export interface EstateAnalysisReport {
  analysis_id: string;
  client_name: string;
  advisor_id: string;
  firm_id: string;
  generated_at: string;
  executive_summary: string;
  sections: ReportSection[];
  total_findings: number;
  high_severity_findings: number;
  medium_severity_findings: number;
  low_severity_findings: number;
  estimated_total_tax_impact?: number;
  documents_analyzed: Array<{
    fileName: string;
    document_type: DocumentType;
    document_subtype: DocumentSubtype | null;
  }>;
  missing_documents: string[];
  disclaimer: string;
}

// ── UPL Check ────────────────────────────────────────────────────────────────

export interface UPLCheckResult {
  passed: boolean;
  flagged_patterns: Array<{
    pattern: string;
    match: string;
    severity: 'HIGH' | 'MEDIUM';
  }>;
}

// ── Document Processing ──────────────────────────────────────────────────────

export interface ExtractionResult {
  text: string;
  confidence: number;
  pageCount: number;
  method: 'ai_vision' | 'direct';
}

export interface ClassifiedDocument extends ClassificationResult {
  id: string;
  fileName: string;
  extractedText: string;
}

// ── Analysis Progress (for UI) ───────────────────────────────────────────────

export interface AnalysisProgress {
  status: AnalysisStatus;
  totalAgents: number;
  completedAgents: number;
  activeAgents: AgentId[];
  findings: {
    total: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  estimatedTimeRemaining?: number; // seconds
}
