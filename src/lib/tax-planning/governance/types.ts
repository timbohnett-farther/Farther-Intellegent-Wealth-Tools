// =============================================================================
// Governance, Compliance, & Admin Layer — Type Definitions
// =============================================================================
//
// Core types for the governance system: roles, permissions, access scopes,
// approval policies, AI governance, template governance, admin settings,
// review queue, audit events, authorization decisions, and feature flags.
// =============================================================================

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * Platform roles define the set of permissions a user has.
 */
export type PlatformRoleStatus = 'active' | 'inactive';

/**
 * Access scope types define the granularity of access control.
 */
export type AccessScopeType = 'firm' | 'office' | 'team' | 'household';

/**
 * Access scope status lifecycle.
 */
export type AccessScopeStatus = 'active' | 'revoked';

/**
 * Object types that require approval.
 */
export type ApprovalObjectType =
  | 'ai_answer'
  | 'deliverable'
  | 'scenario'
  | 'cpa_request'
  | 'workflow_action';

/**
 * Audience modes for AI governance.
 */
export type AudienceMode =
  | 'advisor_internal'
  | 'client_friendly'
  | 'cpa_technical'
  | 'compliance_formal'
  | 'executive_summary';

/**
 * Template status lifecycle.
 */
export type TemplateStatus = 'draft' | 'published' | 'deprecated';

/**
 * Settings scope types define where settings are applied.
 */
export type SettingsScopeType = 'firm' | 'office' | 'team';

/**
 * Settings categories define groupings of related settings.
 */
export type SettingsCategory =
  | 'ai_config'
  | 'approval_thresholds'
  | 'notification_rules'
  | 'workflow_automation'
  | 'compliance_rules'
  | 'export_rules';

/**
 * Review queue item status lifecycle.
 */
export type ReviewQueueItemStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'canceled';

/**
 * Review decision actions.
 */
export type ReviewDecision = 'approved' | 'rejected';

/**
 * Governance audit object types.
 */
export type GovernanceAuditObjectType =
  | 'role'
  | 'permission_policy'
  | 'access_scope'
  | 'approval_policy'
  | 'ai_policy'
  | 'template_governance'
  | 'admin_setting'
  | 'review_queue_item'
  | 'feature_flag';

/**
 * Governance audit action types.
 */
export type GovernanceAuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'granted'
  | 'revoked'
  | 'approved'
  | 'rejected';

/**
 * Feature flag status.
 */
export type FeatureFlagStatus = 'active' | 'inactive' | 'archived';

// =====================================================================
// Core Entities
// =====================================================================

/**
 * Platform role defines a set of permissions for a group of users.
 */
