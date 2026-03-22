// =============================================================================
// FP-Pulse — Churn Prediction Module
//
// BigQuery ML churn prediction model definition + TypeScript service layer.
// Provides SQL constants for model training & scoring, plus an in-memory
// demo data layer that generates realistic churn signals for households.
//
// This module is self-contained and does not depend on React, Next.js, or Prisma.
// =============================================================================

import type {
  FirmId,
  AdvisorId,
  ChurnSignal,
  ChurnRiskLabel,
  ChurnRiskFactor,
} from './types';

// =============================================================================
// BigQuery SQL Constants
// =============================================================================

/**
 * BigQuery ML CREATE MODEL statement for the household churn prediction model.
 *
 * Model: `farther_analytics.churn_prediction_model`
 * Type : Logistic Regression (binary classification)
 *
 * Features span seven signal groups:
 *  - Engagement signals (contact, portal, meetings, email)
 *  - Plan health signals (probability of success, data completeness)
 *  - Financial signals (AUM deltas, flows)
 *  - Portfolio signals (drift, unrealized losses)
 *  - Relationship signals (tenure, household size, services used)
 *  - Life event signals (recent events, retirement proximity)
 *  - Proposal signals (proposal recency, declines, competitor activity)
 *
 * Class weights are set to 3:1 in favor of the positive (churned) class
 * to compensate for the natural class imbalance -- most clients are retained.
 */
export const CHURN_MODEL_CREATE_SQL = `
CREATE OR REPLACE MODEL \`farther_analytics.churn_prediction_model\`
OPTIONS (
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['churned_within_180_days'],
  data_split_method = 'RANDOM',
  data_split_eval_fraction = 0.20,
  l2_reg = 0.1,
  max_iterations = 100,
  class_weights = [STRUCT('TRUE' AS label, 3.0 AS weight),
                   STRUCT('FALSE' AS label, 1.0 AS weight)]
) AS
SELECT
  -- Engagement signals
  days_since_last_advisor_contact,
  days_since_last_portal_login,
  portal_sessions_last_90d,
  avg_session_duration_minutes,
  meetings_last_12_months,
  emails_opened_rate_last_90d,

  -- Plan health signals
  probability_of_success,
  plan_success_rate_delta_90d,
  days_since_plan_recalculated,
  data_completion_score,
  goals_at_risk_count,

  -- Financial signals
  aum_delta_90d_pct,
  outflows_last_90d,
  inflows_last_90d,
  net_flow_ratio,

  -- Portfolio signals
  portfolio_drift_score,
  unrealized_loss_pct,

  -- Relationship signals
  years_as_client,
  number_of_household_members,
  uses_client_portal,
  has_estate_plan,
  has_tax_planning,
  wealth_tier_encoded,

  -- Life event signals
  recent_life_event_flag,
  retirement_within_2_years,

  -- Proposal signals
  days_since_last_proposal,
  proposal_declined_last_6m,
  competitor_proposal_detected,

  -- Label
  churned_within_180_days

FROM \`farther_analytics.churn_training_data\`
WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)
`;

/**
 * Daily scoring query that evaluates every active household against the
 * trained churn model, writing results to `farther_analytics.churn_signals`.
 *
 * Risk labels are assigned using threshold buckets:
 *  - critical : score >= 0.70
 *  - elevated : score >= 0.45
 *  - watch    : score >= 0.25
 *  - healthy  : score <  0.25
 *
 * `annual_revenue_at_risk` assumes a blended 75 bps advisory fee.
 */
