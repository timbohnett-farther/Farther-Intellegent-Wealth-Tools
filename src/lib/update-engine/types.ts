/**
 * Farther Prism — Update Engine Types
 *
 * Shared type definitions for the tax-table and regulatory update engine.
 * Covers scraper outputs, change tracking, validation results, human review
 * workflow, advisor bulletins, and versioned tax-table metadata.
 *
 * These types are self-contained and do not depend on React, Next.js, or Prisma.
 */

// ==================== TABLE TYPE ENUMERATION ====================

/**
 * Canonical set of tax / regulatory table types tracked by the update engine.
 * Each scraper produces changes tagged with one or more of these types.
 */
export type TaxTableType =
  | 'ordinary_income_brackets'
  | 'capital_gains_brackets'
  | 'standard_deductions'
  | 'contribution_limits_401k'
  | 'contribution_limits_ira'
  | 'contribution_limits_hsa'
  | 'irmaa_part_b'
  | 'irmaa_part_d'
  | 'ss_cola'
  | 'ss_wage_base'
  | 'ss_bend_points'
  | 'afr_rates'
  | 'estate_exemption'
  | 'gift_exemption'
  | 'amt_exemptions'
  | 'state_income_tax'
  | 'rmd_tables';

// ==================== UPDATE TRIGGERS ====================

/**
 * Indicates the cadence at which a particular scraper or source is checked.
 *
 * - `quarterly`       — IRS Rev Procs, AFR updates (Jan/Apr/Jul/Oct)
 * - `monthly_afr`     — Monthly AFR rate publication
 * - `daily_congress`  — Daily scan of Congress.gov for tax-relevant bills
 * - `annual_tables`   — Once-per-year bracket/limit updates (typically Nov)
 */
export type UpdateTrigger =
  | 'quarterly'
  | 'monthly_afr'
  | 'daily_congress'
  | 'annual_tables';

// ==================== CHANGE ITEM ====================

/**
 * Represents a single detected change from any scraper.
 * This is the core atom of the update-engine pipeline: scrapers produce
 * ChangeItems, processors validate them, and publishers push approved
 * ones to the live tax tables.
 */
export interface ChangeItem {
  /** Classification of the change. */
  type: 'numeric_adjustment' | 'law_change' | 'new_provision' | 'pending_legislation';

  /** Which tax / regulatory table this change applies to. */
  tableType: TaxTableType;

  /** Human-readable source identifier (e.g. "IRS Rev Proc 2026-45"). */
  source: string;

  /** ISO-8601 date when the change takes effect. */
  effectiveDate: string;

  /** Plain-English description of the change. */
  description: string;

  /** The new value(s) — structure varies by tableType. */
  newData: Record<string, unknown>;

  /** The previous value(s) being replaced, if known. */
  previousData: Record<string, unknown> | null;

  /** How impactful this change is for financial plans. */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** All table types affected (may span multiple if a single law touches several). */
  affectedTables: TaxTableType[];

  /**
   * Whether this change can be auto-approved and published without human review.
   * Typically true only for routine annual inflation adjustments.
   */
  autoApprovable: boolean;

  // ---------- Legislative-specific fields (optional) ----------

  /** Bill number for pending legislation (e.g. "H.R. 1234"). */
  billNumber?: string;

  /** Congressional session (e.g. 119). */
  billCongress?: number;

  /** Current status of the bill in the legislative process. */
  billStatus?: string;

  /** AI-generated summary of the bill's impact on financial planning. */
  summary?: string;

  /** Estimated dollar impact on a typical client plan. */
  estimatedImpact?: string;

  /** Describes any validation failure that was detected on this change. */
  validationFailure?: string;
}

// ==================== UPDATE RUN RESULT ====================

/**
 * Summary of a complete update-engine run.
 * One of these is produced each time the orchestrator kicks off a
 * scheduled or manual scan across all configured scrapers.
 */
export interface UpdateRunResult {
  /** Unique identifier for this run (UUID v4). */
  runId: string;

  /** ISO-8601 timestamp when the run started. */
  runDate: string;

