CREATE TABLE "fmss_sma_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"old_version_id" uuid,
	"new_version_id" uuid NOT NULL,
	"change_type" varchar(100) NOT NULL,
	"change_severity" varchar(50),
	"field_changed" varchar(100),
	"old_value" text,
	"new_value" text,
	"change_summary" text,
	"advisor_impact_note" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detected_by" varchar(50),
	"detection_confidence" numeric(5, 4),
	"alert_status" varchar(50) DEFAULT 'pending',
	"alert_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_discovered_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"seed_url_id" uuid,
	"discovered_url" text NOT NULL,
	"url_hash" varchar(64) NOT NULL,
	"url_class" varchar(50),
	"classification_confidence" numeric(5, 4),
	"classified_by" varchar(50),
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"discovered_via" varchar(50),
	"parent_url" text,
	"acquisition_status" varchar(50) DEFAULT 'pending',
	"acquired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_sma_discovered_urls_discovered_url_unique" UNIQUE("discovered_url"),
	CONSTRAINT "fmss_sma_discovered_urls_url_hash_unique" UNIQUE("url_hash")
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_document_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_event_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"alert_type" varchar(100) NOT NULL,
	"alert_priority" varchar(50) DEFAULT 'medium',
	"alert_title" varchar(500),
	"alert_message" text,
	"action_required" text,
	"target_audience" varchar(50) DEFAULT 'all_advisors',
	"affected_household_count" integer DEFAULT 0,
	"alert_status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"acknowledged_at" timestamp,
	"acknowledged_by" varchar(255),
	"notification_channels" jsonb,
	"delivery_metadata" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_fact_sheet_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"discovered_url_id" uuid,
	"canonical_url" text NOT NULL,
	"document_title" varchar(500),
	"document_type" varchar(50),
	"matched_strategy_id" uuid,
	"match_confidence" numeric(5, 4),
	"matched_strategy_name" varchar(255),
	"current_version_id" uuid,
	"current_content_hash" varchar(64),
	"version_count" integer DEFAULT 1,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_checked" timestamp,
	"last_changed" timestamp,
	"acquisition_status" varchar(50) DEFAULT 'active',
	"parse_status" varchar(50) DEFAULT 'pending',
	"last_parse_attempt" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_sma_fact_sheet_documents_canonical_url_unique" UNIQUE("canonical_url")
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_fact_sheet_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"content_size_bytes" integer,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"acquired_via" varchar(50),
	"acquisition_duration_ms" integer,
	"raw_content_s3_key" text,
	"markdown_s3_key" text,
	"is_material_change" boolean DEFAULT false,
	"change_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_parsed_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"full_text" text,
	"text_length" integer,
	"extracted_data" jsonb,
	"extraction_model" varchar(100),
	"extraction_confidence" numeric(5, 4),
	"strategy_name" varchar(255),
	"manager_name" varchar(255),
	"aum_mm" numeric(15, 2),
	"management_fee_bps" integer,
	"inception_date" date,
	"parsed_at" timestamp DEFAULT now() NOT NULL,
	"parse_duration_ms" integer,
	"parse_status" varchar(50) DEFAULT 'success',
	"parse_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_provider_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid,
	"run_type" varchar(50) NOT NULL,
	"run_mode" varchar(50),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_seconds" integer,
	"status" varchar(50) DEFAULT 'running',
	"urls_discovered" integer DEFAULT 0,
	"documents_acquired" integer DEFAULT 0,
	"documents_parsed" integer DEFAULT 0,
	"changes_detected" integer DEFAULT 0,
	"errors_encountered" integer DEFAULT 0,
	"error_summary" text,
	"error_details" jsonb,
	"triggered_by" varchar(100),
	"run_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_provider_seed_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"seed_url" text NOT NULL,
	"url_type" varchar(50) NOT NULL,
	"url_label" varchar(255),
	"crawl_depth" integer DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 50,
	"last_crawled" timestamp,
	"last_success" timestamp,
	"consecutive_failures" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" varchar(100) NOT NULL,
	"provider_name" varchar(255) NOT NULL,
	"provider_rank" integer,
	"website_domain" varchar(255),
	"allowed_domains_json" jsonb,
	"preferred_fetch_mode" varchar(50) DEFAULT 'bright_data',
	"auth_sensitivity" varchar(50) DEFAULT 'public',
	"discovery_mode" varchar(50) DEFAULT 'active',
	"provider_tier" varchar(50),
	"aum_bn" numeric(15, 2),
	"strategy_count_estimate" integer,
	"last_discovery_run" timestamp,
	"last_successful_scrape" timestamp,
	"active_fact_sheet_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_sma_providers_provider_key_unique" UNIQUE("provider_key")
);
--> statement-breakpoint
ALTER TABLE "fmss_sma_change_events" ADD CONSTRAINT "fmss_sma_change_events_document_id_fmss_sma_fact_sheet_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."fmss_sma_fact_sheet_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_change_events" ADD CONSTRAINT "fmss_sma_change_events_old_version_id_fmss_sma_fact_sheet_versions_id_fk" FOREIGN KEY ("old_version_id") REFERENCES "public"."fmss_sma_fact_sheet_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_change_events" ADD CONSTRAINT "fmss_sma_change_events_new_version_id_fmss_sma_fact_sheet_versions_id_fk" FOREIGN KEY ("new_version_id") REFERENCES "public"."fmss_sma_fact_sheet_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_discovered_urls" ADD CONSTRAINT "fmss_sma_discovered_urls_provider_id_fmss_sma_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."fmss_sma_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_discovered_urls" ADD CONSTRAINT "fmss_sma_discovered_urls_seed_url_id_fmss_sma_provider_seed_urls_id_fk" FOREIGN KEY ("seed_url_id") REFERENCES "public"."fmss_sma_provider_seed_urls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_document_alerts" ADD CONSTRAINT "fmss_sma_document_alerts_change_event_id_fmss_sma_change_events_id_fk" FOREIGN KEY ("change_event_id") REFERENCES "public"."fmss_sma_change_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_document_alerts" ADD CONSTRAINT "fmss_sma_document_alerts_document_id_fmss_sma_fact_sheet_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."fmss_sma_fact_sheet_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_fact_sheet_documents" ADD CONSTRAINT "fmss_sma_fact_sheet_documents_provider_id_fmss_sma_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."fmss_sma_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_fact_sheet_documents" ADD CONSTRAINT "fmss_sma_fact_sheet_documents_discovered_url_id_fmss_sma_discovered_urls_id_fk" FOREIGN KEY ("discovered_url_id") REFERENCES "public"."fmss_sma_discovered_urls"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_fact_sheet_documents" ADD CONSTRAINT "fmss_sma_fact_sheet_documents_matched_strategy_id_fmss_sma_strategies_id_fk" FOREIGN KEY ("matched_strategy_id") REFERENCES "public"."fmss_sma_strategies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_fact_sheet_versions" ADD CONSTRAINT "fmss_sma_fact_sheet_versions_document_id_fmss_sma_fact_sheet_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."fmss_sma_fact_sheet_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_parsed_documents" ADD CONSTRAINT "fmss_sma_parsed_documents_version_id_fmss_sma_fact_sheet_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."fmss_sma_fact_sheet_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_parsed_documents" ADD CONSTRAINT "fmss_sma_parsed_documents_document_id_fmss_sma_fact_sheet_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."fmss_sma_fact_sheet_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_provider_runs" ADD CONSTRAINT "fmss_sma_provider_runs_provider_id_fmss_sma_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."fmss_sma_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fmss_sma_provider_seed_urls" ADD CONSTRAINT "fmss_sma_provider_seed_urls_provider_id_fmss_sma_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."fmss_sma_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_change_document" ON "fmss_sma_change_events" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_change_type" ON "fmss_sma_change_events" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "idx_change_severity" ON "fmss_sma_change_events" USING btree ("change_severity");--> statement-breakpoint
CREATE INDEX "idx_change_detected" ON "fmss_sma_change_events" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "idx_change_alert_status" ON "fmss_sma_change_events" USING btree ("alert_status");--> statement-breakpoint
CREATE INDEX "idx_discovered_provider" ON "fmss_sma_discovered_urls" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_discovered_class" ON "fmss_sma_discovered_urls" USING btree ("url_class");--> statement-breakpoint
CREATE INDEX "idx_discovered_status" ON "fmss_sma_discovered_urls" USING btree ("acquisition_status");--> statement-breakpoint
CREATE INDEX "idx_discovered_hash" ON "fmss_sma_discovered_urls" USING btree ("url_hash");--> statement-breakpoint
CREATE INDEX "idx_alert_change" ON "fmss_sma_document_alerts" USING btree ("change_event_id");--> statement-breakpoint
CREATE INDEX "idx_alert_document" ON "fmss_sma_document_alerts" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_alert_status" ON "fmss_sma_document_alerts" USING btree ("alert_status");--> statement-breakpoint
CREATE INDEX "idx_alert_priority" ON "fmss_sma_document_alerts" USING btree ("alert_priority");--> statement-breakpoint
CREATE INDEX "idx_alert_created" ON "fmss_sma_document_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_factsheet_provider" ON "fmss_sma_fact_sheet_documents" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_factsheet_strategy" ON "fmss_sma_fact_sheet_documents" USING btree ("matched_strategy_id");--> statement-breakpoint
CREATE INDEX "idx_factsheet_status" ON "fmss_sma_fact_sheet_documents" USING btree ("acquisition_status");--> statement-breakpoint
CREATE INDEX "idx_factsheet_parse" ON "fmss_sma_fact_sheet_documents" USING btree ("parse_status");--> statement-breakpoint
CREATE INDEX "idx_version_document" ON "fmss_sma_fact_sheet_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_version_hash" ON "fmss_sma_fact_sheet_versions" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_version_acquired" ON "fmss_sma_fact_sheet_versions" USING btree ("acquired_at");--> statement-breakpoint
CREATE INDEX "idx_parsed_version" ON "fmss_sma_parsed_documents" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "idx_parsed_document" ON "fmss_sma_parsed_documents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_parsed_at" ON "fmss_sma_parsed_documents" USING btree ("parsed_at");--> statement-breakpoint
CREATE INDEX "idx_run_provider" ON "fmss_sma_provider_runs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_run_type" ON "fmss_sma_provider_runs" USING btree ("run_type");--> statement-breakpoint
CREATE INDEX "idx_run_started" ON "fmss_sma_provider_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_run_status" ON "fmss_sma_provider_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_seed_provider" ON "fmss_sma_provider_seed_urls" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_seed_type" ON "fmss_sma_provider_seed_urls" USING btree ("url_type");--> statement-breakpoint
CREATE INDEX "idx_provider_key" ON "fmss_sma_providers" USING btree ("provider_key");--> statement-breakpoint
CREATE INDEX "idx_provider_rank" ON "fmss_sma_providers" USING btree ("provider_rank");