export const CHURN_SCORING_SQL = `
CREATE OR REPLACE TABLE \`farther_analytics.churn_signals\` AS
WITH scored AS (
  SELECT
    h.household_id,
    h.advisor_id,
    h.firm_id,
    h.display_name,
    h.aum,
    pred.prob AS churn_risk_score,
    CASE
      WHEN pred.prob >= 0.70 THEN 'critical'
      WHEN pred.prob >= 0.45 THEN 'elevated'
      WHEN pred.prob >= 0.25 THEN 'watch'
      ELSE 'healthy'
    END AS churn_risk_label,
    ROUND(h.aum * 0.0075, 2) AS annual_revenue_at_risk,
    pred.top_feature_attributions AS top_risk_factors,
    CURRENT_TIMESTAMP() AS scored_at
  FROM
    ML.PREDICT(
      MODEL \`farther_analytics.churn_prediction_model\`,
      (SELECT * FROM \`farther_analytics.churn_features\`)
    ) pred
  INNER JOIN \`farther_analytics.household_360\` h
    ON pred.household_id = h.household_id
  WHERE h.status = 'active'
)
SELECT
  s.*,
  CASE
    WHEN s.churn_risk_label = 'critical' AND EXISTS (
      SELECT 1 FROM UNNEST(s.top_risk_factors) rf WHERE rf.feature = 'days_since_last_advisor_contact'
    ) THEN 'Schedule an urgent check-in with the client -- no advisor contact is the top risk factor.'
    WHEN s.churn_risk_label = 'critical' AND EXISTS (
      SELECT 1 FROM UNNEST(s.top_risk_factors) rf WHERE rf.feature = 'competitor_proposal_detected'
    ) THEN 'Competitor proposal detected -- prepare a retention proposal with updated financial plan.'
    WHEN s.churn_risk_label = 'critical'
      THEN 'Immediate outreach required -- schedule a comprehensive portfolio review meeting.'
    WHEN s.churn_risk_label = 'elevated' AND EXISTS (
      SELECT 1 FROM UNNEST(s.top_risk_factors) rf WHERE rf.feature = 'plan_success_rate_delta_90d'
    ) THEN 'Plan success rate is declining -- recalculate the financial plan and discuss adjustments.'
    WHEN s.churn_risk_label = 'elevated'
      THEN 'Proactive outreach recommended -- send a personalized update and schedule a review.'
    WHEN s.churn_risk_label = 'watch'
      THEN 'Monitor engagement -- consider sending educational content or a quarterly check-in.'
    ELSE 'No action required -- client engagement is healthy.'
  END AS recommended_action
FROM scored s
`;

/**
 * View that assembles churn prediction features from `household_360`
 * and related tables into a single denormalized feature set.
 */
export const CHURN_FEATURES_VIEW_SQL = `
CREATE OR REPLACE VIEW \`farther_analytics.churn_features\` AS
SELECT
  h.household_id,

  -- Engagement signals
  DATE_DIFF(CURRENT_DATE(), h.last_advisor_contact_date, DAY) AS days_since_last_advisor_contact,
  DATE_DIFF(CURRENT_DATE(), h.last_portal_login_date, DAY) AS days_since_last_portal_login,
  COALESCE(pe.portal_sessions_last_90d, 0) AS portal_sessions_last_90d,
  COALESCE(pe.avg_session_duration_minutes, 0) AS avg_session_duration_minutes,
  COALESCE(m.meetings_last_12_months, 0) AS meetings_last_12_months,
  COALESCE(em.emails_opened_rate_last_90d, 0.0) AS emails_opened_rate_last_90d,

  -- Plan health signals
  h.probability_of_success,
  h.plan_success_rate_delta_90d,
  DATE_DIFF(CURRENT_DATE(), h.plan_last_recalculated_date, DAY) AS days_since_plan_recalculated,
  h.data_completion_score,
  h.goals_at_risk_count,

  -- Financial signals
  h.aum_delta_90d_pct,
  COALESCE(f.outflows_last_90d, 0) AS outflows_last_90d,
  COALESCE(f.inflows_last_90d, 0) AS inflows_last_90d,
  SAFE_DIVIDE(
    COALESCE(f.inflows_last_90d, 0) - COALESCE(f.outflows_last_90d, 0),
    GREATEST(COALESCE(f.inflows_last_90d, 0) + COALESCE(f.outflows_last_90d, 0), 1)
  ) AS net_flow_ratio,

  -- Portfolio signals
  h.portfolio_drift_score,
  h.unrealized_loss_pct,

  -- Relationship signals
  DATE_DIFF(CURRENT_DATE(), h.client_since_date, DAY) / 365.25 AS years_as_client,
  h.number_of_household_members,
  h.uses_client_portal,
  h.has_estate_plan,
  h.has_tax_planning,
  CASE h.wealth_tier
    WHEN 'mass_affluent' THEN 1
    WHEN 'high_net_worth' THEN 2
    WHEN 'very_high_net_worth' THEN 3
    WHEN 'ultra_high_net_worth' THEN 4
    ELSE 0
  END AS wealth_tier_encoded,

  -- Life event signals
  CASE WHEN le.last_life_event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH) THEN TRUE ELSE FALSE END AS recent_life_event_flag,
  CASE WHEN h.projected_retirement_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 2 YEAR) THEN TRUE ELSE FALSE END AS retirement_within_2_years,

  -- Proposal signals
  DATE_DIFF(CURRENT_DATE(), p.last_proposal_date, DAY) AS days_since_last_proposal,
  COALESCE(p.proposals_declined_last_6m, 0) AS proposal_declined_last_6m,
  COALESCE(p.competitor_proposal_detected, FALSE) AS competitor_proposal_detected

FROM \`farther_analytics.household_360\` h
LEFT JOIN \`farther_analytics.portal_engagement_90d\` pe ON h.household_id = pe.household_id
LEFT JOIN \`farther_analytics.meeting_activity\` m ON h.household_id = m.household_id
LEFT JOIN \`farther_analytics.email_engagement_90d\` em ON h.household_id = em.household_id
LEFT JOIN \`farther_analytics.cash_flows_90d\` f ON h.household_id = f.household_id
LEFT JOIN \`farther_analytics.life_events\` le ON h.household_id = le.household_id
LEFT JOIN \`farther_analytics.proposals\` p ON h.household_id = p.household_id
WHERE h.status = 'active'
`;

