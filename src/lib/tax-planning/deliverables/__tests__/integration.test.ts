// =============================================================================
// Integration Test — End-to-End Deliverable Lifecycle
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { assembleDeliverable } from '../assembly';
import { validateDeliverable } from '../validation';
import { reviewDeliverable, approveDeliverable } from '../approval';
import { exportDeliverable } from '../export-service';
import { supersedeDeliverable } from '../supersede';
import type { DeliverableCreateRequest } from '../types';

describe('Deliverable Lifecycle Integration', () => {
  beforeEach(() => {
    // @ts-ignore
    store.deliverables = new Map();
    // @ts-ignore
    store.deliverableExports = new Map();
    store.seed();
  });

  it('should complete full lifecycle: create → validate → review → approve → export → supersede', () => {
    // 1. Create deliverable
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Lifecycle Test',
    };

    const deliverable = assembleDeliverable(request, 'user-001');
    store.upsertDeliverable(deliverable);

    expect(deliverable.status).toBe('draft');
    expect(deliverable.deliverableId).toBeDefined();

    // 2. Validate
    const validation = validateDeliverable(deliverable);

    expect(['pass', 'pass_with_warning']).toContain(validation.status);

    // 3. Review
    const reviewed = reviewDeliverable(deliverable.deliverableId, 'user-002', 'Reviewed and approved for content');

    expect(reviewed.status).toBe('reviewed');
    expect(reviewed.reviewNote).toBeDefined();

    // 4. Approve
    const approved = approveDeliverable(deliverable.deliverableId, 'user-003', 'Final approval');

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('user-003');
    expect(approved.approvedAt).toBeDefined();

    // 5. Export
    const exported = exportDeliverable(deliverable.deliverableId, 'pdf', 'user-004');

    expect(exported.exportType).toBe('pdf');
    expect(exported.deliverableId).toBe(deliverable.deliverableId);

    const updatedAfterExport = store.getDeliverable(deliverable.deliverableId);
    expect(updatedAfterExport?.status).toBe('exported');

    // 6. Supersede
    const superseded = supersedeDeliverable(deliverable.deliverableId, 'user-005');

    expect(superseded.status).toBe('superseded');
  });

  it('should handle multiple deliverables for same household', () => {
    const request1: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const request2: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'scenario_comparison',
      audienceMode: 'advisor',
    };

    const deliv1 = assembleDeliverable(request1, 'user-001');
    const deliv2 = assembleDeliverable(request2, 'user-001');

    store.upsertDeliverable(deliv1);
    store.upsertDeliverable(deliv2);

    const { deliverables } = store.listDeliverables({ householdId: 'hh-001', taxYear: 2025 });

    expect(deliverables.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle export history tracking', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');
    store.upsertDeliverable(deliverable);

    reviewDeliverable(deliverable.deliverableId, 'user-002');
    approveDeliverable(deliverable.deliverableId, 'user-003');

    exportDeliverable(deliverable.deliverableId, 'pdf', 'user-004');
    exportDeliverable(deliverable.deliverableId, 'docx', 'user-004');
    exportDeliverable(deliverable.deliverableId, 'email_draft', 'user-004');

    const exports = store.listDeliverableExports(deliverable.deliverableId);

    expect(exports.length).toBe(3);
    expect(exports.some((e) => e.exportType === 'pdf')).toBe(true);
    expect(exports.some((e) => e.exportType === 'docx')).toBe(true);
  });

  it('should prevent modifications after approval', () => {
    const request: DeliverableCreateRequest = {
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
    };

    const deliverable = assembleDeliverable(request, 'user-001');
    store.upsertDeliverable(deliverable);

    reviewDeliverable(deliverable.deliverableId, 'user-002');
    approveDeliverable(deliverable.deliverableId, 'user-003');

    const approved = store.getDeliverable(deliverable.deliverableId);

    expect(approved?.status).toBe('approved');

    // Attempting to review again should fail
    expect(() => reviewDeliverable(deliverable.deliverableId, 'user-004')).toThrow();
  });
});
