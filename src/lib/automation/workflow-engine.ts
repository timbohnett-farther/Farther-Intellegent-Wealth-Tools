// =============================================================================
// Automation Engine — Workflow Execution Engine
// =============================================================================

import type {
  WorkflowTemplate,
  WorkflowContext,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStepResult,
  WorkflowTrigger,
  WorkflowEvent,
  WorkflowStepAction,
} from './types';

// ==================== ID Generation ====================

/** Counter for generating unique execution IDs. */
let executionIdCounter = 0;

/**
 * Generates a unique workflow execution identifier.
 */
function generateExecutionId(): string {
  executionIdCounter++;
  const timestamp = Date.now().toString(36);
  const counter = executionIdCounter.toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `wfx_${timestamp}_${counter}_${random}`;
}

// ==================== Step Action Handlers ====================

/**
 * Simulates the execution of a workflow step action.
 * In a production system, each handler would interface with external
 * services (CRM, email, calendar, etc.). Here we produce structured
 * result data describing what would happen.
 */
const ACTION_HANDLERS: Record<
  WorkflowStepAction,
  (step: WorkflowStep, context: WorkflowContext) => Record<string, unknown>
> = {
  create_crm_contact: (_step, context) => ({
    action: 'create_crm_contact',
    clientId: context.clientId ?? null,
    firmId: context.firmId ?? null,
    status: 'contact_created',
    message: `CRM contact created for client ${context.clientId ?? 'unknown'}.`,
  }),

  send_email: (step, context) => ({
    action: 'send_email',
    templateId: step.templateId,
    recipientClientId: context.clientId ?? null,
    status: 'email_queued',
    message: `Email queued using template ${step.templateId ?? 'default'}.`,
  }),

  create_plan_shell: (_step, context) => ({
    action: 'create_plan_shell',
    clientId: context.clientId ?? null,
    planType: 'comprehensive',
    status: 'plan_created',
    message: `Draft plan shell created for client ${context.clientId ?? 'unknown'}.`,
  }),

  send_portal_invite: (_step, context) => ({
    action: 'send_portal_invite',
    clientId: context.clientId ?? null,
    status: 'invite_sent',
    message: `Client portal invitation sent to client ${context.clientId ?? 'unknown'}.`,
  }),

  schedule_meeting: (step, context) => ({
    action: 'schedule_meeting',
    advisorId: context.advisorId ?? null,
    clientId: context.clientId ?? null,
    meetingType: step.config.meetingType ?? 'initial_consultation',
    status: 'meeting_scheduled',
    message: `Meeting scheduled between advisor and client.`,
  }),

  create_task: (step, context) => ({
    action: 'create_task',
    assigneeId: context.advisorId ?? null,
    clientId: context.clientId ?? null,
    taskText: step.taskText,
    status: 'task_created',
    message: `Task created: "${step.taskText}".`,
  }),

  send_document_request: (step, context) => ({
    action: 'send_document_request',
    clientId: context.clientId ?? null,
    templateId: step.templateId,
    status: 'request_sent',
    message: `Document request sent to client ${context.clientId ?? 'unknown'}.`,
  }),

  recalculate_plans: (_step, context) => ({
    action: 'recalculate_plans',
    planId: context.planId ?? null,
    clientId: context.clientId ?? null,
    status: 'recalculation_queued',
    message: `Plan recalculation queued for ${context.planId ?? 'all affected plans'}.`,
  }),

  generate_report: (step, context) => ({
    action: 'generate_report',
    planId: context.planId ?? null,
    reportType: step.config.reportType ?? 'comprehensive',
    status: 'report_generated',
    message: `Report generated for plan ${context.planId ?? 'unknown'}.`,
  }),

  send_alert: (step, context) => ({
    action: 'send_alert',
    advisorId: context.advisorId ?? null,
    alertType: step.config.alertType ?? 'general',
    priority: step.config.priority ?? 'normal',
    status: 'alert_sent',
    message: `Alert sent: "${step.taskText}".`,
  }),

  notify_advisor: (step, context) => ({
    action: 'notify_advisor',
    advisorId: context.advisorId ?? null,
    notificationType: step.config.notificationType ?? 'in_app',
    status: 'notification_sent',
    message: `Advisor notification sent: "${step.taskText}".`,
  }),

  update_crm: (step, context) => ({
    action: 'update_crm',
    clientId: context.clientId ?? null,
    fieldsUpdated: step.config.fields ?? [],
    status: 'crm_updated',
    message: `CRM record updated for client ${context.clientId ?? 'unknown'}.`,
  }),

  identify_clients: (step, _context) => ({
    action: 'identify_clients',
    criteria: step.config.criteria ?? {},
    status: 'clients_identified',
    message: `Client identification query executed.`,
  }),

  generate_calculations: (step, context) => ({
    action: 'generate_calculations',
    planId: context.planId ?? null,
    calculationType: step.config.calculationType ?? 'standard',
    status: 'calculations_generated',
    message: `Calculations generated for plan ${context.planId ?? 'unknown'}.`,
  }),

  suggest_plan_updates: (step, context) => ({
    action: 'suggest_plan_updates',
    planId: context.planId ?? null,
    suggestions: step.config.suggestions ?? [],
    status: 'suggestions_created',
    message: `Plan update suggestions generated.`,
  }),

  create_review_task: (step, context) => ({
    action: 'create_review_task',
    advisorId: context.advisorId ?? null,
    clientId: context.clientId ?? null,
    taskText: step.taskText,
    status: 'review_task_created',
    message: `Review task created: "${step.taskText}".`,
  }),

  custom: (step, _context) => ({
    action: 'custom',
    customAction: step.config.customAction ?? 'unknown',
    status: 'custom_executed',
    message: `Custom action executed: "${step.taskText}".`,
  }),
};

