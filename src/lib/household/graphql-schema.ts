/**
 * Farther Unified Platform — GraphQL Schema Definition
 *
 * Defines the complete GraphQL API for household data operations.
 * Stage 1: Schema-as-string + typed resolver interfaces.
 * Stage 2: Full Apollo Server integration.
 *
 * This module is self-contained and does not depend on Apollo, GraphQL.js,
 * React, Next.js, or Prisma. The SDL is exported as a string constant and
 * the resolver interfaces provide compile-time type safety.
 *
 * Monetary values are in cents. Rates are in basis points (1 bp = 0.01%).
 */

import type {
  Household,
  HouseholdId,
  HouseholdMember,
  HouseholdAccount,
  HouseholdIncome,
  HouseholdExpense,
  HouseholdGoal,
  HouseholdDebt,
  HouseholdRealEstate,
  HouseholdTaxProfile,
  HouseholdEstatePlan,
  Household360View,
  HouseholdSearchParams,
  HouseholdSearchResult,
  HouseholdDashboardStats,
} from '../household/types';

// ============================================================================
// GraphQL SDL — Enum Types
// ============================================================================

/** GraphQL enum type definitions matching the TypeScript enum types. */
export const ENUM_TYPES_SDL = `
  """Lifecycle status of a household."""
  enum HouseholdStatus {
    PROSPECT
    ONBOARDING
    ACTIVE
    INACTIVE
    ARCHIVED
    CLOSED
  }

  """Wealth tier classification based on total assets."""
  enum WealthTier {
    MASS_MARKET
    MASS_AFFLUENT
    HIGH_NET_WORTH
    VERY_HIGH_NET_WORTH
    ULTRA_HIGH_NET_WORTH
  }

  """Role of a member within a household."""
  enum MemberRole {
    PRIMARY
    SPOUSE
    PARTNER
    DEPENDENT
    BENEFICIARY
    TRUSTEE
    POWER_OF_ATTORNEY
    OTHER
  }

  """Financial account type."""
  enum AccountType {
    CHECKING
    SAVINGS
    BROKERAGE
    TRADITIONAL_IRA
    ROTH_IRA
    SEP_IRA
    SIMPLE_IRA
    FOUR_01_K
    ROTH_401_K
    FOUR_03_B
    FOUR_57
    HSA
    FIVE_29
    TRUST
    CUSTODIAL
    ANNUITY
    PENSION
    LIFE_INSURANCE
    OTHER
  }

  """Custodian holding the account."""
  enum AccountCustodian {
    SCHWAB
    FIDELITY
    VANGUARD
    PERSHING
    TD_AMERITRADE
    MORGAN_STANLEY
    MERRILL_LYNCH
    RAYMOND_JAMES
    LPL
    OTHER
  }

  """Tax treatment of an account."""
  enum TaxTreatment {
    TAXABLE
    TAX_DEFERRED
    TAX_FREE
    TAX_EXEMPT
  }

  """Category of income source."""
  enum IncomeType {
    SALARY
    BONUS
    SELF_EMPLOYMENT
    PENSION
    SOCIAL_SECURITY
    RENTAL
    INVESTMENT
    ANNUITY
    TRUST_DISTRIBUTION
    BUSINESS_DISTRIBUTION
    RMD
    OTHER
  }

  """Category of expense."""
  enum ExpenseCategory {
    HOUSING
    TRANSPORTATION
    FOOD
    HEALTHCARE
    INSURANCE
    EDUCATION
    ENTERTAINMENT
    TRAVEL
    CHARITABLE
    TAXES
    DEBT_SERVICE
    CHILDCARE
    PERSONAL
    UTILITIES
    OTHER
  }

  """Financial goal type."""
  enum GoalType {
    RETIREMENT
    EDUCATION
    HOME_PURCHASE
    HOME_RENOVATION
    MAJOR_PURCHASE
    TRAVEL
    CHARITABLE_GIVING
    LEGACY
    DEBT_PAYOFF
    EMERGENCY_FUND
    BUSINESS_START
    SABBATICAL
    WEDDING
    CUSTOM
  }

  """Current status of a financial goal."""
  enum GoalStatus {
    ON_TRACK
    AT_RISK
    OFF_TRACK
    ACHIEVED
    ABANDONED
    PAUSED
  }

  """Priority level for a financial goal."""
  enum GoalPriority {
    ESSENTIAL
    IMPORTANT
    ASPIRATIONAL
  }

  """Type of debt instrument."""
  enum DebtType {
    MORTGAGE
    HOME_EQUITY
    AUTO_LOAN
    STUDENT_LOAN
    PERSONAL_LOAN
    CREDIT_CARD
    BUSINESS_LOAN
    MARGIN_LOAN
    OTHER
  }

  """IRS filing status for tax purposes."""
  enum FilingStatus {
    SINGLE
    MARRIED_FILING_JOINTLY
    MARRIED_FILING_SEPARATELY
    HEAD_OF_HOUSEHOLD
    QUALIFYING_WIDOW
  }

  """Sort field for household search results."""
  enum HouseholdSortField {
    NAME
    TOTAL_AUM
    WEALTH_TIER
    STATUS
    CREATED_AT
    UPDATED_AT
  }

  """Sort direction."""
  enum SortDirection {
    ASC
    DESC
  }
`;

