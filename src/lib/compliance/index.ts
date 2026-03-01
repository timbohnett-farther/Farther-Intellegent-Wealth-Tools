// =============================================================================
// Compliance Layer — Barrel Export
// =============================================================================

// Types
export type {
  RegBIDocumentation,
  RegBIRecommendation,
  RegBIInput,
  PlanInsight,
  AuditEntry,
  ActorType,
  ResourceType,
  CreateAuditInput,
  AuditFilters,
  AuditSummary,
  ComplianceReport,
  ComplianceAlert,
  DataRetentionPolicy,
  RetentionAction,
  RetentionRecord,
  ExpiredRecord,
} from './types';

// Reg BI
export {
  generateRegBIDocument,
  lockDocument,
  verifyDocumentIntegrity,
  generateComplianceReport,
} from './reg-bi';

// Audit Log
export {
  createAuditEntry,
  filterAuditLog,
  exportAuditLog,
  summarizeAuditLog,
} from './audit-log';

// Data Retention
export {
  DEFAULT_RETENTION_POLICIES,
  identifyExpiredRecords,
  anonymizeClientData,
} from './data-retention';
