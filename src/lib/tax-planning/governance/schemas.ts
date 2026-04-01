// =============================================================================
// Governance, Compliance, & Admin Layer — Zod Validation Schemas
// =============================================================================
//
// Request/response validation schemas for all governance API endpoints.
// Uses Zod v4 for runtime type checking.
// =============================================================================

import { z } from 'zod';

// =====================================================================
// Enum Schemas
// =====================================================================

const PlatformRoleStatusSchema = z.enum(['active', 'inactive']);

const AccessScopeTypeSchema = z.enum(['firm', 'office', 'team', 'household']);

const AccessScopeStatusSchema = z.enum(['active', 'revoked']);

const ApprovalObjectTypeSchema = z.enum([
  'ai_answer',
  'deliverable',
  'scenario',
  'cpa_request',
  'workflow_action',
]);

const AudienceModeSchema = z.enum([
  'advisor_internal',
  'client_friendly',
  'cpa_technical',
  'compliance_formal',
  'executive_summary',
]);

const TemplateStatusSchema = z.enum(['draft', 'published', 'deprecated']);

const SettingsScopeTypeSchema = z.enum(['firm', 'office', 'team']);

const SettingsCategorySchema = z.enum([
  'ai_config',
  'approval_thresholds',
  'notification_rules',
  'workflow_automation',
  'compliance_rules',
  'export_rules',
]);

const ReviewQueueItemStatusSchema = z.enum([
  'pending',
  'in_review',
  'approved',
  'rejected',
  'canceled',
]);

const ReviewDecisionSchema = z.enum(['approved', 'rejected']);

const GovernanceAuditObjectTypeSchema = z.enum([
  'role',
  'permission_policy',
  'access_scope',
  'approval_policy',
  'ai_policy',
  'template_governance',
  'admin_setting',
  'review_queue_item',
  'feature_flag',
]);

const GovernanceAuditActionSchema = z.enum([
  'created',
  'updated',
  'deleted',
  'granted',
  'revoked',
  'approved',
  'rejected',
]);

const FeatureFlagStatusSchema = z.enum(['active', 'inactive', 'archived']);

// =====================================================================
// Command Schemas
// =====================================================================

export const AuthorizeActionCommandSchema = z.object({
  userId: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const EvaluateApprovalCommandSchema = z.object({
  objectType: ApprovalObjectTypeSchema,
  audienceMode: AudienceModeSchema.optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const EvaluateAIGovernanceCommandSchema = z.object({
  userId: z.string().min(1),
  userRole: z.string().min(1),
  promptFamily: z.string().min(1),
  audienceMode: AudienceModeSchema,
});

export const ResolveSettingCommandSchema = z.object({
  settingCategory: SettingsCategorySchema,
  key: z.string().min(1),
  teamId: z.string().optional(),
  officeId: z.string().optional(),
  firmId: z.string().min(1),
});

export const EvaluateFeatureFlagCommandSchema = z.object({
  key: z.string().min(1),
  userContext: z.record(z.string(), z.unknown()),
});

export const RecordGovernanceAuditCommandSchema = z.object({
  objectType: GovernanceAuditObjectTypeSchema,
  objectId: z.string().min(1),
  actor: z.string().optional(),
  action: GovernanceAuditActionSchema,
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
});

export const ReviewQueueDecisionCommandSchema = z.object({
  queueItemId: z.string().min(1),
  decision: ReviewDecisionSchema,
  reviewerUserId: z.string().min(1),
  reviewNotes: z.string().max(2000).optional(),
});

// =====================================================================
// Type Exports
// =====================================================================

export type AuthorizeActionCommandInput = z.infer<typeof AuthorizeActionCommandSchema>;
export type EvaluateApprovalCommandInput = z.infer<typeof EvaluateApprovalCommandSchema>;
export type EvaluateAIGovernanceCommandInput = z.infer<typeof EvaluateAIGovernanceCommandSchema>;
export type ResolveSettingCommandInput = z.infer<typeof ResolveSettingCommandSchema>;
export type EvaluateFeatureFlagCommandInput = z.infer<typeof EvaluateFeatureFlagCommandSchema>;
export type RecordGovernanceAuditCommandInput = z.infer<typeof RecordGovernanceAuditCommandSchema>;
export type ReviewQueueDecisionCommandInput = z.infer<typeof ReviewQueueDecisionCommandSchema>;
