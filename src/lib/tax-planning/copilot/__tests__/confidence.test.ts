/**
 * Tests for copilot/confidence.ts — scoring with various data states.
 */

import { describe, it, expect } from 'vitest';
import {
  scoreConfidence,
  assessDataCompleteness,
  countBlockers,
  classifyInterpretationLevel,
} from '../confidence';
import type { SourcePackage, PromptFamily } from '../types';
import type { TaxYear, MoneyCents, TaxLineRef } from '../../types';

// =====================================================================
// Fixtures
// =====================================================================

function fullSourcePackage(): SourcePackage {
  return {
    household: {
      household_id: 'hh-001',
      display_name: 'Test Family',
      primary_state: 'AZ',
      tax_year: 2025 as TaxYear,
      filing_status: 'MFJ',
      persons: [{ person_id: 'p-1', first_name: 'Test', last_name: 'User' }],
    },
    extracted_fields: [
      { field_id: 'f-1', tax_line_ref: 'f1040:l1z:wages' as TaxLineRef, value_cents: 12000000 as MoneyCents, confidence: 0.97 },
      { field_id: 'f-2', tax_line_ref: 'f1040:l2b:taxable_interest' as TaxLineRef, value_cents: 350000 as MoneyCents, confidence: 0.95 },
      { field_id: 'f-3', tax_line_ref: 'f1040:l3b:ordinary_dividends' as TaxLineRef, value_cents: 850000 as MoneyCents, confidence: 0.93 },
      { field_id: 'f-4', tax_line_ref: 'f1040:l11:agi' as TaxLineRef, value_cents: 18500000 as MoneyCents, confidence: 0.99 },
      { field_id: 'f-5', tax_line_ref: 'f1040:l15:taxable_income' as TaxLineRef, value_cents: 15500000 as MoneyCents, confidence: 0.98 },
      { field_id: 'f-6', tax_line_ref: 'f1040:l16:tax' as TaxLineRef, value_cents: 2475000 as MoneyCents, confidence: 0.96 },
    ],
    calc_metrics: {
      calc_run_id: 'run-1',
      scenario_id: 'scn-1',
      status: 'OK',
      metrics: { 'federal.total_tax': 2475000 as MoneyCents },
    },
    opportunities: [{ opportunity_id: 'opp-1', category: 'roth_conversion', title: 'Roth', summary: 'Convert', confidence: 'high', priority: 'high' }],
    scenarios: [
      { scenario_id: 'scn-1', name: 'Baseline', is_baseline: true },
      { scenario_id: 'scn-2', name: 'Alt', is_baseline: false },
    ],
    upstream_hash: 'abc123',
  };
}

function emptySourcePackage(): SourcePackage {
  return {
    household: {
      household_id: 'hh-002',
      display_name: 'Empty Family',
      tax_year: 2025 as TaxYear,
      persons: [],
    },
    extracted_fields: [],
    opportunities: [],
    scenarios: [],
    upstream_hash: 'empty123',
  };
}

// =====================================================================
// assessDataCompleteness()
// =====================================================================

describe('assessDataCompleteness()', () => {
  it('returns 100% for full data against explain_line_item', () => {
    const pct = assessDataCompleteness(fullSourcePackage(), 'explain_line_item');
    expect(pct).toBe(100);
  });

  it('returns 0% for empty data', () => {
    const pct = assessDataCompleteness(emptySourcePackage(), 'explain_line_item');
    expect(pct).toBe(0);
  });

  it('returns 100% for missing_data_review (no expected fields)', () => {
    const pct = assessDataCompleteness(emptySourcePackage(), 'missing_data_review');
    expect(pct).toBe(100);
  });

  it('returns partial percentage for partially complete data', () => {
    const partial = fullSourcePackage();
    partial.extracted_fields = [
      { field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef, value_cents: 100 as MoneyCents, confidence: 0.9 },
    ];
    const pct = assessDataCompleteness(partial, 'explain_line_item');
    // Only 1 of 3 expected fields present
    expect(pct).toBe(33);
  });
});

