/**
 * Farther Unified Platform — Household Data Model (Golden Record)
 *
 * The Household is the atomic data unit of the Farther platform.
 * All financial planning, proposals, tax analysis, and reporting
 * flows through the household as the central entity.
 *
 * Design principles:
 * - All monetary values are plain numbers (dollars, not cents) at the
 *   household level.  The calc-engine and tax-planning modules use
 *   branded MoneyCents internally; conversion happens at boundaries.
 * - All dates are ISO 8601 strings.
 * - All IDs are branded string primitives to prevent accidental swaps.
 * - No React, Next.js, or Prisma dependencies — this module is
 *   self-contained and can be used in workers, CLI tools, and tests.
 *
 * @module household/types
 */

// =====================================================================
// Branded Primitive Types
// =====================================================================

/**
 * Unique identifier for a Household entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type HouseholdId = string & { readonly __brand: 'HouseholdId' };

/**
 * Unique identifier for a HouseholdMember entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type MemberId = string & { readonly __brand: 'MemberId' };

/**
 * Unique identifier for a HouseholdAccount entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type AccountId = string & { readonly __brand: 'AccountId' };

// =====================================================================
// Branded Primitive Constructors
// =====================================================================

/**
 * Create a branded HouseholdId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded HouseholdId
 *
 * @example
 * ```ts
 * const hid = householdId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function householdId(id: string): HouseholdId {
  return id as HouseholdId;
}

/**
 * Create a branded MemberId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded MemberId
 */
export function memberId(id: string): MemberId {
  return id as MemberId;
}

/**
 * Create a branded AccountId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded AccountId
 */
export function accountId(id: string): AccountId {
  return id as AccountId;
}

// =====================================================================
// Enums / Union Types — Member
// =====================================================================

/**
 * The role a member plays within a household.
 *
 * - PRIMARY: the principal client / primary filer
 * - CO_CLIENT: spouse or partner who is also a client
 * - DEPENDENT: child or other dependent
 * - TRUSTEE: a person serving as a trustee for household trusts
 * - POWER_OF_ATTORNEY: a person holding POA for a household member
 */
export type MemberRole =
  | 'PRIMARY'
  | 'CO_CLIENT'
  | 'DEPENDENT'
  | 'TRUSTEE'
  | 'POWER_OF_ATTORNEY';

/**
 * The relationship of a member to the primary client.
 */
export type MemberRelationship =
  | 'SELF'
  | 'SPOUSE'
  | 'PARTNER'
  | 'CHILD'
  | 'PARENT'
  | 'SIBLING'
  | 'OTHER';

/**
 * Employment status of a household member.
 */
export type EmploymentStatus =
  | 'EMPLOYED'
  | 'SELF_EMPLOYED'
  | 'RETIRED'
  | 'UNEMPLOYED'
  | 'STUDENT';

/**
 * Self-reported health status for life-planning assumptions.
 */
export type HealthStatus = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

// =====================================================================
// Enums / Union Types — Household
// =====================================================================

/**
 * Wealth tier classification for segmenting households.
 *
 * - EMERGING: < $250K investable assets
 * - MASS_AFFLUENT: $250K – $1M
 * - HNW: $1M – $10M
 * - UHNW: $10M – $100M
 * - INSTITUTIONAL: > $100M or entity-level
 */
export type WealthTier =
  | 'EMERGING'
  | 'MASS_AFFLUENT'
  | 'HNW'
  | 'UHNW'
  | 'INSTITUTIONAL';

/**
 * Lifecycle status of a household on the platform.
 */
export type HouseholdStatus =
  | 'PROSPECT'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'DORMANT'
  | 'OFFBOARDED';

// =====================================================================
// Enums / Union Types — Account
// =====================================================================

/**
 * Legal registration type of an account.
 */
export type AccountRegistration =
  | 'INDIVIDUAL'
  | 'JOINT_TENANTS'
  | 'JOINT_TIC'
  | 'COMMUNITY_PROPERTY'
  | 'TRUST'
  | 'ESTATE'
  | 'CUSTODIAL'
  | 'ENTITY';

/**
 * Tax treatment bucket for an account.
 *
 * - TAXABLE: fully taxable brokerage / bank accounts
 * - TAX_DEFERRED: Traditional IRA, 401(k), etc.
 * - TAX_FREE: Roth IRA, Roth 401(k), HSA (qualified), etc.
 * - NON_QUALIFIED: annuities and other non-qualified vehicles
 */
export type AccountTaxBucket =
  | 'TAXABLE'
  | 'TAX_DEFERRED'
  | 'TAX_FREE'
  | 'NON_QUALIFIED';

/**
 * Comprehensive account type enumeration covering all vehicles
 * commonly encountered in wealth management.
 */
export type AccountType =
  | 'BROKERAGE'
  | 'IRA_TRADITIONAL'
  | 'IRA_ROTH'
  | 'IRA_SEP'
  | 'IRA_SIMPLE'
  | '401K'
  | '403B'
  | '457B'
  | 'HSA'
  | 'EDUCATION_529'
  | 'UGMA_UTMA'
  | 'TRUST'
  | 'ANNUITY'
  | 'PENSION'
  | 'REAL_ESTATE'
  | 'BUSINESS_INTEREST'
  | 'PRIVATE_EQUITY'
  | 'HEDGE_FUND'
  | 'CRYPTOCURRENCY'
  | 'COLLECTIBLES'
  | 'CHECKING'
  | 'SAVINGS'
  | 'MONEY_MARKET'
  | 'CD'
  | 'LIFE_INSURANCE'
  | 'OTHER';

/**
 * Custodian / clearing firm identifier.
 */
export type CustodianId =
  | 'SCHWAB'
  | 'FIDELITY'
  | 'PERSHING'
  | 'ALTRUIST'
  | 'MANUAL'
  | 'OTHER';

// =====================================================================
// Enums / Union Types — Goals
// =====================================================================

/**
 * Classification of a financial goal.
 */
