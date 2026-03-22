// =============================================================================
// Farther Unified Platform — Security & PII Classification
// =============================================================================
//
// Implements data classification, field-level PII detection, row-level
// security policies, and data masking utilities for the Household data model.
//
// Classification levels:
//   PUBLIC       — No restrictions within the firm context
//   INTERNAL     — Visible to all firm employees (advisors, ops, paraplanners)
//   CONFIDENTIAL — Restricted to advisors and ops with need-to-know
//   RESTRICTED   — PII requiring encryption, masking, and audit logging
//
// Supported roles:
//   ADMIN        — Full access to all data and all households
//   ADVISOR      — Full access to assigned households
//   PARAPLANNER  — Access to planning data, masked PII
//   OPS          — Access to operational data, limited PII
//   READONLY     — Read-only access, masked PII
//   CLIENT       — Access to own household data only, restricted PII
//
// This module is self-contained — no React, Next.js, or Prisma dependencies.
//
// @module household/security
// =============================================================================

import type { PIIClassification, Household, HouseholdMember, HouseholdAccount, HouseholdRealEstate } from './types';

// =====================================================================
// Role Type
// =====================================================================

/**
 * RBAC roles for platform users.
 * Matches the UserRole type from the tax-planning module.
 */
export type SecurityRole =
  | 'ADMIN'
  | 'ADVISOR'
  | 'PARAPLANNER'
  | 'OPS'
  | 'READONLY'
  | 'CLIENT';

// =====================================================================
// PII Field Registry
// =====================================================================

/**
 * Registry mapping field paths to their PII classification level.
 *
 * Field paths use dot notation with `[]` for array elements.
 * e.g., `members[].ssnLastFour` applies to every member's SSN field.
 */
