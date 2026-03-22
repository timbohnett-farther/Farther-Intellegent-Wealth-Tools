// =============================================================================
// Update Engine — Processors Barrel File
// =============================================================================

export {
  detectChanges,
  detectBracketChanges,
  detectLimitChanges,
  summarizeChanges,
  calculateInflationAdjustment,
} from './change-detector';
export type { ChangeDiff } from './change-detector';

export {
  assessImpact,
  estimateClientImpact,
  assessBracketImpact,
  assessContributionLimitImpact,
  assessIRMAAImpact,
  assessEstateTaxImpact,
  IMPACT_RULES,
} from './impact-assessor';
export type { ImpactAssessment } from './impact-assessor';

export {
  analyzeChangeWithAI,
  generateQuarterlyBulletin,
  classifyChangeType,
} from './ai-analyzer';
export type { AIAnalysisResult } from './ai-analyzer';

export {
  buildTaxTable,
  buildBracketTable,
  buildContributionLimitsTable,
  buildIRMAATable,
  buildAFRTable,
  buildSSDataTable,
  mergeWithExistingTable,
} from './table-builder';
export type { TaxTableData } from './table-builder';
