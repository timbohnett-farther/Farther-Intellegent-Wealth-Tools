// ═══════════════════════════════════════════════════════════════════════
// Farther Focus — Questionnaire Generator
// Selects a balanced 15-question subset from the ~212-question bank,
// distributed across axes and filtered to the client's wealth tier.
// ═══════════════════════════════════════════════════════════════════════

import type { QuestionAxis, WealthTier, RiskQuestion } from './types';
import { QUESTION_BANK } from './questions';

// ── Constants ───────────────────────────────────────────────────────

/** Target distribution of 15 questions across the 4 risk axes */
const AXIS_DISTRIBUTION: Record<QuestionAxis, number> = {
  tolerance: 5,   // emotional_reaction + loss_scenarios + volatility_preference
  capacity: 4,    // time_horizon + liquidity_needs + financial_cushion
  bias: 4,        // behavioral_bias (with biasDetection markers)
  complexity: 2,  // alternatives_comfort + knowledge
};

/**
 * Ordered list of wealth tiers from lowest to highest.
 * Used for nearest-tier fallback logic.
 */
const TIER_ORDER: WealthTier[] = ['emerging', 'mass_affluent', 'hnw', 'uhnw'];

// ── Utilities ───────────────────────────────────────────────────────

/**
 * Fisher-Yates in-place shuffle on a copy of the array.
 * Returns a new shuffled array without mutating the original.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Returns the nearest wealth tier to the target, searching outward
 * from the target's position in the tier order. When two tiers are
 * equidistant, the lower tier is preferred (more conservative).
 */
function getNearestTiers(target: WealthTier): WealthTier[] {
  const targetIdx = TIER_ORDER.indexOf(target);
  const result: WealthTier[] = [target];

  // Expand outward: distance 1, 2, 3 ...
  for (let dist = 1; dist < TIER_ORDER.length; dist++) {
    // Prefer lower tier (more conservative) when equidistant
    const lower = targetIdx - dist;
    const upper = targetIdx + dist;
    if (lower >= 0) result.push(TIER_ORDER[lower]);
    if (upper < TIER_ORDER.length) result.push(TIER_ORDER[upper]);
  }

  return result;
}

/**
 * Filters the question bank by axis and wealth tier. If the target
 * tier does not have enough questions, falls back to the nearest tier
 * rather than mixing all tiers indiscriminately.
 */
function getPoolForAxis(
  axis: QuestionAxis,
  wealthTier: WealthTier,
  requiredCount: number,
): RiskQuestion[] {
  const tierFallbackOrder = getNearestTiers(wealthTier);

  let pool: RiskQuestion[] = [];

  for (const tier of tierFallbackOrder) {
    const tierQuestions = QUESTION_BANK.filter(
      (q) => q.axis === axis && q.wealthTier === tier,
    );
    pool = pool.concat(tierQuestions);

    if (pool.length >= requiredCount) {
      break;
    }
  }

  return pool;
}

/**
 * From the pool for a given axis, selects questions ensuring that:
 *   1. Bias axis questions include all 4 biasDetection types when possible
 *   2. Questions are shuffled to avoid predictable ordering
 *   3. Higher-weight questions are slightly preferred
 */
function selectFromPool(
  pool: RiskQuestion[],
  axis: QuestionAxis,
  count: number,
): RiskQuestion[] {
  if (pool.length <= count) {
    return shuffleArray(pool);
  }

  // For bias axis: ensure we get all 4 bias detection types
  if (axis === 'bias') {
    return selectBiasQuestions(pool, count);
  }

  // For other axes: weight-biased random selection
  return weightedSelect(pool, count);
}

/**
 * Selects bias questions ensuring representation of all 4 bias types:
 * framing, recency, loss_aversion, overconfidence.
 */
function selectBiasQuestions(pool: RiskQuestion[], count: number): RiskQuestion[] {
  const biasTypes: Array<'framing' | 'recency' | 'loss_aversion' | 'overconfidence'> = [
    'framing',
    'recency',
    'loss_aversion',
    'overconfidence',
  ];

  const selected: RiskQuestion[] = [];
  const usedIds = new Set<number>();

  // First pass: pick one question per bias type
  for (const biasType of biasTypes) {
    if (selected.length >= count) break;

    const candidates = shuffleArray(
      pool.filter((q) => q.biasDetection === biasType && !usedIds.has(q.id)),
    );

    if (candidates.length > 0) {
      selected.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
  }

  // Second pass: fill remaining slots from any bias questions not yet selected
  if (selected.length < count) {
    const remaining = shuffleArray(
      pool.filter((q) => !usedIds.has(q.id)),
    );
    for (const q of remaining) {
      if (selected.length >= count) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  return shuffleArray(selected);
}

/**
 * Weight-biased random selection. Questions with higher weight values
 * are more likely to be selected. Adds a random jitter to create variety
 * across questionnaire generations.
 */
function weightedSelect(pool: RiskQuestion[], count: number): RiskQuestion[] {
  const scored = pool.map((q) => ({
    question: q,
    score: q.weight + Math.random() * 0.5,
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map((s) => s.question);
}

// ── Main generator ──────────────────────────────────────────────────

/**
 * Generates a balanced 15-question questionnaire from the question bank,
 * distributed across the 4 risk axes and filtered to the client's
 * wealth tier.
 *
 * Distribution:
 *   - 5 tolerance (emotional_reaction + loss_scenarios + volatility_preference)
 *   - 4 capacity  (time_horizon + liquidity_needs + financial_cushion)
 *   - 4 bias      (behavioral_bias with biasDetection markers)
 *   - 2 complexity (alternatives_comfort + knowledge)
 *
 * If the target wealth tier does not have enough questions for an axis,
 * the generator falls back to the nearest adjacent tier rather than
 * mixing all tiers indiscriminately.
 *
 * @param wealthTier - The client's wealth tier
 * @returns A shuffled array of 15 selected RiskQuestion objects
 */
export function generateQuestionnaire(
  wealthTier: WealthTier,
): RiskQuestion[] {
  const axes = Object.keys(AXIS_DISTRIBUTION) as QuestionAxis[];
  const selected: RiskQuestion[] = [];

  for (const axis of axes) {
    const requiredCount = AXIS_DISTRIBUTION[axis];

    // Build the pool: primary tier first, then nearest-tier fallback
    const pool = getPoolForAxis(axis, wealthTier, requiredCount);

    // Select from the pool with axis-specific logic
    const picked = selectFromPool(pool, axis, requiredCount);
    selected.push(...picked);
  }

  // Shuffle the final set to avoid predictable axis ordering
  return shuffleArray(selected);
}
