-- =============================================================================
-- Farther Prism — Update Engine Tables
-- =============================================================================
-- Tracks automated update engine runs and the regulatory/tax changes
-- detected during each run.
-- =============================================================================

-- Update engine run log
CREATE TABLE IF NOT EXISTS `farther_update_engine.update_runs` (
  -- Primary identifier
  id                STRING      NOT NULL,

  -- Timing
  started_at        TIMESTAMP   NOT NULL,
  completed_at      TIMESTAMP,            -- NULL if still running

  -- Run status
  status            STRING      NOT NULL, -- 'running', 'completed', 'failed', 'partial'
  trigger_type      STRING      NOT NULL, -- 'scheduled', 'manual', 'webhook', 'event'

  -- Run metrics
  sources_checked   INT64       NOT NULL DEFAULT 0,
  changes_detected  INT64       NOT NULL DEFAULT 0,
  changes_applied   INT64       NOT NULL DEFAULT 0,
  plans_affected    INT64       NOT NULL DEFAULT 0,

  -- Error information
  error_message     STRING                -- Non-null when status = 'failed'
)
PARTITION BY DATE(started_at)
CLUSTER BY status, trigger_type
OPTIONS (
  description = 'Log of automated update engine runs that check IRS, SSA, and state sources for regulatory changes.',
  labels = [('platform', 'farther_prism')]
);

-- Detected changes from update engine runs
CREATE TABLE IF NOT EXISTS `farther_update_engine.detected_changes` (
  -- Primary identifier
  id              STRING      NOT NULL,

  -- Parent run
  run_id          STRING      NOT NULL,   -- FK to update_runs.id

  -- Detection metadata
  detected_at     TIMESTAMP   NOT NULL,
  source_type     STRING      NOT NULL,   -- 'irs', 'ssa', 'state_dor', 'market', 'cms'
  source_id       STRING      NOT NULL,   -- e.g. 'irs_rev_proc_2025', 'ssa_cola_2026'
  change_type     STRING      NOT NULL,   -- 'new_version', 'correction', 'update', 'deletion'

  -- Change details
  description     STRING      NOT NULL,
  previous_value  STRING,                 -- JSON of prior value (NULL for new items)
  new_value       STRING      NOT NULL,   -- JSON of new value

  -- Processing status
  status          STRING      NOT NULL,   -- 'detected', 'validated', 'applied', 'rejected', 'error'
  confidence      FLOAT64     NOT NULL,   -- Validation confidence score (0.0 - 1.0)
  requires_review BOOL        NOT NULL DEFAULT FALSE,

  -- Review tracking
  reviewed_by     STRING,
  reviewed_at     TIMESTAMP
)
PARTITION BY DATE(detected_at)
CLUSTER BY source_type, status
OPTIONS (
  description = 'Individual regulatory/tax changes detected by the update engine, with validation status and review tracking.',
  labels = [('platform', 'farther_prism')]
);