export interface PlatformRole {
  /** UUID v4 primary key. */
  roleId: string;
  /** Human-readable role name. */
  name: string;
  /** Optional description of this role's purpose. */
  description?: string;
  /** Current status. */
  status: PlatformRoleStatus;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Permission policy maps roles to specific permissions.
 */
export interface PermissionPolicy {
  /** UUID v4 primary key. */
  policyId: string;
  /** Human-readable policy name. */
  name: string;
  /** Optional description of this policy's purpose. */
  description?: string;
  /** Array of role IDs this policy applies to. */
  roleIds: string[];
  /** Array of permission strings granted by this policy. */
  permissions: string[];
  /** Current status. */
  status: 'active' | 'inactive';
  /** Policy version (incremented on update). */
  version: number;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Access scope defines a user's access to a specific resource scope.
 */
export interface AccessScope {
  /** UUID v4 primary key. */
  scopeId: string;
  /** FK to User. */
  userId: string;
  /** Type of scope. */
  scopeType: AccessScopeType;
  /** FK to the scoped resource (firm_id, office_id, team_id, household_id). */
  scopeRefId: string;
  /** Current status. */
  status: AccessScopeStatus;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** ISO 8601 timestamp of revocation. */
  revokedAt?: string;
}

/**
 * Approval policy defines approval requirements for specific actions.
 */
export interface ApprovalPolicy {
  /** UUID v4 primary key. */
  approvalPolicyId: string;
  /** Type of object requiring approval. */
  objectType: ApprovalObjectType;
  /** Optional audience mode constraint. */
  audienceMode?: AudienceMode;
  /** Whether approval is required for this object type. */
  requiresApproval: boolean;
  /** Array of role IDs that can approve. */
  requiredRoleIds: string[];
  /** Optional conditions for when approval is required. */
  conditions?: Record<string, unknown>;
  /** Current status. */
  status: 'active' | 'inactive';
  /** Policy version (incremented on update). */
  version: number;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * AI governance policy defines controls for AI usage.
 */
export interface AIGovernancePolicy {
  /** UUID v4 primary key. */
  aiPolicyId: string;
  /** Allowed prompt families. */
  allowedPromptFamilies: string[];
  /** Allowed audience modes. */
  allowedAudienceModes: AudienceMode[];
  /** Prompt types that require approval. */
  approvalRequiredPromptTypes: string[];
  /** Role IDs allowed to use AI features. */
  allowedRoleIds: string[];
  /** Current status. */
  status: 'active' | 'inactive';
  /** Policy version (incremented on update). */
  version: number;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Template governance record defines usage rules for templates.
 */
export interface TemplateGovernanceRecord {
  /** FK to DeliverableTemplate. */
  templateId: string;
  /** Template version. */
  version: string;
  /** Current lifecycle status. */
  status: TemplateStatus;
  /** Office IDs allowed to use this template. */
  allowedOfficeIds?: string[];
  /** Team IDs allowed to use this template. */
  allowedTeamIds?: string[];
  /** Whether approval is required to use this template. */
  approvalRequiredForUse: boolean;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Admin setting defines configurable platform behaviors.
 */
export interface AdminSetting {
  /** UUID v4 primary key. */
  settingId: string;
  /** Scope type this setting applies to. */
  scopeType: SettingsScopeType;
  /** FK to the scoped resource. */
  scopeRefId: string;
  /** Setting category. */
  settingCategory: SettingsCategory;
  /** Setting key (unique within category + scope). */
  key: string;
  /** Setting value (structured JSON). */
  value: Record<string, unknown>;
  /** Current status. */
  status: 'active' | 'inactive';
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Review queue item represents an object awaiting approval.
 */
export interface ReviewQueueItem {
  /** UUID v4 primary key. */
  queueItemId: string;
  /** Type of object requiring review. */
  objectType: ApprovalObjectType;
  /** FK to the object requiring review. */
  objectId: string;
  /** Role IDs required to approve this item. */
  requiredRoleIds: string[];
  /** Current status. */
  status: ReviewQueueItemStatus;
  /** User ID of reviewer. */
  reviewedBy?: string;
  /** Review notes. */
  reviewNotes?: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of completion. */
  completedAt?: string;
}

/**
 * Governance audit event records changes to governance objects.
 */
export interface GovernanceAuditEvent {
  /** UUID v4 primary key. */
  eventId: string;
  /** Type of object that changed. */
  objectType: GovernanceAuditObjectType;
  /** FK to the object that changed. */
  objectId: string;
  /** User who performed the action. */
  actor?: string;
  /** Action performed. */
  action: GovernanceAuditAction;
  /** Object state before change. */
  before?: Record<string, unknown>;
  /** Object state after change. */
  after?: Record<string, unknown>;
  /** ISO 8601 timestamp of event. */
  createdAt: string;
}

/**
 * Authorization decision result.
 */
export interface AuthorizationDecision {
  /** Whether the action is allowed. */
  allowed: boolean;
  /** Reason for denial (if applicable). */
  reason?: string;
  /** Role IDs that matched. */
  matchedRoleIds: string[];
  /** Policy IDs that matched. */
  matchedPolicyIds: string[];
  /** Scope IDs that matched. */
  matchedScopeIds: string[];
}

/**
 * Settings resolution result.
 */
export interface SettingsResolutionResult {
  /** Setting category. */
  settingCategory: SettingsCategory;
  /** Setting key. */
  key: string;
  /** Resolved value. */
  resolvedValue: Record<string, unknown>;
  /** Scope type of the source. */
  sourceScopeType: SettingsScopeType;
  /** Scope ref ID of the source. */
  sourceScopeRefId: string;
}

/**
 * Feature flag defines a toggleable platform feature.
 */
export interface FeatureFlag {
  /** UUID v4 primary key. */
  flagId: string;
  /** Flag key (unique identifier). */
  key: string;
  /** Optional description. */
  description?: string;
  /** Whether the flag is enabled. */
  enabled: boolean;
  /** Targeting rules (structured JSON). */
  targetingRules: Record<string, unknown>;
  /** Current status. */
  status: FeatureFlagStatus;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

// =====================================================================
// Command Types
// =====================================================================

/**
 * Command to authorize an action.
 */
export interface AuthorizeActionCommand {
  /** User attempting the action. */
  userId: string;
  /** Action being attempted. */
  action: string;
  /** Resource being accessed. */
  resource?: string;
  /** Additional context. */
  context?: Record<string, unknown>;
}

/**
 * Command to evaluate approval requirement.
 */
export interface EvaluateApprovalCommand {
  /** Type of object. */
  objectType: ApprovalObjectType;
  /** Optional audience mode. */
  audienceMode?: AudienceMode;
  /** Additional context. */
  context?: Record<string, unknown>;
}

/**
 * Command to evaluate AI governance.
 */
export interface EvaluateAIGovernanceCommand {
  /** User attempting AI action. */
  userId: string;
  /** User role. */
  userRole: string;
  /** Prompt family. */
  promptFamily: string;
  /** Audience mode. */
  audienceMode: AudienceMode;
}

/**
 * Command to resolve a setting value.
 */
export interface ResolveSettingCommand {
  /** Setting category. */
  settingCategory: SettingsCategory;
  /** Setting key. */
  key: string;
  /** Team ID for resolution. */
  teamId?: string;
  /** Office ID for resolution. */
  officeId?: string;
  /** Firm ID for resolution. */
  firmId: string;
}

/**
 * Command to evaluate a feature flag.
 */
export interface EvaluateFeatureFlagCommand {
  /** Flag key. */
  key: string;
  /** User context. */
  userContext: Record<string, unknown>;
}

/**
 * Command to record a governance audit event.
 */
export interface RecordGovernanceAuditCommand {
  /** Object type. */
  objectType: GovernanceAuditObjectType;
  /** Object ID. */
  objectId: string;
  /** Actor user ID. */
  actor?: string;
  /** Action performed. */
  action: GovernanceAuditAction;
  /** Object state before. */
  before?: Record<string, unknown>;
  /** Object state after. */
  after?: Record<string, unknown>;
}

/**
 * Command to process a review queue decision.
 */
export interface ReviewQueueDecisionCommand {
  /** Queue item ID. */
  queueItemId: string;
  /** Decision. */
  decision: ReviewDecision;
  /** Reviewer user ID. */
  reviewerUserId: string;
  /** Review notes. */
  reviewNotes?: string;
}
