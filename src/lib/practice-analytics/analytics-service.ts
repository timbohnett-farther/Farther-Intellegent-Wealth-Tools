/**
 * Farther Unified Platform — Practice Analytics Computation Engine
 *
 * Pure computation functions for FP-Pulse practice analytics.
 * All data is in-memory demo data for Stage 1 — no external DB
 * dependencies. Stage 2 will swap demo data for Prisma/BigQuery.
 *
 * Design principles:
 * - All monetary values are plain numbers (dollars, not cents).
 * - All dates are ISO 8601 strings.
 * - All IDs are branded string primitives (from ./types).
 * - Named exports only — no default export.
 * - Pure functions — no side effects beyond reading demo data.
 *
 * @module practice-analytics/analytics-service
 */

import type {
  FirmId,
  AdvisorId,
  FirmKPIs,
  FirmKPIEntry,
  KPITrend,
  AumGrowthAttribution,
  AumTimeSeriesPoint,
  AdvisorScorecard,
  AdvisorScorecardSort,
  AdvisorPerformanceTier,
  HealthScoreComponents,
  HealthScoreCategory,
  ClientHealthHeatmapData,
  HouseholdHealthEntry,
  RevenueComposition,
  RevenueTier,
  RevenueType,
  RevenueTimeSeriesPoint,
  RevenueAtRisk,
  GrowthOpportunity,
  ConsolidationOpportunity,
  ConsolidationCategory,
  CapacityAnalysis,
  BenchmarkMetric,
} from './types';

// =============================================================================
// Local Type Aliases (used for internal demo data only)
// =============================================================================

/** Wealth tier classification for households. */
type WealthTier = 'uhnw' | 'hnw' | 'mass_affluent' | 'emerging';

// =============================================================================
// Deep Clone Helper
// =============================================================================

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// =============================================================================
// Internal Demo Data — Advisor Profiles
// =============================================================================

interface DemoAdvisor {
  advisorId: AdvisorId;
  name: string;
  title: string;
  yearsAtFirm: number;
  aum: number;
  householdCount: number;
  aumCapacity: number;
  householdCapacity: number;
  netNewAssetsYTD: number;
  annualRevenue: number;
  planHealthScore: number;
  engagementScore: number;
  dataQualityScore: number;
  aumGrowthRate: number;
  avgRevenuePerHousehold: number;
  avgAumPerHousehold: number;
  clientRetentionRate: number;
  referralRate: number;
  meetingsPerMonth: number;
  avgResponseTimeHours: number;
  plansCreated: number;
  plansWithGoals: number;
  stalePlans: number;
  missingDataPlans: number;
  planSuccessRate: number;
  riskAlignmentScore: number;
  billingHealthScore: number;
  complianceScore: number;
  heldAwayAssets: number;
  consolidationOpportunities: number;
  pipelineProspects: number;
  pipelineAum: number;
  lastActivityDate: string;
  wealthTierDistribution: Record<WealthTier, number>;
  revenueByType: { advisory: number; planning: number; insurance: number; other: number };
}

const DEMO_FIRM_ID = 'firm-001' as FirmId;

