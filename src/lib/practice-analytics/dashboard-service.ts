/**
 * Farther Unified Platform — Practice Analytics Dashboard Service
 *
 * Builds complete dashboard data objects for each user role:
 * - MD/Principal: firm-wide KPIs, advisor scorecards, strategic intelligence
 * - Advisor: personal book metrics, engagement, planning quality, pipeline
 * - Operations: data quality, billing, compliance, platform adoption
 *
 * All functions compose from analytics-service.ts computation functions.
 * No external DB dependencies — pure assembly of computed analytics.
 *
 * @module practice-analytics/dashboard-service
 */

import type {
  FirmId,
  AdvisorId,
  MDDashboardData,
  AdvisorDashboardData,
  OperationsDashboardData,
  PipelineFunnel,
  PipelineStage,
  EngagementMetrics,
  ContactFrequency,
  PlanningQualityMetrics,
  PlanQualityDistribution,
  DailyActionList,
  ActionUrgency,
  DataQualityMetric,
  PlatformAdoption,
  KPICard,
  HouseholdHealthEntry,
  BillingStatus,
  CustodianSyncHealth,
} from './types';

/** Local type alias for wealth tiers used in demo engagement data. */
type WealthTier = 'uhnw' | 'hnw' | 'mass_affluent' | 'emerging';

import {
  computeFirmKPIs,
  computeAumGrowthAttribution,
  generateAumTimeSeries,
  computeAdvisorScorecards,
  computeAdvisorScorecard,
  rankAdvisors,
  computeClientHealthHeatmap,
  computeRevenueComposition,
  generateRevenueTimeSeries,
  computeRevenueAtRisk,
  identifyGrowthOpportunities,
  identifyConsolidationOpportunities,
  computeCapacityAnalysis,
  computeBenchmarks,
  computeHealthScore,
  classifyHealthCategory,
} from './analytics-service';

// =============================================================================
// Internal Demo Data — Pipeline & Engagement Details
// =============================================================================

interface DemoPipelineProspect {
  name: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'onboarding';
  potentialAum: number;
  source: string;
  daysInStage: number;
  nextAction: string;
  lastContactDate: string;
}

interface DemoAdvisorEngagementData {
  advisorId: string;
  totalMeetingsLast90Days: number;
  totalEmailsLast90Days: number;
  totalCallsLast90Days: number;
  avgMeetingsPerHouseholdPerYear: number;
  contactFrequencyByTier: Record<WealthTier, {
    avgDaysBetweenContacts: number;
    targetDays: number;
    compliance: number;
  }>;
  recentMeetings: Array<{
    householdName: string;
    date: string;
    type: 'in_person' | 'virtual' | 'phone';
    notes: string;
  }>;
}

