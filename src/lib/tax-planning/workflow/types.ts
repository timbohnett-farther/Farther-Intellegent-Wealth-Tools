// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Type Definitions
// =============================================================================
//
// Core types for the workflow system: tasks, workflows, CPA requests,
// recommendation statuses, CRM sync, reminders, and escalations.
// =============================================================================

import type { TaxYear } from '../types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * Task types define the category of work to be performed.
 */
export type TaskType =
  | 'follow_up'
  | 'client_discussion'
  | 'request_data'
  | 'coordinate_cpa'
  | 'prepare_meeting'
  | 'implementation'
  | 'review'
  | 'compliance';

/**
 * Task status lifecycle.
 * Tasks progress through states as work is performed.
 */
export type TaskStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'deferred'
  | 'canceled'
  | 'superseded';

/**
 * Workflow types define pre-configured multi-task processes.
 */
export type WorkflowType =
  | 'implement_recommendation'
  | 'coordinate_cpa'
  | 'client_follow_up'
  | 'meeting_prep'
  | 'data_collection'
  | 'review_and_approve';

/**
 * Workflow status lifecycle.
 * Workflows track the state of multi-task processes.
 */
export type WorkflowStatus =
  | 'new'
  | 'active'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'deferred'
  | 'canceled'
  | 'superseded';

/**
 * CPA request status lifecycle.
 * Tracks coordination state with external CPA.
 */
export type CPARequestStatus =
  | 'draft'
  | 'sent'
  | 'acknowledged'
  | 'waiting_on_cpa'
  | 'response_received'
  | 'completed'
  | 'canceled'
  | 'superseded';

/**
 * Recommendation execution status lifecycle.
 * Tracks recommendation from surfaced through implemented.
 */
export type RecommendationStatus =
  | 'surfaced'
  | 'reviewed'
  | 'presented'
  | 'accepted'
  | 'deferred'
  | 'rejected'
  | 'in_implementation'
  | 'implemented'
  | 'superseded';

/**
 * CRM payload types define the kind of CRM object to sync.
 */
export type CRMPayloadType =
  | 'note'
  | 'task'
  | 'meeting_prep'
  | 'recommendation_summary'
  | 'follow_up';

/**
 * CRM sync status lifecycle.
 * Tracks CRM push state.
 */
export type CRMSyncStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'superseded';

/**
 * Reminder types define the category of reminder event.
 */
export type ReminderType =
  | 'upcoming_due'
  | 'overdue'
  | 'waiting_too_long'
  | 'blocked_too_long'
  | 'unassigned';

/**
 * Escalation types define the category of escalation event.
 */
export type EscalationType =
  | 'overdue'
  | 'blocked'
  | 'unassigned'
  | 'waiting_on_cpa'
  | 'waiting_on_client';

// =====================================================================
// Core Entities
// =====================================================================

/**
 * A workflow task is a single unit of work within a workflow.
 */
export interface WorkflowTask {
  /** UUID v4 primary key. */
  taskId: string;
  /** FK to Household this task pertains to. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Optional FK to parent workflow run. */
  workflowRunId?: string;
  /** Task type. */
  taskType: TaskType;
  /** Current status. */
  status: TaskStatus;
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description?: string;
  /** User ID responsible for this task. */
  ownerUserId?: string;
  /** Role responsible (e.g. ADVISOR, PARAPLANNER). */
  ownerRole?: string;
  /** ISO 8601 due date. */
  dueDate?: string;
  /** Array of task IDs this task depends on. */
  dependsOn: string[];
  /** Metadata bag for task-specific context. */
  metadata: Record<string, unknown>;
  /** User who created this task. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** ISO 8601 timestamp of completion. */
  completedAt?: string;
}

/**
 * A workflow run is a single execution of a workflow template.
 * It contains multiple tasks that are executed in dependency order.
 */
export interface WorkflowRun {
  /** UUID v4 primary key. */
  workflowRunId: string;
  /** FK to Household this workflow pertains to. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Workflow type (template identifier). */
  workflowType: WorkflowType;
  /** Current status. */
  status: WorkflowStatus;
  /** Human-readable name. */
  name: string;
  /** Array of task IDs in this workflow. */
  taskIds: string[];
  /** Metadata bag for workflow-specific context. */
  metadata: Record<string, unknown>;
  /** User who triggered this workflow. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** ISO 8601 timestamp of completion. */
  completedAt?: string;
}

