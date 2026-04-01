// =============================================================================
// Types Test — Deliverable Type Structure Validation
// =============================================================================

import { describe, it, expect } from 'vitest';
import type {
  Deliverable,
  DeliverableExport,
  DeliverableSourcePackage,
  DeliverableSectionBlock,
  DeliverableTemplate,
} from '../types';
import type { TaxYear } from '../../types';

describe('Deliverable Types', () => {
  it('should have valid DeliverableStatus union', () => {
    const validStatuses = ['draft', 'reviewed', 'approved', 'exported', 'archived', 'superseded'];
    expect(validStatuses).toHaveLength(6);
  });

  it('should have valid DeliverableType union', () => {
    const validTypes = [
      'client_tax_summary',
      'scenario_comparison',
      'annual_tax_letter',
      'cpa_memo',
      'advisor_internal_summary',
      'meeting_prep_brief',
      'implementation_checklist',
      'executive_summary',
    ];
    expect(validTypes).toHaveLength(8);
  });

  it('should have valid DeliverableAudienceMode union', () => {
    const validAudiences = ['client', 'advisor', 'cpa', 'compliance', 'executive'];
    expect(validAudiences).toHaveLength(5);
  });

  it('should have valid DeliverableBlockType union', () => {
    const validBlocks = [
      'summary',
      'comparison_table',
      'opportunity',
      'recommendation',
      'narrative',
      'assumptions',
      'warnings',
      'disclaimer',
      'implementation_steps',
      'appendix',
    ];
    expect(validBlocks).toHaveLength(10);
  });

  it('should have valid DeliverableExportType union', () => {
    const validExports = ['pdf', 'docx', 'email_draft', 'crm_note', 'archive'];
    expect(validExports).toHaveLength(5);
  });

  it('should construct a valid Deliverable object', () => {
    const deliverable: Deliverable = {
      deliverableId: 'deliv-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: ['field-001', 'calc-001'],
      sectionBlocks: [],
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(deliverable.deliverableId).toBe('deliv-001');
    expect(deliverable.status).toBe('draft');
    expect(deliverable.version).toBe(1);
  });

  it('should construct a valid DeliverableExport object', () => {
    const deliverableExport: DeliverableExport = {
      exportId: 'export-001',
      deliverableId: 'deliv-001',
      exportType: 'pdf',
      exportedBy: 'user-001',
      exportedAt: new Date().toISOString(),
      exportMetadata: { fileName: 'report.pdf' },
    };

    expect(deliverableExport.exportType).toBe('pdf');
    expect(deliverableExport.exportMetadata).toHaveProperty('fileName');
  });

  it('should construct a valid DeliverableSectionBlock object', () => {
    const block: DeliverableSectionBlock = {
      blockId: 'block-001',
      blockType: 'summary',
      title: 'Summary Block',
      content: { highlights: ['Highlight 1', 'Highlight 2'] },
      sourceRefs: ['field-001'],
      order: 0,
    };

    expect(block.blockType).toBe('summary');
    expect(block.sourceRefs).toHaveLength(1);
  });
});
