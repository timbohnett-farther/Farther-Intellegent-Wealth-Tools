-- CreateTable
CREATE TABLE "tax_input_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "filing_status" TEXT NOT NULL,
    "taxpayers" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "missing_inputs" TEXT,
    "warnings" TEXT,
    "source_fact_versions" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tax_input_snapshots_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_input_validations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshot_id" TEXT NOT NULL,
    "pass" BOOLEAN NOT NULL,
    "can_proceed" BOOLEAN NOT NULL,
    "total_rules" INTEGER NOT NULL,
    "pass_count" INTEGER NOT NULL,
    "pass_with_warning_count" INTEGER NOT NULL,
    "soft_fail_count" INTEGER NOT NULL,
    "hard_fail_count" INTEGER NOT NULL,
    "violations" TEXT NOT NULL,
    "validated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_input_validations_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "tax_input_snapshots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_rules_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rules_version" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'federal',
    "rules_json" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "published_at" DATETIME NOT NULL,
    "published_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "calculation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshot_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "rules_version" TEXT NOT NULL,
    "run_type" TEXT NOT NULL,
    "output_snapshot_id" TEXT NOT NULL,
    "output_hash" TEXT NOT NULL,
    "compute_time_ms" INTEGER NOT NULL,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "superseded_by" TEXT,
    "superseded_at" DATETIME,
    "superseded_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calculation_runs_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "tax_input_snapshots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calculation_runs_rules_version_fkey" FOREIGN KEY ("rules_version") REFERENCES "tax_rules_packages" ("rules_version") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "calculation_runs_output_snapshot_id_fkey" FOREIGN KEY ("output_snapshot_id") REFERENCES "tax_output_snapshots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tax_output_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summary_json" TEXT NOT NULL,
    "income_breakdown_json" TEXT NOT NULL,
    "deduction_breakdown_json" TEXT NOT NULL,
    "tax_calculation_json" TEXT NOT NULL,
    "credits_json" TEXT NOT NULL,
    "payments_json" TEXT NOT NULL,
    "agi" REAL NOT NULL,
    "taxable_income" REAL NOT NULL,
    "total_tax" REAL NOT NULL,
    "refund_or_balance_due" REAL NOT NULL,
    "effective_tax_rate" REAL NOT NULL,
    "marginal_tax_rate" REAL NOT NULL,
    "warnings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "calculation_traces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "steps_json" TEXT NOT NULL,
    "total_steps" INTEGER NOT NULL,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calculation_traces_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenario_override_sets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "overrides_json" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scenario_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseline_run_id" TEXT NOT NULL,
    "override_set_id" TEXT NOT NULL,
    "scenario_run_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_runs_baseline_run_id_fkey" FOREIGN KEY ("baseline_run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scenario_runs_override_set_id_fkey" FOREIGN KEY ("override_set_id") REFERENCES "scenario_override_sets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "run_comparisons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseline_run_id" TEXT NOT NULL,
    "scenario_run_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "summary_diff_json" TEXT NOT NULL,
    "field_diffs_json" TEXT NOT NULL,
    "interpretations" TEXT NOT NULL,
    "narrative" TEXT,
    "narrative_generated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "run_comparisons_baseline_run_id_fkey" FOREIGN KEY ("baseline_run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_comparisons_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recommendation_signals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "signals_json" TEXT NOT NULL,
    "niit_applies" BOOLEAN NOT NULL,
    "irmaa_b1" BOOLEAN NOT NULL,
    "estimated_tax_shortfall" REAL,
    "computed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendation_signals_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calculation_audit_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "run_id" TEXT,
    "payload_json" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'tax-engine',
    "triggered_by" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calculation_audit_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "calculation_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tax_input_snapshots_household_id_tax_year_idx" ON "tax_input_snapshots"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "tax_input_snapshots_filing_status_idx" ON "tax_input_snapshots"("filing_status");

-- CreateIndex
CREATE INDEX "tax_input_validations_snapshot_id_idx" ON "tax_input_validations"("snapshot_id");

-- CreateIndex
CREATE INDEX "tax_input_validations_can_proceed_idx" ON "tax_input_validations"("can_proceed");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rules_packages_rules_version_key" ON "tax_rules_packages"("rules_version");

-- CreateIndex
CREATE INDEX "tax_rules_packages_tax_year_jurisdiction_is_active_idx" ON "tax_rules_packages"("tax_year", "jurisdiction", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_runs_output_snapshot_id_key" ON "calculation_runs"("output_snapshot_id");

-- CreateIndex
CREATE INDEX "calculation_runs_household_id_tax_year_idx" ON "calculation_runs"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "calculation_runs_run_type_idx" ON "calculation_runs"("run_type");

-- CreateIndex
CREATE INDEX "calculation_runs_rules_version_idx" ON "calculation_runs"("rules_version");

-- CreateIndex
CREATE INDEX "calculation_runs_superseded_by_idx" ON "calculation_runs"("superseded_by");

-- CreateIndex
CREATE INDEX "tax_output_snapshots_agi_idx" ON "tax_output_snapshots"("agi");

-- CreateIndex
CREATE INDEX "tax_output_snapshots_total_tax_idx" ON "tax_output_snapshots"("total_tax");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_traces_run_id_key" ON "calculation_traces"("run_id");

-- CreateIndex
CREATE INDEX "calculation_traces_run_id_idx" ON "calculation_traces"("run_id");

-- CreateIndex
CREATE INDEX "scenario_override_sets_household_id_tax_year_idx" ON "scenario_override_sets"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "scenario_runs_baseline_run_id_idx" ON "scenario_runs"("baseline_run_id");

-- CreateIndex
CREATE INDEX "scenario_runs_override_set_id_idx" ON "scenario_runs"("override_set_id");

-- CreateIndex
CREATE INDEX "scenario_runs_household_id_tax_year_idx" ON "scenario_runs"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "run_comparisons_baseline_run_id_scenario_run_id_idx" ON "run_comparisons"("baseline_run_id", "scenario_run_id");

-- CreateIndex
CREATE INDEX "run_comparisons_household_id_tax_year_idx" ON "run_comparisons"("household_id", "tax_year");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_signals_run_id_key" ON "recommendation_signals"("run_id");

-- CreateIndex
CREATE INDEX "recommendation_signals_run_id_idx" ON "recommendation_signals"("run_id");

-- CreateIndex
CREATE INDEX "recommendation_signals_household_id_tax_year_idx" ON "recommendation_signals"("household_id", "tax_year");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_audit_events_event_id_key" ON "calculation_audit_events"("event_id");

-- CreateIndex
CREATE INDEX "calculation_audit_events_event_type_idx" ON "calculation_audit_events"("event_type");

-- CreateIndex
CREATE INDEX "calculation_audit_events_run_id_idx" ON "calculation_audit_events"("run_id");

-- CreateIndex
CREATE INDEX "calculation_audit_events_timestamp_idx" ON "calculation_audit_events"("timestamp");
