/**
 * Tests for copilot/staleness.ts — changed upstream detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkStaleness, markStale, supersedeAnswer, batchCheckStaleness } from '../staleness';
import { buildSourcePackage } from '../retrieval';
import { store } from '../../store';
import type { CopilotAnswer } from '../types';
import type { TaxYear, MoneyCents } from '../../types';

// =====================================================================
// Fixtures
// =====================================================================

function mockAnswer(overrides: Partial<CopilotAnswer> = {}): CopilotAnswer {
  return {
    answer_id: 'test-answer-001',
    firm_id: 'firm-001',
    household_id: 'hh-001',
    tax_year: 2025 as TaxYear,
    prompt_family: 'explain_line_item',
    audience: 'advisor_internal',
    user_query: 'Explain AGI',
    answer_text: 'Your AGI is...',
    citations: [],
    confidence: 'high',
    confidence_factors: {
      data_completeness_pct: 90,
      blocker_count: 0,
      interpretation_level: 'factual',
      all_citations_verified: true,
      hallucination_count: 0,
    },
    review_state: 'draft',
    upstream_hash: 'original-hash',
    is_stale: false,
    prompt_version: '1.0.0',
    model_id: 'claude-sonnet-4-20250514',
    token_usage: { input_tokens: 100, output_tokens: 200 },
    created_by: 'user-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  // Reset store
  (store as any).copilotAnswers = new Map();
  (store as any).households = new Map();
  (store as any).persons = new Map();
  (store as any).documents = new Map();
  (store as any).extractedFields = new Map();
  (store as any).taxReturns = new Map();
  (store as any).scenarios = new Map();
  (store as any).calcRuns = new Map();
  store.seed();
});

// =====================================================================
// checkStaleness()
// =====================================================================

describe('checkStaleness()', () => {
  it('returns null for non-existent answer', () => {
    expect(checkStaleness('non-existent')).toBeNull();
  });

  it('detects stale answer when hash does not match', () => {
    const answer = mockAnswer({ upstream_hash: 'old-hash-that-wont-match' });
    store.upsertCopilotAnswer(answer);

    const result = checkStaleness('test-answer-001');
    expect(result).not.toBeNull();
    expect(result!.is_stale).toBe(true);
    expect(result!.original_hash).toBe('old-hash-that-wont-match');
    expect(result!.current_hash).not.toBe('old-hash-that-wont-match');
  });

  it('returns not stale when hashes match', () => {
    // First, get the current hash by building a source package
    const pkg = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(pkg).not.toBeNull();

    const answer = mockAnswer({ upstream_hash: pkg!.upstream_hash });
    store.upsertCopilotAnswer(answer);

    const result = checkStaleness('test-answer-001');
    expect(result!.is_stale).toBe(false);
  });
});

// =====================================================================
// markStale()
// =====================================================================

describe('markStale()', () => {
  it('returns null for non-existent answer', () => {
    expect(markStale('non-existent')).toBeNull();
  });

  it('marks an answer as stale', () => {
    store.upsertCopilotAnswer(mockAnswer());

    const result = markStale('test-answer-001');
    expect(result).not.toBeNull();
    expect(result!.is_stale).toBe(true);

    // Verify persisted
    const stored = store.getCopilotAnswer('test-answer-001');
    expect(stored!.is_stale).toBe(true);
  });
});

// =====================================================================
// supersedeAnswer()
// =====================================================================

describe('supersedeAnswer()', () => {
  it('returns null for non-existent answer', () => {
    expect(supersedeAnswer('non-existent')).toBeNull();
  });

  it('supersedes a draft answer', () => {
    store.upsertCopilotAnswer(mockAnswer({ review_state: 'draft' }));

    const result = supersedeAnswer('test-answer-001');
    expect(result).not.toBeNull();
    expect(result!.review_state).toBe('superseded');
    expect(result!.is_stale).toBe(true);
  });

  it('supersedes an approved answer', () => {
    store.upsertCopilotAnswer(mockAnswer({ review_state: 'approved_for_use' }));

    const result = supersedeAnswer('test-answer-001');
    expect(result!.review_state).toBe('superseded');
  });

  it('returns null for already discarded answer', () => {
    store.upsertCopilotAnswer(mockAnswer({ review_state: 'discarded' }));
    expect(supersedeAnswer('test-answer-001')).toBeNull();
  });

  it('returns null for already superseded answer', () => {
    store.upsertCopilotAnswer(mockAnswer({ review_state: 'superseded' }));
    expect(supersedeAnswer('test-answer-001')).toBeNull();
  });
});

// =====================================================================
// batchCheckStaleness()
// =====================================================================

describe('batchCheckStaleness()', () => {
  it('returns empty array for household with no answers', () => {
    const results = batchCheckStaleness('hh-001');
    expect(results).toEqual([]);
  });

  it('checks all answers for a household', () => {
    store.upsertCopilotAnswer(mockAnswer({ answer_id: 'a-1' }));
    store.upsertCopilotAnswer(mockAnswer({ answer_id: 'a-2' }));

    const results = batchCheckStaleness('hh-001');
    expect(results).toHaveLength(2);
  });

  it('auto-marks stale answers when autoMark is true', () => {
    store.upsertCopilotAnswer(mockAnswer({ answer_id: 'a-1', upstream_hash: 'old-hash' }));

    batchCheckStaleness('hh-001', true);

    const answer = store.getCopilotAnswer('a-1');
    expect(answer!.is_stale).toBe(true);
  });
});
