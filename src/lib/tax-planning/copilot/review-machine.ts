// =============================================================================
// AI Copilot & Citation Layer — Review State Machine
// =============================================================================
//
// Enforces valid state transitions for copilot answer review workflow.
// Terminal states (discarded, superseded) cannot be exited.
// =============================================================================

import type { ReviewState } from './types';

// =====================================================================
// Valid Transitions
// =====================================================================

/**
 * Map of valid state transitions.
 * Each key is a current state, and the value is an array of valid next states.
 *
 * State machine:
 *   draft → reviewed | discarded
 *   reviewed → approved_for_use | discarded | draft (send back)
 *   approved_for_use → superseded | discarded
 *   discarded → (terminal)
 *   superseded → (terminal)
 */
const VALID_TRANSITIONS: Record<ReviewState, ReviewState[]> = {
  draft: ['reviewed', 'discarded'],
  reviewed: ['approved_for_use', 'discarded', 'draft'],
  approved_for_use: ['superseded', 'discarded'],
  discarded: [],
  superseded: [],
};

// =====================================================================
// State Machine API
// =====================================================================

/**
 * Check whether a state transition is valid.
 *
 * @param from - The current review state.
 * @param to - The desired next state.
 * @returns True if the transition is allowed.
 */
export function canTransition(from: ReviewState, to: ReviewState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Get the list of valid next states from the current state.
 *
 * @param current - The current review state.
 * @returns Array of valid next states (empty for terminal states).
 */
export function getValidTransitions(current: ReviewState): ReviewState[] {
  return [...(VALID_TRANSITIONS[current] ?? [])];
}

/**
 * Check if a state is terminal (no further transitions allowed).
 *
 * @param state - The review state to check.
 * @returns True if the state is terminal.
 */
export function isTerminal(state: ReviewState): boolean {
  return (VALID_TRANSITIONS[state] ?? []).length === 0;
}

/**
 * Attempt a state transition. Returns the new state or throws on invalid transition.
 *
 * @param from - The current review state.
 * @param to - The desired next state.
 * @returns The new state (same as `to` if transition is valid).
 * @throws Error if the transition is not allowed.
 */
export function transition(from: ReviewState, to: ReviewState): ReviewState {
  if (!canTransition(from, to)) {
    const allowed = getValidTransitions(from);
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)';
    throw new Error(
      `Invalid review state transition: "${from}" → "${to}". Allowed transitions from "${from}": ${allowedStr}`,
    );
  }
  return to;
}
