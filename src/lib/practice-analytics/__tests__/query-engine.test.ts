/**
 * FP-Pulse — Query Engine Tests
 *
 * Comprehensive tests for the natural language query engine covering:
 * - Running natural language queries with known patterns
 * - Pattern matching for common advisor questions
 * - Quick query suggestions per role
 * - Query security validation (firm_id filtering, PII checks)
 * - QueryResult structure validation
 */

import { describe, it, expect } from 'vitest';
import {
  matchQueryPattern,
  getQuickQueries,
  validateQuerySecurity,
  generateMockQueryResult,
} from '../query-engine';
import { firmId, advisorId } from '../types';
import type { QueryContext } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const DEMO_FIRM_ID = firmId('firm-001');
const DEMO_ADVISOR_ID = advisorId('adv-001');

const advisorContext: QueryContext = {
  firmId: DEMO_FIRM_ID,
  advisorId: DEMO_ADVISOR_ID,
  role: 'ADVISOR',
  timezone: 'America/New_York',
};

const mdContext: QueryContext = {
  firmId: DEMO_FIRM_ID,
  advisorId: null,
  role: 'MD_PRINCIPAL',
  timezone: 'America/New_York',
};

// =============================================================================
// matchQueryPattern
// =============================================================================

describe('matchQueryPattern', () => {
  it('matches AUM-related queries', () => {
    const pattern = matchQueryPattern('What is my total AUM?');
    expect(pattern).not.toBeNull();
    expect(pattern!.patternId).toBeDefined();
  });

  it('matches client count queries', () => {
    const pattern = matchQueryPattern('How many clients do I have?');
    expect(pattern).not.toBeNull();
  });

  it('matches revenue queries', () => {
    const pattern = matchQueryPattern('What is my revenue?');
    expect(pattern).not.toBeNull();
  });

  it('matches retention queries', () => {
    const pattern = matchQueryPattern('What is the retention rate?');
    expect(pattern).not.toBeNull();
  });

  it('returns null for completely unknown patterns', () => {
    const pattern = matchQueryPattern('xyzzy foobar blargh');
    expect(pattern).toBeNull();
  });

  it('is case-insensitive', () => {
    const lower = matchQueryPattern('what is my total aum?');
    const upper = matchQueryPattern('WHAT IS MY TOTAL AUM?');
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
  });

  it('matched pattern has required fields', () => {
    const pattern = matchQueryPattern('What is my total AUM?');
    if (pattern) {
      expect(pattern).toHaveProperty('patternId');
      expect(pattern).toHaveProperty('confidence');
    }
  });
});

// =============================================================================
// generateMockQueryResult
// =============================================================================

describe('generateMockQueryResult', () => {
  it('returns a valid result for a matched pattern', () => {
    const match = matchQueryPattern('Which clients have not been contacted?');
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('narrative');
    }
  });

  it('returns a result with confidence from the pattern match', () => {
    const match = matchQueryPattern('What is my total AUM?');
    expect(match).not.toBeNull();
    if (match) {
      expect(match.confidence).toBeGreaterThan(0);
    }
  });

  it('returns a result with non-empty narrative', () => {
    const match = matchQueryPattern('What is the retention rate?');
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(result.narrative.length).toBeGreaterThan(0);
    }
  });

  it('returns a result with rows as an array', () => {
    const match = matchQueryPattern('Which clients are at risk of leaving?');
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(Array.isArray(result.rows)).toBe(true);
    }
  });

  it('returns a fallback result for unknown patterns', () => {
    const result = generateMockQueryResult('unknown_pattern_id', advisorContext);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('narrative');
  });
});

// =============================================================================
// getQuickQueries
// =============================================================================

describe('getQuickQueries', () => {
  it('returns quick queries for MD_PRINCIPAL role', () => {
    const queries = getQuickQueries('MD_PRINCIPAL');
    expect(Array.isArray(queries)).toBe(true);
    expect(queries.length).toBeGreaterThan(0);
  });

  it('returns quick queries for ADVISOR role', () => {
    const queries = getQuickQueries('ADVISOR');
    expect(Array.isArray(queries)).toBe(true);
    expect(queries.length).toBeGreaterThan(0);
  });

  it('returns quick queries for OPERATIONS role', () => {
    const queries = getQuickQueries('OPERATIONS');
    expect(Array.isArray(queries)).toBe(true);
    expect(queries.length).toBeGreaterThan(0);
  });

  it('each quick query has a question and category', () => {
    const queries = getQuickQueries('ADVISOR');
    for (const q of queries) {
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('category');
      expect(typeof q.question).toBe('string');
      expect(typeof q.category).toBe('string');
    }
  });

  it('MD_PRINCIPAL queries include firm-level questions', () => {
    const queries = getQuickQueries('MD_PRINCIPAL');
    const questions = queries.map((q) => q.question.toLowerCase());
    const hasFirmQuestion = questions.some(
      (q) => q.includes('firm') || q.includes('total') || q.includes('all') || q.includes('our'),
    );
    expect(hasFirmQuestion).toBe(true);
  });
});

// =============================================================================
// validateQuerySecurity
// =============================================================================

describe('validateQuerySecurity', () => {
  it('catches query missing firm_id filter', () => {
    const result = validateQuerySecurity(
      'SELECT * FROM clients',
      advisorContext,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasFilterViolation = result.errors.some(
      (v: string) => v.toLowerCase().includes('firm_id') || v.toLowerCase().includes('firm'),
    );
    expect(hasFilterViolation).toBe(true);
  });

  it('catches potential PII exposure', () => {
    const result = validateQuerySecurity(
      "SELECT ssn, date_of_birth FROM clients WHERE firm_id = 'firm-001'",
      advisorContext,
    );
    expect(result.valid).toBe(false);
    const hasPiiViolation = result.errors.some(
      (v: string) =>
        v.toLowerCase().includes('pii') ||
        v.toLowerCase().includes('sensitive') ||
        v.toLowerCase().includes('ssn'),
    );
    expect(hasPiiViolation).toBe(true);
  });

  it('passes a valid query with proper firm_id filter', () => {
    const result = validateQuerySecurity(
      "SELECT total_aum, client_count FROM practice_metrics WHERE firm_id = 'firm-001'",
      mdContext,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns a validation object with required fields', () => {
    const result = validateQuerySecurity(
      'SELECT * FROM clients',
      advisorContext,
    );
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// =============================================================================
// QueryResult Structure
// =============================================================================

describe('QueryResult structure', () => {
  it('has all required fields', () => {
    const match = matchQueryPattern('What is my total AUM?');
    expect(match).not.toBeNull();
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('narrative');
      expect(result).toHaveProperty('recommendedActions');
      expect(result).toHaveProperty('followUpQuestions');
    }
  });

  it('confidence from pattern match is between 0 and 1', () => {
    const match = matchQueryPattern('What is my total AUM?');
    if (match) {
      expect(match.confidence).toBeGreaterThanOrEqual(0);
      expect(match.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('rows is an array', () => {
    const match = matchQueryPattern('What is my total AUM?');
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(Array.isArray(result.rows)).toBe(true);
    }
  });

  it('followUpQuestions is an array of strings', () => {
    const match = matchQueryPattern('What is my total AUM?');
    if (match) {
      const result = generateMockQueryResult(match.patternId, advisorContext);
      expect(Array.isArray(result.followUpQuestions)).toBe(true);
      for (const q of result.followUpQuestions) {
        expect(typeof q).toBe('string');
      }
    }
  });
});
