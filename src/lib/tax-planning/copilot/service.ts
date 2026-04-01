// =============================================================================
// AI Copilot & Citation Layer — Core Service
// =============================================================================
//
// Orchestrates the copilot pipeline: validate → RBAC → buildSourcePackage →
// buildPrompts → callAI → validateCitations → scoreConfidence → persist →
// audit → return.
// =============================================================================

import type { TaxYear } from '../types';
import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type {
  CopilotAnswer,
  CopilotAskRequest,
  ConfidenceLevel,
  ConfidenceFactors,
  SourcePackage,
} from './types';
import { buildSourcePackage } from './retrieval';
import { buildSystemPrompt, buildUserPrompt, getPromptConfig, getPromptVersion } from './prompts';
import { validateCitations } from './citations';
import { callCopilotAi, isCopilotEnabled } from './ai-client';

// =====================================================================
// Main Ask Function
// =====================================================================

interface AskCopilotParams {
  request: CopilotAskRequest;
  authContext: AuthContext;
  ip?: string;
}

/**
 * Ask the copilot a question or generate a draft.
 * Full pipeline: validate → RBAC → retrieve → prompt → AI → cite → score → persist → audit.
 *
 * @throws Error on authorization failure, missing data, or AI errors.
 */
export async function askCopilot(params: AskCopilotParams): Promise<CopilotAnswer> {
  const { request, authContext, ip } = params;

  // 1. Check AI enablement
  if (!isCopilotEnabled()) {
    throw new Error('Copilot AI service is not configured. Set ANTHROPIC_API_KEY.');
  }

  // 2. RBAC check
  if (!hasPermission(authContext.role, 'copilot:ask')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "copilot:ask".`,
    );
  }

  // 3. Build source package
  const taxYear = request.tax_year as TaxYear;
  const sourcePackage = buildSourcePackage(request.household_id, taxYear);
  if (!sourcePackage) {
    throw new Error(`Household "${request.household_id}" not found.`);
  }

  // 4. Build prompts
  const promptConfig = getPromptConfig(request.prompt_family);
  const systemPrompt = buildSystemPrompt(request.prompt_family, request.audience);
  const userPrompt = buildUserPrompt(
    request.prompt_family,
    request.user_query,
    sourcePackage,
    {
      opportunityId: request.opportunity_id,
      scenarioId: request.scenario_id,
      taxLineRef: request.tax_line_ref,
    },
  );

  // 5. Call AI
  const aiResponse = await callCopilotAi({
    systemPrompt,
    userPrompt,
    maxTokens: promptConfig.maxTokens,
    temperature: promptConfig.temperature,
  });

  // 6. Validate citations
  const { validCitations, hallucinations } = validateCitations(
    aiResponse.content.citations,
    sourcePackage,
  );

  // 7. Score confidence
  const confidenceFactors = computeConfidenceFactors(
    sourcePackage,
    hallucinations,
    request.prompt_family,
  );
  const confidence = computeConfidenceLevel(confidenceFactors);

  // 8. Build answer
  const now = new Date().toISOString();
  const answer: CopilotAnswer = {
    answer_id: generateAnswerId(),
    firm_id: authContext.firmId,
    household_id: request.household_id,
    tax_year: taxYear,
    prompt_family: request.prompt_family,
    audience: request.audience,
    user_query: request.user_query,
    answer_text: aiResponse.content.answer_text,
    citations: validCitations,
    confidence,
    confidence_factors: confidenceFactors,
    review_state: 'draft',
    formatted_output: parseFormattedOutput(aiResponse.content.formatted_output),
    upstream_hash: sourcePackage.upstream_hash,
    is_stale: false,
    prompt_version: getPromptVersion(),
    model_id: aiResponse.model_id,
    token_usage: aiResponse.token_usage,
    created_by: authContext.userId,
    created_at: now,
    updated_at: now,
  };

  // 9. Persist
  store.upsertCopilotAnswer(answer);

  // 10. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'copilot.ask',
    ip: ip ?? '0.0.0.0',
    payload: {
      answer_id: answer.answer_id,
      household_id: request.household_id,
      prompt_family: request.prompt_family,
      audience: request.audience,
      confidence,
      citation_count: validCitations.length,
      hallucination_count: hallucinations.length,
      token_usage: aiResponse.token_usage,
    },
  });

  return answer;
}

// =====================================================================
// Confidence Scoring (Heuristic — replaced in Sprint 4)
// =====================================================================

function computeConfidenceFactors(
  sourcePackage: SourcePackage,
  hallucinations: string[],
  _promptFamily: string,
): ConfidenceFactors {
  // Data completeness: what % of key fields are present
  const expectedFields = 8; // wages, interest, dividends, AGI, taxable income, tax, cap gains, QD
  const presentFields = sourcePackage.extracted_fields.length;
  const completeness = Math.min(100, Math.round((presentFields / expectedFields) * 100));

  // Blocker count: missing critical data
  let blockers = 0;
  if (!sourcePackage.calc_metrics) blockers++;
  if (sourcePackage.extracted_fields.length === 0) blockers++;
  if (!sourcePackage.household.filing_status) blockers++;

  // Interpretation level based on prompt family
  const interpretationLevel = 'analytical' as const;

  return {
    data_completeness_pct: completeness,
    blocker_count: blockers,
    interpretation_level: interpretationLevel,
    all_citations_verified: hallucinations.length === 0,
    hallucination_count: hallucinations.length,
  };
}

function computeConfidenceLevel(factors: ConfidenceFactors): ConfidenceLevel {
  if (
    factors.data_completeness_pct >= 80 &&
    factors.blocker_count === 0 &&
    factors.hallucination_count === 0
  ) {
    return 'high';
  }
  if (
    factors.data_completeness_pct >= 50 &&
    factors.blocker_count <= 1 &&
    factors.hallucination_count <= 1
  ) {
    return 'medium';
  }
  return 'low';
}

// =====================================================================
// Helpers
// =====================================================================

let answerIdCounter = 0;

function generateAnswerId(): string {
  answerIdCounter++;
  const ts = Date.now().toString(36);
  const counter = answerIdCounter.toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `copa_${ts}_${counter}_${random}`;
}

/**
 * Parse formatted output from AI response into typed draft objects.
 */
function parseFormattedOutput(
  raw: Record<string, unknown> | undefined,
): CopilotAnswer['formatted_output'] {
  if (!raw || typeof raw !== 'object') return undefined;

  const kind = raw.kind as string;
  if (
    kind === 'email_draft' ||
    kind === 'cpa_note' ||
    kind === 'meeting_prep' ||
    kind === 'missing_data_report'
  ) {
    return raw as unknown as CopilotAnswer['formatted_output'];
  }

  return undefined;
}

/** Reset ID counter for testing. */
export function resetAnswerIdCounter(): void {
  answerIdCounter = 0;
}
