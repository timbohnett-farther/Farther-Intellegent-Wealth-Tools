// =============================================================================
// Rollover Engine — Score Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type { RolloverScore, Score, RolloverAnalysis, AmountCents } from '../types';
import { FACTOR_SCORERS, type FactorScoringInput } from './factor-scorers';
import { computeCompositeScore } from './composite-scorer';
import { seedRolloverData } from '../seed';

seedRolloverData();

/**
 * Scores an analysis using all 10 factors.
 * Updates the analysis with score results.
 */
export function scoreAnalysis(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): RolloverScore {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const analysis = store.getRolloverAnalysis(analysisId);
  if (!analysis) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }
  if (analysis.firm_id !== auth.firmId) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }

  const plan = store.getRolloverPlan(analysis.plan_id);
  if (!plan) {
    throw new Error(`Associated plan not found: ${analysis.plan_id}. Cannot score without plan data.`);
  }

  const scoringInput: FactorScoringInput = { analysis, plan };

  // Run all 10 factor scorers
  const factorResults = Object.values(FACTOR_SCORERS).map((scorer) =>
    scorer(scoringInput),
  );

  // Compute composite score
  const { composite_score, recommendation_tier, factor_scores } =
    computeCompositeScore(factorResults);

  const now = new Date().toISOString();
  const scoreId = `rs-${crypto.randomUUID().slice(0, 8)}`;

  const rolloverScore: RolloverScore = {
    score_id: scoreId,
    analysis_id: analysisId,
    composite_score,
    recommendation_tier,
    factor_scores,
    scoring_version: '1.0.0',
    scored_at: now,
    scored_by: auth.userId,
  };

  store.upsertRolloverScore(rolloverScore);

  // Update analysis with score reference
  const updatedAnalysis: RolloverAnalysis = {
    ...analysis,
    score_id: scoreId,
    composite_score,
    recommendation_tier,
    status: analysis.status === 'DRAFT' || analysis.status === 'DATA_COLLECTION'
      ? 'SCORING'
      : analysis.status,
    updated_at: now,
    last_modified_by: auth.userId,
  };
  store.upsertRolloverAnalysis(updatedAnalysis);

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.analysis.scored',
    ip,
    payload: {
      analysisId,
      scoreId,
      compositeScore: composite_score,
      recommendationTier: recommendation_tier,
    },
  });

  return rolloverScore;
}

/**
 * Retrieves the score for an analysis.
 */
export function getScore(
  analysisId: string,
  auth: AuthContext,
): RolloverScore | undefined {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  return store.getRolloverScoreByAnalysis(analysisId);
}

/**
 * Re-scores an existing analysis (e.g. after data updates).
 */
export function rescoreAnalysis(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): RolloverScore {
  return scoreAnalysis(analysisId, auth, ip);
}