const PII_FIELD_REGISTRY: Record<string, PIIClassification> = {
  // Household-level fields
  'id': 'INTERNAL',
  'firmId': 'INTERNAL',
  'advisorId': 'INTERNAL',
  'name': 'INTERNAL',
  'status': 'INTERNAL',
  'wealthTier': 'INTERNAL',
  'externalCrmId': 'INTERNAL',
  'totalAssets': 'CONFIDENTIAL',
  'totalLiabilities': 'CONFIDENTIAL',
  'netWorth': 'CONFIDENTIAL',
  'totalAum': 'CONFIDENTIAL',
  'tags': 'INTERNAL',
  'notes': 'CONFIDENTIAL',
  'createdAt': 'PUBLIC',
  'updatedAt': 'PUBLIC',
  'lastReviewedAt': 'PUBLIC',
  'nextReviewAt': 'PUBLIC',
  'dataOwner': 'INTERNAL',
  'lastSyncedAt': 'PUBLIC',
  'version': 'PUBLIC',

  // Member fields
  'members[].id': 'INTERNAL',
  'members[].householdId': 'INTERNAL',
  'members[].role': 'INTERNAL',
  'members[].relationship': 'INTERNAL',
  'members[].firstName': 'CONFIDENTIAL',
  'members[].middleName': 'CONFIDENTIAL',
  'members[].lastName': 'CONFIDENTIAL',
  'members[].preferredName': 'CONFIDENTIAL',
  'members[].dateOfBirth': 'RESTRICTED',
  'members[].gender': 'CONFIDENTIAL',
  'members[].email': 'CONFIDENTIAL',
  'members[].phoneMobile': 'CONFIDENTIAL',
  'members[].ssnLastFour': 'RESTRICTED',
  'members[].citizenship': 'CONFIDENTIAL',
  'members[].domicileState': 'INTERNAL',
  'members[].employmentStatus': 'INTERNAL',
  'members[].employerName': 'CONFIDENTIAL',
  'members[].occupation': 'INTERNAL',
  'members[].isActive': 'INTERNAL',
  'members[].retirementAge': 'INTERNAL',
  'members[].lifeExpectancy': 'INTERNAL',
  'members[].healthStatus': 'RESTRICTED',

  // Account fields
  'accounts[].id': 'INTERNAL',
  'accounts[].householdId': 'INTERNAL',
  'accounts[].ownerId': 'INTERNAL',
  'accounts[].coOwnerId': 'INTERNAL',
  'accounts[].name': 'INTERNAL',
  'accounts[].institution': 'INTERNAL',
  'accounts[].custodian': 'INTERNAL',
  'accounts[].accountNumberLast4': 'CONFIDENTIAL',
  'accounts[].accountType': 'INTERNAL',
  'accounts[].registration': 'INTERNAL',
  'accounts[].taxBucket': 'INTERNAL',
  'accounts[].currentBalance': 'CONFIDENTIAL',
  'accounts[].costBasis': 'CONFIDENTIAL',
  'accounts[].unrealizedGain': 'CONFIDENTIAL',
  'accounts[].equityPct': 'INTERNAL',
  'accounts[].bondPct': 'INTERNAL',
  'accounts[].cashPct': 'INTERNAL',
  'accounts[].alternativePct': 'INTERNAL',
  'accounts[].ytdReturn': 'INTERNAL',
  'accounts[].inceptionReturn': 'INTERNAL',
  'accounts[].isManagedByFarther': 'INTERNAL',
  'accounts[].isHeldAway': 'INTERNAL',
  'accounts[].lastSyncedAt': 'PUBLIC',
  'accounts[].balanceAsOf': 'PUBLIC',
  'accounts[].isActive': 'INTERNAL',

  // Income fields
  'income[].id': 'INTERNAL',
  'income[].annualAmount': 'CONFIDENTIAL',
  'income[].type': 'INTERNAL',
  'income[].name': 'INTERNAL',

  // Expense fields
  'expenses[].id': 'INTERNAL',
  'expenses[].annualAmount': 'CONFIDENTIAL',
  'expenses[].category': 'INTERNAL',
  'expenses[].name': 'INTERNAL',

  // Goal fields
  'goals[].id': 'INTERNAL',
  'goals[].targetAmount': 'CONFIDENTIAL',
  'goals[].currentFunding': 'CONFIDENTIAL',
  'goals[].type': 'INTERNAL',
  'goals[].name': 'INTERNAL',

  // Debt fields
  'debts[].id': 'INTERNAL',
  'debts[].currentBalance': 'CONFIDENTIAL',
  'debts[].originalBalance': 'CONFIDENTIAL',
  'debts[].interestRate': 'CONFIDENTIAL',
  'debts[].monthlyPayment': 'CONFIDENTIAL',
  'debts[].type': 'INTERNAL',
  'debts[].name': 'INTERNAL',

  // Real estate fields
  'realEstate[].id': 'INTERNAL',
  'realEstate[].address': 'CONFIDENTIAL',
  'realEstate[].estimatedValue': 'CONFIDENTIAL',
  'realEstate[].costBasis': 'CONFIDENTIAL',
  'realEstate[].mortgageBalance': 'CONFIDENTIAL',
  'realEstate[].annualRentalIncome': 'CONFIDENTIAL',
  'realEstate[].type': 'INTERNAL',

  // Tax profile fields
  'taxProfile.householdId': 'INTERNAL',
  'taxProfile.filingStatus': 'CONFIDENTIAL',
  'taxProfile.federalBracket': 'CONFIDENTIAL',
  'taxProfile.stateBracket': 'CONFIDENTIAL',
  'taxProfile.domicileState': 'INTERNAL',
  'taxProfile.estimatedEffectiveRate': 'CONFIDENTIAL',
  'taxProfile.estimatedAGI': 'RESTRICTED',
  'taxProfile.estimatedTaxableIncome': 'RESTRICTED',
  'taxProfile.amtExposure': 'CONFIDENTIAL',
  'taxProfile.niitExposure': 'CONFIDENTIAL',
  'taxProfile.qbiEligible': 'CONFIDENTIAL',
  'taxProfile.capitalLossCarryforward': 'CONFIDENTIAL',
  'taxProfile.charitableCarryforward': 'CONFIDENTIAL',
  'taxProfile.lastTaxYearFiled': 'INTERNAL',
  'taxProfile.cpaName': 'INTERNAL',
  'taxProfile.cpaEmail': 'INTERNAL',

  // Estate plan fields
  'estatePlan.householdId': 'INTERNAL',
  'estatePlan.status': 'INTERNAL',
  'estatePlan.hasWill': 'CONFIDENTIAL',
  'estatePlan.hasTrust': 'CONFIDENTIAL',
  'estatePlan.hasPoa': 'CONFIDENTIAL',
  'estatePlan.hasHealthcareDirective': 'CONFIDENTIAL',
  'estatePlan.estimatedGrossEstate': 'RESTRICTED',
  'estatePlan.estimatedEstateTax': 'RESTRICTED',
  'estatePlan.exemptionUsed': 'CONFIDENTIAL',
  'estatePlan.remainingExemption': 'CONFIDENTIAL',
  'estatePlan.trustNames': 'CONFIDENTIAL',
  'estatePlan.lastUpdated': 'INTERNAL',
  'estatePlan.attorneyName': 'INTERNAL',
  'estatePlan.attorneyEmail': 'INTERNAL',
  'estatePlan.notes': 'CONFIDENTIAL',
};