const DEMO_ADVISORS: DemoAdvisor[] = [
  {
    advisorId: 'adv-001' as AdvisorId,
    name: 'Sarah Mitchell',
    title: 'Senior Advisor',
    yearsAtFirm: 12,
    aum: 847_000_000,
    householdCount: 214,
    aumCapacity: 1_000_000_000,
    householdCapacity: 250,
    netNewAssetsYTD: 42_300_000,
    annualRevenue: 6_350_000,
    planHealthScore: 92,
    engagementScore: 88,
    dataQualityScore: 94,
    aumGrowthRate: 8.2,
    avgRevenuePerHousehold: 29_673,
    avgAumPerHousehold: 3_957_944,
    clientRetentionRate: 98.1,
    referralRate: 14.2,
    meetingsPerMonth: 38,
    avgResponseTimeHours: 2.4,
    plansCreated: 198,
    plansWithGoals: 192,
    stalePlans: 6,
    missingDataPlans: 3,
    planSuccessRate: 87,
    riskAlignmentScore: 91,
    billingHealthScore: 97,
    complianceScore: 99,
    heldAwayAssets: 124_000_000,
    consolidationOpportunities: 32,
    pipelineProspects: 8,
    pipelineAum: 18_500_000,
    lastActivityDate: '2026-02-28',
    wealthTierDistribution: { emerging: 12, mass_affluent: 68, hnw: 98, uhnw: 36 },
    revenueByType: { advisory: 5_080_000, planning: 762_000, insurance: 381_000, other: 127_000 },
  },
  {
    advisorId: 'adv-002' as AdvisorId,
    name: 'James Rodriguez',
    title: 'Advisor',
    yearsAtFirm: 6,
    aum: 523_000_000,
    householdCount: 156,
    aumCapacity: 700_000_000,
    householdCapacity: 200,
    netNewAssetsYTD: 28_100_000,
    annualRevenue: 3_920_000,
    planHealthScore: 84,
    engagementScore: 79,
    dataQualityScore: 86,
    aumGrowthRate: 6.8,
    avgRevenuePerHousehold: 25_128,
    avgAumPerHousehold: 3_352_564,
    clientRetentionRate: 96.2,
    referralRate: 11.5,
    meetingsPerMonth: 28,
    avgResponseTimeHours: 4.1,
    plansCreated: 142,
    plansWithGoals: 131,
    stalePlans: 11,
    missingDataPlans: 8,
    planSuccessRate: 79,
    riskAlignmentScore: 83,
    billingHealthScore: 92,
    complianceScore: 95,
    heldAwayAssets: 87_000_000,
    consolidationOpportunities: 24,
    pipelineProspects: 12,
    pipelineAum: 31_200_000,
    lastActivityDate: '2026-02-27',
    wealthTierDistribution: { emerging: 22, mass_affluent: 58, hnw: 62, uhnw: 14 },
    revenueByType: { advisory: 3_136_000, planning: 470_400, insurance: 235_200, other: 78_400 },
  },
  {
    advisorId: 'adv-003' as AdvisorId,
    name: 'Emily Chang',
    title: 'Senior Advisor',
    yearsAtFirm: 9,
    aum: 712_000_000,
    householdCount: 189,
    aumCapacity: 850_000_000,
    householdCapacity: 225,
    netNewAssetsYTD: 35_600_000,
    annualRevenue: 5_340_000,
    planHealthScore: 96,
    engagementScore: 91,
    dataQualityScore: 97,
    aumGrowthRate: 7.4,
    avgRevenuePerHousehold: 28_254,
    avgAumPerHousehold: 3_767_196,
    clientRetentionRate: 97.8,
    referralRate: 16.1,
    meetingsPerMonth: 42,
    avgResponseTimeHours: 1.8,
    plansCreated: 185,
    plansWithGoals: 183,
    stalePlans: 2,
    missingDataPlans: 1,
    planSuccessRate: 91,
    riskAlignmentScore: 95,
    billingHealthScore: 98,
    complianceScore: 100,
    heldAwayAssets: 103_000_000,
    consolidationOpportunities: 28,
    pipelineProspects: 6,
    pipelineAum: 14_800_000,
    lastActivityDate: '2026-02-28',
    wealthTierDistribution: { emerging: 8, mass_affluent: 52, hnw: 94, uhnw: 35 },
    revenueByType: { advisory: 4_272_000, planning: 801_000, insurance: 160_200, other: 106_800 },
  },
  {
    advisorId: 'adv-004' as AdvisorId,
    name: 'Michael Foster',
    title: 'Associate Advisor',
    yearsAtFirm: 2,
    aum: 234_000_000,
    householdCount: 87,
    aumCapacity: 400_000_000,
    householdCapacity: 150,
    netNewAssetsYTD: 19_800_000,
    annualRevenue: 1_755_000,
    planHealthScore: 76,
    engagementScore: 82,
    dataQualityScore: 78,
    aumGrowthRate: 12.1,
    avgRevenuePerHousehold: 20_172,
    avgAumPerHousehold: 2_689_655,
    clientRetentionRate: 94.3,
    referralRate: 8.7,
    meetingsPerMonth: 24,
    avgResponseTimeHours: 3.2,
    plansCreated: 74,
    plansWithGoals: 66,
    stalePlans: 8,
    missingDataPlans: 6,
    planSuccessRate: 72,
    riskAlignmentScore: 77,
    billingHealthScore: 88,
    complianceScore: 92,
    heldAwayAssets: 41_000_000,
    consolidationOpportunities: 15,
    pipelineProspects: 18,
    pipelineAum: 42_600_000,
    lastActivityDate: '2026-02-28',
    wealthTierDistribution: { emerging: 28, mass_affluent: 34, hnw: 22, uhnw: 3 },
    revenueByType: { advisory: 1_404_000, planning: 210_600, insurance: 105_300, other: 35_100 },
  },
  {
    advisorId: 'adv-005' as AdvisorId,
    name: 'Patricia Williams',
    title: 'Senior Advisor',
    yearsAtFirm: 15,
    aum: 901_000_000,
    householdCount: 201,
    aumCapacity: 1_100_000_000,
    householdCapacity: 240,
    netNewAssetsYTD: 31_200_000,
    annualRevenue: 6_758_000,
    planHealthScore: 78,
    engagementScore: 68,
    dataQualityScore: 82,
    aumGrowthRate: 5.3,
    avgRevenuePerHousehold: 33_621,
    avgAumPerHousehold: 4_482_587,
    clientRetentionRate: 95.5,
    referralRate: 9.4,
    meetingsPerMonth: 22,
    avgResponseTimeHours: 6.8,
    plansCreated: 178,
    plansWithGoals: 158,
    stalePlans: 20,
    missingDataPlans: 14,
    planSuccessRate: 74,
    riskAlignmentScore: 80,
    billingHealthScore: 94,
    complianceScore: 96,
    heldAwayAssets: 198_000_000,
    consolidationOpportunities: 41,
    pipelineProspects: 4,
    pipelineAum: 9_200_000,
    lastActivityDate: '2026-02-26',
    wealthTierDistribution: { emerging: 6, mass_affluent: 42, hnw: 102, uhnw: 51 },
    revenueByType: { advisory: 5_406_400, planning: 675_800, insurance: 473_060, other: 202_740 },
  },
];

// =============================================================================
// Internal Demo Data — Household Stubs (aggregated for health heatmap)
// =============================================================================

interface DemoHousehold {
  householdId: string;
  advisorId: AdvisorId;
  name: string;
  aum: number;
  wealthTier: WealthTier;
  status: 'active' | 'onboarding' | 'at_risk' | 'inactive';
  healthScore: number;
  planSuccessProb: number;
  engagementScore: number;
  dataQuality: number;
  riskAlignment: number;
  billingHealth: number;
  lastContactDate: string;
  annualRevenue: number;
  heldAwayAssets: number;
  servicesUsed: string[];
  availableServices: string[];
}

/**
 * Generates a deterministic set of demo households for a given advisor.
 * Uses advisor index as seed for reproducible pseudo-random values.
 */
