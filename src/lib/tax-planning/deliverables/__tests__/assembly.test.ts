// =============================================================================
// Assembly Test
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { assembleDeliverable } from '../assembly';
import type { DeliverableCreateRequest } from '../types';
import type { TaxYear } from '../../types';

describe('Deliverable Assembly', () => {
  beforeEach(() => {
    store.seed();
  });

  it('should assemble client tax summary for hh-001', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    expect(deliverable.deliverableId).toBeDefined();
    expect(deliverable.householdId).toBe('hh-001');
    expect(deliverable.taxYear).toBe(2025);
    expect(deliverable.sectionBlocks.length).toBeGreaterThan(0);
  });

  it('should use custom title when provided', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Custom Title',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    expect(deliverable.title).toBe('Custom Title');
  });

  it('should auto-generate title when not provided', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    expect(deliverable.title).toContain('hh-001');
    expect(deliverable.title).toContain('2025');
  });

  it('should throw error when template not found', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'compliance', // No template for this combo
    };

    expect(() => assembleDeliverable(request, 'user-001')).toThrow();
  });

  it('should create section blocks in order', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    const orders = deliverable.sectionBlocks.map((b) => b.order);
    const sortedOrders = [...orders].sort((a, b) => a - b);

    expect(orders).toEqual(sortedOrders);
  });

  it('should set deliverable to draft status', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    expect(deliverable.status).toBe('draft');
    expect(deliverable.version).toBe(1);
  });

  it('should collect source refs from all blocks', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');

    expect(deliverable.sourceObjectRefs).toBeDefined();
    expect(Array.isArray(deliverable.sourceObjectRefs)).toBe(true);
  });
});
