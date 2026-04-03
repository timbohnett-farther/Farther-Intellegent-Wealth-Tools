/**
 * FMSS (Farther Market Scoring System) Database Schema
 *
 * Drizzle ORM schema for 23 tables:
 * - Core Assets (5): SMA strategies, SMA URL manifest, alternatives, equities, ETFs
 * - SMA Monitoring (9): Providers, seed URLs, discovered URLs, fact sheet documents,
 *   versions, parsed documents, change events, provider runs, document alerts
 * - Signals (5): Scores, macro indicators, sentiment, scoring signals, earnings calls
 * - System (4): Ingest logs, data sources, categories, scoring dimensions
 *
 * CRITICAL: This schema is the single source of truth for FMSS tables.
 * Never create tables outside this schema.
 */

import { pgTable, text, integer, numeric, timestamp, jsonb, uuid, varchar, boolean, index, date } from 'drizzle-orm/pg-core';

// ============================================================================
// CORE ASSET TABLES
// ============================================================================

/**
 * SMA (Separately Managed Account) Strategies
 * Tracks investment strategies offered by asset managers
 */
export const smaStrategies = pgTable('fmss_sma_strategies', {
  id: uuid('id').defaultRandom().primaryKey(),
  strategy_name: varchar('strategy_name', { length: 255 }).notNull(),
  manager_name: varchar('manager_name', { length: 255 }).notNull(),
  asset_class: varchar('asset_class', { length: 100 }),  // Equity, Fixed Income, Alternative, Multi-Asset
  sub_strategy: varchar('sub_strategy', { length: 100 }),  // Growth, Value, Blend, etc.

  // Financial metrics
  aum_mm: numeric('aum_mm', { precision: 15, scale: 2 }),  // Assets Under Management in millions
  minimum_investment: numeric('minimum_investment', { precision: 12, scale: 2 }),
  management_fee_bps: integer('management_fee_bps'),  // Fee in basis points

  // Performance
  ytd_return: numeric('ytd_return', { precision: 8, scale: 4 }),
  one_year_return: numeric('one_year_return', { precision: 8, scale: 4 }),
  three_year_return: numeric('three_year_return', { precision: 8, scale: 4 }),
  five_year_return: numeric('five_year_return', { precision: 8, scale: 4 }),
  inception_date: timestamp('inception_date'),

  // Risk metrics
  sharpe_ratio: numeric('sharpe_ratio', { precision: 6, scale: 3 }),
  sortino_ratio: numeric('sortino_ratio', { precision: 6, scale: 3 }),
  max_drawdown: numeric('max_drawdown', { precision: 8, scale: 4 }),
  volatility: numeric('volatility', { precision: 8, scale: 4 }),
  beta: numeric('beta', { precision: 6, scale: 3 }),

  // Manager details
  manager_tenure_years: integer('manager_tenure_years'),
  manager_aum_total_mm: numeric('manager_aum_total_mm', { precision: 15, scale: 2 }),

  // Extracted data
  fact_sheet_url: text('fact_sheet_url'),
  extracted_text: text('extracted_text'),  // AI-extracted content
  last_extracted_at: timestamp('last_extracted_at'),

  // Metadata
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  managerIdx: index('idx_sma_manager').on(table.manager_name),
  assetClassIdx: index('idx_sma_asset_class').on(table.asset_class),
}));

/**
 * SMA URL Manifest
 * Tracks URLs to scrape for SMA strategy fact sheets
 */
export const smaUrlManifest = pgTable('fmss_sma_url_manifest', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull().unique(),
  manager_name: varchar('manager_name', { length: 255 }).notNull(),
  document_type: varchar('document_type', { length: 50 }),  // fact_sheet, performance_report, etc.

  // Scraping metadata
  last_scraped_at: timestamp('last_scraped_at'),
  scrape_frequency_days: integer('scrape_frequency_days').default(7),
  content_hash: varchar('content_hash', { length: 64 }),  // SHA-256 hash for change detection
  scrape_status: varchar('scrape_status', { length: 50 }),  // pending, success, failed, rate_limited
  scrape_error: text('scrape_error'),

  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  managerIdx: index('idx_url_manager').on(table.manager_name),
  statusIdx: index('idx_url_status').on(table.scrape_status),
}));

// ============================================================================
// SMA FACT SHEET MONITORING TABLES
// ============================================================================

