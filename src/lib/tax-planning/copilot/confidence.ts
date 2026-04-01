// =============================================================================
// AI Copilot & Citation Layer — Confidence Scoring
// =============================================================================
//
// Evaluates data completeness, blocker count, and interpretation level
// to produce a confidence score for copilot answers.
// =============================================================================

import type {
  ConfidenceLevel,
  ConfidenceFactors,
  SourcePackage,
  PromptFamily,
} from './types';

// =====================================================================
// Expected Fields by Prompt Family
// =====================================================================

/**
 * Minimum expected data fields for each prompt family.
 * Used to calculate data completeness percentage.
 */
const EXPECTED_FIELDS: Record<PromptFamily, string[]> = {
  explain_line_item: [
    'f1040:l1z:wages',
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
  ],
  explain_opportunity: [
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
    'f1040:l16:tax',
  ],
  compare_scenarios: [
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
    'f1040:l16:tax',
  ],
  draft_client_email: [
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
  ],
  draft_cpa_note: [
    'f1040:l1z:wages',
    'f1040:l2b:taxable_interest',
    'f1040:l3b:ordinary_dividends',
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
    'f1040:l16:tax',
  ],
  draft_meeting_prep: [
    'f1040:l11:agi',
    'f1040:l15:taxable_income',
  ],
  missing_data_review: [
    // Expects minimal data — this family is specifically for finding gaps
  ],
};

// =====================================================================
// Data Completeness
// =====================================================================

/**
 * Assess data completeness as a percentage (0-100).
 * Compares present extracted fields against expected fields for the prompt family.
 */
export function assessDataCompleteness(
  sourcePackage: SourcePackage,
  promptFamily: PromptFamily,
): number {
  const expected = EXPECTED_FIELDS[promptFamily];

  // If no fields expected (e.g., missing_data_review), return 100
  if (expected.length === 0) return 100;

  const presentRefs = new Set(
    sourcePackage.extracted_fields.map((f) => f.tax_line_ref as string),
  );

  let matches = 0;
  for (const ref of expected) {
    if (presentRefs.has(ref)) matches++;
  }

  return Math.round((matches / expected.length) * 100);
}

// =====================================================================
// Blocker Count
// =====================================================================

/**
 * Count blocking issues that significantly impact answer quality.
 */
export function countBlockers(
  sourcePackage: SourcePackage,
  promptFamily: PromptFamily,
): number {
  let blockers = 0;

  // Missing filing status is always a blocker
  if (!sourcePackage.household.filing_status) {
    blockers++;
  }

  // No extracted fields is a blocker (except for missing_data_review)
  if (sourcePackage.extracted_fields.length === 0 && promptFamily !== 'missing_data_review') {
    blockers++;
  }

  // Missing calc metrics is a blocker for families that need computation
  const needsCalc: PromptFamily[] = ['compare_scenarios', 'draft_cpa_note', 'explain_line_item'];
  if (needsCalc.includes(promptFamily) && !sourcePackage.calc_metrics) {
    blockers++;
  }

  // Missing opportunities is a blocker for opportunity explanation
  if (promptFamily === 'explain_opportunity' && sourcePackage.opportunities.length === 0) {
    blockers++;
  }

  // Missing scenarios is a blocker for comparison
  if (promptFamily === 'compare_scenarios' && sourcePackage.scenarios.length < 2) {
    blockers++;
  }

  return blockers;
}

// =====================================================================
// Interpretation Level
// =====================================================================

/**
 * Classify the interpretation level required for this prompt family.
 * - factual: Just reporting data that exists
 * - analytical: Drawing conclusions from data
 * - speculative: Making projections or recommendations
 */
export function classifyInterpretationLevel(
  promptFamily: PromptFamily,
): 'factual' | 'analytical' | 'speculative' {
  switch (promptFamily) {
    case 'explain_line_item':
    case 'missing_data_review':
      return 'factual';
    case 'explain_opportunity':
    case 'compare_scenarios':
    case 'draft_cpa_note':
      return 'analytical';
    case 'draft_client_email':
    case 'draft_meeting_prep':
      return 'speculative';
    default:
      return 'analytical';
  }
}

// =====================================================================
// Score Confidence
// =====================================================================

/**
 * Compute the full confidence score for a copilot answer.
 *
 * @param sourcePackage - The assembled source data.
 * @param hallucinations - Hallucinated citations found during validation.
 * @param promptFamily - The prompt family being used.
 * @returns ConfidenceFactors and the resulting ConfidenceLevel.
 */
export function scoreConfidence(
  sourcePackage: SourcePackage,
  hallucinations: string[],
  promptFamily: PromptFamily,
): { factors: ConfidenceFactors; level: ConfidenceLevel } {
  const factors: ConfidenceFactors = {
    data_completeness_pct: assessDataCompleteness(sourcePackage, promptFamily),
    blocker_count: countBlockers(sourcePackage, promptFamily),
    interpretation_level: classifyInterpretationLevel(promptFamily),
    all_citations_verified: hallucinations.length === 0,
    hallucination_count: hallucinations.length,
  };

  const level = deriveConfidenceLevel(factors);

  return { factors, level };
}

/**
 * Derive a confidence level from confidence factors.
 *
 * HIGH:   >=80% completeness, 0 blockers, 0 hallucinations, factual or analytical
 * MEDIUM: >=50% completeness, <=1 blocker, <=1 hallucination
 * LOW:    Everything else
 */
function deriveConfidenceLevel(factors: ConfidenceFactors): ConfidenceLevel {
  // High confidence
  if (
    factors.data_completeness_pct >= 80 &&
    factors.blocker_count === 0 &&
    factors.hallucination_count === 0 &&
    factors.interpretation_level !== 'speculative'
  ) {
    return 'high';
  }

  // Medium confidence
  if (
    factors.data_completeness_pct >= 50 &&
    factors.blocker_count <= 1 &&
    factors.hallucination_count <= 1
  ) {
    return 'medium';
  }

  // Low confidence
  return 'low';
}
