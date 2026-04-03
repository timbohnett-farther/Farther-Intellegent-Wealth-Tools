-- CRM Migration System Schema
-- Creates 7 tables for managing CRM data migration from 5 platforms:
-- Wealthbox, Redtail, Commonwealth, Salesforce, Advizon
-- Supports chunked file upload, parsing, field mapping, validation, and HubSpot import

-- Migration Sessions Table
CREATE TABLE IF NOT EXISTS migration_sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  platform TEXT NOT NULL,  -- REDTAIL, WEALTHBOX, COMMONWEALTH, SALESFORCE, ADVIZON
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,  -- UPLOADING, PARSING, MAPPING, VALIDATING, IMPORTING, COMPLETED, FAILED

  -- Progress tracking
  total_records INTEGER NOT NULL DEFAULT 0,
  parsed_records INTEGER NOT NULL DEFAULT 0,
  mapped_records INTEGER NOT NULL DEFAULT 0,
  imported_records INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  uploaded_by TEXT,
  completed_at DATETIME,
  error_log TEXT  -- JSON
);

CREATE INDEX IF NOT EXISTS idx_migration_sessions_status ON migration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_migration_sessions_platform ON migration_sessions(platform);

-- Upload Files Table (tracks chunked file uploads)
CREATE TABLE IF NOT EXISTS upload_files (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,

  upload_status TEXT NOT NULL,  -- UPLOADING, COMPLETED, FAILED
  upload_progress REAL NOT NULL DEFAULT 0,  -- 0-100

  -- Chunked upload tracking
  total_chunks INTEGER NOT NULL DEFAULT 0,
  uploaded_chunks INTEGER NOT NULL DEFAULT 0,
  chunk_metadata TEXT,  -- JSON

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upload_files_session ON upload_files(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_files_status ON upload_files(upload_status);

-- Raw Contacts Table (staging for parsed contact data)
CREATE TABLE IF NOT EXISTS raw_contacts (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,
  source_id TEXT NOT NULL,  -- ID from source CRM
  source_type TEXT,  -- contact type if available

  raw_data TEXT NOT NULL,  -- JSON

  -- Extracted preview fields
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Mapping and validation
  mapping_status TEXT NOT NULL,  -- UNMAPPED, MAPPED, VALIDATED, IMPORTED, ERROR
  validation_errors TEXT,  -- JSON

  -- HubSpot import tracking
  hubspot_id TEXT,
  imported_at DATETIME,
  import_error TEXT,

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_contacts_session_status ON raw_contacts(session_id, mapping_status);
CREATE INDEX IF NOT EXISTS idx_raw_contacts_hubspot ON raw_contacts(hubspot_id);

-- Raw Households Table (staging for parsed household data)
CREATE TABLE IF NOT EXISTS raw_households (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  raw_data TEXT NOT NULL,  -- JSON

  -- Extracted preview fields
  household_name TEXT,
  primary_contact TEXT,
  aum REAL,

  -- Mapping and validation
  mapping_status TEXT NOT NULL,
  validation_errors TEXT,  -- JSON

  -- HubSpot import tracking
  hubspot_id TEXT,
  imported_at DATETIME,
  import_error TEXT,

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_households_session_status ON raw_households(session_id, mapping_status);
CREATE INDEX IF NOT EXISTS idx_raw_households_hubspot ON raw_households(hubspot_id);

-- Raw Activities Table (staging for notes, meetings, calls, emails, tasks)
CREATE TABLE IF NOT EXISTS raw_activities (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  raw_data TEXT NOT NULL,  -- JSON

  -- Activity classification
  activity_type TEXT NOT NULL,  -- NOTE, MEETING, CALL, EMAIL, TASK

  -- Preview fields
  subject TEXT,
  description TEXT,
  activity_date DATETIME,
  related_contact_id TEXT,

  -- Mapping and validation
  mapping_status TEXT NOT NULL,
  validation_errors TEXT,  -- JSON

  -- HubSpot import tracking
  hubspot_id TEXT,
  imported_at DATETIME,
  import_error TEXT,

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_activities_session_type ON raw_activities(session_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_raw_activities_session_status ON raw_activities(session_id, mapping_status);

-- Raw Relationships Table (staging for contact-household and contact-contact links)
CREATE TABLE IF NOT EXISTS raw_relationships (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  raw_data TEXT NOT NULL,  -- JSON

  -- Relationship details
  from_entity_type TEXT NOT NULL,  -- CONTACT, HOUSEHOLD
  from_entity_id TEXT NOT NULL,  -- sourceId reference
  to_entity_type TEXT NOT NULL,  -- CONTACT, HOUSEHOLD
  to_entity_id TEXT NOT NULL,
  relationship_type TEXT,  -- spouse, child, advisor, etc.

  -- Mapping and validation
  mapping_status TEXT NOT NULL,
  validation_errors TEXT,  -- JSON

  -- Import tracking
  imported_at DATETIME,
  import_error TEXT,

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_relationships_session_status ON raw_relationships(session_id, mapping_status);
CREATE INDEX IF NOT EXISTS idx_raw_relationships_entities ON raw_relationships(from_entity_type, from_entity_id);

-- Field Mappings Table (stores mapping configurations: source field → HubSpot property)
CREATE TABLE IF NOT EXISTS field_mappings (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  session_id TEXT NOT NULL,

  -- Mapping definition
  entity_type TEXT NOT NULL,  -- CONTACT, HOUSEHOLD
  source_field TEXT NOT NULL,  -- JSON path in rawData
  target_property TEXT NOT NULL,  -- HubSpot property internal name

  -- Transformation rules
  transformation_type TEXT,  -- direct, concat, split, lookup, custom
  transformation_config TEXT,  -- JSON

  -- Validation
  required INTEGER NOT NULL DEFAULT 0,  -- Boolean stored as 0/1
  default_value TEXT,

  FOREIGN KEY (session_id) REFERENCES migration_sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, entity_type, source_field)
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_session ON field_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_entity ON field_mappings(entity_type);