/**
 * SMA Providers
 * Top 50 provider registry with discovery configuration
 */
export const smaProviders = pgTable('fmss_sma_providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider_key: varchar('provider_key', { length: 100 }).notNull().unique(),  // unique slug: "blackrock", "vanguard"
  provider_name: varchar('provider_name', { length: 255 }).notNull(),
  provider_rank: integer('provider_rank'),  // 1-50 ranking by AUM

  // Discovery configuration
  website_domain: varchar('website_domain', { length: 255 }),  // blackrock.com, vanguard.com
  allowed_domains_json: jsonb('allowed_domains_json'),  // ["blackrock.com", "ishares.com"]
  preferred_fetch_mode: varchar('preferred_fetch_mode', { length: 50 }).default('bright_data'),  // bright_data, tavily, direct
  auth_sensitivity: varchar('auth_sensitivity', { length: 50 }).default('public'),  // public, login_required, paywalled
  discovery_mode: varchar('discovery_mode', { length: 50 }).default('active'),  // active, paused, manual_only

  // Provider metadata
  provider_tier: varchar('provider_tier', { length: 50 }),  // tier_1, tier_2, tier_3
  aum_bn: numeric('aum_bn', { precision: 15, scale: 2 }),  // Total AUM in billions
  strategy_count_estimate: integer('strategy_count_estimate'),

  // Monitoring status
  last_discovery_run: timestamp('last_discovery_run'),
  last_successful_scrape: timestamp('last_successful_scrape'),
  active_fact_sheet_count: integer('active_fact_sheet_count').default(0),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  keyIdx: index('idx_provider_key').on(table.provider_key),
  rankIdx: index('idx_provider_rank').on(table.provider_rank),
}));

/**
 * SMA Provider Seed URLs
 * Starting points for discovery crawl (strategy list pages, PDF indexes)
 */
export const smaProviderSeedUrls = pgTable('fmss_sma_provider_seed_urls', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider_id: uuid('provider_id').notNull().references(() => smaProviders.id, { onDelete: 'cascade' }),

  seed_url: text('seed_url').notNull(),
  url_type: varchar('url_type', { length: 50 }).notNull(),  // strategy_list, pdf_index, sitemap, search_page
  url_label: varchar('url_label', { length: 255 }),  // "Equity Strategies Page", "Fixed Income PDF Library"

  // Crawl configuration
  crawl_depth: integer('crawl_depth').default(1),  // How many clicks deep to follow links
  is_active: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(50),  // 1-100, higher = crawl first

  // Status tracking
  last_crawled: timestamp('last_crawled'),
  last_success: timestamp('last_success'),
  consecutive_failures: integer('consecutive_failures').default(0),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('idx_seed_provider').on(table.provider_id),
  typeIdx: index('idx_seed_type').on(table.url_type),
}));

/**
 * SMA Discovered URLs
 * URLs discovered during crawl, classified by type
 */
export const smaDiscoveredUrls = pgTable('fmss_sma_discovered_urls', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider_id: uuid('provider_id').notNull().references(() => smaProviders.id, { onDelete: 'cascade' }),
  seed_url_id: uuid('seed_url_id').references(() => smaProviderSeedUrls.id, { onDelete: 'set null' }),  // Which seed discovered this

  discovered_url: text('discovered_url').notNull().unique(),
  url_hash: varchar('url_hash', { length: 64 }).notNull().unique(),  // SHA-256 of normalized URL

  // Classification
  url_class: varchar('url_class', { length: 50 }),  // fact_sheet, brochure, commentary, performance, holdings, unknown
  classification_confidence: numeric('classification_confidence', { precision: 5, scale: 4 }),  // 0-1 AI confidence
  classified_by: varchar('classified_by', { length: 50 }),  // tavily, minimax, heuristic

  // Discovery metadata
  discovered_at: timestamp('discovered_at').defaultNow().notNull(),
  discovered_via: varchar('discovered_via', { length: 50 }),  // sitemap, link_crawl, tavily_search
  parent_url: text('parent_url'),  // URL that linked to this one

  // Processing status
  acquisition_status: varchar('acquisition_status', { length: 50 }).default('pending'),  // pending, acquired, failed, skipped
  acquired_at: timestamp('acquired_at'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('idx_discovered_provider').on(table.provider_id),
  classIdx: index('idx_discovered_class').on(table.url_class),
  statusIdx: index('idx_discovered_status').on(table.acquisition_status),
  hashIdx: index('idx_discovered_hash').on(table.url_hash),
}));

