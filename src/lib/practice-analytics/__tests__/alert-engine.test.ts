/**
 * FP-Pulse — Alert Engine Tests
 *
 * Comprehensive tests for the alert rule evaluation and management engine:
 * - Alert rule definitions and structure
 * - Rule evaluation and alert generation
 * - Alert filtering (by category, priority, advisor)
 * - Alert lifecycle management (acknowledge, resolve, snooze, dismiss)
 * - Alert summary computation
 * - Notification routing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALERT_RULES,
  evaluateAlertRules,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  dismissAlert,
  getAlertSummary,
  routeAlertNotifications,
  resetAlertStore,
} from '../alert-engine';
import { firmId, advisorId, alertId } from '../types';
import type { AlertCategory, AlertPriority } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const DEMO_FIRM_ID = firmId('firm-001');
const DEMO_ADVISOR_ID = advisorId('adv-001');

// =============================================================================
// ALERT_RULES
// =============================================================================

describe('ALERT_RULES', () => {
  it('has 8 defined rules', () => {
    expect(ALERT_RULES).toHaveLength(8);
  });

  it('each rule has an id field', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('id');
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
    }
  });

  it('each rule has a name field', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('name');
      expect(typeof rule.name).toBe('string');
    }
  });

  it('each rule has a category field', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('category');
      expect(typeof rule.category).toBe('string');
    }
  });

  it('each rule has a priority field', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('priority');
      const validPriorities = ['critical', 'high', 'normal', 'low'];
      expect(validPriorities).toContain(rule.priority);
    }
  });

  it('each rule has a description field', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('description');
      expect(typeof rule.description).toBe('string');
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it('all rule IDs are unique', () => {
    const ids = ALERT_RULES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each rule has a channels array', () => {
    for (const rule of ALERT_RULES) {
      expect(rule).toHaveProperty('channels');
      expect(Array.isArray(rule.channels)).toBe(true);
      expect(rule.channels.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// evaluateAlertRules
// =============================================================================

describe('evaluateAlertRules', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('returns an array of alerts', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('each alert has an alertId field', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    for (const alert of alerts) {
      expect(alert).toHaveProperty('alertId');
      expect(typeof alert.alertId).toBe('string');
    }
  });

  it('each alert has a ruleId that references a valid rule', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const ruleIds = ALERT_RULES.map((r) => r.id);
    for (const alert of alerts) {
      expect(alert).toHaveProperty('ruleId');
      expect(ruleIds).toContain(alert.ruleId);
    }
  });

  it('each alert has proper structure with required fields', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    for (const alert of alerts) {
      expect(alert).toHaveProperty('alertId');
      expect(alert).toHaveProperty('ruleId');
      expect(alert).toHaveProperty('category');
      expect(alert).toHaveProperty('priority');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('status');
      expect(alert).toHaveProperty('createdAt');
    }
  });

  it('each alert has status set to ACTIVE initially', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    for (const alert of alerts) {
      expect(alert.status).toBe('ACTIVE');
    }
  });
});

// =============================================================================
// getActiveAlerts
// =============================================================================

describe('getActiveAlerts', () => {
  beforeEach(() => {
    resetAlertStore();
    // Ensure alerts are evaluated fresh
    evaluateAlertRules(DEMO_FIRM_ID);
  });

  it('returns alerts for the specified firm', () => {
    const alerts = getActiveAlerts(DEMO_FIRM_ID, {});
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('filters by category correctly', () => {
    const allAlerts = getActiveAlerts(DEMO_FIRM_ID, {});
    if (allAlerts.length > 0) {
      const category = allAlerts[0].category;
      const filtered = getActiveAlerts(DEMO_FIRM_ID, { category: category as AlertCategory });
      for (const alert of filtered) {
        expect(alert.category).toBe(category);
      }
    }
  });

  it('filters by priority correctly', () => {
    const allAlerts = getActiveAlerts(DEMO_FIRM_ID, {});
    if (allAlerts.length > 0) {
      const priority = allAlerts[0].priority;
      const filtered = getActiveAlerts(DEMO_FIRM_ID, { priority: priority as AlertPriority });
      for (const alert of filtered) {
        expect(alert.priority).toBe(priority);
      }
    }
  });

  it('filters by advisorId correctly', () => {
    const filtered = getActiveAlerts(DEMO_FIRM_ID, { advisorId: DEMO_ADVISOR_ID });
    // All returned alerts should belong to this advisor (or be null for ops alerts)
    for (const alert of filtered) {
      const isMatch = alert.advisorId === DEMO_ADVISOR_ID || alert.advisorId === null;
      expect(isMatch).toBe(true);
    }
  });
});

// =============================================================================
// acknowledgeAlert
// =============================================================================

describe('acknowledgeAlert', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('changes alert status to ACKNOWLEDGED', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToAck = alerts[0];
    const result = acknowledgeAlert(alertToAck.alertId);
    expect(result.status).toBe('ACKNOWLEDGED');
  });

  it('sets acknowledgedAt timestamp', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToAck = alerts[0];
    const result = acknowledgeAlert(alertToAck.alertId);
    expect(result.acknowledgedAt).toBeDefined();
    expect(typeof result.acknowledgedAt).toBe('string');
  });

  it('throws error for non-existent alert', () => {
    evaluateAlertRules(DEMO_FIRM_ID);
    expect(() => acknowledgeAlert(alertId('nonexistent-alert-id'))).toThrow();
  });
});

// =============================================================================
// resolveAlert
// =============================================================================

describe('resolveAlert', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('changes alert status to RESOLVED', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToResolve = alerts[0];
    const result = resolveAlert(alertToResolve.alertId);
    expect(result.status).toBe('RESOLVED');
  });

  it('sets resolvedAt timestamp', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToResolve = alerts[0];
    const result = resolveAlert(alertToResolve.alertId);
    expect(result.resolvedAt).toBeDefined();
    expect(typeof result.resolvedAt).toBe('string');
  });

  it('throws error for non-existent alert', () => {
    evaluateAlertRules(DEMO_FIRM_ID);
    expect(() => resolveAlert(alertId('nonexistent-alert-id'))).toThrow();
  });
});

// =============================================================================
// snoozeAlert
// =============================================================================

describe('snoozeAlert', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('changes alert status to SNOOZED', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToSnooze = alerts[0];
    const result = snoozeAlert(alertToSnooze.alertId, 7);
    expect(result.status).toBe('SNOOZED');
  });

  it('sets snoozedUntil to correct future time', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToSnooze = alerts[0];
    const before = Date.now();
    const result = snoozeAlert(alertToSnooze.alertId, 7);
    const snoozedUntilTime = new Date(result.snoozedUntil!).getTime();
    // Should be approximately 7 days in the future (allow 5 sec tolerance)
    const expected = before + 7 * 24 * 60 * 60 * 1000;
    expect(snoozedUntilTime).toBeGreaterThan(expected - 5000);
    expect(snoozedUntilTime).toBeLessThan(expected + 5000);
  });

  it('throws error for non-existent alert', () => {
    evaluateAlertRules(DEMO_FIRM_ID);
    expect(() => snoozeAlert(alertId('nonexistent-alert-id'), 4)).toThrow();
  });
});

// =============================================================================
// dismissAlert
// =============================================================================

describe('dismissAlert', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('changes alert status to DISMISSED', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const alertToDismiss = alerts[0];
    const result = dismissAlert(alertToDismiss.alertId);
    expect(result.status).toBe('DISMISSED');
  });

  it('throws error for non-existent alert', () => {
    evaluateAlertRules(DEMO_FIRM_ID);
    expect(() => dismissAlert(alertId('nonexistent-alert-id'))).toThrow();
  });
});

// =============================================================================
// getAlertSummary
// =============================================================================

describe('getAlertSummary', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('returns a valid summary object', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const summary = getAlertSummary(alerts);
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('object');
  });

  it('category counts are all non-negative', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const summary = getAlertSummary(alerts);
    for (const count of Object.values(summary)) {
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  it('category counts sum to total alerts passed in', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const summary = getAlertSummary(alerts);
    const catSum = Object.values(summary).reduce((a: number, b: number) => a + b, 0);
    expect(catSum).toBe(alerts.length);
  });

  it('has expected category keys', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    const summary = getAlertSummary(alerts);
    expect(summary).toHaveProperty('RETENTION');
    expect(summary).toHaveProperty('PLANNING');
    expect(summary).toHaveProperty('COMPLIANCE');
    expect(summary).toHaveProperty('REVENUE');
    expect(summary).toHaveProperty('OPERATIONS');
  });
});

// =============================================================================
// routeAlertNotifications
// =============================================================================

describe('routeAlertNotifications', () => {
  beforeEach(() => {
    resetAlertStore();
  });

  it('returns notification channels for generated alerts', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    if (alerts.length > 0) {
      const channels = routeAlertNotifications(alerts[0]);
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
    }
  });

  it('each channel is a valid AlertChannel string', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    if (alerts.length > 0) {
      const channels = routeAlertNotifications(alerts[0]);
      const validChannels = ['DASHBOARD', 'EMAIL', 'SLACK', 'HUBSPOT_TASK'];
      for (const ch of channels) {
        expect(validChannels).toContain(ch);
      }
    }
  });

  it('always includes DASHBOARD channel', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    if (alerts.length > 0) {
      const channels = routeAlertNotifications(alerts[0]);
      expect(channels).toContain('DASHBOARD');
    }
  });

  it('includes channels from the matching rule', () => {
    const alerts = evaluateAlertRules(DEMO_FIRM_ID);
    if (alerts.length > 0) {
      const alert = alerts[0];
      const rule = ALERT_RULES.find((r) => r.id === alert.ruleId);
      if (rule) {
        const channels = routeAlertNotifications(alert);
        for (const expectedChannel of rule.channels) {
          expect(channels).toContain(expectedChannel);
        }
      }
    }
  });
});
