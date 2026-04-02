-- CreateTable
CREATE TABLE "tax_calculation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT,
    "snapshot_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "run_type" TEXT NOT NULL,
    "tax_output_json" TEXT NOT NULL,
    "intermediates_json" TEXT NOT NULL,
    "trace_json" TEXT NOT NULL,
    "warnings_json" TEXT,
    "unsupported_items_json" TEXT,
    "execution_order" TEXT NOT NULL,
    "compute_time_ms" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tax_calculation_runs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "planning_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tax_calculation_runs_scenario_id_idx" ON "tax_calculation_runs"("scenario_id");

-- CreateIndex
CREATE INDEX "tax_calculation_runs_snapshot_id_idx" ON "tax_calculation_runs"("snapshot_id");

-- CreateIndex
CREATE INDEX "tax_calculation_runs_tax_year_idx" ON "tax_calculation_runs"("tax_year");

-- CreateIndex
CREATE INDEX "tax_calculation_runs_run_type_idx" ON "tax_calculation_runs"("run_type");
