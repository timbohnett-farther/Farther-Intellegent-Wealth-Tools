/**
 * Farther Tax Planning Platform -- Stage 1 Canonical Data Model
 *
 * This file defines every core type used across the tax planning platform.
 * All monetary values are stored as signed 64-bit-safe integers in cents.
 * All rates are stored as basis points (1% = 100 bps).
 * All IDs are UUID v4 strings.
 *
 * @module tax-planning/types
 */

// =====================================================================
// Branded Primitive Types
// =====================================================================

/**
 * Monetary value stored in cents (int64-safe signed integer).
 * Example: $1,234.56 is stored as 123456.
 * Use the `cents()` helper to convert from dollars.
 */
export type MoneyCents = number & { readonly __brand: 'MoneyCents' };

/**
 * Rate expressed in basis points (int32).
 * 1% = 100 bps, 0.01% = 1 bps.
 * Use the `bps()` helper to convert from a percentage.
 */
export type RateBps = number & { readonly __brand: 'RateBps' };

/**
 * Calendar tax year (int16).
 * Example: 2026
 */
export type TaxYear = number & { readonly __brand: 'TaxYear' };

/**
 * Reference to a specific line on a tax form.
 * Pattern: "{form}:{line}:{slot}"
 * Example: "f1040:l1z:wages"
 */
export type TaxLineRef = string & { readonly __brand: 'TaxLineRef' };

// =====================================================================
// Enums / Union Types
// =====================================================================

/** IRS filing status. */
export type FilingStatus = 'SINGLE' | 'MFJ' | 'MFS' | 'HOH' | 'QW';

/** Supported document types for ingestion. */
export type DocType = 'FORM1040_PDF' | 'IRS_RETURN_TRANSCRIPT_PDF' | 'OTHER';

/** Status of a document through the ingest pipeline. */
export type IngestStatus = 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'EXTRACTED' | 'FAILED';

/** How a field value was extracted from a source document. */
export type SourceKind = 'OCR' | 'PDF_TEXT' | 'TRANSCRIPT_TABLE' | 'USER';

/** How a scenario override is applied to a base value. */
export type OverrideMode = 'ABSOLUTE' | 'DELTA';

/** Outcome status of a calculation run. */
export type CalcRunStatus = 'OK' | 'WARN' | 'ERROR';

/** RBAC roles for platform users. */
export type UserRole = 'ADMIN' | 'ADVISOR' | 'PARAPLANNER' | 'OPS' | 'READONLY' | 'CLIENT';

/** Mode for scenario override targets (alias kept for explicit API clarity). */
export type ScenarioOverrideMode = 'ABSOLUTE' | 'DELTA';

/** Source provenance of a computed calc line value. */
export type CalcLineSource = 'extracted' | 'computed' | 'override';

/** Integration connection health status. */
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

// =====================================================================
// Entity Types
// =====================================================================

/**
 * A wealth-management firm using the platform.
 * All data is scoped to a firm for multi-tenancy.
 */
