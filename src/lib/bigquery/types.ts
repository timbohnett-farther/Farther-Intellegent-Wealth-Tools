/**
 * Farther Prism — BigQuery Type Definitions
 *
 * Type definitions for all BigQuery tables, views, and query results
 * used by the Farther Prism financial planning platform.
 *
 * These types are self-contained and do not depend on React, Next.js, or Prisma.
 */

// ==================== CONFIGURATION ====================

/** Configuration for connecting to BigQuery datasets used by Farther Prism. */
export interface BigQueryConfig {
  /** GCP project ID (e.g. "farther-prism-prod"). */
  projectId: string;
  /** Dataset for plan calculation results. */
  datasetPlans: string;
  /** Dataset for federal/state tax tables. */
  datasetTaxTables: string;
  /** Dataset for firm/advisor analytics snapshots. */
  datasetAnalytics: string;
  /** Dataset for audit / activity logs. */
  datasetAudit: string;
  /** Dataset for the automated update engine. */
  datasetUpdateEngine: string;
  /** Cloud SQL connection name for federated queries (e.g. "project:region:instance"). */
  cloudSqlConnection: string;
}

// ==================== PLAN RESULTS ====================

/**
 * A single row in the `plan_results` table.
 * Represents the top-level output of a full financial plan calculation.
 */
export interface PlanResultRow {
  /** Unique plan identifier (UUID). */
  planId: string;
  /** Firm that owns this plan. */
  firmId: string;
  /** Advisor responsible for this plan. */
  advisorId: string;
  /** Client this plan belongs to. */
  clientId: string;
  /** Scenario identifier (e.g. "base", "optimistic", "pessimistic"). */
  scenarioId: string;
  /** ISO-8601 timestamp when the calculation was performed. */
  calculatedAt: string;
  /** Monte Carlo probability of success (0.0 - 1.0). */
  probabilityOfSuccess: number;
  /** Number of Monte Carlo simulation runs. */
  mcRuns: number;
  /** Median terminal portfolio value across all MC runs. */
  mcMedianTerminalValue: number;
  /** Percentile breakpoints from MC simulation (JSON-encoded in BQ). */
  mcPercentiles: MCPercentiles;
  /** Total lifetime taxes projected. */
  totalTaxesLifetime: number;
  /** Average effective tax rate across plan horizon. */
  avgEffectiveTaxRate: number;
  /** Projected estate value at end of plan horizon. */
  projectedEstateValue: number;
  /** Projected estate tax due at plan horizon. */
  projectedEstateTaxDue: number;
}

/** Percentile breakpoints from Monte Carlo simulation. */
export interface MCPercentiles {
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

// ==================== ANNUAL PROJECTIONS ====================

/**
 * A single year's projection within a financial plan.
 * Stored as a nested ARRAY<STRUCT> in the plan_results table.
 */
export interface AnnualProjectionRow {
  /** Projection year (e.g. 2025, 2026, ...). */
  year: number;
  /** Client's age in this projection year. */
  clientAge: number;
  /** Co-client (spouse/partner) age, or null if no co-client. */
  coAge: number | null;
  /** Whether the client is retired in this year. */
  isRetired: boolean;

  // --- Income ---
  /** W-2 salary income. */
  salaryIncome: number;
  /** Self-employment income. */
  seIncome: number;
  /** Pension income. */
  pensionIncome: number;
  /** Gross Social Security — client. */
  ssClientGross: number;
  /** Gross Social Security — co-client. */
  ssCoGross: number;
  /** Taxable portion of Social Security. */
  ssTaxable: number;
  /** Rental / real estate income. */
  rentalIncome: number;
  /** Investment income (interest, non-qualified dividends). */
  investmentIncome: number;
  /** Qualified dividends. */
  qualifiedDividends: number;
  /** Capital gains realized. */
  capitalGains: number;
  /** Required minimum distribution income. */
  rmdIncome: number;
  /** Roth distributions (tax-free). */
  rothDistributions: number;
  /** Annuity income. */
  annuityIncome: number;
  /** Business / pass-through distributions. */
  businessDistributions: number;
  /** Total gross income for the year. */
  totalGrossIncome: number;
  /** Adjusted gross income. */
  agi: number;