// =====================================================================
// Role → Classification Access Matrix
// =====================================================================

/**
 * Defines the maximum PII classification level each role can access.
 *
 * Classification hierarchy: PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED
 */
const CLASSIFICATION_HIERARCHY: Record<PIIClassification, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

/**
 * Maximum classification level accessible by each role.
 */
const ROLE_MAX_CLASSIFICATION: Record<SecurityRole, PIIClassification> = {
  ADMIN: 'RESTRICTED',
  ADVISOR: 'RESTRICTED',
  PARAPLANNER: 'CONFIDENTIAL',
  OPS: 'CONFIDENTIAL',
  READONLY: 'INTERNAL',
  CLIENT: 'CONFIDENTIAL',
};

// =====================================================================
// Data Access Audit Log
// =====================================================================

/** Record of a data access event for compliance. */
export interface DataAccessRecord {
  /** UUID of the user accessing data. */
  userId: string;
  /** The household whose data was accessed. */
  householdId: string;
  /** Fields that were accessed. */
  fieldsAccessed: string[];
  /** ISO 8601 timestamp of the access. */
  accessedAt: string;
  /** Whether any fields were masked/redacted. */
  wasMasked: boolean;
}

/** In-memory data access audit log. */
const dataAccessLog: DataAccessRecord[] = [];

/** Maximum number of data access records to retain. */
const MAX_ACCESS_LOG_SIZE = 10_000;

// =====================================================================
// Public API
// =====================================================================

/**
 * Returns the PII classification for a given field path.
 *
 * Field paths use dot notation. Array element fields use `[]` notation.
 * If a field is not in the registry, it defaults to INTERNAL.
 *
 * @param fieldPath - Dot-delimited field path (e.g., "members[].ssnLastFour")
 * @returns The PIIClassification for the field
 *
 * @example
 * ```ts
 * classifyField('members[].ssnLastFour'); // 'RESTRICTED'
 * classifyField('name');                  // 'INTERNAL'
 * classifyField('createdAt');             // 'PUBLIC'
 * ```
 */
export function classifyField(fieldPath: string): PIIClassification {
  // Direct lookup
  if (fieldPath in PII_FIELD_REGISTRY) {
    return PII_FIELD_REGISTRY[fieldPath];
  }

  // Normalize numbered array indices to [] for lookup
  // e.g., "members[0].ssnLastFour" → "members[].ssnLastFour"
  const normalized = fieldPath.replace(/\[\d+\]/g, '[]');
  if (normalized in PII_FIELD_REGISTRY) {
    return PII_FIELD_REGISTRY[normalized];
  }

  // Default to INTERNAL for unregistered fields
  return 'INTERNAL';
}

