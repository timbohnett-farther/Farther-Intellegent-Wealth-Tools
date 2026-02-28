// Questionnaire Generator
// Selects a balanced subset of 15 questions from the 395-question bank,
// distributed across risk axes and scaled by wealth tier difficulty.

import type { QuestionAxis, WealthTier, RiskQuestion, Difficulty } from './types';
import { CATEGORY_TO_AXIS } from './types';
import { QUESTION_BANK } from './questions';

/** Target distribution of 15 questions across axes */
const AXIS_DISTRIBUTION: Record<QuestionAxis, number> = {
  tolerance: 5,
  capacity: 4,
  bias: 4,
  complexity: 2,
};

/** Map wealth tiers to preferred difficulty levels (higher tiers get harder questions) */
const TIER_DIFFICULTY_WEIGHTS: Record<WealthTier, Record<Difficulty, number>> = {
  emerging:      { easy: 3, medium: 2, hard: 1 },
  mass_affluent:  { easy: 1, medium: 3, hard: 2 },
  hnw:           { easy: 1, medium: 2, hard: 3 },
  uhnw:          { easy: 0, medium: 1, hard: 3 },
};

/**
 * Fisher-Yates in-place shuffle on a copy of the array.
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
 * Resolve the axis for a question, preferring the explicit `axis` field,
 * then falling back to CATEGORY_TO_AXIS mapping.
 */
function resolveAxis(question: RiskQuestion): QuestionAxis | undefined {
  if (question.axis) return question.axis;
  if (question.category && CATEGORY_TO_AXIS[question.category]) {
    return CATEGORY_TO_AXIS[question.category];
  }
  return undefined;
}

/**
 * Weighted random selection that prefers questions matching the tier's
 * difficulty profile. Questions without a difficulty field are treated as 'medium'.
 */
function weightedShuffle(
  pool: RiskQuestion[],
  wealthTier: WealthTier,
): RiskQuestion[] {
  const weights = TIER_DIFFICULTY_WEIGHTS[wealthTier];
  const scored = pool.map((q) => ({
    question: q,
    score: (weights[q.difficulty ?? 'medium'] || 1) + Math.random(),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.question);
}

/**
 * Generates a balanced 15-question questionnaire from the 395-question bank,
 * distributed across the 4 risk axes (tolerance, capacity, bias, complexity)
 * and weighted toward difficulty levels appropriate for the wealth tier.
 *
 * @param wealthTier - The client's wealth tier
 * @returns An array of 15 selected RiskQuestion objects
 */
export function generateQuestionnaire(
  wealthTier: WealthTier = 'emerging'
): RiskQuestion[] {
  const axes = Object.keys(AXIS_DISTRIBUTION) as QuestionAxis[];

  // Group all questions by resolved axis
  const axisPools: Record<QuestionAxis, RiskQuestion[]> = {
    tolerance: [],
    capacity: [],
    bias: [],
    complexity: [],
  };

  for (const q of QUESTION_BANK) {
    const axis = resolveAxis(q);
    if (axis) {
      axisPools[axis].push(q);
    }
  }

  const selected: RiskQuestion[] = [];

  for (const axis of axes) {
    const requiredCount = AXIS_DISTRIBUTION[axis];
    const pool = axisPools[axis];

    // Weighted shuffle prefers difficulty levels matching the wealth tier
    const ranked = weightedShuffle(pool, wealthTier);
    selected.push(...ranked.slice(0, requiredCount));
  }

  // Final shuffle to avoid predictable axis ordering
  return shuffleArray(selected);
}
