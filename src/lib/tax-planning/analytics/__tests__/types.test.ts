// =============================================================================
// Analytics — Type Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type {
  MetricCategory,
  MetricGrain,
  FunnelStage,
  ValueAttributionStatus,
  MetricDefinition,
  KPIValue,
  RecommendationFunnel,
  ValueAttribution,
  ValueOfAdvice,
} from '../types';

describe('Analytics Types', () => {
  it('should define all metric categories', () => {
    const categories: MetricCategory[] = ['adoption', 'planning', 'funnel', 'execution', 'value', 'productivity'];
    expect(categories).toHaveLength(6);
  });

  it('should define all metric grains', () => {
    const grains: MetricGrain[] = ['household', 'advisor', 'team', 'office', 'firm', 'event'];
    expect(grains).toHaveLength(6);
  });

  it('should define all funnel stages', () => {
    const stages: FunnelStage[] = [
      'surfaced',
      'reviewed',
      'presented',
      'accepted',
      'deferred',
      'rejected',
      'in_implementation',
      'implemented',
      'superseded',
    ];
    expect(stages).toHaveLength(9);
  });

  it('should define all value attribution statuses', () => {
    const statuses: ValueAttributionStatus[] = ['proposed', 'accepted', 'implemented', 'superseded'];
    expect(statuses).toHaveLength(4);
  });

  it('should allow creating a MetricDefinition', () => {
    const metric: MetricDefinition = {
      metricId: 'test_metric',
      name: 'Test Metric',
      description: 'A test metric',
      category: 'adoption',
      grain: 'firm',
      sourceObjectTypes: ['User'],
      calculationMethod: 'count',
      inclusionRules: [],
      exclusionRules: [],
      freshness: 'hourly',
      limitations: [],
      status: 'active',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(metric.metricId).toBe('test_metric');
  });
});
