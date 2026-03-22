// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — Multi-Axis Scoring Engine
// Computes tolerance, capacity, need, bias, and complexity scores,
// maps to risk bands, detects biases/inconsistencies, and produces
// a complete RiskProfile with compliance documentation.
// ═══════════════════════════════════════════════════════════════════════

import type {
  QuestionResponse,
  ClientIntake,
  AxisScores,
  RiskBand,
  RiskProfile,
  RiskQuestion,
  QuestionAxis,
  DetectedBias,
  Inconsistency,
  GoalFeasibility,
} from './types';
import { CATEGORY_TO_AXIS, RISK_BAND_LABELS } from './types';
import { MODEL_PORTFOLIOS, BACKTEST_RESULTS } from './portfolios';
import { QUESTION_BANK } from './questions';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Build a lookup map from question ID to RiskQuestion.
 */
function buildQuestionMap(): Map<number, RiskQuestion> {
  return new Map(
    QUESTION_BANK.map((q: RiskQuestion) => [q.id, q]),
  );
}

/**
 * Resolve the axis for a question. Prefers the `axis` field defined
 * in the current type system; falls back to CATEGORY_TO_AXIS mapping
 * or the legacy `riskDimension` field for backward compatibility.
 */
function resolveAxis(question: RiskQuestion): QuestionAxis | undefined {
  // Prefer the typed axis field
  if (question.axis) {
    return question.axis;
  }

  // Fall back to category-to-axis mapping
  if (question.category && CATEGORY_TO_AXIS[question.category]) {
    return CATEGORY_TO_AXIS[question.category];
  }

  // Legacy fallback: map old riskDimension names to new axes
  const legacyDim = question.riskDimension;
  if (legacyDim) {
    const legacyMap: Record<string, QuestionAxis> = {
      time_horizon_score: 'capacity',
      loss_tolerance_score: 'tolerance',
      volatility_comfort_score: 'tolerance',
      knowledge_score: 'complexity',
      goal_risk_score: 'tolerance',
      behavioral_score: 'bias',
      liquidity_score: 'capacity',
    };
    return legacyMap[legacyDim];
  }

  return undefined;
}

/**
 * Look up the score value for a given answer on a question.
 */
function getAnswerScore(question: RiskQuestion, answerValue: number): number | undefined {
  const option = question.options.find((opt) => opt.value === answerValue);
  return option?.score;
}

// ── Axis Score Calculation ───────────────────────────────────────────

/**
 * Calculate multi-axis scores from questionnaire responses and client
 * intake data.
 *
 * Axes:
 *   - Tolerance (0-100): Weighted average of tolerance-axis question
 *     scores, normalized from 1-5 scale to 0-100.
 *   - Capacity (0-100): 40% questionnaire capacity answers + 60%
 *     computed capacity from intake financials.
 *   - Need (%): Required annualized return to meet goals.
 *   - Bias Index (0-100): Inconsistency measure from bias-detection
 *     question pairs.
 *   - Complexity (0-100): Weighted average of complexity-axis answers,
 *     boosted by alternatives exposure.
 */
