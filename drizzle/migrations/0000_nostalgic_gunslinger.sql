CREATE TABLE "fmss_alternative_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_name" varchar(255) NOT NULL,
	"manager_name" varchar(255) NOT NULL,
	"fund_type" varchar(100),
	"strategy" varchar(100),
	"aum_mm" numeric(15, 2),
	"minimum_investment" numeric(12, 2),
	"management_fee_bps" integer,
	"performance_fee_pct" numeric(5, 2),
	"ytd_return" numeric(8, 4),
	"one_year_return" numeric(8, 4),
	"three_year_return" numeric(8, 4),
	"inception_date" timestamp,
	"sec_file_number" varchar(50),
	"form_adv_url" text,
	"form_d_url" text,
	"extracted_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_asset_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_type" varchar(50) NOT NULL,
	"category_code" varchar(100) NOT NULL,
	"category_name" varchar(255) NOT NULL,
	"parent_category_id" uuid,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"source_type" varchar(50),
	"base_url" text,
	"api_key_env_var" varchar(100),
	"rate_limit_per_minute" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_successful_fetch" timestamp,
	"consecutive_failures" integer DEFAULT 0,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_data_sources_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "fmss_earnings_call_sentiment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"call_date" timestamp NOT NULL,
	"fiscal_quarter" varchar(20),
	"overall_sentiment" numeric(5, 4),
	"management_tone" numeric(5, 4),
	"analyst_tone" numeric(5, 4),
	"guidance_sentiment" numeric(5, 4),
	"key_topics" jsonb,
	"management_confidence" varchar(50),
	"forward_outlook" varchar(50),
	"transcript_url" text,
	"extracted_by_model" varchar(100),
	"extraction_confidence" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_equities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"exchange" varchar(50),
	"sector" varchar(100),
	"industry" varchar(100),
	"market_cap_mm" numeric(15, 2),
	"price" numeric(12, 4),
	"pe_ratio" numeric(8, 2),
	"dividend_yield" numeric(6, 4),
	"ytd_return" numeric(8, 4),
	"one_year_return" numeric(8, 4),
	"three_year_return" numeric(8, 4),
	"five_year_return" numeric(8, 4),
	"beta" numeric(6, 3),
	"volatility" numeric(8, 4),
	"analyst_rating" varchar(50),
	"price_target" numeric(12, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_equities_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "fmss_etfs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"fund_name" varchar(255) NOT NULL,
	"provider" varchar(100),
	"asset_class" varchar(100),
	"aum_mm" numeric(15, 2),
	"expense_ratio_bps" integer,
	"nav" numeric(12, 4),
	"ytd_return" numeric(8, 4),
	"one_year_return" numeric(8, 4),
	"three_year_return" numeric(8, 4),
	"five_year_return" numeric(8, 4),
	"dividend_yield" numeric(6, 4),
	"pe_ratio" numeric(8, 2),
	"holdings_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_etfs_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "fmss_ingest_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_name" varchar(100) NOT NULL,
	"worker_type" varchar(50),
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" varchar(50) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_inserted" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_macro_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_code" varchar(100) NOT NULL,
	"indicator_name" varchar(255) NOT NULL,
	"frequency" varchar(50),
	"observation_date" timestamp NOT NULL,
	"value" numeric(20, 6),
	"change_pct" numeric(8, 4),
	"change_from_prev_period" numeric(12, 4),
	"source" varchar(50),
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_news_sentiment_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20),
	"asset_type" varchar(50),
	"headline" text NOT NULL,
	"source" varchar(100),
	"published_at" timestamp NOT NULL,
	"article_url" text,
	"sentiment_score" numeric(5, 4),
	"sentiment_label" varchar(50),
	"sentiment_magnitude" numeric(5, 4),
	"topics" jsonb,
	"entities_mentioned" jsonb,
	"extracted_via" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"asset_id" uuid NOT NULL,
	"risk_adjusted_performance" integer,
	"manager_pedigree" integer,
	"fee_efficiency" integer,
	"insider_conviction" integer,
	"regulatory_signal" integer,
	"concentration" integer,
	"benchmark_consistency" integer,
	"esg_alignment" integer,
	"total_score" integer NOT NULL,
	"score_percentile" numeric(5, 2),
	"scored_at" timestamp NOT NULL,
	"model_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_scoring_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension_code" varchar(100) NOT NULL,
	"dimension_name" varchar(255) NOT NULL,
	"weight_pct" numeric(5, 2) NOT NULL,
	"calculation_method" varchar(50),
	"formula" text,
	"data_sources" jsonb,
	"description" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_scoring_dimensions_dimension_code_unique" UNIQUE("dimension_code")
);
--> statement-breakpoint
CREATE TABLE "fmss_scoring_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" varchar(50) NOT NULL,
	"asset_id" uuid NOT NULL,
	"signal_type" varchar(100) NOT NULL,
	"signal_value" numeric(12, 4),
	"signal_text" text,
	"confidence" numeric(5, 4),
	"source" varchar(100),
	"source_url" text,
	"detected_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_name" varchar(255) NOT NULL,
	"manager_name" varchar(255) NOT NULL,
	"asset_class" varchar(100),
	"sub_strategy" varchar(100),
	"aum_mm" numeric(15, 2),
	"minimum_investment" numeric(12, 2),
	"management_fee_bps" integer,
	"ytd_return" numeric(8, 4),
	"one_year_return" numeric(8, 4),
	"three_year_return" numeric(8, 4),
	"five_year_return" numeric(8, 4),
	"inception_date" timestamp,
	"sharpe_ratio" numeric(6, 3),
	"sortino_ratio" numeric(6, 3),
	"max_drawdown" numeric(8, 4),
	"volatility" numeric(8, 4),
	"beta" numeric(6, 3),
	"manager_tenure_years" integer,
	"manager_aum_total_mm" numeric(15, 2),
	"fact_sheet_url" text,
	"extracted_text" text,
	"last_extracted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fmss_sma_url_manifest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"manager_name" varchar(255) NOT NULL,
	"document_type" varchar(50),
	"last_scraped_at" timestamp,
	"scrape_frequency_days" integer DEFAULT 7,
	"content_hash" varchar(64),
	"scrape_status" varchar(50),
	"scrape_error" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fmss_sma_url_manifest_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE INDEX "idx_alt_manager" ON "fmss_alternative_funds" USING btree ("manager_name");--> statement-breakpoint