  // --- Expenses ---
  /** Core living expenses. */
  livingExpenses: number;
  /** Healthcare premiums (including Medicare). */
  healthcarePremiums: number;
  /** Long-term care expenses. */
  ltcExpenses: number;
  /** Goal-specific withdrawals. */
  goalWithdrawals: number;
  /** Debt service payments. */
  debtPayments: number;
  /** Total expenses for the year. */
  totalExpenses: number;

  // --- Taxes ---
  /** Federal income tax. */
  federalTax: number;
  /** State income tax. */
  stateTax: number;
  /** Self-employment tax. */
  seTax: number;
  /** Net Investment Income Tax (3.8%). */
  niit: number;
  /** Total tax liability. */
  totalTax: number;
  /** Effective federal tax rate. */
  effectiveFedRate: number;
  /** Marginal tax rate. */
  marginalRate: number;

  // --- Balance Sheet ---
  /** Taxable brokerage / investment portfolio value. */
  taxablePortfolio: number;
  /** Tax-deferred (401k, IRA) portfolio value. */
  taxDeferredPortfolio: number;
  /** Tax-free (Roth) portfolio value. */
  taxFreePortfolio: number;
  /** Total investable assets. */
  totalInvestable: number;
  /** Real estate value. */
  realEstateValue: number;
  /** Total assets. */
  totalAssets: number;
  /** Total liabilities. */
  totalLiabilities: number;
  /** Net worth. */
  netWorth: number;