export function calculateAxisScores(
  responses: QuestionResponse[],
  intake: ClientIntake,
): AxisScores {
  const questionMap = buildQuestionMap();

  // Accumulators per axis: { weightedScoreSum, weightSum }
  const axisAccumulators: Record<
    QuestionAxis,
    { weightedScoreSum: number; weightSum: number }
  > = {
    tolerance: { weightedScoreSum: 0, weightSum: 0 },
    capacity: { weightedScoreSum: 0, weightSum: 0 },
    bias: { weightedScoreSum: 0, weightSum: 0 },
    complexity: { weightedScoreSum: 0, weightSum: 0 },
  };

  // Process every response
  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) continue;

    const score = getAnswerScore(question, response.answerValue);
    if (score === undefined) continue;

    const axis = resolveAxis(question);
    if (!axis) continue;

    const weight = question.weight ?? 1;
    axisAccumulators[axis].weightedScoreSum += score * weight;
    axisAccumulators[axis].weightSum += weight;
  }

  // ── Tolerance (0-100) ──
  // Normalize from 1-5 scale: (weightedAvg - 1) / 4 * 100
  let tolerance = 50; // default neutral
  if (axisAccumulators.tolerance.weightSum > 0) {
    const rawAvg =
      axisAccumulators.tolerance.weightedScoreSum /
      axisAccumulators.tolerance.weightSum;
    tolerance = ((rawAvg - 1) / 4) * 100;
    tolerance = Math.max(0, Math.min(100, tolerance));
  }

  // ── Capacity (0-100) ──
  // 40% questionnaire + 60% computed from intake
  let questionnaireCapacity = 50;
  if (axisAccumulators.capacity.weightSum > 0) {
    const rawAvg =
      axisAccumulators.capacity.weightedScoreSum /
      axisAccumulators.capacity.weightSum;
    questionnaireCapacity = ((rawAvg - 1) / 4) * 100;
    questionnaireCapacity = Math.max(0, Math.min(100, questionnaireCapacity));
  }

  const computedCapacity = computeCapacityFromIntake(intake);
  const capacity = questionnaireCapacity * 0.4 + computedCapacity * 0.6;

  // ── Need (%) ──
  const need = computeRequiredReturn(intake);

  // ── Bias Index (0-100) ──
  const biasIndex = computeBiasIndex(responses, questionMap);

  // ── Complexity (0-100) ──
  let complexity = 50;
  if (axisAccumulators.complexity.weightSum > 0) {
    const rawAvg =
      axisAccumulators.complexity.weightedScoreSum /
      axisAccumulators.complexity.weightSum;
    complexity = ((rawAvg - 1) / 4) * 100;
    complexity = Math.max(0, Math.min(100, complexity));
  }

  // Boost complexity if the client has multiple alternatives flagged
  const altFlags = intake.alternatives;
  const altCount = [
    altFlags.privateEquity,
    altFlags.privateCredit,
    altFlags.hedgeFunds,
    altFlags.realEstateDirect,
    altFlags.crypto,
    altFlags.collectibles,
    altFlags.concentratedStock,
  ].filter(Boolean).length;

  if (altCount >= 3) {
    complexity = Math.min(100, complexity + 10);
  } else if (altCount >= 2) {
    complexity = Math.min(100, complexity + 5);
  }

  return {
    tolerance: Math.round(tolerance * 100) / 100,
    capacity: Math.round(capacity * 100) / 100,
    need: Math.round(need * 100) / 100,
    biasIndex: Math.round(biasIndex * 100) / 100,
    complexity: Math.round(complexity * 100) / 100,
  };
}

// ── Capacity from Intake ─────────────────────────────────────────────

function computeCapacityFromIntake(intake: ClientIntake): number {
  const { demographics, financials, goals } = intake;

  // Age factor: younger = more capacity. Normalize (100 - age) to 0-100.
  // Age 20 -> 100, Age 80 -> ~25, Age 100 -> 0
  const ageFactor = Math.max(0, Math.min(100, (100 - demographics.age)));
  const ageNormalized = ageFactor; // already 0-100

  // Liquidity factor: emergencyReserveMonths / 24, capped at 1
  const liquidityFactor = Math.min(financials.emergencyReserveMonths / 24, 1);

  // Coverage factor: liquidNetWorth / annualExpenses / 10, capped at 1
  const coverageRatio =
    financials.annualExpenses > 0
      ? financials.liquidNetWorth / financials.annualExpenses / 10
      : 0;
  const coverageFactor = Math.min(coverageRatio, 1);

  // Debt factor: 1 - (debtObligations / annualIncome), clamped 0-1
  const debtRatio =
    financials.annualIncome > 0
      ? financials.debtObligations / financials.annualIncome
      : 1;
  const debtFactor = Math.max(0, Math.min(1, 1 - debtRatio));

  // Time horizon factor: average goal time horizon, normalized
  // 0 years -> 0, 5 years -> 0.33, 15 years -> 1.0, 30+ -> 1.0
  let timeHorizonFactor = 0.5; // default
  if (goals.length > 0) {
    const avgHorizon =
      goals.reduce((sum, g) => sum + g.timeHorizonYears, 0) / goals.length;
    timeHorizonFactor = Math.min(avgHorizon / 15, 1);
  }

  // Weighted blend of factors (all 0-1 range except ageNormalized which is 0-100)
  const capacity =
    (ageNormalized / 100) * 25 +
    liquidityFactor * 20 +
    coverageFactor * 20 +
    debtFactor * 15 +
    timeHorizonFactor * 20;

  // Scale to 0-100
  return Math.max(0, Math.min(100, capacity));
}

