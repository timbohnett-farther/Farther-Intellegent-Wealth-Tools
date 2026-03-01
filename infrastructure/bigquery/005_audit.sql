-- =============================================================================
-- Farther Prism — Audit / Activity Log
-- =============================================================================
-- Immutable audit trail of all user, advisor, admin, and system actions
-- across the Farther Prism platform. Required for SEC/FINRA compliance.
--
-- This table is append-only. Rows are never updated or deleted.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `farther_audit.activity_log` (
  -- Primary identifier
  id              STRING      NOT NULL,

  -- Event timing
  timestamp       TIMESTAMP   NOT NULL,

  -- Actor information
  actor_type      STRING      NOT NULL,   -- 'user', 'advisor', 'admin', 'system', 'api'
  actor_id        STRING      NOT NULL,
  actor_name      STRING      NOT NULL,
  ip_address      STRING,                 -- NULL for system actions

  -- Action details
  action          STRING      NOT NULL,   -- e.g. 'plan.calculate', 'tax_table.update', 'client.create'
  resource_type   STRING      NOT NULL,   -- e.g. 'plan', 'client', 'tax_table', 'report'
  resource_id     STRING      NOT NULL,

  -- Context (nullable foreign keys for cross-referencing)
  plan_id         STRING,
  client_id       STRING,
  firm_id         STRING,

  -- State snapshots (JSON-encoded, for before/after comparison)
  before_state    STRING,                 -- JSON snapshot before the action
  after_state     STRING,                 -- JSON snapshot after the action

  -- Session tracking
  session_id      STRING                  -- For correlating related actions
)
PARTITION BY DATE(timestamp)
CLUSTER BY firm_id, actor_type, action
OPTIONS (
  description = 'Immutable compliance audit trail for all platform actions. Append-only — rows are never updated or deleted.',
  labels = [('platform', 'farther_prism'), ('compliance', 'sec_finra')],
  require_partition_filter = FALSE
);