/**
 * Masks a PII value based on its classification level.
 *
 * Masking rules:
 * - PUBLIC: no masking
 * - INTERNAL: no masking
 * - CONFIDENTIAL: partial masking (first/last characters visible)
 * - RESTRICTED: full masking (replaced with asterisks)
 *
 * @param value - The string value to mask
 * @param classification - The PII classification level
 * @returns The masked string
 *
 * @example
 * ```ts
 * maskPII('john@example.com', 'CONFIDENTIAL'); // 'j***********m'
 * maskPII('1234', 'RESTRICTED');               // '****'
 * maskPII('Active', 'PUBLIC');                  // 'Active'
 * ```
 */
export function maskPII(
  value: string,
  classification: PIIClassification
): string {
  if (!value || value.length === 0) return value;

  switch (classification) {
    case 'PUBLIC':
    case 'INTERNAL':
      return value;

    case 'CONFIDENTIAL':
      if (value.length <= 2) {
        return '*'.repeat(value.length);
      }
      return (
        value[0] +
        '*'.repeat(Math.max(1, value.length - 2)) +
        value[value.length - 1]
      );

    case 'RESTRICTED':
      return '*'.repeat(value.length);

    default:
      return '*'.repeat(value.length);
  }
}

/**
 * Determines whether a role can access a field at a given classification level.
 *
 * @param role - The user's security role
 * @param classification - The PII classification of the field
 * @returns True if the role has sufficient clearance
 *
 * @example
 * ```ts
 * canAccessField('ADVISOR', 'RESTRICTED');    // true
 * canAccessField('READONLY', 'CONFIDENTIAL'); // false
 * canAccessField('PARAPLANNER', 'INTERNAL');  // true
 * ```
 */
export function canAccessField(
  role: SecurityRole,
  classification: PIIClassification
): boolean {
  const roleLevel =
    CLASSIFICATION_HIERARCHY[ROLE_MAX_CLASSIFICATION[role]];
  const fieldLevel = CLASSIFICATION_HIERARCHY[classification];
  return roleLevel >= fieldLevel;
}

/**
 * Returns the complete field classification registry.
 *
 * @returns A record mapping field paths to their PII classification
 */
export function getFieldClassifications(): Record<string, PIIClassification> {
  return { ...PII_FIELD_REGISTRY };
}

/**
 * Checks whether a user is authorized to access a specific household.
 *
 * Authorization rules:
 * - ADMIN: can access any household in their firm
 * - ADVISOR: can access households assigned to them
 * - PARAPLANNER: can access households assigned to their supervising advisor(s)
 *   (simplified: same firm access in Stage 1)
 * - OPS: can access any household in their firm
 * - READONLY: can access any household in their firm (read-only)
 * - CLIENT: can only access their own household (matched by userId)
 *
 * @param firmId - The firm ID of the requesting user
 * @param userId - The user ID of the requestor
 * @param household - The household being accessed
 * @param role - The user's security role
 * @returns True if the user is authorized
 */
export function isAuthorizedForHousehold(
  firmId: string,
  userId: string,
  household: Household,
  role: SecurityRole
): boolean {
  // Cross-firm access is never allowed
  if (household.firmId !== firmId) {
    return false;
  }

  switch (role) {
    case 'ADMIN':
      // Admins can access any household in their firm
      return true;

    case 'ADVISOR':
      // Advisors can only access their assigned households
      return household.advisorId === userId;

    case 'PARAPLANNER':
      // Stage 1 simplification: paraplanners can access any household in their firm
      // Stage 2: will check supervisor/team assignments
      return true;

    case 'OPS':
      // Ops can access any household in their firm
      return true;

    case 'READONLY':
      // Readonly users can access any household in their firm
      return true;

    case 'CLIENT':
      // Clients can only access households where they are a member
      return household.members.some(
        (m) => m.id === userId && m.isActive
      );

    default:
      return false;
  }
}