export type GoalType =
  | 'RETIREMENT'
  | 'EDUCATION'
  | 'HOME_PURCHASE'
  | 'ESTATE_TRANSFER'
  | 'CHARITABLE_GIVING'
  | 'INCOME_REPLACEMENT'
  | 'TRAVEL'
  | 'MAJOR_PURCHASE'
  | 'EMERGENCY_FUND'
  | 'DEBT_PAYOFF'
  | 'BUSINESS_EXIT'
  | 'CUSTOM';

/**
 * Priority level for a goal.
 *
 * - ESSENTIAL: non-negotiable (e.g., retirement income floor)
 * - IMPORTANT: strong preference (e.g., children's education)
 * - ASPIRATIONAL: nice-to-have (e.g., vacation home)
 */
export type GoalPriority = 'ESSENTIAL' | 'IMPORTANT' | 'ASPIRATIONAL';

/**
 * Current funding status of a goal, typically computed by the
 * planning engine based on Monte Carlo projections.
 */
export type GoalFundingStatus =
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'OFF_TRACK'
  | 'FUNDED'
  | 'NOT_STARTED';

// =====================================================================
// Enums / Union Types — Debt
// =====================================================================

/**
 * Classification of a debt obligation.
 */
export type DebtType =
  | 'MORTGAGE'
  | 'HELOC'
  | 'AUTO_LOAN'
  | 'STUDENT_LOAN'
  | 'PERSONAL_LOAN'
  | 'CREDIT_CARD'
  | 'MARGIN_LOAN'
  | 'BUSINESS_LOAN'
  | 'OTHER';

// =====================================================================
// Enums / Union Types — Income
// =====================================================================

/**
 * Classification of an income stream.
 */
export type IncomeType =
  | 'SALARY'
  | 'BONUS'
  | 'SELF_EMPLOYMENT'
  | 'RENTAL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'CAPITAL_GAINS'
  | 'PENSION'
  | 'SOCIAL_SECURITY'
  | 'ANNUITY'
  | 'TRUST_DISTRIBUTION'
  | 'ALIMONY'
  | 'OTHER';

/**
 * Tax character of an income stream for planning purposes.
 */
export type IncomeTaxCharacter =
  | 'ORDINARY'
  | 'CAPITAL_GAIN'
  | 'QUALIFIED_DIVIDEND'
  | 'TAX_EXEMPT'
  | 'PARTIALLY_TAXABLE';

/**
 * Payment frequency for income or expenses.
 */
export type IncomeFrequency =
  | 'ANNUAL'
  | 'MONTHLY'
  | 'SEMI_MONTHLY'
  | 'BI_WEEKLY'
  | 'WEEKLY';

// =====================================================================
// Enums / Union Types — Expense
// =====================================================================

/**
 * Category classification for household expenses.
 */
export type ExpenseCategory =
  | 'HOUSING'
  | 'TRANSPORTATION'
  | 'FOOD'
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'EDUCATION'
  | 'ENTERTAINMENT'
  | 'TRAVEL'
  | 'CHARITABLE'
  | 'TAXES'
  | 'DEBT_SERVICE'
  | 'CHILDCARE'
  | 'PROFESSIONAL_SERVICES'
  | 'PERSONAL'
  | 'OTHER';

/**
 * Payment frequency for recurring expenses.
 */
export type ExpenseFrequency = 'ANNUAL' | 'MONTHLY' | 'QUARTERLY';

// =====================================================================
// Enums / Union Types — Tax
// =====================================================================

/**
 * IRS filing status.
 * Matches the tax-planning module's FilingStatus for consistency.
 */
export type FilingStatus = 'SINGLE' | 'MFJ' | 'MFS' | 'HOH' | 'QW';

// =====================================================================
// Enums / Union Types — Estate
// =====================================================================

/**
 * Status of the household's estate plan documentation.
 */
export type EstatePlanStatus =
  | 'CURRENT'
  | 'NEEDS_UPDATE'
  | 'MISSING'
  | 'IN_PROGRESS';

// =====================================================================
// Enums / Union Types — Real Estate
// =====================================================================

/**
 * Type of real estate holding.
 */
export type RealEstateType =
  | 'PRIMARY_RESIDENCE'
  | 'VACATION_HOME'
  | 'RENTAL_PROPERTY'
  | 'COMMERCIAL'
  | 'LAND'
  | 'INVESTMENT_PROPERTY';

// =====================================================================
// Enums / Union Types — Data Provenance
// =====================================================================

/**
 * Source system that owns or provided data.
 * Used for conflict resolution and audit trails.
 */
export type DataSource =
  | 'ADVISOR'
  | 'CUSTODIAN'
  | 'CLIENT_PORTAL'
  | 'SYSTEM'
  | 'IMPORT';

// =====================================================================
// PII Classification
// =====================================================================

/**
 * Data classification levels for PII and sensitive fields.
 *
 * - PUBLIC: no restrictions (e.g., household display name in advisor context)
 * - INTERNAL: visible to all firm employees
 * - CONFIDENTIAL: restricted to advisors and ops with need-to-know
 * - RESTRICTED: PII requiring encryption, masking, and audit logging
 */
export type PIIClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

// =====================================================================
// Core Entity Interfaces
// =====================================================================

/**
 * The Household is the **Golden Record** of the Farther platform.
 *
 * It serves as the atomic data unit through which all financial planning,
 * proposals, tax analysis, client reporting, and integration data flows.
 * Every household is scoped to a single firm and assigned to an advisor.
 *
 * The household aggregates members, accounts, income streams, expenses,
 * goals, debts, real estate, tax profile, and estate plan into a single
 * cohesive entity that represents a family's complete financial picture.
 */
export interface Household {
  /** UUID v4 primary key. */
  id: HouseholdId;
  /** FK to the firm this household belongs to (multi-tenancy). */
  firmId: string;
  /** FK to the assigned advisor. */
  advisorId: string;
  /** Display name for the household (e.g., "The Smith Family"). */
  name: string;
  /** Current lifecycle status. */
  status: HouseholdStatus;
  /** Wealth tier classification based on total investable assets. */
  wealthTier: WealthTier;
  /** HubSpot contact ID for CRM integration, or null if not linked. */
  externalCrmId: string | null;

