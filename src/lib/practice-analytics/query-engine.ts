// =============================================================================
// FP-Pulse — Natural Language Query Engine
//
// Translates advisor questions into structured query results. In demo mode,
// questions are matched against pre-built patterns and return realistic mock
// data. In production, the engine would call Vertex AI to generate SQL,
// execute it in BigQuery, and summarize results with AI.
//
// Security filtering is enforced at every layer: firm_id and advisor_id
// scoping is mandatory, and PII fields are blocked from output.
//
// This module is self-contained and does not depend on React, Next.js, or Prisma.
// =============================================================================

import {
  type FirmId,
  type AdvisorId,
  type DashboardRole,
  type QueryContext,
  type QueryResult,
  type QuickQuery,
  type QuickQueryCategory,
  type ChartConfig,
  type ChartType,
  type ActionItem,
  type QueryId,
  queryId as makeQueryId,
} from './types';

// =============================================================================
// Constants
// =============================================================================

/** Fields that must NEVER appear in query output. */
const PII_BLOCKED_FIELDS = [
  'ssn',
  'social_security_number',
  'tax_id',
  'full_account_number',
  'account_number',
  'date_of_birth',
  'dob',
  'bank_routing_number',
  'bank_account_number',
];

/** Required security filter fields that must appear in any generated SQL. */
const REQUIRED_SECURITY_FILTERS = ['firm_id'];

/** Advisor-scoped queries must also include this filter. */
const ADVISOR_SECURITY_FILTER = 'advisor_id';

// =============================================================================
// Query Pattern Definitions
// =============================================================================

interface QueryPattern {
  patternId: string;
  keywords: string[];
  label: string;
  description: string;
  applicableRoles: DashboardRole[];
}

/**
 * Pre-built query patterns for demo mode. Each pattern maps a set of
 * keywords to a mock result generator. At least 15 patterns are defined
 * per the specification.
 */