// ============================================================================
// GraphQL SDL — Object Types
// ============================================================================

/** GraphQL object type definitions matching the TypeScript interfaces. */
export const OBJECT_TYPES_SDL = `
  """Core household entity — the Golden Record."""
  type Household {
    id: ID!
    externalId: String
    name: String!
    status: HouseholdStatus!
    wealthTier: WealthTier!
    firmId: String!
    advisorId: String!
    coAdvisorId: String
    serviceModel: String
    members: [HouseholdMember!]!
    accounts: [HouseholdAccount!]!
    incomes: [HouseholdIncome!]!
    expenses: [HouseholdExpense!]!
    goals: [HouseholdGoal!]!
    debts: [HouseholdDebt!]!
    realEstate: [HouseholdRealEstate!]!
    taxProfile: HouseholdTaxProfile
    estatePlan: HouseholdEstatePlan
    totalAumCents: Int!
    netWorthCents: Int!
    tags: [String!]!
    notes: String
    createdAt: String!
    updatedAt: String!
    archivedAt: String
  }

  """A person belonging to a household."""
  type HouseholdMember {
    id: ID!
    householdId: ID!
    role: MemberRole!
    firstName: String!
    lastName: String!
    dateOfBirth: String!
    email: String
    phone: String
    ssn: String
    retirementAge: Int
    lifeExpectancy: Int
    isUSCitizen: Boolean!
    stateOfResidence: String
    createdAt: String!
    updatedAt: String!
  }

  """A financial account linked to a household."""
  type HouseholdAccount {
    id: ID!
    householdId: ID!
    memberId: ID
    accountType: AccountType!
    custodian: AccountCustodian
    accountNumber: String
    name: String!
    taxTreatment: TaxTreatment!
    currentBalanceCents: Int!
    costBasisCents: Int
    asOfDate: String!
    isManaged: Boolean!
    advisorFeeRateBps: Int
    allocationProfile: String
    beneficiaries: [String!]
    createdAt: String!
    updatedAt: String!
  }

  """A source of income for the household."""
  type HouseholdIncome {
    id: ID!
    householdId: ID!
    memberId: ID
    incomeType: IncomeType!
    name: String!
    annualAmountCents: Int!
    startDate: String
    endDate: String
    growthRateBps: Int
    isTaxable: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  """A recurring expense for the household."""
  type HouseholdExpense {
    id: ID!
    householdId: ID!
    category: ExpenseCategory!
    name: String!
    annualAmountCents: Int!
    isEssential: Boolean!
    inflationAdjusted: Boolean!
    startDate: String
    endDate: String
    createdAt: String!
    updatedAt: String!
  }

  """A financial goal for the household."""
  type HouseholdGoal {
    id: ID!
    householdId: ID!
    goalType: GoalType!
    name: String!
    targetAmountCents: Int!
    currentAmountCents: Int!
    targetDate: String!
    priority: GoalPriority!
    status: GoalStatus!
    fundedRatioBps: Int!
    probabilityOfSuccess: Int
    monthlyContributionCents: Int
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  """A debt or liability held by the household."""
  type HouseholdDebt {
    id: ID!
    householdId: ID!
    memberId: ID
    debtType: DebtType!
    name: String!
    originalBalanceCents: Int!
    currentBalanceCents: Int!
    interestRateBps: Int!
    isFixed: Boolean!
    monthlyPaymentCents: Int!
    maturityDate: String
    remainingPayments: Int
    lender: String
    createdAt: String!
    updatedAt: String!
  }

  """A real estate holding."""
  type HouseholdRealEstate {
    id: ID!
    householdId: ID!
    name: String!
    propertyType: String!
    currentValueCents: Int!
    purchasePriceCents: Int
    purchaseDate: String
    address: String
    isResidence: Boolean!
    rentalIncomeCents: Int
    annualExpensesCents: Int
    mortgageId: ID
    createdAt: String!
    updatedAt: String!
  }

  """Tax profile for the household."""
  type HouseholdTaxProfile {
    householdId: ID!
    filingStatus: FilingStatus!
    stateOfResidence: String!
    federalMarginalBracketBps: Int
    stateMarginalBracketBps: Int
    estimatedEffectiveRateBps: Int
    hasAlternativeMinTax: Boolean!
    charitableStrategyNotes: String
    updatedAt: String!
  }

  """Estate planning details for the household."""
  type HouseholdEstatePlan {
    householdId: ID!
    hasWill: Boolean!
    hasTrust: Boolean!
    trustType: String
    hasPowerOfAttorney: Boolean!
    hasHealthcareDirective: Boolean!
    estimatedEstateValueCents: Int
    estimatedEstateTaxCents: Int
    primaryBeneficiaries: [String!]
    contingentBeneficiaries: [String!]
    estateAttorney: String
    lastReviewDate: String
    notes: String
    updatedAt: String!
  }

  """Comprehensive 360-degree view of a household."""
  type Household360View {
    household: Household!
    totalAssetsCents: Int!
    totalLiabilitiesCents: Int!
    netWorthCents: Int!
    totalAnnualIncomeCents: Int!
    totalAnnualExpensesCents: Int!
    annualSurplusDeficitCents: Int!
    savingsRateBps: Int!
    debtToIncomeRatioBps: Int!
    goalsOnTrack: Int!
    goalsAtRisk: Int!
    goalsOffTrack: Int!
    weightedGoalFundingBps: Int!
    planSuccessProbabilityBps: Int
    lastPlanCalculatedAt: String
    nextReviewDate: String
    openActionItems: Int!
    riskScore: Int
  }

  """Firm-wide dashboard statistics for the advisor portal."""
  type HouseholdDashboardStats {
    totalHouseholds: Int!
    activeHouseholds: Int!
    totalAumCents: Int!
    averageAumCents: Int!
    medianAumCents: Int!
    tierDistribution: TierDistribution!
    statusDistribution: StatusDistribution!
    goalsOnTrack: Int!
    goalsAtRisk: Int!
    goalsOffTrack: Int!
    averageGoalFundingBps: Int!
  }

  """Distribution of households across wealth tiers."""
  type TierDistribution {
    massMarket: Int!
    massAffluent: Int!
    highNetWorth: Int!
    veryHighNetWorth: Int!
    ultraHighNetWorth: Int!
  }

  """Distribution of households across statuses."""
  type StatusDistribution {
    prospect: Int!
    onboarding: Int!
    active: Int!
    inactive: Int!
    archived: Int!
    closed: Int!
  }

  """Search results with pagination metadata."""
  type HouseholdSearchResult {
    items: [Household!]!
    totalCount: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  """PageInfo for cursor-based pagination (Connection pattern)."""
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  """An edge in a Household connection."""
  type HouseholdEdge {
    node: Household!
    cursor: String!
  }

  """Connection type for cursor-based Household pagination."""
  type HouseholdConnection {
    edges: [HouseholdEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`;