  // -------------------- Nested Collections --------------------

  /** All members of this household (primary, spouse, dependents, etc.). */
  members: HouseholdMember[];
  /** All financial accounts associated with the household. */
  accounts: HouseholdAccount[];
  /** All income streams for the household. */
  income: HouseholdIncome[];
  /** All recurring expenses for the household. */
  expenses: HouseholdExpense[];
  /** All financial goals for the household. */
  goals: HouseholdGoal[];
  /** All debt obligations for the household. */
  debts: HouseholdDebt[];
  /** All real estate holdings for the household. */
  realEstate: HouseholdRealEstate[];
  /** Consolidated tax profile, or null if not yet populated. */
  taxProfile: HouseholdTaxProfile | null;
  /** Estate plan summary, or null if not yet documented. */
  estatePlan: HouseholdEstatePlan | null;

  // -------------------- Aggregated Metrics (Computed) --------------------

  /** Total value of all assets (accounts + real estate + other). */
  totalAssets: number;
  /** Total value of all liabilities (debts + mortgages). */
  totalLiabilities: number;
  /** Net worth = totalAssets - totalLiabilities. */
  netWorth: number;
  /** Total assets under management by Farther (isManagedByFarther accounts). */
  totalAum: number;

  // -------------------- Metadata --------------------

  /** Arbitrary tags for filtering and segmentation. */
  tags: string[];
  /** Free-text advisor notes about the household. */
  notes: string | null;
  /** ISO 8601 timestamp of record creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last modification. */
  updatedAt: string;
  /** ISO 8601 timestamp of the last completed review, or null. */
  lastReviewedAt: string | null;
  /** ISO 8601 timestamp of the next scheduled review, or null. */
  nextReviewAt: string | null;

  // -------------------- Data Provenance --------------------

  /** The system that last wrote authoritative data to this record. */
  dataOwner: DataSource;
  /** ISO 8601 timestamp of last external data sync, or null. */
  lastSyncedAt: string | null;
  /**
   * Optimistic concurrency version number.
   * Incremented on every mutation; used to detect write conflicts.
   */
  version: number;
}

/**
 * An individual within a household.
 *
 * Members can be the primary client, co-client (spouse/partner),
 * dependents (children), or professional roles (trustee, POA).
 * Each member has their own demographic data, employment info,
 * and life-planning assumptions.
 */
export interface HouseholdMember {
  /** UUID v4 primary key. */
  id: MemberId;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** Role within the household. */
  role: MemberRole;
  /** Relationship to the primary client. */
  relationship: MemberRelationship;
  /** Legal first name. */
  firstName: string;
  /** Legal middle name, or null. */
  middleName: string | null;
  /** Legal last name. */
  lastName: string;
  /** Preferred / nickname, or null. */
  preferredName: string | null;
  /** Date of birth as ISO 8601 date string (YYYY-MM-DD). */
  dateOfBirth: string;
  /** Gender identity, or null if not disclosed. */
  gender: string | null;
  /** Email address. PII: CONFIDENTIAL. */
  email: string | null;
  /** Mobile phone number. PII: CONFIDENTIAL. */
  phoneMobile: string | null;
  /** Last four digits of SSN. PII: RESTRICTED. Pattern: ^[0-9]{4}$ */
  ssnLastFour: string | null;
  /** Citizenship country code (ISO 3166-1 alpha-2). */
  citizenship: string;
  /** State of domicile (2-letter USPS code), or null. */
  domicileState: string | null;
  /** Current employment status, or null if unknown. */
  employmentStatus: EmploymentStatus | null;
  /** Employer name, or null. */
  employerName: string | null;
  /** Occupation / job title, or null. */
  occupation: string | null;
  /** Whether this member is actively part of the household. */
  isActive: boolean;

  // -------------------- Life Planning --------------------

  /** Planned retirement age, or null if not set. */
  retirementAge: number | null;
  /** Assumed life expectancy (age), or null for actuarial default. */
  lifeExpectancy: number | null;
  /** Self-reported health status, or null if not disclosed. */
  healthStatus: HealthStatus | null;
}

/**
 * A financial account associated with a household.
 *
 * Accounts span all vehicle types: brokerage, retirement (IRA, 401k),
 * savings, trust, alternative investments, cryptocurrency, etc.
 * Each account tracks its balance, cost basis, asset allocation,
 * and custodian details.
 */
export interface HouseholdAccount {
  /** UUID v4 primary key. */
  id: AccountId;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** FK to the member who owns this account. */
  ownerId: MemberId;
  /** FK to a co-owner (e.g., joint account), or null. */
  coOwnerId: MemberId | null;
  /** Account display name (e.g., "John's Roth IRA"). */
  name: string;
  /** Financial institution name (e.g., "Charles Schwab"), or null. */
  institution: string | null;
  /** Custodian / clearing firm identifier. */
  custodian: CustodianId;
  /** Last 4 digits of account number. PII: CONFIDENTIAL. */
  accountNumberLast4: string | null;
  /** Account vehicle type. */
  accountType: AccountType;
  /** Legal registration type. */
  registration: AccountRegistration;
  /** Tax treatment bucket. */
  taxBucket: AccountTaxBucket;
  /** Current account balance in dollars. */
  currentBalance: number;
  /** Total cost basis of holdings, or null if unavailable. */
  costBasis: number | null;
  /** Unrealized gain/loss (currentBalance - costBasis), or null. */
  unrealizedGain: number | null;

  // -------------------- Asset Allocation --------------------

  /** Equity allocation percentage (0-1), or null. */
  equityPct: number | null;
  /** Fixed income allocation percentage (0-1), or null. */
  bondPct: number | null;
  /** Cash allocation percentage (0-1), or null. */
  cashPct: number | null;
  /** Alternatives allocation percentage (0-1), or null. */
  alternativePct: number | null;