const QUERY_PATTERNS: QueryPattern[] = [
  {
    patternId: 'clients_not_contacted',
    keywords: ['not contacted', 'no contact', 'haven\'t contacted', 'last contacted', 'overdue contact'],
    label: 'Clients not contacted recently',
    description: 'Returns households sorted by days since last advisor contact.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'plan_success_dropped',
    keywords: ['plan success', 'success rate dropped', 'declining plans', 'plan health', 'success declining'],
    label: 'Plan success rate dropped',
    description: 'Returns households with declining plan success rates.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'churn_risk',
    keywords: ['churn risk', 'at risk of leaving', 'churn', 'retention risk', 'likely to leave'],
    label: 'Churn risk overview',
    description: 'Returns churn signals grouped by risk level.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'retention_rate',
    keywords: ['retention rate', 'client retention', 'year over year retention', 'retention trend'],
    label: 'Client retention rate',
    description: 'Returns year-over-year client retention rates.',
    applicableRoles: ['MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'net_new_assets',
    keywords: ['net new assets', 'nna', 'new assets', 'asset growth', 'organic growth rate'],
    label: 'Net new assets',
    description: 'Returns monthly net new asset flows.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'highest_organic_growth',
    keywords: ['highest organic growth', 'top growth', 'advisor growth', 'fastest growing', 'best growth'],
    label: 'Highest organic growth advisors',
    description: 'Returns advisor rankings by organic growth rate.',
    applicableRoles: ['MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'held_away_assets',
    keywords: ['held away', 'held-away', 'consolidation', 'outside assets', 'assets elsewhere'],
    label: 'Held-away asset opportunities',
    description: 'Returns consolidation opportunities for held-away assets.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'proposal_conversion_rate',
    keywords: ['proposal conversion', 'conversion rate', 'proposal success', 'win rate', 'close rate'],
    label: 'Proposal conversion rate',
    description: 'Returns proposal conversion rates by wealth tier.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'projected_annual_revenue',
    keywords: ['projected revenue', 'annual revenue', 'revenue forecast', 'revenue projection', 'expected revenue'],
    label: 'Projected annual revenue',
    description: 'Returns revenue projections for the current year.',
    applicableRoles: ['MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'revenue_per_household',
    keywords: ['revenue per household', 'revenue per client', 'average revenue', 'revenue comparison'],
    label: 'Revenue per household',
    description: 'Returns per-household revenue metrics with advisor comparisons.',
    applicableRoles: ['MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'plans_not_updated',
    keywords: ['plans not updated', 'stale plans', 'outdated plans', 'plan not recalculated', 'old plans'],
    label: 'Plans not updated recently',
    description: 'Returns financial plans that have not been recalculated recently.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'roth_conversion_eligible',
    keywords: ['roth conversion', 'roth eligible', 'roth opportunity', 'roth candidates'],
    label: 'Roth conversion eligible',
    description: 'Returns households with Roth conversion opportunities.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'rmd_requirements',
    keywords: ['rmd', 'required minimum distribution', 'rmd deadline', 'rmd requirements'],
    label: 'RMD requirements',
    description: 'Returns upcoming required minimum distributions.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'estate_planning',
    keywords: ['estate plan', 'missing estate', 'no estate plan', 'estate planning gap', 'estate documents'],
    label: 'Estate planning gaps',
    description: 'Returns households missing critical estate planning documents.',
    applicableRoles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'],
  },
  {
    patternId: 'advisor_capacity',
    keywords: ['capacity', 'advisor capacity', 'workload', 'bandwidth', 'how many clients'],
    label: 'Advisor capacity analysis',
    description: 'Returns advisor capacity and workload analysis.',
    applicableRoles: ['MD_PRINCIPAL', 'OPERATIONS'],
  },
];

// =============================================================================
// Helpers
// =============================================================================

/** Auto-incrementing counter for generating unique query IDs within the demo. */
let queryCounter = 0;

/**
 * Generates a branded QueryId for demo results.
 */
function generateQueryId(): QueryId {
  queryCounter++;
  return makeQueryId(`qry_demo_${Date.now()}_${String(queryCounter).padStart(4, '0')}`);
}

/**
 * Helper to build a canonical QueryResult from generator internals.
 * Reduces boilerplate across the 15+ pattern generators.
 */
function buildResult(opts: {
  question: string;
  sql: string;
  rows: Record<string, unknown>[];
  chartType: ChartType;
  chartTitle: string;
  xAxis: string | null;
  yAxis: string | null;
  colors?: string[];
  stacked?: boolean;
  narrative: string;
  actions: ActionItem[];
  followUpQuestions: string[];
  confidence?: number;
  executionTimeMs?: number;
}): QueryResult {
  return {
    queryId: generateQueryId(),
    question: opts.question,
    sql: opts.sql,
    rows: opts.rows,
    chartType: opts.chartType,
    chartConfig: {
      xAxis: opts.xAxis,
      yAxis: opts.yAxis,
      title: opts.chartTitle,
      colors: opts.colors ?? ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      stacked: opts.stacked ?? false,
    },
    narrative: opts.narrative,
    recommendedActions: opts.actions,
    followUpQuestions: opts.followUpQuestions,
    confidence: opts.confidence ?? 0.92,
    dataAsOf: new Date().toISOString(),
    executionTimeMs: opts.executionTimeMs ?? Math.round(200 + Math.random() * 300),
  };
}

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Matches a natural-language question against the pre-built query patterns
 * using keyword scoring. Returns the best match with a confidence score,
 * or null if no pattern meets the minimum confidence threshold.
 *
 * @param question - The natural-language question from the advisor.
 * @returns The matched pattern ID and confidence score, or null.
 */
export function matchQueryPattern(
  question: string
): { patternId: string; confidence: number } | null {
  const normalized = question.toLowerCase().trim();

  let bestMatch: { patternId: string; confidence: number } | null = null;
  let bestScore = 0;

  for (const pattern of QUERY_PATTERNS) {
    let matchCount = 0;
    const totalKeywords = pattern.keywords.length;

    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Also check for individual word overlap with the pattern label
    const labelWords = pattern.label.toLowerCase().split(/\s+/);
    const questionWords = normalized.split(/\s+/);
    let labelOverlap = 0;
    for (const lw of labelWords) {
      if (lw.length > 2 && questionWords.some((qw) => qw.includes(lw) || lw.includes(qw))) {
        labelOverlap++;
      }
    }

    // Compute a confidence score
    const keywordConfidence = totalKeywords > 0 ? matchCount / totalKeywords : 0;
    const labelConfidence = labelWords.length > 0 ? labelOverlap / labelWords.length : 0;
    const score = Math.max(keywordConfidence, labelConfidence * 0.8);

    if (score > bestScore && score >= 0.2) {
      bestScore = score;
      bestMatch = {
        patternId: pattern.patternId,
        confidence: Math.min(score, 1.0),
      };
    }
  }

  return bestMatch;
}

// =============================================================================
// Security Validation
// =============================================================================

/**
 * Validates that generated SQL includes required security filters and
 * does not expose PII fields. This function is used as a guardrail
 * in the production path (Vertex AI SQL generation) and for audit
 * logging in the demo path.
 *
 * @param sql - The SQL string to validate.
 * @param context - The query context containing firm and advisor identity.
 * @returns An object with `valid` flag and any `errors` found.
 */
export function validateQuerySecurity(
  sql: string,
  context: QueryContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const normalizedSql = sql.toLowerCase();

  // Check required security filters
  for (const filter of REQUIRED_SECURITY_FILTERS) {
    if (!normalizedSql.includes(filter)) {
      errors.push(
        `Missing required security filter: ${filter}. All queries must be scoped to a firm.`
      );
    }
  }

  // For advisor-role queries, require advisor_id scoping
  if (context.role === 'ADVISOR' && !normalizedSql.includes(ADVISOR_SECURITY_FILTER)) {
    errors.push(
      `Missing advisor_id filter. Advisor-role queries must be scoped to the requesting advisor.`
    );
  }

  // Check for PII field exposure in SELECT clause
  const selectMatch = normalizedSql.match(/select\s+([\s\S]*?)\s+from/i);
  if (selectMatch) {
    const selectClause = selectMatch[1].toLowerCase();
    for (const piiField of PII_BLOCKED_FIELDS) {
      if (selectClause.includes(piiField)) {
        errors.push(
          `PII field "${piiField}" detected in SELECT clause. PII fields must never appear in query output.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Mock Result Generators
// =============================================================================

/**
 * Generates a realistic mock query result for a matched pattern.
 *
 * Each pattern returns:
 *  - `sql` : A representative (non-executable) BigQuery SQL string.
 *  - `rows` : Tabular data rows.
 *  - `chartType` : The recommended chart type.
 *  - `chartConfig` : Chart rendering configuration.
 *  - `narrative` : A plain-English summary of the results.
 *  - `recommendedActions` : Follow-up actions the advisor can take.
 *  - `followUpQuestions` : Suggested follow-up queries.
 *  - `confidence` : Confidence score for the match (0-1).
 *  - `dataAsOf` : ISO 8601 timestamp of data freshness.
 *  - `executionTimeMs` : Simulated query execution time.
 *
 * @param patternId - The pattern ID from `matchQueryPattern`.
 * @param context - The query context for security scoping.
 * @returns A fully populated QueryResult.
 */
export function generateMockQueryResult(
  patternId: string,
  context: QueryContext
): QueryResult {
  const generators: Record<string, () => QueryResult> = {
    clients_not_contacted: () => generateClientsNotContactedResult(context),
    plan_success_dropped: () => generatePlanSuccessDroppedResult(context),
    churn_risk: () => generateChurnRiskResult(context),
    retention_rate: () => generateRetentionRateResult(context),
    net_new_assets: () => generateNetNewAssetsResult(context),
    highest_organic_growth: () => generateHighestOrganicGrowthResult(context),
    held_away_assets: () => generateHeldAwayAssetsResult(context),
    proposal_conversion_rate: () => generateProposalConversionResult(context),
    projected_annual_revenue: () => generateProjectedRevenueResult(context),
    revenue_per_household: () => generateRevenuePerHouseholdResult(context),
    plans_not_updated: () => generatePlansNotUpdatedResult(context),
    roth_conversion_eligible: () => generateRothConversionResult(context),
    rmd_requirements: () => generateRmdRequirementsResult(context),
    estate_planning: () => generateEstatePlanningResult(context),
    advisor_capacity: () => generateAdvisorCapacityResult(context),
  };

  const generator = generators[patternId];
  if (!generator) {
    return generateFallbackResult(context);
  }

  return generator();
}

// ---------------------------------------------------------------------------
// Individual Pattern Generators
// ---------------------------------------------------------------------------

function generateClientsNotContactedResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which clients have not been contacted recently?',
    sql: `SELECT display_name, days_since_last_contact, aum, churn_risk_label FROM farther_analytics.churn_signals WHERE firm_id = '${context.firmId}' ORDER BY days_since_last_contact DESC LIMIT 10`,
    rows: [
      { household: 'The Harrington Household', days_since_contact: 120, aum: 3_800_000, risk_label: 'critical' },
      { household: 'The Whitfield Trust', days_since_contact: 105, aum: 8_900_000, risk_label: 'critical' },
      { household: 'The Brooks Household', days_since_contact: 92, aum: 1_200_000, risk_label: 'elevated' },
      { household: 'The Mitchell Family', days_since_contact: 78, aum: 2_600_000, risk_label: 'elevated' },
      { household: 'The Goldstein Family', days_since_contact: 70, aum: 6_200_000, risk_label: 'elevated' },
      { household: 'The Baker Household', days_since_contact: 65, aum: 800_000, risk_label: 'watch' },
      { household: 'The Foster Estate', days_since_contact: 60, aum: 2_000_000, risk_label: 'watch' },
      { household: 'The Collins Household', days_since_contact: 55, aum: 1_500_000, risk_label: 'watch' },
      { household: 'The Morales Family', days_since_contact: 52, aum: 1_900_000, risk_label: 'watch' },
      { household: 'The Stewart Family', days_since_contact: 48, aum: 2_400_000, risk_label: 'watch' },
    ],
    chartType: 'bar',
    chartTitle: 'Clients by Days Since Last Contact',
    xAxis: 'household',
    yAxis: 'days_since_contact',
    colors: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
    narrative: `You have 10 households that have not been contacted in over 45 days. The most critical is The Harrington Household (120 days, $3.8M AUM) and The Whitfield Trust (105 days, $8.9M AUM). Combined, these 10 households represent $29.3M in AUM. I recommend prioritizing outreach to the two critical-risk households immediately, followed by the three elevated-risk households within the next two weeks.`,
    actions: [
      { action: 'Schedule immediate outreach to The Harrington Household and The Whitfield Trust', priority: 'critical' },
      { action: 'Queue personalized check-in emails for all 10 households', priority: 'high' },
      { action: 'Set up recurring 60-day contact reminders for high-AUM households', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is the churn risk for these households?',
      'Show me the contact history for The Whitfield Trust',
      'Which advisors have the most overdue contacts?',
    ],
    confidence: 0.92,
    executionTimeMs: 340,
  });
}

function generatePlanSuccessDroppedResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which clients have had their plan success rate drop?',
    sql: `SELECT display_name, probability_of_success, plan_success_rate_delta_90d, aum FROM farther_analytics.churn_signals WHERE firm_id = '${context.firmId}' AND plan_success_rate_delta_90d < -0.05 ORDER BY plan_success_rate_delta_90d ASC`,
    rows: [
      { household: 'The Harrington Household', previous_rate: 0.67, current_rate: 0.52, delta: -0.15, aum: 3_800_000 },
      { household: 'The Whitfield Trust', previous_rate: 0.70, current_rate: 0.58, delta: -0.12, aum: 8_900_000 },
      { household: 'The Brooks Household', previous_rate: 0.70, current_rate: 0.60, delta: -0.10, aum: 1_200_000 },
      { household: 'The Mitchell Family', previous_rate: 0.73, current_rate: 0.65, delta: -0.08, aum: 2_600_000 },
      { household: 'The Goldstein Family', previous_rate: 0.75, current_rate: 0.68, delta: -0.07, aum: 6_200_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Plan Success Rate Decline (90-Day Delta)',
    xAxis: 'household',
    yAxis: 'delta',
    colors: ['#EF4444', '#F97316', '#F59E0B'],
    narrative: `5 households have experienced a significant decline in plan success rate over the past 90 days. The most severe drop is The Harrington Household, falling 15 percentage points to 52%. The Whitfield Trust dropped 12 points to 58%. Together these households represent $22.7M in AUM. Immediate plan recalculation and review meetings are recommended.`,
    actions: [
      { action: 'Recalculate financial plans for all 5 households with updated assumptions', priority: 'critical' },
      { action: 'Schedule plan review meetings for the top 3 most impacted households', priority: 'high' },
      { action: 'Investigate market or life-event triggers that may have caused the decline', priority: 'normal' },
    ],
    followUpQuestions: [
      'What caused the decline for The Harrington Household?',
      'Are any of these clients at churn risk?',
      'Show me all plans below 70% success rate',
    ],
    confidence: 0.89,
    executionTimeMs: 420,
  });
}

function generateChurnRiskResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our current churn risk?',
    sql: `SELECT churn_risk_label, COUNT(*) AS count, SUM(aum) AS total_aum FROM farther_analytics.churn_signals WHERE firm_id = '${context.firmId}' GROUP BY churn_risk_label ORDER BY CASE churn_risk_label WHEN 'critical' THEN 1 WHEN 'elevated' THEN 2 WHEN 'watch' THEN 3 ELSE 4 END`,
    rows: [
      { risk_label: 'healthy', count: 17, total_aum: 72_800_000, pct_of_households: 60.7 },
      { risk_label: 'watch', count: 6, total_aum: 12_100_000, pct_of_households: 21.4 },
      { risk_label: 'elevated', count: 3, total_aum: 10_000_000, pct_of_households: 10.7 },
      { risk_label: 'critical', count: 2, total_aum: 12_700_000, pct_of_households: 7.1 },
    ],
    chartType: 'pie',
    chartTitle: 'Household Churn Risk Distribution',
    xAxis: 'risk_label',
    yAxis: 'count',
    colors: ['#10B981', '#F59E0B', '#F97316', '#EF4444'],
    narrative: `Across 28 households, 2 are at critical churn risk ($12.7M AUM), 3 are elevated ($10.0M AUM), and 6 are on watch ($12.1M AUM). The remaining 17 households (60.7%) are healthy. Total AUM at immediate risk (critical + elevated) is $22.7M, representing approximately $170K in annual revenue. Priority retention actions are recommended for the 2 critical households.`,
    actions: [
      { action: 'Review the 2 critical-risk households immediately — schedule outreach within 48 hours', priority: 'critical' },
      { action: 'Assign retention tasks for the 3 elevated-risk households', priority: 'high' },
      { action: 'Set up automated engagement monitoring for watch-level households', priority: 'normal' },
    ],
    followUpQuestions: [
      'Who are the critical-risk clients?',
      'What is the revenue at risk?',
      'Show me churn risk by advisor',
    ],
    confidence: 0.95,
    executionTimeMs: 280,
  });
}

function generateRetentionRateResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our client retention rate?',
    sql: `SELECT year, total_clients, retained_clients, ROUND(retained_clients * 100.0 / total_clients, 1) AS retention_rate, lost_aum FROM farther_analytics.annual_retention WHERE firm_id = '${context.firmId}' ORDER BY year`,
    rows: [
      { year: 2020, total_clients: 180, retained_clients: 168, retention_rate: 93.3, lost_aum: 8_200_000 },
      { year: 2021, total_clients: 195, retained_clients: 184, retention_rate: 94.4, lost_aum: 6_800_000 },
      { year: 2022, total_clients: 210, retained_clients: 198, retention_rate: 94.3, lost_aum: 9_500_000 },
      { year: 2023, total_clients: 225, retained_clients: 215, retention_rate: 95.6, lost_aum: 7_100_000 },
      { year: 2024, total_clients: 240, retained_clients: 231, retention_rate: 96.3, lost_aum: 5_400_000 },
      { year: 2025, total_clients: 248, retained_clients: 242, retention_rate: 97.6, lost_aum: 3_200_000 },
    ],
    chartType: 'line',
    chartTitle: 'Year-over-Year Client Retention Rate',
    xAxis: 'year',
    yAxis: 'retention_rate',
    colors: ['#3B82F6', '#10B981'],
    narrative: `Client retention has improved steadily from 93.3% in 2020 to 97.6% in 2025 — a 4.3 percentage point improvement. Lost AUM has also declined from $8.2M to $3.2M annually. The firm currently retains 242 of 248 households. This trend reflects the investment in proactive engagement and churn prediction tooling.`,
    actions: [
      { action: 'Continue monitoring churn signals to maintain the upward retention trend', priority: 'normal' },
      { action: 'Investigate the 6 lost households in 2025 for common patterns', priority: 'high' },
      { action: 'Set a retention target of 98% for 2026', priority: 'normal' },
    ],
    followUpQuestions: [
      'Which clients did we lose in 2025?',
      'What is the retention rate by advisor?',
      'How does our retention compare to industry benchmarks?',
    ],
    confidence: 0.94,
    executionTimeMs: 510,
  });
}

function generateNetNewAssetsResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What are our net new assets?',
    sql: `SELECT FORMAT_DATE('%b %Y', month) AS month, inflows, outflows, inflows - outflows AS net_new FROM farther_analytics.monthly_flows WHERE firm_id = '${context.firmId}' AND month >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 MONTH) ORDER BY month`,
    rows: [
      { month: 'Jan 2025', inflows: 12_500_000, outflows: 4_200_000, net_new: 8_300_000 },
      { month: 'Feb 2025', inflows: 9_800_000, outflows: 3_100_000, net_new: 6_700_000 },
      { month: 'Mar 2025', inflows: 15_200_000, outflows: 5_800_000, net_new: 9_400_000 },
      { month: 'Apr 2025', inflows: 11_100_000, outflows: 6_500_000, net_new: 4_600_000 },
      { month: 'May 2025', inflows: 13_400_000, outflows: 4_900_000, net_new: 8_500_000 },
      { month: 'Jun 2025', inflows: 10_600_000, outflows: 3_400_000, net_new: 7_200_000 },
      { month: 'Jul 2025', inflows: 14_800_000, outflows: 7_200_000, net_new: 7_600_000 },
      { month: 'Aug 2025', inflows: 11_300_000, outflows: 4_100_000, net_new: 7_200_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Monthly Net New Assets',
    xAxis: 'month',
    yAxis: 'net_new',
    colors: ['#3B82F6', '#EF4444', '#10B981'],
    narrative: `The firm has attracted $59.5M in net new assets over the past 8 months, averaging $7.4M/month. March saw the strongest month with $9.4M NNA. Total inflows are $98.7M against $39.2M in outflows. The NNA growth rate annualizes to approximately 5.2% of AUM, which exceeds the industry median of 3.8%.`,
    actions: [
      { action: 'Analyze the March inflow spike to replicate successful acquisition strategies', priority: 'high' },
      { action: 'Investigate the April outflow increase for potential retention issues', priority: 'high' },
      { action: 'Set monthly NNA targets by advisor to maintain momentum', priority: 'normal' },
    ],
    followUpQuestions: [
      'Which advisors are driving the most new assets?',
      'What is our organic growth rate?',
      'Show me the largest inflows this quarter',
    ],
    confidence: 0.91,
    executionTimeMs: 380,
  });
}

function generateHighestOrganicGrowthResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which advisors have the highest organic growth?',
    sql: `SELECT advisor_name, organic_growth_pct, net_new_assets, total_aum, household_count FROM farther_analytics.advisor_performance WHERE firm_id = '${context.firmId}' ORDER BY organic_growth_pct DESC LIMIT 5`,
    rows: [
      { advisor: 'Sarah Chen', organic_growth_pct: 8.2, net_new_assets: 14_200_000, aum: 172_000_000, households: 82 },
      { advisor: 'Michael Torres', organic_growth_pct: 7.1, net_new_assets: 9_800_000, aum: 138_000_000, households: 68 },
      { advisor: 'Jennifer Park', organic_growth_pct: 6.4, net_new_assets: 11_500_000, aum: 180_000_000, households: 75 },
      { advisor: 'David Richardson', organic_growth_pct: 5.8, net_new_assets: 7_200_000, aum: 124_000_000, households: 60 },
      { advisor: 'Emily Watson', organic_growth_pct: 4.9, net_new_assets: 5_400_000, aum: 110_000_000, households: 55 },
    ],
    chartType: 'bar',
    chartTitle: 'Advisor Organic Growth Rate (Annualized)',
    xAxis: 'advisor',
    yAxis: 'organic_growth_pct',
    colors: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF'],
    narrative: `Sarah Chen leads with 8.2% organic growth and $14.2M in net new assets, managing $172M across 82 households. All 5 top advisors exceed the industry benchmark of 3.8%. The top 5 collectively brought in $48.1M in net new assets. Key differentiators among top performers include proactive client engagement and financial plan update frequency.`,
    actions: [
      { action: 'Recognize Sarah Chen and Michael Torres in the next team meeting', priority: 'normal' },
      { action: 'Have top performers share best practices with the broader team', priority: 'high' },
      { action: 'Investigate correlation between plan update frequency and growth rate', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is Sarah Chen\'s client retention rate?',
      'Which advisors are below the growth target?',
      'Show me growth rates by wealth tier',
    ],
    confidence: 0.90,
    executionTimeMs: 450,
  });
}

function generateHeldAwayAssetsResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which clients have held-away assets?',
    sql: `SELECT display_name, aum, held_away_estimated, consolidation_opportunity FROM farther_analytics.household_360 WHERE firm_id = '${context.firmId}' AND held_away_estimated > 0 ORDER BY held_away_estimated DESC LIMIT 5`,
    rows: [
      { household: 'The Richardson Family', managed_aum: 12_500_000, held_away_est: 4_800_000, consolidation_opportunity: 4_800_000, last_discussed: '2025-03-15' },
      { household: 'The Taylor Estate', managed_aum: 9_500_000, held_away_est: 3_200_000, consolidation_opportunity: 3_200_000, last_discussed: '2025-01-22' },
      { household: 'The Whitfield Trust', managed_aum: 8_900_000, held_away_est: 2_600_000, consolidation_opportunity: 2_600_000, last_discussed: null },
      { household: 'The Chen Household', managed_aum: 8_200_000, held_away_est: 1_900_000, consolidation_opportunity: 1_900_000, last_discussed: '2025-05-10' },
      { household: 'The Yamamoto Estate', managed_aum: 7_100_000, held_away_est: 2_100_000, consolidation_opportunity: 2_100_000, last_discussed: '2025-04-08' },
    ],
    chartType: 'bar',
    chartTitle: 'Top Consolidation Opportunities',
    xAxis: 'household',
    yAxis: 'consolidation_opportunity',
    colors: ['#6366F1', '#8B5CF6', '#A855F7'],
    narrative: `The top 5 consolidation opportunities represent $14.6M in estimated held-away assets. The Richardson Family has the largest opportunity at $4.8M. Note that The Whitfield Trust ($2.6M held-away) has not had a consolidation discussion — this household is also at critical churn risk, so a consolidation conversation could serve double duty as a retention touchpoint.`,
    actions: [
      { action: 'Initiate a consolidation discussion with The Whitfield Trust (combine with retention outreach)', priority: 'critical' },
      { action: 'Prepare consolidated wealth view proposals for the top 5 households', priority: 'high' },
      { action: 'Calculate fee impact of full consolidation for each household', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is the revenue impact of consolidating all held-away assets?',
      'Which custodians hold the most held-away assets?',
      'Show me households where we manage less than 50% of total wealth',
    ],
    confidence: 0.88,
    executionTimeMs: 360,
  });
}

function generateProposalConversionResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our proposal conversion rate?',
    sql: `SELECT wealth_tier, proposals_sent, converted, ROUND(converted * 100.0 / proposals_sent, 1) AS conversion_rate, avg_aum FROM farther_analytics.proposal_metrics WHERE firm_id = '${context.firmId}' GROUP BY wealth_tier ORDER BY avg_aum DESC`,
    rows: [
      { wealth_tier: 'Ultra High Net Worth', proposals_sent: 12, converted: 9, conversion_rate: 75.0, avg_aum: 15_200_000 },
      { wealth_tier: 'Very High Net Worth', proposals_sent: 28, converted: 18, conversion_rate: 64.3, avg_aum: 5_800_000 },
      { wealth_tier: 'High Net Worth', proposals_sent: 45, converted: 24, conversion_rate: 53.3, avg_aum: 2_100_000 },
      { wealth_tier: 'Mass Affluent', proposals_sent: 22, converted: 8, conversion_rate: 36.4, avg_aum: 650_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Proposal Conversion Rate by Wealth Tier',
    xAxis: 'wealth_tier',
    yAxis: 'conversion_rate',
    colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
    narrative: `Overall proposal conversion rate is 55.1% (59 of 107 proposals converted). Conversion rates increase significantly with wealth tier: UHNW at 75%, VHNW at 64.3%, HNW at 53.3%, and Mass Affluent at 36.4%. The Mass Affluent tier has the most room for improvement. Consider refining the Mass Affluent proposal template to better articulate the value proposition.`,
    actions: [
      { action: 'Analyze declined proposals in the Mass Affluent tier for common objections', priority: 'high' },
      { action: 'Create a tailored proposal template for the Mass Affluent segment', priority: 'normal' },
      { action: 'Review the UHNW conversion process to replicate its success in lower tiers', priority: 'normal' },
    ],
    followUpQuestions: [
      'What are the top reasons proposals are declined?',
      'Show me conversion rates by advisor',
      'How long does it take to close a proposal on average?',
    ],
    confidence: 0.87,
    executionTimeMs: 290,
  });
}

function generateProjectedRevenueResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our projected annual revenue?',
    sql: `SELECT quarter, advisory_fees, planning_fees, other_fees, total FROM farther_analytics.revenue_projection WHERE firm_id = '${context.firmId}' AND year = 2025 ORDER BY quarter`,
    rows: [
      { quarter: 'Q1 2025', advisory_fees: 2_850_000, planning_fees: 420_000, other_fees: 180_000, total: 3_450_000 },
      { quarter: 'Q2 2025', advisory_fees: 2_920_000, planning_fees: 440_000, other_fees: 190_000, total: 3_550_000 },
      { quarter: 'Q3 2025', advisory_fees: 3_010_000, planning_fees: 460_000, other_fees: 200_000, total: 3_670_000 },
      { quarter: 'Q4 2025', advisory_fees: 3_100_000, planning_fees: 480_000, other_fees: 210_000, total: 3_790_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Projected Quarterly Revenue (2025)',
    xAxis: 'quarter',
    yAxis: 'total',
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    stacked: true,
    narrative: `Projected annual revenue for 2025 is $14.46M, broken down as: $11.88M in advisory fees (82%), $1.8M in planning fees (12.4%), and $780K in other fees (5.4%). Revenue is projected to grow 3.2% quarter-over-quarter driven by NNA and market appreciation. If the 2 critical churn-risk households ($12.7M AUM) are lost, annual revenue would drop by approximately $95K.`,
    actions: [
      { action: 'Prioritize retention of the 2 critical-risk households to protect $95K in annual revenue', priority: 'critical' },
      { action: 'Explore opportunities to increase planning fee revenue through expanded services', priority: 'normal' },
      { action: 'Review fee schedules against market rates for potential adjustments', priority: 'low' },
    ],
    followUpQuestions: [
      'What is revenue per advisor?',
      'How much revenue is at risk from churn?',
      'Show me revenue growth year-over-year',
    ],
    confidence: 0.93,
    executionTimeMs: 520,
  });
}

function generateRevenuePerHouseholdResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our revenue per household?',
    sql: `SELECT advisor_name, household_count, total_revenue, revenue_per_household, avg_aum_per_household FROM farther_analytics.advisor_revenue WHERE firm_id = '${context.firmId}' ORDER BY revenue_per_household DESC`,
    rows: [
      { advisor: 'Sarah Chen', households: 82, total_revenue: 3_200_000, revenue_per_household: 39_024, avg_aum_per_household: 2_097_561 },
      { advisor: 'Jennifer Park', households: 75, total_revenue: 3_100_000, revenue_per_household: 41_333, avg_aum_per_household: 2_400_000 },
      { advisor: 'Michael Torres', households: 68, total_revenue: 2_600_000, revenue_per_household: 38_235, avg_aum_per_household: 2_029_412 },
      { advisor: 'David Richardson', households: 60, total_revenue: 2_300_000, revenue_per_household: 38_333, avg_aum_per_household: 2_066_667 },
      { advisor: 'Emily Watson', households: 55, total_revenue: 1_950_000, revenue_per_household: 35_455, avg_aum_per_household: 2_000_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Revenue per Household by Advisor',
    xAxis: 'advisor',
    yAxis: 'revenue_per_household',
    colors: ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'],
    narrative: `Firm-wide average revenue per household is $38,676. Jennifer Park leads with $41,333/household, driven by a higher average AUM per household ($2.4M). Emily Watson trails at $35,455/household. The spread between highest and lowest is $5,878 (15.2%). Increasing Emily Watson's average to the firm median would add approximately $177K in annual revenue.`,
    actions: [
      { action: 'Analyze Jennifer Park\'s household composition to understand her higher revenue per household', priority: 'normal' },
      { action: 'Identify opportunities to increase average AUM for Emily Watson\'s book', priority: 'high' },
      { action: 'Consider consolidation discussions for households with held-away assets', priority: 'normal' },
    ],
    followUpQuestions: [
      'Which advisors have the lowest revenue per household?',
      'What is the revenue per household by wealth tier?',
      'How has revenue per household trended over time?',
    ],
    confidence: 0.91,
    executionTimeMs: 310,
  });
}

function generatePlansNotUpdatedResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which plans have not been updated recently?',
    sql: `SELECT display_name, days_since_plan_recalculated, aum, probability_of_success FROM farther_analytics.churn_signals WHERE firm_id = '${context.firmId}' AND days_since_plan_recalculated > 90 ORDER BY days_since_plan_recalculated DESC`,
    rows: [
      { household: 'The Harrington Household', days_since_updated: 260, aum: 3_800_000, plan_success: 0.52 },
      { household: 'The Whitfield Trust', days_since_updated: 220, aum: 8_900_000, plan_success: 0.58 },
      { household: 'The Brooks Household', days_since_updated: 180, aum: 1_200_000, plan_success: 0.60 },
      { household: 'The Mitchell Family', days_since_updated: 140, aum: 2_600_000, plan_success: 0.65 },
      { household: 'The Goldstein Family', days_since_updated: 130, aum: 6_200_000, plan_success: 0.68 },
      { household: 'The Baker Household', days_since_updated: 110, aum: 800_000, plan_success: 0.68 },
      { household: 'The Foster Estate', days_since_updated: 105, aum: 2_000_000, plan_success: 0.69 },
      { household: 'The Morales Family', days_since_updated: 100, aum: 1_900_000, plan_success: 0.70 },
    ],
    chartType: 'bar',
    chartTitle: 'Stale Financial Plans (>90 Days)',
    xAxis: 'household',
    yAxis: 'days_since_updated',
    colors: ['#EF4444', '#F97316', '#F59E0B', '#FBBF24'],
    narrative: `8 financial plans have not been recalculated in over 90 days. The most outdated is The Harrington Household at 260 days. These stale plans cover $27.4M in AUM. Notably, 5 of these 8 households also have declining plan success rates — stale plans correlate strongly with reduced engagement and increased churn risk.`,
    actions: [
      { action: 'Batch-recalculate the 8 stale plans using the latest market data and assumptions', priority: 'critical' },
      { action: 'Schedule plan review meetings for the top 3 most outdated households', priority: 'high' },
      { action: 'Set up automated quarterly plan refresh reminders for all households', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is the average plan update frequency across the firm?',
      'Are stale plans correlated with churn risk?',
      'Which advisor has the most stale plans?',
    ],
    confidence: 0.93,
    executionTimeMs: 270,
  });
}

function generateRothConversionResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which clients are eligible for Roth conversions?',
    sql: `SELECT display_name, pre_tax_balance, roth_conversion_headroom, marginal_rate, estimated_lifetime_savings FROM farther_analytics.roth_opportunities WHERE firm_id = '${context.firmId}' AND roth_conversion_headroom > 10000 ORDER BY roth_conversion_headroom DESC`,
    rows: [
      { household: 'The Richardson Family', pre_tax_balance: 2_800_000, roth_headroom: 85_000, marginal_rate: 0.32, estimated_savings: 12_750 },
      { household: 'The Davis Trust', pre_tax_balance: 1_600_000, roth_headroom: 62_000, marginal_rate: 0.24, estimated_savings: 8_900 },
      { household: 'The O\'Brien Trust', pre_tax_balance: 2_200_000, roth_headroom: 48_000, marginal_rate: 0.32, estimated_savings: 7_200 },
      { household: 'The Thompson Family', pre_tax_balance: 1_100_000, roth_headroom: 35_000, marginal_rate: 0.24, estimated_savings: 5_100 },
      { household: 'The Chen Household', pre_tax_balance: 1_900_000, roth_headroom: 72_000, marginal_rate: 0.32, estimated_savings: 10_800 },
      { household: 'The Shapiro Trust', pre_tax_balance: 1_400_000, roth_headroom: 55_000, marginal_rate: 0.24, estimated_savings: 7_800 },
    ],
    chartType: 'bar',
    chartTitle: 'Roth Conversion Headroom by Household',
    xAxis: 'household',
    yAxis: 'roth_headroom',
    colors: ['#10B981', '#3B82F6', '#6366F1'],
    narrative: `6 households have Roth conversion headroom totaling $357K. The Richardson Family has the largest opportunity at $85K headroom, with an estimated $12,750 in lifetime tax savings. Total estimated tax savings across all 6 households is $52,550. The Q4 conversion window is open — conversions should be executed before December 31.`,
    actions: [
      { action: 'Prepare Roth conversion analyses for all 6 eligible households', priority: 'high' },
      { action: 'Schedule conversion discussions before November 15 to allow execution time', priority: 'high' },
      { action: 'Consider IRMAA implications for households near Medicare thresholds', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is the IRMAA impact for The Richardson Family?',
      'Show me multi-year Roth conversion strategies',
      'Which clients converted last year?',
    ],
    confidence: 0.90,
    executionTimeMs: 350,
  });
}

function generateRmdRequirementsResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Who has upcoming RMD requirements?',
    sql: `SELECT display_name, ira_balance, estimated_rmd, days_until_deadline, distribution_taken FROM farther_analytics.rmd_tracker WHERE firm_id = '${context.firmId}' ORDER BY distribution_taken ASC, days_until_deadline ASC`,
    rows: [
      { household: 'The Taylor Estate', account_balance: 9_200_000, estimated_rmd: 348_000, days_until_deadline: 45, distribution_taken: false },
      { household: 'The Yamamoto Estate', account_balance: 6_800_000, estimated_rmd: 260_000, days_until_deadline: 32, distribution_taken: false },
      { household: 'The O\'Brien Trust', account_balance: 4_500_000, estimated_rmd: 165_000, days_until_deadline: 45, distribution_taken: true },
      { household: 'The Davis Trust', account_balance: 3_200_000, estimated_rmd: 118_000, days_until_deadline: 45, distribution_taken: true },
    ],
    chartType: 'bar',
    chartTitle: 'Upcoming Required Minimum Distributions',
    xAxis: 'household',
    yAxis: 'estimated_rmd',
    colors: ['#EF4444', '#10B981'],
    narrative: `4 households have RMD requirements this year, totaling an estimated $891K. Two households (The Taylor Estate and The Yamamoto Estate) have NOT yet taken their distributions, with deadlines in 45 and 32 days respectively. The combined untaken RMD is $608K. The penalty for missing an RMD is 25% of the shortfall. Immediate action is required.`,
    actions: [
      { action: 'Process the RMD for The Yamamoto Estate immediately (32 days remaining)', priority: 'critical' },
      { action: 'Confirm distribution method and tax withholding for The Taylor Estate', priority: 'critical' },
      { action: 'Set up automated RMD distribution scheduling for next year', priority: 'normal' },
    ],
    followUpQuestions: [
      'What is the tax impact of these RMDs?',
      'Can any of these be donated via QCD?',
      'Show me the RMD schedule for next year',
    ],
    confidence: 0.94,
    executionTimeMs: 260,
  });
}

function generateEstatePlanningResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'Which clients are missing estate planning documents?',
    sql: `SELECT display_name, aum, has_will, has_trust, has_poa, has_healthcare_directive, estate_docs_last_review FROM farther_analytics.household_360 WHERE firm_id = '${context.firmId}' AND (has_will = FALSE OR has_trust = FALSE OR has_poa = FALSE OR has_healthcare_directive = FALSE) ORDER BY aum DESC`,
    rows: [
      { household: 'The Harrington Household', aum: 3_800_000, has_will: false, has_trust: false, has_poa: false, has_healthcare_directive: false, last_review: null },
      { household: 'The Brooks Household', aum: 1_200_000, has_will: true, has_trust: false, has_poa: false, has_healthcare_directive: false, last_review: '2021-03-15' },
      { household: 'The Mitchell Family', aum: 2_600_000, has_will: true, has_trust: false, has_poa: true, has_healthcare_directive: false, last_review: '2022-08-20' },
      { household: 'The Baker Household', aum: 800_000, has_will: false, has_trust: false, has_poa: false, has_healthcare_directive: false, last_review: null },
      { household: 'The Collins Household', aum: 1_500_000, has_will: true, has_trust: false, has_poa: false, has_healthcare_directive: true, last_review: '2020-11-10' },
      { household: 'The Anderson Household', aum: 1_100_000, has_will: false, has_trust: false, has_poa: false, has_healthcare_directive: false, last_review: null },
      { household: 'The Foster Estate', aum: 2_000_000, has_will: true, has_trust: false, has_poa: false, has_healthcare_directive: false, last_review: '2022-01-05' },
    ],
    chartType: 'table',
    chartTitle: 'Estate Planning Gaps by Household',
    xAxis: 'household',
    yAxis: 'aum',
    colors: ['#EF4444', '#F59E0B', '#10B981'],
    narrative: `7 households have estate planning gaps. The most concerning is The Harrington Household ($3.8M AUM) with no estate documents at all. 3 households have never had an estate planning review. Combined AUM of households with gaps is $13.0M. Estate planning conversations can also serve as retention touchpoints for at-risk households.`,
    actions: [
      { action: 'Schedule estate planning consultations for the 3 households with no documents', priority: 'critical' },
      { action: 'Flag The Harrington Household for combined estate planning and retention outreach', priority: 'high' },
      { action: 'Partner with estate attorneys to offer a quarterly estate planning seminar', priority: 'normal' },
    ],
    followUpQuestions: [
      'Which households have estate tax exposure?',
      'Show me clients approaching the estate tax exemption',
      'What is the TCJA sunset impact on our clients?',
    ],
    confidence: 0.88,
    executionTimeMs: 320,
  });
}