/**
 * SMA Fact Sheet Documents
 * Document-level tracking with content hashing for change detection
 */
export const smaFactSheetDocuments = pgTable('fmss_sma_fact_sheet_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider_id: uuid('provider_id').notNull().references(() => smaProviders.id, { onDelete: 'cascade' }),
  discovered_url_id: uuid('discovered_url_id').references(() => smaDiscoveredUrls.id, { onDelete: 'set null' }),

  canonical_url: text('canonical_url').notNull().unique(),  // Normalized URL
  document_title: varchar('document_title', { length: 500 }),
  document_type: varchar('document_type', { length: 50 }),  // pdf, html, docx

  // Strategy linkage (may be null if not yet matched)
  matched_strategy_id: uuid('matched_strategy_id').references(() => smaStrategies.id, { onDelete: 'set null' }),
  match_confidence: numeric('match_confidence', { precision: 5, scale: 4 }),  // 0-1 AI confidence
  matched_strategy_name: varchar('matched_strategy_name', { length: 255 }),  // Denormalized for performance

  // Current version tracking
  current_version_id: uuid('current_version_id'),  // FK to smaFactSheetVersions (self-referential via logic)
  current_content_hash: varchar('current_content_hash', { length: 64 }),  // SHA-256 of latest content
  version_count: integer('version_count').default(1),

  // Acquisition metadata
  first_seen: timestamp('first_seen').defaultNow().notNull(),
  last_checked: timestamp('last_checked'),
  last_changed: timestamp('last_changed'),

  // Processing status
  acquisition_status: varchar('acquisition_status', { length: 50 }).default('active'),  // active, stale, removed, error
  parse_status: varchar('parse_status', { length: 50 }).default('pending'),  // pending, parsed, failed
  last_parse_attempt: timestamp('last_parse_attempt'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('idx_factsheet_provider').on(table.provider_id),
  strategyIdx: index('idx_factsheet_strategy').on(table.matched_strategy_id),
  statusIdx: index('idx_factsheet_status').on(table.acquisition_status),
  parseIdx: index('idx_factsheet_parse').on(table.parse_status),
}));

/**
 * SMA Fact Sheet Versions
 * Version history for change tracking and rollback
 */
export const smaFactSheetVersions = pgTable('fmss_sma_fact_sheet_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  document_id: uuid('document_id').notNull().references(() => smaFactSheetDocuments.id, { onDelete: 'cascade' }),

  version_number: integer('version_number').notNull(),  // 1, 2, 3, ...
  content_hash: varchar('content_hash', { length: 64 }).notNull(),  // SHA-256 of raw content
  content_size_bytes: integer('content_size_bytes'),

  // Acquisition metadata
  acquired_at: timestamp('acquired_at').defaultNow().notNull(),
  acquired_via: varchar('acquired_via', { length: 50 }),  // bright_data, tavily, direct_fetch
  acquisition_duration_ms: integer('acquisition_duration_ms'),

  // Storage
  raw_content_s3_key: text('raw_content_s3_key'),  // S3 key if storing raw files
  markdown_s3_key: text('markdown_s3_key'),  // S3 key for converted markdown

  // Change detection
  is_material_change: boolean('is_material_change').default(false),  // Flagged by AI/heuristics
  change_summary: text('change_summary'),  // AI-generated summary of what changed

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('idx_version_document').on(table.document_id),
  hashIdx: index('idx_version_hash').on(table.content_hash),
  acquiredIdx: index('idx_version_acquired').on(table.acquired_at),
}));

/**
 * SMA Parsed Documents
 * Extracted text and structured data from fact sheets
 */
