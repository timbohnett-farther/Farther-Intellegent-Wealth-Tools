// =============================================================================
// AI Copilot & Citation Layer — Barrel Exports
// =============================================================================

export type {
  PromptFamily,
  AudienceMode,
  ConfidenceLevel,
  ReviewState,
  CitationType,
  CopilotCitation,
  FactCitation,
  CalcCitation,
  OpportunityCitation,
  ScenarioCitation,
  AuthorityCitation,
  ConfidenceFactors,
  SourcePackage,
  CopilotAnswer,
  EmailDraft,
  CpaNote,
  MeetingPrep,
  MissingDataReport,
  CopilotAskRequest,
  CopilotAskResponse,
  CopilotAnswerUpdateRequest,
  CopilotListQuery,
  CopilotAiResponse,
} from './types';

export { buildSourcePackage, computeUpstreamHash } from './retrieval';
export {
  TAX_KNOWLEDGE_BASE,
  buildFactCitation,
  buildCalcCitation,
  buildOpportunityCitation,
  buildScenarioCitation,
  buildAuthorityCitation,
  validateCitations,
  resetCitationCounter,
} from './citations';
export {
  buildSystemPrompt,
  buildUserPrompt,
  getPromptConfig,
  getPromptVersion,
} from './prompts';
export {
  CopilotAskRequestSchema,
  CopilotAnswerUpdateSchema,
  CopilotListQuerySchema,
  CopilotAdminConfigSchema,
} from './schemas';

// Sprint 2
export { callCopilotAi, isCopilotEnabled } from './ai-client';
export { askCopilot, resetAnswerIdCounter } from './service';

// Sprint 3
export {
  formatEmailDraft,
  formatCpaNote,
  formatMeetingPrep,
  formatMissingDataReport,
} from './formatters';

// Sprint 4
export {
  scoreConfidence,
  assessDataCompleteness,
  countBlockers,
  classifyInterpretationLevel,
} from './confidence';
export {
  canTransition,
  getValidTransitions,
  isTerminal,
  transition,
} from './review-machine';

// Sprint 5
export {
  checkStaleness,
  markStale,
  supersedeAnswer,
  batchCheckStaleness,
} from './staleness';
export {
  getCopilotConfig,
  updateCopilotConfig,
  resetCopilotConfig,
  isFamilyEnabled,
  isAudienceEnabled,
} from './admin';
export type { CopilotConfig } from './admin';
export {
  registerHook,
  unregisterHook,
  executeHooks,
  clearHooks,
  reportingHook,
  workflowHook,
} from './hooks';
export type { CopilotHookFn, CopilotHookResult } from './hooks';