// ── Required Return ──────────────────────────────────────────────────

function computeRequiredReturn(intake: ClientIntake): number {
  const { financials, goals } = intake;

  if (goals.length === 0) return 0;

  const priorityWeights: Record<string, number> = {
    essential: 3,
    important: 2,
    aspirational: 1,
  };

  let weightedReturnSum = 0;
  let totalWeight = 0;

  for (const goal of goals) {
    // Estimate current allocation for this goal based on priority weighting
    const goalWeight = priorityWeights[goal.priority] ?? 1;
    const totalPriorityWeight = goals.reduce(
      (sum, g) => sum + (priorityWeights[g.priority] ?? 1),
      0,
    );
    const allocationFraction = goalWeight / totalPriorityWeight;
    const currentAllocation = financials.liquidNetWorth * allocationFraction;

    if (currentAllocation <= 0 || goal.timeHorizonYears <= 0) {
      continue;
    }

    const targetAmount = goal.targetAmount;
    if (targetAmount <= currentAllocation) {
      // Already funded
      weightedReturnSum += 0;
      totalWeight += goalWeight;
      continue;
    }

    // requiredReturn = ((targetAmount / currentAmount) ^ (1/years)) - 1
    const requiredReturn =
      (Math.pow(targetAmount / currentAllocation, 1 / goal.timeHorizonYears) - 1) * 100;

    weightedReturnSum += requiredReturn * goalWeight;
    totalWeight += goalWeight;
  }

  if (totalWeight === 0) return 0;

  return Math.max(0, weightedReturnSum / totalWeight);
}

// ── Bias Index ───────────────────────────────────────────────────────

function computeBiasIndex(
  responses: QuestionResponse[],
  questionMap: Map<number, RiskQuestion>,
): number {
  // Group bias-detection questions by their bias type
  const biasGroups: Record<string, { scores: number[]; weights: number[] }> = {};

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question || !question.biasDetection) continue;

    const score = getAnswerScore(question, response.answerValue);
    if (score === undefined) continue;

    const biasType = question.biasDetection;
    if (!biasGroups[biasType]) {
      biasGroups[biasType] = { scores: [], weights: [] };
    }
    biasGroups[biasType].scores.push(score);
    biasGroups[biasType].weights.push(question.weight ?? 1);
  }

  const biasTypes = Object.keys(biasGroups);
  if (biasTypes.length === 0) return 0;

  // For each bias type, measure inconsistency as deviation from mean
  let totalInconsistency = 0;
  let typeCount = 0;

  for (const biasType of biasTypes) {
    const { scores, weights } = biasGroups[biasType];
    if (scores.length < 2) {
      // Single question: check if score indicates strong bias
      // Low score on bias questions = more biased behavior
      // Normalize: (5 - score) / 4 gives 0 (no bias) to 1 (max bias)
      totalInconsistency += ((5 - scores[0]) / 4) * 50;
      typeCount++;
      continue;
    }

    // Weighted average
    let sumW = 0;
    let sumWS = 0;
    for (let i = 0; i < scores.length; i++) {
      sumWS += scores[i] * weights[i];
      sumW += weights[i];
    }
    const mean = sumWS / sumW;

    // Measure spread (inconsistency between pair answers)
    let deviationSum = 0;
    for (let i = 0; i < scores.length; i++) {
      deviationSum += Math.abs(scores[i] - mean);
    }
    const avgDeviation = deviationSum / scores.length;

    // Also factor in bias tendency (lower mean = more biased)
    const biasTendency = ((5 - mean) / 4) * 40;
    const inconsistency = (avgDeviation / 4) * 60 + biasTendency;

    totalInconsistency += inconsistency;
    typeCount++;
  }

  const biasIndex = typeCount > 0 ? totalInconsistency / typeCount : 0;
  return Math.max(0, Math.min(100, biasIndex));
}

