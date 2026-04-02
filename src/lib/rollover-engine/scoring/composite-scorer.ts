// =============================================================================
// Rollover Engine — Composite Scorer
// =============================================================================

import type {
  FactorScore,
  RolloverScore,
  Score,
  RecommendationTier,
  FactorName,
} from '../types';
import { toScore } from '../types';
import { FACTOR_DEFINITIONS, getDefaultWeights } from './factor-definitions';
import type { FactorScoringResult } from './factor-scorers';

/**
 * Computes the weighted composite Rollover Recommendation Score (RRS).
 *
 * Score ranges:
 *   80-100 = STRONG_ROLLOVER
 *   61-79  = MODERATE_ROLLOVER
 *   40-60  = NEUTRAL
 *   21-39  = MODERATE_STAY
 *   0-20   = STRONG_STAY
 */
export function computeCompositeScore(
  factorResults: FactorScoringResult[],
  weightOverrides?: Partial<Record<FactorName, number>>,
): {
  composite_score: Score;
  recommendation_tier: RecommendationTier;
  factor_scores: FactorScore[];
} {
  const weights = { ...getDefaultWeights(), ...weightOverrides };
  const scoreId = `rs-${crypto.randomUUID().slice(0, 8)}`;

  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights: Record<string, number> = {};
  for (const [name, w] of Object.entries(weights)) {
    normalizedWeights[name] = w / totalWeight;
  }

  let compositeRaw = 0;
  const factorScores: FactorScore[] = [];

  for (const result of factorResults) {
    const weight = normalizedWeights[result.factor_name] ?? 0;
    const weightedScore = result.score * weight;
    compositeRaw += weightedScore;

    factorScores.push({
      factor_score_id: `fs-${crypto.randomUUID().slice(0, 8)}`,
      score_id: scoreId,
      factor_name: result.factor_name,
      score: result.score,
      weight,
      weighted_score: Math.round(weightedScore * 100) / 100,
      direction: result.direction,
      rationale: result.rationale,
      data_points: result.data_points,
    });
  }

  const compositeScore = toScore(compositeRaw);
  const tier = scoreToTier(compositeScore);

  return {
    composite_score: compositeScore,
    recommendation_tier: tier,
    factor_scores: factorScores,
  };
}

/**
 * Maps a composite score to a recommendation tier.
 */
export function scoreToTier(score: number): RecommendationTier {
  if (score >= 80) return 'STRONG_ROLLOVER';
  if (score >= 61) return 'MODERATE_ROLLOVER';
  if (score >= 40) return 'NEUTRAL';
  if (score >= 21) return 'MODERATE_STAY';
  return 'STRONG_STAY';
}

/**
 * Returns a human-readable summary for a recommendation tier.
 */
export function tierSummary(tier: RecommendationTier): string {
  switch (tier) {
    case 'STRONG_ROLLOVER':
      return 'Analysis strongly supports rolling over to a Farther IRA. Multiple factors favor rollover with significant client benefits.';
    case 'MODERATE_ROLLOVER':
      return 'Analysis moderately supports rolling over to a Farther IRA. Most factors favor rollover, though some considerations warrant discussion.';
    case 'NEUTRAL':
      return 'Analysis is neutral. Factors are balanced between staying and rolling over. Advisor judgment and client preferences should guide the decision.';
    case 'MODERATE_STAY':
      return 'Analysis moderately supports staying in the current plan. Some significant factors (e.g., Rule of 55, NUA, or low fees) favor the existing plan.';
    case 'STRONG_STAY':
      return 'Analysis strongly supports staying in the current plan. Multiple significant factors (e.g., cost advantage, NUA opportunity, creditor protection) favor the existing plan.';
  }
}
