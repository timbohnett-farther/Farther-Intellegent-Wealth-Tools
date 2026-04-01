/**
 * Tests for citation validation — all 5 citation types, edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateCitations,
  buildFactCitation,
  buildCalcCitation,
  buildOpportunityCitation,
  buildScenarioCitation,
  buildAuthorityCitation,
  TAX_KNOWLEDGE_BASE,
  resetCitationCounter,
} from '../citations';
import type { MoneyCents, TaxLineRef } from '../../types';

beforeEach(() => {
  resetCitationCounter();
});

// =====================================================================
// All 5 Citation Types — Valid Cases
// =====================================================================

describe('Citation Validation — Valid Cases', () => {
  it('validates a fact citation with matching source package', () => {
    const { validCitations, hallucinations } = validateCitations(
      [{ type: 'fact', label: 'AGI', field_id: 'f-1', tax_line_ref: 'f1040:l11:agi', value_cents: 18500000 }],
      { extracted_fields: [{ field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef }] },
    );
    expect(validCitations).toHaveLength(1);
    expect(validCitations[0].type).toBe('fact');
    expect(hallucinations).toHaveLength(0);
  });

  it('validates a calc citation with matching calc run', () => {
    const { validCitations } = validateCitations(
      [{ type: 'calc', label: 'Total Tax', calc_run_id: 'run-1', metric_id: 'federal.total_tax', value_cents: 2475000 }],
      { calc_metrics: { calc_run_id: 'run-1' } },
    );
    expect(validCitations).toHaveLength(1);
    expect(validCitations[0].type).toBe('calc');
  });

  it('validates an opportunity citation with matching opportunity', () => {
    const { validCitations } = validateCitations(
      [{ type: 'opportunity', label: 'Roth', opportunity_id: 'opp-1', category: 'roth_conversion' }],
      { opportunities: [{ opportunity_id: 'opp-1' }] },
    );
    expect(validCitations).toHaveLength(1);
    expect(validCitations[0].type).toBe('opportunity');
  });

  it('validates a scenario citation with matching scenario', () => {
    const { validCitations } = validateCitations(
      [{ type: 'scenario', label: 'Baseline', scenario_id: 'scn-1', scenario_name: 'Baseline', metric_id: 'tax', value_cents: 100 }],
      { scenarios: [{ scenario_id: 'scn-1' }] },
    );
    expect(validCitations).toHaveLength(1);
    expect(validCitations[0].type).toBe('scenario');
  });

  it('validates all authority sources from knowledge base', () => {
    for (const entry of TAX_KNOWLEDGE_BASE) {
      const { validCitations, hallucinations } = validateCitations([
        { type: 'authority', label: entry.title, source_title: entry.title, url: entry.url },
      ]);
      expect(validCitations).toHaveLength(1);
      expect(hallucinations).toHaveLength(0);
    }
  });
});

// =====================================================================
// All 5 Citation Types — Hallucination Cases
// =====================================================================

describe('Citation Validation — Hallucination Detection', () => {
  it('detects hallucinated fact (field not in source)', () => {
    const { hallucinations } = validateCitations(
      [{ type: 'fact', label: 'Fake', field_id: 'f-999', tax_line_ref: 'fake' }],
      { extracted_fields: [{ field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef }] },
    );
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated fact');
  });

  it('detects hallucinated calc (wrong calc run)', () => {
    const { hallucinations } = validateCitations(
      [{ type: 'calc', label: 'Fake', calc_run_id: 'fake-run', metric_id: 'tax' }],
      { calc_metrics: { calc_run_id: 'real-run' } },
    );
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated calc');
  });

  it('detects hallucinated opportunity (not in source)', () => {
    const { hallucinations } = validateCitations(
      [{ type: 'opportunity', label: 'Fake', opportunity_id: 'opp-999' }],
      { opportunities: [{ opportunity_id: 'opp-1' }] },
    );
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated opportunity');
  });

  it('detects hallucinated scenario (not in source)', () => {
    const { hallucinations } = validateCitations(
      [{ type: 'scenario', label: 'Fake', scenario_id: 'scn-999' }],
      { scenarios: [{ scenario_id: 'scn-1' }] },
    );
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated scenario');
  });

  it('detects hallucinated authority source', () => {
    const { hallucinations } = validateCitations([
      { type: 'authority', label: 'Fake', source_title: 'IRS Publication 999 — Does Not Exist' },
    ]);
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated authority');
  });
});

// =====================================================================
// Edge Cases
// =====================================================================

describe('Citation Validation — Edge Cases', () => {
  it('handles empty citations array', () => {
    const { validCitations, hallucinations } = validateCitations([]);
    expect(validCitations).toHaveLength(0);
    expect(hallucinations).toHaveLength(0);
  });

  it('handles unknown citation type', () => {
    const { hallucinations } = validateCitations([
      { type: 'unknown_type' as any, label: 'Test' },
    ]);
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Unknown citation type');
  });

  it('validates facts without source package (lenient mode)', () => {
    const { validCitations } = validateCitations(
      [{ type: 'fact', label: 'AGI', field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' }],
      // No source package
    );
    expect(validCitations).toHaveLength(1);
  });

  it('handles authority validation by URL only', () => {
    const { validCitations } = validateCitations([
      { type: 'authority', label: 'Some Label', source_title: 'Unknown Title', url: 'https://www.irs.gov/publications/p590a' },
    ]);
    expect(validCitations).toHaveLength(1);
  });

  it('handles authority validation by subtitle', () => {
    const { validCitations } = validateCitations([
      { type: 'authority', label: 'IRA Contributions', source_title: 'Contributions to Individual Retirement Arrangements (IRAs)' },
    ]);
    expect(validCitations).toHaveLength(1);
  });

  it('handles mixed valid and hallucinated citations', () => {
    const { validCitations, hallucinations } = validateCitations([
      { type: 'authority', label: 'Valid', source_title: 'IRS Publication 590-A' },
      { type: 'authority', label: 'Invalid', source_title: 'Fake Publication' },
      { type: 'fact', label: 'Valid', field_id: 'f-1', tax_line_ref: 'agi' },
      { type: 'fact', label: 'Invalid', field_id: 'f-999', tax_line_ref: 'fake' },
    ], {
      extracted_fields: [{ field_id: 'f-1', tax_line_ref: 'f1040:l11:agi' as TaxLineRef }],
    });
    expect(validCitations).toHaveLength(2);
    expect(hallucinations).toHaveLength(2);
  });
});