// ── Risk Band Mapping ────────────────────────────────────────────────

/**
 * Map a 0-100 score to a RiskBand (1-7).
 *
 * Ranges:
 *   0-14  -> Band 1
 *   15-28 -> Band 2
 *   29-42 -> Band 3
 *   43-57 -> Band 4
 *   58-71 -> Band 5
 *   72-85 -> Band 6
 *   86-100 -> Band 7
 */
export function mapToRiskBand(score: number): RiskBand {
  if (score <= 14) return 1;
  if (score <= 28) return 2;
  if (score <= 42) return 3;
  if (score <= 57) return 4;
  if (score <= 71) return 5;
  if (score <= 85) return 6;
  return 7;
}

// ── Bias Detection ───────────────────────────────────────────────────

/**
 * Detect behavioral biases from question responses.
 * Checks questions flagged with biasDetection fields and evaluates
 * severity based on answer patterns.
 */
export function detectBiases(responses: QuestionResponse[]): DetectedBias[] {
  const questionMap = buildQuestionMap();
  const biases: DetectedBias[] = [];

  // Group responses by bias type
  const biasResponses: Record<
    string,
    { scores: number[]; questions: RiskQuestion[] }
  > = {};

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question || !question.biasDetection) continue;

    const score = getAnswerScore(question, response.answerValue);
    if (score === undefined) continue;

    const biasType = question.biasDetection;
    if (!biasResponses[biasType]) {
      biasResponses[biasType] = { scores: [], questions: [] };
    }
    biasResponses[biasType].scores.push(score);
    biasResponses[biasType].questions.push(question);
  }

  // Evaluate each bias type
  for (const [biasType, data] of Object.entries(biasResponses)) {
    const avgScore =
      data.scores.reduce((s, v) => s + v, 0) / data.scores.length;

    // Lower scores on bias-detection questions indicate stronger bias
    // (questions are typically scored so 1=biased, 5=rational)
    if (avgScore >= 3.5) continue; // No significant bias detected

    const severity: 'low' | 'moderate' | 'high' =
      avgScore < 1.5 ? 'high' : avgScore < 2.5 ? 'moderate' : 'low';

    const biasConfig: Record<
      string,
      {
        type: DetectedBias['type'];
        description: string;
        talkingPoint: string;
      }
    > = {
      loss_aversion: {
        type: 'loss_aversion',
        description:
          'Client shows elevated loss aversion — tends to weigh potential losses more heavily than equivalent gains, which may lead to overly conservative positioning.',
        talkingPoint:
          'Discuss how loss aversion can lead to missed opportunities. Frame potential losses in context of long-term goals and historical recovery patterns.',
      },
      recency: {
        type: 'recency',
        description:
          'Client demonstrates recency bias — recent market events disproportionately influence their risk perception and decision-making.',
        talkingPoint:
          'Present long-term historical data spanning multiple cycles. Show how recent events fit within broader market context and avoid anchoring to short-term performance.',
      },
      overconfidence: {
        type: 'overconfidence',
        description:
          'Client exhibits overconfidence bias — may overestimate their ability to time markets or pick winners, potentially underestimating downside risk.',
        talkingPoint:
          'Gently review past decision outcomes vs. benchmarks. Discuss the value of systematic, rules-based approaches over discretionary timing.',
      },
      framing: {
        type: 'framing',
        description:
          'Client is susceptible to framing effects — the way information is presented (gains vs. losses, percentages vs. dollars) significantly affects their decisions.',
        talkingPoint:
          'Present risk scenarios in multiple frames (percentage, dollar amount, relative to goals). Ensure the client sees the full picture before confirming risk preferences.',
      },
    };

    const config = biasConfig[biasType];
    if (!config) continue;

    biases.push({
      type: config.type,
      severity,
      description: config.description,
      advisorTalkingPoint: config.talkingPoint,
    });
  }

  // Check for herd behavior from behavioral questions (no explicit biasDetection tag)
  // Look at herd-related subcategory questions
  const herdScores: number[] = [];
  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) continue;
    if (question.subcategory === 'herd') {
      const score = getAnswerScore(question, response.answerValue);
      if (score !== undefined) herdScores.push(score);
    }
  }

  if (herdScores.length > 0) {
    const avgHerd =
      herdScores.reduce((s, v) => s + v, 0) / herdScores.length;
    if (avgHerd < 3.0) {
      const severity: 'low' | 'moderate' | 'high' =
        avgHerd < 1.5 ? 'high' : avgHerd < 2.5 ? 'moderate' : 'low';
      biases.push({
        type: 'herd',
        severity,
        description:
          'Client shows herd behavior tendencies — investment decisions are influenced by what others are doing rather than independent analysis.',
        advisorTalkingPoint:
          'Emphasize the importance of a personalized investment plan. Discuss how following the crowd often leads to buying high and selling low.',
      });
    }
  }

  return biases;
}

