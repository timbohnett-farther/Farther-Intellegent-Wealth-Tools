// =============================================================================
// FP-Pulse — Alert Engine
//
// Rule-based alert evaluation, lifecycle management, and notification routing.
// Defines the full set of alert rules from the FP-Pulse specification and
// provides an in-memory demo data layer with realistic seeded alerts.
//
// This module is self-contained and does not depend on React, Next.js, or Prisma.
// =============================================================================

import {
  type FirmId,
  type AdvisorId,
  type AlertId,
  type Alert,
  type AlertRule,
  type AlertCategory,
  type AlertPriority,
  type AlertStatus,
  type AlertChannel,
  type AlertActionTemplate,
  alertId as makeAlertId,
} from './types';

// =============================================================================
// ID Generation
// =============================================================================

/** Counter for generating unique alert IDs. */
let alertIdCounter = 0;

/**
 * Generates a unique alert identifier.
 */
function generateAlertId(): AlertId {
  alertIdCounter++;
  const timestamp = Date.now().toString(36);
  const counter = alertIdCounter.toString(36).padStart(4, '0');
  return makeAlertId(`alrt_${timestamp}_${counter}`);
}

// =============================================================================
// Alert Rules
// =============================================================================

/**
 * The full set of FP-Pulse alert rules.
 *
 * Each rule defines:
 *  - A unique `id` for deduplication and audit.
 *  - A human-readable `name` and `description`.
 *  - `category` and `priority` for routing and display.
 *  - `query` -- the BigQuery SQL that identifies matching rows.
 *  - `actionTemplate` -- the suggested workflow action when the alert fires.
 *  - `cooldownDays` -- minimum days between repeat firings for the same entity.
 *  - Notification flags: `notifyAdvisor`, `notifyMD`, `notifyOps`.
 *  - `channels` -- delivery channels for the notifications.
 *  - `isActive` flag for runtime toggling.
 *
 * All 8 rules from the spec are included.
 */