function generateDemoHouseholds(advisor: DemoAdvisor): DemoHousehold[] {
  const households: DemoHousehold[] = [];
  const tiers: WealthTier[] = ['emerging', 'mass_affluent', 'hnw', 'uhnw'];
  const statuses: Array<'active' | 'onboarding' | 'at_risk' | 'inactive'> = [
    'active', 'active', 'active', 'active', 'active',
    'active', 'active', 'onboarding', 'at_risk', 'inactive',
  ];
  const allServices = [
    'financial_planning', 'investment_management', 'tax_planning',
    'estate_planning', 'insurance', 'banking', 'lending',
  ];

  // Simple seeded pseudo-random number generator
  let seed = advisor.advisorId.charCodeAt(4) * 137 + 42;
  function seededRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  }

  for (let i = 0; i < advisor.householdCount; i++) {
    const tierIndex = tiers.indexOf(
      (Object.entries(advisor.wealthTierDistribution) as [WealthTier, number][])
        .reduce((best, [tier, count]) => {
          const threshold = count / advisor.householdCount;
          return seededRandom() < threshold ? tier : best;
        }, 'mass_affluent' as WealthTier),
    );
    const tier = tiers[Math.max(0, tierIndex)] ?? 'mass_affluent';

    const aumMultipliers: Record<WealthTier, [number, number]> = {
      emerging: [100_000, 500_000],
      mass_affluent: [500_000, 2_000_000],
      hnw: [2_000_000, 10_000_000],
      uhnw: [10_000_000, 50_000_000],
    };
    const [minAum, maxAum] = aumMultipliers[tier];
    const aum = Math.round(minAum + seededRandom() * (maxAum - minAum));

    const baseHealth = advisor.planHealthScore + (seededRandom() - 0.5) * 30;
    const healthScore = Math.max(15, Math.min(100, Math.round(baseHealth)));

    const numServices = 2 + Math.floor(seededRandom() * 4);
    const servicesUsed = allServices.slice(0, numServices);

    households.push({
      householdId: `hh-${advisor.advisorId}-${String(i).padStart(4, '0')}` as string,
      advisorId: advisor.advisorId,
      name: `Household ${advisor.name.split(' ')[1]}-${i + 1}`,
      aum,
      wealthTier: tier,
      status: statuses[i % statuses.length],
      healthScore,
      planSuccessProb: Math.max(20, Math.min(99, healthScore + Math.round((seededRandom() - 0.5) * 16))),
      engagementScore: Math.max(10, Math.min(100, Math.round(advisor.engagementScore + (seededRandom() - 0.5) * 24))),
      dataQuality: Math.max(30, Math.min(100, Math.round(advisor.dataQualityScore + (seededRandom() - 0.5) * 20))),
      riskAlignment: Math.max(40, Math.min(100, Math.round(advisor.riskAlignmentScore + (seededRandom() - 0.5) * 18))),
      billingHealth: Math.max(50, Math.min(100, Math.round(advisor.billingHealthScore + (seededRandom() - 0.5) * 14))),
      lastContactDate: generateLastContactDate(seededRandom()),
      annualRevenue: Math.round(aum * (0.006 + seededRandom() * 0.004)),
      heldAwayAssets: Math.round(aum * seededRandom() * 0.4),
      servicesUsed,
      availableServices: allServices.filter((s) => !servicesUsed.includes(s)),
    });
  }

  return households;
}

function generateLastContactDate(random: number): string {
  const daysAgo = Math.floor(random * 120);
  const date = new Date('2026-03-01');
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Lazy-initialized household cache
let _householdCache: Map<string, DemoHousehold[]> | null = null;

function getHouseholdsForAdvisor(advisorId: AdvisorId): DemoHousehold[] {
  if (!_householdCache) {
    _householdCache = new Map();
    for (const advisor of DEMO_ADVISORS) {
      _householdCache.set(advisor.advisorId, generateDemoHouseholds(advisor));
    }
  }
  return _householdCache.get(advisorId) ?? [];
}

function getAllHouseholds(): DemoHousehold[] {
  return DEMO_ADVISORS.flatMap((a) => getHouseholdsForAdvisor(a.advisorId));
}

// =============================================================================
// Helper — Lookup
// =============================================================================

function findAdvisor(advisorId: AdvisorId): DemoAdvisor | undefined {
  return DEMO_ADVISORS.find((a) => a.advisorId === advisorId);
}

function getFirmAdvisors(_firmId: FirmId): DemoAdvisor[] {
  // Stage 1: single-firm demo — all advisors belong to the demo firm
  return DEMO_ADVISORS;
}

// =============================================================================
// Helper — Math
// =============================================================================

function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return 0;
  const weighted = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return weighted / totalWeight;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (idx - lower);
}

// =============================================================================
// Firm-Level KPIs
// =============================================================================

/**
 * Computes aggregate firm-level key performance indicators.
 * Aggregates across all advisors and households in the firm.
 *
 * @param firmId - The firm to compute KPIs for
 * @returns Complete firm KPI snapshot with trend data
 */
export function computeFirmKPIs(firmId: FirmId): FirmKPIs {
  const advisors = getFirmAdvisors(firmId);

  const totalAum = advisors.reduce((sum, a) => sum + a.aum, 0);
  const netNewAssets = advisors.reduce((sum, a) => sum + a.netNewAssetsYTD, 0);
  const annualRevenue = advisors.reduce((sum, a) => sum + a.annualRevenue, 0);
  const activeHouseholds = advisors.reduce((sum, a) => sum + a.householdCount, 0);
  const avgPlanHealth = weightedAverage(
    advisors.map((a) => a.planHealthScore),
    advisors.map((a) => a.householdCount),
  );

  // Prior period values for trend computation (simulate 12-month lookback)
  const priorAum = totalAum * 0.927; // ~7.9% growth from prior year
  const priorNetNew = netNewAssets * 0.88;
  const priorRevenue = annualRevenue * 0.94;
  const priorHouseholds = activeHouseholds - 34;
  const priorPlanHealth = avgPlanHealth - 3.2;

  function buildKPIEntry(
    value: number,
    prior: number,
    changePeriod: string,
  ): FirmKPIEntry {
    const changePercent = prior !== 0 ? ((value - prior) / Math.abs(prior)) * 100 : 0;
    let trend: KPITrend = 'flat';
    if (changePercent > 1) trend = 'up';
    else if (changePercent < -1) trend = 'down';

    return {
      value,
      changePercent: Math.round(changePercent * 10) / 10,
      changePeriod,
      trend,
    };
  }

  return {
    totalAum: buildKPIEntry(totalAum, priorAum, 'YoY'),
    netNewAssetsMTD: buildKPIEntry(netNewAssets, priorNetNew, 'YoY'),
    annualRevenue: buildKPIEntry(annualRevenue, priorRevenue, 'YoY'),
    activeHouseholds: buildKPIEntry(activeHouseholds, priorHouseholds, 'YoY'),
    planHealthScore: buildKPIEntry(Math.round(avgPlanHealth * 10) / 10, priorPlanHealth, 'YoY'),
  };
}

// =============================================================================
// AUM Growth Attribution
// =============================================================================

/**
 * Decomposes AUM growth into its component sources over a given period.
 * Computes organic growth rate and compares to industry average.
 *
 * @param firmId - The firm to analyze
 * @param months - Number of months to look back (default 12)
 * @returns Attribution breakdown with organic growth rate
 */