// ============================================================================
// GraphQL SDL — Input Types
// ============================================================================

/** GraphQL input type definitions for mutations. */
export const INPUT_TYPES_SDL = `
  """Input for creating a new household."""
  input CreateHouseholdInput {
    name: String!
    firmId: String!
    advisorId: String!
    coAdvisorId: String
    serviceModel: String
    status: HouseholdStatus
    externalId: String
    tags: [String!]
    notes: String
  }

  """Input for updating an existing household."""
  input UpdateHouseholdInput {
    name: String
    status: HouseholdStatus
    wealthTier: WealthTier
    advisorId: String
    coAdvisorId: String
    serviceModel: String
    tags: [String!]
    notes: String
  }

  """Input for adding a member to a household."""
  input AddMemberInput {
    householdId: ID!
    role: MemberRole!
    firstName: String!
    lastName: String!
    dateOfBirth: String!
    email: String
    phone: String
    ssn: String
    retirementAge: Int
    lifeExpectancy: Int
    isUSCitizen: Boolean
    stateOfResidence: String
  }

  """Input for updating an existing member."""
  input UpdateMemberInput {
    role: MemberRole
    firstName: String
    lastName: String
    dateOfBirth: String
    email: String
    phone: String
    retirementAge: Int
    lifeExpectancy: Int
    isUSCitizen: Boolean
    stateOfResidence: String
  }

  """Input for adding an account to a household."""
  input AddAccountInput {
    householdId: ID!
    memberId: ID
    accountType: AccountType!
    custodian: AccountCustodian
    accountNumber: String
    name: String!
    taxTreatment: TaxTreatment!
    currentBalanceCents: Int!
    costBasisCents: Int
    asOfDate: String!
    isManaged: Boolean
    advisorFeeRateBps: Int
    allocationProfile: String
    beneficiaries: [String!]
  }

  """Input for updating an existing account."""
  input UpdateAccountInput {
    accountType: AccountType
    custodian: AccountCustodian
    accountNumber: String
    name: String
    taxTreatment: TaxTreatment
    currentBalanceCents: Int
    costBasisCents: Int
    asOfDate: String
    isManaged: Boolean
    advisorFeeRateBps: Int
    allocationProfile: String
    beneficiaries: [String!]
  }

  """Input for adding an income source."""
  input AddIncomeInput {
    householdId: ID!
    memberId: ID
    incomeType: IncomeType!
    name: String!
    annualAmountCents: Int!
    startDate: String
    endDate: String
    growthRateBps: Int
    isTaxable: Boolean
  }

  """Input for adding an expense."""
  input AddExpenseInput {
    householdId: ID!
    category: ExpenseCategory!
    name: String!
    annualAmountCents: Int!
    isEssential: Boolean
    inflationAdjusted: Boolean
    startDate: String
    endDate: String
  }

  """Input for adding a financial goal."""
  input AddGoalInput {
    householdId: ID!
    goalType: GoalType!
    name: String!
    targetAmountCents: Int!
    currentAmountCents: Int
    targetDate: String!
    priority: GoalPriority!
    monthlyContributionCents: Int
    notes: String
  }

  """Input for updating an existing goal."""
  input UpdateGoalInput {
    goalType: GoalType
    name: String
    targetAmountCents: Int
    currentAmountCents: Int
    targetDate: String
    priority: GoalPriority
    status: GoalStatus
    monthlyContributionCents: Int
    notes: String
  }

  """Input for adding a debt."""
  input AddDebtInput {
    householdId: ID!
    memberId: ID
    debtType: DebtType!
    name: String!
    originalBalanceCents: Int!
    currentBalanceCents: Int!
    interestRateBps: Int!
    isFixed: Boolean!
    monthlyPaymentCents: Int!
    maturityDate: String
    remainingPayments: Int
    lender: String
  }

  """Input for updating an existing debt."""
  input UpdateDebtInput {
    debtType: DebtType
    name: String
    currentBalanceCents: Int
    interestRateBps: Int
    isFixed: Boolean
    monthlyPaymentCents: Int
    maturityDate: String
    remainingPayments: Int
    lender: String
  }

  """Input for updating the household tax profile."""
  input UpdateTaxProfileInput {
    householdId: ID!
    filingStatus: FilingStatus!
    stateOfResidence: String!
    federalMarginalBracketBps: Int
    stateMarginalBracketBps: Int
    estimatedEffectiveRateBps: Int
    hasAlternativeMinTax: Boolean
    charitableStrategyNotes: String
  }

  """Input for updating the estate plan."""
  input UpdateEstatePlanInput {
    householdId: ID!
    hasWill: Boolean
    hasTrust: Boolean
    trustType: String
    hasPowerOfAttorney: Boolean
    hasHealthcareDirective: Boolean
    estimatedEstateValueCents: Int
    estimatedEstateTaxCents: Int
    primaryBeneficiaries: [String!]
    contingentBeneficiaries: [String!]
    estateAttorney: String
    lastReviewDate: String
    notes: String
  }

  """Input for filtering household search."""
  input HouseholdFilterInput {
    status: [HouseholdStatus!]
    wealthTier: [WealthTier!]
    advisorId: String
    firmId: String
    tags: [String!]
    minAumCents: Int
    maxAumCents: Int
    searchTerm: String
  }

  """Input for searching households with pagination."""
  input HouseholdSearchInput {
    query: String
    filters: HouseholdFilterInput
    sortField: HouseholdSortField
    sortDirection: SortDirection
    page: Int
    pageSize: Int
  }

  """Input for cursor-based pagination."""
  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }
`;

