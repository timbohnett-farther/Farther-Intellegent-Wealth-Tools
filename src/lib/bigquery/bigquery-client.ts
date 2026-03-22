/**
 * Farther Prism — BigQuery Operations Client
 *
 * Provides typed methods for reading and writing to BigQuery datasets
 * used by the Farther Prism financial planning platform.
 *
 * All methods use a stub/demo pattern: they log the intended BigQuery
 * operation and return realistic demo data. Comments show the real
 * BigQuery SQL that would execute in production.
 *
 * This module is self-contained and does not depend on React, Next.js, or Prisma.
 */

import type {
  BigQueryConfig,
  PlanResultRow,
  AnnualProjectionRow,
  MCBandRow,
  GoalResultRow,
  TaxTableVersionRow,
  FirmSnapshotRow,
  AuditLogRow,
  UpdateRunRow,
  DetectedChangeRow,
} from './types';

// ==================== LOGGING HELPER ====================

/** Simple logger for demo/stub mode. */
function logBQ(method: string, detail: string): void {
  console.log(`[BigQuery:${method}] ${detail}`);
}

// ==================== DEMO DATA GENERATORS ====================

function demoPlanResult(planId: string): PlanResultRow {
  return {
    planId,
    firmId: 'firm_demo_001',
    advisorId: 'adv_demo_001',
    clientId: 'client_demo_001',
    scenarioId: 'base',
    calculatedAt: new Date().toISOString(),
    probabilityOfSuccess: 0.87,
    mcRuns: 10000,
    mcMedianTerminalValue: 4_250_000,
    mcPercentiles: {
      p5: 1_200_000,
      p10: 1_800_000,
      p25: 2_900_000,
      p50: 4_250_000,
      p75: 5_800_000,
      p90: 7_500_000,
      p95: 9_100_000,
    },
    totalTaxesLifetime: 1_850_000,
    avgEffectiveTaxRate: 0.224,
    projectedEstateValue: 5_100_000,
    projectedEstateTaxDue: 320_000,
  };
}

function demoTaxTable(taxYear: number, tableType: string): TaxTableVersionRow {
  return {
    id: 'ttv_demo_001',
    taxYear,
    tableType,
    filingStatus: 'all',
    effectiveDate: `${taxYear}-01-01`,
    source: 'IRS Rev. Proc. 2024-40',
    data: JSON.stringify({
      brackets: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: Infinity, rate: 0.37 },
      ],
    }),
    isCurrent: true,
    replacedBy: null,
    createdAt: new Date().toISOString(),
    createdBy: 'system:update_engine',
    validatedBy: 'system:validator',
    validationNotes: 'Auto-validated against IRS source document.',
  };
}

function demoFirmSnapshot(firmId: string, startDate: string, endDate: string): FirmSnapshotRow[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const snapshots: FirmSnapshotRow[] = [];
  const current = new Date(start);

  while (current <= end) {
    snapshots.push({
      snapshotDate: current.toISOString().split('T')[0],
      firmId,
      totalClients: 342,
      activePlans: 298,
      totalAum: 1_450_000_000,
      avgSuccessRate: 0.84 + Math.random() * 0.04,
      plansOnTrack: 251,
      plansAtRisk: 47,
      criticalAlerts: Math.floor(Math.random() * 5),
      openTasks: 23 + Math.floor(Math.random() * 10),
    });
    current.setDate(current.getDate() + 1);
  }

  return snapshots;
}

// ==================== BIG QUERY CLIENT ====================

/**
 * Client for BigQuery operations in the Farther Prism platform.
 *
 * In production, this would use the `@google-cloud/bigquery` SDK.
 * This implementation uses a stub/demo pattern that logs operations
 * and returns realistic demo data.
 */
export class BigQueryClient {
  private config: BigQueryConfig;

  constructor(config: BigQueryConfig) {
    this.config = config;
    logBQ('constructor', `Initialized for project ${config.projectId}`);
  }

  // ==================== PLAN RESULTS ====================