  /** Names of data sources that were checked during this run. */
  sourcesChecked: string[];

  /** Total number of new changes detected across all sources. */
  changesDetected: number;

  /** Number of tax tables that were updated (auto-approved changes only). */
  tablesUpdated: number;

  /** Number of existing financial plans that need recalculation. */
  plansRequiringRecalc: number;

  /** Whether any changes require human review before publishing. */
  humanReviewRequired: boolean;

  /** Changes that have been queued for human review. */
  humanReviewItems: HumanReviewItem[];

  /** Number of advisor bulletin alerts generated. */
  advisorAlertsGenerated: number;

  /** Error messages encountered during the run. */
  errors: string[];

  /** Human-readable summary of the run outcome. */
  summary: string;
}

// ==================== VALIDATION ====================

/**
 * Result of validating a proposed change before it is published.
 * Validators check for reasonableness (e.g. bracket values should not
 * change by more than 10% year-over-year) and internal consistency.
 */
export interface ValidationResult {
  /** Whether the change passed all validation checks. */
  passed: boolean;

  /** Non-blocking observations (e.g. "Change is above-average inflation"). */
  warnings: string[];

  /** Blocking issues that prevent auto-approval. */
  errors: string[];

  /** Optional human-readable explanation of the overall result. */
  reason?: string;
}

// ==================== IRS DOCUMENT ANALYSIS ====================

/**
 * Output of analyzing an IRS document (Rev Proc, Notice, etc.)
 * for tax-table-relevant content.
 */
export interface IRSDocumentAnalysis {
  /** Whether the document contains changes to tracked tax tables. */
  containsTaxTableChanges: boolean;

  /** Individual ChangeItems extracted from the document. */
  extractedChanges: ChangeItem[];

  /** AI-generated or rule-based summary of the document's relevance. */
  summary: string;

  /** Overall severity of the changes found. */
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// ==================== LEGISLATIVE IMPACT ====================

/**
 * Assessment of how a piece of legislation would affect the platform
 * if enacted. Used for pending-legislation ChangeItems.
 */
export interface LegislativeImpact {
  /** Plain-English summary of the bill's financial planning impact. */
  summary: string;

  /** Which tax tables would be affected. */
  affectedTables: TaxTableType[];

  /** Projected or stated effective date. */
  effectiveDate: string;

  /** Rough dollar-impact estimate on a median client plan. */
  clientImpactEstimate: string;

  /** How urgent it is for advisors to be aware of this bill. */
  urgency: 'low' | 'medium' | 'high' | 'critical';

  /** Wealth tiers most affected by this legislation. */
  affectedWealthTiers: Array<'emerging' | 'mass_affluent' | 'hnw' | 'uhnw'>;
}

// ==================== SCRAPED DATA SHAPES ====================

/**
 * A single federal income tax bracket as scraped from IRS publications.
 */
export interface ScrapedTaxBracket {
  /** Filing status this bracket applies to. */
  filingStatus: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';

  /** Marginal tax rate as a decimal (e.g. 0.22 = 22%). */
  rate: number;

  /** Lower bound of taxable income for this bracket (inclusive). */
  minIncome: number;

  /** Upper bound of taxable income for this bracket (exclusive), or null for the top bracket. */
  maxIncome: number | null;

  /** Tax year this bracket applies to. */
  taxYear: number;
}

/**
 * A contribution limit for a tax-advantaged account as scraped from
 * IRS publications (401(k), IRA, HSA, etc.).
 */
export interface ScrapedContributionLimit {
  /** Account type identifier. */
  accountType:
    | 'traditional_401k'
    | 'roth_401k'
    | 'traditional_ira'
    | 'roth_ira'
    | 'hsa_individual'
    | 'hsa_family'
    | 'sep_ira'
    | 'simple_ira';

  /** Standard contribution limit for the year. */
  limit: number;

  /** Additional catch-up contribution amount (age 50+). */
  catchUpAmount: number;