export const smaParsedDocuments = pgTable('fmss_sma_parsed_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  version_id: uuid('version_id').notNull().references(() => smaFactSheetVersions.id, { onDelete: 'cascade' }),
  document_id: uuid('document_id').notNull().references(() => smaFactSheetDocuments.id, { onDelete: 'cascade' }),

  // Extracted text
  full_text: text('full_text'),  // Complete extracted text
  text_length: integer('text_length'),

  // Structured data extraction (AI-powered)
  extracted_data: jsonb('extracted_data'),  // Full MiniMax extraction result
  extraction_model: varchar('extraction_model', { length: 100 }),  // minimax-2.7, gpt-4o, etc.
  extraction_confidence: numeric('extraction_confidence', { precision: 5, scale: 4 }),  // 0-1

  // Key fields (denormalized for quick access)
  strategy_name: varchar('strategy_name', { length: 255 }),
  manager_name: varchar('manager_name', { length: 255 }),
  aum_mm: numeric('aum_mm', { precision: 15, scale: 2 }),
  management_fee_bps: integer('management_fee_bps'),
  inception_date: date('inception_date'),

  // Metadata
  parsed_at: timestamp('parsed_at').defaultNow().notNull(),
  parse_duration_ms: integer('parse_duration_ms'),
  parse_status: varchar('parse_status', { length: 50 }).default('success'),  // success, partial, failed
  parse_error: text('parse_error'),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  versionIdx: index('idx_parsed_version').on(table.version_id),
  documentIdx: index('idx_parsed_document').on(table.document_id),
  parsedIdx: index('idx_parsed_at').on(table.parsed_at),
}));

/**
 * SMA Change Events
 * Material changes detected between versions (alerts for advisors)
 */
export const smaChangeEvents = pgTable('fmss_sma_change_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  document_id: uuid('document_id').notNull().references(() => smaFactSheetDocuments.id, { onDelete: 'cascade' }),
  old_version_id: uuid('old_version_id').references(() => smaFactSheetVersions.id, { onDelete: 'set null' }),
  new_version_id: uuid('new_version_id').notNull().references(() => smaFactSheetVersions.id, { onDelete: 'cascade' }),

  // Change classification
  change_type: varchar('change_type', { length: 100 }).notNull(),  // fee_increase, manager_change, strategy_closure, performance_update
  change_severity: varchar('change_severity', { length: 50 }),  // critical, high, medium, low

  // Change details
  field_changed: varchar('field_changed', { length: 100 }),  // management_fee_bps, manager_name, etc.
  old_value: text('old_value'),
  new_value: text('new_value'),

  // AI-generated summary
  change_summary: text('change_summary'),  // "Management fee increased from 75 bps to 90 bps (+15 bps)"
  advisor_impact_note: text('advisor_impact_note'),  // "Review clients holding this strategy for fee impact"

  // Detection metadata
  detected_at: timestamp('detected_at').defaultNow().notNull(),
  detected_by: varchar('detected_by', { length: 50 }),  // ai_diff, heuristic, manual
  detection_confidence: numeric('detection_confidence', { precision: 5, scale: 4 }),

  // Alert status
  alert_status: varchar('alert_status', { length: 50 }).default('pending'),  // pending, sent, acknowledged, dismissed
  alert_sent_at: timestamp('alert_sent_at'),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('idx_change_document').on(table.document_id),
  typeIdx: index('idx_change_type').on(table.change_type),
  severityIdx: index('idx_change_severity').on(table.change_severity),
  detectedIdx: index('idx_change_detected').on(table.detected_at),
  alertIdx: index('idx_change_alert_status').on(table.alert_status),
}));

/**
 * SMA Provider Runs
 * Logging for discovery and acquisition runs
 */
export const smaProviderRuns = pgTable('fmss_sma_provider_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider_id: uuid('provider_id').references(() => smaProviders.id, { onDelete: 'set null' }),  // Null = full system run

  run_type: varchar('run_type', { length: 50 }).notNull(),  // discovery, acquisition, full_refresh
  run_mode: varchar('run_mode', { length: 50 }),  // scheduled, manual, on_demand

  // Execution details
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  duration_seconds: integer('duration_seconds'),
  status: varchar('status', { length: 50 }).default('running'),  // running, success, failed, partial

  // Results
  urls_discovered: integer('urls_discovered').default(0),
  documents_acquired: integer('documents_acquired').default(0),
  documents_parsed: integer('documents_parsed').default(0),
  changes_detected: integer('changes_detected').default(0),
  errors_encountered: integer('errors_encountered').default(0),

  // Error tracking
  error_summary: text('error_summary'),
  error_details: jsonb('error_details'),

  // Metadata
  triggered_by: varchar('triggered_by', { length: 100 }),  // cron, admin_user, api_request
  run_config: jsonb('run_config'),  // Configuration snapshot

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('idx_run_provider').on(table.provider_id),
  typeIdx: index('idx_run_type').on(table.run_type),
  startedIdx: index('idx_run_started').on(table.started_at),
  statusIdx: index('idx_run_status').on(table.status),
}));

