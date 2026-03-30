-- CreateTable
CREATE TABLE "opportunity_detection_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculation_run_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "rules_version" TEXT NOT NULL,
    "total_rules_evaluated" INTEGER NOT NULL,
    "total_rules_passed" INTEGER NOT NULL,
    "opportunities_detected" INTEGER NOT NULL,
    "high_priority_count" INTEGER NOT NULL,
    "estimated_value_total" REAL,
    "compute_time_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_detection_runs_calculation_run_id_fkey" FOREIGN KEY ("calculation_run_id") REFERENCES "calculation_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunity_detection_runs_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "detection_run_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "rule_name" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "priority" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "estimated_value" REAL,
    "confidence" TEXT NOT NULL,
    "evidence_json" TEXT NOT NULL,
    "score_json" TEXT NOT NULL,
    "final_score" REAL NOT NULL,
    "context_json" TEXT NOT NULL,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_of_id" TEXT,
    "suppression_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "dismissed_at" DATETIME,
    "dismissed_reason" TEXT,
    "implemented_at" DATETIME,
    "ai_summary" TEXT,
    "ai_generated_at" DATETIME,
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "opportunities_detection_run_id_fkey" FOREIGN KEY ("detection_run_id") REFERENCES "opportunity_detection_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opportunities_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_audit_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "detection_run_id" TEXT,
    "payload_json" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'opportunity-engine',
    "triggered_by" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opportunity_audit_events_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "opportunity_audit_events_detection_run_id_fkey" FOREIGN KEY ("detection_run_id") REFERENCES "opportunity_detection_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opportunity_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rule_name" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rule_definition_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "created_by" TEXT NOT NULL,
    "published_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "opportunity_detection_runs_household_id_tax_year_idx" ON "opportunity_detection_runs"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "opportunity_detection_runs_calculation_run_id_idx" ON "opportunity_detection_runs"("calculation_run_id");

-- CreateIndex
CREATE INDEX "opportunity_detection_runs_rules_version_idx" ON "opportunity_detection_runs"("rules_version");

-- CreateIndex
CREATE INDEX "opportunity_detection_runs_status_idx" ON "opportunity_detection_runs"("status");

-- CreateIndex
CREATE INDEX "opportunities_household_id_tax_year_idx" ON "opportunities"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "opportunities_detection_run_id_idx" ON "opportunities"("detection_run_id");

-- CreateIndex
CREATE INDEX "opportunities_category_idx" ON "opportunities"("category");

-- CreateIndex
CREATE INDEX "opportunities_priority_rank_idx" ON "opportunities"("priority", "rank");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_is_duplicate_idx" ON "opportunities"("is_duplicate");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_audit_events_event_id_key" ON "opportunity_audit_events"("event_id");

-- CreateIndex
CREATE INDEX "opportunity_audit_events_event_type_idx" ON "opportunity_audit_events"("event_type");

-- CreateIndex
CREATE INDEX "opportunity_audit_events_opportunity_id_idx" ON "opportunity_audit_events"("opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_audit_events_detection_run_id_idx" ON "opportunity_audit_events"("detection_run_id");

-- CreateIndex
CREATE INDEX "opportunity_audit_events_timestamp_idx" ON "opportunity_audit_events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_rules_rule_name_key" ON "opportunity_rules"("rule_name");

-- CreateIndex
CREATE INDEX "opportunity_rules_category_idx" ON "opportunity_rules"("category");

-- CreateIndex
CREATE INDEX "opportunity_rules_is_active_priority_idx" ON "opportunity_rules"("is_active", "priority");
