-- Migration: Add Relocation Tax Calculator tables
-- Date: 2026-04-03
-- Phase 1: Interstate Tax Migration Calculator

-- Jurisdictions (52 destinations + 9 leaving states)
CREATE TABLE IF NOT EXISTS relocation_jurisdictions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_destination_enabled BOOLEAN DEFAULT TRUE,
  is_leaving_state_enabled BOOLEAN DEFAULT FALSE,
  tax_year INTEGER NOT NULL,
  effective_date TEXT NOT NULL,
  last_reviewed_at TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  source_set_id TEXT,
  notes_public TEXT,
  notes_internal TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relocation_jurisdictions_code ON relocation_jurisdictions(code);
CREATE INDEX idx_relocation_jurisdictions_tax_year ON relocation_jurisdictions(tax_year);
CREATE INDEX idx_relocation_jurisdictions_status ON relocation_jurisdictions(status);

-- Income tax rules
CREATE TABLE IF NOT EXISTS relocation_income_tax_rules (
  id TEXT PRIMARY KEY,
  jurisdiction_id TEXT NOT NULL,
  filing_status TEXT NOT NULL,
  system_type TEXT NOT NULL,
  ordinary_income_taxed BOOLEAN DEFAULT TRUE,
  ordinary_income_brackets TEXT,
  flat_rate REAL,
  standard_deduction REAL DEFAULT 0,
  capital_gains_mode TEXT NOT NULL,
  capital_gains_rate REAL,
  capital_gains_exemption REAL DEFAULT 0,
  special_logic_key TEXT,
  active_from TEXT NOT NULL,
  active_to TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jurisdiction_id) REFERENCES relocation_jurisdictions(id) ON DELETE CASCADE
);

CREATE INDEX idx_relocation_income_tax_rules_jurisdiction ON relocation_income_tax_rules(jurisdiction_id);
CREATE INDEX idx_relocation_income_tax_rules_filing_status ON relocation_income_tax_rules(filing_status);

-- Estate and inheritance tax rules
CREATE TABLE IF NOT EXISTS relocation_estate_rules (
  id TEXT PRIMARY KEY,
  jurisdiction_id TEXT NOT NULL,
  estate_tax_mode TEXT NOT NULL,
  estate_exemption REAL,
  estate_rate_schedule_key TEXT,
  inheritance_tax_mode TEXT DEFAULT 'none',
  inheritance_rule_key TEXT,
  active_from TEXT NOT NULL,
  active_to TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jurisdiction_id) REFERENCES relocation_jurisdictions(id) ON DELETE CASCADE
);

CREATE INDEX idx_relocation_estate_rules_jurisdiction ON relocation_estate_rules(jurisdiction_id);

-- Puerto Rico Act 60 rules
CREATE TABLE IF NOT EXISTS relocation_puerto_rico_rules (
  id TEXT PRIMARY KEY,
  jurisdiction_id TEXT UNIQUE NOT NULL,
  bona_fide_residency_required BOOLEAN DEFAULT TRUE,
  act60_enabled BOOLEAN DEFAULT TRUE,
  decree_timing_options TEXT NOT NULL,
  post_2026_preferential_rate REAL DEFAULT 0.04,
  pre_residency_gains_rate REAL DEFAULT 0.05,
  primary_residence_required BOOLEAN DEFAULT TRUE,
  special_logic_key TEXT,
  active_from TEXT NOT NULL,
  active_to TEXT,
  version INTEGER DEFAULT 1,
  act_38_2026_changes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jurisdiction_id) REFERENCES relocation_jurisdictions(id) ON DELETE CASCADE
);

-- Source documents
CREATE TABLE IF NOT EXISTS relocation_source_documents (
  id TEXT PRIMARY KEY,
  jurisdiction_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  publisher TEXT NOT NULL,
  published_date TEXT,
  retrieved_at TEXT NOT NULL,
  is_authoritative BOOLEAN DEFAULT FALSE,
  content_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jurisdiction_id) REFERENCES relocation_jurisdictions(id) ON DELETE CASCADE
);

CREATE INDEX idx_relocation_source_documents_jurisdiction ON relocation_source_documents(jurisdiction_id);
CREATE INDEX idx_relocation_source_documents_source_type ON relocation_source_documents(source_type);

-- Source sets
CREATE TABLE IF NOT EXISTS relocation_source_sets (
  id TEXT PRIMARY KEY,
  jurisdiction_code TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  document_ids TEXT NOT NULL,
  review_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relocation_source_sets_jurisdiction ON relocation_source_sets(jurisdiction_code);
CREATE INDEX idx_relocation_source_sets_review_status ON relocation_source_sets(review_status);

-- Candidate updates (AI extraction queue)
CREATE TABLE IF NOT EXISTS relocation_candidate_updates (
  id TEXT PRIMARY KEY,
  jurisdiction_code TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  detected_date TEXT NOT NULL,
  proposed_changes TEXT NOT NULL,
  extracted_by TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  extraction_summary TEXT NOT NULL,
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  review_date TEXT,
  review_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relocation_candidate_updates_jurisdiction ON relocation_candidate_updates(jurisdiction_code);
CREATE INDEX idx_relocation_candidate_updates_review_status ON relocation_candidate_updates(review_status);

-- Calculation runs
CREATE TABLE IF NOT EXISTS relocation_calculation_runs (
  id TEXT PRIMARY KEY,
  leaving_state TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  filing_status TEXT NOT NULL,
  ordinary_income REAL NOT NULL,
  capital_gains REAL NOT NULL,
  estate_value REAL,
  puerto_rico_mode TEXT,
  result_annual_savings REAL NOT NULL,
  result_10yr_savings REAL NOT NULL,
  result_estate_exposure_flag TEXT,
  rules_version_hash TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relocation_calculation_runs_leaving ON relocation_calculation_runs(leaving_state);
CREATE INDEX idx_relocation_calculation_runs_destination ON relocation_calculation_runs(destination_state);
CREATE INDEX idx_relocation_calculation_runs_created ON relocation_calculation_runs(created_at);

-- Scraper sources
CREATE TABLE IF NOT EXISTS relocation_scraper_sources (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  scraping_frequency TEXT NOT NULL,
  last_scraped TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  scraper_config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relocation_scraper_sources_type ON relocation_scraper_sources(source_type);
CREATE INDEX idx_relocation_scraper_sources_active ON relocation_scraper_sources(is_active);