/**
 * Training data view that assembles historical feature snapshots with
 * the binary churn label (`churned_within_180_days`). Used as input
 * to the `CHURN_MODEL_CREATE_SQL` model training statement.
 */
export const CHURN_TRAINING_DATA_SQL = `
CREATE OR REPLACE VIEW \`farther_analytics.churn_training_data\` AS
SELECT
  snap.household_id,
  snap.snapshot_date,

  -- Engagement signals (as of snapshot)
  snap.days_since_last_advisor_contact,
  snap.days_since_last_portal_login,
  snap.portal_sessions_last_90d,
  snap.avg_session_duration_minutes,
  snap.meetings_last_12_months,
  snap.emails_opened_rate_last_90d,

  -- Plan health signals
  snap.probability_of_success,
  snap.plan_success_rate_delta_90d,
  snap.days_since_plan_recalculated,
  snap.data_completion_score,
  snap.goals_at_risk_count,

  -- Financial signals
  snap.aum_delta_90d_pct,
  snap.outflows_last_90d,
  snap.inflows_last_90d,
  snap.net_flow_ratio,

  -- Portfolio signals
  snap.portfolio_drift_score,
  snap.unrealized_loss_pct,

  -- Relationship signals
  snap.years_as_client,
  snap.number_of_household_members,
  snap.uses_client_portal,
  snap.has_estate_plan,
  snap.has_tax_planning,
  snap.wealth_tier_encoded,

  -- Life event signals
  snap.recent_life_event_flag,
  snap.retirement_within_2_years,

  -- Proposal signals
  snap.days_since_last_proposal,
  snap.proposal_declined_last_6m,
  snap.competitor_proposal_detected,

  -- Label: did this household churn within 180 days of the snapshot?
  CASE
    WHEN churn.churned_date IS NOT NULL
      AND churn.churned_date BETWEEN snap.snapshot_date
      AND DATE_ADD(snap.snapshot_date, INTERVAL 180 DAY)
    THEN TRUE
    ELSE FALSE
  END AS churned_within_180_days

FROM \`farther_analytics.household_feature_snapshots\` snap
LEFT JOIN \`farther_analytics.household_churn_events\` churn
  ON snap.household_id = churn.household_id
WHERE snap.snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)
`;

// =============================================================================
// Demo Household Seed Data
// =============================================================================

/**
 * Internal representation of a demo household used to generate ChurnSignals.
 * These are not exported; callers interact via the public API functions.
 */
interface DemoHousehold {
  householdId: string;
  advisorId: string;
  advisorName: string;
  householdName: string;
  aum: number;
  daysSinceLastContact: number;
  portalSessionsLast90d: number;
  planSuccessRateDelta90d: number;
  netFlowRatio: number;
  /** Pre-assigned churn risk score (0-100) for demo purposes. */
  churnScore: number;
  /** Primary risk factors for this household. */
  riskFactors: ChurnRiskFactor[];
}

