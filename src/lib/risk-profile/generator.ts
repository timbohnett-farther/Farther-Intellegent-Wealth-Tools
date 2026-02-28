// Questionnaire Generator
// Selects a balanced subset of 15 questions from the question bank,
// distributed across axes and filtered by wealth tier.

import type { QuestionAxis, WealthTier, RiskQuestion } from './types';
import { QUESTION_BANK } from './questions';

/** Target distribution of 15 questions across axes */
const AXIS_DISTRIBUTION: Record<QuestionAxis, number> = {
  tolerance: 5,
  capacity: 4,
  bias: 4,
  complexity: 2,
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
 * Generates a balanced 15-question questionnaire from the question bank,
 * distributed across the 4 risk axes (tolerance, capacity, bias, complexity)
 * and filtered to the selected wealth tier.
 *
 * @param wealthTier - The client's wealth tier
 * @returns A shuffled array of 15 selected RiskQuestion objects
 */
export function generateQuestionnaire(
  wealthTier: WealthTier = 'emerging'
): RiskQuestion[] {
  const axes = Object.keys(AXIS_DISTRIBUTION) as QuestionAxis[];
  const selected: RiskQuestion[] = [];

  for (const axis of axes) {
    const requiredCount = AXIS_DISTRIBUTION[axis];

    // Filter to this axis and wealth tier
    let pool = QUESTION_BANK.filter(
      (q) => q.axis === axis && q.wealthTier === wealthTier
    );

    // Fallback: if not enough questions for this tier, include all tiers
    if (pool.length < requiredCount) {
      pool = QUESTION_BANK.filter((q) => q.axis === axis);
    }

    const shuffled = shuffleArray(pool);
    selected.push(...shuffled.slice(0, requiredCount));
  }

  // Shuffle the final combined array to avoid predictable axis ordering
  return shuffleArray(selected);
}