// ============================================================================
// GraphQL SDL — Query, Mutation, Subscription Types
// ============================================================================

/** GraphQL root operation type definitions. */
export const OPERATION_TYPES_SDL = `
  type Query {
    """Retrieve a single household by its unique identifier."""
    household(id: ID!): Household

    """Retrieve multiple households with optional filtering."""
    households(filter: HouseholdFilterInput, pagination: PaginationInput): HouseholdConnection!

    """Full-text and filter-based household search with offset pagination."""
    householdSearch(params: HouseholdSearchInput!): HouseholdSearchResult!

    """Comprehensive 360-degree view of a household."""
    household360(id: ID!): Household360View

    """Firm-wide dashboard statistics."""
    householdDashboardStats(firmId: String!): HouseholdDashboardStats!

    """Retrieve a single member by ID."""
    householdMember(id: ID!): HouseholdMember

    """Retrieve a single account by ID."""
    householdAccount(id: ID!): HouseholdAccount

    """Retrieve all accounts for a household, optionally filtered by type."""
    householdAccounts(householdId: ID!, accountType: AccountType): [HouseholdAccount!]!

    """Retrieve all goals for a household, optionally filtered by status."""
    householdGoals(householdId: ID!, status: GoalStatus): [HouseholdGoal!]!

    """Retrieve all debts for a household."""
    householdDebts(householdId: ID!): [HouseholdDebt!]!
  }

  type Mutation {
    """Create a new household Golden Record."""
    createHousehold(input: CreateHouseholdInput!): Household!

    """Update an existing household."""
    updateHousehold(id: ID!, input: UpdateHouseholdInput!): Household!

    """Soft-delete a household (sets status to ARCHIVED)."""
    deleteHousehold(id: ID!): Boolean!

    """Add a member to a household."""
    addMember(input: AddMemberInput!): HouseholdMember!

    """Update an existing household member."""
    updateMember(id: ID!, input: UpdateMemberInput!): HouseholdMember!

    """Remove a member from a household."""
    removeMember(id: ID!): Boolean!

    """Link a financial account to a household."""
    addAccount(input: AddAccountInput!): HouseholdAccount!

    """Update an existing account."""
    updateAccount(id: ID!, input: UpdateAccountInput!): HouseholdAccount!

    """Remove an account from a household."""
    removeAccount(id: ID!): Boolean!

    """Add an income source to a household."""
    addIncome(input: AddIncomeInput!): HouseholdIncome!

    """Remove an income source."""
    removeIncome(id: ID!): Boolean!

    """Add an expense to a household."""
    addExpense(input: AddExpenseInput!): HouseholdExpense!

    """Remove an expense."""
    removeExpense(id: ID!): Boolean!

    """Add a financial goal."""
    addGoal(input: AddGoalInput!): HouseholdGoal!

    """Update a financial goal."""
    updateGoal(id: ID!, input: UpdateGoalInput!): HouseholdGoal!

    """Remove a financial goal."""
    removeGoal(id: ID!): Boolean!

    """Add a debt to a household."""
    addDebt(input: AddDebtInput!): HouseholdDebt!

    """Update an existing debt."""
    updateDebt(id: ID!, input: UpdateDebtInput!): HouseholdDebt!

    """Remove a debt."""
    removeDebt(id: ID!): Boolean!

    """Add or update a real estate holding."""
    addRealEstate(householdId: ID!, name: String!, propertyType: String!, currentValueCents: Int!, isResidence: Boolean!): HouseholdRealEstate!

    """Remove a real estate holding."""
    removeRealEstate(id: ID!): Boolean!

    """Update the tax profile for a household."""
    updateTaxProfile(input: UpdateTaxProfileInput!): HouseholdTaxProfile!

    """Update the estate plan for a household."""
    updateEstatePlan(input: UpdateEstatePlanInput!): HouseholdEstatePlan!
  }

  type Subscription {
    """Emitted when any field on a household changes."""
    householdUpdated(id: ID!): Household!

    """Emitted when an account balance is updated (e.g., custodial feed)."""
    accountBalanceChanged(householdId: ID!): HouseholdAccount!

    """Emitted when a goal status transitions (e.g., ON_TRACK -> AT_RISK)."""
    goalStatusChanged(householdId: ID!): HouseholdGoal!

    """Emitted when a new member is added or removed."""
    memberChanged(householdId: ID!): HouseholdMember!
  }
`;

