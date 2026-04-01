// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Zod Schemas
// =============================================================================
//
// Validation schemas for all workflow command types.
// =============================================================================

import { z } from 'zod';

// =====================================================================
// Task Schemas
// =====================================================================

export const TaskTypeSchema = z.enum([
  'follow_up',
  'client_discussion',
  'request_data',
  'coordinate_cpa',
  'prepare_meeting',
  'implementation',
  'review',
  'compliance',
]);

export const TaskStatusSchema = z.enum([
  'new',
  'assigned',
  'in_progress',
  'waiting',
  'blocked',
  'completed',
  'deferred',
  'canceled',
  'superseded',
]);

export const CreateTaskCommandSchema = z.object({
  householdId: z.string().min(1, 'householdId required'),
  taxYear: z.number().int().min(2020).max(2099),
  workflowRunId: z.string().optional(),
  taskType: TaskTypeSchema,
  title: z.string().min(1, 'title required'),
  description: z.string().optional(),
  ownerUserId: z.string().optional(),
  ownerRole: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  dependsOn: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateTaskCommandSchema = z.object({
  status: TaskStatusSchema.optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  ownerUserId: z.string().optional(),
  ownerRole: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AssignTaskCommandSchema = z.object({
  ownerUserId: z.string().min(1, 'ownerUserId required'),
  ownerRole: z.string().min(1, 'ownerRole required'),
});

// =====================================================================
// Workflow Schemas
// =====================================================================

export const WorkflowTypeSchema = z.enum([
  'implement_recommendation',
  'coordinate_cpa',
  'client_follow_up',
  'meeting_prep',
  'data_collection',
  'review_and_approve',
]);

export const WorkflowStatusSchema = z.enum([
  'new',
  'active',
  'waiting',
  'blocked',
  'completed',
  'deferred',
  'canceled',
  'superseded',
]);

export const CreateWorkflowCommandSchema = z.object({
  householdId: z.string().min(1, 'householdId required'),
  taxYear: z.number().int().min(2020).max(2099),
  workflowType: WorkflowTypeSchema,
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateWorkflowCommandSchema = z.object({
  status: WorkflowStatusSchema.optional(),
  name: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// =====================================================================
// CRM Schemas
// =====================================================================

export const CRMPayloadTypeSchema = z.enum([
  'note',
  'task',
  'meeting_prep',
  'recommendation_summary',
  'follow_up',
]);

export const BuildCRMPayloadCommandSchema = z.object({
  householdId: z.string().min(1, 'householdId required'),
  payloadType: CRMPayloadTypeSchema,
  sourceTaskId: z.string().optional(),
  sourceRecommendationId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

// =====================================================================
// CPA Schemas
// =====================================================================

export const CPARequestStatusSchema = z.enum([
  'draft',
  'sent',
  'acknowledged',
  'waiting_on_cpa',
  'response_received',
  'completed',
  'canceled',
  'superseded',
]);

export const CreateCPARequestCommandSchema = z.object({
  householdId: z.string().min(1, 'householdId required'),
  taxYear: z.number().int().min(2020).max(2099),
  subject: z.string().min(1, 'subject required'),
  message: z.string().min(1, 'message required'),
  cpaEmail: z.string().email('valid email required'),
  cpaName: z.string().optional(),
  relatedTaskId: z.string().optional(),
});

export const UpdateCPARequestCommandSchema = z.object({
  status: CPARequestStatusSchema.optional(),
  responseMessage: z.string().optional(),
});

// =====================================================================
// Recommendation Schemas
// =====================================================================

export const RecommendationStatusSchema = z.enum([
  'surfaced',
  'reviewed',
  'presented',
  'accepted',
  'deferred',
  'rejected',
  'in_implementation',
  'implemented',
  'superseded',
]);

export const UpdateRecommendationCommandSchema = z.object({
  status: RecommendationStatusSchema,
  relatedTaskIds: z.array(z.string()).optional(),
});
