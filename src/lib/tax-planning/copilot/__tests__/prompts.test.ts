/**
 * Tests for copilot/prompts.ts — prompt construction per family + audience.
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, getPromptConfig, getPromptVersion } from '../prompts';
import type { PromptFamily, AudienceMode, SourcePackage } from '../types';
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
        { person_id: 'p-2', first_name: 'Jane', last_name: 'Smith', dob: '1978-07-22' },
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
      {
        opportunity_id: 'opp-1',
        category: 'roth_conversion',
        title: 'Roth Conversion Opportunity',
        summary: 'Consider converting $50K',
        estimated_value: 15000,
        confidence: 'high',
        priority: 'high',
      },
    ],
    scenarios: [
      { scenario_id: 'scn-1', name: 'Baseline', is_baseline: true, metrics: { 'federal.total_tax': 2475000 as MoneyCents } },
      { scenario_id: 'scn-2', name: 'With Conversion', is_baseline: false, metrics: { 'federal.total_tax': 2800000 as MoneyCents } },
    ],
    policy_summary: { tax_year: 2025 as TaxYear },
    upstream_hash: 'abc123',
  };
}

// =====================================================================
// getPromptVersion()
// =====================================================================

describe('getPromptVersion()', () => {
  it('returns a semver string', () => {
    const version = getPromptVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// =====================================================================
// getPromptConfig()
// =====================================================================

describe('getPromptConfig()', () => {
  const families: PromptFamily[] = [
    'explain_line_item',
    'explain_opportunity',
    'compare_scenarios',
    'draft_client_email',
    'draft_cpa_note',
    'draft_meeting_prep',
    'missing_data_review',
  ];

  it.each(families)('returns config for %s', (family) => {
    const config = getPromptConfig(family);
    expect(config.systemPrompt).toBeTruthy();
    expect(config.temperature).toBeGreaterThanOrEqual(0);
    expect(config.temperature).toBeLessThanOrEqual(1);
    expect(config.maxTokens).toBeGreaterThan(0);
    expect(config.requiredContext).toBeDefined();
  });
});

// =====================================================================
// buildSystemPrompt()
// =====================================================================

describe('buildSystemPrompt()', () => {
  it('includes the family-specific system prompt', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'advisor_internal');
    expect(prompt).toContain('tax line item');
    expect(prompt).toContain('CRITICAL RULES');
  });

  it('includes the audience modifier', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'client_friendly');
    expect(prompt).toContain('AUDIENCE');
    expect(prompt).toContain('non-expert');
  });

  it('includes prompt version', () => {
    const prompt = buildSystemPrompt('explain_line_item', 'advisor_internal');
    expect(prompt).toContain('PROMPT VERSION');
    expect(prompt).toContain(getPromptVersion());
  });

  const audiences: AudienceMode[] = [
    'advisor_internal',
    'client_friendly',
    'cpa_technical',
    'compliance_formal',
    'executive_summary',
  ];

  it.each(audiences)('includes audience modifier for %s', (audience) => {
    const prompt = buildSystemPrompt('explain_line_item', audience);
    expect(prompt).toContain('AUDIENCE');
  });
});

// =====================================================================
// buildUserPrompt()
// =====================================================================

describe('buildUserPrompt()', () => {
  it('includes the user query', () => {
    const prompt = buildUserPrompt(
      'explain_line_item',
      'Explain my AGI',
      mockSourcePackage(),
    );
    expect(prompt).toContain('Explain my AGI');
  });

  it('includes household info', () => {
    const prompt = buildUserPrompt(
      'explain_line_item',
      'Test',
      mockSourcePackage(),
    );
    expect(prompt).toContain('Smith Family');
    expect(prompt).toContain('2025');
    expect(prompt).toContain('MFJ');
  });

  it('includes extracted fields with dollar values', () => {
    const prompt = buildUserPrompt('explain_line_item', 'Test', mockSourcePackage());
    expect(prompt).toContain('f1040:l11:agi');
    expect(prompt).toContain('$');
  });

  it('includes person names', () => {
    const prompt = buildUserPrompt('explain_line_item', 'Test', mockSourcePackage());
    expect(prompt).toContain('John Smith');
    expect(prompt).toContain('Jane Smith');
  });

  it('includes opportunities', () => {
    const prompt = buildUserPrompt('explain_opportunity', 'Test', mockSourcePackage());
    expect(prompt).toContain('Roth Conversion Opportunity');
  });

  it('includes scenarios', () => {
    const prompt = buildUserPrompt('compare_scenarios', 'Test', mockSourcePackage());
    expect(prompt).toContain('Baseline');
    expect(prompt).toContain('With Conversion');
  });

  it('includes focused tax line ref when provided', () => {
    const prompt = buildUserPrompt(
      'explain_line_item',
      'Explain this line',
      mockSourcePackage(),
      { taxLineRef: 'f1040:l11:agi' },
    );
    expect(prompt).toContain('Focus Line Item');
    expect(prompt).toContain('f1040:l11:agi');
  });

  it('includes focused opportunity when provided', () => {
    const prompt = buildUserPrompt(
      'explain_opportunity',
      'Explain this',
      mockSourcePackage(),
      { opportunityId: 'opp-1' },
    );
    expect(prompt).toContain('Focus Opportunity');
    expect(prompt).toContain('Roth Conversion');
  });
});