/**
 * Recommendation execution status tracks a recommendation through its lifecycle.
 * Links to copilot answers, deliverables, and tasks.
 */
export interface RecommendationExecutionStatus {
  /** UUID v4 primary key. */
  recommendationId: string;
  /** FK to Household this recommendation pertains to. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Current status. */
  status: RecommendationStatus;
  /** Brief title of the recommendation. */
  title: string;
  /** Detailed description. */
  summary: string;
  /** Estimated value (in dollars). */
  estimatedValue?: number;
  /** Priority level. */
  priority: 'high' | 'medium' | 'low';
  /** FK to related copilot answer (if generated by AI). */
  copilotAnswerId?: string;
  /** FK to related deliverable (if presented via report). */
  deliverableId?: string;
  /** Array of task IDs related to this recommendation. */
  relatedTaskIds: string[];
  /** User who surfaced this recommendation. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** ISO 8601 timestamp of implementation. */
  implementedAt?: string;
}

/**
 * CRM sync payload represents a structured object to be pushed to HubSpot.
 */
export interface CRMSyncPayload {
  /** UUID v4 primary key. */
  payloadId: string;
  /** FK to Household this payload pertains to. */
  householdId: string;
  /** CRM payload type. */
  payloadType: CRMPayloadType;
  /** Current sync status. */
  syncStatus: CRMSyncStatus;
  /** Structured payload object (formatted for HubSpot API). */
  payload: Record<string, unknown>;
  /** Optional FK to source task. */
  sourceTaskId?: string;
  /** Optional FK to source recommendation. */
  sourceRecommendationId?: string;
  /** Error message if sync failed. */
  errorMessage?: string;
  /** ISO 8601 timestamp of last sync attempt. */
  lastSyncAttemptAt?: string;
  /** User who created this payload. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
}

/**
 * CPA coordination request tracks communication with external CPA.
 */
export interface CPACoordinationRequest {
  /** UUID v4 primary key. */
  requestId: string;
  /** FK to Household this request pertains to. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Current status. */
  status: CPARequestStatus;
  /** Subject line for the request. */
  subject: string;
  /** Full request message body. */
  message: string;
  /** CPA contact email. */
  cpaEmail: string;
  /** CPA contact name. */
  cpaName?: string;
  /** Optional FK to related task. */
  relatedTaskId?: string;
  /** Response message from CPA. */
  responseMessage?: string;
  /** ISO 8601 timestamp when request was sent. */
  sentAt?: string;
  /** ISO 8601 timestamp when response was received. */
  respondedAt?: string;
  /** User who created this request. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

/**
 * Workflow template defines a multi-task blueprint.
 */
export interface WorkflowTemplate {
  /** Unique template identifier (matches WorkflowType). */
  templateId: WorkflowType;
  /** Human-readable name. */
  name: string;
  /** Description of this workflow's purpose. */
  description: string;
  /** Template version string (semver). */
  version: string;
  /** Task blueprints in dependency order. */
  tasks: WorkflowTemplateTask[];
  /** Whether this template is currently enabled. */
  enabled: boolean;
}

/**
 * Workflow template task defines a single task within a workflow template.
 */
export interface WorkflowTemplateTask {
  /** Unique identifier within the template. */
  taskKey: string;
  /** Task type. */
  taskType: TaskType;
  /** Title template (may contain {{variables}}). */
  title: string;
  /** Description template. */
  description?: string;
  /** Default owner role. */
  defaultOwnerRole?: string;
  /** Array of taskKeys this task depends on (within template). */
  dependsOnKeys: string[];
  /** Estimated duration in days (for due date calculation). */
  estimatedDays?: number;
}

/**
 * Reminder record tracks scheduled reminder notifications.
 */
export interface ReminderRecord {
  /** UUID v4 primary key. */
  reminderId: string;
  /** Object type being reminded about (task, workflow, cpa_request). */
  objectType: 'task' | 'workflow' | 'cpa_request';
  /** FK to the object being reminded about. */
  objectId: string;
  /** Reminder type. */
  reminderType: ReminderType;
  /** ISO 8601 timestamp when reminder should fire. */
  scheduledFor: string;
  /** Whether this reminder has been sent. */
  sent: boolean;
  /** ISO 8601 timestamp when reminder was sent. */
  sentAt?: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
}

/**
 * Escalation record tracks escalation events for blocked/overdue items.
 */
export interface EscalationRecord {
  /** UUID v4 primary key. */
  escalationId: string;
  /** Object type being escalated (task, workflow, cpa_request). */
  objectType: 'task' | 'workflow' | 'cpa_request';
  /** FK to the object being escalated. */
  objectId: string;
  /** Escalation type. */
  escalationType: EscalationType;
  /** ISO 8601 timestamp of escalation. */
  escalatedAt: string;
  /** User notified of escalation. */
  notifiedUserId?: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
}

// =====================================================================
// Request / Response Types
// =====================================================================

/**
 * Request to create a new task.
 */
export interface CreateTaskCommand {
  /** FK to Household. */
  householdId: string;
  /** Tax year context. */
  taxYear: number;
  /** Optional FK to parent workflow. */
  workflowRunId?: string;
  /** Task type. */
  taskType: TaskType;
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description?: string;
  /** User ID responsible. */
  ownerUserId?: string;
  /** Role responsible. */
  ownerRole?: string;
  /** ISO 8601 due date. */
  dueDate?: string;
  /** Array of task IDs this task depends on. */
  dependsOn?: string[];
  /** Metadata bag. */
  metadata?: Record<string, unknown>;
}

/**
 * Request to update an existing task.
 */
export interface UpdateTaskCommand {
  /** New status (triggers state machine). */
  status?: TaskStatus;
  /** New title. */
  title?: string;
  /** New description. */
  description?: string;
  /** New owner. */
  ownerUserId?: string;
  /** New role. */
  ownerRole?: string;
  /** New due date. */
  dueDate?: string;
  /** New metadata (replaces existing). */
  metadata?: Record<string, unknown>;
}

/**
 * Request to assign a task to a user.
 */
export interface AssignTaskCommand {
  /** User ID to assign to. */
  ownerUserId: string;
  /** Role to assign to. */
  ownerRole: string;
}

/**
 * Request to create a new workflow run.
 */
export interface CreateWorkflowCommand {
  /** FK to Household. */
  householdId: string;
  /** Tax year context. */
  taxYear: number;
  /** Workflow type (template identifier). */
  workflowType: WorkflowType;
  /** Optional human-readable name (auto-generated if omitted). */
  name?: string;
  /** Metadata bag for template variable substitution. */
  metadata?: Record<string, unknown>;
}

/**
 * Request to update an existing workflow run.
 */
export interface UpdateWorkflowCommand {
  /** New status (triggers state machine). */
  status?: WorkflowStatus;
  /** New name. */
  name?: string;
  /** New metadata (replaces existing). */
  metadata?: Record<string, unknown>;
}

/**
 * Request to build a CRM sync payload.
 */
export interface BuildCRMPayloadCommand {
  /** FK to Household. */
  householdId: string;
  /** CRM payload type. */
  payloadType: CRMPayloadType;
  /** Optional FK to source task. */
  sourceTaskId?: string;
  /** Optional FK to source recommendation. */
  sourceRecommendationId?: string;
  /** Structured payload data. */
  payload: Record<string, unknown>;
}

/**
 * Request to create a new CPA coordination request.
 */
export interface CreateCPARequestCommand {
  /** FK to Household. */
  householdId: string;
  /** Tax year context. */
  taxYear: number;
  /** Subject line. */
  subject: string;
  /** Full message body. */
  message: string;
  /** CPA contact email. */
  cpaEmail: string;
  /** CPA contact name. */
  cpaName?: string;
  /** Optional FK to related task. */
  relatedTaskId?: string;
}

/**
 * Request to update an existing CPA coordination request.
 */
export interface UpdateCPARequestCommand {
  /** New status (triggers state machine). */
  status?: CPARequestStatus;
  /** Response message from CPA. */
  responseMessage?: string;
}

/**
 * Request to update a recommendation status.
 */
export interface UpdateRecommendationCommand {
  /** New status (triggers state machine). */
  status: RecommendationStatus;
  /** Array of task IDs related to this recommendation. */
  relatedTaskIds?: string[];
}

/**
 * Result of dependency evaluation.
 */
export interface DependencyEvaluationResult {
  /** Whether all dependencies are satisfied. */
  canStart: boolean;
  /** Array of blocking task IDs (not yet completed). */
  blockingTaskIds: string[];
  /** Array of completed dependency task IDs. */
  completedDependencyIds: string[];
}