/**
 * SMA Document Alerts
 * Notification queue for material changes requiring advisor attention
 */
export const smaDocumentAlerts = pgTable('fmss_sma_document_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  change_event_id: uuid('change_event_id').notNull().references(() => smaChangeEvents.id, { onDelete: 'cascade' }),
  document_id: uuid('document_id').notNull().references(() => smaFactSheetDocuments.id, { onDelete: 'cascade' }),

  // Alert classification
  alert_type: varchar('alert_type', { length: 100 }).notNull(),  // fee_change, manager_change, closure, performance
  alert_priority: varchar('alert_priority', { length: 50 }).default('medium'),  // critical, high, medium, low

  // Alert content
  alert_title: varchar('alert_title', { length: 500 }),  // "Fee Increase: BlackRock Equity Dividend Strategy"
  alert_message: text('alert_message'),  // Full alert text
  action_required: text('action_required'),  // "Review 23 client accounts holding this strategy"

  // Routing
  target_audience: varchar('target_audience', { length: 50 }).default('all_advisors'),  // all_advisors, affected_advisors, admin_only
  affected_household_count: integer('affected_household_count').default(0),  // How many households hold this

  // Delivery status
  alert_status: varchar('alert_status', { length: 50 }).default('pending'),  // pending, sent, viewed, acknowledged, dismissed
  created_at: timestamp('created_at').defaultNow().notNull(),
  sent_at: timestamp('sent_at'),
  viewed_at: timestamp('viewed_at'),
  acknowledged_at: timestamp('acknowledged_at'),
  acknowledged_by: varchar('acknowledged_by', { length: 255 }),  // User ID or email

  // Metadata
  notification_channels: jsonb('notification_channels'),  // ["email", "in_app", "slack"]
  delivery_metadata: jsonb('delivery_metadata'),  // Email IDs, Slack thread URLs, etc.

  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  changeIdx: index('idx_alert_change').on(table.change_event_id),
  documentIdx: index('idx_alert_document').on(table.document_id),
  statusIdx: index('idx_alert_status').on(table.alert_status),
  priorityIdx: index('idx_alert_priority').on(table.alert_priority),
  createdIdx: index('idx_alert_created').on(table.created_at),
}));

/**
 * Alternative Funds
 * Tracks alternative investment funds (hedge funds, private equity, etc.)
 */
export const alternativeFunds = pgTable('fmss_alternative_funds', {
  id: uuid('id').defaultRandom().primaryKey(),
  fund_name: varchar('fund_name', { length: 255 }).notNull(),
  manager_name: varchar('manager_name', { length: 255 }).notNull(),
  fund_type: varchar('fund_type', { length: 100 }),  // Hedge Fund, Private Equity, Venture Capital, Real Estate
  strategy: varchar('strategy', { length: 100 }),

  // Financial metrics
  aum_mm: numeric('aum_mm', { precision: 15, scale: 2 }),
  minimum_investment: numeric('minimum_investment', { precision: 12, scale: 2 }),
  management_fee_bps: integer('management_fee_bps'),
  performance_fee_pct: numeric('performance_fee_pct', { precision: 5, scale: 2 }),

  // Performance
  ytd_return: numeric('ytd_return', { precision: 8, scale: 4 }),
  one_year_return: numeric('one_year_return', { precision: 8, scale: 4 }),
  three_year_return: numeric('three_year_return', { precision: 8, scale: 4 }),
  inception_date: timestamp('inception_date'),

  // Regulatory
  sec_file_number: varchar('sec_file_number', { length: 50 }),
  form_adv_url: text('form_adv_url'),
  form_d_url: text('form_d_url'),
  extracted_text: text('extracted_text'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  managerIdx: index('idx_alt_manager').on(table.manager_name),
  typeIdx: index('idx_alt_type').on(table.fund_type),
}));

/**
 * Equities
 * Tracks individual equity securities for scoring
 */