/**
 * Seed data: 28 demo households with realistic churn signals.
 *
 * Distribution:
 *  - 17 healthy  (61%)  -- scores 0-24
 *  -  6 watch    (21%)  -- scores 25-44
 *  -  3 elevated (11%)  -- scores 45-69
 *  -  2 critical  (7%)  -- scores 70-100
 *
 * High-AUM clients are generally healthier (more advisor attention),
 * but two high-AUM households are deliberately at risk for dramatic effect.
 */
const DEMO_HOUSEHOLDS: DemoHousehold[] = [
  // ---- HEALTHY (17 households, scores 0-24) ----
  {
    householdId: 'hh_001', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Richardson Family', aum: 12_500_000,
    daysSinceLastContact: 8, portalSessionsLast90d: 22, planSuccessRateDelta90d: 0.02, netFlowRatio: 0.60,
    churnScore: 3, riskFactors: [],
  },
  {
    householdId: 'hh_002', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Chen Household', aum: 8_200_000,
    daysSinceLastContact: 12, portalSessionsLast90d: 18, planSuccessRateDelta90d: 0.01, netFlowRatio: 0.67,
    churnScore: 5, riskFactors: [],
  },
  {
    householdId: 'hh_003', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Martinez Family', aum: 4_700_000,
    daysSinceLastContact: 18, portalSessionsLast90d: 14, planSuccessRateDelta90d: 0.00, netFlowRatio: 0.60,
    churnScore: 8, riskFactors: [],
  },
  {
    householdId: 'hh_004', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Patel Household', aum: 3_100_000,
    daysSinceLastContact: 22, portalSessionsLast90d: 11, planSuccessRateDelta90d: -0.01, netFlowRatio: 0.45,
    churnScore: 11, riskFactors: [],
  },
  {
    householdId: 'hh_005', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The O\'Brien Trust', aum: 6_800_000,
    daysSinceLastContact: 10, portalSessionsLast90d: 20, planSuccessRateDelta90d: 0.01, netFlowRatio: 0.66,
    churnScore: 4, riskFactors: [],
  },
  {
    householdId: 'hh_006', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Washington Family', aum: 2_200_000,
    daysSinceLastContact: 30, portalSessionsLast90d: 8, planSuccessRateDelta90d: -0.02, netFlowRatio: -0.11,
    churnScore: 15, riskFactors: ['LOW_ENGAGEMENT'],
  },
  {
    householdId: 'hh_007', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Kim Household', aum: 1_800_000,
    daysSinceLastContact: 25, portalSessionsLast90d: 9, planSuccessRateDelta90d: 0.00, netFlowRatio: 0.43,
    churnScore: 13, riskFactors: [],
  },
  {
    householdId: 'hh_008', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Taylor Estate', aum: 9_500_000,
    daysSinceLastContact: 5, portalSessionsLast90d: 28, planSuccessRateDelta90d: 0.01, netFlowRatio: 0.76,
    churnScore: 2, riskFactors: [],
  },
  {
    householdId: 'hh_009', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Nguyen Household', aum: 1_400_000,
    daysSinceLastContact: 35, portalSessionsLast90d: 5, planSuccessRateDelta90d: -0.01, netFlowRatio: 0.20,
    churnScore: 18, riskFactors: ['LOW_ENGAGEMENT', 'LOW_PORTAL_USAGE'],
  },
  {
    householdId: 'hh_010', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Davis Trust', aum: 5_300_000,
    daysSinceLastContact: 14, portalSessionsLast90d: 16, planSuccessRateDelta90d: 0.01, netFlowRatio: 0.61,
    churnScore: 7, riskFactors: [],
  },
  {
    householdId: 'hh_011', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Garcia Family', aum: 2_800_000,
    daysSinceLastContact: 20, portalSessionsLast90d: 12, planSuccessRateDelta90d: -0.01, netFlowRatio: 0.32,
    churnScore: 12, riskFactors: [],
  },
  {
    householdId: 'hh_012', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Lee Household', aum: 950_000,
    daysSinceLastContact: 28, portalSessionsLast90d: 6, planSuccessRateDelta90d: 0.00, netFlowRatio: 0.23,
    churnScore: 20, riskFactors: ['LOW_ENGAGEMENT', 'LOW_PORTAL_USAGE'],
  },
  {
    householdId: 'hh_013', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Thompson Family', aum: 3_600_000,
    daysSinceLastContact: 16, portalSessionsLast90d: 15, planSuccessRateDelta90d: 0.00, netFlowRatio: 0.52,
    churnScore: 6, riskFactors: [],
  },
  {
    householdId: 'hh_014', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Robinson Household', aum: 1_600_000,
    daysSinceLastContact: 32, portalSessionsLast90d: 7, planSuccessRateDelta90d: -0.02, netFlowRatio: 0.11,
    churnScore: 19, riskFactors: ['LOW_ENGAGEMENT'],
  },
  {
    householdId: 'hh_015', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Yamamoto Estate', aum: 7_100_000,
    daysSinceLastContact: 7, portalSessionsLast90d: 24, planSuccessRateDelta90d: 0.02, netFlowRatio: 0.67,
    churnScore: 3, riskFactors: [],
  },
  {
    householdId: 'hh_016', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Anderson Household', aum: 1_100_000,
    daysSinceLastContact: 40, portalSessionsLast90d: 4, planSuccessRateDelta90d: -0.03, netFlowRatio: -0.50,
    churnScore: 23, riskFactors: ['LOW_ENGAGEMENT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS'],
  },
  {
    householdId: 'hh_017', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Shapiro Trust', aum: 4_100_000,
    daysSinceLastContact: 11, portalSessionsLast90d: 19, planSuccessRateDelta90d: 0.01, netFlowRatio: 0.67,
    churnScore: 5, riskFactors: [],
  },

  // ---- WATCH (6 households, scores 25-44) ----
  {
    householdId: 'hh_018', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Collins Household', aum: 1_500_000,
    daysSinceLastContact: 55, portalSessionsLast90d: 3, planSuccessRateDelta90d: -0.04, netFlowRatio: -0.43,
    churnScore: 28, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS'],
  },
  {
    householdId: 'hh_019', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Stewart Family', aum: 2_400_000,
    daysSinceLastContact: 48, portalSessionsLast90d: 4, planSuccessRateDelta90d: -0.05, netFlowRatio: -0.33,
    churnScore: 33, riskFactors: ['NO_RECENT_CONTACT', 'PLAN_HEALTH_DECLINE', 'LIFE_EVENT'],
  },
  {
    householdId: 'hh_020', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Baker Household', aum: 800_000,
    daysSinceLastContact: 65, portalSessionsLast90d: 2, planSuccessRateDelta90d: -0.06, netFlowRatio: -0.60,
    churnScore: 38, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS', 'PROPOSAL_DECLINED'],
  },
  {
    householdId: 'hh_021', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Morales Family', aum: 1_900_000,
    daysSinceLastContact: 52, portalSessionsLast90d: 3, planSuccessRateDelta90d: -0.03, netFlowRatio: -0.38,
    churnScore: 35, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS'],
  },
  {
    householdId: 'hh_022', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Reed Household', aum: 3_400_000,
    daysSinceLastContact: 45, portalSessionsLast90d: 5, planSuccessRateDelta90d: -0.04, netFlowRatio: -0.27,
    churnScore: 30, riskFactors: ['NO_RECENT_CONTACT', 'PLAN_HEALTH_DECLINE'],
  },
  {
    householdId: 'hh_023', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Foster Estate', aum: 2_000_000,
    daysSinceLastContact: 60, portalSessionsLast90d: 2, planSuccessRateDelta90d: -0.05, netFlowRatio: -0.47,
    churnScore: 42, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'PLAN_HEALTH_DECLINE', 'PROPOSAL_DECLINED'],
  },

  // ---- ELEVATED (3 households, scores 45-69) ----
  {
    householdId: 'hh_024', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Mitchell Family', aum: 2_600_000,
    daysSinceLastContact: 78, portalSessionsLast90d: 1, planSuccessRateDelta90d: -0.08, netFlowRatio: -0.78,
    churnScore: 52, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS', 'PLAN_HEALTH_DECLINE', 'LIFE_EVENT'],
  },
  {
    householdId: 'hh_025', advisorId: 'adv_101', advisorName: 'Michael Torres',
    householdName: 'The Brooks Household', aum: 1_200_000,
    daysSinceLastContact: 92, portalSessionsLast90d: 0, planSuccessRateDelta90d: -0.10, netFlowRatio: -1.00,
    churnScore: 62, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS', 'PLAN_HEALTH_DECLINE', 'PROPOSAL_DECLINED'],
  },
  {
    householdId: 'hh_026', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Goldstein Family', aum: 6_200_000,
    daysSinceLastContact: 70, portalSessionsLast90d: 2, planSuccessRateDelta90d: -0.07, netFlowRatio: -0.76,
    churnScore: 56, riskFactors: ['NO_RECENT_CONTACT', 'AUM_OUTFLOWS', 'PLAN_HEALTH_DECLINE', 'LIFE_EVENT'],
  },

  // ---- CRITICAL (2 households, scores 70-100) ----
  // Deliberately includes a very high-AUM household for dramatic effect.
  {
    householdId: 'hh_027', advisorId: 'adv_100', advisorName: 'Sarah Chen',
    householdName: 'The Whitfield Trust', aum: 8_900_000,
    daysSinceLastContact: 105, portalSessionsLast90d: 0, planSuccessRateDelta90d: -0.12, netFlowRatio: -1.00,
    churnScore: 78, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS', 'PLAN_HEALTH_DECLINE', 'PROPOSAL_DECLINED', 'LIFE_EVENT'],
  },
  {
    householdId: 'hh_028', advisorId: 'adv_102', advisorName: 'Jennifer Park',
    householdName: 'The Harrington Household', aum: 3_800_000,
    daysSinceLastContact: 120, portalSessionsLast90d: 0, planSuccessRateDelta90d: -0.15, netFlowRatio: -1.00,
    churnScore: 85, riskFactors: ['NO_RECENT_CONTACT', 'LOW_PORTAL_USAGE', 'AUM_OUTFLOWS', 'PLAN_HEALTH_DECLINE', 'PROPOSAL_DECLINED', 'PORTFOLIO_DRIFT', 'LIFE_EVENT'],
  },
];

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Classifies a numeric churn risk score into a human-readable risk label.
 *
 * Thresholds:
 *  - critical : score >= 70
 *  - elevated : score >= 45
 *  - watch    : score >= 25
 *  - healthy  : score <  25
 *
 * @param score - Churn risk score on a 0-100 scale.
 * @returns The corresponding ChurnRiskLabel.
 */
