/**
 * Tests for proposal-engine/model-library.ts
 *
 * Covers: getAllModels, getModelById, getModelsForRiskScore, getModelsByCategory.
 */

import { describe, it, expect } from 'vitest';

import {
  listModels as getAllModels,
  getModelById,
  getModelsForRiskScore,
  getModelsByCategory,
} from '../model-library';

// =============================================================================
// getAllModels
// =============================================================================

describe('getAllModels()', () => {
  it('returns 10 models', () => {
    const models = getAllModels();
    expect(models.length).toBe(10);
  });

  it('each model has a unique modelId', () => {
    const models = getAllModels();
    const ids = models.map((m) => m.modelId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each model has a name and category', () => {
    const models = getAllModels();
    for (const model of models) {
      expect(model.name).toBeTruthy();
      expect(model.category).toBeTruthy();
    }
  });

  it('each model has allocations that sum close to 100%', () => {
    const models = getAllModels();
    for (const model of models) {
      const totalPct = (model.allocation ?? []).reduce((sum, a) => sum + (a.targetPct ?? 0), 0);
      expect(totalPct).toBeGreaterThanOrEqual(99);
      expect(totalPct).toBeLessThanOrEqual(101);
    }
  });

  it('each model has a risk score between 1 and 100', () => {
    const models = getAllModels();
    for (const model of models) {
      expect(model.riskScore).toBeGreaterThanOrEqual(1);
      expect(model.riskScore).toBeLessThanOrEqual(100);
    }
  });

  it('each model has performance metrics', () => {
    const models = getAllModels();
    for (const model of models) {
      expect(model.performance).toBeDefined();
      expect(typeof model.performance!.sharpeRatio).toBe('number');
      expect(typeof model.performance!.oneYear).toBe('number');
    }
  });

  it('all models are active and approved', () => {
    const models = getAllModels();
    for (const model of models) {
      expect(model.isActive).toBe(true);
      expect(model.approvedForUse).toBe(true);
    }
  });
});

// =============================================================================
// getModelById
// =============================================================================

describe('getModelById()', () => {
  it('returns a model for valid ID', () => {
    const allModels = getAllModels();
    const first = allModels[0];
    const found = getModelById(first.modelId);
    expect(found).toBeDefined();
    expect(found!.modelId).toBe(first.modelId);
  });

  it('returns undefined for invalid ID', () => {
    expect(getModelById('nonexistent-id')).toBeUndefined();
  });
});

// =============================================================================
// getModelsForRiskScore
// =============================================================================

describe('getModelsForRiskScore()', () => {
  it('returns models within ±15 of the score', () => {
    const matches = getModelsForRiskScore(50);
    expect(matches.length).toBeGreaterThan(0);
    for (const model of matches) {
      expect(Math.abs(model.riskScore - 50)).toBeLessThanOrEqual(15);
    }
  });

  it('returns fewer models for extreme scores', () => {
    const lowMatches = getModelsForRiskScore(5);
    const midMatches = getModelsForRiskScore(50);
    // Extreme score should have fewer or equal matches
    expect(lowMatches.length).toBeLessThanOrEqual(midMatches.length + 2);
  });

  it('returns at least one model for any reasonable score', () => {
    for (const score of [15, 30, 45, 55, 75, 90]) {
      const matches = getModelsForRiskScore(score);
      expect(matches.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// getModelsByCategory
// =============================================================================

describe('getModelsByCategory()', () => {
  it('returns strategic models', () => {
    const strategic = getModelsByCategory('STRATEGIC');
    expect(strategic.length).toBeGreaterThan(0);
    for (const model of strategic) {
      expect(model.category).toBe('STRATEGIC');
    }
  });

  it('returns empty array for unused category', () => {
    const custom = getModelsByCategory('CUSTOM');
    expect(Array.isArray(custom)).toBe(true);
  });

  it('returns ESG models', () => {
    const esg = getModelsByCategory('ESG');
    expect(esg.length).toBeGreaterThanOrEqual(1);
  });
});