  // -------------------- Performance --------------------

  /** Year-to-date return as a decimal (e.g., 0.08 = 8%), or null. */
  ytdReturn: number | null;
  /** Since-inception return as a decimal, or null. */
  inceptionReturn: number | null;

  // -------------------- Metadata --------------------

  /** True if this account is managed by Farther's advisory service. */
  isManagedByFarther: boolean;
  /** True if this account is held at a non-custodian institution. */
  isHeldAway: boolean;
  /** ISO 8601 timestamp of last custodian data sync, or null. */
  lastSyncedAt: string | null;
  /** ISO 8601 date when the balance was last accurate. */
  balanceAsOf: string;
  /** Whether this account is currently active (not closed). */
  isActive: boolean;
}

/**
 * An income stream for a household member.
 *
 * Income can be earned (salary, bonus, self-employment), passive
 * (rental, trust distributions), or portfolio (dividends, interest,
 * capital gains).  Each stream includes growth assumptions and
 * tax character for projection purposes.
 */
export interface HouseholdIncome {
  /** UUID v4 primary key. */
  id: string;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** FK to the member who earns this income. */
  memberId: MemberId;
  /** Classification of the income type. */
  type: IncomeType;
  /** Display name (e.g., "John's salary at Acme Corp"). */
  name: string;
  /** Annual gross amount in dollars. */
  annualAmount: number;
  /** Payment frequency. */
  frequency: IncomeFrequency;
  /** First year this income applies, or null if already active. */
  startYear: number | null;
  /** Last year this income applies, or null if indefinite. */
  endYear: number | null;
  /** Expected annual growth rate as a decimal (e.g., 0.03 = 3%). */
  growthRate: number;
  /** Whether the growth rate is real (inflation-adjusted) or nominal. */
  isInflationAdjusted: boolean;
  /** Whether this income is subject to federal income tax. */
  isTaxable: boolean;
  /** Tax character for federal income tax purposes. */
  taxCharacter: IncomeTaxCharacter;
  /** Whether this income stream is currently active. */
  isActive: boolean;
}

/**
 * A recurring expense for the household.
 *
 * Expenses are categorized and flagged as essential vs. discretionary
 * for planning purposes (e.g., determining the income "floor" in
 * retirement withdrawal strategies).
 */
export interface HouseholdExpense {
  /** UUID v4 primary key. */
  id: string;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** Expense category. */
  category: ExpenseCategory;
  /** Display name (e.g., "Monthly mortgage payment"). */
  name: string;
  /** Annual amount in dollars. */
  annualAmount: number;
  /** Whether this is an essential (non-discretionary) expense. */
  isEssential: boolean;
  /** Payment frequency. */
  frequency: ExpenseFrequency;
  /** First year this expense applies, or null if already active. */
  startYear: number | null;
  /** Last year this expense applies, or null if indefinite. */
  endYear: number | null;
  /** Expected annual growth rate as a decimal (e.g., 0.03 = 3%). */
  growthRate: number;
  /** Whether the growth rate is real (inflation-adjusted) or nominal. */
  isInflationAdjusted: boolean;
  /** Whether this expense is currently active. */
  isActive: boolean;
}

/**
 * A financial goal for the household.
 *
 * Goals are the north star of financial planning.  Each goal has a
 * target amount, target year, priority level, and computed funding
 * status.  Goals can be linked to specific accounts for tracking.
 */
export interface HouseholdGoal {
  /** UUID v4 primary key. */
  id: string;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** Classification of the goal type. */
  type: GoalType;
  /** Display name (e.g., "Retire at 65", "Kate's college fund"). */
  name: string;
  /** Target funding amount in dollars. */
  targetAmount: number;
  /** Current accumulated funding in dollars. */
  currentFunding: number;
  /** Priority level for goal sequencing. */
  priority: GoalPriority;
  /** Computed funding status from the planning engine. */
  fundingStatus: GoalFundingStatus;
  /** Target year to achieve the goal. */
  targetYear: number;
  /** Monthly savings contribution toward this goal, or null. */
  monthlyContribution: number | null;
  /** Account IDs funding this goal (for tracking and allocation). */
  linkedAccountIds: AccountId[];
  /** Whether the target amount is expressed in real (today's) dollars. */
  inflationAdjusted: boolean;
  /** Free-text notes about the goal. */
  notes: string | null;
  /** Whether this goal is currently active. */
  isActive: boolean;
}

/**
 * A debt obligation for a household member.
 *
 * Debts include mortgages, auto loans, student loans, credit cards,
 * margin loans, and business loans.  Each debt tracks its balance,
 * rate, and payment schedule for cash flow projections.
 */
export interface HouseholdDebt {
  /** UUID v4 primary key. */
  id: string;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** FK to the member who holds this debt. */
  memberId: MemberId;
  /** Classification of the debt type. */
  type: DebtType;
  /** Display name (e.g., "Primary mortgage", "Auto loan"). */
  name: string;
  /** Original principal balance in dollars. */
  originalBalance: number;
  /** Current outstanding balance in dollars. */
  currentBalance: number;
  /** Annual interest rate as a decimal (e.g., 0.065 = 6.5%). */
  interestRate: number;
  /** Monthly payment amount in dollars. */
  monthlyPayment: number;
  /** Remaining term in months, or null if revolving. */
  remainingTermMonths: number | null;
  /** Whether the interest is tax-deductible (e.g., mortgage interest). */
  isTaxDeductible: boolean;
  /** Whether this debt is currently active (not paid off). */
  isActive: boolean;
}

/**
 * A real estate holding for the household.
 *
 * Includes primary residence, vacation homes, rental properties,
 * commercial real estate, and undeveloped land.  Used for net worth
 * calculations, cash flow projections (rental income vs. expenses),
 * and estate planning.
 */