CREATE INDEX "idx_alt_type" ON "fmss_alternative_funds" USING btree ("fund_type");--> statement-breakpoint
CREATE INDEX "idx_category_type" ON "fmss_asset_categories" USING btree ("category_type");--> statement-breakpoint
CREATE INDEX "idx_category_code" ON "fmss_asset_categories" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "idx_source_name" ON "fmss_data_sources" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "idx_earnings_ticker" ON "fmss_earnings_call_sentiment" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_earnings_date" ON "fmss_earnings_call_sentiment" USING btree ("call_date");--> statement-breakpoint
CREATE INDEX "idx_equity_ticker" ON "fmss_equities" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_equity_sector" ON "fmss_equities" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "idx_etf_ticker" ON "fmss_etfs" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_etf_provider" ON "fmss_etfs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_ingest_worker" ON "fmss_ingest_log" USING btree ("worker_name");--> statement-breakpoint
CREATE INDEX "idx_ingest_status" ON "fmss_ingest_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ingest_started" ON "fmss_ingest_log" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_macro_indicator" ON "fmss_macro_indicators" USING btree ("indicator_code");--> statement-breakpoint
CREATE INDEX "idx_macro_date" ON "fmss_macro_indicators" USING btree ("observation_date");--> statement-breakpoint
CREATE INDEX "idx_news_ticker" ON "fmss_news_sentiment_signals" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_news_published" ON "fmss_news_sentiment_signals" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_score_asset" ON "fmss_scores" USING btree ("asset_type","asset_id");--> statement-breakpoint
CREATE INDEX "idx_score_total" ON "fmss_scores" USING btree ("total_score");--> statement-breakpoint
CREATE INDEX "idx_dimension_code" ON "fmss_scoring_dimensions" USING btree ("dimension_code");--> statement-breakpoint
CREATE INDEX "idx_signal_asset" ON "fmss_scoring_signals" USING btree ("asset_type","asset_id");--> statement-breakpoint
CREATE INDEX "idx_signal_type" ON "fmss_scoring_signals" USING btree ("signal_type");--> statement-breakpoint
CREATE INDEX "idx_signal_detected" ON "fmss_scoring_signals" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "idx_sma_manager" ON "fmss_sma_strategies" USING btree ("manager_name");--> statement-breakpoint
CREATE INDEX "idx_sma_asset_class" ON "fmss_sma_strategies" USING btree ("asset_class");--> statement-breakpoint
CREATE INDEX "idx_url_manager" ON "fmss_sma_url_manifest" USING btree ("manager_name");--> statement-breakpoint
CREATE INDEX "idx_url_status" ON "fmss_sma_url_manifest" USING btree ("scrape_status");