export const equities = pgTable('fmss_equities', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(),
  company_name: varchar('company_name', { length: 255 }).notNull(),
  exchange: varchar('exchange', { length: 50 }),
  sector: varchar('sector', { length: 100 }),
  industry: varchar('industry', { length: 100 }),

  // Fundamental metrics
  market_cap_mm: numeric('market_cap_mm', { precision: 15, scale: 2 }),
  price: numeric('price', { precision: 12, scale: 4 }),
  pe_ratio: numeric('pe_ratio', { precision: 8, scale: 2 }),
  dividend_yield: numeric('dividend_yield', { precision: 6, scale: 4 }),

  // Performance
  ytd_return: numeric('ytd_return', { precision: 8, scale: 4 }),
  one_year_return: numeric('one_year_return', { precision: 8, scale: 4 }),
  three_year_return: numeric('three_year_return', { precision: 8, scale: 4 }),
  five_year_return: numeric('five_year_return', { precision: 8, scale: 4 }),

  // Risk metrics
  beta: numeric('beta', { precision: 6, scale: 3 }),
  volatility: numeric('volatility', { precision: 8, scale: 4 }),

  // Analyst data
  analyst_rating: varchar('analyst_rating', { length: 50 }),  // Strong Buy, Buy, Hold, Sell, Strong Sell
  price_target: numeric('price_target', { precision: 12, scale: 4 }),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tickerIdx: index('idx_equity_ticker').on(table.ticker),
  sectorIdx: index('idx_equity_sector').on(table.sector),
}));

/**
 * ETFs (Exchange-Traded Funds)
 * Tracks ETF products for scoring and comparison
 */
export const etfs = pgTable('fmss_etfs', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(),
  fund_name: varchar('fund_name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 100 }),
  asset_class: varchar('asset_class', { length: 100 }),

  // Financial metrics
  aum_mm: numeric('aum_mm', { precision: 15, scale: 2 }),
  expense_ratio_bps: integer('expense_ratio_bps'),
  nav: numeric('nav', { precision: 12, scale: 4 }),

  // Performance
  ytd_return: numeric('ytd_return', { precision: 8, scale: 4 }),
  one_year_return: numeric('one_year_return', { precision: 8, scale: 4 }),
  three_year_return: numeric('three_year_return', { precision: 8, scale: 4 }),
  five_year_return: numeric('five_year_return', { precision: 8, scale: 4 }),

  // Characteristics
  dividend_yield: numeric('dividend_yield', { precision: 6, scale: 4 }),
  pe_ratio: numeric('pe_ratio', { precision: 8, scale: 2 }),
  holdings_count: integer('holdings_count'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tickerIdx: index('idx_etf_ticker').on(table.ticker),
  providerIdx: index('idx_etf_provider').on(table.provider),
}));

// ============================================================================
// SIGNAL TABLES
// ============================================================================

/**
 * Scoring Signals
 * Raw data points used for composite scoring
 */
export const scoringSignals = pgTable('fmss_scoring_signals', {
  id: uuid('id').defaultRandom().primaryKey(),
  asset_type: varchar('asset_type', { length: 50 }).notNull(),  // sma, alternative, equity, etf
  asset_id: uuid('asset_id').notNull(),
  signal_type: varchar('signal_type', { length: 100 }).notNull(),  // insider_buy, earnings_beat, fee_change, etc.

  // Signal data
  signal_value: numeric('signal_value', { precision: 12, scale: 4 }),
  signal_text: text('signal_text'),
  confidence: numeric('confidence', { precision: 5, scale: 4 }),  // 0-1 scale

  // Source tracking
  source: varchar('source', { length: 100 }),  // finnhub, aletheia, edgar, etc.
  source_url: text('source_url'),
  detected_at: timestamp('detected_at').notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  assetIdx: index('idx_signal_asset').on(table.asset_type, table.asset_id),
  typeIdx: index('idx_signal_type').on(table.signal_type),
  detectedIdx: index('idx_signal_detected').on(table.detected_at),
}));

/**
 * Scores
 * Composite scores for assets across 8 dimensions
 */