/** Pipeline data keyed by advisor ID. */
const DEMO_PIPELINE: Record<string, DemoPipelineProspect[]> = {
  'adv-001': [
    { name: 'Richardson Family Trust', stage: 'proposal', potentialAum: 4_200_000, source: 'Referral', daysInStage: 8, nextAction: 'Follow up on proposal questions', lastContactDate: '2026-02-26' },
    { name: 'Greenfield Holdings', stage: 'negotiation', potentialAum: 6_800_000, source: 'COI - Attorney', daysInStage: 14, nextAction: 'Negotiate fee schedule', lastContactDate: '2026-02-24' },
    { name: 'Patel Residence Trust', stage: 'qualified', potentialAum: 2_100_000, source: 'Website', daysInStage: 22, nextAction: 'Schedule discovery meeting', lastContactDate: '2026-02-20' },
    { name: 'Baker Retirement', stage: 'lead', potentialAum: 1_800_000, source: 'Seminar', daysInStage: 5, nextAction: 'Initial outreach call', lastContactDate: '2026-02-27' },
    { name: 'Thompson Estate', stage: 'onboarding', potentialAum: 3_100_000, source: 'Referral', daysInStage: 12, nextAction: 'Complete account transfers', lastContactDate: '2026-02-25' },
    { name: 'Yamamoto Family', stage: 'lead', potentialAum: 1_500_000, source: 'COI - CPA', daysInStage: 3, nextAction: 'Send introduction email', lastContactDate: '2026-02-28' },
    { name: 'Stevens Portfolio', stage: 'qualified', potentialAum: 2_800_000, source: 'Referral', daysInStage: 18, nextAction: 'Prepare risk profile questionnaire', lastContactDate: '2026-02-22' },
    { name: 'DeSilva Trust', stage: 'proposal', potentialAum: 5_200_000, source: 'COI - Attorney', daysInStage: 6, nextAction: 'Present comprehensive plan', lastContactDate: '2026-02-27' },
  ],
  'adv-002': [
    { name: 'Chen Enterprises', stage: 'qualified', potentialAum: 3_400_000, source: 'LinkedIn', daysInStage: 15, nextAction: 'Discovery meeting scheduled', lastContactDate: '2026-02-23' },
    { name: 'Morales Family', stage: 'lead', potentialAum: 1_200_000, source: 'Seminar', daysInStage: 7, nextAction: 'Follow-up call', lastContactDate: '2026-02-26' },
    { name: 'Jackson Trust', stage: 'proposal', potentialAum: 5_600_000, source: 'Referral', daysInStage: 10, nextAction: 'Address investment policy questions', lastContactDate: '2026-02-25' },
    { name: 'Singh Portfolio', stage: 'negotiation', potentialAum: 2_900_000, source: 'Website', daysInStage: 20, nextAction: 'Finalize service agreement', lastContactDate: '2026-02-21' },
    { name: 'Anderson Retirement', stage: 'lead', potentialAum: 800_000, source: 'Referral', daysInStage: 2, nextAction: 'Schedule intro call', lastContactDate: '2026-02-28' },
    { name: 'Park Family Office', stage: 'qualified', potentialAum: 7_200_000, source: 'COI - CPA', daysInStage: 12, nextAction: 'Prepare preliminary analysis', lastContactDate: '2026-02-24' },
    { name: 'O\'Brien Trust', stage: 'lead', potentialAum: 1_600_000, source: 'Seminar', daysInStage: 4, nextAction: 'Send follow-up materials', lastContactDate: '2026-02-27' },
    { name: 'Gutierrez Estate', stage: 'proposal', potentialAum: 3_800_000, source: 'COI - Attorney', daysInStage: 9, nextAction: 'Review estate plan integration', lastContactDate: '2026-02-26' },
    { name: 'Kim Retirement', stage: 'lead', potentialAum: 950_000, source: 'Website', daysInStage: 1, nextAction: 'Initial contact', lastContactDate: '2026-02-28' },
    { name: 'Nguyen Holdings', stage: 'qualified', potentialAum: 4_100_000, source: 'Referral', daysInStage: 16, nextAction: 'Complete financial audit', lastContactDate: '2026-02-22' },
    { name: 'Taylor Portfolio', stage: 'negotiation', potentialAum: 2_200_000, source: 'LinkedIn', daysInStage: 25, nextAction: 'Resolve custody transfer concerns', lastContactDate: '2026-02-19' },
    { name: 'Wilson Family', stage: 'onboarding', potentialAum: 1_900_000, source: 'Referral', daysInStage: 8, nextAction: 'Collect remaining paperwork', lastContactDate: '2026-02-26' },
  ],
  'adv-003': [
    { name: 'Wang Family Trust', stage: 'proposal', potentialAum: 4_600_000, source: 'Referral', daysInStage: 5, nextAction: 'Present planning proposal', lastContactDate: '2026-02-27' },
    { name: 'Hernandez Portfolio', stage: 'qualified', potentialAum: 1_900_000, source: 'Seminar', daysInStage: 10, nextAction: 'Complete risk assessment', lastContactDate: '2026-02-25' },
    { name: 'Fischer Estate', stage: 'negotiation', potentialAum: 3_200_000, source: 'COI - Attorney', daysInStage: 18, nextAction: 'Align fee structure with complexity', lastContactDate: '2026-02-21' },
    { name: 'Sato Retirement', stage: 'lead', potentialAum: 2_400_000, source: 'Website', daysInStage: 6, nextAction: 'Schedule intro meeting', lastContactDate: '2026-02-26' },
    { name: 'Campbell Trust', stage: 'onboarding', potentialAum: 2_800_000, source: 'Referral', daysInStage: 15, nextAction: 'Finalize investment policy statement', lastContactDate: '2026-02-23' },
    { name: 'Lee Dynasty Trust', stage: 'qualified', potentialAum: 5_800_000, source: 'COI - CPA', daysInStage: 8, nextAction: 'Prepare comprehensive analysis', lastContactDate: '2026-02-26' },
  ],
  'adv-004': [
    { name: 'Garcia Family', stage: 'lead', potentialAum: 650_000, source: 'Seminar', daysInStage: 3, nextAction: 'Follow-up from seminar', lastContactDate: '2026-02-28' },
    { name: 'Robinson Trust', stage: 'qualified', potentialAum: 2_100_000, source: 'Referral', daysInStage: 12, nextAction: 'Schedule discovery meeting', lastContactDate: '2026-02-24' },
    { name: 'Davis Retirement', stage: 'proposal', potentialAum: 1_400_000, source: 'Website', daysInStage: 8, nextAction: 'Present financial plan', lastContactDate: '2026-02-26' },
    { name: 'Lopez Portfolio', stage: 'lead', potentialAum: 900_000, source: 'LinkedIn', daysInStage: 1, nextAction: 'Initial outreach', lastContactDate: '2026-02-28' },
    { name: 'White Family Trust', stage: 'qualified', potentialAum: 3_200_000, source: 'COI - CPA', daysInStage: 19, nextAction: 'Analyze tax situation', lastContactDate: '2026-02-20' },
    { name: 'Harris Estate', stage: 'lead', potentialAum: 1_100_000, source: 'Seminar', daysInStage: 6, nextAction: 'Send educational materials', lastContactDate: '2026-02-26' },
    { name: 'Clark Retirement', stage: 'lead', potentialAum: 750_000, source: 'Referral', daysInStage: 2, nextAction: 'Schedule intro call', lastContactDate: '2026-02-28' },
    { name: 'Young Holdings', stage: 'negotiation', potentialAum: 4_800_000, source: 'COI - Attorney', daysInStage: 22, nextAction: 'Finalize investment mandate', lastContactDate: '2026-02-18' },
    { name: 'King Family', stage: 'proposal', potentialAum: 1_800_000, source: 'Referral', daysInStage: 11, nextAction: 'Address fee comparison questions', lastContactDate: '2026-02-24' },
    { name: 'Scott Portfolio', stage: 'lead', potentialAum: 500_000, source: 'Website', daysInStage: 4, nextAction: 'Send introductory packet', lastContactDate: '2026-02-27' },
    { name: 'Adams Trust', stage: 'qualified', potentialAum: 2_600_000, source: 'Referral', daysInStage: 14, nextAction: 'Complete risk profiling', lastContactDate: '2026-02-22' },
    { name: 'Turner Retirement', stage: 'lead', potentialAum: 680_000, source: 'Seminar', daysInStage: 5, nextAction: 'Follow up on interest', lastContactDate: '2026-02-27' },
    { name: 'Hill Family', stage: 'onboarding', potentialAum: 1_600_000, source: 'Referral', daysInStage: 10, nextAction: 'Complete account opening forms', lastContactDate: '2026-02-25' },
    { name: 'Allen Portfolio', stage: 'lead', potentialAum: 420_000, source: 'Website', daysInStage: 7, nextAction: 'Qualification call', lastContactDate: '2026-02-26' },
    { name: 'Wright Estate', stage: 'qualified', potentialAum: 3_500_000, source: 'COI - Attorney', daysInStage: 9, nextAction: 'Review estate documents', lastContactDate: '2026-02-25' },
    { name: 'Martinez Retirement', stage: 'lead', potentialAum: 580_000, source: 'LinkedIn', daysInStage: 8, nextAction: 'Schedule phone consultation', lastContactDate: '2026-02-25' },
    { name: 'Nelson Trust', stage: 'proposal', potentialAum: 2_200_000, source: 'Referral', daysInStage: 13, nextAction: 'Discuss implementation timeline', lastContactDate: '2026-02-23' },
    { name: 'Carter Family', stage: 'lead', potentialAum: 340_000, source: 'Seminar', daysInStage: 10, nextAction: 'Determine financial planning needs', lastContactDate: '2026-02-24' },
  ],
  'adv-005': [
    { name: 'Mitchell Fortune Trust', stage: 'negotiation', potentialAum: 8_200_000, source: 'Referral', daysInStage: 28, nextAction: 'Resolve fee structure concerns', lastContactDate: '2026-02-15' },
    { name: 'Cooper Enterprises', stage: 'qualified', potentialAum: 3_100_000, source: 'COI - CPA', daysInStage: 20, nextAction: 'Tax optimization analysis', lastContactDate: '2026-02-20' },
    { name: 'Brooks Portfolio', stage: 'lead', potentialAum: 1_800_000, source: 'Website', daysInStage: 12, nextAction: 'Initial call (overdue)', lastContactDate: '2026-02-22' },
    { name: 'Reed Estate', stage: 'proposal', potentialAum: 5_400_000, source: 'COI - Attorney', daysInStage: 16, nextAction: 'Follow up on proposal (overdue)', lastContactDate: '2026-02-20' },
  ],
};