// ── Inconsistency Detection ──────────────────────────────────────────

/**
 * Detect contradictions between axis scores and intake data that
 * may require advisor attention or further discussion.
 */
export function detectInconsistencies(
  axisScores: AxisScores,
  intake: ClientIntake,
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  // High tolerance but low capacity
  if (axisScores.tolerance > 80 && axisScores.capacity < 30) {
    inconsistencies.push({
      dimensions: ['tolerance', 'capacity'],
      severity: 'critical',
      description:
        'High willingness but low financial ability to take risk. The client expresses comfort with volatility but their financial situation does not support aggressive positioning.',
      recommendation:
        'Recommend aligning portfolio to the lower capacity band. Explain that while emotional comfort exists, financial constraints require a more conservative approach to protect against adverse outcomes.',
    });
  }

  // Low tolerance but goals require aggressive returns
  if (axisScores.tolerance < 20 && axisScores.need > 8) {
    inconsistencies.push({
      dimensions: ['tolerance', 'need'],
      severity: 'critical',
      description:
        'Low tolerance but goals require aggressive returns. The client is uncomfortable with risk yet their financial goals demand returns that are only achievable with higher-risk portfolios.',
      recommendation:
        'Discuss adjusting goal expectations (lower target amounts, extend time horizons, or increase savings rate). If goals are essential, consider a phased approach with education on historical risk/return tradeoffs.',
    });
  }

  // Older client with high tolerance
  if (intake.demographics.age > 70 && axisScores.tolerance > 70) {
    inconsistencies.push({
      dimensions: ['age', 'tolerance'],
      severity: 'warning',
      description:
        'Consider if aggressive stance is appropriate given age. Client over 70 expresses high risk tolerance, but shorter expected investment horizon and potential income needs may warrant caution.',
      recommendation:
        'Review whether expressed tolerance is informed by full understanding of recovery timeframes. Ensure adequate liquidity and income provisions before adopting an aggressive allocation.',
    });
  }

  // Short time horizon but high risk appetite
  const avgHorizon =
    intake.goals.length > 0
      ? intake.goals.reduce((sum, g) => sum + g.timeHorizonYears, 0) /
        intake.goals.length
      : 10;

  if (avgHorizon < 3 && axisScores.tolerance > 60) {
    inconsistencies.push({
      dimensions: ['time_horizon', 'tolerance'],
      severity: 'warning',
      description:
        'Short time frame conflicts with risk appetite. The client has goals within 3 years but expresses tolerance for significant volatility, which could jeopardize near-term objectives.',
      recommendation:
        'Segment the portfolio: allocate near-term goal funding to conservative instruments while allowing longer-term assets to carry appropriate risk. Clearly delineate time-bucketed strategies.',
    });
  }

  // High capacity but very low tolerance
  if (axisScores.capacity > 80 && axisScores.tolerance < 20) {
    inconsistencies.push({
      dimensions: ['capacity', 'tolerance'],
      severity: 'info',
      description:
        'Strong financial position but very conservative risk preference. The client has significant capacity for risk but chooses not to take it, potentially leaving growth on the table.',
      recommendation:
        'Respect the client\'s preference but educate on the long-term cost of being overly conservative (purchasing power erosion). Consider a small allocation to growth as a "learning position."',
    });
  }

  // High complexity comfort but low knowledge (questionnaire complexity vs knowledge)
  if (axisScores.complexity > 70 && axisScores.tolerance < 30) {
    inconsistencies.push({
      dimensions: ['complexity', 'tolerance'],
      severity: 'info',
      description:
        'Client is comfortable with complex instruments but has low risk tolerance. Complex alternatives may introduce risks the client is not prepared for emotionally.',
      recommendation:
        'If using alternatives, focus on lower-volatility strategies (e.g., private credit, market-neutral hedge funds) rather than higher-volatility options (e.g., venture capital, crypto).',
    });
  }

  return inconsistencies;
}

