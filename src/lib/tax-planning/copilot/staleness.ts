// =============================================================================
// AI Copilot & Citation Layer — Staleness Detection
// =============================================================================
//
// Compares upstream hashes to detect when source data has changed since an
// answer was generated. Provides batch staleness checking and superseding.
// =============================================================================

import type { TaxYear } from '../types';
import { store } from '../store';
import { buildSourcePackage, computeUpstreamHash } from './retrieval';
import type { CopilotAnswer } from './types';

// =====================================================================
// Staleness Check
// =====================================================================

/**
 * Check if a specific copilot answer is stale.
 * An answer is stale when the upstream source data hash no longer matches.
 *
 * @param answerId - The answer to check.
 * @returns Object with staleness info, or null if answer not found.
 */
export function checkStaleness(answerId: string): {
  answer_id: string;
  is_stale: boolean;
  original_hash: string;
  current_hash: string | null;
  reason?: string;
} | null {
  const answer = store.getCopilotAnswer(answerId);
  if (!answer) return null;

  const sourcePackage = buildSourcePackage(answer.household_id, answer.tax_year);
  if (!sourcePackage) {
    return {
      answer_id: answerId,
      is_stale: true,
      original_hash: answer.upstream_hash,
      current_hash: null,
      reason: 'Household no longer exists',
    };
  }

  const currentHash = sourcePackage.upstream_hash;
  const isStale = currentHash !== answer.upstream_hash;

  return {
    answer_id: answerId,
    is_stale: isStale,
    original_hash: answer.upstream_hash,
    current_hash: currentHash,
    reason: isStale ? 'Upstream data has changed since this answer was generated' : undefined,
  };
}

// =====================================================================
// Mark Stale
// =====================================================================

/**
 * Mark a specific answer as stale in the store.
 *
 * @param answerId - The answer to mark.
 * @returns The updated answer, or null if not found.
 */
export function markStale(answerId: string): CopilotAnswer | null {
  const answer = store.getCopilotAnswer(answerId);
  if (!answer) return null;

  const updated: CopilotAnswer = {
    ...answer,
    is_stale: true,
    updated_at: new Date().toISOString(),
  };

  store.upsertCopilotAnswer(updated);
  return updated;
}

// =====================================================================
// Supersede Answer
// =====================================================================

/**
 * Supersede an answer (mark it as replaced by a newer answer).
 * Only non-terminal states can be superseded.
 *
 * @param answerId - The answer to supersede.
 * @returns The updated answer, or null if not found or already terminal.
 */
export function supersedeAnswer(answerId: string): CopilotAnswer | null {
  const answer = store.getCopilotAnswer(answerId);
  if (!answer) return null;

  // Terminal states cannot be superseded
  if (answer.review_state === 'discarded' || answer.review_state === 'superseded') {
    return null;
  }

  const updated: CopilotAnswer = {
    ...answer,
    review_state: 'superseded',
    is_stale: true,
    updated_at: new Date().toISOString(),
  };

  store.upsertCopilotAnswer(updated);
  return updated;
}

// =====================================================================
// Batch Staleness Check
// =====================================================================

/**
 * Check staleness for all answers belonging to a household.
 * Optionally marks stale answers in the store.
 *
 * @param householdId - The household to check.
 * @param autoMark - If true, automatically marks stale answers in the store.
 * @returns Array of staleness results.
 */
export function batchCheckStaleness(
  householdId: string,
  autoMark: boolean = false,
): Array<{
  answer_id: string;
  is_stale: boolean;
  original_hash: string;
  current_hash: string | null;
}> {
  const { answers } = store.listCopilotAnswers({
    householdId,
    limit: 1000,
    offset: 0,
  });

  const results: Array<{
    answer_id: string;
    is_stale: boolean;
    original_hash: string;
    current_hash: string | null;
  }> = [];

  // Group by tax year to avoid redundant source package builds
  const byTaxYear = new Map<number, CopilotAnswer[]>();
  for (const answer of answers) {
    const year = answer.tax_year as number;
    const group = byTaxYear.get(year) ?? [];
    group.push(answer);
    byTaxYear.set(year, group);
  }

  for (const [year, yearAnswers] of byTaxYear) {
    const sourcePackage = buildSourcePackage(householdId, year as TaxYear);
    const currentHash = sourcePackage?.upstream_hash ?? null;

    for (const answer of yearAnswers) {
      const isStale = currentHash !== answer.upstream_hash;

      results.push({
        answer_id: answer.answer_id,
        is_stale: isStale,
        original_hash: answer.upstream_hash,
        current_hash: currentHash,
      });

      if (autoMark && isStale && !answer.is_stale) {
        markStale(answer.answer_id);
      }
    }
  }

  return results;
}
