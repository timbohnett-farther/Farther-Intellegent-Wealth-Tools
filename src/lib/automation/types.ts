// =============================================================================
// Automation Engine — Type Definitions
// =============================================================================

// ==================== Workflow Trigger ====================

/** The type of event that can trigger a workflow. */
export type WorkflowTriggerType =
  | 'client_created'
  | 'plan_calculated'
  | 'scheduled'
  | 'life_event'
  | 'account_synced'
  | 'manual';

/**
 * Defines what event triggers a workflow and any configuration
 * for matching conditions.
 */
export interface WorkflowTrigger {
  /** The type of trigger event. */
  type: WorkflowTriggerType;
  /** Additional configuration for the trigger. */
  config: Record<string, unknown>;
}

// ==================== Workflow Step ====================

/** The action a workflow step performs. */
export type WorkflowStepAction =
  | 'create_crm_contact'
  | 'send_email'
  | 'create_plan_shell'
  | 'send_portal_invite'
  | 'schedule_meeting'
  | 'create_task'
  | 'send_document_request'
  | 'recalculate_plans'
  | 'generate_report'
  | 'send_alert'
  | 'notify_advisor'
  | 'update_crm'
  | 'identify_clients'
  | 'generate_calculations'
  | 'suggest_plan_updates'
  | 'create_review_task'
  | 'custom';

/**
 * A single step within a workflow. Each step performs one action
 * and can optionally be delayed before execution.
 */
export interface WorkflowStep {
  /** The action to perform at this step. */
  action: WorkflowStepAction;
  /** Delay in seconds before executing this step (0 = immediate). */
  delay: number;
  /** Optional reference to a template (e.g. email template ID). */
  templateId: string | null;
  /** Human-readable description of what this step does. */
  taskText: string;
  /** Additional configuration for this step. */
  config: Record<string, unknown>;
}

// ==================== Workflow Template ====================

/**
 * A reusable workflow template that defines a sequence of steps
 * to execute in response to a trigger event.
 */
export interface WorkflowTemplate {
  /** Unique identifier for the workflow template. */
  id: string;
  /** Human-readable name for the workflow. */
  name: string;
  /** The trigger that starts this workflow. */
  trigger: WorkflowTrigger;
  /** Ordered list of steps to execute. */
  steps: WorkflowStep[];
  /** Whether this workflow is currently active. */
  isActive: boolean;
  /** Whether this is a system-defined (non-editable) workflow. */
  isSystem: boolean;
}

// ==================== Workflow Execution ====================

/** The current status of a workflow execution. */
export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** The result status of a single step execution. */
export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * The result of executing a single workflow step.
 */
export interface WorkflowStepResult {
  /** The index of the step within the workflow. */
  stepIndex: number;
  /** The action that was executed. */
  action: WorkflowStepAction;
  /** The outcome of the step execution. */
  status: WorkflowStepStatus;
  /** Any data returned by the step execution. */
  result: Record<string, unknown> | null;
  /** Error message if the step failed. */
  error: string | null;
  /** When the step was executed. */
  executedAt: Date;
}

/**
 * A record of a complete workflow execution, including the current
 * state and results of each step.
 */
export interface WorkflowExecution {
  /** Unique identifier for this execution. */
  id: string;
  /** The workflow template that was executed. */
  workflowId: string;
  /** The plan associated with this execution, if any. */
  planId: string | null;
  /** The client associated with this execution, if any. */
  clientId: string | null;
  /** Current status of the execution. */
  status: WorkflowExecutionStatus;
  /** Results of each step that has been executed. */
  stepResults: WorkflowStepResult[];
  /** Index of the step currently being executed (-1 if not started). */
  currentStep: number;
  /** Error message if the workflow failed. */
  error: string | null;
  /** Timestamps for key lifecycle events. */
  timestamps: {
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  };
}

// ==================== Supporting Types ====================

/**
 * An event that occurs in the system and may trigger workflows.
 */
export interface WorkflowEvent {
  /** The type of event. */
  type: WorkflowTriggerType;
  /** Unique identifier for this event instance. */
  eventId: string;
  /** When the event occurred. */
  timestamp: Date;
  /** The plan associated with this event, if any. */
  planId?: string;
  /** The client associated with this event, if any. */
  clientId?: string;
  /** The firm associated with this event. */
  firmId?: string;
  /** Additional data about the event. */
  data: Record<string, unknown>;
}

/**
 * Context available to workflow steps during execution.
 */
export interface WorkflowContext {
  /** The event that triggered this workflow. */
  event: WorkflowEvent;
  /** The plan ID, if available. */
  planId?: string;
  /** The client ID, if available. */
  clientId?: string;
  /** The firm ID. */
  firmId?: string;
  /** The advisor ID, if available. */
  advisorId?: string;
  /** Additional data that can be passed between steps. */
  data: Record<string, unknown>;
}

/**
 * Definition of a trigger type with its description and
 * available configuration options.
 */
export interface TriggerDefinition {
  /** The trigger type. */
  type: WorkflowTriggerType;
  /** Human-readable label for the trigger. */
  label: string;
  /** Description of when this trigger fires. */
  description: string;
  /** Available configuration keys for this trigger type. */
  configKeys: string[];
}
