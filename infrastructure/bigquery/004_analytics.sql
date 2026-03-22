-- =============================================================================
-- Farther Prism — Analytics Snapshots
-- =============================================================================
-- Daily snapshots of firm-level and advisor-level metrics for dashboards,
-- trend analysis, and reporting.
-- =============================================================================

-- Firm-level daily snapshot
CREATE TABLE IF NOT EXISTS `farther_analytics.firm_snapshots` (
  -- Dimensions
  snapshot_date     DATE      NOT NULL,
  firm_id           STRING    NOT NULL,

  -- Client metrics
  total_clients     INT64     NOT NULL,
  active_plans      INT64     NOT NULL,

  -- Financial metrics
  total_aum         FLOAT64   NOT NULL,

  -- Plan health metrics
  avg_success_rate  FLOAT64   NOT NULL,
  plans_on_track    INT64     NOT NULL,
  plans_at_risk     INT64     NOT NULL,

  -- Operational metrics
  critical_alerts   INT64     NOT NULL,
  open_tasks        INT64     NOT NULL
)
PARTITION BY snapshot_date
CLUSTER BY firm_id
OPTIONS (
  description = 'Daily firm-level analytics snapshots for dashboard trend analysis.',
  labels = [('platform', 'farther_prism')]
);

-- Advisor-level daily snapshot
CREATE TABLE IF NOT EXISTS `farther_analytics.advisor_snapshots` (
  -- Dimensions
  snapshot_date     DATE      NOT NULL,
  firm_id           STRING    NOT NULL,
  advisor_id        STRING    NOT NULL,

  -- Client metrics
  client_count      INT64     NOT NULL,
  active_plans      INT64     NOT NULL,

  -- Financial metrics
  total_aum         FLOAT64   NOT NULL,

  -- Plan health metrics
  avg_success_rate  FLOAT64   NOT NULL,
  min_success_rate  FLOAT64   NOT NULL,
  max_success_rate  FLOAT64   NOT NULL,
  plans_on_track    INT64     NOT NULL,
  plans_at_risk     INT64     NOT NULL,
  plans_critical    INT64     NOT NULL,

  -- Activity metrics
  plans_calculated_today  INT64   NOT NULL DEFAULT 0,
  client_meetings_today   INT64   NOT NULL DEFAULT 0,
  tasks_completed_today   INT64   NOT NULL DEFAULT 0
)
PARTITION BY snapshot_date
CLUSTER BY firm_id, advisor_id
OPTIONS (
  description = 'Daily advisor-level analytics snapshots for performance tracking and management reporting.',
  labels = [('platform', 'farther_prism')]
);
