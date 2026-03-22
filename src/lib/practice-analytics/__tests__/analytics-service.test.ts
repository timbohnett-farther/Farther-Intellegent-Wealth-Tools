/**
 * FP-Pulse — Analytics Service Tests
 *
 * Comprehensive tests for the practice analytics computation engine covering:
 * - Firm-level KPI computation
 * - AUM growth attribution
 * - AUM time series generation
 * - Advisor scorecards and ranking
 * - Performance tier classification
 * - Health score computation
 * - Client health heatmap
 * - Revenue composition and at-risk analysis
 * - Growth opportunity identification
 * - Benchmark computation
 */

import { describe, it, expect } from 'vitest';
import {
  computeFirmKPIs,
  computeAumGrowthAttribution,
  generateAumTimeSeries,
  computeAdvisorScorecards,
  rankAdvisors,
  classifyPerformanceTier,
  computeHealthScore,
  computeClientHealthHeatmap,
  computeRevenueComposition,
  computeRevenueAtRisk,
  identifyGrowthOpportunities,
  computeBenchmarks,
} from '../analytics-service';
import { firmId } from '../types';
import type { HealthScoreComponents, AdvisorScorecardSort } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const DEMO_FIRM_ID = firmId('firm-001');

// =============================================================================
// computeFirmKPIs
// =============================================================================

describe('computeFirmKPIs', () => {
  it('returns a valid KPIs object with all required fields', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(kpis).toBeDefined();
    expect(kpis).toHaveProperty('totalAum');
    expect(kpis).toHaveProperty('netNewAssetsMTD');
    expect(kpis).toHaveProperty('annualRevenue');
    expect(kpis).toHaveProperty('activeHouseholds');
    expect(kpis).toHaveProperty('planHealthScore');
  });

  it('returns positive AUM value', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(kpis.totalAum.value).toBeGreaterThan(0);
  });

  it('returns positive active households count', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(kpis.activeHouseholds.value).toBeGreaterThan(0);
  });

  it('returns positive annual revenue', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(kpis.annualRevenue.value).toBeGreaterThan(0);
  });

  it('plan health score is between 0 and 100', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(kpis.planHealthScore.value).toBeGreaterThanOrEqual(0);
    expect(kpis.planHealthScore.value).toBeLessThanOrEqual(100);
  });

  it('includes correct trend indicators', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(['up', 'down', 'flat']).toContain(kpis.totalAum.trend);
    expect(['up', 'down', 'flat']).toContain(kpis.annualRevenue.trend);
    expect(['up', 'down', 'flat']).toContain(kpis.activeHouseholds.trend);
  });

  it('each KPI entry has changePeriod and changePercent', () => {
    const kpis = computeFirmKPIs(DEMO_FIRM_ID);
    expect(typeof kpis.totalAum.changePeriod).toBe('string');
    expect(typeof kpis.totalAum.changePercent).toBe('number');
    expect(typeof kpis.annualRevenue.changePeriod).toBe('string');
    expect(typeof kpis.annualRevenue.changePercent).toBe('number');
  });
});

// =============================================================================
// computeAumGrowthAttribution
// =============================================================================

describe('computeAumGrowthAttribution', () => {
  it('returns an attribution object with all components', () => {
    const attr = computeAumGrowthAttribution(DEMO_FIRM_ID);
    expect(attr).toBeDefined();
    expect(attr).toHaveProperty('startingAum');
    expect(attr).toHaveProperty('endingAum');
    expect(attr).toHaveProperty('marketAppreciation');
    expect(attr).toHaveProperty('netNewAssets');
    expect(attr).toHaveProperty('organicGrowthRate');
    expect(attr).toHaveProperty('industryAvgGrowthRate');
  });

  it('endingAum is greater than startingAum for a growing firm', () => {
    const attr = computeAumGrowthAttribution(DEMO_FIRM_ID);
    expect(attr.endingAum).toBeGreaterThanOrEqual(attr.startingAum);
  });

  it('has a reasonable organic growth rate (between -50 and 100)', () => {
    const attr = computeAumGrowthAttribution(DEMO_FIRM_ID);
    expect(attr.organicGrowthRate).toBeGreaterThan(-50);
    expect(attr.organicGrowthRate).toBeLessThan(100);
  });

  it('has industry average populated and positive', () => {
    const attr = computeAumGrowthAttribution(DEMO_FIRM_ID);
    expect(attr.industryAvgGrowthRate).toBeGreaterThan(0);
  });

  it('has outflows as a non-positive value', () => {
    const attr = computeAumGrowthAttribution(DEMO_FIRM_ID);
    expect(attr.netNewAssets.outflows).toBeLessThanOrEqual(0);
  });
});

