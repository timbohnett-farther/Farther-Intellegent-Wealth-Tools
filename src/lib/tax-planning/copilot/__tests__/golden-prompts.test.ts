/**
 * Golden prompt tests — validates prompt construction for 8 benchmark scenarios.
 * Ensures prompts contain the right context and instructions.
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';
import type { SourcePackage } from '../types';
import type { TaxYear, MoneyCents, TaxLineRef } from '../../types';

// =====================================================================
// Shared Fixture
// =====================================================================

function goldenSourcePackage(): SourcePackage {
  return {
    household: {
      household_id: 'hh-golden',
      display_name: 'Golden Family',
      primary_state: 'CA',
      tax_year: 2025 as TaxYear,
      filing_status: 'MFJ',
      persons: [
        { person_id: 'p-1', first_name: 'Alice', last_name: 'Golden', dob: '1968-05-12' },
        { person_id: 'p-2', first_name: 'Bob', last_name: 'Golden', dob: '1970-09-03' },
      ],
    },
    extracted_fields: [
      { field_id: 'f-1', tax_line_ref: 'f1040:l1z:wages' as TaxLineRef, value_cents: 25000000 as MoneyCents, confidence: 0.97 },
      { field_id: 'f-2', tax_line_ref: 'f1040:l2b:taxable_interest' as TaxLineRef, value_cents: 500000 as MoneyCents, confidence: 0.95 },
      { field_id: 'f-3', tax_line_ref: 'f1040:l3a:qualified_dividends' as TaxLineRef, value_cents: 1200000 as MoneyCents, confidence: 0.94 },
      { field_id: 'f-4', tax_line_ref: 'f1040:l7:capital_gain_loss' as TaxLineRef, value_cents: 3500000 as MoneyCents, confidence: 0.92 },
      { field_id: 'f-5', tax_line_ref: 'f1040:l11:agi' as TaxLineRef, value_cents: 32000000 as MoneyCents, confidence: 0.99 },
      { field_id: 'f-6', tax_line_ref: 'f1040:l15:taxable_income' as TaxLineRef, value_cents: 28000000 as MoneyCents, confidence: 0.98 },
      { field_id: 'f-7', tax_line_ref: 'f1040:l16:tax' as TaxLineRef, value_cents: 5200000 as MoneyCents, confidence: 0.96 },
    ],
    calc_metrics: {
      calc_run_id: 'golden-run',
      scenario_id: 'golden-baseline',
      status: 'OK',
      metrics: {
        'federal.total_tax': 5200000 as MoneyCents,
        'federal.effective_rate_bps': 1857 as unknown as MoneyCents,
        'federal.marginal_rate_bps': 2400 as unknown as MoneyCents,
      },
    },
    opportunities: [
      {
        opportunity_id: 'opp-roth',
        category: 'roth_conversion',
        title: 'Roth IRA Conversion — $75K Optimal',
        summary: 'Converting $75K stays within 24% bracket',
        estimated_value: 18000,
        confidence: 'high',
        priority: 'high',
      },
      {
        opportunity_id: 'opp-bunch',
        category: 'bunching',
        title: 'Charitable Bunching Strategy',
        summary: 'Bundle 2 years of giving into current year',
        estimated_value: 4500,
        confidence: 'medium',
        priority: 'medium',
      },
    ],
    scenarios: [
      { scenario_id: 'golden-baseline', name: 'Baseline (Actuals)', is_baseline: true, metrics: { 'federal.total_tax': 5200000 as MoneyCents } },
      { scenario_id: 'golden-roth', name: 'With $75K Roth Conversion', is_baseline: false, metrics: { 'federal.total_tax': 6000000 as MoneyCents } },
      { scenario_id: 'golden-bunch', name: 'With Charitable Bunching', is_baseline: false, metrics: { 'federal.total_tax': 4750000 as MoneyCents } },
    ],
    policy_summary: { tax_year: 2025 as TaxYear },
    upstream_hash: 'golden-hash-123',
  };
}

// =====================================================================
// Golden Prompt Benchmarks
// =====================================================================

describe('Golden Prompt: Roth Conversion Explanation', () => {
  it('constructs a prompt for explaining a Roth conversion opportunity', () => {
    const system = buildSystemPrompt('explain_opportunity', 'advisor_internal');
    const user = buildUserPrompt(
      'explain_opportunity',
      'Explain the Roth conversion opportunity for the Golden family',
      goldenSourcePackage(),
      { opportunityId: 'opp-roth' },
    );

    expect(system).toContain('opportunity');
    expect(system).toContain('CRITICAL RULES');
    expect(user).toContain('Roth IRA Conversion');
    expect(user).toContain('Golden Family');
    expect(user).toContain('$75K');
    expect(user).toContain('Focus Opportunity');
  });
});

describe('Golden Prompt: Charitable Bunching Explanation', () => {
  it('constructs a prompt for explaining charitable bunching', () => {
    const user = buildUserPrompt(
      'explain_opportunity',
      'Explain the charitable bunching strategy',
      goldenSourcePackage(),
      { opportunityId: 'opp-bunch' },
    );

    expect(user).toContain('Charitable Bunching');
    expect(user).toContain('bunching');
  });
});

describe('Golden Prompt: Scenario Comparison', () => {
  it('includes all 3 scenarios in the comparison prompt', () => {
    const user = buildUserPrompt(
      'compare_scenarios',
      'Compare the baseline, Roth conversion, and bunching scenarios',
      goldenSourcePackage(),
      { scenarioId: 'golden-roth' },
    );

    expect(user).toContain('Baseline (Actuals)');
    expect(user).toContain('With $75K Roth Conversion');
    expect(user).toContain('With Charitable Bunching');
    expect(user).toContain('Focus Scenario');
  });
});

describe('Golden Prompt: Client Email Draft', () => {
  it('constructs a prompt for drafting a client email', () => {
    const system = buildSystemPrompt('draft_client_email', 'client_friendly');
    const user = buildUserPrompt(
      'draft_client_email',
      'Draft an email to the Goldens about their tax planning opportunities',
      goldenSourcePackage(),
    );

    expect(system).toContain('client-friendly email');
    expect(system).toContain('AUDIENCE');
    expect(system).toContain('non-expert');
    expect(user).toContain('Golden Family');
    expect(user).toContain('Alice Golden');
  });
});

describe('Golden Prompt: CPA Note Draft', () => {
  it('constructs a prompt for drafting a CPA coordination note', () => {
    const system = buildSystemPrompt('draft_cpa_note', 'cpa_technical');
    const user = buildUserPrompt(
      'draft_cpa_note',
      'Prepare a CPA coordination note for the Golden family',
      goldenSourcePackage(),
    );

    expect(system).toContain('CPA');
    expect(system).toContain('technical');
    expect(user).toContain('Extracted Tax Data');
    expect(user).toContain('f1040:l11:agi');
  });
});

describe('Golden Prompt: Meeting Prep', () => {
  it('constructs a meeting prep prompt', () => {
    const system = buildSystemPrompt('draft_meeting_prep', 'advisor_internal');
    const user = buildUserPrompt(
      'draft_meeting_prep',
      'Prepare for the Q4 review meeting with the Golden family',
      goldenSourcePackage(),
    );

    expect(system).toContain('meeting');
    expect(system).toContain('agenda');
    expect(user).toContain('Golden Family');
    expect(user).toContain('Detected Opportunities');
  });
});

describe('Golden Prompt: Missing Data Review', () => {
  it('constructs a missing data review prompt', () => {
    const system = buildSystemPrompt('missing_data_review', 'advisor_internal');
    const user = buildUserPrompt(
      'missing_data_review',
      'What data is missing for the Golden family?',
      goldenSourcePackage(),
    );

    expect(system).toContain('data completeness');
    expect(system).toContain('critical missing');
    expect(user).toContain('Golden Family');
  });
});

describe('Golden Prompt: Posture Summary (Executive)', () => {
  it('constructs an executive summary prompt', () => {
    const system = buildSystemPrompt('explain_line_item', 'executive_summary');
    const user = buildUserPrompt(
      'explain_line_item',
      'Summarize the tax posture for the Golden family',
      goldenSourcePackage(),
    );

    expect(system).toContain('executive');
    expect(system).toContain('high-level');
    expect(user).toContain('Golden Family');
    expect(user).toContain('CA');
  });
});
