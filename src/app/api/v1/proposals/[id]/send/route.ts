// =============================================================================
// POST /api/v1/proposals/:id/send  - Send proposal to recipients
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  SendProposalRequest,
  ProposalTracking,
  DeliveryMethod,
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

const VALID_DELIVERY_METHODS: DeliveryMethod[] = ['EMAIL', 'PORTAL_UPLOAD', 'IN_PERSON', 'DOWNLOAD'];

// ==================== POST ====================

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:write')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to send proposals.', 403, { requiredPermission: 'households:write' });
  }

  // ---------- Fetch proposal ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // ---------- Check if already sent ----------
  if (proposal.status === 'SENT' || proposal.status === 'VIEWED' || proposal.status === 'ACCEPTED') {
    return errorResponse('CONFLICT', 'Proposal has already been sent.', 400, {
      currentStatus: proposal.status,
      sentAt: proposal.sentAt,
    });
  }

  // ---------- Parse body ----------
  let body: SendProposalRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
    errors.recipients = 'recipients is required and must be a non-empty array of email addresses.';
  } else {
    for (let i = 0; i < body.recipients.length; i++) {
      const email = body.recipients[i];
      if (typeof email !== 'string' || !email.includes('@')) {
        errors[`recipients[${i}]`] = 'Each recipient must be a valid email address.';
      }
    }
  }

  if (!body.deliveryMethod || !VALID_DELIVERY_METHODS.includes(body.deliveryMethod)) {
    errors.deliveryMethod = `deliveryMethod must be one of: ${VALID_DELIVERY_METHODS.join(', ')}.`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse('VALIDATION_ERROR', 'One or more fields failed validation.', 400, errors);
  }

  // ---------- Create tracking record ----------
  const now = new Date().toISOString();
  const tracking: ProposalTracking = {
    sentAt: now,
    sentTo: body.recipients,
    deliveryMethod: body.deliveryMethod,
    opens: [],
    firstOpenedAt: null,
    totalOpenCount: 0,
    mostViewedSection: null,
    outcome: 'PENDING',
    outcomeDate: null,
    aumWon: null,
    declineReason: null,
  };

  // ---------- Update proposal ----------
  proposal.status = 'SENT';
  proposal.sentAt = now;
  proposal.tracking = tracking;
  proposal.updatedAt = now;

  proposalStore.upsertProposal(proposal);
  proposalStore.setTracking(id, tracking);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'export.pdf',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      clientName: proposal.clientName,
      recipients: body.recipients,
      deliveryMethod: body.deliveryMethod,
      message: body.message ?? null,
      action: 'proposal.send',
    },
  });

  return NextResponse.json({
    proposalId: id,
    status: proposal.status,
    sentAt: proposal.sentAt,
    tracking,
    message: `Proposal sent to ${body.recipients.length} recipient(s) via ${body.deliveryMethod}.`,
  }, { status: 201 });
}