// =====================================================================
// countBlockers()
// =====================================================================

describe('countBlockers()', () => {
  it('returns 0 for fully complete data', () => {
    const blockers = countBlockers(fullSourcePackage(), 'explain_line_item');
    expect(blockers).toBe(0);
  });

  it('counts missing filing status as a blocker', () => {
    const pkg = fullSourcePackage();
    delete (pkg.household as any).filing_status;
    const blockers = countBlockers(pkg, 'explain_line_item');
    expect(blockers).toBeGreaterThanOrEqual(1);
  });

  it('counts missing calc metrics as a blocker for compare_scenarios', () => {
    const pkg = fullSourcePackage();
    delete (pkg as any).calc_metrics;
    const blockers = countBlockers(pkg, 'compare_scenarios');
    expect(blockers).toBeGreaterThanOrEqual(1);
  });

  it('counts missing opportunities as a blocker for explain_opportunity', () => {
    const pkg = fullSourcePackage();
    pkg.opportunities = [];
    const blockers = countBlockers(pkg, 'explain_opportunity');
    expect(blockers).toBeGreaterThanOrEqual(1);
  });

  it('counts insufficient scenarios as a blocker for compare_scenarios', () => {
    const pkg = fullSourcePackage();
    pkg.scenarios = [pkg.scenarios[0]];
    const blockers = countBlockers(pkg, 'compare_scenarios');
    expect(blockers).toBeGreaterThanOrEqual(1);
  });

  it('does not count empty fields as blocker for missing_data_review', () => {
    const blockers = countBlockers(emptySourcePackage(), 'missing_data_review');
    // Only filing_status missing should count
    expect(blockers).toBeLessThanOrEqual(1);
  });
});

// =====================================================================
// classifyInterpretationLevel()
// =====================================================================

describe('classifyInterpretationLevel()', () => {
  it('returns factual for explain_line_item', () => {
    expect(classifyInterpretationLevel('explain_line_item')).toBe('factual');
  });

  it('returns factual for missing_data_review', () => {
    expect(classifyInterpretationLevel('missing_data_review')).toBe('factual');
  });

  it('returns analytical for explain_opportunity', () => {
    expect(classifyInterpretationLevel('explain_opportunity')).toBe('analytical');
  });

  it('returns speculative for draft_client_email', () => {
    expect(classifyInterpretationLevel('draft_client_email')).toBe('speculative');
  });
});

// =====================================================================
// scoreConfidence()
// =====================================================================

describe('scoreConfidence()', () => {
  it('returns high confidence for full data with no hallucinations', () => {
    const { factors, level } = scoreConfidence(fullSourcePackage(), [], 'explain_line_item');
    expect(level).toBe('high');
    expect(factors.data_completeness_pct).toBeGreaterThanOrEqual(80);
    expect(factors.blocker_count).toBe(0);
    expect(factors.hallucination_count).toBe(0);
  });

  it('returns low confidence for empty data', () => {
    const { level } = scoreConfidence(emptySourcePackage(), [], 'explain_line_item');
    expect(level).toBe('low');
  });

  it('degrades confidence with hallucinations', () => {
    const { factors } = scoreConfidence(
      fullSourcePackage(),
      ['Hallucinated: fake source', 'Another fake'],
      'explain_line_item',
    );
    expect(factors.hallucination_count).toBe(2);
    expect(factors.all_citations_verified).toBe(false);
  });

  it('returns medium for partial data (has 2 of 3 expected fields)', () => {
    const partial = fullSourcePackage();
    // Keep only wages and agi (2 of 3 expected for explain_line_item)
    partial.extracted_fields = partial.extracted_fields.filter(
      (f) => f.tax_line_ref === ('f1040:l1z:wages' as TaxLineRef) || f.tax_line_ref === ('f1040:l11:agi' as TaxLineRef),
    );
    const { level } = scoreConfidence(partial, [], 'explain_line_item');
    expect(level).toBe('medium');
  });
});