/**
 * Applies row-level security to a household record by redacting
 * fields that the requesting role is not authorized to see.
 *
 * Returns a deep copy of the household with restricted fields
 * replaced by masked values or null.
 *
 * @param household - The household record to redact
 * @param role - The user's security role
 * @param userId - The user ID (used for CLIENT role authorization)
 * @returns A redacted copy of the household
 *
 * @example
 * ```ts
 * const redacted = applyRowLevelSecurity(household, 'PARAPLANNER', 'user-001');
 * // redacted.members[0].ssnLastFour === null (RESTRICTED, beyond PARAPLANNER)
 * // redacted.members[0].email === 'j***e' (CONFIDENTIAL, accessible but masked for display)
 * ```
 */
export function applyRowLevelSecurity(
  household: Household,
  role: SecurityRole,
  userId: string
): Household {
  // Deep clone to avoid mutating the original
  const redacted: Household = JSON.parse(JSON.stringify(household));

  // Redact member fields
  redacted.members = redacted.members.map((member: HouseholdMember) => {
    return redactMember(member, role);
  });

  // Redact account fields
  redacted.accounts = redacted.accounts.map((account: HouseholdAccount) => {
    return redactAccount(account, role);
  });

  // Redact real estate fields
  redacted.realEstate = redacted.realEstate.map((property: HouseholdRealEstate) => {
    return redactRealEstate(property, role);
  });

  // Redact household-level financial data for restricted roles
  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.totalAssets = 0;
    redacted.totalLiabilities = 0;
    redacted.netWorth = 0;
    redacted.totalAum = 0;
    redacted.notes = null;
  }

  // Redact tax profile
  if (redacted.taxProfile) {
    redacted.taxProfile = redactTaxProfile(redacted.taxProfile, role);
  }

  // Redact estate plan
  if (redacted.estatePlan) {
    redacted.estatePlan = redactEstatePlan(redacted.estatePlan, role);
  }

  return redacted;
}

/**
 * Records a data access event for compliance audit purposes.
 *
 * @param userId - The user who accessed the data
 * @param householdId - The household whose data was accessed
 * @param fieldsAccessed - The list of field paths that were accessed
 */
export function auditDataAccess(
  userId: string,
  householdId: string,
  fieldsAccessed: string[]
): void {
  const hasRestrictedFields = fieldsAccessed.some(
    (f) => classifyField(f) === 'RESTRICTED'
  );

  const record: DataAccessRecord = {
    userId,
    householdId,
    fieldsAccessed,
    accessedAt: new Date().toISOString(),
    wasMasked: hasRestrictedFields,
  };

  dataAccessLog.push(record);

  // Cap the log size
  if (dataAccessLog.length > MAX_ACCESS_LOG_SIZE) {
    dataAccessLog.splice(0, dataAccessLog.length - MAX_ACCESS_LOG_SIZE);
  }
}

/**
 * Returns the data access audit log.
 *
 * @returns An array of all data access records
 */
export function getDataAccessLog(): DataAccessRecord[] {
  return [...dataAccessLog];
}

/**
 * Queries the data access log by user and/or household.
 *
 * @param params - Filter parameters
 * @returns Matching data access records
 */
export function queryDataAccessLog(params: {
  userId?: string;
  householdId?: string;
  from?: string;
  to?: string;
}): DataAccessRecord[] {
  let filtered = [...dataAccessLog];

  if (params.userId) {
    filtered = filtered.filter((r) => r.userId === params.userId);
  }
  if (params.householdId) {
    filtered = filtered.filter((r) => r.householdId === params.householdId);
  }
  if (params.from) {
    const fromDate = new Date(params.from);
    filtered = filtered.filter((r) => new Date(r.accessedAt) >= fromDate);
  }
  if (params.to) {
    const toDate = new Date(params.to);
    filtered = filtered.filter((r) => new Date(r.accessedAt) <= toDate);
  }

  return filtered;
}

/**
 * Clears the data access audit log.
 * Intended for use in test suites only.
 */
export function clearDataAccessLog(): void {
  dataAccessLog.length = 0;
}

// =====================================================================
// Internal Redaction Helpers
// =====================================================================

/**
 * Redacts sensitive fields from a HouseholdMember based on role.
 */