export interface HouseholdRealEstate {
  /** UUID v4 primary key. */
  id: string;
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** FK to the member who owns this property. */
  ownerId: MemberId;
  /** Classification of the property type. */
  type: RealEstateType;
  /** Property address. PII: CONFIDENTIAL. */
  address: string;
  /** Current estimated market value in dollars. */
  estimatedValue: number;
  /** Original purchase price / cost basis, or null. */
  costBasis: number | null;
  /** Outstanding mortgage balance, or null if owned free and clear. */
  mortgageBalance: number | null;
  /** Annual property tax in dollars, or null. */
  annualPropertyTax: number | null;
  /** Annual homeowner's / property insurance in dollars, or null. */
  annualInsurance: number | null;
  /** Annual gross rental income in dollars, or null. */
  annualRentalIncome: number | null;
  /** Annual operating expenses in dollars (maintenance, HOA, etc.), or null. */
  annualExpenses: number | null;
  /** Whether this is the household's primary residence. */
  isPrimaryResidence: boolean;
  /** ISO 8601 date of purchase, or null. */
  purchaseDate: string | null;
  /** Whether this property is currently owned (not sold). */
  isActive: boolean;
}

/**
 * Consolidated tax profile for the household.
 *
 * Captures the household's filing status, tax brackets, exposure to
 * special taxes (AMT, NIIT), and key figures for planning scenarios.
 * Updated annually after tax return filing or as part of tax projections.
 */
export interface HouseholdTaxProfile {
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** IRS filing status. */
  filingStatus: FilingStatus;
  /** Federal marginal income tax rate as a decimal (e.g., 0.37). */
  federalBracket: number;
  /** State marginal income tax rate as a decimal, or null if no state tax. */
  stateBracket: number | null;
  /** State of domicile for tax purposes (2-letter USPS code). */
  domicileState: string;
  /** Estimated blended effective federal + state rate as a decimal. */
  estimatedEffectiveRate: number;
  /** Estimated Adjusted Gross Income in dollars. */
  estimatedAGI: number;
  /** Estimated taxable income in dollars. */
  estimatedTaxableIncome: number;
  /** Whether the household has potential Alternative Minimum Tax exposure. */
  amtExposure: boolean;
  /** Whether the household is exposed to Net Investment Income Tax (3.8%). */
  niitExposure: boolean;
  /** Whether the household is eligible for the Qualified Business Income deduction. */
  qbiEligible: boolean;
  /** Capital loss carryforward available from prior years in dollars. */
  capitalLossCarryforward: number;
  /** Charitable contribution carryforward from prior years in dollars. */
  charitableCarryforward: number;
  /** Last tax year for which a return was filed, or null. */
  lastTaxYearFiled: number | null;
  /** Name of the household's CPA / tax preparer, or null. */
  cpaName: string | null;
  /** Email of the household's CPA, or null. PII: INTERNAL. */
  cpaEmail: string | null;
}

/**
 * Estate plan summary for the household.
 *
 * Tracks the existence and currency of key estate planning documents,
 * estimated estate tax exposure, and contact info for the estate attorney.
 */
export interface HouseholdEstatePlan {
  /** FK to the parent Household. */
  householdId: HouseholdId;
  /** Overall status of the estate plan. */
  status: EstatePlanStatus;
  /** Whether the household has a valid will. */
  hasWill: boolean;
  /** Whether the household has an active trust. */
  hasTrust: boolean;
  /** Whether the household has a durable power of attorney. */
  hasPoa: boolean;
  /** Whether the household has a healthcare directive / living will. */
  hasHealthcareDirective: boolean;
  /** Estimated gross estate value in dollars. */
  estimatedGrossEstate: number;
  /** Estimated estate tax liability in dollars. */
  estimatedEstateTax: number;
  /** Lifetime gift/estate tax exemption used in dollars. */
  exemptionUsed: number;
  /** Remaining lifetime exemption in dollars. */
  remainingExemption: number;
  /** Names of trusts associated with the household. */
  trustNames: string[];
  /** ISO 8601 date of last estate plan review, or null. */
  lastUpdated: string | null;
  /** Estate attorney name, or null. */
  attorneyName: string | null;
  /** Estate attorney email, or null. PII: INTERNAL. */
  attorneyEmail: string | null;
  /** Free-text notes about the estate plan. */
  notes: string | null;
}

// =====================================================================
// Household 360 View (Materialized / Computed)
// =====================================================================

/**
 * Asset summary breakdown for the Household 360 view.
 */
export interface AssetSummary {
  /** Total value of all assets. */
  totalAssets: number;
  /** Total value of all liabilities. */
  totalLiabilities: number;
  /** Net worth (assets minus liabilities). */
  netWorth: number;
  /** Total assets under Farther management. */
  totalAum: number;
  /** Total assets held at non-Farther institutions. */
  heldAwayAssets: number;
  /** Liquid assets (cash, money market, brokerage). */
  liquidAssets: number;
  /** Illiquid assets (real estate, private equity, collectibles). */
  illiquidAssets: number;
  /** Total retirement account balances (IRA, 401k, pension, etc.). */
  retirementAssets: number;
  /** Total in taxable accounts. */
  taxableAssets: number;
  /** Total in tax-deferred accounts. */
  taxDeferredAssets: number;
  /** Total in tax-free accounts. */
  taxFreeAssets: number;
}

/**
 * Income summary breakdown for the Household 360 view.
 */
export interface IncomeSummary {
  /** Total annual income from all sources. */
  totalAnnualIncome: number;
  /** Earned income (salary, bonus, self-employment). */
  earnedIncome: number;
  /** Passive income (rental, trust distributions). */
  passiveIncome: number;
  /** Portfolio income (dividends, interest, capital gains). */
  portfolioIncome: number;
}

/**
 * Expense summary breakdown for the Household 360 view.
 */
export interface ExpenseSummary {
  /** Total annual expenses. */
  totalAnnualExpenses: number;
  /** Total essential / non-discretionary expenses. */
  essentialExpenses: number;
  /** Total discretionary expenses. */
  discretionaryExpenses: number;
  /** Savings rate as a decimal (1 - expenses/income). */
  savingsRate: number;
}

