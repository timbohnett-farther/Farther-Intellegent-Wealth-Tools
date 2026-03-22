// =============================================================================
// Automation Engine — Barrel Export
// =============================================================================

// Types
export type {
  WorkflowTriggerType,
  WorkflowTrigger,
  WorkflowStepAction,
  WorkflowStep,
  WorkflowTemplate,
  WorkflowExecutionStatus,
  WorkflowStepStatus,
  WorkflowStepResult,
  WorkflowExecution,
  WorkflowEvent,
  WorkflowContext,
  TriggerDefinition,
} from './types';

// Workflow Engine
export {
  executeWorkflow,
  executeStep,
  evaluateTrigger,
} from './workflow-engine';

// Workflow Templates
export { SYSTEM_WORKFLOWS } from './workflow-templates';

// Triggers
export {
  TRIGGER_DEFINITIONS,
  matchEventToWorkflows,
  buildCronSchedule,
} from './triggers';