// ==================== Step Execution ====================

/**
 * Executes a single workflow step and returns the result.
 *
 * Dispatches to the appropriate action handler based on the step's
 * action type. If the handler throws, the step is marked as failed
 * with the error message captured.
 *
 * @param step - The workflow step to execute.
 * @param context - The context for this workflow execution.
 * @returns A WorkflowStepResult capturing the outcome.
 */
export function executeStep(
  step: WorkflowStep,
  context: WorkflowContext
): WorkflowStepResult {
  const stepIndex = context.data._currentStepIndex as number ?? 0;
  const executedAt = new Date();

  try {
    const handler = ACTION_HANDLERS[step.action];

    if (!handler) {
      return {
        stepIndex,
        action: step.action,
        status: 'failed',
        result: null,
        error: `No handler registered for action: ${step.action}`,
        executedAt,
      };
    }

    const result = handler(step, context);

    return {
      stepIndex,
      action: step.action,
      status: 'completed',
      result,
      error: null,
      executedAt,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      stepIndex,
      action: step.action,
      status: 'failed',
      result: null,
      error: errorMessage,
      executedAt,
    };
  }
}

// ==================== Workflow Execution ====================

/**
 * Executes an entire workflow template within the given context.
 *
 * Iterates through each step in order, executing them synchronously.
 * If a step fails, the workflow is marked as failed and remaining steps
 * are skipped. Step delays are recorded but not actually waited upon
 * (in a production system, delays would be handled by a job scheduler).
 *
 * @param template - The workflow template to execute.
 * @param context - The context for this execution.
 * @returns A WorkflowExecution record capturing the complete run.
 */
export function executeWorkflow(
  template: WorkflowTemplate,
  context: WorkflowContext
): WorkflowExecution {
  const executionId = generateExecutionId();
  const now = new Date();

  const execution: WorkflowExecution = {
    id: executionId,
    workflowId: template.id,
    planId: context.planId ?? null,
    clientId: context.clientId ?? null,
    status: 'running',
    stepResults: [],
    currentStep: 0,
    error: null,
    timestamps: {
      createdAt: now,
      startedAt: now,
      completedAt: null,
    },
  };

  if (!template.isActive) {
    execution.status = 'cancelled';
    execution.error = 'Workflow template is not active.';
    execution.timestamps.completedAt = new Date();
    return execution;
  }

  if (template.steps.length === 0) {
    execution.status = 'completed';
    execution.timestamps.completedAt = new Date();
    return execution;
  }

  for (let i = 0; i < template.steps.length; i++) {
    execution.currentStep = i;

    // Set the current step index in context for the step handler
    const stepContext: WorkflowContext = {
      ...context,
      data: { ...context.data, _currentStepIndex: i },
    };

    const stepResult = executeStep(template.steps[i], stepContext);

    // Correct the stepIndex in the result
    stepResult.stepIndex = i;

    execution.stepResults.push(stepResult);

    // If a step fails, mark the workflow as failed and stop
    if (stepResult.status === 'failed') {
      execution.status = 'failed';
      execution.error = `Step ${i} (${template.steps[i].action}) failed: ${stepResult.error}`;
      execution.timestamps.completedAt = new Date();
      return execution;
    }

    // Accumulate step results in context data for subsequent steps
    if (stepResult.result) {
      stepContext.data[`step_${i}_result`] = stepResult.result;
      context.data[`step_${i}_result`] = stepResult.result;
    }
  }

  execution.status = 'completed';
  execution.currentStep = template.steps.length - 1;
  execution.timestamps.completedAt = new Date();

  return execution;
}

// ==================== Trigger Evaluation ====================

/**
 * Evaluates whether a given event matches a workflow trigger.
 *
 * The event type must match the trigger type. Additionally, any
 * configuration keys present in the trigger's config are checked
 * against the event's data — all config values must match for
 * the trigger to fire.
 *
 * For 'scheduled' triggers, the trigger always matches if the event
 * type is 'scheduled' (schedule timing is handled externally).
 *
 * @param trigger - The workflow trigger to evaluate.
 * @param event - The event to test against.
 * @returns `true` if the event matches the trigger.
 */
export function evaluateTrigger(
  trigger: WorkflowTrigger,
  event: WorkflowEvent
): boolean {
  // Type must match
  if (trigger.type !== event.type) {
    return false;
  }

  // Scheduled triggers match on type alone (timing handled externally)
  if (trigger.type === 'scheduled') {
    return true;
  }

  // Manual triggers match on type alone
  if (trigger.type === 'manual') {
    return true;
  }

  // Check config conditions against event data
  const configKeys = Object.keys(trigger.config);
  if (configKeys.length === 0) {
    return true;
  }

  for (const key of configKeys) {
    const triggerValue = trigger.config[key];
    const eventValue = event.data[key];

    // If the trigger config specifies an array, check if event value is in the array
    if (Array.isArray(triggerValue)) {
      if (!triggerValue.includes(eventValue)) {
        return false;
      }
    } else if (triggerValue !== eventValue) {
      return false;
    }
  }

  return true;
}
