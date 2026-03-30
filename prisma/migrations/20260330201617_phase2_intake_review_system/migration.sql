-- CreateTable
CREATE TABLE "document_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "page_image_url" TEXT,
    "thumbnail_url" TEXT,
    "raw_text" TEXT,
    "text_layer_json" TEXT,
    "ocr_confidence" REAL,
    "layout_type" TEXT,
    "detected_fields" TEXT,
    "is_rotated" BOOLEAN NOT NULL DEFAULT false,
    "rotation_degrees" INTEGER,
    "is_deskewed" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "document_pages_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "tax_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "extracted_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "page_id" TEXT,
    "household_id" TEXT NOT NULL,
    "form_type" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_label" TEXT,
    "raw_value" TEXT,
    "normalized_value" TEXT,
    "value_type" TEXT NOT NULL,
    "page_number" INTEGER,
    "source_bbox" TEXT,
    "source_snippet" TEXT,
    "extraction_method" TEXT NOT NULL,
    "confidence_score" REAL NOT NULL,
    "confidence_tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'extracted',
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "approved_fact_id" TEXT,
    "superseded_by" TEXT,
    "extracted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extracted_fields_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "tax_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "extracted_fields_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "document_pages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "extracted_fields_approved_fact_id_fkey" FOREIGN KEY ("approved_fact_id") REFERENCES "approved_facts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approved_facts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "canonical_field" TEXT NOT NULL,
    "field_category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "source_field_ids" TEXT NOT NULL,
    "source_summary" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'approved',
    "approved_by" TEXT NOT NULL,
    "approved_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence_score" REAL,
    "notes" TEXT,
    "context" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by" TEXT,
    "superseded_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "approved_facts_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "review_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extracted_field_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewer_name" TEXT,
    "value_before" TEXT,
    "value_after" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_actions_extracted_field_id_fkey" FOREIGN KEY ("extracted_field_id") REFERENCES "extracted_fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conflict_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "conflict_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "field_name" TEXT,
    "tax_year" INTEGER,
    "fact_1_id" TEXT,
    "fact_2_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "conflict_records_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conflict_records_fact_1_id_fkey" FOREIGN KEY ("fact_1_id") REFERENCES "approved_facts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "missing_data_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_category" TEXT NOT NULL,
    "tax_year" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'missing',
    "requested_at" DATETIME,
    "received_at" DATETIME,
    "dismissed_at" DATETIME,
    "notes" TEXT,
    "detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "missing_data_items_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tax_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "household_id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "tax_year" INTEGER,
    "original_filename" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_hash" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'uploaded',
    "ocr_status" TEXT NOT NULL DEFAULT 'pending',
    "ocr_provider" TEXT,
    "ocr_processed_at" DATETIME,
    "ocr_confidence" REAL,
    "ocr_raw_json" TEXT,
    "classification_confidence" REAL,
    "classification_method" TEXT,
    "classification_reason" TEXT,
    "alternative_types" TEXT,
    "taxpayer_name" TEXT,
    "spouse_name" TEXT,
    "page_count" INTEGER,
    "has_text_layer" BOOLEAN NOT NULL DEFAULT false,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "processing_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" DATETIME,
    "source_pages_map" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tax_documents_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tax_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "advisors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tax_documents" ("content_type", "created_at", "documentType", "file_size", "file_url", "household_id", "id", "ocr_confidence", "ocr_processed_at", "ocr_provider", "ocr_raw_json", "ocr_status", "original_filename", "review_notes", "review_status", "reviewed_at", "reviewed_by", "source_pages_map", "tax_year", "updated_at", "uploaded_at", "uploaded_by") SELECT "content_type", "created_at", "documentType", "file_size", "file_url", "household_id", "id", "ocr_confidence", "ocr_processed_at", "ocr_provider", "ocr_raw_json", "ocr_status", "original_filename", "review_notes", "review_status", "reviewed_at", "reviewed_by", "source_pages_map", "tax_year", "updated_at", "uploaded_at", "uploaded_by" FROM "tax_documents";
DROP TABLE "tax_documents";
ALTER TABLE "new_tax_documents" RENAME TO "tax_documents";
CREATE INDEX "tax_documents_household_id_tax_year_idx" ON "tax_documents"("household_id", "tax_year");
CREATE INDEX "tax_documents_ocr_status_idx" ON "tax_documents"("ocr_status");
CREATE INDEX "tax_documents_review_status_idx" ON "tax_documents"("review_status");
CREATE INDEX "tax_documents_processing_status_idx" ON "tax_documents"("processing_status");
CREATE INDEX "tax_documents_file_hash_idx" ON "tax_documents"("file_hash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "document_pages_document_id_page_number_idx" ON "document_pages"("document_id", "page_number");

-- CreateIndex
CREATE INDEX "extracted_fields_household_id_tax_year_idx" ON "extracted_fields"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "extracted_fields_document_id_form_type_idx" ON "extracted_fields"("document_id", "form_type");

-- CreateIndex
CREATE INDEX "extracted_fields_field_name_tax_year_idx" ON "extracted_fields"("field_name", "tax_year");

-- CreateIndex
CREATE INDEX "extracted_fields_confidence_tier_idx" ON "extracted_fields"("confidence_tier");

-- CreateIndex
CREATE INDEX "extracted_fields_status_idx" ON "extracted_fields"("status");

-- CreateIndex
CREATE INDEX "approved_facts_household_id_tax_year_idx" ON "approved_facts"("household_id", "tax_year");

-- CreateIndex
CREATE INDEX "approved_facts_canonical_field_tax_year_idx" ON "approved_facts"("canonical_field", "tax_year");

-- CreateIndex
CREATE INDEX "approved_facts_field_category_idx" ON "approved_facts"("field_category");

-- CreateIndex
CREATE INDEX "approved_facts_approval_status_idx" ON "approved_facts"("approval_status");

-- CreateIndex
CREATE INDEX "review_actions_extracted_field_id_idx" ON "review_actions"("extracted_field_id");

-- CreateIndex
CREATE INDEX "review_actions_reviewer_id_idx" ON "review_actions"("reviewer_id");

-- CreateIndex
CREATE INDEX "review_actions_action_idx" ON "review_actions"("action");

-- CreateIndex
CREATE INDEX "review_actions_timestamp_idx" ON "review_actions"("timestamp");

-- CreateIndex
CREATE INDEX "conflict_records_household_id_status_idx" ON "conflict_records"("household_id", "status");

-- CreateIndex
CREATE INDEX "conflict_records_conflict_type_idx" ON "conflict_records"("conflict_type");

-- CreateIndex
CREATE INDEX "conflict_records_severity_idx" ON "conflict_records"("severity");

-- CreateIndex
CREATE INDEX "missing_data_items_household_id_status_idx" ON "missing_data_items"("household_id", "status");

-- CreateIndex
CREATE INDEX "missing_data_items_item_type_idx" ON "missing_data_items"("item_type");

-- CreateIndex
CREATE INDEX "missing_data_items_priority_idx" ON "missing_data_items"("priority");