function redactMember(
  member: HouseholdMember,
  role: SecurityRole
): HouseholdMember {
  const redacted = { ...member };

  // RESTRICTED fields — only ADMIN and ADVISOR can see
  if (!canAccessField(role, 'RESTRICTED')) {
    redacted.ssnLastFour = null;
    redacted.dateOfBirth = '****-**-**';
    redacted.healthStatus = null;
  }

  // CONFIDENTIAL fields — READONLY and CLIENT with restrictions
  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.firstName = maskPII(redacted.firstName, 'CONFIDENTIAL');
    redacted.lastName = maskPII(redacted.lastName, 'CONFIDENTIAL');
    redacted.middleName = redacted.middleName
      ? maskPII(redacted.middleName, 'CONFIDENTIAL')
      : null;
    redacted.preferredName = redacted.preferredName
      ? maskPII(redacted.preferredName, 'CONFIDENTIAL')
      : null;
    redacted.email = redacted.email
      ? maskPII(redacted.email, 'CONFIDENTIAL')
      : null;
    redacted.phoneMobile = redacted.phoneMobile
      ? maskPII(redacted.phoneMobile, 'CONFIDENTIAL')
      : null;
    redacted.employerName = redacted.employerName
      ? maskPII(redacted.employerName, 'CONFIDENTIAL')
      : null;
  }

  return redacted;
}

/**
 * Redacts sensitive fields from a HouseholdAccount based on role.
 */
function redactAccount(
  account: HouseholdAccount,
  role: SecurityRole
): HouseholdAccount {
  const redacted = { ...account };

  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.accountNumberLast4 = null;
    redacted.currentBalance = 0;
    redacted.costBasis = null;
    redacted.unrealizedGain = null;
  }

  return redacted;
}

/**
 * Redacts sensitive fields from a HouseholdRealEstate based on role.
 */
function redactRealEstate(
  property: HouseholdRealEstate,
  role: SecurityRole
): HouseholdRealEstate {
  const redacted = { ...property };

  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.address = maskPII(redacted.address, 'CONFIDENTIAL');
    redacted.estimatedValue = 0;
    redacted.costBasis = null;
    redacted.mortgageBalance = null;
    redacted.annualRentalIncome = null;
  }

  return redacted;
}

/**
 * Redacts sensitive fields from a HouseholdTaxProfile based on role.
 */
function redactTaxProfile(
  taxProfile: Household['taxProfile'],
  role: SecurityRole
): Household['taxProfile'] {
  if (!taxProfile) return null;

  const redacted = { ...taxProfile };

  // RESTRICTED fields
  if (!canAccessField(role, 'RESTRICTED')) {
    redacted.estimatedAGI = 0;
    redacted.estimatedTaxableIncome = 0;
  }

  // CONFIDENTIAL fields
  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.federalBracket = 0;
    redacted.stateBracket = null;
    redacted.estimatedEffectiveRate = 0;
    redacted.capitalLossCarryforward = 0;
    redacted.charitableCarryforward = 0;
    redacted.amtExposure = false;
    redacted.niitExposure = false;
    redacted.qbiEligible = false;
  }

  return redacted;
}

/**
 * Redacts sensitive fields from a HouseholdEstatePlan based on role.
 */
function redactEstatePlan(
  estatePlan: Household['estatePlan'],
  role: SecurityRole
): Household['estatePlan'] {
  if (!estatePlan) return null;

  const redacted = { ...estatePlan };

  // RESTRICTED fields
  if (!canAccessField(role, 'RESTRICTED')) {
    redacted.estimatedGrossEstate = 0;
    redacted.estimatedEstateTax = 0;
  }

  // CONFIDENTIAL fields
  if (!canAccessField(role, 'CONFIDENTIAL')) {
    redacted.hasWill = false;
    redacted.hasTrust = false;
    redacted.hasPoa = false;
    redacted.hasHealthcareDirective = false;
    redacted.exemptionUsed = 0;
    redacted.remainingExemption = 0;
    redacted.trustNames = [];
    redacted.notes = null;
  }

  return redacted;
}
