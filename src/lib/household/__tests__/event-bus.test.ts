/**
 * Farther Unified Platform — Event Bus Tests
 *
 * Tests for the household event bus covering:
 * - Publish and subscribe
 * - Wildcard subscriptions
 * - Unsubscribe
 * - Event log / replay
 * - Correlation IDs
 * - Error handling in handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../event-bus';
import type { HouseholdEvent, HouseholdEventType } from '../event-bus';

// =============================================================================
// Helper: Build a valid publish params object
// =============================================================================

function makePublishParams(
  overrides: Partial<{
    eventType: HouseholdEventType;
    householdId: string;
    firmId: string;
    advisorId: string;
    source: 'ADVISOR' | 'CUSTODIAN' | 'CLIENT_PORTAL' | 'SYSTEM' | 'IMPORT';
    actor: { userId: string; role: string };
    payload: unknown;
    metadata: Partial<{
      correlationId: string;
      causationId: string | null;
      version: number;
      retryCount: number;
    }>;
  }> = {},
) {
  return {
    eventType: overrides.eventType ?? 'household.created' as HouseholdEventType,
    householdId: overrides.householdId ?? 'hh-001',
    firmId: overrides.firmId ?? 'firm-001',
    advisorId: overrides.advisorId ?? 'adv-001',
    source: overrides.source ?? ('ADVISOR' as const),
    actor: overrides.actor ?? { userId: 'user-001', role: 'ADVISOR' },
    payload: overrides.payload ?? {},
    ...(overrides.metadata ? { metadata: overrides.metadata } : {}),
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  eventBus.reset();
});

// =============================================================================
// Publish & Subscribe
// =============================================================================

describe('Publish & Subscribe', () => {
  it('delivers events to subscribers', () => {
    const received: HouseholdEvent[] = [];
    eventBus.subscribe('household.created', (event) => {
      received.push(event);
    });

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      householdId: 'hh-001',
      payload: { name: 'Test Family' },
    }));

    expect(received.length).toBe(1);
    expect(received[0].eventType).toBe('household.created');
    expect(received[0].householdId).toBe('hh-001');
  });

  it('delivers events to multiple subscribers', () => {
    let count1 = 0;
    let count2 = 0;

    eventBus.subscribe('household.updated', () => { count1++; });
    eventBus.subscribe('household.updated', () => { count2++; });

    eventBus.publish(makePublishParams({
      eventType: 'household.updated',
      payload: { name: 'Updated' },
    }));

    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  it('does not deliver events to unrelated subscribers', () => {
    let called = false;
    eventBus.subscribe('household.deleted', () => { called = true; });

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
    }));

    expect(called).toBe(false);
  });

  it('handles publishing with no subscribers', () => {
    // Should not throw
    expect(() => {
      eventBus.publish(makePublishParams({
        eventType: 'household.created',
      }));
    }).not.toThrow();
  });
});

// =============================================================================
// Wildcard Subscriptions
// =============================================================================

describe('Wildcard subscriptions', () => {
  it('receives all events with wildcard subscription', () => {
    const received: HouseholdEvent[] = [];
    eventBus.subscribe('*', (event) => {
      received.push(event);
    });

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      householdId: 'hh-001',
    }));

    eventBus.publish(makePublishParams({
      eventType: 'household.updated',
      householdId: 'hh-002',
    }));

    eventBus.publish(makePublishParams({
      eventType: 'member.added',
      householdId: 'hh-001',
    }));

    expect(received.length).toBe(3);
  });
});

// =============================================================================
// Unsubscribe
// =============================================================================

describe('Unsubscribe', () => {
  it('stops receiving events after unsubscribe', () => {
    let count = 0;
    const unsub = eventBus.subscribe('household.created', () => {
      count++;
    });

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      householdId: 'hh-001',
    }));
    expect(count).toBe(1);

    unsub();

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      householdId: 'hh-002',
    }));
    expect(count).toBe(1); // No change
  });

  it('only unsubscribes the specific handler', () => {
    let count1 = 0;
    let count2 = 0;

    const unsub1 = eventBus.subscribe('household.updated', () => { count1++; });
    eventBus.subscribe('household.updated', () => { count2++; });

    unsub1();

    eventBus.publish(makePublishParams({
      eventType: 'household.updated',
    }));

    expect(count1).toBe(0);
    expect(count2).toBe(1);
  });
});

// =============================================================================
// Event Log
// =============================================================================

describe('Event log', () => {
  it('records events in the log', () => {
    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      payload: { name: 'Test' },
    }));

    eventBus.publish(makePublishParams({
      eventType: 'household.updated',
      payload: { name: 'Updated' },
    }));

    const log = eventBus.getEventLog();
    expect(log.length).toBe(2);
    expect(log[0].eventType).toBe('household.created');
    expect(log[1].eventType).toBe('household.updated');
  });

  it('filters log by event type', () => {
    eventBus.publish(makePublishParams({ eventType: 'household.created', householdId: 'hh-001' }));
    eventBus.publish(makePublishParams({ eventType: 'household.deleted', householdId: 'hh-002' }));
    eventBus.publish(makePublishParams({ eventType: 'household.created', householdId: 'hh-003' }));

    const filtered = eventBus.getEventsByType('household.created');
    expect(filtered.length).toBe(2);
  });

  it('filters log by household ID', () => {
    eventBus.publish(makePublishParams({ eventType: 'household.created', householdId: 'hh-001' }));
    eventBus.publish(makePublishParams({ eventType: 'member.added', householdId: 'hh-001' }));
    eventBus.publish(makePublishParams({ eventType: 'household.created', householdId: 'hh-002' }));

    const filtered = eventBus.getEventsForHousehold('hh-001');
    expect(filtered.length).toBe(2);
  });

  it('clears the event log', () => {
    eventBus.publish(makePublishParams({ eventType: 'household.created' }));

    expect(eventBus.getEventLog().length).toBe(1);
    eventBus.clearEventLog();
    expect(eventBus.getEventLog().length).toBe(0);
  });
});

// =============================================================================
// Event Replay
// =============================================================================

describe('Event replay', () => {
  it('replays events for a household to a handler', () => {
    // Publish events first (no subscriber yet for these)
    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      householdId: 'hh-001',
      payload: { name: 'First' },
    }));
    eventBus.publish(makePublishParams({
      eventType: 'household.updated',
      householdId: 'hh-001',
      payload: { name: 'Updated' },
    }));

    // Replay to a new handler
    const replayed: HouseholdEvent[] = [];
    eventBus.replayEvents('hh-001', (event) => {
      replayed.push(event);
    });

    expect(replayed.length).toBe(2);
    expect(replayed[0].metadata.correlationId).toBeDefined();
    expect(replayed[1].metadata.correlationId).toBeDefined();
  });

  it('replays only events of a specific type', () => {
    eventBus.publish(makePublishParams({ eventType: 'household.created', householdId: 'hh-001' }));
    eventBus.publish(makePublishParams({ eventType: 'household.deleted', householdId: 'hh-002' }));

    const replayed: HouseholdEvent[] = [];
    eventBus.replayEventsByType('household.created', (event) => {
      replayed.push(event);
    });

    expect(replayed.length).toBe(1);
    expect(replayed[0].eventType).toBe('household.created');
  });
});

// =============================================================================
// Correlation IDs
// =============================================================================

describe('Correlation IDs', () => {
  it('preserves correlation IDs on events', () => {
    const received: HouseholdEvent[] = [];
    eventBus.subscribe('household.created', (event) => {
      received.push(event);
    });

    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      metadata: { correlationId: 'my-custom-correlation-id' },
    }));

    expect(received[0].metadata.correlationId).toBe('my-custom-correlation-id');
  });

  it('events in the log retain correlation IDs', () => {
    eventBus.publish(makePublishParams({
      eventType: 'household.created',
      metadata: { correlationId: 'log-correlation-001' },
    }));

    const log = eventBus.getEventLog();
    expect(log[0].metadata.correlationId).toBe('log-correlation-001');
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Error handling in handlers', () => {
  it('continues delivering to other handlers when one throws', () => {
    let secondCalled = false;

    eventBus.subscribe('household.created', () => {
      throw new Error('Handler error');
    });

    eventBus.subscribe('household.created', () => {
      secondCalled = true;
    });

    // Should not throw to the publisher
    expect(() => {
      eventBus.publish(makePublishParams({ eventType: 'household.created' }));
    }).not.toThrow();

    expect(secondCalled).toBe(true);
  });

  it('still logs events even when handlers throw', () => {
    eventBus.subscribe('household.created', () => {
      throw new Error('Handler error');
    });

    eventBus.publish(makePublishParams({ eventType: 'household.created' }));

    expect(eventBus.getEventLog().length).toBe(1);
  });
});