export const ALERT_RULES: AlertRule[] = [
  // ---- 1. Churn Risk Elevated ----
  {
    id: 'churn_risk_elevated',
    name: 'Client Churn Risk Elevated',
    description:
      'Fires when a household\'s churn risk model output transitions to "elevated" or "critical" and the household has not been alerted within the last 7 days.',
    query: `
      SELECT household_id, household_name, advisor_id, advisor_name, aum,
             churn_risk_score, churn_risk_label, annual_revenue_at_risk
      FROM \`farther-prism.fp_pulse.churn_scores_latest\`
      WHERE churn_risk_score >= 60
        AND household_id NOT IN (
          SELECT entity_id FROM \`farther-prism.fp_pulse.alert_cooldowns\`
          WHERE rule_id = 'churn_risk_elevated'
            AND cooldown_until > CURRENT_TIMESTAMP()
        )
      ORDER BY churn_risk_score DESC;
    `,
    category: 'RETENTION',
    priority: 'high',
    actionTemplate: 'outreach_call',
    notifyAdvisor: true,
    notifyMD: (row) => (row['aum'] as number) >= 5_000_000,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK'],
    cooldownDays: 7,
    isActive: true,
  },

  // ---- 2. No Contact -- High Value Client ----
  {
    id: 'no_contact_high_value',
    name: 'No Advisor Contact -- High Value Client',
    description:
      'Fires when a high-value client (AUM > $5M) has had no advisor contact in over 90 days.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             e.days_since_last_contact
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      LEFT JOIN \`farther-prism.fp_pulse.engagement_features\` e USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND h.aum >= 5000000
        AND COALESCE(e.days_since_last_contact, 365) > 90
      ORDER BY h.aum DESC;
    `,
    category: 'RETENTION',
    priority: 'high',
    actionTemplate: 'schedule_check_in',
    notifyAdvisor: true,
    notifyMD: true,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 14,
    isActive: true,
  },

  // ---- 3. Plan Success Rate Drop ----
  {
    id: 'plan_success_dropped',
    name: 'Plan Success Rate Drop > 10%',
    description:
      'Fires when a household\'s plan success rate has dropped more than 10 percentage points from the prior reading.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             p.plan_success_rate, p.plan_success_rate_delta_90d
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.plan_features\` p USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND p.plan_success_rate_delta_90d <= -0.10
      ORDER BY p.plan_success_rate_delta_90d ASC;
    `,
    category: 'PLANNING',
    priority: 'high',
    actionTemplate: 'schedule_plan_review',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 30,
    isActive: true,
  },

  // ---- 4. RMD Deadline Approaching ----
  {
    id: 'rmd_deadline_approaching',
    name: 'RMD Deadline Approaching',
    description:
      'Fires when a required minimum distribution has not yet been taken and the deadline is within 60 days.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             r.rmd_amount, r.rmd_deadline, r.rmd_status
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.rmd_schedule\` r USING (household_id)
      WHERE r.rmd_status = 'PENDING'
        AND r.rmd_deadline BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 60 DAY)
      ORDER BY r.rmd_deadline ASC;
    `,
    category: 'COMPLIANCE',
    priority: 'critical',
    actionTemplate: 'initiate_rmd',
    notifyAdvisor: true,
    notifyMD: true,
    notifyOps: true,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK', 'HUBSPOT_TASK'],
    cooldownDays: 7,
    isActive: true,
  },

  // ---- 5. Roth Conversion Window ----
  {
    id: 'roth_conversion_window',
    name: 'Roth Conversion Window Open',
    description:
      'Fires annually on October 1 when a household has Roth conversion headroom exceeding $10,000 -- giving Q4 time to execute.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             rc.estimated_tax_savings, rc.ira_balance, rc.current_bracket, rc.optimal_conversion_amount
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.roth_conversion_candidates\` rc USING (household_id)
      WHERE rc.is_favorable_window = TRUE
        AND h.status = 'ACTIVE'
      ORDER BY rc.estimated_tax_savings DESC;
    `,
    category: 'PLANNING',
    priority: 'normal',
    actionTemplate: 'generate_roth_analysis',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 90,
    isActive: true,
  },

  // ---- 6. Large AUM Outflow ----
  {
    id: 'large_aum_outflow',
    name: 'Large AUM Outflow Detected',
    description:
      'Fires when a single outflow exceeding $500,000 is detected within the last 24 hours.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             f.outflow_24h, f.outflow_24h / h.aum AS outflow_pct
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.flow_features\` f USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND f.outflow_24h > 500000
      ORDER BY f.outflow_24h DESC;
    `,
    category: 'RETENTION',
    priority: 'critical',
    actionTemplate: 'call_client_now',
    notifyAdvisor: true,
    notifyMD: (row) => (row['outflow_24h'] as number) >= 2_000_000,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK'],
    cooldownDays: 1,
    isActive: true,
  },

  // ---- 7. Custodian Sync Failed ----
  {
    id: 'custodian_sync_failed',
    name: 'Custodian Sync Failed',
    description:
      'Fires when a custodian data sync job fails, potentially leaving account data stale.',
    query: `
      SELECT custodian_name, last_sync_at, latency_ms, error_count_24h, status,
             TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_sync_at, HOUR) AS hours_since_sync
      FROM \`farther-prism.fp_pulse.custodian_sync_status\`
      WHERE status IN ('degraded', 'failing')
         OR TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_sync_at, HOUR) > 4
      ORDER BY hours_since_sync DESC;
    `,
    category: 'OPERATIONS',
    priority: 'critical',
    actionTemplate: 'investigate_sync_error',
    notifyAdvisor: false,
    notifyMD: false,
    notifyOps: true,
    channels: ['DASHBOARD', 'SLACK'],
    cooldownDays: 1,
    isActive: true,
  },

  // ---- 8. Billing Exception ----
  {
    id: 'billing_exception',
    name: 'Billing Exception Detected',
    description:
      'Fires when billing errors, fee discrepancies, or unbilled periods are detected during the billing reconciliation process.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             b.exception_type, b.expected_fee, b.actual_fee, b.fee_delta,
             b.next_billing_date
      FROM \`farther-prism.fp_pulse.billing_exceptions\` b
      JOIN \`farther-prism.fp_pulse.household_features\` h ON b.household_id = h.household_id
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      WHERE b.status = 'OPEN'
        AND b.next_billing_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY)
      ORDER BY ABS(b.fee_delta) DESC;
    `,
    category: 'REVENUE',
    priority: 'high',
    actionTemplate: 'review_billing',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: true,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 7,
    isActive: true,
  },
];

// =============================================================================
// Demo Alert Seed Data
// =============================================================================

/**
 * In-memory store of demo alerts. Populated by `seedDemoAlerts` on first access.
 */
