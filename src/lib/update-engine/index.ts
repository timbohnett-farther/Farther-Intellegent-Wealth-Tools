// Farther Prism — Update Engine barrel file
// Automated tax law and regulatory update system.

export * from './types';
export * from './scrapers/index';

// Processors: rename the conflicting export
export {
  detectChanges,
  detectBracketChanges,
  detectLimitChanges,
  summarizeChanges,
  calculateInflationAdjustment,
} from './processors/change-detector';
export type { ChangeDiff } from './processors/change-detector';

export {
  assessImpact,
  estimateClientImpact,
  assessBracketImpact,
  assessContributionLimitImpact,
  assessIRMAAImpact,
  assessEstateTaxImpact,
  IMPACT_RULES,
} from './processors/impact-assessor';
export type { ImpactAssessment } from './processors/impact-assessor';

export {
  analyzeChangeWithAI,
  classifyChangeType,
  generateQuarterlyBulletin as generateQuarterlyBulletinAI,
} from './processors/ai-analyzer';
export type { AIAnalysisResult } from './processors/ai-analyzer';

export {
  buildTaxTable,
  buildBracketTable,
  buildContributionLimitsTable,
  buildIRMAATable,
  buildAFRTable,
  buildSSDataTable,
  mergeWithExistingTable,
} from './processors/table-builder';
export type { TaxTableData } from './processors/table-builder';

export * from './validators/index';
export * from './publishers/index';
export * from './schedules/index';
