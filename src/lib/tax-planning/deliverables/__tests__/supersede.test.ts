// =============================================================================
// Supersede Test
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { supersedeDeliverable, checkDeliverableStaleness, batchCheckDeliverableStaleness } from '../supersede';
import type { Deliverable } from '../types';
import type { TaxYear } from '../../types';

describe('Deliverable Supersede Logic', () => {
  beforeEach(() => {
    // @ts-ignore
    store.deliverables = new Map();
    store.seed();
  });

  it('should supersede a deliverable', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-sup-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'exported',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    const superseded = supersedeDeliverable('test-sup-001', 'user-002');

    expect(superseded.status).toBe('superseded');
  });

  it('should check staleness with no changes', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-sup-002',
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

    const staleness = checkDeliverableStaleness('test-sup-002');

    expect(staleness.isStale).toBe(false);
    expect(staleness.modifiedSources).toHaveLength(0);
    expect(staleness.missingSources).toHaveLength(0);
  });

  it('should detect missing sources', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-sup-003',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: ['nonexistent-source-001'],
      sectionBlocks: [],
      status: 'approved',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    const staleness = checkDeliverableStaleness('test-sup-003');

    expect(staleness.isStale).toBe(true);
    expect(staleness.missingSources).toContain('nonexistent-source-001');
  });

  it('should batch check staleness', () => {
    const deliverable1: Deliverable = {
      deliverableId: 'test-sup-004',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable 1',
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

    store.upsertDeliverable(deliverable1);

    const results = batchCheckDeliverableStaleness('hh-001', 2025);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('deliverableId');
    expect(results[0]).toHaveProperty('isStale');
  });
});