export function classifyChurnRisk(score: number): ChurnRiskLabel {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'elevated';
  if (score >= 25) return 'watch';
  return 'healthy';
}

/**
 * Analyzes a churn signal to determine the top contributing risk factors.
 *
 * In the production BigQuery ML model, these come from `ML.EXPLAIN_PREDICT`
 * feature attributions. In demo mode, factors are derived heuristically
 * from the signal's underlying properties.
 *
 * @param signal - The churn signal to analyze.
 * @returns An ordered array of ChurnRiskFactor strings.
 */
export function getTopRiskFactors(signal: ChurnSignal): ChurnRiskFactor[] {
  const factors: ChurnRiskFactor[] = [];

  if (signal.daysSinceLastContact > 90) {
    factors.push('NO_RECENT_CONTACT');
  } else if (signal.daysSinceLastContact > 45) {
    factors.push('LOW_ENGAGEMENT');
  }

  if (signal.portalSessionsLast90d <= 2) {
    factors.push('LOW_PORTAL_USAGE');
  }

  if (signal.planSuccessRateDelta90d < -0.05) {
    factors.push('PLAN_HEALTH_DECLINE');
  }

  if (signal.netFlowRatio < -0.20) {
    factors.push('AUM_OUTFLOWS');
  }

  // Deduplicate (in case the signal already carried factors)
  return [...new Set(factors)];
}

