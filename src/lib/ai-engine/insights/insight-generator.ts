// ==================== INSIGHT GENERATOR ====================
// Converts raw plan alerts into ranked, actionable insights for the advisor dashboard.
// Insights are enriched with estimated impact, recommended actions, and UI routing targets.

import type {
  PlanAlert,
  PlanInsight,
  PlanSummary,
  InsightAction,
  InsightType,
  EstimatedImpact,
  AlertCategory,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a deterministic insight ID from alert trigger ID and plan ID. */
function generateInsightId(triggerId: string, planId: string): string {
  // Simple hash-like ID combining plan and trigger for deduplication
  const combined = `${planId}__${triggerId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `insight_${Math.abs(hash).toString(36)}_${triggerId}`;
}

/** Map an alert category to a default insight type. */
function inferInsightType(alert: PlanAlert): InsightType {
  if (alert.severity === 'critical' || alert.severity === 'high') {
    return 'alert';
  }
  if (alert.category === 'opportunity') {
    return 'opportunity';
  }
  if (alert.estimatedImpact > 0 && alert.autoActionAvailable) {
    return 'recommendation';
  }
  return 'alert';
}

/** Map an alert to an estimated impact structure. */
function deriveImpact(alert: PlanAlert): EstimatedImpact {
  if (alert.category === 'tax' || alert.category === 'retirement') {
    return {
      type: 'savings',
      amount: alert.estimatedImpact,
      timeframe: alert.deadline ? 'this year' : 'annual',
    };
  }
  if (alert.category === 'insurance') {
    return {
      type: 'risk_reduction',
      amount: alert.estimatedImpact,
      timeframe: 'lifetime',
    };
  }
  if (alert.category === 'estate') {
    return {
      type: 'cost_avoidance',
      amount: alert.estimatedImpact,
      timeframe: 'estate settlement',
    };
  }
  if (alert.category === 'investment') {
    return {
      type: 'gain',
      amount: alert.estimatedImpact,
      timeframe: 'annual',
    };
  }
  return {
    type: 'savings',
    amount: alert.estimatedImpact,
    timeframe: 'annual',
  };
}

/** Derive actionable buttons/links based on the alert category and trigger. */
function deriveActions(alert: PlanAlert): InsightAction[] {
  const actions: InsightAction[] = [];

  // Category-specific primary actions
  const categoryActionMap: Record<string, InsightAction> = {
    tax: { label: 'Open Tax Planner', type: 'navigate_to_module', target: '/plan/tax' },
    retirement: { label: 'View Retirement Analysis', type: 'navigate_to_module', target: '/plan/retirement' },
    estate: { label: 'Review Estate Plan', type: 'navigate_to_module', target: '/plan/estate' },
    insurance: { label: 'Run Insurance Analysis', type: 'run_analysis', target: 'insurance_needs' },
    investment: { label: 'View Portfolio', type: 'navigate_to_module', target: '/plan/investments' },
    social_security: { label: 'Open SS Optimizer', type: 'navigate_to_module', target: '/plan/social-security' },
    healthcare: { label: 'View IRMAA Analysis', type: 'navigate_to_module', target: '/plan/tax/irmaa' },
    cash_flow: { label: 'View Cash Flow', type: 'navigate_to_module', target: '/plan/cash-flow' },
    compliance: { label: 'View Compliance', type: 'navigate_to_module', target: '/plan/compliance' },
    opportunity: { label: 'View Opportunities', type: 'navigate_to_module', target: '/plan/opportunities' },
  };

  const primaryAction = categoryActionMap[alert.category];
  if (primaryAction) {
    actions.push(primaryAction);
  }

  // Trigger-specific actions
  const triggerActionMap: Record<string, InsightAction[]> = {
    roth_conversion_window: [
      { label: 'Run Roth Optimizer', type: 'run_analysis', target: 'roth_conversion' },
    ],
    irmaa_danger_zone: [
      { label: 'Calculate IRMAA Impact', type: 'run_analysis', target: 'irmaa_calculator' },
    ],
    rmd_approaching: [
      { label: 'Project RMDs', type: 'run_analysis', target: 'rmd_projection' },
    ],
    ss_claim_decision_approaching: [
      { label: 'Compare SS Strategies', type: 'run_analysis', target: 'ss_optimizer' },
    ],
    estate_document_stale: [
      { label: 'Schedule Attorney Meeting', type: 'schedule_meeting', target: 'estate_review' },
    ],
    beneficiary_review_overdue: [
      { label: 'Open Beneficiary Form', type: 'open_form', target: 'beneficiary_review' },
    ],
    success_rate_below_threshold: [
      { label: 'Schedule Plan Review', type: 'schedule_meeting', target: 'plan_review' },
      { label: 'Run What-If Analysis', type: 'run_analysis', target: 'what_if' },
    ],
    insurance_coverage_gap: [
      { label: 'Run Insurance Needs Analysis', type: 'run_analysis', target: 'insurance_needs' },
    ],
  };

  const triggerActions = triggerActionMap[alert.triggerId];
  if (triggerActions) {
    actions.push(...triggerActions);
  }

  return actions;
}

/** Generate a one-sentence summary from the full description. */
function generateSummary(description: string): string {
  // Take the first sentence of the description
  const firstSentence = description.split('. ')[0];
  return firstSentence.endsWith('.') ? firstSentence : firstSentence + '.';
}

// ---------------------------------------------------------------------------
// Impact scoring for ranking
// ---------------------------------------------------------------------------

/** Compute a numeric score for ranking insights by importance. */
function computeImportanceScore(insight: PlanInsight): number {
  // Base score from dollar impact (log scale for large amounts)
  let score = Math.log10(Math.max(1, insight.estimatedImpact.amount)) * 10;

  // Severity multiplier
  const severityMultipliers: Record<string, number> = {
    critical: 5.0,
    high: 3.0,
    medium: 2.0,
    low: 1.0,
    info: 0.5,
  };

  // Derive severity from type
  const typeSeverityMap: Record<string, string> = {
    alert: 'high',
    opportunity: 'medium',
    anomaly: 'high',
    recommendation: 'medium',
    informational: 'low',
  };

  const severity = typeSeverityMap[insight.type] ?? 'medium';
  score *= severityMultipliers[severity] ?? 1.0;

  // Category priority boost (tax and retirement are more urgent)
  const categoryBoost: Record<string, number> = {
    tax: 1.3,
    retirement: 1.3,
    social_security: 1.2,
    healthcare: 1.2,
    insurance: 1.1,
    estate: 1.0,
    investment: 1.0,
    cash_flow: 0.9,
    compliance: 0.8,
    opportunity: 0.8,
  };

  score *= categoryBoost[insight.category] ?? 1.0;

  // Time-sensitivity boost (if impact timeframe is "this year")
  if (insight.estimatedImpact.timeframe === 'this year') {
    score *= 1.5;
  }

  return score;
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Converts an array of plan alerts into ranked, enriched insights.
 *
 * Each alert maps to a single insight. Insights are enriched with:
 * - A unique ID
 * - Estimated impact with type, amount, and timeframe
 * - Contextual action buttons for the UI
 * - A one-sentence summary
 * - A display rank based on importance scoring
 *
 * @param alerts - Alerts from the plan monitor
 * @param planData - Condensed plan summary for context
 * @returns An array of PlanInsight objects, ranked by importance
 *
 * @example
 * ```ts
 * const insights = generateInsights(monitorResult.alertsGenerated, planSummary);
 * const topThree = insights.filter(i => i.rank <= 3);
 * ```
 */
export function generateInsights(
  alerts: PlanAlert[],
  planData: PlanSummary,
): PlanInsight[] {
  const insights: PlanInsight[] = alerts.map((alert) => {
    const insightType = inferInsightType(alert);
    const estimatedImpact = deriveImpact(alert);
    const actions = deriveActions(alert);
    const summary = generateSummary(alert.description);

    return {
      id: generateInsightId(alert.triggerId, planData.planId),
      rank: 0, // Will be assigned by rankInsights
      category: alert.category,
      type: insightType,
      title: alert.title,
      summary,
      detail: alert.description + '\n\n' + alert.recommendedAction,
      estimatedImpact,
      actions,
      aiGenerated: true,
      dismissed: false,
    };
  });

  return rankInsights(insights);
}

/**
 * Assigns display ranks to insights based on a multi-factor importance score.
 *
 * Factors considered:
 * - Dollar impact (log scale)
 * - Alert severity
 * - Category priority (tax/retirement weighted higher)
 * - Time sensitivity
 *
 * @param insights - Unranked or previously ranked insights
 * @returns The same insights array, mutated with updated rank values
 *
 * @example
 * ```ts
 * const ranked = rankInsights(insights);
 * // ranked[0].rank === 1 (most important)
 * ```
 */
export function rankInsights(insights: PlanInsight[]): PlanInsight[] {
  // Compute scores and sort
  const scored = insights.map((insight) => ({
    insight,
    score: computeImportanceScore(insight),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Assign ranks (1-based)
  scored.forEach((item, index) => {
    item.insight.rank = index + 1;
  });

  return scored.map((item) => item.insight);
}