export function computeAumGrowthAttribution(
  firmId: FirmId,
  months: number = 12,
): AumGrowthAttribution {
  const advisors = getFirmAdvisors(firmId);
  const currentAum = advisors.reduce((sum, a) => sum + a.aum, 0);

  // Simulate attribution components scaled to the period
  const scaleFactor = months / 12;
  const marketAppreciation = Math.round(currentAum * 0.062 * scaleFactor);
  const organicNetNew = Math.round(
    advisors.reduce((sum, a) => sum + a.netNewAssetsYTD, 0) * scaleFactor,
  );
  const newClients = Math.round(currentAum * 0.028 * scaleFactor);
  const lostClients = Math.round(currentAum * -0.014 * scaleFactor);

  const startingAum = currentAum - marketAppreciation - organicNetNew - newClients - lostClients;
  const totalGrowth = currentAum - startingAum;
  const organicGrowthRate = startingAum > 0
    ? ((organicNetNew + newClients + lostClients) / startingAum) * 100
    : 0;

  const industryAvgOrganicGrowthRate = 4.8;

  const industryAvgGrowthRate = 0.048;

  return {
    startingAum,
    endingAum: currentAum,
    marketAppreciation,
    netNewAssets: {
      inflows: organicNetNew + newClients,
      outflows: lostClients,
    },
    newClients,
    lostClients,
    organicGrowthRate: Math.round(organicGrowthRate / 100 * 10000) / 10000,
    industryAvgGrowthRate,
    period: months === 12 ? '1Y' : `${months}M`,
  };
}

// =============================================================================
// AUM Time Series
// =============================================================================

/**
 * Generates monthly AUM time series data with source breakdown.
 * Uses realistic growth trends and seasonal patterns for demo data.
 *
 * @param firmId - The firm to generate time series for
 * @param months - Number of months of history to generate
 * @returns Array of monthly data points with AUM breakdown
 */
export function generateAumTimeSeries(
  firmId: FirmId,
  months: number = 24,
): AumTimeSeriesPoint[] {
  const advisors = getFirmAdvisors(firmId);
  const currentAum = advisors.reduce((sum, a) => sum + a.aum, 0);

  // Work backwards from current AUM with realistic monthly growth
  const points: AumTimeSeriesPoint[] = [];
  const monthlyMarketReturn = 0.005; // ~6% annualized
  const monthlyOrganicGrowth = 0.004; // ~4.8% annualized
  const seasonalFactors = [
    0.8, 0.9, 1.1, 1.0, 0.9, 0.7,
    0.6, 0.7, 1.0, 1.2, 1.1, 1.3,
  ];

  let runningAum = currentAum;
  const aumValues: number[] = [runningAum];

  // Calculate backwards to get starting values
  for (let i = 0; i < months - 1; i++) {
    const monthIdx = (new Date().getMonth() - i - 1 + 12) % 12;
    const seasonal = seasonalFactors[monthIdx];
    const totalMonthlyGrowth = 1 + monthlyMarketReturn + monthlyOrganicGrowth * seasonal;
    runningAum = runningAum / totalMonthlyGrowth;
    aumValues.unshift(runningAum);
  }

  // Build the time series points
  for (let i = 0; i < months; i++) {
    const date = new Date('2026-03-01');
    date.setMonth(date.getMonth() - (months - 1 - i));
    const monthStr = date.toISOString().substring(0, 7); // YYYY-MM
    const monthIdx = date.getMonth();
    const seasonal = seasonalFactors[monthIdx];

    const totalAum = Math.round(aumValues[i]);
    const marketGain = Math.round(totalAum * monthlyMarketReturn);
    const organicNew = Math.round(totalAum * monthlyOrganicGrowth * seasonal);
    const newClientAum = Math.round(totalAum * 0.002 * seasonal);
    const lostClientAum = Math.round(totalAum * -0.001);

    points.push({
      date: `${monthStr}-01`,
      totalAum,
      marketAppreciation: marketGain,
      organicNetNew: organicNew,
      newClientAum: newClientAum,
    });
  }

  return points;
}

// =============================================================================
// Advisor Scorecards
// =============================================================================

/** Weights for composite score computation. */
const SCORECARD_WEIGHTS = {
  planHealth: 0.30,
  engagement: 0.25,
  dataQuality: 0.20,
  aumGrowth: 0.25,
};

/**
 * Normalizes AUM growth rate to a 0-100 score.
 * Uses industry benchmarks: 0% = 20, 4.8% = 50, 12%+ = 95.
 */
function normalizeAumGrowth(growthRate: number): number {
  if (growthRate <= 0) return Math.max(0, 20 + growthRate * 2);
  if (growthRate <= 4.8) return 20 + (growthRate / 4.8) * 30;
  if (growthRate <= 12) return 50 + ((growthRate - 4.8) / 7.2) * 45;
  return Math.min(100, 95 + (growthRate - 12));
}

/**
 * Computes a single advisor's complete scorecard with all metrics.
 *
 * @param advisorId - The advisor to compute the scorecard for
 * @returns Complete scorecard with composite score and all dimensions
 */
export function computeAdvisorScorecard(advisorId: AdvisorId): AdvisorScorecard {
  const advisor = findAdvisor(advisorId);
  if (!advisor) {
    throw new Error(`Advisor "${advisorId}" not found.`);
  }

  const normalizedAumGrowth = normalizeAumGrowth(advisor.aumGrowthRate);

  const compositeScore = Math.round(
    weightedAverage(
      [advisor.planHealthScore, advisor.engagementScore, advisor.dataQualityScore, normalizedAumGrowth],
      [SCORECARD_WEIGHTS.planHealth, SCORECARD_WEIGHTS.engagement, SCORECARD_WEIGHTS.dataQuality, SCORECARD_WEIGHTS.aumGrowth],
    ) * 10,
  ) / 10;

  // Firm averages for comparison
  const allAdvisors = getFirmAdvisors(DEMO_FIRM_ID);
  const firmTotalAum = allAdvisors.reduce((s, a) => s + a.aum, 0);
  const firmTotalHouseholds = allAdvisors.reduce((s, a) => s + a.householdCount, 0);
  const firmAvgAumPerHousehold = firmTotalHouseholds > 0 ? firmTotalAum / firmTotalHouseholds : 0;

  return {
    advisorId: advisor.advisorId,
    advisorName: advisor.name,
    tier: (advisor.title === 'Senior Advisor' || advisor.title === 'Partner' || advisor.title === 'Managing Director'
      ? advisor.title
      : advisor.title === 'Associate Advisor' ? 'Associate' : 'Advisor') as AdvisorScorecard['tier'],
    aum: advisor.aum,
    aumChangeMTD: Math.round(advisor.aum * advisor.aumGrowthRate / 100 / 12),
    households: advisor.householdCount,
    householdsChangeMTD: Math.round(advisor.householdCount * 0.02),
    revenue: advisor.annualRevenue,
    revenueChangeYoY: Math.round(advisor.aumGrowthRate * 10) / 10,
    avgAumPerHousehold: advisor.avgAumPerHousehold,
    firmAvgAumPerHousehold: Math.round(firmAvgAumPerHousehold),
    planHealthScore: advisor.planHealthScore,
    engagementScore: advisor.engagementScore,
    dataQualityScore: advisor.dataQualityScore,
    activePipeline: {
      proposalCount: Math.round(advisor.householdCount * 0.04),
      proposedAum: Math.round(advisor.aum * 0.06),
    },
    atRiskClients: Math.round(advisor.householdCount * (1 - advisor.clientRetentionRate / 100)),
    overdueReviews: advisor.stalePlans,
    performanceTier: 'AVERAGE' as AdvisorPerformanceTier,
    compositeScore,
  };
}

