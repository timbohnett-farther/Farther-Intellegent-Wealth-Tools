// =============================================================================
// Templates Test — Template Registry Validation
// =============================================================================

import { describe, it, expect } from 'vitest';
import { getTemplate, getActiveTemplate, listTemplates } from '../templates';

describe('Template Registry', () => {
  it('should have templates for all 8 deliverable types', () => {
    const types = [
      'client_tax_summary',
      'scenario_comparison',
      'annual_tax_letter',
      'cpa_memo',
      'advisor_internal_summary',
      'meeting_prep_brief',
      'implementation_checklist',
      'executive_summary',
    ];

    for (const type of types) {
      const templates = listTemplates({ deliverableType: type as any });
      expect(templates.length).toBeGreaterThan(0);
    }
  });

  it('should retrieve template by ID', () => {
    const template = getTemplate('client-tax-summary-v1');
    expect(template).toBeDefined();
    expect(template?.templateId).toBe('client-tax-summary-v1');
  });

  it('should retrieve active template by type and audience', () => {
    const template = getActiveTemplate('client_tax_summary', 'client');
    expect(template).toBeDefined();
    expect(template?.deliverableType).toBe('client_tax_summary');
    expect(template?.audienceMode).toBe('client');
  });

  it('should return undefined for nonexistent template ID', () => {
    const template = getTemplate('nonexistent');
    expect(template).toBeUndefined();
  });

  it('should list enabled templates only', () => {
    const allTemplates = listTemplates();
    const enabledTemplates = listTemplates({ enabledOnly: true });

    expect(enabledTemplates.length).toBeGreaterThan(0);
    expect(enabledTemplates.every((t) => t.enabled)).toBe(true);
  });

  it('should filter templates by deliverable type', () => {
    const summaries = listTemplates({ deliverableType: 'client_tax_summary' });
    expect(summaries.every((t) => t.deliverableType === 'client_tax_summary')).toBe(true);
  });

  it('should filter templates by audience mode', () => {
    const clientTemplates = listTemplates({ audienceMode: 'client' });
    expect(clientTemplates.every((t) => t.audienceMode === 'client')).toBe(true);
  });

  it('should have required section blueprints', () => {
    const template = getTemplate('client-tax-summary-v1');
    expect(template?.sectionBlueprints.length).toBeGreaterThan(0);

    const requiredSections = template?.sectionBlueprints.filter((bp) => bp.required);
    expect(requiredSections).toBeDefined();
  });

  it('should have disclaimer policy defined', () => {
    const template = getTemplate('client-tax-summary-v1');
    expect(['always_include', 'conditional', 'never']).toContain(template?.disclaimerPolicy);
  });

  it('should have appendix policy defined', () => {
    const template = getTemplate('annual-tax-letter-v1');
    expect(['always_include', 'conditional', 'never']).toContain(template?.appendixPolicy);
  });
});