// ============================================================================
// Combined SDL
// ============================================================================

/**
 * Complete GraphQL Schema Definition Language string for the Household API.
 *
 * In Stage 2 this string will be passed to `buildSchema()` or
 * `makeExecutableSchema()` from Apollo/graphql-tools.
 */
export const HOUSEHOLD_SCHEMA_SDL: string = `
  ${ENUM_TYPES_SDL}
  ${OBJECT_TYPES_SDL}
  ${INPUT_TYPES_SDL}
  ${OPERATION_TYPES_SDL}
`;

// ============================================================================
// Resolver Type Interfaces
// ============================================================================

/**
 * Context object available to every resolver.
 * In Stage 2, this is populated by the Apollo Server context factory.
 */
export interface ResolverContext {
  /** Authenticated user/advisor performing the request. */
  actorId: string;
  /** Actor type for audit trail. */
  actorType: 'user' | 'advisor' | 'admin' | 'system' | 'api';
  /** Firm scope (multi-tenant isolation). */
  firmId: string;
  /** Request correlation ID for distributed tracing. */
  requestId: string;
  /** ISO-8601 timestamp of the request. */
  requestTimestamp: string;
}

/** Generic resolver function signature. */
export type ResolverFn<TResult, TParent, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: ResolverContext,
) => TResult | Promise<TResult>;

