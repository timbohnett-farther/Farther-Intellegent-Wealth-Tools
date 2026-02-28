// Questionnaire Generator
// Selects a balanced subset of 15 questions from the 395-question bank
// for a single questionnaire session, filtered by wealth tier.

import type { Category, WealthTier, RiskQuestion } from './types';
import { CATEGORY_WEIGHTS } from './types';
import { QUESTION_BANK } from './questions';

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
 * Generates a balanced 15-question questionnaire from the question bank,
 * distributed across the 7 risk categories according to CATEGORY_WEIGHTS
 * and filtered to the selected wealth tier.
 *
 * Higher wealth tiers receive more complex, scenario-based questions.
 *
 * @param wealthTier - The client's wealth tier (hnw, vhnw, uhnw)
 * @returns A shuffled array of 15 selected RiskQuestion objects
 */
export function generateQuestionnaire(
  wealthTier: WealthTier = 'hnw'
): RiskQuestion[] {
  const totalQuestions = 15;
  const categories = Object.keys(CATEGORY_WEIGHTS) as Category[];

  // Distribute 15 questions across categories based on weights
  const distribution: Record<Category, number> = {} as Record<Category, number>;
  let distributed = 0;

  for (const category of categories) {
    const count = Math.round(totalQuestions * CATEGORY_WEIGHTS[category]);
    distribution[category] = Math.max(count, 1); // at least 1 per category
    distributed += distribution[category];
  }

  // Adjust to hit exact total by trimming from the largest category
  while (distributed > totalQuestions) {
    let largestCategory = categories[0];
    for (const category of categories) {
      if (distribution[category] > distribution[largestCategory]) {
        largestCategory = category;
      }
    }
    distribution[largestCategory] -= 1;
    distributed -= 1;
  }
  while (distributed < totalQuestions) {
    let largestCategory = categories[0];
    for (const category of categories) {
      if (CATEGORY_WEIGHTS[category] > CATEGORY_WEIGHTS[largestCategory] &&
          distribution[category] <= Math.round(totalQuestions * CATEGORY_WEIGHTS[category])) {
        largestCategory = category;
      }
    }
    distribution[largestCategory] += 1;
    distributed += 1;
  }

  // For each category, filter by wealth tier and randomly select
  const selected: RiskQuestion[] = [];

  for (const category of categories) {
    const requiredCount = distribution[category];
    if (requiredCount <= 0) continue;

    // Filter to this category and wealth tier
    let pool = QUESTION_BANK.filter(
      (q) => q.category === category && q.wealthTier === wealthTier
    );

    // Fallback: if not enough questions for this tier, include all tiers
    if (pool.length < requiredCount) {
      pool = QUESTION_BANK.filter((q) => q.category === category);
    }

    const shuffled = shuffleArray(pool);
    const picked = shuffled.slice(0, requiredCount);
    selected.push(...picked);
  }

  // Shuffle the final combined array to avoid predictable category ordering
  return shuffleArray(selected);
}
