/**
 * Farther Prism — BigQuery Module
 *
 * Barrel file re-exporting all BigQuery types, client, queries, and
 * Monte Carlo utilities.
 */

// Types
export type {
  BigQueryConfig,
  PlanResultRow,
  MCPercentiles,
  AnnualProjectionRow,
  MCBandRow,
  GoalResultRow,
  TaxTableVersionRow,
  FirmSnapshotRow,
  AuditLogRow,
  UpdateRunRow,
  DetectedChangeRow,
} from './types';

// Client
export { BigQueryClient } from './bigquery-client';

// Federated queries
export {
  FIRM_DASHBOARD_QUERY,
  AT_RISK_PLANS_QUERY,
  TAX_TABLE_COMPARISON_QUERY,
  ADVISOR_PERFORMANCE_QUERY,
  CLIENT_WEALTH_DISTRIBUTION_QUERY,
  buildFederatedQuery,
} from './federated-queries';

// Monte Carlo
export type { MonteCarloConfig, MonteCarloOutput } from './monte-carlo-bq';
export {
  DEFAULT_MC_CONFIG,
  buildMonteCarloSQL,
  parseMonteCarloResult,
  MONTE_CARLO_STORED_PROCEDURE_SQL,
} from './monte-carlo-bq';
