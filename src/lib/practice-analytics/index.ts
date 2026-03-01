// =============================================================================
// FP-Pulse — Practice Analytics Module Barrel Export
//
// Re-exports all public types, interfaces, functions, and constants from
// the practice-analytics module for convenient single-path imports.
//
// Usage:
//   import { computeFirmKPIs, generateChurnSignals } from '@/lib/practice-analytics';
//
// @module practice-analytics
// =============================================================================

// ---- Types & Interfaces ----
export type {
  // Branded primitives
  AdvisorId,
  FirmId,
  AlertId,
  QueryId,
  // Enums / union types
  DashboardRole,
  AlertCategory,
  AlertPriority,
  AlertStatus,
  AlertChannel,
  ActionCategory,
  ActionUrgency,
  ChurnRiskLabel,
  ChurnRiskFactor,
  HealthScoreCategory,
  AdvisorScorecardSort,
  AdvisorPerformanceTier,
  KPITrend,
  RevenueTier,
  RevenueType,
  ChartType,
  PipelineStage,
  QuickQueryCategory,
  ConsolidationCategory,
  DailyActionType,
  AlertActionTemplate,
  FlowSource,
  // Core entity interfaces
  FirmKPIs,
  FirmKPIEntry,
  KPICard,
  AumGrowthAttribution,
  AumTimeSeriesPoint,
  AdvisorScorecard,
  HealthScoreComponents,
  HouseholdHealthEntry,
  ClientHealthHeatmapData,
  RevenueComposition,
  RevenueTimeSeriesPoint,
  RevenueAtRisk,
  GrowthOpportunity,
  ConsolidationOpportunity,
  CapacityAnalysis,
  BenchmarkMetric,
  MDDashboardData,
  AdvisorDashboardData,
  OperationsDashboardData,
  DataQualityMetric,
  BillingStatus,
  CustodianSyncHealth,
  PlatformAdoption,
  PipelineFunnel,
  ContactFrequency,
  EngagementMetrics,
  PlanQualityDistribution,
  PlanningQualityMetrics,
  FlowDetail,
  DashboardView,
  // Alert types
  AlertRule,
  Alert,
  // Churn types
  ChurnSignal,
  ChurnModelConfig,
  // Query types
  QueryResult,
  QueryContext,
  QuickQuery,
  ActionItem,
  ChartConfig,
  // Daily action types
  DailyActionItem,
  DailyActionList,
} from './types';

// ---- Type Constructors ----
export {
  advisorId,
  firmId,
  alertId,
  queryId,
} from './types';

// ---- Analytics Service ----
export {
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
} from './analytics-service';

// ---- Dashboard Service ----
export {
  buildMDDashboard,
  buildAdvisorDashboard,
  buildOperationsDashboard,
} from './dashboard-service';

// ---- Churn Prediction ----
export {
  generateChurnSignals,
  classifyChurnRisk,
  getTopRiskFactors,
  recommendIntervention,
  getChurnSummary,
  CHURN_SCORING_SQL,
  CHURN_FEATURES_VIEW_SQL,
} from './churn-prediction';

// ---- Alert Engine ----
export {
  ALERT_RULES,
  evaluateAlertRules,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  dismissAlert,
  getAlertSummary,
  routeAlertNotifications,
} from './alert-engine';

// ---- Query Engine ----
export {
  runNaturalLanguageQuery,
  matchQueryPattern,
  getQuickQueries,
  validateQuerySecurity,
} from './query-engine';

// ---- Daily Actions ----
export {
  generateDailyActions,
  computePriorityScore,
  categorizeAction,
  completeAction,
  snoozeAction as snoozeActionItem,
  getAction,
  getActionsForAdvisor,
  getActionsForFirm,
  dismissAction,
  getActionSummary,
  clearActionStore,
} from './daily-actions';