  /**
   * Streams plan calculation results to BigQuery.
   *
   * Writes the top-level result, annual projections (as nested STRUCT),
   * Monte Carlo bands, and goal results.
   */
  async writePlanResults(
    result: PlanResultRow,
    projections: AnnualProjectionRow[],
    mcBands: MCBandRow[],
    goals: GoalResultRow[],
  ): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetPlans}.plan_results`
    //   (plan_id, firm_id, advisor_id, client_id, scenario_id, calculated_at,
    //    probability_of_success, mc_runs, mc_median_terminal_value, mc_percentiles,
    //    total_taxes_lifetime, avg_effective_tax_rate, projected_estate_value,
    //    projected_estate_tax_due, annual_projections, mc_bands, goal_results)
    // VALUES (...)

    logBQ(
      'writePlanResults',
      `Writing plan result for plan=${result.planId}, scenario=${result.scenarioId}. ` +
        `Projections: ${projections.length} years, MC bands: ${mcBands.length}, Goals: ${goals.length}`,
    );
    logBQ(
      'writePlanResults',
      `Would stream to ${this.config.projectId}.${this.config.datasetPlans}.plan_results`,
    );
  }

  /**
   * Reads the most recent calculation result for a plan.
   */
  async getLatestPlanResult(planId: string): Promise<PlanResultRow | null> {
    // Real BigQuery SQL:
    // SELECT * FROM `${projectId}.${datasetPlans}.plan_results`
    // WHERE plan_id = @planId
    // ORDER BY calculated_at DESC
    // LIMIT 1

    logBQ(
      'getLatestPlanResult',
      `Querying latest result for plan=${planId} ` +
        `from ${this.config.projectId}.${this.config.datasetPlans}.plan_results`,
    );

    return demoPlanResult(planId);
  }

  // ==================== TAX TABLES ====================

  /**
   * Reads the current (active) tax tables for a given year and optional type.
   */
  async getCurrentTaxTables(
    taxYear: number,
    tableType?: string,
  ): Promise<TaxTableVersionRow[]> {
    // Real BigQuery SQL:
    // SELECT * FROM `${projectId}.${datasetTaxTables}.tax_table_versions`
    // WHERE tax_year = @taxYear
    //   AND is_current = TRUE
    //   AND (@tableType IS NULL OR table_type = @tableType)
    // ORDER BY table_type, filing_status

    const typeClause = tableType ? ` AND table_type='${tableType}'` : '';
    logBQ(
      'getCurrentTaxTables',
      `Querying current tables for year=${taxYear}${typeClause} ` +
        `from ${this.config.projectId}.${this.config.datasetTaxTables}.tax_table_versions`,
    );

    const effectiveType = tableType ?? 'federal_brackets';
    return [demoTaxTable(taxYear, effectiveType)];
  }

  /**
   * Writes a new tax table version to BigQuery.
   * Also sets `is_current = TRUE` for the new version.
   */
  async writeTaxTableVersion(version: TaxTableVersionRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetTaxTables}.tax_table_versions`
    //   (id, tax_year, table_type, filing_status, effective_date, source,
    //    data, is_current, replaced_by, created_at, created_by,
    //    validated_by, validation_notes)
    // VALUES (...)

    logBQ(
      'writeTaxTableVersion',
      `Writing tax table version id=${version.id}, ` +
        `year=${version.taxYear}, type=${version.tableType}, ` +
        `filing=${version.filingStatus}`,
    );
    logBQ(
      'writeTaxTableVersion',
      `Would insert into ${this.config.projectId}.${this.config.datasetTaxTables}.tax_table_versions`,
    );
  }

  /**
   * Archives a tax table version by setting is_current = FALSE
   * and recording the replacement version ID.
   */
  async archiveTaxTableVersion(
    versionId: string,
    replacedById: string,
  ): Promise<void> {
    // Real BigQuery SQL:
    // UPDATE `${projectId}.${datasetTaxTables}.tax_table_versions`
    // SET is_current = FALSE, replaced_by = @replacedById
    // WHERE id = @versionId

    logBQ(
      'archiveTaxTableVersion',
      `Archiving version=${versionId}, replaced by=${replacedById} ` +
        `in ${this.config.projectId}.${this.config.datasetTaxTables}.tax_table_versions`,
    );
  }

  // ==================== ANALYTICS ====================

  /**
   * Writes a daily firm analytics snapshot.
   */
  async writeFirmSnapshot(snapshot: FirmSnapshotRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetAnalytics}.firm_snapshots`
    //   (snapshot_date, firm_id, total_clients, active_plans, total_aum,
    //    avg_success_rate, plans_on_track, plans_at_risk, critical_alerts, open_tasks)
    // VALUES (...)

    logBQ(
      'writeFirmSnapshot',
      `Writing firm snapshot for firm=${snapshot.firmId}, ` +
        `date=${snapshot.snapshotDate}, clients=${snapshot.totalClients}, ` +
        `AUM=$${(snapshot.totalAum / 1e9).toFixed(2)}B`,
    );
  }

  /**
   * Queries firm analytics snapshots for a date range.
   */
  async queryFirmAnalytics(
    firmId: string,
    startDate: string,
    endDate: string,
  ): Promise<FirmSnapshotRow[]> {
    // Real BigQuery SQL:
    // SELECT * FROM `${projectId}.${datasetAnalytics}.firm_snapshots`
    // WHERE firm_id = @firmId
    //   AND snapshot_date BETWEEN @startDate AND @endDate
    // ORDER BY snapshot_date ASC

    logBQ(
      'queryFirmAnalytics',
      `Querying firm analytics for firm=${firmId}, ` +
        `range=${startDate} to ${endDate}`,
    );

    return demoFirmSnapshot(firmId, startDate, endDate);
  }

  /**
   * Queries advisor-level performance metrics for a firm.
   */
  async queryAdvisorPerformance(
    firmId: string,
  ): Promise<
    Array<{
      advisorId: string;
      advisorName: string;
      clientCount: number;
      totalAum: number;
      avgSuccessRate: number;
      plansOnTrack: number;
      plansAtRisk: number;
    }>
  > {
    // Real BigQuery SQL:
    // SELECT
    //   pr.advisor_id,
    //   ANY_VALUE(cs.advisor_name) AS advisor_name,
    //   COUNT(DISTINCT pr.client_id) AS client_count,
    //   SUM(proj.total_investable) AS total_aum,
    //   AVG(pr.probability_of_success) AS avg_success_rate,
    //   COUNTIF(pr.probability_of_success >= 0.80) AS plans_on_track,
    //   COUNTIF(pr.probability_of_success < 0.80) AS plans_at_risk
    // FROM `${projectId}.${datasetPlans}.plan_results` pr
    // LEFT JOIN EXTERNAL_QUERY("${cloudSqlConnection}",
    //   "SELECT id, first_name || ' ' || last_name AS advisor_name FROM advisors") cs
    //   ON pr.advisor_id = cs.id
    // WHERE pr.firm_id = @firmId
    //   AND pr.calculated_at = (
    //     SELECT MAX(calculated_at) FROM `${projectId}.${datasetPlans}.plan_results` sub
    //     WHERE sub.plan_id = pr.plan_id
    //   )
    // GROUP BY pr.advisor_id

    logBQ(
      'queryAdvisorPerformance',
      `Querying advisor performance for firm=${firmId}`,
    );

    return [
      {
        advisorId: 'adv_001',
        advisorName: 'Sarah Chen',
        clientCount: 45,
        totalAum: 180_000_000,
        avgSuccessRate: 0.89,
        plansOnTrack: 38,
        plansAtRisk: 7,
      },
      {
        advisorId: 'adv_002',
        advisorName: 'Michael Torres',
        clientCount: 38,
        totalAum: 152_000_000,
        avgSuccessRate: 0.84,
        plansOnTrack: 30,
        plansAtRisk: 8,
      },
      {
        advisorId: 'adv_003',
        advisorName: 'Emily Park',
        clientCount: 52,
        totalAum: 210_000_000,
        avgSuccessRate: 0.91,
        plansOnTrack: 47,
        plansAtRisk: 5,
      },
    ];
  }

  // ==================== AUDIT LOG ====================

  /**
   * Streams a single audit log entry to BigQuery.
   */
  async writeAuditLog(entry: AuditLogRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetAudit}.activity_log`
    //   (id, timestamp, actor_type, actor_id, actor_name, ip_address,
    //    action, resource_type, resource_id, plan_id, client_id, firm_id,
    //    before_state, after_state, session_id)
    // VALUES (...)

    logBQ(
      'writeAuditLog',
      `Writing audit entry id=${entry.id}, action=${entry.action}, ` +
        `actor=${entry.actorName} (${entry.actorType}), ` +
        `resource=${entry.resourceType}:${entry.resourceId}`,
    );
  }

  // ==================== UPDATE ENGINE ====================

  /**
   * Logs an update engine run to BigQuery.
   */
  async writeUpdateRun(run: UpdateRunRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetUpdateEngine}.update_runs`
    //   (id, started_at, completed_at, status, trigger_type,
    //    sources_checked, changes_detected, changes_applied,
    //    plans_affected, error_message)
    // VALUES (...)

    logBQ(
      'writeUpdateRun',
      `Writing update run id=${run.id}, status=${run.status}, ` +
        `trigger=${run.triggerType}, changes=${run.changesDetected}/${run.changesApplied}`,
    );
  }

  /**
   * Logs a detected change from the update engine.
   */
  async writeDetectedChange(change: DetectedChangeRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetUpdateEngine}.detected_changes`
    //   (id, run_id, detected_at, source_type, source_id, change_type,
    //    description, previous_value, new_value, status, confidence,
    //    requires_review, reviewed_by, reviewed_at)
    // VALUES (...)

    logBQ(
      'writeDetectedChange',
      `Writing detected change id=${change.id}, ` +
        `source=${change.sourceType}:${change.sourceId}, ` +
        `type=${change.changeType}, confidence=${change.confidence}`,
    );
  }

  // ==================== CROSS-DATASET QUERIES ====================

  /**
   * Finds plans that would be affected by changes to specific tax table types.
   * Used by the update engine to determine recalculation scope.
   */
  async findAffectedPlans(
    tableTypes: string[],
    firmId?: string,
  ): Promise<
    Array<{
      planId: string;
      clientId: string;
      advisorId: string;
      firmId: string;
      lastCalculated: string;
      probabilityOfSuccess: number;
    }>
  > {
    // Real BigQuery SQL:
    // SELECT DISTINCT
    //   pr.plan_id,
    //   pr.client_id,
    //   pr.advisor_id,
    //   pr.firm_id,
    //   pr.calculated_at AS last_calculated,
    //   pr.probability_of_success
    // FROM `${projectId}.${datasetPlans}.plan_results` pr
    // WHERE pr.calculated_at = (
    //   SELECT MAX(sub.calculated_at)
    //   FROM `${projectId}.${datasetPlans}.plan_results` sub
    //   WHERE sub.plan_id = pr.plan_id
    // )
    // AND (@firmId IS NULL OR pr.firm_id = @firmId)
    // -- Plans are affected if they use any of the changed table types
    // -- (determined by checking the plan's filing status and state)

    const firmClause = firmId ? ` for firm=${firmId}` : '';
    logBQ(
      'findAffectedPlans',
      `Finding plans affected by table types=[${tableTypes.join(', ')}]${firmClause}`,
    );

    return [
      {
        planId: 'plan_001',
        clientId: 'client_001',
        advisorId: 'adv_001',
        firmId: firmId ?? 'firm_001',
        lastCalculated: '2025-11-15T10:30:00Z',
        probabilityOfSuccess: 0.87,
      },
      {
        planId: 'plan_002',
        clientId: 'client_002',
        advisorId: 'adv_001',
        firmId: firmId ?? 'firm_001',
        lastCalculated: '2025-11-14T14:22:00Z',
        probabilityOfSuccess: 0.72,
      },
      {
        planId: 'plan_003',
        clientId: 'client_003',
        advisorId: 'adv_002',
        firmId: firmId ?? 'firm_001',
        lastCalculated: '2025-11-13T09:15:00Z',
        probabilityOfSuccess: 0.91,
      },
    ];
  }
}