/**
 * Goals summary breakdown for the Household 360 view.
 */
export interface GoalsSummary {
  /** Total number of active goals. */
  totalGoals: number;
  /** Goals currently on track. */
  onTrack: number;
  /** Goals at risk. */
  atRisk: number;
  /** Goals off track. */
  offTrack: number;
  /** Fully funded goals. */
  funded: number;
  /** Sum of all goal target amounts. */
  totalTargetAmount: number;
  /** Sum of all goal current funding. */
  totalCurrentFunding: number;
  /** Overall funding percentage (currentFunding / targetAmount). */
  overallFundingPct: number;
}

/**
 * Debt summary breakdown for the Household 360 view.
 */
export interface DebtSummary {
  /** Total outstanding debt. */
  totalDebt: number;
  /** Total monthly debt service payments. */
  totalMonthlyPayments: number;
  /** Debt-to-income ratio (annual debt service / annual income). */
  debtToIncomeRatio: number;
  /** Weighted average interest rate across all debts. */
  weightedAvgRate: number;
}

/**
 * Recommended asset allocation from the risk assessment engine.
 */
export interface RecommendedAllocation {
  /** Target equity allocation as a decimal (0-1). */
  equity: number;
  /** Target fixed income allocation as a decimal (0-1). */
  fixedIncome: number;
  /** Target alternatives allocation as a decimal (0-1). */
  alternatives: number;
  /** Target cash allocation as a decimal (0-1). */
  cash: number;
}

/**
 * The Household 360 View is a materialized, computed snapshot
 * combining the household record with aggregated summaries.
 *
 * This is the primary data structure consumed by the advisor dashboard,
 * client portal, and planning modules.  It is recomputed on every
 * meaningful data change via the event bus.
 */
export interface Household360View {
  /** The full Household record. */
  household: Household;

  // -------------------- Aggregated Summaries --------------------

  /** Breakdown of assets, liabilities, and net worth. */
  assetSummary: AssetSummary;
  /** Breakdown of income by source type. */
  incomeSummary: IncomeSummary;
  /** Breakdown of expenses and savings rate. */
  expenseSummary: ExpenseSummary;
  /** Breakdown of goals and funding progress. */
  goalsSummary: GoalsSummary;
  /** Breakdown of debts and debt service. */
  debtSummary: DebtSummary;

  // -------------------- Planning Context --------------------

  /** UUID of the active financial plan, or null. */
  activePlanId: string | null;
  /** UUID of the active proposal, or null. */
  activeProposalId: string | null;
  /** ISO 8601 timestamp of the last plan calculation, or null. */
  lastPlanCalculation: string | null;
  /** Monte Carlo plan success rate (0-100), or null if not computed. */
  planSuccessRate: number | null;

  // -------------------- Integration State --------------------

  /** HubSpot contact ID, or null if not linked. */
  hubspotContactId: string | null;
  /** ISO 8601 timestamp of the last custodian data sync, or null. */
  lastCustodianSync: string | null;
  /** ISO 8601 timestamp of the last HubSpot sync, or null. */
  lastHubSpotSync: string | null;

  // -------------------- Risk Profile --------------------

  /** Risk tolerance score (1-100), or null if not assessed. */
  riskScore: number | null;
  /** Human-readable risk label (e.g., "Moderate Growth"), or null. */
  riskLabel: string | null;
  /** Recommended target allocation, or null if not computed. */
  recommendedAllocation: RecommendedAllocation | null;
}

// =====================================================================
// Change Tracking
// =====================================================================

/**
 * A single field-level change recorded for audit and undo/redo purposes.
 *
 * Every mutation to a Household generates one or more HouseholdChange
 * records that capture the before/after state and provenance.
 */
export interface HouseholdChange {
  /** Dot-delimited path to the changed field (e.g., "members[0].email"). */
  fieldPath: string;
  /** Previous value before the change. */
  oldValue: unknown;
  /** New value after the change. */
  newValue: unknown;
  /** UUID of the user who made the change. */
  changedBy: string;
  /** ISO 8601 timestamp of the change. */
  changedAt: string;
  /** Source system that originated the change. */
  source: DataSource;
}

// =====================================================================
// Search / Filter
// =====================================================================

/**
 * Parameters for searching and filtering households.
 * Used by the household list view and API endpoints.
 */