export const scores = pgTable('fmss_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  asset_type: varchar('asset_type', { length: 50 }).notNull(),
  asset_id: uuid('asset_id').notNull(),

  // 8 Scoring dimensions (0-100 scale)
  risk_adjusted_performance: integer('risk_adjusted_performance'),  // 25% weight
  manager_pedigree: integer('manager_pedigree'),  // 15% weight
  fee_efficiency: integer('fee_efficiency'),  // 10% weight
  insider_conviction: integer('insider_conviction'),  // 15% weight
  regulatory_signal: integer('regulatory_signal'),  // 10% weight
  concentration: integer('concentration'),  // 10% weight
  benchmark_consistency: integer('benchmark_consistency'),  // 10% weight
  esg_alignment: integer('esg_alignment'),  // 5% weight

  // Composite score
  total_score: integer('total_score').notNull(),  // Weighted sum of 8 dimensions
  score_percentile: numeric('score_percentile', { precision: 5, scale: 2 }),  // Percentile rank

  // Metadata
  scored_at: timestamp('scored_at').notNull(),
  model_version: varchar('model_version', { length: 50 }),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assetIdx: index('idx_score_asset').on(table.asset_type, table.asset_id),
  totalIdx: index('idx_score_total').on(table.total_score),
}));

/**
 * Macro Indicators
 * Economic indicators from FRED, Econdb, Alpha Vantage
 */
export const macroIndicators = pgTable('fmss_macro_indicators', {
  id: uuid('id').defaultRandom().primaryKey(),
  indicator_code: varchar('indicator_code', { length: 100 }).notNull(),  // GDP, CPI, UNRATE, etc.
  indicator_name: varchar('indicator_name', { length: 255 }).notNull(),
  frequency: varchar('frequency', { length: 50 }),  // daily, weekly, monthly, quarterly

  // Data point
  observation_date: timestamp('observation_date').notNull(),
  value: numeric('value', { precision: 20, scale: 6 }),

  // Change metrics
  change_pct: numeric('change_pct', { precision: 8, scale: 4 }),
  change_from_prev_period: numeric('change_from_prev_period', { precision: 12, scale: 4 }),

  // Source
  source: varchar('source', { length: 50 }),  // FRED, Econdb, AlphaVantage
  source_url: text('source_url'),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  indicatorIdx: index('idx_macro_indicator').on(table.indicator_code),
  dateIdx: index('idx_macro_date').on(table.observation_date),
}));

/**
 * Earnings Call Sentiment
 * AI-extracted sentiment from earnings call transcripts
 */
export const earningsCallSentiment = pgTable('fmss_earnings_call_sentiment', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  company_name: varchar('company_name', { length: 255 }).notNull(),

  // Call metadata
  call_date: timestamp('call_date').notNull(),
  fiscal_quarter: varchar('fiscal_quarter', { length: 20 }),  // Q1 2024, Q2 2024, etc.

  // Sentiment scores (-1 to +1 scale)
  overall_sentiment: numeric('overall_sentiment', { precision: 5, scale: 4 }),
  management_tone: numeric('management_tone', { precision: 5, scale: 4 }),
  analyst_tone: numeric('analyst_tone', { precision: 5, scale: 4 }),
  guidance_sentiment: numeric('guidance_sentiment', { precision: 5, scale: 4 }),

  // Extracted insights
  key_topics: jsonb('key_topics'),  // ["margin expansion", "product launch", "cost reduction"]
  management_confidence: varchar('management_confidence', { length: 50 }),  // high, medium, low
  forward_outlook: varchar('forward_outlook', { length: 50 }),  // positive, neutral, negative

  // AI extraction
  transcript_url: text('transcript_url'),
  extracted_by_model: varchar('extracted_by_model', { length: 100 }),  // minimax-2.7, gpt-4o, etc.
  extraction_confidence: numeric('extraction_confidence', { precision: 5, scale: 4 }),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tickerIdx: index('idx_earnings_ticker').on(table.ticker),
  dateIdx: index('idx_earnings_date').on(table.call_date),
}));

/**
 * News Sentiment Signals
 * Sentiment analysis from financial news sources
 */
