// Questionnaire Generator
// Selects a balanced subset of questions from the full 395-question bank
// for a single questionnaire session.

import type { Category, Difficulty, RiskQuestion } from './types';
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
 * Generates a balanced questionnaire by selecting questions from the full
 * question bank, distributed across the 7 risk categories according to
 * CATEGORY_WEIGHTS.
 *
 * @param totalQuestions - Number of questions to include (default 25)
 * @param difficulty - Filter by difficulty level, or 'mixed' for all (default 'mixed')
 * @returns A shuffled array of selected RiskQuestion objects
 */
export function generateQuestionnaire(
  totalQuestions: number = 25,
  difficulty: Difficulty | 'mixed' = 'mixed'
): RiskQuestion[] {
  const categories = Object.keys(CATEGORY_WEIGHTS) as Category[];

  // Step 1: Distribute totalQuestions across categories based on weights
  const distribution: Record<Category, number> = {} as Record<Category, number>;
  let distributed = 0;

  for (const category of categories) {
    const count = Math.round(totalQuestions * CATEGORY_WEIGHTS[category]);
    distribution[category] = count;
    distributed += count;
  }

  // Adjust to hit exact total by adding/removing from the largest category
  const diff = totalQuestions - distributed;
  if (diff !== 0) {
    // Find the category with the largest allocation
    let largestCategory = categories[0];
    for (const category of categories) {
      if (distribution[category] > distribution[largestCategory]) {
        largestCategory = category;
      }
    }
    distribution[largestCategory] += diff;
  }

  // Steps 2-4: For each category, filter and randomly select questions
  const selected: RiskQuestion[] = [];

  for (const category of categories) {
    const requiredCount = distribution[category];
    if (requiredCount <= 0) continue;

    // Filter to this category
    let pool = QUESTION_BANK.filter((q) => q.category === category);

    // If a specific difficulty is requested, further filter
    if (difficulty !== 'mixed') {
      pool = pool.filter((q) => q.difficulty === difficulty);
    }

    // Randomly select using Fisher-Yates shuffle, take first N
    const shuffled = shuffleArray(pool);
    const picked = shuffled.slice(0, requiredCount);
    selected.push(...picked);
  }

  // Steps 5-7: Shuffle the final combined array to avoid predictable category ordering
  return shuffleArray(selected);
}
