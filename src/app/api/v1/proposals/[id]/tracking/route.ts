// =============================================================================
// GET  /api/v1/proposals/:id/tracking  - Get proposal tracking data
// POST /api/v1/proposals/:id/tracking  - Record a proposal open/view event
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ProposalTracking,
  ProposalOutcome,
  ErrorEnvelope,
} from '@/lib/proposal-engine/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

// ==================== Helpers ====================

function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}): NextResponse {
  const err: ErrorEnvelope = {
    error: { code, message, details, correlationId: crypto.randomUUID() },
  };
  return NextResponse.json(err, { status });
}

type RouteParams = { params: Promise<{ id: string }> };

// ==================== GET ====================

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view tracking data.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  const tracking = proposalStore.getTracking(id);
  if (!tracking) {
    return errorResponse('NOT_FOUND', `Tracking data not found for proposal "${id}". Proposal may not have been sent yet.`, 404, {
      resource: 'ProposalTracking',
      proposalId: id,
    });
  }

  return NextResponse.json(tracking);
}

// ==================== POST ====================

interface RecordOpenRequest {
  /** Duration of viewing session in milliseconds. */
  durationMs?: number;
  /** 0-indexed page numbers that were viewed. */
  pagesViewed?: number[];
  /** Outcome update (e.g., client accepted). */
  outcome?: ProposalOutcome;
  /** AUM won if accepted. */
  aumWon?: number;
  /** Reason for decline if declined. */
  declineReason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth (relaxed -- tracking events may come from tracking pixel) ----------
  // Allow unauthenticated tracking pixel hits but verify proposal exists
  const auth = parseAuthContext(request.headers.get('authorization'));

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // If authenticated, verify firm access
  if (auth && proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  const tracking = proposalStore.getTracking(id);
  if (!tracking) {
    return errorResponse('NOT_FOUND', `Tracking not found for proposal "${id}". Proposal may not have been sent yet.`, 404, {
      resource: 'ProposalTracking',
      proposalId: id,
    });
  }

  // ---------- Parse body ----------
  let body: RecordOpenRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Record open event ----------
  const now = new Date().toISOString();

  tracking.opens.push({
    openedAt: now,
    durationMs: body.durationMs ?? 0,
    pagesViewed: body.pagesViewed ?? [],
  });

  tracking.totalOpenCount = tracking.opens.length;

  if (!tracking.firstOpenedAt) {
    tracking.firstOpenedAt = now;
    // Update proposal status to VIEWED
    proposal.status = 'VIEWED';
  }

  // Most viewed section heuristic: if pages are provided, pick the one with most views
  if (body.pagesViewed && body.pagesViewed.length > 0) {
    // Map page numbers to section keys as a rough heuristic
    const sectionKeys = proposal.sections
      .filter(s => s.included)
      .sort((a, b) => a.order - b.order);
    const mostViewedIndex = body.pagesViewed[Math.floor(body.pagesViewed.length / 2)];
    if (mostViewedIndex < sectionKeys.length) {
      tracking.mostViewedSection = sectionKeys[mostViewedIndex].key;
    }
  }

  // ---------- Handle outcome update ----------
  if (body.outcome) {
    const validOutcomes: ProposalOutcome[] = ['PENDING', 'MEETING_SCHEDULED', 'ACCEPTED', 'DECLINED', 'EXPIRED'];
    if (validOutcomes.includes(body.outcome)) {
      tracking.outcome = body.outcome;
      tracking.outcomeDate = now;

      if (body.outcome === 'ACCEPTED') {
        proposal.status = 'ACCEPTED';
        if (body.aumWon !== undefined) {
          tracking.aumWon = body.aumWon as any;
        }
      } else if (body.outcome === 'DECLINED') {
        proposal.status = 'DECLINED';
        if (body.declineReason) {
          tracking.declineReason = body.declineReason;
        }
      } else if (body.outcome === 'EXPIRED') {
        proposal.status = 'EXPIRED';
      }
    }
  }

  // ---------- Persist ----------
  proposal.tracking = tracking;
  proposal.updatedAt = now;
  proposalStore.upsertProposal(proposal);
  proposalStore.setTracking(id, tracking);

  // ---------- Audit ----------
  if (auth) {
    auditService.emit({
      firmId: auth.firmId,
      userId: auth.userId,
      eventKey: 'scenario.update',
      ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
      payload: {
        proposalId: id,
        eventType: body.outcome ? `outcome.${body.outcome}` : 'proposal_viewed',
        totalOpenCount: tracking.totalOpenCount,
        action: 'proposal.tracking',
      },
    });
  }

  return NextResponse.json(tracking, { status: 201 });
}