// ── Goal Feasibility ─────────────────────────────────────────────────

function assessGoalFeasibility(
  intake: ClientIntake,
  recommendedReturn: number,
): GoalFeasibility[] {
  const { financials, goals } = intake;
  const feasibility: GoalFeasibility[] = [];

  const priorityWeights: Record<string, number> = {
    essential: 3,
    important: 2,
    aspirational: 1,
  };

  const totalPriorityWeight = goals.reduce(
    (sum, g) => sum + (priorityWeights[g.priority] ?? 1),
    0,
  );

  for (const goal of goals) {
    const goalWeight = priorityWeights[goal.priority] ?? 1;
    const allocationFraction = goalWeight / totalPriorityWeight;
    const currentAllocation = financials.liquidNetWorth * allocationFraction;

    let requiredReturn = 0;
    if (
      currentAllocation > 0 &&
      goal.targetAmount > currentAllocation &&
      goal.timeHorizonYears > 0
    ) {
      requiredReturn =
        (Math.pow(goal.targetAmount / currentAllocation, 1 / goal.timeHorizonYears) - 1) * 100;
    }

    const feasible = requiredReturn <= recommendedReturn;

    let shortfallNote = '';
    if (!feasible) {
      const shortfallPct = requiredReturn - recommendedReturn;
      shortfallNote =
        `Goal "${goal.name}" requires ${requiredReturn.toFixed(1)}% annual return, ` +
        `but the recommended portfolio targets ${recommendedReturn.toFixed(1)}%. ` +
        `There is a ${shortfallPct.toFixed(1)} percentage point gap. ` +
        `Consider extending the time horizon, increasing contributions, or adjusting the target amount.`;
    } else {
      shortfallNote =
        `Goal "${goal.name}" is achievable with the recommended portfolio return of ${recommendedReturn.toFixed(1)}%.`;
    }

    feasibility.push({
      goalName: goal.name,
      requiredReturn: Math.round(requiredReturn * 100) / 100,
      recommendedReturn: Math.round(recommendedReturn * 100) / 100,
      feasible,
      shortfallNote,
    });
  }

  return feasibility;
}

// ── Compliance Notes ─────────────────────────────────────────────────

/**
 * Generate a Reg BI-style compliance paragraph documenting the
 * recommendation rationale, covering all required elements.
 */