let demoAlerts: Alert[] | null = null;

/**
 * Helper to create an ISO date string offset from now.
 */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Populates the in-memory alert store with 18 realistic demo alerts
 * across all categories, priorities, and statuses.
 * Called lazily on first access.
 */
function seedDemoAlerts(_firmId: FirmId): Alert[] {
  const alerts: Alert[] = [
    // ---- RETENTION alerts ----
    {
      alertId: generateAlertId(),
      ruleId: 'churn_risk_elevated',
      ruleName: 'Client Churn Risk Elevated',
      category: 'RETENTION',
      priority: 'critical',
      status: 'ACTIVE',
      householdId: 'hh_027',
      householdName: 'The Whitfield Trust',
      advisorId: 'adv_100' as AdvisorId,
      advisorName: 'Sarah Chen',
      message: 'Churn model score 78 (critical). No advisor contact in 105 days. Competitor proposal detected. AUM: $8.9M.',
      actionTemplate: 'outreach_call',
      createdAt: daysAgo(1),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { churnScore: 78, aum: 8_900_000, daysSinceContact: 105, competitorDetected: true },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'churn_risk_elevated',
      ruleName: 'Client Churn Risk Elevated',
      category: 'RETENTION',
      priority: 'critical',
      status: 'ACTIVE',
      householdId: 'hh_028',
      householdName: 'The Harrington Household',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Churn model score 85 (critical). No advisor contact in 120 days. Multiple proposals declined. AUM: $3.8M.',
      actionTemplate: 'outreach_call',
      createdAt: daysAgo(2),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { churnScore: 85, aum: 3_800_000, daysSinceContact: 120, proposalsDeclined: 3 },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'churn_risk_elevated',
      ruleName: 'Client Churn Risk Elevated',
      category: 'RETENTION',
      priority: 'high',
      status: 'ACTIVE',
      householdId: 'hh_026',
      householdName: 'The Goldstein Family',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Churn model score 56 (elevated). No contact in 70 days. Recent life event. AUM: $6.2M.',
      actionTemplate: 'outreach_call',
      createdAt: daysAgo(3),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { churnScore: 56, aum: 6_200_000, daysSinceContact: 70, recentLifeEvent: true },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'no_contact_high_value',
      ruleName: 'No Advisor Contact -- High Value Client',
      category: 'RETENTION',
      priority: 'high',
      status: 'ACTIVE',
      householdId: 'hh_027',
      householdName: 'The Whitfield Trust',
      advisorId: 'adv_100' as AdvisorId,
      advisorName: 'Sarah Chen',
      message: 'High-value client with $8.9M AUM has had no advisor contact in 105 days.',
      actionTemplate: 'schedule_check_in',
      createdAt: daysAgo(1),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { aum: 8_900_000, daysSinceContact: 105 },
    },

    // ---- PLANNING alerts ----
    {
      alertId: generateAlertId(),
      ruleId: 'plan_success_dropped',
      ruleName: 'Plan Success Rate Drop > 10%',
      category: 'PLANNING',
      priority: 'high',
      status: 'ACTIVE',
      householdId: 'hh_028',
      householdName: 'The Harrington Household',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Plan success rate dropped 15 percentage points in 90 days (from 67% to 52%).',
      actionTemplate: 'schedule_plan_review',
      createdAt: daysAgo(4),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { previousRate: 0.67, currentRate: 0.52, delta: -0.15 },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'plan_success_dropped',
      ruleName: 'Plan Success Rate Drop > 10%',
      category: 'PLANNING',
      priority: 'high',
      status: 'ACKNOWLEDGED',
      householdId: 'hh_025',
      householdName: 'The Brooks Household',
      advisorId: 'adv_101' as AdvisorId,
      advisorName: 'Michael Torres',
      message: 'Plan success rate dropped 10 percentage points in 90 days (from 70% to 60%).',
      actionTemplate: 'schedule_plan_review',
      createdAt: daysAgo(6),
      acknowledgedAt: daysAgo(5),
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { previousRate: 0.70, currentRate: 0.60, delta: -0.10 },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'roth_conversion_window',
      ruleName: 'Roth Conversion Window Open',
      category: 'PLANNING',
      priority: 'normal',
      status: 'ACTIVE',
      householdId: 'hh_001',
      householdName: 'The Richardson Family',
      advisorId: 'adv_100' as AdvisorId,
      advisorName: 'Sarah Chen',
      message: 'Roth conversion headroom of $85,000 identified. Q4 window is open to execute before year-end.',
      actionTemplate: 'generate_roth_analysis',
      createdAt: daysAgo(10),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { headroom: 85_000, estimatedTaxSavings: 12_750 },
    },

    // ---- COMPLIANCE alerts ----
    {
      alertId: generateAlertId(),
      ruleId: 'rmd_deadline_approaching',
      ruleName: 'RMD Deadline Approaching',
      category: 'COMPLIANCE',
      priority: 'critical',
      status: 'ACTIVE',
      householdId: 'hh_008',
      householdName: 'The Taylor Estate',
      advisorId: 'adv_101' as AdvisorId,
      advisorName: 'Michael Torres',
      message: 'Required Minimum Distribution of ~$348,000 has not been taken. Deadline is in 45 days. Penalty for failure is 25% of the shortfall.',
      actionTemplate: 'initiate_rmd',
      createdAt: daysAgo(2),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { estimatedRMD: 348_000, daysUntilDeadline: 45, penaltyRate: 0.25 },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'rmd_deadline_approaching',
      ruleName: 'RMD Deadline Approaching',
      category: 'COMPLIANCE',
      priority: 'critical',
      status: 'ACKNOWLEDGED',
      householdId: 'hh_015',
      householdName: 'The Yamamoto Estate',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Required Minimum Distribution of ~$260,000 has not been taken. Deadline is in 32 days.',
      actionTemplate: 'initiate_rmd',
      createdAt: daysAgo(8),
      acknowledgedAt: daysAgo(5),
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { estimatedRMD: 260_000, daysUntilDeadline: 32, penaltyRate: 0.25 },
    },

    // ---- REVENUE alerts ----
    {
      alertId: generateAlertId(),
      ruleId: 'large_aum_outflow',
      ruleName: 'Large AUM Outflow Detected',
      category: 'RETENTION',
      priority: 'critical',
      status: 'ACTIVE',
      householdId: 'hh_027',
      householdName: 'The Whitfield Trust',
      advisorId: 'adv_100' as AdvisorId,
      advisorName: 'Sarah Chen',
      message: 'An outflow of $450,000 was detected in the last 24 hours from The Whitfield Trust. This represents 5.1% of household AUM.',
      actionTemplate: 'call_client_now',
      createdAt: daysAgo(0),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { outflowAmount: 450_000, aum: 8_900_000, percentOfAum: 5.1 },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'billing_exception',
      ruleName: 'Billing Exception Detected',
      category: 'REVENUE',
      priority: 'high',
      status: 'ACTIVE',
      householdId: 'hh_004',
      householdName: 'The Patel Household',
      advisorId: 'adv_101' as AdvisorId,
      advisorName: 'Michael Torres',
      message: 'Fee discrepancy of $1,240 detected during Q3 billing reconciliation. Billed rate (0.72%) differs from contract rate (0.75%).',
      actionTemplate: 'review_billing',
      createdAt: daysAgo(5),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { discrepancyAmount: 1_240, billedRate: 0.0072, contractRate: 0.0075, quarter: 'Q3' },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'billing_exception',
      ruleName: 'Billing Exception Detected',
      category: 'REVENUE',
      priority: 'high',
      status: 'RESOLVED',
      householdId: 'hh_012',
      householdName: 'The Lee Household',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Unbilled period detected for July. Issue was resolved -- billing has been corrected.',
      actionTemplate: 'review_billing',
      createdAt: daysAgo(14),
      acknowledgedAt: daysAgo(12),
      resolvedAt: daysAgo(7),
      snoozedUntil: null,
      metadata: { period: 'July', resolution: 'Billing corrected and invoice re-issued' },
    },

    // ---- OPERATIONS alerts ----
    {
      alertId: generateAlertId(),
      ruleId: 'custodian_sync_failed',
      ruleName: 'Custodian Sync Failed',
      category: 'OPERATIONS',
      priority: 'critical',
      status: 'ACTIVE',
      householdId: null,
      householdName: null,
      advisorId: 'adv_ops' as AdvisorId,
      advisorName: 'Operations Team',
      message: 'Schwab custodian data sync job failed at 03:14 AM. 142 accounts may have stale position data. Error: connection timeout after 30s.',
      actionTemplate: 'investigate_sync_error',
      createdAt: daysAgo(0),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { custodian: 'Schwab', batchId: '2024-Q3-042', affectedAccounts: 142, errorType: 'connection_timeout' },
    },
    {
      alertId: generateAlertId(),
      ruleId: 'custodian_sync_failed',
      ruleName: 'Custodian Sync Failed',
      category: 'OPERATIONS',
      priority: 'critical',
      status: 'RESOLVED',
      householdId: null,
      householdName: null,
      advisorId: 'adv_ops' as AdvisorId,
      advisorName: 'Operations Team',
      message: 'Fidelity custodian sync job recovered after automatic retry. All 89 accounts updated.',
      actionTemplate: 'investigate_sync_error',
      createdAt: daysAgo(3),
      acknowledgedAt: daysAgo(3),
      resolvedAt: daysAgo(3),
      snoozedUntil: null,
      metadata: { custodian: 'Fidelity', batchId: '2024-Q3-038', affectedAccounts: 89, resolution: 'Auto-retried successfully' },
    },

    // ---- Additional RETENTION (snoozed) ----
    {
      alertId: generateAlertId(),
      ruleId: 'churn_risk_elevated',
      ruleName: 'Client Churn Risk Elevated',
      category: 'RETENTION',
      priority: 'high',
      status: 'SNOOZED',
      householdId: 'hh_024',
      householdName: 'The Mitchell Family',
      advisorId: 'adv_100' as AdvisorId,
      advisorName: 'Sarah Chen',
      message: 'Churn model score 52 (elevated). No contact in 78 days. Proposal declined. AUM: $2.6M.',
      actionTemplate: 'outreach_call',
      createdAt: daysAgo(10),
      acknowledgedAt: daysAgo(9),
      resolvedAt: null,
      snoozedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { churnScore: 52, aum: 2_600_000, daysSinceContact: 78 },
    },

    // ---- Additional PLANNING (dismissed) ----
    {
      alertId: generateAlertId(),
      ruleId: 'roth_conversion_window',
      ruleName: 'Roth Conversion Window Open',
      category: 'PLANNING',
      priority: 'normal',
      status: 'DISMISSED',
      householdId: 'hh_005',
      householdName: 'The O\'Brien Trust',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Roth conversion headroom of $42,000. Advisor dismissed -- client prefers to defer.',
      actionTemplate: 'generate_roth_analysis',
      createdAt: daysAgo(15),
      acknowledgedAt: daysAgo(13),
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { headroom: 42_000, dismissReason: 'Client prefers to defer conversion' },
    },

    // ---- Additional RETENTION alert ----
    {
      alertId: generateAlertId(),
      ruleId: 'no_contact_high_value',
      ruleName: 'No Advisor Contact -- High Value Client',
      category: 'RETENTION',
      priority: 'high',
      status: 'ACTIVE',
      householdId: 'hh_026',
      householdName: 'The Goldstein Family',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'High-value client with $6.2M AUM has had no advisor contact in 70 days. Recent life event detected.',
      actionTemplate: 'schedule_check_in',
      createdAt: daysAgo(5),
      acknowledgedAt: null,
      resolvedAt: null,
      snoozedUntil: null,
      metadata: { aum: 6_200_000, daysSinceContact: 70 },
    },

    // ---- Additional COMPLIANCE (resolved) ----
    {
      alertId: generateAlertId(),
      ruleId: 'rmd_deadline_approaching',
      ruleName: 'RMD Deadline Approaching',
      category: 'COMPLIANCE',
      priority: 'critical',
      status: 'RESOLVED',
      householdId: 'hh_005',
      householdName: 'The O\'Brien Trust',
      advisorId: 'adv_102' as AdvisorId,
      advisorName: 'Jennifer Park',
      message: 'Required Minimum Distribution of $165,000 was successfully processed.',
      actionTemplate: 'initiate_rmd',
      createdAt: daysAgo(20),
      acknowledgedAt: daysAgo(18),
      resolvedAt: daysAgo(12),
      snoozedUntil: null,
      metadata: { rmdAmount: 165_000, resolution: 'Distribution processed via Schwab' },
    },
  ];

  return alerts;
}