export interface HouseholdSearchParams {
  /** Required: scope search to a single firm. */
  firmId: string;
  /** Optional: filter to a specific advisor. */
  advisorId?: string;
  /** Optional: filter by lifecycle status (OR within array). */
  status?: HouseholdStatus[];
  /** Optional: filter by wealth tier (OR within array). */
  wealthTier?: WealthTier[];
  /** Optional: free-text search across household and member names. */
  query?: string;
  /** Optional: filter by tags (AND within array). */
  tags?: string[];
  /** Optional: minimum net worth threshold. */
  minNetWorth?: number;
  /** Optional: maximum net worth threshold. */
  maxNetWorth?: number;
  /** Maximum number of results to return (default: 50). */
  limit?: number;
  /** Number of results to skip for pagination (default: 0). */
  offset?: number;
  /** Field to sort by (default: 'name'). */
  sortBy?: 'name' | 'netWorth' | 'totalAum' | 'createdAt' | 'updatedAt' | 'lastReviewedAt';
  /** Sort direction (default: 'asc'). */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result set from a household search.
 */
export interface HouseholdSearchResult {
  /** The matching households for this page. */
  households: Household[];
  /** Total number of matching households (across all pages). */
  total: number;
  /** Number of results per page. */
  limit: number;
  /** Offset into the total result set. */
  offset: number;
}

// =====================================================================
// Dashboard Statistics
// =====================================================================

/**
 * Aggregate statistics for the advisor dashboard.
 * Computed across all households for a given firm or advisor.
 */
export interface HouseholdDashboardStats {
  /** Total number of households. */
  totalHouseholds: number;
  /** Breakdown by lifecycle status. */
  byStatus: Record<HouseholdStatus, number>;
  /** Breakdown by wealth tier. */
  byWealthTier: Record<WealthTier, number>;
  /** Total AUM across all households. */
  totalAum: number;
  /** Total net worth across all households. */
  totalNetWorth: number;
  /** Average net worth per household. */
  averageNetWorth: number;
  /** Number of households past their next review date. */
  householdsNeedingReview: number;
  /** Number of households created in the last 30 days. */
  newHouseholds30d: number;
}

// =====================================================================
// Factory / Helper Functions
// =====================================================================

/**
 * Create a new Household with sensible defaults.
 *
 * @param params - Required fields for household creation
 * @returns A fully initialized Household object
 *
 * @example
 * ```ts
 * const hh = createHousehold({
 *   id: householdId('abc-123'),
 *   firmId: 'firm-001',
 *   advisorId: 'adv-001',
 *   name: 'The Smith Family',
 * });
 * ```
 */
export function createHousehold(params: {
  id: HouseholdId;
  firmId: string;
  advisorId: string;
  name: string;
  status?: HouseholdStatus;
  wealthTier?: WealthTier;
}): Household {
  const now = new Date().toISOString();
  return {
    id: params.id,
    firmId: params.firmId,
    advisorId: params.advisorId,
    name: params.name,
    status: params.status ?? 'PROSPECT',
    wealthTier: params.wealthTier ?? 'EMERGING',
    externalCrmId: null,
    members: [],
    accounts: [],
    income: [],
    expenses: [],
    goals: [],
    debts: [],
    realEstate: [],
    taxProfile: null,
    estatePlan: null,
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    totalAum: 0,
    tags: [],
    notes: null,
    createdAt: now,
    updatedAt: now,
    lastReviewedAt: null,
    nextReviewAt: null,
    dataOwner: 'ADVISOR',
    lastSyncedAt: null,
    version: 1,
  };
}

/**
 * Compute aggregated metrics for a household from its child entities.
 *
 * Recalculates totalAssets, totalLiabilities, netWorth, and totalAum
 * from the household's accounts, debts, and real estate.  Returns a
 * new Household object with the updated metrics (immutable pattern).
 *
 * @param household - The household to recompute metrics for
 * @returns A new Household with recalculated aggregate fields
 */
export function recomputeHouseholdMetrics(household: Household): Household {
  const activeAccounts = household.accounts.filter((a) => a.isActive);
  const activeDebts = household.debts.filter((d) => d.isActive);
  const activeRealEstate = household.realEstate.filter((r) => r.isActive);

  const accountAssets = activeAccounts.reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );
  const realEstateAssets = activeRealEstate.reduce(
    (sum, r) => sum + r.estimatedValue,
    0
  );
  const totalAssets = accountAssets + realEstateAssets;

  const debtLiabilities = activeDebts.reduce(
    (sum, d) => sum + d.currentBalance,
    0
  );
  const mortgageLiabilities = activeRealEstate.reduce(
    (sum, r) => sum + (r.mortgageBalance ?? 0),
    0
  );
  const totalLiabilities = debtLiabilities + mortgageLiabilities;