export function generateComplianceNotes(
  profile: RiskProfile,
  intake: ClientIntake,
): string {
  const { axisScores, toleranceBand, capacityBand, recommendedBand } = profile;
  const recLabel = RISK_BAND_LABELS[recommendedBand];
  const tolLabel = RISK_BAND_LABELS[toleranceBand];
  const capLabel = RISK_BAND_LABELS[capacityBand];

  const age = intake.demographics.age;
  const tier = intake.wealthTier;
  const goalCount = intake.goals.length;
  const avgHorizon =
    goalCount > 0
      ? (
          intake.goals.reduce((s, g) => s + g.timeHorizonYears, 0) / goalCount
        ).toFixed(1)
      : 'N/A';

  const biasNote =
    profile.detectedBiases.length > 0
      ? `${profile.detectedBiases.length} behavioral bias(es) were identified (${profile.detectedBiases.map((b) => b.type).join(', ')}) and should be discussed with the client.`
      : 'No significant behavioral biases were detected.';

  const inconsistencyNote =
    profile.inconsistencies.length > 0
      ? `${profile.inconsistencies.length} inconsistency(ies) between stated preferences and financial circumstances were noted and warrant advisor discussion.`
      : 'No material inconsistencies were identified between preferences and financial data.';

  const feasibilityNote = profile.goalFeasibility.some((g) => !g.feasible)
    ? 'One or more goals may not be achievable at the recommended risk level; goal adjustment discussions are recommended.'
    : 'All stated goals appear achievable within the recommended risk band.';

  return (
    `Regulation Best Interest (Reg BI) Disclosure — Risk Profile Recommendation\n\n` +
    `Client Profile: Age ${age}, wealth tier "${tier}", with ${goalCount} stated investment goal(s) ` +
    `and an average time horizon of ${avgHorizon} years. ` +
    `The client completed a ${profile.questionCount}-question risk assessment on ${profile.completedAt}.\n\n` +
    `Multi-Axis Assessment Results:\n` +
    `  - Risk Tolerance Score: ${axisScores.tolerance.toFixed(1)}/100 (Band ${toleranceBand}: ${tolLabel})\n` +
    `  - Risk Capacity Score: ${axisScores.capacity.toFixed(1)}/100 (Band ${capacityBand}: ${capLabel})\n` +
    `  - Required Return (Need): ${axisScores.need.toFixed(2)}%\n` +
    `  - Bias Index: ${axisScores.biasIndex.toFixed(1)}/100\n` +
    `  - Complexity Comfort: ${axisScores.complexity.toFixed(1)}/100\n\n` +
    `Recommendation: Risk Band ${recommendedBand} — "${recLabel}" ` +
    `(conservative alternative: Band ${profile.conservativePortfolio.band}, ` +
    `aggressive alternative: Band ${profile.aggressivePortfolio.band}). ` +
    `The recommended band was determined as the minimum of the tolerance and capacity bands, ` +
    `consistent with the principle that a client's risk exposure should not exceed their ` +
    `financial ability to bear losses, regardless of stated willingness.\n\n` +
    `Behavioral Assessment: ${biasNote}\n\n` +
    `Consistency Check: ${inconsistencyNote}\n\n` +
    `Goal Feasibility: ${feasibilityNote}\n\n` +
    `Profile confidence score: ${profile.confidence}/100. ` +
    `This assessment was conducted in accordance with FINRA Rule 2111 (Suitability), ` +
    `SEC Regulation Best Interest, and CFA Institute risk profiling guidelines. ` +
    `The advisor should review these results with the client and document any deviations ` +
    `from the recommended allocation along with the rationale for such deviations.`
  );
}

// ── Confidence Scoring ───────────────────────────────────────────────