// =============================================================================
// Alert Evaluation
// =============================================================================

/**
 * Evaluates all enabled alert rules against current demo data for a firm.
 *
 * In production, this function would query BigQuery views and operational
 * databases to evaluate each rule's conditions. In demo mode, it returns
 * pre-seeded alerts from the in-memory store.
 *
 * @param firmId - The firm to evaluate rules for.
 * @param advisorId - Optional advisor filter to restrict evaluation scope.
 * @returns An array of newly generated Alert objects.
 */
export function evaluateAlertRules(
  firmId: FirmId,
  advisorId?: AdvisorId
): Alert[] {
  // Lazily seed demo alerts on first access
  if (!demoAlerts) {
    demoAlerts = seedDemoAlerts(firmId);
  }

  // In demo mode, return the seeded active alerts (optionally filtered by advisor)
  let results = demoAlerts.filter((a) => a.status === 'ACTIVE');

  if (advisorId) {
    results = results.filter((a) => a.advisorId === advisorId);
  }

  return results;
}

// =============================================================================
// Alert Retrieval & Filtering
// =============================================================================

/**
 * Retrieves alerts with optional filters for advisor, category, priority,
 * and status.
 *
 * @param firmId - The firm to retrieve alerts for.
 * @param filters - Optional filter criteria.
 * @returns A filtered array of Alert objects.
 */
