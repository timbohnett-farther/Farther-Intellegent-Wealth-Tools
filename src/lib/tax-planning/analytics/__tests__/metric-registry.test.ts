// =============================================================================
// Analytics — Metric Registry Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  getMetric,
  getAllMetrics,
  getMetricsByCategory,
  getActiveMetrics,
  getMetricCount,
} from '../metric-registry';

describe('Metric Registry', () => {
  it('should have at least 20 registered metrics', () => {
    const count = getMetricCount();
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it('should retrieve a metric by ID', () => {
    const metric = getMetric('active_advisors');
    expect(metric).toBeDefined();
    expect(metric?.metricId).toBe('active_advisors');
    expect(metric?.category).toBe('adoption');
  });

  it('should return undefined for unknown metric', () => {
    const metric = getMetric('nonexistent_metric');
    expect(metric).toBeUndefined();
  });

  it('should list all metrics', () => {
    const all = getAllMetrics();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should filter metrics by category', () => {
    const adoptionMetrics = getMetricsByCategory('adoption');
    expect(adoptionMetrics.length).toBeGreaterThan(0);
    adoptionMetrics.forEach((m) => {
      expect(m.category).toBe('adoption');
    });
  });

  it('should list all active metrics', () => {
    const active = getActiveMetrics();
    expect(active.length).toBeGreaterThan(0);
    active.forEach((m) => {
      expect(m.status).toBe('active');
    });
  });

  it('should have valid metric definitions', () => {
    const all = getAllMetrics();
    all.forEach((m) => {
      expect(m.metricId).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.calculationMethod).toBeTruthy();
      expect(Array.isArray(m.sourceObjectTypes)).toBe(true);
      expect(Array.isArray(m.inclusionRules)).toBe(true);
      expect(Array.isArray(m.exclusionRules)).toBe(true);
    });
  });
});