  // --- Cash Flow ---
  /** Surplus or deficit after all income, expenses, and taxes. */
  surplusDeficit: number;
  /** Contributions to investment portfolios. */
  portfolioContributions: number;
  /** Withdrawals from investment portfolios. */
  portfolioWithdrawals: number;
  /** Roth conversion amount for this year. */
  rothConversion: number;
}

// ==================== MONTE CARLO BAND ====================

/** A single row of Monte Carlo confidence band data by year. */
export interface MCBandRow {
  /** Projection year. */
  year: number;
  /** 5th percentile portfolio value. */
  p5: number;
  /** 10th percentile portfolio value. */
  p10: number;
  /** 25th percentile portfolio value. */
  p25: number;
  /** 50th percentile (median) portfolio value. */
  p50: number;
  /** 75th percentile portfolio value. */
  p75: number;
  /** 90th percentile portfolio value. */
  p90: number;
  /** 95th percentile portfolio value. */
  p95: number;
}

// ==================== GOAL RESULTS ====================

/** Result of a single financial goal within a plan. */
export interface GoalResultRow {
  /** Unique goal identifier. */
  goalId: string;
  /** Human-readable goal name. */
  goalName: string;
  /** Type of goal. */
  goalType: string;
  /** Target dollar amount. */
  targetAmount: number;
  /** Target year for the goal. */
  targetYear: number;
  /** Monte Carlo probability of achieving this goal (0.0 - 1.0). */
  probability: number;
  /** Ratio of projected funding to target (e.g. 0.95 = 95% funded). */
  fundedRatio: number;
  /** Whether the goal is currently on track. */
  onTrack: boolean;
}

// ==================== TAX TABLE VERSIONS ====================

/**
 * A versioned tax table stored in BigQuery.
 * Supports federal brackets, state brackets, FICA, deductions, credits, etc.
 */
export interface TaxTableVersionRow {
  /** Unique version identifier (UUID). */
  id: string;
  /** Tax year this table applies to (e.g. 2025). */
  taxYear: number;
  /** Type of table (e.g. "federal_brackets", "state_brackets_CA", "fica", "deductions"). */
  tableType: string;
  /** Filing status (e.g. "single", "mfj", "mfs", "hoh") or "all" for universal tables. */
  filingStatus: string;
  /** ISO-8601 date when this version became effective. */
  effectiveDate: string;
  /** Source of the data (e.g. "IRS Rev. Proc. 2024-40", "manual_entry"). */
  source: string;
  /** The actual table data as a JSON string. */
  data: string;
  /** Whether this is the current active version. */
  isCurrent: boolean;
  /** ID of the version that replaced this one, or null if current. */
  replacedBy: string | null;
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** User or system identity that created this version. */
  createdBy: string;
  /** User or system identity that validated this version. */
  validatedBy: string | null;
  /** Notes from the validation process. */
  validationNotes: string | null;
}

// ==================== FIRM ANALYTICS ====================

/** Daily snapshot of firm-level analytics. */
export interface FirmSnapshotRow {
  /** ISO-8601 date of the snapshot. */
  snapshotDate: string;
  /** Firm identifier. */
  firmId: string;
  /** Total number of clients in the firm. */
  totalClients: number;
  /** Number of active financial plans. */
  activePlans: number;
  /** Total assets under management. */
  totalAum: number;
  /** Average Monte Carlo success rate across all plans (0.0 - 1.0). */
  avgSuccessRate: number;
  /** Number of plans considered "on track". */
  plansOnTrack: number;
  /** Number of plans considered "at risk". */
  plansAtRisk: number;
  /** Number of critical alerts. */
  criticalAlerts: number;
  /** Number of open advisor tasks. */
  openTasks: number;
}

// ==================== AUDIT LOG ====================

/** A single entry in the activity / audit log. */
export interface AuditLogRow {
  /** Unique log entry identifier (UUID). */
  id: string;
  /** ISO-8601 timestamp of the event. */
  timestamp: string;
  /** Type of actor that triggered the event. */
  actorType: 'user' | 'advisor' | 'admin' | 'system' | 'api';
  /** Unique identifier of the actor. */
  actorId: string;
  /** Human-readable name of the actor. */
  actorName: string;
  /** IP address of the request origin (null for system actions). */
  ipAddress: string | null;
  /** Action performed (e.g. "plan.calculate", "tax_table.update", "client.create"). */
  action: string;
  /** Type of resource affected. */
  resourceType: string;
  /** Identifier of the affected resource. */
  resourceId: string;
  /** Associated plan ID, if applicable. */
  planId: string | null;
  /** Associated client ID, if applicable. */
  clientId: string | null;
  /** Associated firm ID, if applicable. */
  firmId: string | null;
  /** JSON snapshot of the resource state before the action, or null. */
  beforeState: string | null;
  /** JSON snapshot of the resource state after the action, or null. */
  afterState: string | null;
  /** Session identifier for correlating related actions. */
  sessionId: string | null;
}

// ==================== UPDATE ENGINE ====================

/** A single run of the automated update engine. */
export interface UpdateRunRow {
  /** Unique run identifier (UUID). */
  id: string;
  /** ISO-8601 timestamp when the run started. */
  startedAt: string;
  /** ISO-8601 timestamp when the run completed, or null if still running. */
  completedAt: string | null;
  /** Run status. */
  status: 'running' | 'completed' | 'failed' | 'partial';
  /** Trigger type. */
  triggerType: 'scheduled' | 'manual' | 'webhook' | 'event';
  /** Number of sources checked. */
  sourcesChecked: number;
  /** Number of changes detected. */
  changesDetected: number;
  /** Number of changes applied. */
  changesApplied: number;
  /** Number of plans affected by applied changes. */
  plansAffected: number;
  /** Error message if status is 'failed'. */
  errorMessage: string | null;
}

/** A single change detected by the update engine during a run. */
export interface DetectedChangeRow {
  /** Unique change identifier (UUID). */
  id: string;
  /** ID of the update run that detected this change. */
  runId: string;
  /** ISO-8601 timestamp of detection. */
  detectedAt: string;
  /** Type of source that changed (e.g. "irs", "ssa", "state_dor", "market"). */
  sourceType: string;
  /** Specific source identifier (e.g. "irs_rev_proc_2025", "ssa_cola_2026"). */
  sourceId: string;
  /** Type of change detected. */
  changeType: 'new_version' | 'correction' | 'update' | 'deletion';
  /** Human-readable description of the change. */
  description: string;
  /** JSON representation of the previous value, or null for new items. */
  previousValue: string | null;
  /** JSON representation of the new value. */
  newValue: string;
  /** Processing status. */
  status: 'detected' | 'validated' | 'applied' | 'rejected' | 'error';
  /** Confidence score from the validation step (0.0 - 1.0). */
  confidence: number;
  /** Whether this change requires human review. */
  requiresReview: boolean;
  /** ID of the reviewer, if reviewed. */
  reviewedBy: string | null;
  /** ISO-8601 timestamp of review, if reviewed. */
  reviewedAt: string | null;
}