// -------------------- Query Resolvers --------------------

/** Typed query resolver interfaces for the Household schema. */
export interface HouseholdQueryResolvers {
  /** Resolve a single household by ID. */
  household: ResolverFn<
    Household | null,
    Record<string, never>,
    { id: string }
  >;

  /** Resolve a paginated connection of households. */
  households: ResolverFn<
    {
      edges: Array<{ node: Household; cursor: string }>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      };
      totalCount: number;
    },
    Record<string, never>,
    {
      filter?: {
        status?: string[];
        wealthTier?: string[];
        advisorId?: string;
        firmId?: string;
        tags?: string[];
        minAumCents?: number;
        maxAumCents?: number;
        searchTerm?: string;
      };
      pagination?: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
      };
    }
  >;

  /** Resolve search results with offset pagination. */
  householdSearch: ResolverFn<
    HouseholdSearchResult,
    Record<string, never>,
    {
      params: {
        query?: string;
        filters?: Record<string, unknown>;
        sortField?: string;
        sortDirection?: string;
        page?: number;
        pageSize?: number;
      };
    }
  >;

  /** Resolve the 360-degree household view. */
  household360: ResolverFn<
    Household360View | null,
    Record<string, never>,
    { id: string }
  >;

  /** Resolve firm-wide dashboard statistics. */
  householdDashboardStats: ResolverFn<
    HouseholdDashboardStats,
    Record<string, never>,
    { firmId: string }
  >;

  /** Resolve a single member. */
  householdMember: ResolverFn<
    HouseholdMember | null,
    Record<string, never>,
    { id: string }
  >;

  /** Resolve a single account. */
  householdAccount: ResolverFn<
    HouseholdAccount | null,
    Record<string, never>,
    { id: string }
  >;

  /** Resolve accounts for a household. */
  householdAccounts: ResolverFn<
    HouseholdAccount[],
    Record<string, never>,
    { householdId: string; accountType?: string }
  >;

  /** Resolve goals for a household. */
  householdGoals: ResolverFn<
    HouseholdGoal[],
    Record<string, never>,
    { householdId: string; status?: string }
  >;

  /** Resolve debts for a household. */
  householdDebts: ResolverFn<
    HouseholdDebt[],
    Record<string, never>,
    { householdId: string }
  >;
}