/**
 * Returns a human-readable recommended intervention action based on
 * the risk label and top contributing factors of a churn signal.
 *
 * @param signal - The churn signal to recommend an intervention for.
 * @returns A human-readable action string.
 */
export function recommendIntervention(signal: ChurnSignal): string {
  const label = signal.churnRiskLabel;
  const factors = signal.topRiskFactors;

  if (label === 'critical') {
    if (factors.includes('NO_RECENT_CONTACT')) {
      return 'URGENT: No advisor contact in over 90 days. Schedule an immediate check-in call and prepare a comprehensive portfolio review.';
    }
    if (factors.includes('AUM_OUTFLOWS')) {
      return 'URGENT: Significant outflows detected. Contact the client immediately to understand their needs and discuss a retention strategy.';
    }
    return 'URGENT: Immediate outreach required. Schedule a comprehensive portfolio review meeting and prepare a personalized retention plan.';
  }

  if (label === 'elevated') {
    if (factors.includes('PLAN_HEALTH_DECLINE')) {
      return 'Proactive outreach recommended. Recalculate the financial plan with updated assumptions and schedule a plan review meeting.';
    }
    if (factors.includes('NO_RECENT_CONTACT')) {
      return 'Proactive outreach recommended. Contact has lapsed. Schedule a personalized check-in and send a market update email.';
    }
    return 'Proactive outreach recommended. Send a personalized update and schedule a review meeting within the next two weeks.';
  }

  if (label === 'watch') {
    if (factors.includes('NO_RECENT_CONTACT') || factors.includes('LOW_PORTAL_USAGE')) {
      return 'Monitor engagement. Consider sending educational content, a quarterly market update, or scheduling a brief check-in call.';
    }
    if (factors.includes('PLAN_HEALTH_DECLINE')) {
      return 'Monitor plan health. Consider recalculating the plan and sending a proactive update on any strategy adjustments.';
    }
    return 'Monitor engagement. Consider sending educational content or a quarterly check-in to maintain the relationship.';
  }

  return 'No action required. Client engagement is healthy.';
}

