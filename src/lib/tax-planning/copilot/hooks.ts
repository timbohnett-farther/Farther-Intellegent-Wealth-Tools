// =============================================================================
// AI Copilot & Citation Layer — Downstream Hooks
// =============================================================================
//
// Hook system for converting copilot answers into downstream outputs
// (reporting narrative blocks, workflow task payloads, etc.).
// =============================================================================

import type { CopilotAnswer } from './types';

// =====================================================================
// Hook Types
// =====================================================================

/** Hook function signature. */
export type CopilotHookFn = (answer: CopilotAnswer) => CopilotHookResult | null;

/** Result from a hook execution. */
export interface CopilotHookResult {
  /** Hook identifier. */
  hook_id: string;
  /** Type of output produced. */
  output_type: 'reporting_narrative' | 'workflow_task' | 'custom';
  /** The payload for downstream consumption. */
  payload: Record<string, unknown>;
}

// =====================================================================
// Hook Registry
// =====================================================================

const registeredHooks: Map<string, CopilotHookFn> = new Map();

/**
 * Register a downstream hook.
 *
 * @param hookId - Unique identifier for this hook.
 * @param fn - The hook function to execute.
 */
export function registerHook(hookId: string, fn: CopilotHookFn): void {
  registeredHooks.set(hookId, fn);
}

/**
 * Unregister a downstream hook.
 *
 * @param hookId - The hook to remove.
 * @returns True if the hook was found and removed.
 */
export function unregisterHook(hookId: string): boolean {
  return registeredHooks.delete(hookId);
}

/**
 * Execute all registered hooks for a copilot answer.
 * Hooks that return null are skipped.
 *
 * @param answer - The copilot answer to process.
 * @returns Array of hook results.
 */
export function executeHooks(answer: CopilotAnswer): CopilotHookResult[] {
  const results: CopilotHookResult[] = [];

  for (const [hookId, fn] of registeredHooks) {
    try {
      const result = fn(answer);
      if (result) {
        results.push(result);
      }
    } catch (err) {
      console.error(`[CopilotHook] Error in hook "${hookId}":`, err);
    }
  }

  return results;
}

/**
 * Clear all registered hooks. For testing only.
 */
export function clearHooks(): void {
  registeredHooks.clear();
}

// =====================================================================
// Built-in Hooks
// =====================================================================

/**
 * Reporting hook: Converts approved copilot answers into narrative blocks
 * for inclusion in generated reports.
 */
export const reportingHook: CopilotHookFn = (answer) => {
  // Only trigger for approved answers
  if (answer.review_state !== 'approved_for_use') return null;

  return {
    hook_id: 'reporting_narrative',
    output_type: 'reporting_narrative',
    payload: {
      household_id: answer.household_id,
      tax_year: answer.tax_year,
      narrative_text: answer.answer_text,
      citation_count: answer.citations.length,
      confidence: answer.confidence,
      prompt_family: answer.prompt_family,
      audience: answer.audience,
      generated_at: answer.created_at,
    },
  };
};

/**
 * Workflow hook: Converts copilot answers with action items into
 * task payloads for workflow systems.
 */
export const workflowHook: CopilotHookFn = (answer) => {
  // Only trigger for draft families that produce action items
  const actionFamilies = ['draft_meeting_prep', 'draft_cpa_note', 'missing_data_review'];
  if (!actionFamilies.includes(answer.prompt_family)) return null;
  if (answer.review_state === 'discarded') return null;

  return {
    hook_id: 'workflow_task',
    output_type: 'workflow_task',
    payload: {
      household_id: answer.household_id,
      tax_year: answer.tax_year,
      task_type: answer.prompt_family,
      priority: answer.confidence === 'high' ? 'normal' : 'high',
      created_by: answer.created_by,
      answer_id: answer.answer_id,
      formatted_output: answer.formatted_output,
    },
  };
};
