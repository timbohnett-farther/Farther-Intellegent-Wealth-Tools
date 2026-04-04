/**
 * Client Portal Service — Shareable Link & Engagement Tracking
 *
 * Service layer for the interactive client-facing proposal portal.
 * Generates secure shareable links with token-based access control,
 * tracks client interactions (views, downloads, questions), and
 * provides analytics for advisor dashboards.
 *
 * @module proposal-engine/client/portal-service
 */

import { createHash, randomUUID } from 'crypto';
import type { MoneyCents } from '@/lib/proposal-engine/types';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Parameters for generating a shareable proposal link.
 */
export interface ShareLinkParams {
  /** UUID of the proposal to share. */
  proposalId: string;
  /** Client email address for access tracking. */
  clientEmail: string;
  /** Number of days before the link expires (default: 30). */
  expiresInDays?: number;
  /** Whether the client must authenticate to view (not implemented yet). */
  requireAuth?: boolean;
}

/**
 * Generated shareable link result.
 */
export interface ShareableLink {
  /** Full URL to the proposal portal. */
  url: string;
  /** Secure access token (UUID + SHA256 hash). */
  token: string;
  /** ISO 8601 timestamp when the link expires. */
  expiresAt: string;
  /** UUID of the proposal this link grants access to. */
  proposalId: string;
}

/**
 * Result of validating portal access via token.
 */
export interface PortalAccessResult {
  /** Whether the token is valid and not expired. */
  valid: boolean;
  /** Proposal ID if token is valid. */
  proposalId?: string;
  /** Client email if token is valid. */
  clientEmail?: string;
  /** Whether the token is expired (if invalid). */
  expired?: boolean;
}

/**
 * Client interaction event tracked in the portal.
 */
