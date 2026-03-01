// =============================================================================
// GET  /api/v1/pulse/alerts       — List/filter alerts
// POST /api/v1/pulse/alerts       — Alert actions (acknowledge, resolve, snooze, dismiss)
//
// Query parameters for GET:
//   ?firmId=xxx                     (required)
//   &advisorId=yyy                  (optional — filter by advisor)
//   &category=RETENTION             (optional — filter by alert category)
//   &priority=high                  (optional — filter by priority)
//
// POST body for actions:
//   { action: "acknowledge" | "resolve" | "snooze" | "dismiss",
//     alertId: "...",
//     resolution?: "...",
//     snoozeDuration?: 24 }
//
// @module api/v1/pulse/alerts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  dismissAlert,
  getAlertSummary,
} from '@/lib/practice-analytics/alert-engine';
import { firmId, advisorId, alertId as toAlertId } from '@/lib/practice-analytics/types';
import type { AlertCategory, AlertPriority } from '@/lib/practice-analytics/types';

// ==================== Helpers ====================

function errorResponse(
  code: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
        correlationId: crypto.randomUUID(),
      },
    },
    { status },
  );
}

const VALID_CATEGORIES: AlertCategory[] = [
  'RETENTION',
  'REVENUE',
  'COMPLIANCE',
  'PLANNING',
  'OPERATIONS',
  'GROWTH',
];

const VALID_PRIORITIES: AlertPriority[] = ['critical', 'high', 'normal', 'low'];

const VALID_ACTIONS = ['acknowledge', 'resolve', 'snooze', 'dismiss'] as const;
type AlertAction = typeof VALID_ACTIONS[number];

// ==================== GET ====================

/**
 * Returns filtered alerts for the given firm and optional advisor.
 * Includes an alert summary with counts by category and priority.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // ---------- Validate firmId ----------
  const firmIdParam = searchParams.get('firmId');
  if (!firmIdParam) {
    return errorResponse(
      'MISSING_PARAMETER',
      'Query parameter "firmId" is required.',
      400,
    );
  }
  const fId = firmId(firmIdParam);

  // ---------- Optional filters ----------
  const advisorIdParam = searchParams.get('advisorId') ?? undefined;
  const categoryParam = searchParams.get('category') ?? undefined;
  const priorityParam = searchParams.get('priority') ?? undefined;

  // Validate category
  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as AlertCategory)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Invalid category "${categoryParam}". Must be one of: ${VALID_CATEGORIES.join(', ')}.`,
      400,
    );
  }

  // Validate priority
  if (priorityParam && !VALID_PRIORITIES.includes(priorityParam as AlertPriority)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Invalid priority "${priorityParam}". Must be one of: ${VALID_PRIORITIES.join(', ')}.`,
      400,
    );
  }

  try {
    const aId = advisorIdParam ? advisorId(advisorIdParam) : undefined;
    const alerts = getActiveAlerts(fId, {
      advisorId: aId,
      category: categoryParam as AlertCategory | undefined,
      priority: priorityParam as AlertPriority | undefined,
    });

    const summary = getAlertSummary(alerts);

    return NextResponse.json({
      alerts,
      summary,
      total: alerts.length,
      filters: {
        firmId: firmIdParam,
        advisorId: advisorIdParam ?? null,
        category: categoryParam ?? null,
        priority: priorityParam ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching alerts.';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}

// ==================== POST ====================

/**
 * Handles alert management actions: acknowledge, resolve, snooze, dismiss.
 *
 * Expected body:
 * - action: "acknowledge" | "resolve" | "snooze" | "dismiss"
 * - alertId: string (required)
 * - resolution: string (optional, for resolve action)
 * - snoozeDuration: number (optional, hours to snooze — default 24)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Parse body ----------
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate action ----------
  const action = body.action as string | undefined;
  if (!action || !VALID_ACTIONS.includes(action as AlertAction)) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Field "action" is required and must be one of: ${VALID_ACTIONS.join(', ')}.`,
      400,
    );
  }

  // ---------- Validate alertId ----------
  const alertIdValue = body.alertId as string | undefined;
  if (!alertIdValue || typeof alertIdValue !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'Field "alertId" is required and must be a string.',
      400,
    );
  }

  // ---------- Execute action ----------
  try {
    switch (action as AlertAction) {
      case 'acknowledge': {
        const result = acknowledgeAlert(toAlertId(alertIdValue));
        return NextResponse.json({
          success: true,
          action: 'acknowledge',
          alert: result,
        });
      }

      case 'resolve': {
        const result = resolveAlert(toAlertId(alertIdValue));
        return NextResponse.json({
          success: true,
          action: 'resolve',
          alert: result,
        });
      }

      case 'snooze': {
        const snoozeDuration = typeof body.snoozeDuration === 'number'
          ? body.snoozeDuration
          : 24;
        if (snoozeDuration <= 0) {
          return errorResponse(
            'VALIDATION_ERROR',
            'Field "snoozeDuration" must be a positive number (hours).',
            400,
          );
        }
        const result = snoozeAlert(toAlertId(alertIdValue), snoozeDuration);
        return NextResponse.json({
          success: true,
          action: 'snooze',
          snoozeDuration,
          alert: result,
        });
      }

      case 'dismiss': {
        const result = dismissAlert(toAlertId(alertIdValue));
        return NextResponse.json({
          success: true,
          action: 'dismiss',
          alert: result,
        });
      }

      default:
        return errorResponse('INTERNAL_ERROR', 'Unexpected action value.', 500);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error processing alert action.';
    if (message.includes('not found')) {
      return errorResponse('NOT_FOUND', message, 404);
    }
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
}
