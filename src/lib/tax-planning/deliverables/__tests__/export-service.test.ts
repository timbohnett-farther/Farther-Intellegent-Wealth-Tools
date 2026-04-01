// =============================================================================
// Export Service Test
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { exportDeliverable, generateExportPayload, getExportHistory } from '../export-service';
import type { Deliverable } from '../types';
import type { TaxYear } from '../../types';

describe('Export Service', () => {
  beforeEach(() => {
    // @ts-ignore
    store.deliverables = new Map();
    // @ts-ignore
    store.deliverableExports = new Map();
    store.seed();
  });

  it('should create export record for approved deliverable', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-exp-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'approved',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    const exported = exportDeliverable('test-deliv-exp-001', 'pdf', 'user-002');

    expect(exported.exportType).toBe('pdf');
    expect(exported.exportedBy).toBe('user-002');
    expect(exported.deliverableId).toBe('test-deliv-exp-001');
  });

  it('should generate export payload with metadata', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-exp-002',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [
        {
          blockId: 'block-001',
          blockType: 'summary',
          title: 'Summary',
          content: { text: 'Test content' },
          sourceRefs: [],
          order: 0,
        },
      ],
      status: 'approved',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const payload = generateExportPayload(deliverable, 'pdf');

    expect(payload.meta).toBeDefined();
    expect(payload.sections).toHaveLength(1);
    expect(payload.renderHints).toBeDefined();
  });

  it('should generate different render hints per export type', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-exp-003',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'approved',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const pdfPayload = generateExportPayload(deliverable, 'pdf');
    const docxPayload = generateExportPayload(deliverable, 'docx');
    const emailPayload = generateExportPayload(deliverable, 'email_draft');

    expect(pdfPayload.renderHints).not.toEqual(docxPayload.renderHints);
    expect(docxPayload.renderHints).not.toEqual(emailPayload.renderHints);
  });

  it('should retrieve export history', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-exp-004',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'approved',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    exportDeliverable('test-deliv-exp-004', 'pdf', 'user-002');
    exportDeliverable('test-deliv-exp-004', 'docx', 'user-002');

    const history = getExportHistory('test-deliv-exp-004');
    expect(history.length).toBe(2);
  });
});