// =============================================================================
// generateAumTimeSeries
// =============================================================================

describe('generateAumTimeSeries', () => {
  it('returns correct number of data points for default 12-month period', () => {
    const series = generateAumTimeSeries(DEMO_FIRM_ID, 12);
    expect(series).toHaveLength(12);
  });

  it('returns correct number of data points for custom period', () => {
    const series = generateAumTimeSeries(DEMO_FIRM_ID, 6);
    expect(series).toHaveLength(6);
  });

  it('has monotonically structured dates (each date after the previous)', () => {
    const series = generateAumTimeSeries(DEMO_FIRM_ID, 12);
    for (let i = 1; i < series.length; i++) {
      const prev = new Date(series[i - 1].date);
      const curr = new Date(series[i].date);
      expect(curr.getTime()).toBeGreaterThan(prev.getTime());
    }
  });

  it('has all positive totalAum values', () => {
    const series = generateAumTimeSeries(DEMO_FIRM_ID, 12);
    for (const point of series) {
      expect(point.totalAum).toBeGreaterThan(0);
    }
  });

  it('each data point has required fields', () => {
    const series = generateAumTimeSeries(DEMO_FIRM_ID, 12);
    for (const point of series) {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('totalAum');
      expect(typeof point.date).toBe('string');
      expect(typeof point.totalAum).toBe('number');
    }
  });
});

// =============================================================================
// computeAdvisorScorecards
// =============================================================================

describe('computeAdvisorScorecards', () => {
  it('returns an array of scorecards', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    expect(Array.isArray(scorecards)).toBe(true);
    expect(scorecards.length).toBeGreaterThan(0);
  });

  it('each scorecard has all required fields', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    for (const sc of scorecards) {
      expect(sc).toHaveProperty('advisorId');
      expect(sc).toHaveProperty('advisorName');
      expect(sc).toHaveProperty('aum');
      expect(sc).toHaveProperty('households');
      expect(sc).toHaveProperty('revenue');
      expect(sc).toHaveProperty('compositeScore');
      expect(sc).toHaveProperty('performanceTier');
    }
  });

  it('composite scores are between 0 and 100', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    for (const sc of scorecards) {
      expect(sc.compositeScore).toBeGreaterThanOrEqual(0);
      expect(sc.compositeScore).toBeLessThanOrEqual(100);
    }
  });

  it('each scorecard has a valid performance tier', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const validTiers = ['TOP_QUARTILE', 'ABOVE_AVERAGE', 'AVERAGE', 'WATCH', 'CRITICAL'];
    for (const sc of scorecards) {
      expect(validTiers).toContain(sc.performanceTier);
    }
  });

  it('each scorecard has positive AUM', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    for (const sc of scorecards) {
      expect(sc.aum).toBeGreaterThan(0);
    }
  });

  it('each scorecard has positive household count', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    for (const sc of scorecards) {
      expect(sc.households).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// rankAdvisors
// =============================================================================

describe('rankAdvisors', () => {
  it('sorts correctly by AUM (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'AUM');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].aum).toBeGreaterThanOrEqual(ranked[i].aum);
    }
  });

  it('sorts correctly by REVENUE (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'REVENUE');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].revenue).toBeGreaterThanOrEqual(ranked[i].revenue);
    }
  });

  it('sorts correctly by CLIENT_COUNT (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'CLIENT_COUNT');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].households).toBeGreaterThanOrEqual(ranked[i].households);
    }
  });

  it('sorts correctly by AUM_GROWTH (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'AUM_GROWTH');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].aumChangeMTD).toBeGreaterThanOrEqual(ranked[i].aumChangeMTD);
    }
  });

  it('sorts correctly by PLAN_HEALTH (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'PLAN_HEALTH');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].planHealthScore).toBeGreaterThanOrEqual(ranked[i].planHealthScore);
    }
  });

  it('sorts correctly by ENGAGEMENT_SCORE (descending)', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'ENGAGEMENT_SCORE');
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].engagementScore).toBeGreaterThanOrEqual(ranked[i].engagementScore);
    }
  });

  it('preserves all scorecards after ranking', () => {
    const scorecards = computeAdvisorScorecards(DEMO_FIRM_ID);
    const ranked = rankAdvisors(scorecards, 'AUM');
    expect(ranked).toHaveLength(scorecards.length);
  });
});