  /** Super catch-up contribution amount for ages 60-63 (SECURE 2.0). */
  superCatchUpAmount?: number;

  /** Tax year this limit applies to. */
  taxYear: number;
}

/**
 * A single IRMAA bracket as scraped from CMS publications.
 * IRMAA surcharges are based on Modified Adjusted Gross Income (MAGI).
 */
export interface ScrapedIRMAAbracket {
  /** Whether this is Part B or Part D IRMAA. */
  part: 'B' | 'D';

  /** Filing status this bracket applies to. */
  filingStatus: 'single' | 'married_filing_jointly' | 'married_filing_separately';

  /** Lower bound of MAGI for this bracket (inclusive). */
  magiMin: number;

  /** Upper bound of MAGI for this bracket (exclusive), or null for the top bracket. */
  magiMax: number | null;

  /** Monthly premium surcharge amount. */
  monthlyPremium: number;

  /** Tax year (MAGI look-back year is typically 2 years prior). */
  taxYear: number;
}

/**
 * Applicable Federal Rates as published monthly by the IRS.
 */
export interface ScrapedAFRRates {
  /** Year and month this rate applies to (e.g. "2027-01"). */
  effectiveMonth: string;

  /** Annual short-term AFR (instruments <= 3 years). */
  shortTermAnnual: number;

  /** Annual mid-term AFR (instruments > 3 and <= 9 years). */
  midTermAnnual: number;

  /** Annual long-term AFR (instruments > 9 years). */
  longTermAnnual: number;

  /** Section 7520 rate for charitable/estate planning calculations. */
  section7520Rate: number;
}

/**
 * Social Security data as scraped from SSA publications.
 */
export interface ScrapedSSData {
  /** Calendar year this data applies to. */
  year: number;

  /** Cost-of-living adjustment percentage as a decimal (e.g. 0.025 = 2.5%). */
  colaPercentage: number;

  /** Maximum taxable earnings (Social Security wage base). */
  wageBase: number;

  /** First PIA bend point. */
  bendPoint1: number;

  /** Second PIA bend point. */
  bendPoint2: number;

  /** Full Retirement Age in months (e.g. 804 = 67 years, 0 months). */
  fullRetirementAgeMonths: number;

  /** Maximum monthly benefit at Full Retirement Age. */
  maxMonthlyBenefitFRA: number;
}

/**
 * State income tax data as scraped from a state's tax authority.
 */
export interface ScrapedStateTaxData {
  /** Two-letter state abbreviation. */
  state: string;

  /** Tax year this data applies to. */
  taxYear: number;

  /** Whether this state has an income tax. */
  hasIncomeTax: boolean;

  /** Whether the tax structure is flat (single rate) or graduated (brackets). */
  structure: 'flat' | 'graduated' | 'none';

  /** Flat tax rate, if applicable (as a decimal). */
  flatRate?: number;

  /** Graduated brackets, if applicable. */
  brackets?: Array<{
    /** Filing status. */
    filingStatus: 'single' | 'married_filing_jointly';
    /** Marginal rate as a decimal. */
    rate: number;
    /** Bracket floor (inclusive). */
    minIncome: number;
    /** Bracket ceiling (exclusive), or null for top bracket. */
    maxIncome: number | null;
  }>;

  /** Additional surtax details (e.g. NYC surcharge, MA millionaire tax). */
  surtax?: {
    /** Description of the surtax. */
    description: string;
    /** Surtax rate as a decimal. */
    rate: number;
    /** Income threshold above which the surtax applies. */
    threshold: number;
  };

  /** State estate / inheritance tax details, if any. */
  estateTax?: {
    /** Whether the state imposes an estate tax. */
    hasEstateTax: boolean;
    /** Exemption amount. */
    exemption: number;
    /** Top marginal rate as a decimal. */
    topRate: number;
    /** Whether there is a cliff (entire estate taxed if over exemption). */
    hasCliff: boolean;
  };