function calculateConfidence(
  responses: QuestionResponse[],
  axisScores: AxisScores,
  inconsistencies: Inconsistency[],
): number {
  // Factor 1: Question coverage (40%)
  // Assume 15-25 questions is a full assessment
  const coverageFactor = Math.min(responses.length / 20, 1.0);

  // Factor 2: Axis score consistency (30%)
  // If tolerance and capacity are wildly different, confidence drops
  const axisDiff = Math.abs(axisScores.tolerance - axisScores.capacity);
  const consistencyFactor = Math.max(0, 1 - axisDiff / 100);

  // Factor 3: Absence of critical inconsistencies (30%)
  const criticalCount = inconsistencies.filter(
    (i) => i.severity === 'critical',
  ).length;
  const warningCount = inconsistencies.filter(
    (i) => i.severity === 'warning',
  ).length;
  const inconsistencyPenalty = Math.min(
    1,
    criticalCount * 0.3 + warningCount * 0.1,
  );
  const inconsistencyFactor = 1 - inconsistencyPenalty;

  const confidence =
    coverageFactor * 40 + consistencyFactor * 30 + inconsistencyFactor * 30;

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

// ── Main Orchestrator ────────────────────────────────────────────────

/**
 * Calculate a complete RiskProfile from questionnaire responses and
 * client intake data.
 *
 * Steps:
 *   1. Calculate axis scores (tolerance, capacity, need, bias, complexity)
 *   2. Map tolerance and capacity to risk bands
 *   3. Recommended band = min(toleranceBand, capacityBand)
 *   4. Conservative = max(1, recommended - 1)
 *   5. Aggressive = min(7, recommended + 1)
 *   6. Look up model portfolios and backtest results
 *   7. Detect biases
 *   8. Detect inconsistencies
 *   9. Assess goal feasibility
 *   10. Generate compliance notes
 *   11. Calculate confidence
 *   12. Assemble full RiskProfile
 */
export function calculateRiskProfile(
  responses: QuestionResponse[],
  intake: ClientIntake,
): RiskProfile {
  // 1. Calculate axis scores
  const axisScores = calculateAxisScores(responses, intake);

  // 2. Map to risk bands
  const toleranceBand = mapToRiskBand(axisScores.tolerance);
  const capacityBand = mapToRiskBand(axisScores.capacity);

  // 3-5. Determine recommended and adjacent bands
  const recommendedBand = Math.min(toleranceBand, capacityBand) as RiskBand;
  const conservativeBand = Math.max(1, recommendedBand - 1) as RiskBand;
  const aggressiveBand = Math.min(7, recommendedBand + 1) as RiskBand;

  // 6. Look up portfolios and backtest results
  const conservativePortfolio = MODEL_PORTFOLIOS[conservativeBand];
  const recommendedPortfolio = MODEL_PORTFOLIOS[recommendedBand];
  const aggressivePortfolio = MODEL_PORTFOLIOS[aggressiveBand];

  const conservativeBacktest = BACKTEST_RESULTS[conservativeBand];
  const recommendedBacktest = BACKTEST_RESULTS[recommendedBand];
  const aggressiveBacktest = BACKTEST_RESULTS[aggressiveBand];

  // 7. Detect biases
  const detectedBiases = detectBiases(responses);

  // 8. Detect inconsistencies
  const inconsistencies = detectInconsistencies(axisScores, intake);

  // 9. Goal feasibility
  const goalFeasibility = assessGoalFeasibility(
    intake,
    recommendedPortfolio.expectedReturn,
  );

  // 11. Confidence
  const confidence = calculateConfidence(responses, axisScores, inconsistencies);

  // 12. Assemble profile (compliance notes generated after assembly)
  const completedAt = new Date().toISOString();

  const profile: RiskProfile = {
    axisScores,
    toleranceBand,
    capacityBand,
    recommendedBand,

    conservativePortfolio,
    recommendedPortfolio,
    aggressivePortfolio,

    conservativeBacktest,
    recommendedBacktest,
    aggressiveBacktest,

    detectedBiases,
    inconsistencies,
    goalFeasibility,
    confidence,

    complianceNotes: '', // Populated below
    questionCount: responses.length,
    completedAt,
  };

  // 10. Generate compliance notes (needs assembled profile)
  profile.complianceNotes = generateComplianceNotes(profile, intake);

  return profile;
}
