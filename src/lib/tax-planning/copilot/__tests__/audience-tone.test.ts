/**
 * Tests for audience tone — same input → 5 different audience outputs.
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';
import type { AudienceMode, SourcePackage } from '../types';
import type { TaxYear, MoneyCents, TaxLineRef } from '../../types';

// =====================================================================
// Fixture
// =====================================================================

function standardSourcePackage(): SourcePackage {
  return {
    household: {
      household_id: 'hh-tone',
      display_name: 'Tone Test Family',
      primary_state: 'NY',
      tax_year: 2025 as TaxYear,
      filing_status: 'MFJ',
      persons: [
        { person_id: 'p-1', first_name: 'Test', last_name: 'User', dob: '1980-01-01' },
      ],
    },
    extracted_fields: [
      { field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef, value_cents: 20000000 as MoneyCents, confidence: 0.99 },
    ],
    calc_metrics: {
      calc_run_id: 'run-tone',
      scenario_id: 'scn-tone',
      status: 'OK',
      metrics: { 'federal.total_tax': 3000000 as MoneyCents },
    },
    opportunities: [],
    scenarios: [{ scenario_id: 'scn-tone', name: 'Baseline', is_baseline: true }],
    upstream_hash: 'tone-hash',
  };
}

const ALL_AUDIENCES: AudienceMode[] = [
  'advisor_internal',
  'client_friendly',
  'cpa_technical',
  'compliance_formal',
  'executive_summary',
];

// =====================================================================
// Tests
// =====================================================================

describe('Audience Tone Variations', () => {
  it('produces 5 different system prompts for the same family', () => {
    const prompts = ALL_AUDIENCES.map((aud) =>
      buildSystemPrompt('explain_line_item', aud),
    );

    // All should be different
    const unique = new Set(prompts);
    expect(unique.size).toBe(5);
  });

  it('user prompt is the same regardless of audience', () => {
    const pkg = standardSourcePackage();
    const prompts = ALL_AUDIENCES.map((aud) =>
      buildUserPrompt('explain_line_item', 'Explain AGI', pkg),
    );

    // All user prompts should be identical (audience only affects system prompt)
    const unique = new Set(prompts);
    expect(unique.size).toBe(1);
  });

  it('advisor_internal includes direct/technical language', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'advisor_internal');
    expect(prompt).toContain('Direct');
    expect(prompt).toContain('action-oriented');
  });

  it('client_friendly includes warm/simple language', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'client_friendly');
    expect(prompt).toContain('non-expert');
    expect(prompt).toContain('Warm');
    expect(prompt).toContain('jargon-free');
  });

  it('cpa_technical includes precise/reference-heavy language', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'cpa_technical');
    expect(prompt).toContain('Precise');
    expect(prompt).toContain('technical');
    expect(prompt).toContain('IRS form');
  });

  it('compliance_formal includes formal/conservative language', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'compliance_formal');
    expect(prompt).toContain('Formal');
    expect(prompt).toContain('documented');
    expect(prompt).toContain('regulatory');
  });

  it('executive_summary includes concise/impact-focused language', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'executive_summary');
    expect(prompt).toContain('Concise');
    expect(prompt).toContain('high-level');
    expect(prompt).toContain('strategic');
  });

  // Cross-validate: each audience contains AUDIENCE marker
  it.each(ALL_AUDIENCES)('audience %s includes AUDIENCE marker', (audience) => {
    const prompt = buildSystemPrompt('explain_line_item', audience);
    expect(prompt).toContain('AUDIENCE:');
    expect(prompt).toContain('TONE:');
  });

  // Cross-validate: all include the disclaimer instruction
  it.each(ALL_AUDIENCES)('audience %s includes disclaimer instruction', (audience) => {
    const prompt = buildSystemPrompt('explain_line_item', audience);
    expect(prompt).toContain('educational purposes');
  });
});

// =====================================================================
// Cross-Family × Cross-Audience
// =====================================================================

describe('Cross-Family × Audience Matrix', () => {
  const families = [
    'explain_line_item',
    'explain_opportunity',
    'compare_scenarios',
    'draft_client_email',
    'draft_cpa_note',
    'draft_meeting_prep',
    'missing_data_review',
  ] as const;

  it('generates 35 unique system prompts (7 families × 5 audiences)', () => {
    const prompts = new Set<string>();

    for (const family of families) {
      for (const audience of ALL_AUDIENCES) {
        prompts.add(buildSystemPrompt(family, audience));
      }
    }

    // All 35 combinations should be unique
    expect(prompts.size).toBe(35);
  });
});