export function getActiveAlerts(
  firmId: FirmId,
  filters?: {
    advisorId?: AdvisorId;
    category?: AlertCategory;
    priority?: AlertPriority;
    status?: AlertStatus;
  }
): Alert[] {
  // Lazily seed demo alerts
  if (!demoAlerts) {
    demoAlerts = seedDemoAlerts(firmId);
  }

  let results = [...demoAlerts];

  if (filters) {
    if (filters.advisorId) {
      results = results.filter((a) => a.advisorId === filters.advisorId);
    }
    if (filters.category) {
      results = results.filter((a) => a.category === filters.category);
    }
    if (filters.priority) {
      results = results.filter((a) => a.priority === filters.priority);
    }
    if (filters.status) {
      results = results.filter((a) => a.status === filters.status);
    }
  }

  return results;
}

// =============================================================================
// Alert Lifecycle Management
// =============================================================================

/**
 * Finds an alert by its alertId in the demo store. Throws if not found.
 */
function findAlertByAlertId(id: AlertId): Alert {
  if (!demoAlerts) {
    throw new Error('Alert store not initialized. Call evaluateAlertRules or getActiveAlerts first.');
  }

  const alert = demoAlerts.find((a) => a.alertId === id);
  if (!alert) {
    throw new Error(`Alert not found: ${String(id)}`);
  }

  return alert;
}