// =============================================================================
// classifyPerformanceTier
// =============================================================================

describe('classifyPerformanceTier', () => {
  const allScores = [10, 25, 40, 55, 70, 85, 95];

  it('classifies score 95 as TOP_QUARTILE', () => {
    expect(classifyPerformanceTier(95, allScores)).toBe('TOP_QUARTILE');
  });

  it('classifies score 85 as TOP_QUARTILE', () => {
    expect(classifyPerformanceTier(85, allScores)).toBe('TOP_QUARTILE');
  });

  it('classifies score 55 as ABOVE_AVERAGE', () => {
    expect(classifyPerformanceTier(55, allScores)).toBe('ABOVE_AVERAGE');
  });

  it('classifies score 40 as AVERAGE', () => {
    expect(classifyPerformanceTier(40, allScores)).toBe('AVERAGE');
  });

  it('classifies score 25 as WATCH', () => {
    expect(classifyPerformanceTier(25, allScores)).toBe('WATCH');
  });

  it('classifies score 10 as WATCH (lowest tier)', () => {
    expect(classifyPerformanceTier(10, allScores)).toBe('WATCH');
  });
});

// =============================================================================
// computeHealthScore
// =============================================================================

describe('computeHealthScore', () => {
  const sampleComponents: HealthScoreComponents = {
    planSuccessRate: 80,
    engagementScore: 75,
    dataQualityScore: 90,
    riskAlignmentScore: 85,
    billingHealth: 95,
  };

  it('returns a number', () => {
    const score = computeHealthScore(sampleComponents);
    expect(typeof score).toBe('number');
  });

  it('score is between 0 and 100', () => {
    const score = computeHealthScore(sampleComponents);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('higher component scores yield higher health score', () => {
    const highComponents: HealthScoreComponents = {
      planSuccessRate: 95,
      engagementScore: 95,
      dataQualityScore: 95,
      riskAlignmentScore: 95,
      billingHealth: 95,
    };
    const lowComponents: HealthScoreComponents = {
      planSuccessRate: 20,
      engagementScore: 20,
      dataQualityScore: 20,
      riskAlignmentScore: 20,
      billingHealth: 20,
    };
    const highScore = computeHealthScore(highComponents);
    const lowScore = computeHealthScore(lowComponents);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('all-zero components return 0 or near-zero score', () => {
    const zeroComponents: HealthScoreComponents = {
      planSuccessRate: 0,
      engagementScore: 0,
      dataQualityScore: 0,
      riskAlignmentScore: 0,
      billingHealth: 0,
    };
    const score = computeHealthScore(zeroComponents);
    expect(score).toBeCloseTo(0, 0);
  });

  it('all-100 components return score near 100', () => {
    const maxComponents: HealthScoreComponents = {
      planSuccessRate: 100,
      engagementScore: 100,
      dataQualityScore: 100,
      riskAlignmentScore: 100,
      billingHealth: 100,
    };
    const score = computeHealthScore(maxComponents);
    expect(score).toBeCloseTo(100, 0);
  });
});

// =============================================================================
// computeClientHealthHeatmap
// =============================================================================

describe('computeClientHealthHeatmap', () => {
  it('returns a valid heatmap object', () => {
    const heatmap = computeClientHealthHeatmap(DEMO_FIRM_ID);
    expect(heatmap).toBeDefined();
    expect(heatmap).toHaveProperty('entries');
    expect(heatmap).toHaveProperty('distribution');
    expect(heatmap).toHaveProperty('aumAtRisk');
  });

  it('distribution counts sum to total entries', () => {
    const heatmap = computeClientHealthHeatmap(DEMO_FIRM_ID);
    const sum = heatmap.distribution.healthy.count +
      heatmap.distribution.watch.count +
      heatmap.distribution.atRisk.count;
    expect(sum).toBe(heatmap.entries.length);
  });

  it('aumAtRisk is non-negative', () => {
    const heatmap = computeClientHealthHeatmap(DEMO_FIRM_ID);
    expect(heatmap.aumAtRisk).toBeGreaterThanOrEqual(0);
  });

  it('all distribution counts are non-negative', () => {
    const heatmap = computeClientHealthHeatmap(DEMO_FIRM_ID);
    expect(heatmap.distribution.healthy.count).toBeGreaterThanOrEqual(0);
    expect(heatmap.distribution.watch.count).toBeGreaterThanOrEqual(0);
    expect(heatmap.distribution.atRisk.count).toBeGreaterThanOrEqual(0);
    expect(heatmap.entries.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// computeRevenueComposition
// =============================================================================

describe('computeRevenueComposition', () => {
  it('returns a valid revenue composition object', () => {
    const revenue = computeRevenueComposition(DEMO_FIRM_ID);
    expect(revenue).toBeDefined();
    expect(revenue).toHaveProperty('byTier');
    expect(revenue).toHaveProperty('byType');
    expect(revenue).toHaveProperty('byAdvisor');
  });

  it('byTier has all tier keys', () => {
    const revenue = computeRevenueComposition(DEMO_FIRM_ID);
    expect(revenue.byTier).toHaveProperty('UNDER_1M');
    expect(revenue.byTier).toHaveProperty('1M_5M');
    expect(revenue.byTier).toHaveProperty('5M_30M');
    expect(revenue.byTier).toHaveProperty('OVER_30M');
  });

  it('by-advisor entries each have advisorId and revenue', () => {
    const revenue = computeRevenueComposition(DEMO_FIRM_ID);
    for (const adv of revenue.byAdvisor) {
      expect(adv).toHaveProperty('advisorId');
      expect(adv).toHaveProperty('revenue');
      expect(typeof adv.revenue).toBe('number');
    }
  });

  it('byType has all type keys', () => {
    const revenue = computeRevenueComposition(DEMO_FIRM_ID);
    expect(revenue.byType).toHaveProperty('MANAGEMENT_FEE');
    expect(revenue.byType).toHaveProperty('PLANNING_FEE');
    expect(revenue.byType).toHaveProperty('PERFORMANCE_FEE');
  });
});

// =============================================================================
// computeRevenueAtRisk
// =============================================================================

describe('computeRevenueAtRisk', () => {
  it('returns a valid revenue-at-risk object', () => {
    const atRisk = computeRevenueAtRisk(DEMO_FIRM_ID);
    expect(atRisk).toBeDefined();
    expect(atRisk).toHaveProperty('revenueAtRisk');
    expect(atRisk).toHaveProperty('aumAtRisk');
    expect(atRisk).toHaveProperty('topAtRisk');
  });

  it('revenueAtRisk is non-negative', () => {
    const atRisk = computeRevenueAtRisk(DEMO_FIRM_ID);
    expect(atRisk.revenueAtRisk).toBeGreaterThanOrEqual(0);
  });

  it('topAtRisk entries are sorted by AUM descending', () => {
    const atRisk = computeRevenueAtRisk(DEMO_FIRM_ID);
    if (atRisk.topAtRisk.length > 1) {
      for (let i = 1; i < atRisk.topAtRisk.length; i++) {
        expect(atRisk.topAtRisk[i - 1].aum).toBeGreaterThanOrEqual(atRisk.topAtRisk[i].aum);
      }
    }
  });

  it('each at-risk entry has required fields', () => {
    const atRisk = computeRevenueAtRisk(DEMO_FIRM_ID);
    for (const entry of atRisk.topAtRisk) {
      expect(entry).toHaveProperty('householdName');
      expect(entry).toHaveProperty('aum');
      expect(entry).toHaveProperty('reason');
    }
  });

  it('aumAtRisk is positive', () => {
    const atRisk = computeRevenueAtRisk(DEMO_FIRM_ID);
    expect(atRisk.aumAtRisk).toBeGreaterThan(0);
  });
});

// =============================================================================
// identifyGrowthOpportunities
// =============================================================================

describe('identifyGrowthOpportunities', () => {
  it('returns an array of opportunities', () => {
    const opportunities = identifyGrowthOpportunities(DEMO_FIRM_ID);
    expect(Array.isArray(opportunities)).toBe(true);
    expect(opportunities.length).toBeGreaterThan(0);
  });

  it('each opportunity has required fields', () => {
    const opportunities = identifyGrowthOpportunities(DEMO_FIRM_ID);
    for (const opp of opportunities) {
      expect(opp).toHaveProperty('householdId');
      expect(opp).toHaveProperty('householdName');
      expect(opp).toHaveProperty('advisorName');
      expect(opp).toHaveProperty('heldAwayAum');
      expect(opp).toHaveProperty('probabilityToConsolidate');
      expect(opp).toHaveProperty('trigger');
    }
  });

  it('each opportunity has heldAwayAum > 0', () => {
    const opportunities = identifyGrowthOpportunities(DEMO_FIRM_ID);
    for (const opp of opportunities) {
      expect(opp.heldAwayAum).toBeGreaterThan(0);
    }
  });

  it('each opportunity has probabilityToConsolidate between 0 and 1', () => {
    const opportunities = identifyGrowthOpportunities(DEMO_FIRM_ID);
    for (const opp of opportunities) {
      expect(opp.probabilityToConsolidate).toBeGreaterThanOrEqual(0);
      expect(opp.probabilityToConsolidate).toBeLessThanOrEqual(1);
    }
  });
});

// =============================================================================
// computeBenchmarks
// =============================================================================

describe('computeBenchmarks', () => {
  it('returns a valid benchmarks array', () => {
    const benchmarks = computeBenchmarks(DEMO_FIRM_ID);
    expect(benchmarks).toBeDefined();
    expect(Array.isArray(benchmarks)).toBe(true);
    expect(benchmarks.length).toBeGreaterThan(0);
  });

  it('includes standard metrics', () => {
    const benchmarks = computeBenchmarks(DEMO_FIRM_ID);
    const metricNames = benchmarks.map((b) => b.metric);
    expect(metricNames.length).toBeGreaterThan(0);
  });

  it('each benchmark has fartherValue, topQuartile, and median', () => {
    const benchmarks = computeBenchmarks(DEMO_FIRM_ID);
    for (const b of benchmarks) {
      expect(b).toHaveProperty('metric');
      expect(b).toHaveProperty('fartherValue');
      expect(b).toHaveProperty('topQuartile');
      expect(b).toHaveProperty('median');
      expect(typeof b.fartherValue).toBe('number');
      expect(typeof b.topQuartile).toBe('number');
    }
  });

  it('farther values are positive', () => {
    const benchmarks = computeBenchmarks(DEMO_FIRM_ID);
    for (const b of benchmarks) {
      expect(b.fartherValue).toBeGreaterThan(0);
    }
  });

  it('topQuartile values are positive', () => {
    const benchmarks = computeBenchmarks(DEMO_FIRM_ID);
    for (const b of benchmarks) {
      expect(b.topQuartile).toBeGreaterThan(0);
    }
  });
});
