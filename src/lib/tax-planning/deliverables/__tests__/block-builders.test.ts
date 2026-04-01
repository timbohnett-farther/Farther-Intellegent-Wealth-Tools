// =============================================================================
// Block Builders Test
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  buildSummaryBlock,
  buildComparisonTableBlock,
  buildOpportunityBlock,
  buildRecommendationBlock,
  buildNarrativeBlock,
  buildAssumptionsBlock,
  buildWarningsBlock,
  buildDisclaimerBlock,
  buildImplementationStepsBlock,
  buildAppendixBlock,
} from '../block-builders';
import type { DeliverableSourcePackage, DeliverableSectionBlueprint } from '../types';
import type { TaxYear } from '../../types';

const mockSourcePackage: DeliverableSourcePackage = {
  packageId: 'pkg-001',
  householdId: 'hh-001',
  taxYear: 2025 as TaxYear,
  deliverableType: 'client_tax_summary',
  audienceMode: 'client',
  facts: [],
  calculations: [],
  opportunities: [],
  scenarios: [],
  approvedAiAnswers: [],
  authorities: [],
  warnings: [],
  limitations: [],
};

const mockBlueprint: DeliverableSectionBlueprint = {
  blockType: 'summary',
  title: 'Test Block',
  required: true,
  sourcePriority: [],
};

describe('Block Builders', () => {
  it('should build summary block', () => {
    const block = buildSummaryBlock(mockBlueprint, mockSourcePackage, 0);

    expect(block.blockType).toBe('summary');
    expect(block.blockId).toBeDefined();
    expect(block.order).toBe(0);
    expect(block.content).toBeDefined();
  });

  it('should build comparison table block', () => {
    const block = buildComparisonTableBlock(mockBlueprint, mockSourcePackage, 1);

    expect(block.blockType).toBe('comparison_table');
    expect(block.order).toBe(1);
  });

  it('should build opportunity block', () => {
    const block = buildOpportunityBlock(mockBlueprint, mockSourcePackage, 2);

    expect(block.blockType).toBe('opportunity');
    expect(block.order).toBe(2);
  });

  it('should build recommendation block', () => {
    const block = buildRecommendationBlock(mockBlueprint, mockSourcePackage, 3);

    expect(block.blockType).toBe('recommendation');
    expect(block.order).toBe(3);
  });

  it('should build narrative block', () => {
    const block = buildNarrativeBlock(mockBlueprint, mockSourcePackage, 4);

    expect(block.blockType).toBe('narrative');
    expect(block.order).toBe(4);
  });

  it('should build assumptions block', () => {
    const block = buildAssumptionsBlock(mockBlueprint, mockSourcePackage, 5);

    expect(block.blockType).toBe('assumptions');
    expect(block.order).toBe(5);
  });

  it('should build warnings block', () => {
    const block = buildWarningsBlock(mockBlueprint, mockSourcePackage, 6);

    expect(block.blockType).toBe('warnings');
    expect(block.order).toBe(6);
  });

  it('should build disclaimer block', () => {
    const block = buildDisclaimerBlock(mockBlueprint, mockSourcePackage, 7);

    expect(block.blockType).toBe('disclaimer');
    expect(block.order).toBe(7);
    expect(block.content).toHaveProperty('text');
  });

  it('should build implementation steps block', () => {
    const block = buildImplementationStepsBlock(mockBlueprint, mockSourcePackage, 8);

    expect(block.blockType).toBe('implementation_steps');
    expect(block.order).toBe(8);
  });

  it('should build appendix block', () => {
    const block = buildAppendixBlock(mockBlueprint, mockSourcePackage, 9);

    expect(block.blockType).toBe('appendix');
    expect(block.order).toBe(9);
  });
});