  /** Notes on federal conformity or state-specific deductions. */
  conformityNotes?: string;
}

// ==================== CHANGE CLASSIFICATION ====================

/**
 * Classification of a change for routing through the review pipeline.
 * Determined by the processor layer after scrapers produce raw ChangeItems.
 */
export interface ChangeClassification {
  /** Change category. */
  type: 'numeric_adjustment' | 'law_change' | 'new_provision' | 'pending_legislation';

  /** Severity assessment. */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Whether the change can skip human review. */
  autoApprovable: boolean;

  /** Whether a human must review before publishing. */
  requiresHumanReview: boolean;

  /** All table types this change touches. */
  affectedTableTypes: TaxTableType[];
}

// ==================== HUMAN REVIEW WORKFLOW ====================

/**
 * An item in the human-review queue. Created when a detected change
 * cannot be auto-approved (e.g. law changes, new provisions, large
 * numeric swings).
 */
export interface HumanReviewItem {
  /** Unique identifier for this review item. */
  id: string;

  /** The underlying change being reviewed. */
  changeItem: ChangeItem;

  /** ISO-8601 timestamp when the change was detected. */
  detectedAt: string;

  /** Current status in the review workflow. */
  status: 'pending' | 'approved' | 'rejected' | 'published';

  /** Email or user ID of the reviewer, if reviewed. */
  reviewedBy?: string;

  /** ISO-8601 timestamp of the review decision, if reviewed. */
  reviewedAt?: string;

  /** Reviewer notes explaining the decision. */
  notes?: string;

  /** AI-generated summary to assist the reviewer. */
  aiSummary?: string;
}

// ==================== ADVISOR BULLETINS ====================

/**
 * A bulletin generated for advisors after significant changes are
 * detected and published. Contains a summary suitable for inclusion
 * in advisor dashboards, emails, or CRM notes.
 */
export interface AdvisorBulletin {
  /** Unique identifier for the bulletin. */
  id: string;

  /** Title of the bulletin (e.g. "2027 Tax Bracket Updates Published"). */
  title: string;

  /** ISO-8601 timestamp when the bulletin was generated. */
  generatedAt: string;

  /** ChangeItems included in this bulletin. */
  changes: ChangeItem[];

  /** Plain-English summary suitable for advisor communication. */
  summary: string;

  /** Estimated number of client plans affected by these changes. */
  affectedPlanCount: number;
}

// ==================== SOURCE CHECK RESULT ====================

/**
 * Result of checking a single data source for updates.
 * Each scraper returns one of these to the orchestrator.
 */
export interface SourceCheckResult {
  /** Name of the source that was checked (e.g. "IRS Newsroom", "Congress.gov"). */
  source: string;

  /** ISO-8601 timestamp of when the check was performed. */
  lastChecked: string;

  /** ChangeItems detected from this source (empty array if no changes). */
  changesFound: ChangeItem[];

  /** Error messages encountered while checking this source. */
  errors: string[];
}

// ==================== TAX TABLE VERSION ====================

/**
 * A versioned snapshot of a tax table. The update engine creates new
 * versions when changes are approved and published. Old versions are
 * kept for audit trail and plan-recalculation purposes.
 */
export interface TaxTableVersion {
  /** Unique identifier for this version. */
  id: string;

  /** Tax year this version applies to. */
  taxYear: number;

  /** Which table type this is a version of. */
  tableType: TaxTableType;

  /** Filing status, if the table is filing-status-specific. */
  filingStatus?: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';

  /** ISO-8601 date when this version becomes effective. */
  effectiveDate: string;

  /** Source attribution (e.g. "IRS Rev Proc 2026-45"). */
  source: string;

  /** The actual table data — structure varies by tableType. */
  data: Record<string, unknown>;

  /** Whether this is the currently active version. */
  isCurrent: boolean;

  /** ID of the version that replaced this one, if superseded. */
  replacedBy: string | null;

  /** ISO-8601 timestamp of when this version was created. */
  createdAt: string;

  /** User or system identifier that created this version. */
  createdBy: string;

  /** User or system identifier that validated this version. */
  validatedBy: string | null;

  /** Notes from the validation process. */
  validationNotes: string | null;
}
