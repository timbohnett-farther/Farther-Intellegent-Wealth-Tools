/**
 * Tests for copilot/review-machine.ts — valid/invalid state transitions.
 */

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getValidTransitions,
  isTerminal,
  transition,
} from '../review-machine';
import type { ReviewState } from '../types';

// =====================================================================
// canTransition()
// =====================================================================

describe('canTransition()', () => {
  it('allows draft → reviewed', () => {
    expect(canTransition('draft', 'reviewed')).toBe(true);
  });

  it('allows draft → discarded', () => {
    expect(canTransition('draft', 'discarded')).toBe(true);
  });

  it('disallows draft → approved_for_use (must go through reviewed first)', () => {
    expect(canTransition('draft', 'approved_for_use')).toBe(false);
  });

  it('allows reviewed → approved_for_use', () => {
    expect(canTransition('reviewed', 'approved_for_use')).toBe(true);
  });

  it('allows reviewed → discarded', () => {
    expect(canTransition('reviewed', 'discarded')).toBe(true);
  });

  it('allows reviewed → draft (send back)', () => {
    expect(canTransition('reviewed', 'draft')).toBe(true);
  });

  it('allows approved_for_use → superseded', () => {
    expect(canTransition('approved_for_use', 'superseded')).toBe(true);
  });

  it('allows approved_for_use → discarded', () => {
    expect(canTransition('approved_for_use', 'discarded')).toBe(true);
  });

  it('disallows transitions from discarded (terminal)', () => {
    expect(canTransition('discarded', 'draft')).toBe(false);
    expect(canTransition('discarded', 'reviewed')).toBe(false);
    expect(canTransition('discarded', 'approved_for_use')).toBe(false);
  });

  it('disallows transitions from superseded (terminal)', () => {
    expect(canTransition('superseded', 'draft')).toBe(false);
    expect(canTransition('superseded', 'reviewed')).toBe(false);
  });
});

// =====================================================================
// getValidTransitions()
// =====================================================================

describe('getValidTransitions()', () => {
  it('returns valid transitions for draft', () => {
    const transitions = getValidTransitions('draft');
    expect(transitions).toContain('reviewed');
    expect(transitions).toContain('discarded');
    expect(transitions).not.toContain('approved_for_use');
  });

  it('returns empty array for terminal states', () => {
    expect(getValidTransitions('discarded')).toEqual([]);
    expect(getValidTransitions('superseded')).toEqual([]);
  });

  it('returns a copy (not mutable reference)', () => {
    const transitions = getValidTransitions('draft');
    transitions.push('superseded' as ReviewState);
    expect(getValidTransitions('draft')).not.toContain('superseded');
  });
});

// =====================================================================
// isTerminal()
// =====================================================================

describe('isTerminal()', () => {
  it('discarded is terminal', () => {
    expect(isTerminal('discarded')).toBe(true);
  });

  it('superseded is terminal', () => {
    expect(isTerminal('superseded')).toBe(true);
  });

  it('draft is not terminal', () => {
    expect(isTerminal('draft')).toBe(false);
  });

  it('reviewed is not terminal', () => {
    expect(isTerminal('reviewed')).toBe(false);
  });

  it('approved_for_use is not terminal', () => {
    expect(isTerminal('approved_for_use')).toBe(false);
  });
});

// =====================================================================
// transition()
// =====================================================================

describe('transition()', () => {
  it('returns the new state for valid transitions', () => {
    expect(transition('draft', 'reviewed')).toBe('reviewed');
    expect(transition('reviewed', 'approved_for_use')).toBe('approved_for_use');
  });

  it('throws for invalid transitions', () => {
    expect(() => transition('draft', 'approved_for_use')).toThrow(
      'Invalid review state transition',
    );
  });

  it('throws for terminal state transitions', () => {
    expect(() => transition('discarded', 'draft')).toThrow(
      'terminal state',
    );
  });

  it('error message includes allowed transitions', () => {
    try {
      transition('draft', 'superseded');
    } catch (err) {
      expect((err as Error).message).toContain('reviewed');
      expect((err as Error).message).toContain('discarded');
    }
  });
});
