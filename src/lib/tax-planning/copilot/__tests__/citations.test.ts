/**
 * Tests for copilot/citations.ts — citation building and validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildFactCitation,
  buildCalcCitation,
  buildOpportunityCitation,
  buildScenarioCitation,
  buildAuthorityCitation,
  validateCitations,
  TAX_KNOWLEDGE_BASE,
  resetCitationCounter,
} from '../citations';
import type { MoneyCents, TaxLineRef } from '../../types';

beforeEach(() => {
  resetCitationCounter();
});

// =====================================================================
// Citation Builders
// =====================================================================

describe('buildFactCitation()', () => {
  it('creates a fact citation with correct type', () => {
    const cite = buildFactCitation({
      field_id: 'field-001',
      tax_line_ref: 'f1040:l11:agi' as TaxLineRef,
      value_cents: 18500000 as MoneyCents,
    });
    expect(cite.type).toBe('fact');
    expect(cite.verified).toBe(true);
    expect(cite.field_id).toBe('field-001');
    expect(cite.value_cents).toBe(18500000);
    expect(cite.citation_id).toMatch(/^cite_/);
  });

  it('uses custom label when provided', () => {
    const cite = buildFactCitation({
      field_id: 'f-1',
      tax_line_ref: 'f1040:l1z:wages' as TaxLineRef,
      value_cents: 100 as MoneyCents,
      label: 'Custom label',
    });
    expect(cite.label).toBe('Custom label');
  });
});

describe('buildCalcCitation()', () => {
  it('creates a calc citation', () => {
    const cite = buildCalcCitation({
      calc_run_id: 'run-001',
      metric_id: 'federal.total_tax',
      value_cents: 2475000 as MoneyCents,
    });
    expect(cite.type).toBe('calc');
    expect(cite.calc_run_id).toBe('run-001');
    expect(cite.metric_id).toBe('federal.total_tax');
  });
});

describe('buildOpportunityCitation()', () => {
  it('creates an opportunity citation', () => {
    const cite = buildOpportunityCitation({
      opportunity_id: 'opp-001',
      category: 'roth_conversion',
      estimated_value: 15000,
    });
    expect(cite.type).toBe('opportunity');
    expect(cite.opportunity_id).toBe('opp-001');
    expect(cite.estimated_value).toBe(15000);
  });
});

describe('buildScenarioCitation()', () => {
  it('creates a scenario citation', () => {
    const cite = buildScenarioCitation({
      scenario_id: 'scn-001',
      scenario_name: 'Roth Conversion',
      metric_id: 'federal.total_tax',
      value_cents: 2000000 as MoneyCents,
    });
    expect(cite.type).toBe('scenario');
    expect(cite.scenario_name).toBe('Roth Conversion');
  });
});

describe('buildAuthorityCitation()', () => {
  it('creates a verified authority citation for known source', () => {
    const cite = buildAuthorityCitation({
      source_id: 'pub_590a',
      source_title: 'IRS Publication 590-A',
      section: 'Chapter 1',
      url: 'https://www.irs.gov/publications/p590a',
    });
    expect(cite.type).toBe('authority');
    expect(cite.verified).toBe(true);
  });

  it('creates an unverified citation for unknown source', () => {
    const cite = buildAuthorityCitation({
      source_id: 'fake',
      source_title: 'Fake IRS Publication 999',
    });
    expect(cite.verified).toBe(false);
  });
});

// =====================================================================
// Citation Validation
// =====================================================================

describe('validateCitations()', () => {
  it('validates authority citations against knowledge base', () => {
    const { validCitations, hallucinations } = validateCitations([
      {
        type: 'authority',
        label: 'IRS Pub 590-A',
        source_title: 'IRS Publication 590-A',
        url: 'https://www.irs.gov/publications/p590a',
      },
    ]);
    expect(validCitations).toHaveLength(1);
    expect(hallucinations).toHaveLength(0);
  });

  it('detects hallucinated authority sources', () => {
    const { validCitations, hallucinations } = validateCitations([
      {
        type: 'authority',
        label: 'Made up source',
        source_title: 'IRS Publication 999 — Does Not Exist',
      },
    ]);
    expect(validCitations).toHaveLength(0);
    expect(hallucinations).toHaveLength(1);
    expect(hallucinations[0]).toContain('Hallucinated authority source');
  });

  it('validates fact citations against source package', () => {
    const { validCitations, hallucinations } = validateCitations(
      [
        {
          type: 'fact',
          label: 'AGI',
          field_id: 'field-001',
          tax_line_ref: 'f1040:l11:agi',
          value_cents: 18500000,
        },
      ],
      {
        extracted_fields: [
          { field_id: 'field-001', tax_line_ref: 'f1040:l11:agi' as TaxLineRef },
        ],
      },
    );
    expect(validCitations).toHaveLength(1);
    expect(hallucinations).toHaveLength(0);
  });

  it('detects hallucinated fact citations', () => {
    const { validCitations, hallucinations } = validateCitations(
      [
        {
          type: 'fact',
          label: 'Fake field',
          field_id: 'field-999',
          tax_line_ref: 'f1040:l99:fake',
        },
      ],
      {
        extracted_fields: [
          { field_id: 'field-001', tax_line_ref: 'f1040:l11:agi' as TaxLineRef },
        ],
      },
    );
    expect(validCitations).toHaveLength(0);
    expect(hallucinations).toHaveLength(1);
  });

  it('handles mixed valid and invalid citations', () => {
    const { validCitations, hallucinations } = validateCitations([
      {
        type: 'authority',
        label: 'Valid',
        source_title: 'IRS Publication 590-A',
      },
      {
        type: 'authority',
        label: 'Invalid',
        source_title: 'Fake Publication',
      },
    ]);
    expect(validCitations).toHaveLength(1);
    expect(hallucinations).toHaveLength(1);
  });

  it('handles empty citations array', () => {
    const { validCitations, hallucinations } = validateCitations([]);
    expect(validCitations).toHaveLength(0);
    expect(hallucinations).toHaveLength(0);
  });
});

// =====================================================================
// Knowledge Base
// =====================================================================

describe('TAX_KNOWLEDGE_BASE', () => {
  it('contains at least 7 publications', () => {
    expect(TAX_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(7);
  });

  it('each entry has required fields', () => {
    for (const entry of TAX_KNOWLEDGE_BASE) {
      expect(entry.id).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.subtitle).toBeTruthy();
      expect(entry.url).toMatch(/^https:\/\/www\.irs\.gov/);
      expect(entry.topics.length).toBeGreaterThan(0);
    }
  });
});