/**
 * Generates demo churn signals for all households belonging to a firm.
 *
 * In production, this function would query the `farther_analytics.churn_signals`
 * BigQuery table (populated by `CHURN_SCORING_SQL`). In demo mode, it
 * synthesizes realistic signals from the in-memory household seed data.
 *
 * @param firmId - The firm identifier to generate signals for.
 * @returns An array of ChurnSignal objects for all demo households.
 */
export function generateChurnSignals(firmId: FirmId): ChurnSignal[] {
  // firmId is used for scoping; in demo mode all households belong to the same firm
  void firmId;

  return DEMO_HOUSEHOLDS.map((hh) => {
    const riskLabel = classifyChurnRisk(hh.churnScore);
    const annualRevenueAtRisk = Math.round(hh.aum * 0.0075 * 100) / 100;

    const signal: ChurnSignal = {
      householdId: hh.householdId,
      advisorId: hh.advisorId as AdvisorId,
      householdName: hh.householdName,
      aum: hh.aum,
      churnRiskScore: hh.churnScore,
      churnRiskLabel: riskLabel,
      annualRevenueAtRisk,
      topRiskFactors: hh.riskFactors,
      recommendedAction: '',
      scoredAt: new Date().toISOString(),
      daysSinceLastContact: hh.daysSinceLastContact,
      portalSessionsLast90d: hh.portalSessionsLast90d,
      planSuccessRateDelta90d: hh.planSuccessRateDelta90d,
      netFlowRatio: hh.netFlowRatio,
    };

    // Compute recommended action
    signal.recommendedAction = recommendIntervention(signal);

    return signal;
  });
}

/**
 * Computes a summary of churn signals aggregated by risk label,
 * including total AUM and revenue at risk across all households.
 *
 * @param signals - Array of churn signals to summarize.
 * @returns An object with counts by risk level and aggregate financial exposure.
 */
export function getChurnSummary(signals: ChurnSignal[]): {
  total: number;
  critical: number;
  elevated: number;
  watch: number;
  healthy: number;
  totalAumAtRisk: number;
  totalRevenueAtRisk: number;
} {
  let critical = 0;
  let elevated = 0;
  let watch = 0;
  let healthy = 0;
  let totalAumAtRisk = 0;
  let totalRevenueAtRisk = 0;

  for (const signal of signals) {
    switch (signal.churnRiskLabel) {
      case 'critical':
        critical++;
        totalAumAtRisk += signal.aum;
        totalRevenueAtRisk += signal.annualRevenueAtRisk;
        break;
      case 'elevated':
        elevated++;
        totalAumAtRisk += signal.aum;
        totalRevenueAtRisk += signal.annualRevenueAtRisk;
        break;
      case 'watch':
        watch++;
        // Watch households contribute partial risk (25%)
        totalAumAtRisk += signal.aum * 0.25;
        totalRevenueAtRisk += signal.annualRevenueAtRisk * 0.25;
        break;
      case 'healthy':
        healthy++;
        break;
    }
  }

  return {
    total: signals.length,
    critical,
    elevated,
    watch,
    healthy,
    totalAumAtRisk: Math.round(totalAumAtRisk),
    totalRevenueAtRisk: Math.round(totalRevenueAtRisk * 100) / 100,
  };
}
