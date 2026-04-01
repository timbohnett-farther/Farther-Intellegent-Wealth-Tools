// =============================================================================
// Deliverables & Reporting Engine — Barrel Exports
// =============================================================================

export type {
  DeliverableType,
  DeliverableAudienceMode,
  DeliverableStatus,
  DeliverableBlockType,
  DeliverableSectionBlock,
  DeliverableSectionBlueprint,
  DeliverableTemplate,
  Deliverable,
  DeliverableExportType,
  DeliverableExport,
  DeliverableSourcePackage,
  DeliverableValidationStatus,
  DeliverableValidationResult,
  DeliverableCreateRequest,
  DeliverableUpdateRequest,
  DeliverableApproveRequest,
  DeliverableExportRequest,
  DeliverableDuplicateRequest,
  DeliverableListQuery,
} from './types';

export {
  DeliverableCreateRequestSchema,
  DeliverableUpdateRequestSchema,
  DeliverableApproveRequestSchema,
  DeliverableExportRequestSchema,
  DeliverableDuplicateRequestSchema,
  DeliverableListQuerySchema,
} from './schemas';

export {
  getTemplate,
  getActiveTemplate,
  listTemplates,
  registerTemplate,
} from './templates';

export { buildDeliverableSourcePackage } from './source-binding';

export {
  buildSummaryBlock,
  buildComparisonTableBlock,
  buildOpportunityBlock,
  buildRecommendationBlock,
  buildNarrativeBlock,
  buildAssumptionsBlock,
  buildWarningsBlock,
  buildDisclaimerBlock,
  buildImplementationStepsBlock,
  buildAppendixBlock,
} from './block-builders';

export { assembleDeliverable } from './assembly';

export { validateDeliverable, isSourcePackageComplete } from './validation';

export {
  canTransitionDeliverable,
  getAllowedTransitions,
  isTerminalDeliverableState,
  transitionDeliverable,
  approveDeliverable,
  reviewDeliverable,
} from './approval';

export {
  exportDeliverable,
  generateExportPayload,
  getExportHistory,
  getExport,
} from './export-service';

export {
  supersedeDeliverable,
  checkDeliverableStaleness,
  batchCheckDeliverableStaleness,
} from './supersede';