export interface Firm {
  /** UUID v4 primary key. */
  firm_id: string;
  /** Firm display name (1-200 characters). */
  name: string;
  /** ISO 4217 currency code. Must be "USD" in v1. */
  home_currency: string;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * An authenticated user of the platform.
 * Scoped to a single firm.
 */
export interface User {
  /** UUID v4 primary key. */
  user_id: string;
  /** FK to Firm. */
  firm_id: string;
  /** RFC 5322 email address, always lowercased. */
  email: string;
  /** RBAC role governing permissions. */
  role: UserRole;
  /** User first name. */
  first_name: string;
  /** User last name. */
  last_name: string;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * A household represents a tax filing unit (individual or couple).
 * Contains one or more Person records.
 */
export interface Household {
  /** UUID v4 primary key. */
  household_id: string;
  /** FK to Firm. */
  firm_id: string;
  /** Display name shown in the UI (1-120 characters). */
  display_name: string;
  /** 2-letter USPS state abbreviation for primary residence. */
  primary_state?: string;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * An individual within a household (primary filer, spouse, or dependent).
 */
export interface Person {
  /** UUID v4 primary key. */
  person_id: string;
  /** FK to Household. */
  household_id: string;
  /** First name (1-60 characters). */
  first_name: string;
  /** Last name (1-80 characters). */
  last_name: string;
  /** Date of birth as ISO 8601 date string (YYYY-MM-DD). Must be <= today. */
  dob?: string;
  /** Last four digits of SSN. Pattern: ^[0-9]{4}$ */
  ssn_last4?: string;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * A tax-related document uploaded for a household and tax year.
 * Tracks the full lifecycle from upload through extraction.
 */
export interface ReturnDocument {
  /** UUID v4 primary key. */
  doc_id: string;
  /** FK to Household. */
  household_id: string;
  /** The tax year this document pertains to. */
  tax_year: TaxYear;
  /** Classification of the uploaded document. */
  doc_type: DocType;
  /** S3 URI where the document is stored (s3://...). */
  storage_uri: string;
  /** SHA-256 hash of the uploaded file for integrity verification. */
  sha256: string;
  /** ISO 8601 timestamp when the document was ingested. */
  ingested_at: string;
  /** Current status in the ingest pipeline. */
  ingest_status: IngestStatus;
  /** Original filename as provided by the uploader. */
  original_filename?: string;
}

/**
 * Bounding box for a field extracted from a document page.
 * Coordinates are in points from the top-left origin.
 */
export interface BoundingBox {
  /** X offset from left edge. */
  x: number;
  /** Y offset from top edge. */
  y: number;
  /** Width of the bounding box. */
  w: number;
  /** Height of the bounding box. */
  h: number;
}

/**
 * A single field value extracted from a ReturnDocument.
 * Maps a tax line reference to a value with provenance metadata.
 */
export interface ExtractedField {
  /** UUID v4 primary key. */
  field_id: string;
  /** FK to ReturnDocument. */
  doc_id: string;
  /** Reference to the tax form line this field represents. */
  tax_line_ref: TaxLineRef;
  /** Numeric value in cents (for monetary fields). */
  value_cents?: MoneyCents;
  /** Raw text value (for non-monetary or ambiguous fields). */
  value_text?: string;
  /** Extraction confidence score between 0 and 1 (inclusive). */
  confidence: number;
  /** How this field was extracted. */
  source_kind: SourceKind;
  /** 1-based page number where the field was found. */
  page_num?: number;
  /** Bounding box on the source page. */
  bbox?: BoundingBox;
}

/**
 * A tax return record representing a filed or projected return
 * for a household in a given tax year.
 */
export interface TaxReturn {
  /** UUID v4 primary key. */
  return_id: string;
  /** FK to Household. */
  household_id: string;
  /** The tax year for this return. */
  tax_year: TaxYear;
  /** IRS filing status. */
  filing_status: FilingStatus;
  /** Adjusted Gross Income in cents. */
  agi_cents?: MoneyCents;
  /** Taxable income in cents. */
  taxable_income_cents?: MoneyCents;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * A what-if scenario attached to a TaxReturn.
 * One scenario per return is marked as the baseline (actuals).
 */
export interface Scenario {
  /** UUID v4 primary key. */
  scenario_id: string;
  /** FK to TaxReturn. */
  return_id: string;
  /** User-facing scenario name (1-80 characters). */
  name: string;
  /** True if this scenario represents the actual/baseline figures. */
  is_baseline: boolean;
  /** ISO 8601 timestamp of record creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

/**
 * An override applied within a scenario to modify a specific tax line value.
 */
export interface ScenarioOverride {
  /** UUID v4 primary key. */
  override_id: string;
  /** FK to Scenario. */
  scenario_id: string;
  /** The tax line being overridden. */
  target_tax_line_ref: TaxLineRef;
  /** How the override is applied: ABSOLUTE replaces, DELTA adds to base. */
  mode: OverrideMode;
  /** The override amount in cents. */
  amount_cents: MoneyCents;
}

/**
 * A single execution of the tax calculation engine for a scenario.
 * Captures engine version and policy data version for reproducibility.
 */
export interface CalcRun {
  /** UUID v4 primary key. */
  calc_run_id: string;
  /** FK to Scenario. */
  scenario_id: string;
  /** Semantic version of the calc engine (e.g., "1.2.3"). */
  engine_version: string;
  /** Content-addressable hash of the policy dataset used. */
  policy_version: string;
  /** Overall status of the calculation run. */
  status: CalcRunStatus;
  /** ISO 8601 timestamp when computation completed. */
  computed_at: string;
  /** Summary metrics keyed by metric_id, values in cents. */
  metrics: Record<string, MoneyCents>;
}

/**
 * A single line item produced by a CalcRun.
 * Each line maps to a specific metric and records its provenance.
 */
export interface CalcLine {
  /** UUID v4 primary key. */
  calc_line_id: string;
  /** FK to CalcRun. */
  calc_run_id: string;
  /** Metric identifier (e.g., "federal.total_tax"). */
  metric_id: string;
  /** Computed value in cents. */
  value_cents: MoneyCents;
  /** Provenance of this value. */
  source: CalcLineSource;
}

// =====================================================================
// Supporting / Infrastructure Types
// =====================================================================

/**
 * An immutable audit log entry for compliance and traceability.
 * Every state-changing action produces an AuditEvent.
 */
export interface AuditEvent {
  /** UUID v4 primary key. */
  event_id: string;
  /** FK to Firm. */
  firm_id: string;
  /** FK to User who performed the action. */
  user_id: string;
  /** Dot-delimited event key (e.g., "household.create", "scenario.compute"). */
  event_key: string;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  /** IP address of the originating request. */
  ip?: string;
  /** Arbitrary structured payload with event-specific details. */
  payload: Record<string, unknown>;
}

/**
 * A versioned snapshot of tax policy data (brackets, rates, limits)
 * used by the calculation engine for a given tax year.
 */
export interface PolicyDataset {
  /** UUID v4 primary key. */
  dataset_id: string;
  /** Tax year this policy data applies to. */
  tax_year: TaxYear;
  /** Content-addressable hash for cache-busting and reproducibility. */
  version_hash: string;
  /** ISO 8601 timestamp from which this dataset is effective. */
  effective_from: string;
  /** The policy data payload. */
  data: Record<string, unknown>;
}

/**
 * Tracks a third-party integration connection for a firm
 * (e.g., custodian, CRM, document provider).
 */
export interface IntegrationConnection {
  /** UUID v4 primary key. */
  connection_id: string;
  /** FK to Firm. */
  firm_id: string;
  /** Integration provider identifier (e.g., "schwab", "hubspot"). */
  provider: string;
  /** Current health status of the connection. */
  status: IntegrationStatus;
  /** OAuth/API scopes granted for this connection. */
  scopes: string[];
  /** ISO 8601 timestamp when the connection was established. */
  connected_at: string;
}

// =====================================================================
// API Request / Response Types
// =====================================================================

/**
 * Standard error envelope returned by all API endpoints on failure.
 * Follows RFC 7807 spirit with a correlation ID for support tracing.
 */
export interface ErrorEnvelope {
  error: {
    /** Machine-readable error code (e.g., "VALIDATION_ERROR", "NOT_FOUND"). */
    code: string;
    /** Human-readable error description. */
    message: string;
    /** Additional structured error details (field-level errors, etc.). */
    details: Record<string, unknown>;
    /** Unique correlation ID for log tracing and support tickets. */
    correlationId: string;
  };
}

/** Request body for creating a new household. */
export interface CreateHouseholdRequest {
  /** Display name for the household (1-120 characters). */
  displayName: string;
  /** Optional 2-letter USPS state code for primary residence. */
  primaryState?: string;
}

/** Response body after successfully creating a household. */
export type CreateHouseholdResponse = Household;

/** Request body for creating a new what-if scenario. */
export interface CreateScenarioRequest {
  /** UUID of the TaxReturn this scenario belongs to. */
  returnId: string;
  /** User-facing scenario name (1-80 characters). */
  name: string;
  /** Whether this scenario represents the baseline/actuals. */
  isBaseline: boolean;
}

/**
 * The result of running the tax calculation engine for a scenario.
 * Includes summary metrics and individual line breakdowns.
 */
export interface ComputeResult {
  /** UUID of the CalcRun that produced these results. */
  calcRunId: string;
  /** Overall status of the computation. */
  status: CalcRunStatus;
  /** Summary metrics keyed by metric_id. */
  metrics: Record<string, MoneyCents>;
  /** Individual calculated line items. */
  lines: Array<{
    /** Tax line reference for this item. */
    taxLineRef: TaxLineRef;
    /** Computed value in cents. */
    valueCents: MoneyCents;
    /** Provenance of the value. */
    source: string;
  }>;
}

/** Request body for user authentication. */
export interface LoginRequest {
  /** RFC 5322 email address. */
  email: string;
  /** User password (plaintext over TLS). */
  password: string;
}

/** Response body after successful authentication. */
export interface LoginResponse {
  /** JWT access token for API authorization. */
  accessToken: string;
  /** Refresh token for obtaining new access tokens. */
  refreshToken: string;
  /** Access token TTL in seconds. */
  expiresIn: number;
  /** Subset of user profile data for the authenticated user. */
  user: Pick<User, 'user_id' | 'email' | 'role' | 'first_name' | 'last_name'>;
}

/** Request body to initiate a document upload via presigned URL. */
export interface UploadInitRequest {
  /** UUID of the household this document belongs to. */
  householdId: string;
  /** Tax year the document pertains to. */
  taxYear: TaxYear;
  /** Classification of the document being uploaded. */
  docType: DocType;
  /** Original filename for display and auditing. */
  filename: string;
}

/** Response body with presigned upload URL and assigned doc ID. */
export interface UploadInitResponse {
  /** Presigned S3 URL for the client to PUT the file. */
  uploadUrl: string;
  /** UUID assigned to the new ReturnDocument record. */
  docId: string;
}

/** Request body for bulk-submitting extracted fields for a document. */
export interface BulkExtractedFieldsRequest {
  /** UUID of the ReturnDocument these fields belong to. */
  docId: string;
  /** Array of extracted fields (field_id is server-generated). */
  fields: Omit<ExtractedField, 'field_id'>[];
}

// =====================================================================
// Helper Functions
// =====================================================================

/**
 * Convert a dollar amount to MoneyCents.
 * Rounds to the nearest cent to avoid floating-point drift.
 *
 * @param dollars - Dollar amount (e.g., 1234.56)
 * @returns Value in cents as a branded MoneyCents
 *
 * @example
 * ```ts
 * const price = cents(19.99); // 1999 as MoneyCents
 * ```
 */
export function cents(dollars: number): MoneyCents {
  return Math.round(dollars * 100) as MoneyCents;
}

/**
 * Convert MoneyCents back to a dollar amount.
 *
 * @param c - Value in cents
 * @returns Dollar amount as a plain number
 *
 * @example
 * ```ts
 * const dollars = toDollars(1999 as MoneyCents); // 19.99
 * ```
 */
export function toDollars(c: MoneyCents): number {
  return c / 100;
}

/**
 * Convert a percentage to basis points.
 * Rounds to the nearest integer bps.
 *
 * @param percent - Percentage value (e.g., 5.25 for 5.25%)
 * @returns Basis points as a branded RateBps
 *
 * @example
 * ```ts
 * const rate = bps(5.25); // 525 as RateBps
 * ```
 */
export function bps(percent: number): RateBps {
  return Math.round(percent * 100) as RateBps;
}

/**
 * Convert RateBps back to a percentage.
 *
 * @param b - Value in basis points
 * @returns Percentage as a plain number
 *
 * @example
 * ```ts
 * const pct = toPercent(525 as RateBps); // 5.25
 * ```
 */
export function toPercent(b: RateBps): number {
  return b / 100;
}

/**
 * Parse a TaxLineRef string into its constituent parts.
 *
 * @param ref - A TaxLineRef in the format "{form}:{line}:{slot}"
 * @returns An object with form, line, and slot fields
 * @throws {Error} If the ref does not match the expected pattern
 *
 * @example
 * ```ts
 * const parsed = parseTaxLineRef('f1040:l1z:wages' as TaxLineRef);
 * // { form: 'f1040', line: 'l1z', slot: 'wages' }
 * ```
 */
export function parseTaxLineRef(ref: TaxLineRef): {
  form: string;
  line: string;
  slot: string;
} {
  const parts = (ref as string).split(':');
  if (parts.length !== 3) {
    throw new Error(
      `Invalid TaxLineRef "${ref}": expected format "{form}:{line}:{slot}"`
    );
  }
  return { form: parts[0], line: parts[1], slot: parts[2] };
}

/**
 * Construct a TaxLineRef from its constituent parts.
 *
 * @param form - Tax form identifier (e.g., "f1040")
 * @param line - Line identifier (e.g., "l1z")
 * @param slot - Slot descriptor (e.g., "wages")
 * @returns A branded TaxLineRef string
 *
 * @example
 * ```ts
 * const ref = formatTaxLineRef('f1040', 'l1z', 'wages');
 * // "f1040:l1z:wages" as TaxLineRef
 * ```
 */
export function formatTaxLineRef(
  form: string,
  line: string,
  slot: string
): TaxLineRef {
  return `${form}:${line}:${slot}` as TaxLineRef;
}

// =====================================================================
// Common Tax Line Reference Constants
// =====================================================================

/**
 * Well-known Form 1040 line references used throughout the platform.
 * These correspond to standard IRS Form 1040 line numbers.
 */
export const COMMON_TAX_LINE_REFS = {
  /** Line 1z -- Total wages, salaries, tips. */
  WAGES: 'f1040:l1z:wages' as TaxLineRef,
  /** Line 2b -- Taxable interest income. */
  TAXABLE_INTEREST: 'f1040:l2b:taxable_interest' as TaxLineRef,
  /** Line 3a -- Qualified dividends. */
  QUALIFIED_DIVIDENDS: 'f1040:l3a:qualified_dividends' as TaxLineRef,
  /** Line 3b -- Ordinary dividends. */
  ORDINARY_DIVIDENDS: 'f1040:l3b:ordinary_dividends' as TaxLineRef,
  /** Line 7 -- Capital gain or loss. */
  CAPITAL_GAIN_LOSS: 'f1040:l7:capital_gain_loss' as TaxLineRef,
  /** Line 11 -- Adjusted Gross Income (AGI). */
  AGI: 'f1040:l11:agi' as TaxLineRef,
  /** Line 15 -- Taxable income. */
  TAXABLE_INCOME: 'f1040:l15:taxable_income' as TaxLineRef,
  /** Line 16 -- Tax. */
  TAX: 'f1040:l16:tax' as TaxLineRef,
} as const;
