// =============================================================================
// Approval Test — State Machine and Approval Logic
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import {
  canTransitionDeliverable,
  getAllowedTransitions,
  isTerminalDeliverableState,
  approveDeliverable,
  reviewDeliverable,
} from '../approval';
import type { Deliverable } from '../types';

describe('Deliverable Approval State Machine', () => {
  beforeEach(() => {
    // Reset store before each test
    // @ts-ignore
    store.deliverables = new Map();
    store.seed();
  });

  it('should allow valid transitions from draft', () => {
    expect(canTransitionDeliverable('draft', 'reviewed')).toBe(true);
    expect(canTransitionDeliverable('draft', 'archived')).toBe(true);
    expect(canTransitionDeliverable('draft', 'approved')).toBe(false);
  });

  it('should allow valid transitions from reviewed', () => {
    expect(canTransitionDeliverable('reviewed', 'approved')).toBe(true);
    expect(canTransitionDeliverable('reviewed', 'draft')).toBe(true);
    expect(canTransitionDeliverable('reviewed', 'archived')).toBe(true);
    expect(canTransitionDeliverable('reviewed', 'exported')).toBe(false);
  });

  it('should allow valid transitions from approved', () => {
    expect(canTransitionDeliverable('approved', 'exported')).toBe(true);
    expect(canTransitionDeliverable('approved', 'superseded')).toBe(true);
    expect(canTransitionDeliverable('approved', 'draft')).toBe(false);
  });

  it('should allow valid transitions from exported', () => {
    expect(canTransitionDeliverable('exported', 'superseded')).toBe(true);
    expect(canTransitionDeliverable('exported', 'draft')).toBe(false);
  });

  it('should identify terminal states', () => {
    expect(isTerminalDeliverableState('archived')).toBe(true);
    expect(isTerminalDeliverableState('superseded')).toBe(true);
    expect(isTerminalDeliverableState('draft')).toBe(false);
    expect(isTerminalDeliverableState('approved')).toBe(false);
  });

  it('should get allowed transitions for a state', () => {
    const draftTransitions = getAllowedTransitions('draft');
    expect(draftTransitions).toContain('reviewed');
    expect(draftTransitions).toContain('archived');

    const approvedTransitions = getAllowedTransitions('approved');
    expect(approvedTransitions).toContain('exported');
    expect(approvedTransitions).toContain('superseded');
  });

  it('should review a deliverable', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-001',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    const reviewed = reviewDeliverable('test-deliv-001', 'user-002', 'Looks good');

    expect(reviewed.status).toBe('reviewed');
    expect(reviewed.reviewNote).toBe('Looks good');
  });

  it('should approve a deliverable', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-002',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'reviewed',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    const approved = approveDeliverable('test-deliv-002', 'user-002', 'Approved for client');

    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('user-002');
    expect(approved.approvedAt).toBeDefined();
  });

  it('should throw error when approving draft deliverable', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-003',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'draft',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    expect(() => approveDeliverable('test-deliv-003', 'user-002')).toThrow();
  });

  it('should throw error for invalid transition', () => {
    const deliverable: Deliverable = {
      deliverableId: 'test-deliv-004',
      householdId: 'hh-001',
      taxYear: 2025 as TaxYear,
      deliverableType: 'client_tax_summary',
      audienceMode: 'client',
      title: 'Test Deliverable',
      templateId: 'template-001',
      templateVersion: '1.0.0',
      sourceObjectRefs: [],
      sectionBlocks: [],
      status: 'superseded',
      version: 1,
      createdBy: 'user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.upsertDeliverable(deliverable);

    expect(() => reviewDeliverable('test-deliv-004', 'user-002')).toThrow();
  });
});