/**
 * Marks an alert as acknowledged by the advisor.
 *
 * Acknowledged alerts remain visible in the dashboard but are visually
 * distinguished from new (unacknowledged) alerts.
 *
 * @param alertId - The unique identifier of the alert to acknowledge.
 * @returns The updated Alert object.
 * @throws Error if the alert is not found or already resolved/dismissed.
 */
export function acknowledgeAlert(alertId: AlertId): Alert {
  const alert = findAlertByAlertId(alertId);

  if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
    throw new Error(`Cannot acknowledge an alert with status "${alert.status}".`);
  }

  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedAt = new Date().toISOString();

  return { ...alert };
}

/**
 * Marks an alert as resolved. Resolved alerts are archived and no longer
 * appear in the active alert feed.
 *
 * @param alertId - The unique identifier of the alert to resolve.
 * @returns The updated Alert object.
 * @throws Error if the alert is not found or already resolved.
 */
export function resolveAlert(alertId: AlertId): Alert {
  const alert = findAlertByAlertId(alertId);

  if (alert.status === 'RESOLVED') {
    throw new Error('Alert is already resolved.');
  }

  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date().toISOString();

  return { ...alert };
}

/**
 * Snoozes an alert for a specified number of days. While snoozed, the
 * alert will not appear in the active alert feed but will resurface
 * when the snooze period expires.
 *
 * @param alertId - The unique identifier of the alert to snooze.
 * @param days - Number of days to snooze. Must be between 1 and 90.
 * @returns The updated Alert object.
 * @throws Error if the alert is not found, already resolved, or days is invalid.
 */
export function snoozeAlert(alertId: AlertId, days: number): Alert {
  if (days < 1 || days > 90) {
    throw new Error('Snooze duration must be between 1 and 90 days.');
  }

  const alert = findAlertByAlertId(alertId);

  if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
    throw new Error(`Cannot snooze an alert with status "${alert.status}".`);
  }

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + days);

  alert.status = 'SNOOZED';
  alert.snoozedUntil = snoozedUntil.toISOString();

  return { ...alert };
}

