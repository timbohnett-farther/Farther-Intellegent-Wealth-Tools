// =============================================================================
// Trust & Estate Intelligence Engine — Public API
// =============================================================================
//
// Main entry point for the TEIE. Import from this file to access all types,
// document processing, agent execution, orchestration, and UPL filtering.
//
// =============================================================================

// ── Types ────────────────────────────────────────────────────────────────────

export type {
  DocumentType,
  DocumentSubtype,
  ClassificationMetadata,
  ClassificationResult,
  FindingCategory,
  FindingSeverity,
  AgentFinding,
  AgentOutput,
  AnalysisStatus,
  AgentId,
  EstateAnalysisConfig,
  OrchestratorState,
  ReportSection,
  EstateAnalysisReport,
  UPLCheckResult,
  ExtractionResult,
  ClassifiedDocument,
  AnalysisProgress,
} from './types';

// ── Document Processing ──────────────────────────────────────────────────────

export {
  extractText,
  classifyDocument,
  validateExtraction,
  detectMissingDocuments,
} from './document-processor';

// ── Agent Execution ──────────────────────────────────────────────────────────

export {
  executeAgent,
  buildDocumentContext,
  buildPriorFindingsContext,
} from './agent-executor';

// ── Orchestration ────────────────────────────────────────────────────────────

export {
  createAnalysis,
  runAnalysis,
  getAnalysisProgress,
} from './orchestrator';

// ── UPL Filter ───────────────────────────────────────────────────────────────

export {
  UPL_PROHIBITED_PATTERNS,
  checkUPL,
  sanitizeForClient,
  sanitizeStrings,
  assertNoUPL,
} from './upl-filter';
