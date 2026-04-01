/**
 * Tests for copilot/formatters.ts — each draft formatter.
 */

import { describe, it, expect } from 'vitest';
import {
  formatEmailDraft,
  formatCpaNote,
  formatMeetingPrep,
  formatMissingDataReport,
} from '../formatters';
import type { CopilotAnswer, SourcePackage } from '../types';
import type { TaxYear, MoneyCents, TaxLineRef } from '../../types';

// =====================================================================
// Fixtures
// =====================================================================

function mockSourcePackage(): SourcePackage {
  return {
    household: {
      household_id: 'hh-001',
      display_name: 'Smith Family',
      primary_state: 'AZ',
      tax_year: 2025 as TaxYear,
      filing_status: 'MFJ',
      persons: [
        { person_id: 'p-1', first_name: 'John', last_name: 'Smith', dob: '1975-03-15' },
      ],
    },
    extracted_fields: [
      { field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef, value_cents: 18500000 as MoneyCents, confidence: 0.99 },
      { field_id: 'f-2', tax_line_ref: 'f1040:l15:taxable_income' as TaxLineRef, value_cents: 15500000 as MoneyCents, confidence: 0.98 },
    ],
    calc_metrics: {
      calc_run_id: 'run-1',
      scenario_id: 'scn-1',
      status: 'OK',
      metrics: { 'federal.total_tax': 2475000 as MoneyCents },
    },
    opportunities: [
      { opportunity_id: 'opp-1', category: 'roth_conversion', title: 'Roth', summary: 'Convert', confidence: 'high', priority: 'high' },
    ],
    scenarios: [
      { scenario_id: 'scn-1', name: 'Baseline', is_baseline: true },
    ],
    upstream_hash: 'abc',
  };
}

function mockAnswer(overrides: Partial<CopilotAnswer> = {}): CopilotAnswer {
  return {
    answer_id: 'a-1',
    firm_id: 'firm-001',
    household_id: 'hh-001',
    tax_year: 2025 as TaxYear,
    prompt_family: 'draft_client_email',
    audience: 'client_friendly',
    user_query: 'Draft an email about tax planning',
    answer_text: 'We have identified several tax planning opportunities for your household.',
    citations: [],
    confidence: 'high',
    confidence_factors: {
      data_completeness_pct: 90,
      blocker_count: 0,
      interpretation_level: 'analytical',
      all_citations_verified: true,
      hallucination_count: 0,
    },
    review_state: 'draft',
    upstream_hash: 'abc',
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

// =====================================================================
// formatEmailDraft()
// =====================================================================

describe('formatEmailDraft()', () => {
  it('returns an email with all required sections', () => {
    const email = formatEmailDraft(mockAnswer(), mockSourcePackage());
    expect(email.kind).toBe('email_draft');
    expect(email.subject).toContain('Smith Family');
    expect(email.greeting).toContain('John Smith');
    expect(email.body).toBeTruthy();
    expect(email.closing).toBeTruthy();
    expect(email.disclaimer).toContain('educational');
  });

  it('uses AI-generated formatted output when available', () => {
    const answer = mockAnswer({
      formatted_output: {
        kind: 'email_draft' as const,
        subject: 'Custom Subject',
        greeting: 'Hi there,',
        body: 'Custom body',
        closing: 'Custom closing',
        disclaimer: 'Custom disclaimer',
      },
    });
    const email = formatEmailDraft(answer, mockSourcePackage());
    expect(email.subject).toBe('Custom Subject');
    expect(email.greeting).toBe('Hi there,');
  });
});

// =====================================================================
// formatCpaNote()
// =====================================================================

describe('formatCpaNote()', () => {
  it('returns a CPA note with all required sections', () => {
    const note = formatCpaNote(
      mockAnswer({ prompt_family: 'draft_cpa_note' }),
      mockSourcePackage(),
    );
    expect(note.kind).toBe('cpa_note');
    expect(note.subject).toContain('Smith Family');
    expect(note.context).toBeTruthy();
    expect(note.key_figures.length).toBeGreaterThan(0);
    expect(note.action_items.length).toBeGreaterThan(0);
  });

  it('includes extracted fields in key figures', () => {
    const note = formatCpaNote(mockAnswer(), mockSourcePackage());
    const agiEntry = note.key_figures.find((f) => f.label.includes('agi'));
    expect(agiEntry).toBeDefined();
    expect(agiEntry!.value).toContain('$');
  });
});

// =====================================================================
// formatMeetingPrep()
// =====================================================================

describe('formatMeetingPrep()', () => {
  it('returns a meeting prep with all required sections', () => {
    const prep = formatMeetingPrep(
      mockAnswer({ prompt_family: 'draft_meeting_prep' }),
      mockSourcePackage(),
    );
    expect(prep.kind).toBe('meeting_prep');
    expect(prep.meeting_title).toContain('Smith Family');
    expect(prep.agenda_items.length).toBeGreaterThan(0);
    expect(prep.key_numbers.length).toBeGreaterThan(0);
  });

  it('includes opportunity count in agenda', () => {
    const prep = formatMeetingPrep(mockAnswer(), mockSourcePackage());
    const oppItem = prep.agenda_items.find((item) => item.includes('opportunity') || item.includes('opportunities'));
    expect(oppItem).toBeDefined();
  });
});

// =====================================================================
// formatMissingDataReport()
// =====================================================================

describe('formatMissingDataReport()', () => {
  it('returns a report with completeness percentage', () => {
    const report = formatMissingDataReport(mockAnswer(), mockSourcePackage());
    expect(report.kind).toBe('missing_data_report');
    expect(report.completeness_pct).toBeGreaterThanOrEqual(0);
    expect(report.completeness_pct).toBeLessThanOrEqual(100);
  });

  it('identifies critical gaps for empty source package', () => {
    const emptyPkg: SourcePackage = {
      household: {
        household_id: 'hh-empty',
        display_name: 'Empty',
        tax_year: 2025 as TaxYear,
        persons: [],
      },
      extracted_fields: [],
      opportunities: [],
      scenarios: [],
      upstream_hash: 'x',
    };
    const report = formatMissingDataReport(mockAnswer(), emptyPkg);
    expect(report.critical_gaps.length).toBeGreaterThan(0);
    // Should flag missing filing status
    const filingGap = report.critical_gaps.find((g) => g.field === 'filing_status');
    expect(filingGap).toBeDefined();
  });
});
