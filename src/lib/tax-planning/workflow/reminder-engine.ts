// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Reminder Engine
// =============================================================================
//
// Manages reminder records and escalations for tasks, workflows, and CPA requests.
// =============================================================================

import { randomUUID } from 'crypto';
import { store } from '../store';
import type { ReminderRecord, ReminderType, EscalationRecord, EscalationType } from './types';

// =====================================================================
// Reminder Management
// =====================================================================

/**
 * Creates a new reminder record.
 *
 * @param objectType - The type of object being reminded about.
 * @param objectId - The ID of the object being reminded about.
 * @param reminderType - The type of reminder.
 * @param scheduledFor - ISO 8601 timestamp when reminder should fire.
 * @returns The created reminder record.
 */
export function createReminder(
  objectType: 'task' | 'workflow' | 'cpa_request',
  objectId: string,
  reminderType: ReminderType,
  scheduledFor: string
): ReminderRecord {
  const now = new Date().toISOString();
  const reminder: ReminderRecord = {
    reminderId: randomUUID(),
    objectType,
    objectId,
    reminderType,
    scheduledFor,
    sent: false,
    createdAt: now,
  };

  store.upsertReminderRecord(reminder);
  return reminder;
}

/**
 * Cancels a reminder by marking it as sent (even if not sent).
 *
 * @param reminderId - The reminder ID to cancel.
 */
export function cancelReminder(reminderId: string): void {
  const existing = store.getReminderRecord(reminderId);
  if (!existing) {
    throw new Error(`Reminder "${reminderId}" not found.`);
  }

  const updated: ReminderRecord = {
    ...existing,
    sent: true,
    sentAt: new Date().toISOString(),
  };

  store.upsertReminderRecord(updated);
}

/**
 * Returns all active (not yet sent) reminders for a given object.
 *
 * @param objectType - The type of object.
 * @param objectId - The ID of the object.
 * @returns Array of active reminder records.
 */
export function getActiveReminders(
  objectType: 'task' | 'workflow' | 'cpa_request',
  objectId: string
): ReminderRecord[] {
  return store
    .listReminderRecords()
    .filter((r) => r.objectType === objectType && r.objectId === objectId && !r.sent);
}

// =====================================================================
// Escalation Management
// =====================================================================

/**
 * Creates a new escalation record.
 *
 * @param objectType - The type of object being escalated.
 * @param objectId - The ID of the object being escalated.
 * @param escalationType - The type of escalation.
 * @param notifiedUserId - Optional user ID to notify.
 * @returns The created escalation record.
 */
export function createEscalation(
  objectType: 'task' | 'workflow' | 'cpa_request',
  objectId: string,
  escalationType: EscalationType,
  notifiedUserId?: string
): EscalationRecord {
  const now = new Date().toISOString();
  const escalation: EscalationRecord = {
    escalationId: randomUUID(),
    objectType,
    objectId,
    escalationType,
    escalatedAt: now,
    notifiedUserId,
    createdAt: now,
  };

  store.upsertEscalationRecord(escalation);
  return escalation;
}
