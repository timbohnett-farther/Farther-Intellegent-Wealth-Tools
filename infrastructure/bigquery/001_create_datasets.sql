-- =============================================================================
-- Farther Prism — BigQuery Dataset Definitions
-- =============================================================================
-- Creates the five core datasets used by the Farther Prism platform.
-- Run this script first before creating any tables.
-- =============================================================================

-- Plan calculation results: Monte Carlo outputs, annual projections, goal results
CREATE SCHEMA IF NOT EXISTS `farther_plans`
OPTIONS (
  description = 'Farther Prism financial plan calculation results including Monte Carlo simulations, annual projections, and goal tracking.',
  location = 'US',
  default_table_expiration_ms = NULL,
  labels = [('platform', 'farther_prism'), ('env', 'production')]
);

-- Tax table versions: federal brackets, state brackets, FICA, deductions, credits
CREATE SCHEMA IF NOT EXISTS `farther_tax_tables`
OPTIONS (
  description = 'Versioned tax tables for federal and state income tax brackets, FICA rates, standard deductions, and credits used in financial plan calculations.',
  location = 'US',
  default_table_expiration_ms = NULL,
  labels = [('platform', 'farther_prism'), ('env', 'production')]
);

-- Analytics snapshots: firm-level and advisor-level daily/weekly metrics
CREATE SCHEMA IF NOT EXISTS `farther_analytics`
OPTIONS (
  description = 'Aggregated analytics snapshots for firm dashboards, advisor performance metrics, and wealth distribution reporting.',
  location = 'US',
  default_table_expiration_ms = NULL,
  labels = [('platform', 'farther_prism'), ('env', 'production')]
);

-- Audit / activity log: all user and system actions for compliance
CREATE SCHEMA IF NOT EXISTS `farther_audit`
OPTIONS (
  description = 'Compliance audit trail capturing all user, advisor, admin, and system actions across the Farther Prism platform.',
  location = 'US',
  default_table_expiration_ms = NULL,
  labels = [('platform', 'farther_prism'), ('env', 'production')]
);

-- Update engine: automated scraping runs and detected regulatory changes
CREATE SCHEMA IF NOT EXISTS `farther_update_engine`
OPTIONS (
  description = 'Automated update engine run logs and detected regulatory/tax changes from IRS, SSA, and state sources.',
  location = 'US',
  default_table_expiration_ms = NULL,
  labels = [('platform', 'farther_prism'), ('env', 'production')]
);