  const totalAum = activeAccounts
    .filter((a) => a.isManagedByFarther)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  return {
    ...household,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalAum,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Determine the appropriate wealth tier based on total investable assets.
 *
 * @param totalInvestableAssets - Total investable assets in dollars
 * @returns The corresponding WealthTier classification
 */
export function classifyWealthTier(totalInvestableAssets: number): WealthTier {
  if (totalInvestableAssets >= 100_000_000) return 'INSTITUTIONAL';
  if (totalInvestableAssets >= 10_000_000) return 'UHNW';
  if (totalInvestableAssets >= 1_000_000) return 'HNW';
  if (totalInvestableAssets >= 250_000) return 'MASS_AFFLUENT';
  return 'EMERGING';
}

/**
 * Build initial dashboard statistics with zeroed-out values.
 * Useful for initializing state before data is loaded.
 *
 * @returns A HouseholdDashboardStats object with all values set to zero
 */
export function emptyDashboardStats(): HouseholdDashboardStats {
  return {
    totalHouseholds: 0,
    byStatus: {
      PROSPECT: 0,
      ONBOARDING: 0,
      ACTIVE: 0,
      DORMANT: 0,
      OFFBOARDED: 0,
    },
    byWealthTier: {
      EMERGING: 0,
      MASS_AFFLUENT: 0,
      HNW: 0,
      UHNW: 0,
      INSTITUTIONAL: 0,
    },
    totalAum: 0,
    totalNetWorth: 0,
    averageNetWorth: 0,
    householdsNeedingReview: 0,
    newHouseholds30d: 0,
  };
}

/**
 * Compute a Household 360 View from a Household record.
 *
 * This function builds the materialized summary view used by
 * dashboards, reporting, and client-facing portals.
 *
 * @param household - The household to build the 360 view for
 * @returns A fully computed Household360View
 */
export function buildHousehold360View(household: Household): Household360View {
  const activeAccounts = household.accounts.filter((a) => a.isActive);
  const activeIncome = household.income.filter((i) => i.isActive);
  const activeExpenses = household.expenses.filter((e) => e.isActive);
  const activeGoals = household.goals.filter((g) => g.isActive);
  const activeDebts = household.debts.filter((d) => d.isActive);
  const activeRealEstate = household.realEstate.filter((r) => r.isActive);

  // --- Asset Summary ---
  const accountAssets = activeAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const realEstateAssets = activeRealEstate.reduce((s, r) => s + r.estimatedValue, 0);
  const totalAssets = accountAssets + realEstateAssets;

  const debtLiabilities = activeDebts.reduce((s, d) => s + d.currentBalance, 0);
  const mortgageLiabilities = activeRealEstate.reduce((s, r) => s + (r.mortgageBalance ?? 0), 0);
  const totalLiabilities = debtLiabilities + mortgageLiabilities;

  const totalAum = activeAccounts
    .filter((a) => a.isManagedByFarther)
    .reduce((s, a) => s + a.currentBalance, 0);

  const heldAwayAssets = activeAccounts
    .filter((a) => a.isHeldAway)
    .reduce((s, a) => s + a.currentBalance, 0);

  const liquidAccountTypes: AccountType[] = [
    'CHECKING', 'SAVINGS', 'MONEY_MARKET', 'BROKERAGE',
  ];
  const illiquidAccountTypes: AccountType[] = [
    'REAL_ESTATE', 'PRIVATE_EQUITY', 'BUSINESS_INTEREST', 'COLLECTIBLES',
  ];
  const retirementAccountTypes: AccountType[] = [
    'IRA_TRADITIONAL', 'IRA_ROTH', 'IRA_SEP', 'IRA_SIMPLE',
    '401K', '403B', '457B', 'PENSION',
  ];

  const liquidAssets = activeAccounts
    .filter((a) => liquidAccountTypes.includes(a.accountType))
    .reduce((s, a) => s + a.currentBalance, 0);
  const illiquidAssets =
    activeAccounts
      .filter((a) => illiquidAccountTypes.includes(a.accountType))
      .reduce((s, a) => s + a.currentBalance, 0) + realEstateAssets;
  const retirementAssets = activeAccounts
    .filter((a) => retirementAccountTypes.includes(a.accountType))
    .reduce((s, a) => s + a.currentBalance, 0);

  const taxableAssets = activeAccounts
    .filter((a) => a.taxBucket === 'TAXABLE')
    .reduce((s, a) => s + a.currentBalance, 0);
  const taxDeferredAssets = activeAccounts
    .filter((a) => a.taxBucket === 'TAX_DEFERRED')
    .reduce((s, a) => s + a.currentBalance, 0);
  const taxFreeAssets = activeAccounts
    .filter((a) => a.taxBucket === 'TAX_FREE')
    .reduce((s, a) => s + a.currentBalance, 0);

  // --- Income Summary ---
  const totalAnnualIncome = activeIncome.reduce((s, i) => s + i.annualAmount, 0);
  const earnedTypes: IncomeType[] = ['SALARY', 'BONUS', 'SELF_EMPLOYMENT'];
  const passiveTypes: IncomeType[] = ['RENTAL', 'TRUST_DISTRIBUTION', 'ANNUITY', 'ALIMONY'];
  const portfolioTypes: IncomeType[] = ['DIVIDEND', 'INTEREST', 'CAPITAL_GAINS'];

  const earnedIncome = activeIncome
    .filter((i) => earnedTypes.includes(i.type))
    .reduce((s, i) => s + i.annualAmount, 0);
  const passiveIncome = activeIncome
    .filter((i) => passiveTypes.includes(i.type))
    .reduce((s, i) => s + i.annualAmount, 0);
  const portfolioIncome = activeIncome
    .filter((i) => portfolioTypes.includes(i.type))
    .reduce((s, i) => s + i.annualAmount, 0);

  // --- Expense Summary ---
  const totalAnnualExpenses = activeExpenses.reduce((s, e) => s + e.annualAmount, 0);
  const essentialExpenses = activeExpenses
    .filter((e) => e.isEssential)
    .reduce((s, e) => s + e.annualAmount, 0);
  const discretionaryExpenses = totalAnnualExpenses - essentialExpenses;
  const savingsRate =
    totalAnnualIncome > 0
      ? Math.max(0, (totalAnnualIncome - totalAnnualExpenses) / totalAnnualIncome)
      : 0;

  // --- Goals Summary ---
  const totalGoals = activeGoals.length;
  const onTrack = activeGoals.filter((g) => g.fundingStatus === 'ON_TRACK').length;
  const atRisk = activeGoals.filter((g) => g.fundingStatus === 'AT_RISK').length;
  const offTrack = activeGoals.filter((g) => g.fundingStatus === 'OFF_TRACK').length;
  const funded = activeGoals.filter((g) => g.fundingStatus === 'FUNDED').length;
  const totalTargetAmount = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrentFunding = activeGoals.reduce((s, g) => s + g.currentFunding, 0);
  const overallFundingPct =
    totalTargetAmount > 0 ? totalCurrentFunding / totalTargetAmount : 0;

  // --- Debt Summary ---
  const totalDebt = activeDebts.reduce((s, d) => s + d.currentBalance, 0);
  const totalMonthlyPayments = activeDebts.reduce((s, d) => s + d.monthlyPayment, 0);
  const debtToIncomeRatio =
    totalAnnualIncome > 0
      ? (totalMonthlyPayments * 12) / totalAnnualIncome
      : 0;
  const weightedAvgRate =
    totalDebt > 0
      ? activeDebts.reduce(
          (s, d) => s + d.interestRate * (d.currentBalance / totalDebt),
          0
        )
      : 0;

  return {
    household,
    assetSummary: {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      totalAum,
      heldAwayAssets,
      liquidAssets,
      illiquidAssets,
      retirementAssets,
      taxableAssets,
      taxDeferredAssets,
      taxFreeAssets,
    },
    incomeSummary: {
      totalAnnualIncome,
      earnedIncome,
      passiveIncome,
      portfolioIncome,
    },
    expenseSummary: {
      totalAnnualExpenses,
      essentialExpenses,
      discretionaryExpenses,
      savingsRate,
    },
    goalsSummary: {
      totalGoals,
      onTrack,
      atRisk,
      offTrack,
      funded,
      totalTargetAmount,
      totalCurrentFunding,
      overallFundingPct,
    },
    debtSummary: {
      totalDebt,
      totalMonthlyPayments,
      debtToIncomeRatio,
      weightedAvgRate,
    },
    activePlanId: null,
    activeProposalId: null,
    lastPlanCalculation: null,
    planSuccessRate: null,
    hubspotContactId: household.externalCrmId,
    lastCustodianSync: null,
    lastHubSpotSync: null,
    riskScore: null,
    riskLabel: null,
    recommendedAllocation: null,
  };
}
