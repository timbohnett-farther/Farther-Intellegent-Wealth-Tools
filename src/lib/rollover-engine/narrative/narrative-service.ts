// =============================================================================
// Rollover Engine — Narrative Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type { NarrativeOutput, FactorName } from '../types';
import { getPromptForTemplate } from './prompts';
import { generateNarrativeAI } from './ai-client';
import { getRegulatoryCitations, STANDARD_DISCLAIMERS } from './citations';

/**
 * Generates a narrative for a scored analysis.
 */
export async function generateNarrative(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): Promise<NarrativeOutput> {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const analysis = store.getRolloverAnalysis(analysisId);
  if (!analysis) throw new Error(`Rollover analysis not found: ${analysisId}`);
  if (analysis.firm_id !== auth.firmId) throw new Error(`Rollover analysis not found: ${analysisId}`);

  const score = store.getRolloverScoreByAnalysis(analysisId);
  if (!score) throw new Error('Analysis must be scored before generating a narrative.');

  const plan = store.getRolloverPlan(analysis.plan_id);
  if (!plan) throw new Error(`Associated plan not found: ${analysis.plan_id}`);

  // Build prompt
  const { system, user } = getPromptForTemplate(analysis.narrative_template, {
    analysis,
    score,
    plan,
  });

  // Call AI
  const aiResponse = await generateNarrativeAI({
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 4000,
    temperature: 0.3,
  });

  // Build factor narratives from score
  const factorNarratives: Record<FactorName, string> = {} as any;
  for (const fs of score.factor_scores) {
    factorNarratives[fs.factor_name] = fs.rationale;
  }

  const now = new Date().toISOString();
  const narrativeId = `rn-${crypto.randomUUID().slice(0, 8)}`;

  const narrative: NarrativeOutput = {
    narrative_id: narrativeId,
    analysis_id: analysisId,
    template: analysis.narrative_template,
    executive_summary: aiResponse.executive_summary,
    detailed_analysis: aiResponse.detailed_analysis,
    factor_narratives: factorNarratives,
    recommendation_text: aiResponse.recommendation_text,
    regulatory_citations: getRegulatoryCitations(),
    disclaimers: STANDARD_DISCLAIMERS,
    model_id: aiResponse.model_id,
    token_usage: aiResponse.token_usage,
    generated_at: now,
    generated_by: auth.userId,
  };

  store.upsertRolloverNarrative(narrative);

  // Update analysis
  store.upsertRolloverAnalysis({
    ...analysis,
    narrative_id: narrativeId,
    status: analysis.status === 'SCORING' ? 'NARRATIVE_GENERATION' : analysis.status,
    updated_at: now,
    last_modified_by: auth.userId,
  });

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.narrative.generated',
    ip,
    payload: { analysisId, narrativeId, template: analysis.narrative_template },
  });

  return narrative;
}

/**
 * Gets the narrative for an analysis.
 */
export function getNarrative(
  analysisId: string,
  auth: AuthContext,
): NarrativeOutput | undefined {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }
  return store.getRolloverNarrativeByAnalysis(analysisId);
}