// -------------------- Mutation Resolvers --------------------

/** Typed mutation resolver interfaces for the Household schema. */
export interface HouseholdMutationResolvers {
  createHousehold: ResolverFn<Household, Record<string, never>, { input: Record<string, unknown> }>;
  updateHousehold: ResolverFn<Household, Record<string, never>, { id: string; input: Record<string, unknown> }>;
  deleteHousehold: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addMember: ResolverFn<HouseholdMember, Record<string, never>, { input: Record<string, unknown> }>;
  updateMember: ResolverFn<HouseholdMember, Record<string, never>, { id: string; input: Record<string, unknown> }>;
  removeMember: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addAccount: ResolverFn<HouseholdAccount, Record<string, never>, { input: Record<string, unknown> }>;
  updateAccount: ResolverFn<HouseholdAccount, Record<string, never>, { id: string; input: Record<string, unknown> }>;
  removeAccount: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addIncome: ResolverFn<HouseholdIncome, Record<string, never>, { input: Record<string, unknown> }>;
  removeIncome: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addExpense: ResolverFn<HouseholdExpense, Record<string, never>, { input: Record<string, unknown> }>;
  removeExpense: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addGoal: ResolverFn<HouseholdGoal, Record<string, never>, { input: Record<string, unknown> }>;
  updateGoal: ResolverFn<HouseholdGoal, Record<string, never>, { id: string; input: Record<string, unknown> }>;
  removeGoal: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addDebt: ResolverFn<HouseholdDebt, Record<string, never>, { input: Record<string, unknown> }>;
  updateDebt: ResolverFn<HouseholdDebt, Record<string, never>, { id: string; input: Record<string, unknown> }>;
  removeDebt: ResolverFn<boolean, Record<string, never>, { id: string }>;

  addRealEstate: ResolverFn<
    HouseholdRealEstate,
    Record<string, never>,
    { householdId: string; name: string; propertyType: string; currentValueCents: number; isResidence: boolean }
  >;
  removeRealEstate: ResolverFn<boolean, Record<string, never>, { id: string }>;

  updateTaxProfile: ResolverFn<HouseholdTaxProfile, Record<string, never>, { input: Record<string, unknown> }>;
  updateEstatePlan: ResolverFn<HouseholdEstatePlan, Record<string, never>, { input: Record<string, unknown> }>;
}

// -------------------- Subscription Resolvers --------------------

/**
 * Subscription resolver interfaces.
 *
 * In Stage 2 each subscription returns an AsyncIterator from
 * a PubSub implementation (e.g., Redis-backed PubSub).
 */
export interface HouseholdSubscriptionResolvers {
  householdUpdated: {
    subscribe: ResolverFn<AsyncIterable<{ householdUpdated: Household }>, Record<string, never>, { id: string }>;
  };
  accountBalanceChanged: {
    subscribe: ResolverFn<
      AsyncIterable<{ accountBalanceChanged: HouseholdAccount }>,
      Record<string, never>,
      { householdId: string }
    >;
  };
  goalStatusChanged: {
    subscribe: ResolverFn<
      AsyncIterable<{ goalStatusChanged: HouseholdGoal }>,
      Record<string, never>,
      { householdId: string }
    >;
  };
  memberChanged: {
    subscribe: ResolverFn<
      AsyncIterable<{ memberChanged: HouseholdMember }>,
      Record<string, never>,
      { householdId: string }
    >;
  };
}

// -------------------- Combined Resolvers --------------------

/** Aggregate resolver map matching the complete Household GraphQL schema. */
export interface HouseholdResolvers {
  Query: HouseholdQueryResolvers;
  Mutation: HouseholdMutationResolvers;
  Subscription: HouseholdSubscriptionResolvers;
}