/**
 * Computes scorecards for all advisors in a firm.
 *
 * @param firmId - The firm to compute scorecards for
 * @returns Array of advisor scorecards with performance tiers assigned
 */
export function computeAdvisorScorecards(firmId: FirmId): AdvisorScorecard[] {
  const advisors = getFirmAdvisors(firmId);
  const scorecards = advisors.map((a) => computeAdvisorScorecard(a.advisorId));

  // Assign performance tiers based on composite scores
  const allScores = scorecards.map((s) => s.compositeScore);
  for (const card of scorecards) {
    card.performanceTier = classifyPerformanceTier(card.compositeScore, allScores);
  }

  // Assign default rank by composite score descending
  return rankAdvisors(scorecards, 'AUM');
}

/**
 * Ranks advisors by the specified dimension and assigns rank numbers.
 *
 * @param scorecards - Array of scorecards to rank
 * @param sortBy - Dimension to sort by
 * @returns Sorted scorecards with rank assigned
 */
export function rankAdvisors(
  scorecards: AdvisorScorecard[],
  sortBy: AdvisorScorecardSort,
): AdvisorScorecard[] {
  const sorted = clone(scorecards);

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'AUM':
        return b.aum - a.aum;
      case 'AUM_GROWTH':
        return b.aumChangeMTD - a.aumChangeMTD;
      case 'PLAN_HEALTH':
        return b.planHealthScore - a.planHealthScore;
      case 'CLIENT_COUNT':
        return b.households - a.households;
      case 'REVENUE':
        return b.revenue - a.revenue;
      case 'ENGAGEMENT_SCORE':
        return b.engagementScore - a.engagementScore;
      default:
        return b.compositeScore - a.compositeScore;
    }
  });

  return sorted;
}

/**
 * Classifies an advisor's performance tier based on quartile position
 * among all advisors.
 *
 * @param compositeScore - The advisor's composite score
 * @param allScores - All composite scores in the firm for quartile computation
 * @returns Performance tier classification
 */
export function classifyPerformanceTier(
  compositeScore: number,
  allScores: number[],
): AdvisorPerformanceTier {
  const sorted = [...allScores].sort((a, b) => a - b);
  const q25 = percentile(sorted, 25);
  const q50 = percentile(sorted, 50);
  const q75 = percentile(sorted, 75);

  if (compositeScore >= q75) return 'TOP_QUARTILE';
  if (compositeScore >= q50) return 'ABOVE_AVERAGE';
  if (compositeScore >= q25) return 'AVERAGE';
  return 'WATCH';
}

// =============================================================================
// Client Health
// =============================================================================

/** Weights for health score computation. */
const HEALTH_SCORE_WEIGHTS = {
  planSuccess: 0.35,
  engagement: 0.25,
  dataQuality: 0.15,
  riskAlignment: 0.15,
  billingHealth: 0.10,
};

/**
 * Computes a client health score from its weighted components.
 *
 * @param components - Individual health score dimensions (each 0-100)
 * @returns Weighted composite health score (0-100)
 */
export function computeHealthScore(components: HealthScoreComponents): number {
  const score = weightedAverage(
    [
      components.planSuccessRate,
      components.engagementScore,
      components.dataQualityScore,
      components.riskAlignmentScore,
      components.billingHealth,
    ],
    [
      HEALTH_SCORE_WEIGHTS.planSuccess,
      HEALTH_SCORE_WEIGHTS.engagement,
      HEALTH_SCORE_WEIGHTS.dataQuality,
      HEALTH_SCORE_WEIGHTS.riskAlignment,
      HEALTH_SCORE_WEIGHTS.billingHealth,
    ],
  );
  return Math.round(score * 10) / 10;
}

/**
 * Classifies a health score into a named category for UI display.
 *
 * @param score - Health score (0-100)
 * @returns Category label
 */
export function classifyHealthCategory(score: number): HealthScoreCategory {
  if (score >= 70) return 'HEALTHY';
  if (score >= 40) return 'WATCH';
  return 'AT_RISK';
}

/**
 * Computes client health heatmap data for the firm, with optional
 * filters by advisor, wealth tier, and status.
 *
 * @param firmId - The firm to analyze
 * @param filters - Optional filters to narrow the dataset
 * @returns Heatmap data with distribution stats and AUM at risk
 */