/**
 * Dismisses an alert permanently. Dismissed alerts will not resurface
 * and are excluded from all future alert feeds.
 *
 * @param alertId - The unique identifier of the alert to dismiss.
 * @returns The updated Alert object.
 * @throws Error if the alert is not found or already resolved/dismissed.
 */
export function dismissAlert(alertId: AlertId): Alert {
  const alert = findAlertByAlertId(alertId);

  if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
    throw new Error(`Cannot dismiss an alert with status "${alert.status}".`);
  }

  alert.status = 'DISMISSED';

  return { ...alert };
}

// =============================================================================
// Alert Summary & Analytics
// =============================================================================

/**
 * Computes a count of alerts grouped by category.
 *
 * @param alerts - The array of alerts to summarize.
 * @returns A record mapping each AlertCategory to its count.
 */
export function getAlertSummary(alerts: Alert[]): Record<AlertCategory, number> {
  const summary: Record<string, number> = {
    RETENTION: 0,
    PLANNING: 0,
    COMPLIANCE: 0,
    REVENUE: 0,
    OPERATIONS: 0,
    GROWTH: 0,
  };

  for (const alert of alerts) {
    const cat = alert.category as string;
    if (cat in summary) {
      summary[cat]++;
    } else {
      summary[cat] = 1;
    }
  }

  return summary as Record<AlertCategory, number>;
}

/**
 * Computes a count of alerts grouped by priority.
 *
 * @param alerts - The array of alerts to summarize.
 * @returns A record mapping each AlertPriority to its count.
 */
export function getAlertPrioritySummary(
  alerts: Alert[]
): Record<AlertPriority, number> {
  const summary: Record<string, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  for (const alert of alerts) {
    const pri = alert.priority as string;
    if (pri in summary) {
      summary[pri]++;
    } else {
      summary[pri] = 1;
    }
  }

  return summary as Record<AlertPriority, number>;
}

// =============================================================================
// Notification Routing
// =============================================================================

/**
 * Determines which notification channels should be triggered for a
 * given alert based on the matching rule's notification configuration
 * and the alert's metadata.
 *
 * Returns a deduplicated list of AlertChannel values.
 *
 * @param alert - The alert to route notifications for.
 * @returns An array of AlertChannel strings.
 */
export function routeAlertNotifications(alert: Alert): AlertChannel[] {
  // Find the matching rule
  const rule = ALERT_RULES.find((r) => r.id === alert.ruleId);
  if (!rule) {
    return ['DASHBOARD'];
  }

  // Start with the rule's configured channels
  const channels: Set<AlertChannel> = new Set(rule.channels);

  // Evaluate MD escalation
  if (typeof rule.notifyMD === 'function') {
    if (rule.notifyMD(alert.metadata)) {
      channels.add('EMAIL');
      channels.add('SLACK');
    }
  } else if (rule.notifyMD === true) {
    channels.add('EMAIL');
    channels.add('SLACK');
  }

  // Operations alerts always include SLACK
  if (rule.notifyOps) {
    channels.add('SLACK');
  }

  return [...channels];
}

/**
 * Returns the alert rule definition for a given rule ID, or null if
 * no matching rule is found.
 *
 * @param ruleId - The rule identifier to look up.
 * @returns The matching AlertRule, or null.
 */
export function getAlertRule(ruleId: string): AlertRule | null {
  return ALERT_RULES.find((r) => r.id === ruleId) ?? null;
}

/**
 * Returns all alert rules, optionally filtered by category or active status.
 *
 * @param filters - Optional filters for category and active state.
 * @returns A filtered array of AlertRule objects.
 */
export function getAlertRules(
  filters?: { category?: AlertCategory; isActive?: boolean }
): AlertRule[] {
  let rules = [...ALERT_RULES];

  if (filters) {
    if (filters.category) {
      rules = rules.filter((r) => r.category === filters.category);
    }
    if (filters.isActive !== undefined) {
      rules = rules.filter((r) => r.isActive === filters.isActive);
    }
  }

  return rules;
}

/**
 * Resets the in-memory alert store. Useful for testing or re-seeding
 * demo data after mutations.
 */
export function resetAlertStore(): void {
  demoAlerts = null;
  alertIdCounter = 0;
}