/** Engagement data keyed by advisor ID. */
const DEMO_ENGAGEMENT: Record<string, DemoAdvisorEngagementData> = {
  'adv-001': {
    advisorId: 'adv-001',
    totalMeetingsLast90Days: 114,
    totalEmailsLast90Days: 642,
    totalCallsLast90Days: 287,
    avgMeetingsPerHouseholdPerYear: 2.1,
    contactFrequencyByTier: {
      uhnw: { avgDaysBetweenContacts: 18, targetDays: 21, compliance: 100 },
      hnw: { avgDaysBetweenContacts: 28, targetDays: 30, compliance: 96 },
      mass_affluent: { avgDaysBetweenContacts: 42, targetDays: 45, compliance: 92 },
      emerging: { avgDaysBetweenContacts: 65, targetDays: 60, compliance: 78 },
    },
    recentMeetings: [
      { householdName: 'Richardson Family Trust', date: '2026-02-28', type: 'in_person', notes: 'Quarterly review — discussed estate updates' },
      { householdName: 'DeSilva Trust', date: '2026-02-27', type: 'virtual', notes: 'Plan presentation — new prospect' },
      { householdName: 'Baker Retirement', date: '2026-02-27', type: 'phone', notes: 'Initial discovery call' },
    ],
  },
  'adv-002': {
    advisorId: 'adv-002',
    totalMeetingsLast90Days: 84,
    totalEmailsLast90Days: 510,
    totalCallsLast90Days: 198,
    avgMeetingsPerHouseholdPerYear: 1.6,
    contactFrequencyByTier: {
      uhnw: { avgDaysBetweenContacts: 24, targetDays: 21, compliance: 82 },
      hnw: { avgDaysBetweenContacts: 34, targetDays: 30, compliance: 84 },
      mass_affluent: { avgDaysBetweenContacts: 52, targetDays: 45, compliance: 76 },
      emerging: { avgDaysBetweenContacts: 78, targetDays: 60, compliance: 64 },
    },
    recentMeetings: [
      { householdName: 'Chen Enterprises', date: '2026-02-26', type: 'virtual', notes: 'Discovery meeting — complex business structure' },
      { householdName: 'Jackson Trust', date: '2026-02-25', type: 'in_person', notes: 'Proposal review' },
    ],
  },
  'adv-003': {
    advisorId: 'adv-003',
    totalMeetingsLast90Days: 126,
    totalEmailsLast90Days: 698,
    totalCallsLast90Days: 312,
    avgMeetingsPerHouseholdPerYear: 2.4,
    contactFrequencyByTier: {
      uhnw: { avgDaysBetweenContacts: 14, targetDays: 21, compliance: 100 },
      hnw: { avgDaysBetweenContacts: 22, targetDays: 30, compliance: 100 },
      mass_affluent: { avgDaysBetweenContacts: 38, targetDays: 45, compliance: 96 },
      emerging: { avgDaysBetweenContacts: 55, targetDays: 60, compliance: 90 },
    },
    recentMeetings: [
      { householdName: 'Wang Family Trust', date: '2026-02-28', type: 'in_person', notes: 'Comprehensive plan presentation' },
      { householdName: 'Lee Dynasty Trust', date: '2026-02-27', type: 'virtual', notes: 'Multi-generational planning discussion' },
      { householdName: 'Fischer Estate', date: '2026-02-26', type: 'in_person', notes: 'Fee negotiation meeting' },
    ],
  },
  'adv-004': {
    advisorId: 'adv-004',
    totalMeetingsLast90Days: 72,
    totalEmailsLast90Days: 385,
    totalCallsLast90Days: 165,
    avgMeetingsPerHouseholdPerYear: 1.8,
    contactFrequencyByTier: {
      uhnw: { avgDaysBetweenContacts: 28, targetDays: 21, compliance: 68 },
      hnw: { avgDaysBetweenContacts: 38, targetDays: 30, compliance: 72 },
      mass_affluent: { avgDaysBetweenContacts: 48, targetDays: 45, compliance: 82 },
      emerging: { avgDaysBetweenContacts: 62, targetDays: 60, compliance: 88 },
    },
    recentMeetings: [
      { householdName: 'Robinson Trust', date: '2026-02-27', type: 'virtual', notes: 'Discovery session' },
      { householdName: 'White Family Trust', date: '2026-02-26', type: 'phone', notes: 'Tax planning follow-up' },
    ],
  },
  'adv-005': {
    advisorId: 'adv-005',
    totalMeetingsLast90Days: 66,
    totalEmailsLast90Days: 420,
    totalCallsLast90Days: 145,
    avgMeetingsPerHouseholdPerYear: 1.3,
    contactFrequencyByTier: {
      uhnw: { avgDaysBetweenContacts: 32, targetDays: 21, compliance: 58 },
      hnw: { avgDaysBetweenContacts: 44, targetDays: 30, compliance: 62 },
      mass_affluent: { avgDaysBetweenContacts: 68, targetDays: 45, compliance: 54 },
      emerging: { avgDaysBetweenContacts: 95, targetDays: 60, compliance: 42 },
    },
    recentMeetings: [
      { householdName: 'Mitchell Fortune Trust', date: '2026-02-20', type: 'phone', notes: 'Fee discussion — needs follow-up' },
    ],
  },
};

