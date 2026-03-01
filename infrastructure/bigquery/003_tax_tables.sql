-- =============================================================================
-- Farther Prism — Tax Table Versions
-- =============================================================================
-- Stores versioned tax tables (federal brackets, state brackets, FICA,
-- standard deductions, credits, etc.) with full audit trail.
--
-- Each table type + filing status + tax year combination has exactly one
-- row with is_current = TRUE. When a new version is published, the old
-- version is archived (is_current = FALSE, replaced_by set).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `farther_tax_tables.tax_table_versions` (
  -- Primary identifier
  id              STRING      NOT NULL,

  -- Classification
  tax_year        INT64       NOT NULL,
  table_type      STRING      NOT NULL,   -- e.g. 'federal_brackets', 'state_brackets_CA', 'fica', 'deductions'
  filing_status   STRING      NOT NULL,   -- e.g. 'single', 'mfj', 'mfs', 'hoh', 'all'

  -- Version metadata
  effective_date  DATE        NOT NULL,
  source          STRING      NOT NULL,   -- e.g. 'IRS Rev. Proc. 2024-40'

  -- The actual table data (JSON-encoded)
  data            STRING      NOT NULL,

  -- Version control
  is_current      BOOL        NOT NULL DEFAULT TRUE,
  replaced_by     STRING,                 -- ID of the version that replaced this one

  -- Audit fields
  created_at      TIMESTAMP   NOT NULL,
  created_by      STRING      NOT NULL,
  validated_by    STRING,
  validation_notes STRING
)
PARTITION BY RANGE_BUCKET(tax_year, GENERATE_ARRAY(2020, 2040, 1))
CLUSTER BY table_type, filing_status
OPTIONS (
  description = 'Versioned tax tables for financial plan calculations. Each row contains the full table data as JSON with version control metadata.',
  labels = [('platform', 'farther_prism')]
);

-- =============================================================================
-- View: Current Tax Tables
-- =============================================================================
-- Convenience view that returns only the currently active version of each
-- table type, filing status, and tax year combination.
-- =============================================================================

CREATE OR REPLACE VIEW `farther_tax_tables.current_tables` AS
SELECT
  id,
  tax_year,
  table_type,
  filing_status,
  effective_date,
  source,
  data,
  created_at,
  created_by,
  validated_by,
  validation_notes
FROM `farther_tax_tables.tax_table_versions`
WHERE is_current = TRUE
ORDER BY tax_year DESC, table_type, filing_status;
