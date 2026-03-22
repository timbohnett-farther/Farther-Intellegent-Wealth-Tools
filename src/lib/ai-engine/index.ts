// ==================== AI PLANNING INTELLIGENCE ENGINE — BARREL FILE ====================
// Stage 4: AI intelligence layer for the Farther Prism financial planning platform.
// Re-exports all types, functions, and constants from submodules.

// ── Shared types ──────────────────────────────────────────────────────────
export type {
  // Alert & Insight types
  AlertSeverity,
  AlertCategory,
  PlanAlert,
  InsightType,
  InsightAction,
  EstimatedImpact,
  PlanInsight,

  // Plan monitor types
  PlanMonitorInput,
  PlanMonitorResult,
  AlertTrigger,

  // Plan summary & snapshot
  PlanSummary,
  PlanSnapshot,

  // Anomaly & opportunity
  AnomalyResult,
  OpportunityResult,

  // Recommendation types
  RothRecommendationInput,
  RothRecommendation,
  SSRecommendationInput,
  SSRecommendation,
  InsuranceGapInput,
  InsuranceGapResult,
  RebalancingInput,
  RebalancingRecommendation,
  EstateAlertInput,
  EstateAlert,
  RecommendationResult,

  // NLP types
  PlanNarratorInput,
  PlanNarrative,
  AdvisorInfo,
  ClientInfo,
  DraftEmail,

  // Forecasting types
  TaxLawScenario,
  TaxLawImpactResult,
  ClientProfile,
  PredictedLifeEvent,
} from './types';

// ── Insights ──────────────────────────────────────────────────────────────
export { runPlanMonitor, ALERT_TRIGGERS } from './insights/plan-monitor';
export { generateInsights, rankInsights } from './insights/insight-generator';
export { detectAnomalies } from './insights/anomaly-detector';
export { scanOpportunities } from './insights/opportunity-scanner';

// ── Recommendations ───────────────────────────────────────────────────────
export { recommendRothConversion } from './recommendations/roth-recommender';
export { recommendSSStrategy } from './recommendations/ss-recommender';
export { analyzeInsuranceGaps } from './recommendations/insurance-gap-engine';
export { recommendRebalancing } from './recommendations/rebalancing-recommender';
export { generateEstateAlerts } from './recommendations/estate-alert-engine';

// ── NLP ───────────────────────────────────────────────────────────────────
export { narratePlanSummary } from './nlp/plan-narrator';
export { composeClientEmail } from './nlp/email-composer';
export { generateReportSection } from './nlp/report-writer';

// ── Forecasting ───────────────────────────────────────────────────────────
export { modelTaxLawChange } from './forecasting/tax-law-impact';
export { modelTaxLawImpact, PREDEFINED_SCENARIOS, TCJA_SUNSET_SCENARIO, HIGHER_LTCG_SCENARIO } from './forecasting/tax-law-modeler';
export { predictLifeEvents } from './forecasting/life-event-predictor';