// =============================================================================
// Helper — Time-Based Greeting
// =============================================================================

function getTimeBasedGreeting(advisorName: string): string {
  const hour = new Date().getHours();
  const firstName = advisorName.split(' ')[0];
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

// =============================================================================
// Helper — Daily Actions
// =============================================================================

function generateDailyActionsForDashboard(advisorId: AdvisorId): DailyActionList {
  const pipeline = DEMO_PIPELINE[advisorId] ?? [];
  const engagement = DEMO_ENGAGEMENT[advisorId];

  // Collect raw action data
  const rawActions: Array<{
    title: string;
    description: string;
    householdName: string;
    householdId: string;
    aum: number;
    urgency: ActionUrgency;
    category: 'URGENT' | 'PLANNING' | 'ENGAGEMENT' | 'COMPLIANCE';
    priorityScore: number;
    priorityFactors: string[];
  }> = [];

  // Overdue follow-ups from pipeline
  for (const prospect of pipeline) {
    if (prospect.daysInStage > 14 && prospect.stage !== 'lead') {
      const urgency: ActionUrgency = prospect.daysInStage > 21 ? 'URGENT' : 'HIGH';
      rawActions.push({
        title: `Follow up: ${prospect.name}`,
        description: `${prospect.nextAction} — ${prospect.daysInStage} days in ${prospect.stage} stage`,
        householdName: prospect.name,
        householdId: `prospect-${prospect.name.replace(/\s+/g, '-').toLowerCase()}`,
        aum: prospect.potentialAum,
        urgency,
        category: 'ENGAGEMENT',
        priorityScore: prospect.daysInStage > 21 ? 82 : 65,
        priorityFactors: [`${prospect.daysInStage} days in ${prospect.stage} stage`, 'Pipeline follow-up overdue'],
      });
    }
  }

  // Contact compliance gaps — identify tiers below target
  if (engagement) {
    const tiers: WealthTier[] = ['uhnw', 'hnw', 'mass_affluent', 'emerging'];
    for (const tier of tiers) {
      const data = engagement.contactFrequencyByTier[tier];
      if (data.compliance < 75) {
        const urgency: ActionUrgency = data.compliance < 60 ? 'HIGH' : 'NORMAL';
        rawActions.push({
          title: `Improve ${tier.replace('_', ' ')} contact frequency`,
          description: `Contact compliance at ${data.compliance}% for ${tier.replace('_', ' ')} clients (target: every ${data.targetDays} days, actual: every ${data.avgDaysBetweenContacts} days)`,
          householdName: `${tier.replace('_', ' ')} tier clients`,
          householdId: `tier-${tier}`,
          aum: 0,
          urgency,
          category: 'ENGAGEMENT',
          priorityScore: data.compliance < 60 ? 75 : 55,
          priorityFactors: [`Contact compliance at ${data.compliance}%`, `Target: every ${data.targetDays} days`],
        });
      }
    }
  }

  // New leads to qualify
  const newLeads = pipeline.filter((p) => p.stage === 'lead' && p.daysInStage <= 5);
  if (newLeads.length > 0) {
    rawActions.push({
      title: `${newLeads.length} new lead${newLeads.length > 1 ? 's' : ''} to contact`,
      description: `New leads: ${newLeads.map((l) => l.name).join(', ')}`,
      householdName: newLeads[0].name,
      householdId: `lead-${newLeads[0].name.replace(/\s+/g, '-').toLowerCase()}`,
      aum: newLeads.reduce((s, l) => s + l.potentialAum, 0),
      urgency: 'NORMAL' as ActionUrgency,
      category: 'ENGAGEMENT',
      priorityScore: 50,
      priorityFactors: [`${newLeads.length} new leads to qualify`],
    });
  }

  // Sort by priority score descending
  rawActions.sort((a, b) => b.priorityScore - a.priorityScore);

  const items = rawActions.map((a, idx) => ({
    id: `dash-action-${advisorId}-${String(idx + 1).padStart(3, '0')}`,
    householdId: a.householdId,
    householdName: a.householdName,
    aum: a.aum,
    urgency: a.urgency,
    category: a.category as 'ALL' | 'URGENT' | 'PLANNING' | 'ENGAGEMENT' | 'COMPLIANCE',
    title: a.title,
    description: a.description,
    actions: [
      { label: 'Call Client', actionType: 'CALL' as const },
      { label: 'Send Email', actionType: 'EMAIL' as const },
      { label: 'Mark Complete', actionType: 'MARK_COMPLETE' as const },
    ],
    priorityScore: a.priorityScore,
    priorityFactors: a.priorityFactors,
  }));

  const categoryCounts: Record<'ALL' | 'URGENT' | 'PLANNING' | 'ENGAGEMENT' | 'COMPLIANCE', number> = {
    ALL: items.length,
    URGENT: 0,
    PLANNING: 0,
    ENGAGEMENT: 0,
    COMPLIANCE: 0,
  };
  for (const item of items) {
    if (item.category !== 'ALL') {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }
  }

  // Advisor name lookup
  const advisorNames: Record<string, string> = {
    'adv-001': 'Sarah Chen',
    'adv-002': 'Michael Thompson',
    'adv-003': 'Jennifer Williams',
    'adv-004': 'David Rodriguez',
    'adv-005': 'Emily Davis',
  };
  const advisorName = advisorNames[advisorId as string] ?? 'Advisor';

  const hour = new Date().getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  if (hour >= 17) timeOfDay = 'evening';

  const highPriorityCount = items.filter(
    (i) => i.urgency === 'URGENT' || i.urgency === 'HIGH',
  ).length;

  return {
    advisorId,
    advisorName,
    greeting: `Good ${timeOfDay}, ${advisorName.split(' ')[0]}. You have ${highPriorityCount} high-priority action${highPriorityCount !== 1 ? 's' : ''} today.`,
    items,
    categoryCounts,
  };
}

// =============================================================================
// MD/Principal Dashboard
// =============================================================================

/**
 * Assembles the complete MD/Principal dashboard with all sections:
 * firm KPIs, AUM growth, advisor scorecards, client health heatmap,
 * revenue intelligence, and strategic intelligence.
 *
 * @param firmId - The firm to build the dashboard for
 * @returns Complete MD dashboard data object
 */
export function buildMDDashboard(firmId: FirmId): MDDashboardData {
  const firmKPIs = computeFirmKPIs(firmId);
  const aumAttribution = computeAumGrowthAttribution(firmId, 12);
  const aumTimeSeries = generateAumTimeSeries(firmId, 24);
  const advisorScorecards = computeAdvisorScorecards(firmId);
  const clientHealthHeatmap = computeClientHealthHeatmap(firmId);
  const revenueComposition = computeRevenueComposition(firmId);
  const revenueTimeSeries = generateRevenueTimeSeries(firmId, 24);
  const revenueAtRisk = computeRevenueAtRisk(firmId);
  const growthOpps = identifyGrowthOpportunities(firmId).slice(0, 20);
  const consolidationOpps = identifyConsolidationOpportunities(firmId).slice(0, 20);
  const capacityAnalysis = computeCapacityAnalysis(firmId);
  const benchmarks = computeBenchmarks(firmId);

  return {
    firmKPIs,
    aumGrowth: {
      attribution: aumAttribution,
      timeSeries: aumTimeSeries,
    },
    advisorScorecards,
    clientHealthHeatmap,
    revenueIntelligence: {
      composition: revenueComposition,
      timeSeries: revenueTimeSeries,
      atRisk: revenueAtRisk,
    },
    strategicIntelligence: {
      growthOpps,
      consolidationOpps,
      capacityAnalysis,
      benchmarks,
    },
  };
}

// =============================================================================
// Advisor Dashboard
// =============================================================================

/**
 * Assembles the complete advisor dashboard with personal book metrics,
 * engagement analytics, planning quality, and pipeline data.
 * All data is filtered to the specific advisor.
 *
 * @param advisorId - The advisor to build the dashboard for
 * @param firmId - The firm context (for peer comparison)
 * @returns Complete advisor dashboard data object
 */
export function buildAdvisorDashboard(
  advisorId: AdvisorId,
  firmId: FirmId,
): AdvisorDashboardData {
  const scorecard = computeAdvisorScorecard(advisorId);
  const clientHealthData = computeClientHealthHeatmap(firmId, { advisorId });
  const pipeline = computePipelineFunnel(advisorId);
  const engagementAnalytics = computeEngagementMetrics(advisorId);
  const planningQuality = computePlanningQuality(advisorId);
  const dailyActions = generateDailyActionsForDashboard(advisorId);

  // Build KPI cards for the book overview
  const kpis: KPICard[] = [
    {
      label: 'Total AUM',
      value: scorecard.aum,
      formattedValue: `$${(scorecard.aum / 1_000_000).toFixed(1)}M`,
      changePercent: scorecard.aumChangeMTD !== 0
        ? Math.round((scorecard.aumChangeMTD / (scorecard.aum - scorecard.aumChangeMTD)) * 1000) / 10
        : 0,
      changePeriod: 'MTD',
      trend: scorecard.aumChangeMTD > 0 ? 'up' : scorecard.aumChangeMTD < 0 ? 'down' : 'flat',
    },
    {
      label: 'Households',
      value: scorecard.households,
      formattedValue: String(scorecard.households),
      changePercent: scorecard.householdsChangeMTD !== 0
        ? Math.round((scorecard.householdsChangeMTD / (scorecard.households - scorecard.householdsChangeMTD)) * 1000) / 10
        : 0,
      changePeriod: 'MTD',
      trend: scorecard.householdsChangeMTD > 0 ? 'up' : scorecard.householdsChangeMTD < 0 ? 'down' : 'flat',
    },
    {
      label: 'Annual Revenue',
      value: scorecard.revenue,
      formattedValue: `$${(scorecard.revenue / 1_000).toFixed(0)}K`,
      changePercent: scorecard.revenueChangeYoY,
      changePeriod: 'YoY',
      trend: scorecard.revenueChangeYoY > 0 ? 'up' : scorecard.revenueChangeYoY < 0 ? 'down' : 'flat',
    },
    {
      label: 'Plan Health Score',
      value: scorecard.planHealthScore,
      formattedValue: `${scorecard.planHealthScore}%`,
      changePercent: 0,
      changePeriod: 'MTD',
      trend: 'flat',
    },
  ];

  return {
    greeting: getTimeBasedGreeting(scorecard.advisorName),
    dailyActions,
    bookOverview: {
      kpis,
      clientHealthGrid: clientHealthData.entries,
    },
    engagementAnalytics,
    planningQuality,
    pipeline,
  };
}

// =============================================================================
// Operations Dashboard
// =============================================================================

/**
 * Assembles the operations dashboard with data quality, billing,
 * compliance, custodian sync health, and platform adoption metrics.
 *
 * @param firmId - The firm to build the dashboard for
 * @returns Complete operations dashboard data object
 */
export function buildOperationsDashboard(firmId: FirmId): OperationsDashboardData {
  const advisorScorecards = computeAdvisorScorecards(firmId);

  // Build DataQualityMetric[] (canonical structure)
  const dataQuality: DataQualityMetric[] = [
    { category: 'Contact Information', completionScore: 94.2, missingDataCount: 28, staleSyncCount: 5 },
    { category: 'Account Holdings', completionScore: 98.1, missingDataCount: 8, staleSyncCount: 12 },
    { category: 'Estate Planning Documents', completionScore: 72.4, missingDataCount: 86, staleSyncCount: 0 },
    { category: 'Insurance Coverage', completionScore: 68.8, missingDataCount: 102, staleSyncCount: 0 },
    { category: 'Beneficiary Designations', completionScore: 78.2, missingDataCount: 64, staleSyncCount: 3 },
    { category: 'Tax Return Data', completionScore: 82.6, missingDataCount: 48, staleSyncCount: 8 },
    { category: 'Risk Profile Questionnaire', completionScore: 86.4, missingDataCount: 38, staleSyncCount: 0 },
  ];

  // Build BillingStatus (canonical structure)
  const billingStatus: BillingStatus = {
    upcomingCycles: 1,
    errors: 3,
    exceptions: 7,
    nextBillingDate: '2026-03-31',
  };

  // Build compliance calendar
  const complianceCalendar: Array<{
    date: string;
    description: string;
    category: string;
    affectedHouseholds: number;
  }> = [
    { date: '2026-03-15', description: 'Q1 ADV Part 2A annual update filing deadline', category: 'Regulatory Filing', affectedHouseholds: 0 },
    { date: '2026-03-31', description: 'RMD distribution deadline for inherited IRAs', category: 'Client Compliance', affectedHouseholds: 24 },
    { date: '2026-04-15', description: 'Tax filing deadline — review outstanding client documents', category: 'Tax Compliance', affectedHouseholds: 156 },
    { date: '2026-04-30', description: 'Reg BI documentation audit completion target', category: 'Regulatory Compliance', affectedHouseholds: 0 },
    { date: '2026-06-30', description: 'Mid-year compliance review', category: 'Internal Audit', affectedHouseholds: 0 },
  ];

  // Build CustodianSyncHealth[] (canonical structure)
  const custodianSyncHealth: CustodianSyncHealth[] = [
    { custodianName: 'Schwab', status: 'healthy', lastSyncAt: '2026-03-01T06:15:00Z', latencyMs: 1200, errorCount24h: 0 },
    { custodianName: 'Fidelity', status: 'healthy', lastSyncAt: '2026-03-01T06:12:00Z', latencyMs: 1800, errorCount24h: 2 },
    { custodianName: 'Pershing', status: 'degraded', lastSyncAt: '2026-03-01T05:48:00Z', latencyMs: 4500, errorCount24h: 5 },
  ];

  // Build PlatformAdoption[] (canonical structure — per advisor)
  const toolNames = ['Financial Plan Viewer', 'Document Vault', 'Performance Reporting', 'Secure Messaging', 'Goal Tracking'];
  const platformAdoption: PlatformAdoption[] = advisorScorecards.map((sc) => ({
    advisorId: sc.advisorId,
    advisorName: sc.advisorName,
    toolUsage: Object.fromEntries(
      toolNames.map((tool) => [
        tool,
        {
          used: Math.random() > 0.2,
          lastUsedAt: Math.random() > 0.3 ? '2026-02-28T14:30:00Z' : null,
        },
      ]),
    ),
  }));

  // Build support queue
  const supportQueue = {
    openTickets: 18,
    inProgressTickets: 7,
    avgResolutionTimeHours: 4.2,
    escalatedTickets: 2,
  };

  return {
    dataQuality,
    billingStatus,
    complianceCalendar,
    custodianSyncHealth,
    platformAdoption,
    supportQueue,
  };
}

// =============================================================================
// Pipeline Funnel
// =============================================================================

/**
 * Computes the pipeline funnel for an advisor with stage counts,
 * potential AUM, and conversion metrics.
 *
 * @param advisorId - The advisor to compute the pipeline for
 * @returns Pipeline funnel data with stage breakdown
 */
export function computePipelineFunnel(advisorId: AdvisorId): PipelineFunnel {
  const prospects = DEMO_PIPELINE[advisorId] ?? [];

  // Map demo stages to canonical PipelineStage
  const stageMapping: Record<string, PipelineStage> = {
    lead: 'PROSPECT',
    qualified: 'IN_DISCOVERY',
    proposal: 'PROPOSAL_SENT',
    negotiation: 'CLOSING',
    onboarding: 'WON',
  };

  // Aggregate by canonical stage
  const stageAggregates: Record<PipelineStage, { count: number; potentialAum: number }> = {
    PROSPECT: { count: 0, potentialAum: 0 },
    IN_DISCOVERY: { count: 0, potentialAum: 0 },
    PROPOSAL_SENT: { count: 0, potentialAum: 0 },
    PROPOSAL_VIEWED: { count: 0, potentialAum: 0 },
    CLOSING: { count: 0, potentialAum: 0 },
    WON: { count: 0, potentialAum: 0 },
    LOST: { count: 0, potentialAum: 0 },
  };

  for (const p of prospects) {
    const canonicalStage = stageMapping[p.stage] ?? 'PROSPECT';
    stageAggregates[canonicalStage].count += 1;
    stageAggregates[canonicalStage].potentialAum += p.potentialAum;
  }

  const canonicalStageOrder: PipelineStage[] = [
    'PROSPECT', 'IN_DISCOVERY', 'PROPOSAL_SENT', 'PROPOSAL_VIEWED', 'CLOSING', 'WON', 'LOST',
  ];

  const stages = canonicalStageOrder
    .filter((s) => stageAggregates[s].count > 0)
    .map((s) => ({
      stage: s,
      count: stageAggregates[s].count,
      potentialAum: stageAggregates[s].potentialAum,
    }));

  return {
    stages,
    conversionRate: 0.284,
    firmAvgConversionRate: 0.22,
    avgDaysToClose: 62,
    firmAvgDaysToClose: 75,
  };
}

// =============================================================================
// Engagement Metrics
// =============================================================================

/**
 * Computes engagement metrics for an advisor including contact frequency
 * heatmap data segmented by AUM tier.
 *
 * @param advisorId - The advisor to compute engagement for
 * @returns Engagement metrics with tier-level contact frequency data
 */
export function computeEngagementMetrics(advisorId: AdvisorId): EngagementMetrics {
  const data = DEMO_ENGAGEMENT[advisorId];

  if (!data) {
    return {
      contactFrequency: [],
      clientsContactedLast90d: { count: 0, pct: 0 },
      clientsNotContactedLast90d: { byAumTier: [] },
      portalEngagement: {
        active: { count: 0, pct: 0 },
        inactive: { count: 0, pct: 0 },
        dormant: { count: 0, pct: 0 },
      },
    };
  }

  // Build monthly contact frequency time series (last 6 months, demo data)
  const contactFrequency: ContactFrequency[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = d.toISOString().split('T')[0];
    const factor = 0.8 + Math.random() * 0.4; // Slight monthly variation
    contactFrequency.push({
      date: dateStr,
      calls: Math.round((data.totalCallsLast90Days / 3) * factor),
      meetings: Math.round((data.totalMeetingsLast90Days / 3) * factor),
      emails: Math.round((data.totalEmailsLast90Days / 3) * factor),
      portalMessages: Math.round(15 * factor),
      total: Math.round(
        ((data.totalCallsLast90Days + data.totalMeetingsLast90Days + data.totalEmailsLast90Days) / 3 + 15) * factor,
      ),
    });
  }

  // Compute clients contacted and not contacted
  const tiers: WealthTier[] = ['uhnw', 'hnw', 'mass_affluent', 'emerging'];
  const totalClients = 120; // demo approximation
  const contactedCount = Math.round(totalClients * 0.78);

  const notContactedByTier: Array<{ tier: string; count: number; urgency: ActionUrgency }> = [];
  for (const tier of tiers) {
    const tierData = data.contactFrequencyByTier[tier];
    if (tierData.compliance < 90) {
      const tierCount = Math.round((100 - tierData.compliance) * 0.3);
      const urgency: ActionUrgency = tierData.compliance < 60 ? 'URGENT' : tierData.compliance < 75 ? 'HIGH' : 'NORMAL';
      notContactedByTier.push({
        tier: tier.replace('_', ' ').toUpperCase(),
        count: tierCount,
        urgency,
      });
    }
  }

  return {
    contactFrequency,
    clientsContactedLast90d: {
      count: contactedCount,
      pct: Math.round((contactedCount / totalClients) * 1000) / 10,
    },
    clientsNotContactedLast90d: {
      byAumTier: notContactedByTier,
    },
    portalEngagement: {
      active: { count: Math.round(totalClients * 0.52), pct: 52 },
      inactive: { count: Math.round(totalClients * 0.28), pct: 28 },
      dormant: { count: Math.round(totalClients * 0.20), pct: 20 },
    },
  };
}

// =============================================================================
// Planning Quality
// =============================================================================

/** Planning quality demo data by advisor. */
const DEMO_PLANNING_QUALITY: Record<string, {
  totalPlans: number;
  activePlans: number;
  stalePlans: number;
  missingDataPlans: number;
  noGoalPlans: number;
  avgPlanAge: number;
  avgGoalsPerPlan: number;
  planSuccessRate: number;
  healthDistribution: { excellent: number; good: number; needsAttention: number; atRisk: number; critical: number };
}> = {
  'adv-001': { totalPlans: 198, activePlans: 188, stalePlans: 6, missingDataPlans: 3, noGoalPlans: 6, avgPlanAge: 14.2, avgGoalsPerPlan: 4.8, planSuccessRate: 87, healthDistribution: { excellent: 98, good: 62, needsAttention: 24, atRisk: 10, critical: 4 } },
  'adv-002': { totalPlans: 142, activePlans: 128, stalePlans: 11, missingDataPlans: 8, noGoalPlans: 11, avgPlanAge: 11.8, avgGoalsPerPlan: 3.9, planSuccessRate: 79, healthDistribution: { excellent: 52, good: 48, needsAttention: 26, atRisk: 12, critical: 4 } },
  'adv-003': { totalPlans: 185, activePlans: 180, stalePlans: 2, missingDataPlans: 1, noGoalPlans: 2, avgPlanAge: 16.4, avgGoalsPerPlan: 5.2, planSuccessRate: 91, healthDistribution: { excellent: 112, good: 48, needsAttention: 16, atRisk: 6, critical: 3 } },
  'adv-004': { totalPlans: 74, activePlans: 64, stalePlans: 8, missingDataPlans: 6, noGoalPlans: 8, avgPlanAge: 6.2, avgGoalsPerPlan: 3.4, planSuccessRate: 72, healthDistribution: { excellent: 18, good: 24, needsAttention: 18, atRisk: 10, critical: 4 } },
  'adv-005': { totalPlans: 178, activePlans: 156, stalePlans: 20, missingDataPlans: 14, noGoalPlans: 20, avgPlanAge: 22.6, avgGoalsPerPlan: 3.6, planSuccessRate: 74, healthDistribution: { excellent: 48, good: 58, needsAttention: 38, atRisk: 24, critical: 10 } },
};

/**
 * Computes planning quality metrics for an advisor including plan health
 * distribution, stale plans, missing data, and goal coverage.
 *
 * @param advisorId - The advisor to compute planning quality for
 * @returns Planning quality metrics with distribution data
 */
export function computePlanningQuality(advisorId: AdvisorId): PlanningQualityMetrics {
  const data = DEMO_PLANNING_QUALITY[advisorId];
  if (!data) {
    return {
      distribution: {
        onTrack: { count: 0, pct: 0 },
        watch: { count: 0, pct: 0 },
        atRisk: { count: 0, pct: 0 },
        critical: { count: 0, pct: 0 },
      },
      stalePlans: 0,
      plansMissingData: 0,
      plansWithNoGoals: 0,
    };
  }

  // Map demo health distribution to canonical PlanQualityDistribution
  // onTrack = excellent + good, watch = needsAttention, atRisk = atRisk, critical = critical
  const total =
    data.healthDistribution.excellent +
    data.healthDistribution.good +
    data.healthDistribution.needsAttention +
    data.healthDistribution.atRisk +
    data.healthDistribution.critical;

  const onTrackCount = data.healthDistribution.excellent + data.healthDistribution.good;
  const watchCount = data.healthDistribution.needsAttention;
  const atRiskCount = data.healthDistribution.atRisk;
  const criticalCount = data.healthDistribution.critical;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

  const distribution: PlanQualityDistribution = {
    onTrack: { count: onTrackCount, pct: pct(onTrackCount) },
    watch: { count: watchCount, pct: pct(watchCount) },
    atRisk: { count: atRiskCount, pct: pct(atRiskCount) },
    critical: { count: criticalCount, pct: pct(criticalCount) },
  };

  return {
    distribution,
    stalePlans: data.stalePlans,
    plansMissingData: data.missingDataPlans,
    plansWithNoGoals: data.noGoalPlans,
  };
}