export function computeClientHealthHeatmap(
  firmId: FirmId,
  filters?: {
    advisorId?: AdvisorId;
  },
): ClientHealthHeatmapData {
  let households = getAllHouseholds();

  // Apply filters
  if (filters?.advisorId) {
    households = households.filter((h) => h.advisorId === filters.advisorId);
  }

  const distCounts = { healthy: 0, watch: 0, atRisk: 0 };
  let aumAtRisk = 0;
  const totalCount = households.length;
  const entries: HouseholdHealthEntry[] = [];

  for (const hh of households) {
    const components: HealthScoreComponents = {
      planSuccessRate: hh.planSuccessProb,
      engagementScore: hh.engagementScore,
      dataQualityScore: hh.dataQuality,
      riskAlignmentScore: hh.riskAlignment,
      billingHealth: hh.billingHealth,
    };
    const score = computeHealthScore(components);
    const category = classifyHealthCategory(score);

    if (category === 'AT_RISK') {
      aumAtRisk += hh.aum;
      distCounts.atRisk += 1;
    } else if (category === 'WATCH') {
      distCounts.watch += 1;
    } else {
      distCounts.healthy += 1;
    }

    const advisor = findAdvisor(hh.advisorId);

    entries.push({
      householdId: hh.householdId as string,
      householdName: hh.name,
      advisorId: hh.advisorId,
      advisorName: advisor?.name ?? 'Unknown',
      aum: hh.aum,
      healthScore: score,
      healthCategory: category,
      components,
      lastContact: hh.lastContactDate,
      nextAction: category === 'AT_RISK'
        ? 'Schedule immediate review'
        : category === 'WATCH'
        ? 'Include in next quarterly review'
        : null,
    });
  }

  // Sort by score ascending (worst first)
  entries.sort((a, b) => a.healthScore - b.healthScore);

  return {
    entries,
    distribution: {
      healthy: {
        count: distCounts.healthy,
        pct: totalCount > 0 ? Math.round((distCounts.healthy / totalCount) * 1000) / 10 : 0,
      },
      watch: {
        count: distCounts.watch,
        pct: totalCount > 0 ? Math.round((distCounts.watch / totalCount) * 1000) / 10 : 0,
      },
      atRisk: {
        count: distCounts.atRisk,
        pct: totalCount > 0 ? Math.round((distCounts.atRisk / totalCount) * 1000) / 10 : 0,
      },
    },
    aumAtRisk,
  };
}

// =============================================================================
// Revenue Intelligence
// =============================================================================

/**
 * Computes revenue composition broken down by wealth tier, revenue type,
 * and advisor contribution.
 *
 * @param firmId - The firm to analyze
 * @returns Revenue breakdown by multiple dimensions
 */
export function computeRevenueComposition(firmId: FirmId): RevenueComposition {
  const advisors = getFirmAdvisors(firmId);

  // Revenue by AUM tier
  const byTier: Record<RevenueTier, number> = {
    UNDER_1M: 0,
    '1M_5M': 0,
    '5M_30M': 0,
    OVER_30M: 0,
  };

  for (const advisor of advisors) {
    const households = getHouseholdsForAdvisor(advisor.advisorId);
    for (const hh of households) {
      if (hh.aum < 1_000_000) byTier.UNDER_1M += hh.annualRevenue;
      else if (hh.aum < 5_000_000) byTier['1M_5M'] += hh.annualRevenue;
      else if (hh.aum < 30_000_000) byTier['5M_30M'] += hh.annualRevenue;
      else byTier.OVER_30M += hh.annualRevenue;
    }
  }

  // Revenue by fee type
  const byType: Record<RevenueType, number> = {
    MANAGEMENT_FEE: advisors.reduce((s, a) => s + a.revenueByType.advisory, 0),
    PLANNING_FEE: advisors.reduce((s, a) => s + a.revenueByType.planning, 0),
    PERFORMANCE_FEE: advisors.reduce((s, a) => s + a.revenueByType.insurance + a.revenueByType.other, 0),
  };

  // Revenue by advisor
  const byAdvisor = advisors.map((a) => ({
    advisorId: a.advisorId,
    advisorName: a.name,
    revenue: a.annualRevenue,
  }));

  return {
    byTier,
    byType,
    byAdvisor,
  };
}

/**
 * Generates monthly revenue time series with actual vs projected values.
 *
 * @param firmId - The firm to generate time series for
 * @param months - Number of months of history to generate
 * @returns Array of monthly revenue data points
 */
export function generateRevenueTimeSeries(
  firmId: FirmId,
  months: number = 24,
): RevenueTimeSeriesPoint[] {
  const advisors = getFirmAdvisors(firmId);
  const currentAnnualRevenue = advisors.reduce((sum, a) => sum + a.annualRevenue, 0);
  const currentMonthlyRevenue = currentAnnualRevenue / 12;

  const points: RevenueTimeSeriesPoint[] = [];
  const seasonalFactors = [
    0.92, 0.94, 1.02, 1.04, 0.98, 0.96,
    0.93, 0.95, 1.01, 1.06, 1.04, 1.15,
  ];

  for (let i = 0; i < months; i++) {
    const date = new Date('2026-03-01');
    date.setMonth(date.getMonth() - (months - 1 - i));
    const monthStr = date.toISOString().substring(0, 7);
    const monthIdx = date.getMonth();

    // Revenue grows over time — earlier months have lower base
    const ageFactorMonths = months - 1 - i;
    const growthDiscount = Math.pow(0.995, ageFactorMonths); // ~6% annual growth backwards
    const baseRevenue = currentMonthlyRevenue * growthDiscount;
    const seasonal = seasonalFactors[monthIdx];

    const actual = Math.round(baseRevenue * seasonal);
    const projected = Math.round(baseRevenue * 1.02); // Projected is the budget/target
    const variance = actual - projected;

    // Break down actual into fee types
    const advisoryPct = 0.80;
    const planningPct = 0.12;
    const insurancePct = 0.05;
    const otherPct = 0.03;

    points.push({
      month: monthStr,
      actualRevenue: actual,
      projectedRevenue: projected,
    });
  }

  return points;
}

/**
 * Computes revenue at risk by analyzing churn signals across households.
 * Links engagement deterioration and health score drops to potential
 * revenue loss.
 *
 * @param firmId - The firm to analyze
 * @returns Revenue at risk analysis with contributing factors
 */