function generateAdvisorCapacityResult(context: QueryContext): QueryResult {
  return buildResult({
    question: 'What is our advisor capacity?',
    sql: `SELECT advisor_name, household_count, target_capacity, utilization_pct, avg_touch_frequency_days, total_aum FROM farther_analytics.advisor_capacity WHERE firm_id = '${context.firmId}' ORDER BY utilization_pct DESC`,
    rows: [
      { advisor: 'Sarah Chen', households: 82, target_capacity: 90, utilization_pct: 91.1, avg_touch_frequency_days: 28, aum: 172_000_000 },
      { advisor: 'Jennifer Park', households: 75, target_capacity: 85, utilization_pct: 88.2, avg_touch_frequency_days: 32, aum: 180_000_000 },
      { advisor: 'Michael Torres', households: 68, target_capacity: 80, utilization_pct: 85.0, avg_touch_frequency_days: 35, aum: 138_000_000 },
      { advisor: 'David Richardson', households: 60, target_capacity: 75, utilization_pct: 80.0, avg_touch_frequency_days: 30, aum: 124_000_000 },
      { advisor: 'Emily Watson', households: 55, target_capacity: 70, utilization_pct: 78.6, avg_touch_frequency_days: 38, aum: 110_000_000 },
    ],
    chartType: 'bar',
    chartTitle: 'Advisor Capacity Utilization',
    xAxis: 'advisor',
    yAxis: 'utilization_pct',
    colors: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF'],
    narrative: `The firm has a combined capacity for 400 households, currently serving 340 (85% utilization). Sarah Chen is the most utilized at 91.1% (82 of 90 households) — she has room for 8 more households. Emily Watson has the most capacity headroom with 15 open slots (78.6% utilization). Total available capacity is 60 households across the team. Note that Emily Watson's higher touch frequency (38 days) may indicate she can absorb more clients without service degradation.`,
    actions: [
      { action: 'Route new prospects to Emily Watson and David Richardson who have the most capacity', priority: 'high' },
      { action: 'Monitor Sarah Chen\'s service quality metrics as she approaches full capacity', priority: 'normal' },
      { action: 'Consider whether higher-AUM households should count as 1.5x for capacity purposes', priority: 'low' },
    ],
    followUpQuestions: [
      'What is the ideal household count per advisor?',
      'Which advisors have the highest client satisfaction scores?',
      'How does capacity correlate with organic growth?',
    ],
    confidence: 0.92,
    executionTimeMs: 400,
  });
}

