// =============================================================================
// Analytics — Integration Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../../store';
import { computeKPI } from '../kpi-engine';
import { computeRecommendationFunnel } from '../funnel-engine';
import { computeValueOfAdvice } from '../value-engine';
import { computeWorkflowBottlenecks } from '../bottleneck-engine';
import { getFirmOverview, getAdvisorDashboard } from '../dashboard-service';
import type { TaxYear } from '../../types';

describe('Analytics Integration', () => {
  beforeEach(() => {
    // Store is auto-seeded on import
  });

  it('should compute adoption KPIs for firm', () => {
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const periodEnd = new Date().toISOString();

    const activeAdvisors = computeKPI('active_advisors', 'firm', 'firm-001', periodStart, periodEnd);
    expect(activeAdvisors.metricId).toBe('active_advisors');
    expect(typeof activeAdvisors.value).toBe('number');

    const activeHouseholds = computeKPI('active_households', 'firm', 'firm-001', periodStart, periodEnd);
    expect(activeHouseholds.metricId).toBe('active_households');
    expect(typeof activeHouseholds.value).toBe('number');
  });

  it('should compute planning KPIs', () => {
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const scenariosCreated = computeKPI('scenarios_created', 'firm', 'firm-001', periodStart, periodEnd);
    expect(scenariosCreated.metricId).toBe('scenarios_created');
    expect(typeof scenariosCreated.value).toBe('number');
  });

  it('should compute recommendation funnel', () => {
    const funnel = computeRecommendationFunnel({
      firmId: 'firm-001',
      taxYear: 2025 as TaxYear,
      periodStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
    });

    expect(funnel.firmId).toBe('firm-001');
    expect(funnel.taxYear).toBe(2025);
    expect(Array.isArray(funnel.stages)).toBe(true);
    expect(funnel.stages.length).toBeGreaterThan(0);
  });

  it('should compute value of advice dashboard', () => {
    const valueOfAdvice = computeValueOfAdvice(
      'firm',
      'firm-001',
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    expect(valueOfAdvice.scopeType).toBe('firm');
    expect(valueOfAdvice.scopeRefId).toBe('firm-001');
    expect(typeof valueOfAdvice.proposedValueCents).toBe('number');
    expect(typeof valueOfAdvice.acceptedValueCents).toBe('number');
    expect(typeof valueOfAdvice.implementedValueCents).toBe('number');
    expect(typeof valueOfAdvice.implementationRate).toBe('number');
    expect(typeof valueOfAdvice.planningCoverage).toBe('number');
  });

  it('should detect workflow bottlenecks', () => {
    const bottlenecks = computeWorkflowBottlenecks();
    expect(Array.isArray(bottlenecks)).toBe(true);

    if (bottlenecks.length > 0) {
      const first = bottlenecks[0];
      expect(first.metricType).toBeTruthy();
      expect(typeof first.value).toBe('number');
      expect(typeof first.isAlert).toBe('boolean');
    }
  });

  it('should generate firm overview dashboard', () => {
    const overview = getFirmOverview(
      'firm-001',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    expect(overview.firmId).toBe('firm-001');
    expect(typeof overview.activeAdvisors).toBe('number');
    expect(typeof overview.householdsReviewed).toBe('number');
    expect(typeof overview.opportunitiesSurfaced).toBe('number');
    expect(typeof overview.overdueTaskRate).toBe('number');
  });

  it('should generate advisor dashboard', () => {
    const dashboard = getAdvisorDashboard(
      'user-002',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    expect(dashboard.advisorId).toBe('user-002');
    expect(typeof dashboard.householdsWorked).toBe('number');
    expect(typeof dashboard.opportunitiesReviewed).toBe('number');
    expect(typeof dashboard.scenariosRecommended).toBe('number');
    expect(typeof dashboard.deliverablesProduced).toBe('number');
    expect(typeof dashboard.implementationRate).toBe('number');
    expect(typeof dashboard.estimatedValueCents).toBe('number');
  });

  it('should compute KPI values consistently', () => {
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const kpi1 = computeKPI('active_advisors', 'firm', 'firm-001', periodStart, periodEnd);
    const kpi2 = computeKPI('active_advisors', 'firm', 'firm-001', periodStart, periodEnd);

    expect(kpi1.value).toBe(kpi2.value);
  });
});