export const newsSentimentSignals = pgTable('fmss_news_sentiment_signals', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: varchar('ticker', { length: 20 }),
  asset_type: varchar('asset_type', { length: 50 }),  // equity, etf, mutual_fund, etc.

  // Article metadata
  headline: text('headline').notNull(),
  source: varchar('source', { length: 100 }),  // Bloomberg, WSJ, Reuters, etc.
  published_at: timestamp('published_at').notNull(),
  article_url: text('article_url'),

  // Sentiment
  sentiment_score: numeric('sentiment_score', { precision: 5, scale: 4 }),  // -1 to +1
  sentiment_label: varchar('sentiment_label', { length: 50 }),  // positive, negative, neutral
  sentiment_magnitude: numeric('sentiment_magnitude', { precision: 5, scale: 4 }),  // 0-1 strength

  // Topics
  topics: jsonb('topics'),  // ["earnings", "M&A", "regulatory"]
  entities_mentioned: jsonb('entities_mentioned'),  // ["Apple", "Tim Cook", "iPhone"]

  // Source
  extracted_via: varchar('extracted_via', { length: 50 }),  // Tavily, Finnhub, direct scrape

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tickerIdx: index('idx_news_ticker').on(table.ticker),
  publishedIdx: index('idx_news_published').on(table.published_at),
}));

// ============================================================================
// SYSTEM TABLES
// ============================================================================

/**
 * Ingest Log
 * Tracks all worker runs and data ingestion operations
 */
export const ingestLog = pgTable('fmss_ingest_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  worker_name: varchar('worker_name', { length: 100 }).notNull(),
  worker_type: varchar('worker_type', { length: 50 }),  // scraper, api, ai_digestion, scoring

  // Execution details
  started_at: timestamp('started_at').notNull(),
  completed_at: timestamp('completed_at'),
  status: varchar('status', { length: 50 }).notNull(),  // running, success, failed, partial

  // Results
  records_processed: integer('records_processed').default(0),
  records_inserted: integer('records_inserted').default(0),
  records_updated: integer('records_updated').default(0),
  records_failed: integer('records_failed').default(0),

  // Error tracking
  error_message: text('error_message'),
  error_stack: text('error_stack'),

  // Metadata
  metadata: jsonb('metadata'),  // Additional context (API calls made, rate limits hit, etc.)

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workerIdx: index('idx_ingest_worker').on(table.worker_name),
  statusIdx: index('idx_ingest_status').on(table.status),
  startedIdx: index('idx_ingest_started').on(table.started_at),
}));

/**
 * Data Sources
 * Tracks external data source configurations and status
 */
export const dataSources = pgTable('fmss_data_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  source_name: varchar('source_name', { length: 100 }).notNull().unique(),
  source_type: varchar('source_type', { length: 50 }),  // web_scraper, api, manual

  // Configuration
  base_url: text('base_url'),
  api_key_env_var: varchar('api_key_env_var', { length: 100 }),  // Name of env var holding API key
  rate_limit_per_minute: integer('rate_limit_per_minute'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  last_successful_fetch: timestamp('last_successful_fetch'),
  consecutive_failures: integer('consecutive_failures').default(0),

  // Metadata
  config: jsonb('config'),  // Additional config (headers, query params, etc.)

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_source_name').on(table.source_name),
}));

/**
 * Asset Categories
 * Lookup table for asset categorization
 */
export const assetCategories = pgTable('fmss_asset_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  category_type: varchar('category_type', { length: 50 }).notNull(),  // asset_class, sector, strategy
  category_code: varchar('category_code', { length: 100 }).notNull(),
  category_name: varchar('category_name', { length: 255 }).notNull(),
  parent_category_id: uuid('parent_category_id'),  // For hierarchical categories

  display_order: integer('display_order').default(0),
  is_active: boolean('is_active').default(true).notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('idx_category_type').on(table.category_type),
  codeIdx: index('idx_category_code').on(table.category_code),
}));

/**
 * Scoring Dimensions
 * Configuration for the 8 scoring dimensions
 */
export const scoringDimensions = pgTable('fmss_scoring_dimensions', {
  id: uuid('id').defaultRandom().primaryKey(),
  dimension_code: varchar('dimension_code', { length: 100 }).notNull().unique(),
  dimension_name: varchar('dimension_name', { length: 255 }).notNull(),

  // Weighting
  weight_pct: numeric('weight_pct', { precision: 5, scale: 2 }).notNull(),  // e.g., 25.00 for 25%

  // Calculation config
  calculation_method: varchar('calculation_method', { length: 50 }),  // formula, ai, api
  formula: text('formula'),  // If calculation_method = formula
  data_sources: jsonb('data_sources'),  // Array of required data source names

  // Display
  description: text('description'),
  display_order: integer('display_order').default(0),
  is_active: boolean('is_active').default(true).notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('idx_dimension_code').on(table.dimension_code),
}));
