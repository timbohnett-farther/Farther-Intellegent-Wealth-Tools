// =============================================================================
// Farther Unified Platform — Household Module Barrel Export
// =============================================================================
//
// Re-exports all public types, interfaces, functions, and singletons
// from the household module for convenient single-path imports.
//
// Usage:
//   import { Household, eventBus, classifyField } from '@/lib/household';
//
// @module household
// =============================================================================

// ---- Types & Interfaces (Golden Record) ----
export type {
  // Branded primitives
  HouseholdId,
  MemberId,
  AccountId,
  // Enums / union types
  MemberRole,
  MemberRelationship,
  EmploymentStatus,
  HealthStatus,
  WealthTier,
  HouseholdStatus,
  AccountRegistration,
  AccountTaxBucket,
  AccountType,
  CustodianId,
  GoalType,
  GoalPriority,
  GoalFundingStatus,
  DebtType,
  IncomeType,
  IncomeTaxCharacter,
  IncomeFrequency,
  ExpenseCategory,
  ExpenseFrequency,
  FilingStatus,
  EstatePlanStatus,
  RealEstateType,
  DataSource,
  PIIClassification,
  // Core entity interfaces
  Household,
  HouseholdMember,
  HouseholdAccount,
  HouseholdIncome,
  HouseholdExpense,
  HouseholdGoal,
  HouseholdDebt,
  HouseholdRealEstate,
  HouseholdTaxProfile,
  HouseholdEstatePlan,
  // 360 view
  AssetSummary,
  IncomeSummary,
  ExpenseSummary,
  GoalsSummary,
  DebtSummary,
  RecommendedAllocation,
  Household360View,
  // Change tracking
  HouseholdChange,
  // Search / filter
  HouseholdSearchParams,
  HouseholdSearchResult,
  // Dashboard
  HouseholdDashboardStats,
} from './types';

// ---- Type constructors & helpers ----
export {
  householdId,
  memberId,
  accountId,
  createHousehold,
  recomputeHouseholdMetrics,
  classifyWealthTier,
  emptyDashboardStats,
  buildHousehold360View,
} from './types';

// ---- Event Bus ----
export type {
  HouseholdEventType,
  HouseholdEvent,
  DeadLetterRecord,
  EventHandler,
  EventBusType,
} from './event-bus';

export { eventBus } from './event-bus';

// ---- Security & PII ----
export type {
  SecurityRole,
  DataAccessRecord,
} from './security';

export {
  classifyField,
  maskPII,
  canAccessField,
  getFieldClassifications,
  isAuthorizedForHousehold,
  applyRowLevelSecurity,
  auditDataAccess,
  getDataAccessLog,
  queryDataAccessLog,
  clearDataAccessLog,
} from './security';

// ---- Conflict Resolution ----
export type {
  ResolutionStrategy,
  Conflict,
  ConflictRecord,
} from './conflict-resolution';

export {
  getFieldOwnership,
  resolveConflict,
  detectConflicts,
  applyResolution,
  getConflictLog,
  queryConflictLog,
  clearConflictLog,
  getFieldOwnershipRegistry,
} from './conflict-resolution';
