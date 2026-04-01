// =============================================================================
// Validation Test
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { validateDeliverable } from '../validation';
import { assembleDeliverable } from '../assembly';
import type { Deliverable, DeliverableCreateRequest } from '../types';
import type { TaxYear } from '../../types';

describe('Deliverable Validation', () => {
  beforeEach(() => {
    store.seed();
  });

  it('should pass validation for valid deliverable', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');
    const validation = validateDeliverable(deliverable);

    expect(['pass', 'pass_with_warning']).toContain(validation.status);
  });

  it('should fail validation when required sections missing', () => {
    const deliverable: Deliverable = {
      deliverableId: 'invalid-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Invalid Deliverable',
      templateId: 'client-tax-summary-v1',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [], // No sections
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateDeliverable(deliverable);

    expect(validation.status).toBe('hard_fail_block_creation');
    expect(validation.blockers.length).toBeGreaterThan(0);
  });

  it('should warn on missing source refs', () => {
    const deliverable: Deliverable = {
      deliverableId: 'warn-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Warning Deliverable',
      templateId: 'client-tax-summary-v1',
      templateVersion: '1.0.0',
      sourceObjectRefs: ['nonexistent-001', 'nonexistent-002'],
      sectionBlocks: [
        {
          blockId: 'block-001',
          blockType: 'summary',
          title: 'Summary',
          content: { text: 'Content' },
          sourceRefs: [],
          order: 0,
        },
      ],
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateDeliverable(deliverable);

    expect(validation.warnings.length).toBeGreaterThan(0);
  });

  it('should validate disclaimer policy', () => {
    const deliverable: Deliverable = {
      deliverableId: 'disclaimer-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'No Disclaimer',
      templateId: 'client-tax-summary-v1',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [
        {
          blockId: 'block-001',
          blockType: 'summary',
          title: 'Summary',
          content: { text: 'Content' },
          sourceRefs: [],
          order: 0,
        },
      ],
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateDeliverable(deliverable);

    // Client tax summary template requires disclaimer
    expect(validation.blockers.length).toBeGreaterThan(0);
  });
});
