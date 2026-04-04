/**
 * AX Command Center Event Feed — Proposal Lifecycle Events
 *
 * Sends proposal lifecycle events to the AX Command Center for real-time
 * dashboard tracking. Events include proposal creation, analysis completion,
 * PDF generation, client views, and final outcomes.
 *
 * INTEGRATION:
 * POST events to AX_WEBHOOK_URL with Bearer token from AX_API_TOKEN.
 * Rate limit: max 10 events/second (enforced client-side).
 *
 * @module proposal-engine/integrations/ax-feed
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// ── Configuration ────────────────────────────────────────────────────────────

const AX_WEBHOOK_URL = process.env.AX_WEBHOOK_URL ?? '';
const AX_API_TOKEN = process.env.AX_API_TOKEN ?? '';
const REQUEST_TIMEOUT_MS = 10_000; // 10s timeout for webhook delivery
const RATE_LIMIT_WINDOW_MS = 1_000; // 1 second window
const RATE_LIMIT_MAX_EVENTS = 10; // max 10 events per second

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Proposal lifecycle event to send to AX Command Center.
 */
export interface ProposalEvent {
  /** Type of lifecycle event. */
  eventType:
    | 'PROPOSAL_CREATED'
    | 'PROPOSAL_UPDATED'
    | 'PROPOSAL_SENT'
    | 'PROPOSAL_VIEWED'
    | 'PROPOSAL_ACCEPTED'
    | 'PROPOSAL_DECLINED'
    | 'ANALYSIS_COMPLETED'
    | 'PDF_GENERATED';
  /** UUID of the proposal. */
  proposalId: string;
  /** UUID of the advisor who created the proposal. */
  advisorId: string;
  /** Client display name. */
  clientName: string;
  /** Total assets in scope for this proposal (in whole dollars). */
  assetsInScope?: number;
  /** Current lifecycle status (e.g., 'DRAFT', 'SENT', 'ACCEPTED'). */
  status?: string;
  /** Additional event-specific metadata. */
  metadata?: Record<string, string | number | boolean>;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: string;
}

/**
 * Result of sending an event to AX.
 */
export interface SendEventResult {
  success: boolean;
  error?: string;
}

/**
 * Result of batch-sending events to AX.
 */
export interface BatchSendResult {
  sent: number;
  failed: number;
  errors: string[];
}

// ── Rate Limiting ────────────────────────────────────────────────────────────

let eventQueue: number[] = []; // Timestamps of recent events (within window)

/**
 * Checks if sending an event now would exceed the rate limit.
 * Cleans up stale timestamps outside the rate limit window.
 */
function isRateLimited(): boolean {
  const now = Date.now();
  // Remove events outside the time window
  eventQueue = eventQueue.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  return eventQueue.length >= RATE_LIMIT_MAX_EVENTS;
}

/**
 * Records a new event timestamp for rate limiting.
 */
function recordEvent(): void {
  eventQueue.push(Date.now());
}

// ── Event Sending ────────────────────────────────────────────────────────────

/**
 * Sends a single proposal lifecycle event to the AX Command Center.
 *
 * Validates environment configuration and enforces rate limits.
 * If the webhook URL or API token is missing, logs a warning and
 * returns success: false without throwing.
 *
 * @param params - Proposal event to send
 * @returns Result indicating success or error
 *
 * @example
 * ```typescript
 * await sendProposalEvent({
 *   eventType: 'PROPOSAL_SENT',
 *   proposalId: 'abc123',
 *   advisorId: 'advisor-456',
 *   clientName: 'John Smith',
 *   assetsInScope: 1500000,
 *   status: 'SENT',
 *   timestamp: new Date().toISOString(),
 * });
 * ```
 */
export async function sendProposalEvent(params: ProposalEvent): Promise<SendEventResult> {
  // Check environment configuration
  if (!AX_WEBHOOK_URL || !AX_API_TOKEN) {
    console.warn('[AX Feed] Missing AX_WEBHOOK_URL or AX_API_TOKEN — event not sent');
    return { success: false, error: 'Missing environment configuration' };
  }

  // Enforce rate limit
  if (isRateLimited()) {
    console.warn('[AX Feed] Rate limit exceeded — event not sent');
    return { success: false, error: 'Rate limit exceeded (max 10 events/second)' };
  }

  try {
    const response = await fetchWithTimeout(
      AX_WEBHOOK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AX_API_TOKEN}`,
        },
        body: JSON.stringify(params),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      console.error(`[AX Feed] Webhook returned ${response.status}: ${errorBody}`);
      return {
        success: false,
        error: `AX webhook failed with status ${response.status}`
      };
    }

    // Record successful send for rate limiting
    recordEvent();

    console.log(`[AX Feed] Event sent: ${params.eventType} for proposal ${params.proposalId}`);
    return { success: true };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[AX Feed] Error sending event: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sends multiple proposal events in batch.
 *
 * Sends events sequentially to respect rate limiting.
 * Continues on individual failures and returns a summary.
 *
 * @param events - Array of proposal events to send
 * @returns Summary of sent and failed events
 *
 * @example
 * ```typescript
 * const result = await batchSendEvents([
 *   { eventType: 'PROPOSAL_CREATED', proposalId: 'abc', ... },
 *   { eventType: 'ANALYSIS_COMPLETED', proposalId: 'def', ... },
 * ]);
 * console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
 * ```
 */
export async function batchSendEvents(events: ProposalEvent[]): Promise<BatchSendResult> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const event of events) {
    const result = await sendProposalEvent(event);

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${event.eventType} (${event.proposalId}): ${result.error}`);
      }
    }

    // Small delay between batch sends to avoid bursting
    if (events.indexOf(event) < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[AX Feed] Batch complete: ${sent} sent, ${failed} failed`);
  return { sent, failed, errors };
}
