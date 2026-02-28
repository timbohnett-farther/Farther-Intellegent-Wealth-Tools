import type {
  RiskDimension,
  RiskProfileLevel,
  QuestionResponse,
  DimensionScores,
  RecommendedAllocation,
  Contradiction,
  RiskProfile,
} from './types';
import { QUESTION_BANK } from './questions';

/**
 * Classify a numeric risk score into a named risk profile level.
 *
 * Ranges (inclusive on lower bound, exclusive on upper except final bucket):
 *   1.0 - 1.5  Very Conservative  (level 1)
 *   1.5 - 2.5  Conservative       (level 2)
 *   2.5 - 3.5  Moderate           (level 3)
 *   3.5 - 4.5  Aggressive         (level 4)
 *   4.5 - 5.0  Very Aggressive    (level 5)
 */
export function classifyRiskProfile(score: number): {
  profile: RiskProfileLevel;
  level: number;
} {
  if (score < 1.5) {
    return { profile: 'Very Conservative', level: 1 };
  }
  if (score < 2.5) {
    return { profile: 'Conservative', level: 2 };
  }
  if (score < 3.5) {
    return { profile: 'Moderate', level: 3 };
  }
  if (score < 4.5) {
    return { profile: 'Aggressive', level: 4 };
  }
  return { profile: 'Very Aggressive', level: 5 };
}

/**
 * Return a recommended asset allocation for a given risk profile level.
 */
export function getRecommendedAllocation(
  profile: RiskProfileLevel,
): RecommendedAllocation {
  const allocations: Record<RiskProfileLevel, RecommendedAllocation> = {
    'Very Conservative': { stocks: 20, bonds: 70, cash: 10 },
    Conservative: { stocks: 40, bonds: 50, cash: 10 },
    Moderate: { stocks: 60, bonds: 35, cash: 5 },
    Aggressive: { stocks: 80, bonds: 15, cash: 5 },
    'Very Aggressive': { stocks: 95, bonds: 5, cash: 0 },
  };

  return allocations[profile];
}

/**
 * Detect logical contradictions across dimension scores.
 *
 * A contradiction is flagged when two dimensions pull in opposing directions
 * in a way that is unusual or may undermine portfolio construction.
 */
export function detectContradictions(
  dimensionScores: DimensionScores,
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const {
    time_horizon_score,
    loss_tolerance_score,
    volatility_comfort_score,
    knowledge_score,
    goal_risk_score,
  } = dimensionScores;

  if (time_horizon_score < 2 && loss_tolerance_score > 4) {
    contradictions.push({
      dimensions: ['time_horizon_score', 'loss_tolerance_score'],
      description:
        'Short time horizon with high loss tolerance is unusual',
    });
  }

  if (time_horizon_score > 4 && loss_tolerance_score < 2) {
    contradictions.push({
      dimensions: ['time_horizon_score', 'loss_tolerance_score'],
      description:
        'Long time horizon with very low loss tolerance may limit growth',
    });
  }

  if (knowledge_score > 4 && volatility_comfort_score < 2) {
    contradictions.push({
      dimensions: ['knowledge_score', 'volatility_comfort_score'],
      description:
        'High knowledge but low volatility comfort suggests emotional constraints',
    });
  }

  if (goal_risk_score > 4 && loss_tolerance_score < 2) {
    contradictions.push({
      dimensions: ['goal_risk_score', 'loss_tolerance_score'],
      description:
        'Aggressive goals with low loss tolerance may be unrealistic',
    });
  }

  return contradictions;
}

/**
 * Calculate a confidence score (0-100) for the risk profile result.
 *
 * Confidence is based on two factors:
 *   - count_factor  (60% weight): how many questions were answered relative to a
 *     full 25-question assessment.
 *   - consistency_factor (40% weight): how internally consistent the dimension
 *     scores are (lower standard deviation = higher consistency).
 */
export function calculateConfidence(
  questionCount: number,
  dimensionScores: DimensionScores,
): number {
  // Factor 1: question coverage
  const countFactor = Math.min(questionCount / 25, 1.0);

  // Factor 2: score consistency across answered dimensions
  const scores = Object.values(dimensionScores).filter((s) => s > 0);

  if (scores.length === 0) {
    return Math.round(countFactor * 0.6 * 100);
  }

  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const consistencyFactor = Math.max(0, 1 - stdDev / 2);

  const confidence = (countFactor * 0.6 + consistencyFactor * 0.4) * 100;

  return Math.round(confidence);
}

/**
 * Main entry point: calculate a full risk profile from a set of question responses.
 *
 * Algorithm:
 *   1. Look up each question from QUESTION_BANK by questionId
 *   2. Group responses by riskDimension
 *   3. For each dimension, compute a weighted average score
 *   4. Compute overall score as the simple average of populated dimensions
 *   5. Classify into a named risk profile level
 *   6. Derive recommended allocation
 *   7. Detect contradictions
 *   8. Calculate confidence
 *   9. Return the assembled RiskProfile
 */
export function calculateRiskProfile(
  responses: QuestionResponse[],
): RiskProfile {
  // Build a lookup map for questions
  const questionMap = new Map(QUESTION_BANK.map((q) => [q.id, q]));

  // Accumulators per dimension: { weightedScoreSum, weightSum }
  const dimensionAccumulators: Record<
    string,
    { weightedScoreSum: number; weightSum: number }
  > = {};

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      continue;
    }

    const selectedOption = question.options.find(
      (opt) => opt.value === response.answerValue,
    );
    if (!selectedOption) {
      continue;
    }

    const dim = question.riskDimension;
    if (!dimensionAccumulators[dim]) {
      dimensionAccumulators[dim] = { weightedScoreSum: 0, weightSum: 0 };
    }

    dimensionAccumulators[dim].weightedScoreSum +=
      selectedOption.score * question.weight;
    dimensionAccumulators[dim].weightSum += question.weight;
  }

  // Build dimension scores
  const allDimensions: RiskDimension[] = [
    'time_horizon_score',
    'loss_tolerance_score',
    'volatility_comfort_score',
    'knowledge_score',
    'goal_risk_score',
    'behavioral_score',
    'liquidity_score',
  ];

  const dimensionScores: DimensionScores = {
    time_horizon_score: 0,
    loss_tolerance_score: 0,
    volatility_comfort_score: 0,
    knowledge_score: 0,
    goal_risk_score: 0,
    behavioral_score: 0,
    liquidity_score: 0,
  };

  let dimensionTotal = 0;
  let dimensionCount = 0;

  for (const dim of allDimensions) {
    const acc = dimensionAccumulators[dim];
    if (acc && acc.weightSum > 0) {
      const score = acc.weightedScoreSum / acc.weightSum;
      dimensionScores[dim] = score;
      dimensionTotal += score;
      dimensionCount += 1;
    }
  }

  // Overall score: simple average of populated dimensions
  const overallScore = dimensionCount > 0 ? dimensionTotal / dimensionCount : 0;

  // Classify
  const { profile, level } = classifyRiskProfile(overallScore);

  // Recommended allocation
  const recommendedAllocation = getRecommendedAllocation(profile);

  // Contradictions
  const contradictions = detectContradictions(dimensionScores);

  // Confidence
  const confidence = calculateConfidence(responses.length, dimensionScores);

  return {
    profile,
    level,
    overallScore,
    dimensionScores,
    recommendedAllocation,
    confidence,
    contradictions,
    questionCount: responses.length,
  };
}
