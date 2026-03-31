-- CreateTable
CREATE TABLE "planning_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "tax_year" INTEGER NOT NULL,
    "baseline_snapshot_id" TEXT NOT NULL,
    "baseline_run_id" TEXT NOT NULL,
    "scenario_snapshot_id" TEXT NOT NULL,
    "scenario_run_id" TEXT NOT NULL,
    "scenario_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originating_opportunity_id" TEXT,
    "overrides_json" TEXT NOT NULL,
    "assumptions_json" TEXT NOT NULL,
    "warnings_json" TEXT NOT NULL,
    "blockers_json" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by" TEXT,
    "created_by" TEXT NOT NULL,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "planning_scenarios_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "planning_scenarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "planning_scenarios_originating_opportunity_id_fkey" FOREIGN KEY ("originating_opportunity_id") REFERENCES "opportunities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenario_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "note_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenario_notes_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "planning_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenario_comparisons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "baseline_scenario_id" TEXT NOT NULL,
    "comparison_scenario_ids_json" TEXT NOT NULL,
    "comparison_payload_json" TEXT NOT NULL,
    "interpretation_notes_json" TEXT,
    "warnings_json" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_comparisons_baseline_scenario_id_fkey" FOREIGN KEY ("baseline_scenario_id") REFERENCES "planning_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenario_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_name" TEXT NOT NULL,
    "scenario_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_fields_json" TEXT NOT NULL,
    "seed_overrides_json" TEXT NOT NULL,
    "seed_assumptions_json" TEXT NOT NULL,
    "linked_opportunity_types_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scenario_audit_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_type" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "changes_before_json" TEXT,
    "changes_after_json" TEXT,
    "metadata_json" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_audit_events_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "planning_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ComparisonScenarios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ComparisonScenarios_A_fkey" FOREIGN KEY ("A") REFERENCES "planning_scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ComparisonScenarios_B_fkey" FOREIGN KEY ("B") REFERENCES "scenario_comparisons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "planning_scenarios_household_id_tax_year_idx" ON "planning_scenarios"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "planning_scenarios_plan_id_idx" ON "planning_scenarios"("plan_id");

-- CreateIndex
CREATE INDEX "planning_scenarios_status_idx" ON "planning_scenarios"("status");

-- CreateIndex
CREATE INDEX "planning_scenarios_recommended_idx" ON "planning_scenarios"("recommended");

-- CreateIndex
CREATE INDEX "planning_scenarios_originating_opportunity_id_idx" ON "planning_scenarios"("originating_opportunity_id");

-- CreateIndex
CREATE INDEX "scenario_notes_scenario_id_idx" ON "scenario_notes"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_notes_note_type_idx" ON "scenario_notes"("note_type");

-- CreateIndex
CREATE INDEX "scenario_comparisons_household_id_tax_year_idx" ON "scenario_comparisons"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "scenario_comparisons_baseline_scenario_id_idx" ON "scenario_comparisons"("baseline_scenario_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_templates_template_name_key" ON "scenario_templates"("template_name");

-- CreateIndex
CREATE INDEX "scenario_templates_scenario_type_idx" ON "scenario_templates"("scenario_type");

-- CreateIndex
CREATE INDEX "scenario_templates_is_active_display_order_idx" ON "scenario_templates"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "scenario_audit_events_scenario_id_idx" ON "scenario_audit_events"("scenario_id");

-- CreateIndex
CREATE INDEX "scenario_audit_events_event_type_idx" ON "scenario_audit_events"("event_type");

-- CreateIndex
CREATE INDEX "scenario_audit_events_actor_idx" ON "scenario_audit_events"("actor");

-- CreateIndex
CREATE INDEX "scenario_audit_events_timestamp_idx" ON "scenario_audit_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "_ComparisonScenarios_AB_unique" ON "_ComparisonScenarios"("A", "B");

-- CreateIndex
CREATE INDEX "_ComparisonScenarios_B_index" ON "_ComparisonScenarios"("B");