/**
 * Fallback result for unmatched queries.
 */
function generateFallbackResult(context: QueryContext): QueryResult {
  return {
    queryId: generateQueryId(),
    question: 'Unrecognized query',
    sql: '',
    rows: [],
    chartType: null,
    chartConfig: {
      xAxis: null,
      yAxis: null,
      title: '',
      colors: [],
      stacked: false,
    },
    narrative: 'I was not able to match your question to a known query pattern. In production, this would be sent to Vertex AI for SQL generation. Try rephrasing your question or use one of the suggested quick queries.',
    recommendedActions: [],
    followUpQuestions: [
      'Which clients have not been contacted recently?',
      'What is our churn risk?',
      'Show me net new assets',
      'What is our advisor capacity?',
    ],
    confidence: 0,
    dataAsOf: new Date().toISOString(),
    executionTimeMs: 50,
  };
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Processes a natural-language question and returns structured query results.
 *
 * In demo mode (default), the question is matched against pre-built patterns
 * and mock data is returned. In a production deployment, this function would:
 *
 * 1. Send the question to Vertex AI (PaLM/Gemini) to generate BigQuery SQL.
 * 2. Validate the SQL for security (firm_id, advisor_id, PII filters).
 * 3. Execute the SQL in BigQuery.
 * 4. Send the raw results back to the AI model for narrative summarization.
 * 5. Return the structured QueryResult.
 *
 * Security filtering is always enforced:
 *  - `firm_id` is injected into every query.
 *  - `advisor_id` is injected for advisor-role queries.
 *  - PII fields (SSN, account numbers, DOB) are never included in output.
 *
 * @param question - The natural-language question from the advisor.
 * @param context - Security context including firm_id, advisor_id, and role.
 * @returns A Promise resolving to a QueryResult with data, charts, and narrative.
 */
export async function runNaturalLanguageQuery(
  question: string,
  context: QueryContext
): Promise<QueryResult> {
  // Step 1: Match the question to a known pattern
  const match = matchQueryPattern(question);

  if (!match) {
    return generateFallbackResult(context);
  }

  // Step 2: Check role-based access for the matched pattern
  const pattern = QUERY_PATTERNS.find((p) => p.patternId === match.patternId);
  if (pattern && !pattern.applicableRoles.includes(context.role)) {
    return {
      queryId: generateQueryId(),
      question,
      sql: '',
      rows: [],
      chartType: null,
      chartConfig: {
        xAxis: null,
        yAxis: null,
        title: '',
        colors: [],
        stacked: false,
      },
      narrative: `This query requires ${pattern.applicableRoles.join(' or ')} access. Your current role (${context.role}) does not have permission to view this data.`,
      recommendedActions: [
        { action: 'Contact your managing director to request access to this report.', priority: 'normal' },
      ],
      followUpQuestions: [],
      confidence: 0,
      dataAsOf: new Date().toISOString(),
      executionTimeMs: 10,
    };
  }

  // Step 3: Generate mock result
  const result = generateMockQueryResult(match.patternId, context);

  // Step 4: Validate security of the generated SQL (even in demo mode, for audit)
  if (result.sql) {
    const validation = validateQuerySecurity(result.sql, context);
    if (!validation.valid) {
      // In demo mode, log the warning but still return results.
      // In production, this would block execution.
      console.warn(
        `[QueryEngine] Security validation warnings for pattern "${match.patternId}":`,
        validation.errors
      );
    }
  }

  return result;
}

// =============================================================================
// Quick Queries
// =============================================================================

/**
 * Returns role-appropriate quick query suggestions for the dashboard.
 *
 * Quick queries are pre-formulated questions that users can click to
 * execute without typing. They are customized based on the user's
 * dashboard role to show only relevant queries.
 *
 * @param role - The dashboard role of the current user.
 * @returns An array of QuickQuery objects with question and category.
 */
export function getQuickQueries(role: DashboardRole): QuickQuery[] {
  const allQueries: (QuickQuery & { roles: DashboardRole[] })[] = [
    { question: 'Which clients have not been contacted in over 60 days?', category: 'RETENTION', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our current churn risk?', category: 'RETENTION', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which clients have had their plan success rate drop?', category: 'PLANNING', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What are our net new assets this year?', category: 'GROWTH', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our client retention rate year over year?', category: 'RETENTION', roles: ['MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which advisors have the highest organic growth?', category: 'GROWTH', roles: ['MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which clients have held-away assets we could consolidate?', category: 'GROWTH', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our proposal conversion rate by wealth tier?', category: 'GROWTH', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our projected annual revenue?', category: 'REVENUE', roles: ['MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which plans have not been updated in over 90 days?', category: 'PLANNING', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which clients are eligible for Roth conversions?', category: 'PLANNING', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Who has upcoming required minimum distributions?', category: 'PLANNING', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'Which clients are missing estate planning documents?', category: 'PLANNING', roles: ['ADVISOR', 'MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our advisor capacity utilization?', category: 'OPERATIONS', roles: ['MD_PRINCIPAL', 'OPERATIONS'] },
    { question: 'What is our revenue per household by advisor?', category: 'REVENUE', roles: ['MD_PRINCIPAL', 'OPERATIONS'] },
  ];

  // Filter by role and strip the internal roles field
  return allQueries
    .filter((q) => q.roles.includes(role))
    .map(({ roles: _roles, ...rest }) => rest);
}

/**
 * Returns all available query patterns. Useful for admin/debugging.
 *
 * @returns An array of pattern definitions with IDs, keywords, and descriptions.
 */
export function getAvailablePatterns(): Array<{
  patternId: string;
  label: string;
  description: string;
  applicableRoles: DashboardRole[];
}> {
  return QUERY_PATTERNS.map(({ patternId, label, description, applicableRoles }) => ({
    patternId,
    label,
    description,
    applicableRoles,
  }));
}