export interface PortalInteraction {
  /** Access token for the portal session. */
  token: string;
  /** Type of interaction. */
  eventType: 'VIEW' | 'DOWNLOAD' | 'QUESTION' | 'ACCEPT' | 'DECLINE';
  /** Section key or page viewed (for VIEW events). */
  pageViewed?: string;
  /** Session duration in milliseconds (for VIEW events). */
  durationMs?: number;
  /** Additional event metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated analytics for a proposal's portal activity.
 */
export interface PortalAnalytics {
  /** Total number of times the proposal was opened. */
  totalViews: number;
  /** Number of unique clients who viewed the proposal. */
  uniqueViewers: number;
  /** Average session duration in milliseconds. */
  avgDuration: number;
  /** Array of section keys viewed by the client. */
  pagesViewed: string[];
  /** ISO 8601 timestamp of most recent view. */
  lastViewed?: string;
  /** Array of client questions submitted via portal. */
  questions: string[];
}

// ── In-Memory Store (Production: Use Database) ──────────────────────────────

interface StoredLink {
  token: string;
  proposalId: string;
  clientEmail: string;
  expiresAt: string;
}

interface StoredInteraction {
  token: string;
  eventType: PortalInteraction['eventType'];
  pageViewed?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Token -> Link mapping
const linkStore = new Map<string, StoredLink>();

// ProposalId -> Interactions mapping
const interactionStore = new Map<string, StoredInteraction[]>();

// ── Link Generation ─────────────────────────────────────────────────────────

/**
 * Generates a secure shareable link for a proposal.
 *
 * Creates a cryptographically secure token (UUID + SHA256 hash) and
 * stores it in memory (production: database). The link expires after
 * the specified number of days (default: 30).
 *
 * @param params - Link generation parameters
 * @returns Shareable link with token and expiration
 *
 * @example
 * ```typescript
 * const link = await generateShareableLink({
 *   proposalId: 'prop-123',
 *   clientEmail: 'john@example.com',
 *   expiresInDays: 14,
 * });
 * console.log(link.url); // https://portal.farther.com/proposals/abc123xyz
 * ```
 */
export async function generateShareableLink(params: ShareLinkParams): Promise<ShareableLink> {
  const { proposalId, clientEmail, expiresInDays = 30, requireAuth = false } = params;

  // Generate secure token: UUID + SHA256 hash
  const uuid = randomUUID();
  const hash = createHash('sha256')
    .update(`${uuid}:${proposalId}:${clientEmail}:${Date.now()}`)
    .digest('hex');
  const token = `${uuid}-${hash.substring(0, 32)}`;

  // Calculate expiration
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  // Store in memory (production: persist to database)
  linkStore.set(token, {
    token,
    proposalId,
    clientEmail,
    expiresAt,
  });

  // Construct portal URL
  const baseUrl = process.env.NEXT_PUBLIC_PORTAL_BASE_URL ?? 'https://portal.farther.com';
  const url = `${baseUrl}/proposals/${token}`;

  console.log(`[Portal Service] Generated link for proposal ${proposalId}, expires ${expiresAt}`);

  return {
    url,
    token,
    expiresAt,
    proposalId,
  };
}

// ── Access Validation ───────────────────────────────────────────────────────

/**
 * Validates a portal access token.
 *
 * Checks if the token exists in the store and is not expired.
 * Returns the associated proposal ID and client email if valid.
 *
 * @param token - Access token from the shareable link
 * @returns Access validation result
 *
 * @example
 * ```typescript
 * const access = validatePortalAccess(token);
 * if (access.valid) {
 *   // Load proposal data for access.proposalId
 * } else if (access.expired) {
 *   // Show "link expired" message
 * } else {
 *   // Show 404 or "invalid link" message
 * }
 * ```
 */
export function validatePortalAccess(token: string): PortalAccessResult {
  const link = linkStore.get(token);

  if (!link) {
    console.warn(`[Portal Service] Invalid token: ${token}`);
    return { valid: false };
  }

  const now = new Date().toISOString();
  const expired = now > link.expiresAt;

  if (expired) {
    console.warn(`[Portal Service] Expired token: ${token}`);
    return { valid: false, expired: true };
  }

  return {
    valid: true,
    proposalId: link.proposalId,
    clientEmail: link.clientEmail,
  };
}

// ── Interaction Tracking ────────────────────────────────────────────────────

/**
 * Records a client interaction event in the portal.
 *
 * Tracks views, downloads, questions, acceptances, and declines.
 * Stores events in memory (production: database with proposal FK).
 *
 * @param params - Interaction event parameters
 *
 * @example
 * ```typescript
 * recordPortalInteraction({
 *   token: 'abc-xyz',
 *   eventType: 'VIEW',
 *   pageViewed: 'proposed_portfolio',
 *   durationMs: 45000,
 * });
 * ```
 */
export function recordPortalInteraction(params: PortalInteraction): void {
  const { token, eventType, pageViewed, durationMs, metadata } = params;

  const link = linkStore.get(token);
  if (!link) {
    console.warn(`[Portal Service] Cannot record interaction for invalid token: ${token}`);
    return;
  }

  const interaction: StoredInteraction = {
    token,
    eventType,
    pageViewed,
    durationMs,
    metadata,
    timestamp: new Date().toISOString(),
  };

  const existing = interactionStore.get(link.proposalId) ?? [];
  existing.push(interaction);
  interactionStore.set(link.proposalId, existing);

  console.log(`[Portal Service] Recorded ${eventType} for proposal ${link.proposalId}`);
}

// ── Analytics ───────────────────────────────────────────────────────────────

/**
 * Retrieves aggregated portal analytics for a proposal.
 *
 * Calculates total views, unique viewers, average duration,
 * pages viewed, last viewed timestamp, and questions submitted.
 *
 * @param proposalId - UUID of the proposal
 * @returns Portal analytics summary
 *
 * @example
 * ```typescript
 * const analytics = getPortalAnalytics('prop-123');
 * console.log(`Total views: ${analytics.totalViews}`);
 * console.log(`Avg duration: ${analytics.avgDuration / 1000}s`);
 * ```
 */
export function getPortalAnalytics(proposalId: string): PortalAnalytics {
  const interactions = interactionStore.get(proposalId) ?? [];

  const viewEvents = interactions.filter(i => i.eventType === 'VIEW');
  const questionEvents = interactions.filter(i => i.eventType === 'QUESTION');

  const uniqueTokens = new Set(viewEvents.map(i => i.token));
  const totalDuration = viewEvents.reduce((sum, i) => sum + (i.durationMs ?? 0), 0);
  const avgDuration = viewEvents.length > 0 ? totalDuration / viewEvents.length : 0;

  const pagesViewed = Array.from(
    new Set(viewEvents.map(i => i.pageViewed).filter(Boolean) as string[])
  );

  const lastViewed = viewEvents.length > 0
    ? viewEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp
    : undefined;

  const questions = questionEvents
    .map(i => i.metadata?.question as string)
    .filter(Boolean);

  return {
    totalViews: viewEvents.length,
    uniqueViewers: uniqueTokens.size,
    avgDuration,
    pagesViewed,
    lastViewed,
    questions,
  };
}