export function computeRevenueAtRisk(firmId: FirmId): RevenueAtRisk {
  const households = getAllHouseholds();
  const totalRevenue = households.reduce((sum, h) => sum + h.annualRevenue, 0);

  // Identify at-risk households based on multiple signals
  const atRiskHouseholds: Array<{
    householdId: string;
    name: string;
    advisorId: AdvisorId;
    annualRevenue: number;
    riskFactors: string[];
    churnProbability: number;
  }> = [];

  for (const hh of households) {
    const riskFactors: string[] = [];
    let churnScore = 0;

    // Low engagement
    if (hh.engagementScore < 40) {
      riskFactors.push('Very low engagement');
      churnScore += 30;
    } else if (hh.engagementScore < 60) {
      riskFactors.push('Below-average engagement');
      churnScore += 15;
    }

    // Poor health score
    if (hh.healthScore < 40) {
      riskFactors.push('Poor health score');
      churnScore += 25;
    } else if (hh.healthScore < 55) {
      riskFactors.push('Declining health score');
      churnScore += 10;
    }

    // Stale contact
    const daysSinceContact = Math.floor(
      (new Date('2026-03-01').getTime() - new Date(hh.lastContactDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceContact > 90) {
      riskFactors.push(`No contact in ${daysSinceContact} days`);
      churnScore += 20;
    } else if (daysSinceContact > 60) {
      riskFactors.push(`Limited contact (${daysSinceContact} days ago)`);
      churnScore += 8;
    }

    // At-risk status
    if (hh.status === 'at_risk') {
      riskFactors.push('Flagged as at-risk');
      churnScore += 25;
    }

    // Low data quality
    if (hh.dataQuality < 50) {
      riskFactors.push('Incomplete client data');
      churnScore += 10;
    }

    if (riskFactors.length >= 2 && churnScore >= 30) {
      atRiskHouseholds.push({
        householdId: hh.householdId,
        name: hh.name,
        advisorId: hh.advisorId,
        annualRevenue: hh.annualRevenue,
        riskFactors,
        churnProbability: Math.min(95, churnScore),
      });
    }
  }

  // Sort by revenue impact (highest revenue first)
  atRiskHouseholds.sort((a, b) => b.annualRevenue - a.annualRevenue);

  const revenueAtRisk = atRiskHouseholds.reduce(
    (sum, h) => sum + h.annualRevenue * (h.churnProbability / 100),
    0,
  );

  // Aggregate risk factors
  const factorCounts: Record<string, { count: number; revenueImpact: number }> = {};
  for (const hh of atRiskHouseholds) {
    for (const factor of hh.riskFactors) {
      if (!factorCounts[factor]) {
        factorCounts[factor] = { count: 0, revenueImpact: 0 };
      }
      factorCounts[factor].count += 1;
      factorCounts[factor].revenueImpact += hh.annualRevenue * (hh.churnProbability / 100);
    }
  }

  const topRiskFactors = Object.entries(factorCounts)
    .map(([factor, data]) => ({
      factor,
      householdCount: data.count,
      revenueImpact: Math.round(data.revenueImpact),
    }))
    .sort((a, b) => b.revenueImpact - a.revenueImpact)
    .slice(0, 8);

  const totalAumAtRisk = atRiskHouseholds.reduce((s, h) => s + h.annualRevenue / 0.0075, 0);

  return {
    householdsAtRisk: atRiskHouseholds.length,
    aumAtRisk: Math.round(totalAumAtRisk),
    revenueAtRisk: Math.round(revenueAtRisk),
    revenueImpactPercent: totalRevenue > 0
      ? Math.round((revenueAtRisk / totalRevenue) * 1000) / 10
      : 0,
    topAtRisk: atRiskHouseholds.slice(0, 15).map((h) => ({
      householdName: h.name,
      aum: h.annualRevenue / 0.0075,
      reason: h.riskFactors.join('; '),
    })),
  };
}

// =============================================================================
// Strategic Intelligence — Growth Opportunities
// =============================================================================

/**
 * Identifies growth opportunities by finding households with significant
 * held-away assets that could be consolidated.
 *
 * @param firmId - The firm to analyze
 * @returns Array of growth opportunities sorted by potential impact
 */
export function identifyGrowthOpportunities(firmId: FirmId): GrowthOpportunity[] {
  const households = getAllHouseholds();
  const opportunities: GrowthOpportunity[] = [];

  for (const hh of households) {
    if (hh.heldAwayAssets > 50_000) {
      const estimatedRevenue = Math.round(hh.heldAwayAssets * 0.0075);
      const probability = hh.engagementScore > 70 ? 'high'
        : hh.engagementScore > 45 ? 'medium'
        : 'low';

      const advisor = findAdvisor(hh.advisorId);

      opportunities.push({
        householdId: hh.householdId as string,
        householdName: hh.name,
        advisorName: advisor?.name ?? 'Unknown',
        heldAwayAum: hh.heldAwayAssets,
        probabilityToConsolidate: probability === 'high' ? 0.75
          : probability === 'medium' ? 0.45
          : 0.20,
        trigger: probability === 'high'
          ? 'High engagement — schedule asset consolidation review meeting'
          : probability === 'medium'
          ? 'Moderate engagement — include in next quarterly review discussion'
          : 'Low engagement — build relationship before approaching consolidation',
      });
    }
  }

  // Sort by held-away AUM descending
  opportunities.sort((a, b) => b.heldAwayAum - a.heldAwayAum);

  return opportunities.slice(0, 50);
}

/**
 * Identifies households not using all available services, representing
 * cross-sell and consolidation opportunities.
 *
 * @param firmId - The firm to analyze
 * @returns Array of consolidation opportunities
 */
export function identifyConsolidationOpportunities(firmId: FirmId): ConsolidationOpportunity[] {
  const households = getAllHouseholds();

  // Group by available service categories
  const categories: ConsolidationCategory[] = [
    'TAX_PLANNING',
    'ESTATE_PLAN',
    'ALTERNATIVE_INVESTMENTS',
    'MULTI_ADVISOR_COORDINATION',
  ];

  const serviceToCategory: Record<string, ConsolidationCategory> = {
    tax_planning: 'TAX_PLANNING',
    estate_planning: 'ESTATE_PLAN',
    insurance: 'ALTERNATIVE_INVESTMENTS',
    financial_planning: 'MULTI_ADVISOR_COORDINATION',
    banking: 'MULTI_ADVISOR_COORDINATION',
    lending: 'MULTI_ADVISOR_COORDINATION',
  };

  const categoryBuckets: Record<ConsolidationCategory, { count: number; totalAum: number }> = {
    TAX_PLANNING: { count: 0, totalAum: 0 },
    ESTATE_PLAN: { count: 0, totalAum: 0 },
    ALTERNATIVE_INVESTMENTS: { count: 0, totalAum: 0 },
    MULTI_ADVISOR_COORDINATION: { count: 0, totalAum: 0 },
  };

  for (const hh of households) {
    if (hh.availableServices.length > 0 && hh.status === 'active') {
      for (const svc of hh.availableServices) {
        const cat = serviceToCategory[svc];
        if (cat) {
          categoryBuckets[cat].count += 1;
          categoryBuckets[cat].totalAum += hh.aum;
        }
      }
    }
  }

  const opportunities: ConsolidationOpportunity[] = categories
    .filter((cat) => categoryBuckets[cat].count > 0)
    .map((cat) => ({
      category: cat,
      householdCount: categoryBuckets[cat].count,
      avgAum: categoryBuckets[cat].count > 0
        ? Math.round(categoryBuckets[cat].totalAum / categoryBuckets[cat].count)
        : 0,
      description: `${categoryBuckets[cat].count} households could benefit from ${cat.replace(/_/g, ' ').toLowerCase()} services.`,
    }));

  return opportunities;
}

/**
 * Computes capacity analysis for each advisor — how close they are to
 * their AUM and household capacity limits.
 *
 * @param firmId - The firm to analyze
 * @returns Capacity analysis for each advisor
 */
export function computeCapacityAnalysis(firmId: FirmId): CapacityAnalysis[] {
  const advisors = getFirmAdvisors(firmId);

  return advisors.map((advisor) => {
    const aumUtilization = (advisor.aum / advisor.aumCapacity) * 100;
    const hhUtilization = (advisor.householdCount / advisor.householdCapacity) * 100;
    const overallUtilization = Math.max(aumUtilization, hhUtilization);
    const isAtCapacity = overallUtilization >= 90;

    return {
      advisorId: advisor.advisorId,
      advisorName: advisor.name,
      currentCapacityPct: Math.round(overallUtilization * 10) / 10,
      aumPerHouseholdRatio: advisor.householdCount > 0
        ? Math.round(advisor.aum / advisor.householdCount)
        : 0,
      householdCount: advisor.householdCount,
      isAtCapacity,
      retirementYears: null,
    };
  });
}

/**
 * Computes benchmarking metrics against industry averages from
 * Schwab RIA Benchmarking Study and Cerulli Associates data.
 *
 * @param firmId - The firm to benchmark
 * @returns Array of benchmark comparisons
 */
export function computeBenchmarks(firmId: FirmId): BenchmarkMetric[] {
  const advisors = getFirmAdvisors(firmId);
  const totalAum = advisors.reduce((sum, a) => sum + a.aum, 0);
  const totalRevenue = advisors.reduce((sum, a) => sum + a.annualRevenue, 0);
  const totalHouseholds = advisors.reduce((sum, a) => sum + a.householdCount, 0);
  const avgRetention = weightedAverage(
    advisors.map((a) => a.clientRetentionRate),
    advisors.map((a) => a.householdCount),
  );
  const avgPlanHealth = weightedAverage(
    advisors.map((a) => a.planHealthScore),
    advisors.map((a) => a.householdCount),
  );
  const organicGrowthRate = (advisors.reduce((s, a) => s + a.netNewAssetsYTD, 0) / totalAum) * 100;

  const revenuePerAdvisor = totalRevenue / advisors.length;
  const aumPerAdvisor = totalAum / advisors.length;
  const hhPerAdvisor = totalHouseholds / advisors.length;
  const revenuePerHousehold = totalRevenue / totalHouseholds;
  const operatingMargin = 28.4; // Firm operating margin (demo)
  const revenueBps = (totalRevenue / totalAum) * 10_000;

  // Industry benchmarks sourced from Schwab RIA Benchmarking Study
  // and Cerulli Associates 2025 data
  function computePercentile(value: number, median: number, top25: number, higherIsBetter = true): number {
    if (higherIsBetter) {
      if (value >= top25) return 90;
      if (value >= median) return 50 + ((value - median) / (top25 - median)) * 40;
      return Math.max(5, 50 * (value / median));
    } else {
      if (value <= top25) return 90;
      if (value <= median) return 50 + ((median - value) / (median - top25)) * 40;
      return Math.max(5, 50 * (median / value));
    }
  }

  const benchmarks: BenchmarkMetric[] = [
    {
      metric: 'Organic Growth Rate',
      fartherValue: Math.round(organicGrowthRate * 100) / 100,
      topQuartile: 8.2,
      median: 4.8,
      percentile: Math.round(computePercentile(organicGrowthRate, 4.8, 8.2)),
    },
    {
      metric: 'Revenue per Advisor',
      fartherValue: Math.round(revenuePerAdvisor),
      topQuartile: 1_250_000,
      median: 780_000,
      percentile: Math.round(computePercentile(revenuePerAdvisor, 780_000, 1_250_000)),
    },
    {
      metric: 'AUM per Advisor',
      fartherValue: Math.round(aumPerAdvisor),
      topQuartile: 620_000_000,
      median: 340_000_000,
      percentile: Math.round(computePercentile(aumPerAdvisor, 340_000_000, 620_000_000)),
    },
    {
      metric: 'Households per Advisor',
      fartherValue: Math.round(hhPerAdvisor),
      topQuartile: 85,
      median: 120,
      percentile: Math.round(computePercentile(hhPerAdvisor, 120, 85, false)),
    },
    {
      metric: 'Revenue per Household',
      fartherValue: Math.round(revenuePerHousehold),
      topQuartile: 18_500,
      median: 8_200,
      percentile: Math.round(computePercentile(revenuePerHousehold, 8_200, 18_500)),
    },
    {
      metric: 'Client Retention Rate',
      fartherValue: Math.round(avgRetention * 10) / 10,
      topQuartile: 97.5,
      median: 94.5,
      percentile: Math.round(computePercentile(avgRetention, 94.5, 97.5)),
    },
    {
      metric: 'Operating Margin',
      fartherValue: operatingMargin,
      topQuartile: 33.5,
      median: 24.0,
      percentile: Math.round(computePercentile(operatingMargin, 24.0, 33.5)),
    },
    {
      metric: 'Revenue Yield (bps)',
      fartherValue: Math.round(revenueBps * 10) / 10,
      topQuartile: 78,
      median: 62,
      percentile: Math.round(computePercentile(revenueBps, 62, 78)),
    },
    {
      metric: 'Plan Health Score',
      fartherValue: Math.round(avgPlanHealth * 10) / 10,
      topQuartile: 82,
      median: 68,
      percentile: Math.round(computePercentile(avgPlanHealth, 68, 82)),
    },
  ];

  return benchmarks;
}
