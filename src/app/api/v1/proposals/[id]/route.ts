// =============================================================================
// GET    /api/v1/proposals/:id  - Get full proposal detail
// PATCH  /api/v1/proposals/:id  - Update proposal (wizard progress, status, data)
// DELETE /api/v1/proposals/:id  - Delete/archive proposal
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  UpdateProposalRequest,
  ProposalStatus,
  ErrorEnvelope,
} from '@/lib/proposal-engine/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { getModelById } from '@/lib/proposal-engine/model-library';
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

const VALID_STATUSES: ProposalStatus[] = [
  'DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED',
];

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
    return errorResponse('FORBIDDEN', 'You do not have permission to view proposals.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // Verify firm access
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  return NextResponse.json(proposal);
}

// ==================== PATCH ====================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:write')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to update proposals.', 403, { requiredPermission: 'households:write' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // ---------- Parse body ----------
  let body: UpdateProposalRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate & apply updates ----------
  const errors: Record<string, string> = {};

  if (body.wizardStep !== undefined) {
    if (typeof body.wizardStep !== 'number' || body.wizardStep < 1 || body.wizardStep > 6) {
      errors.wizardStep = 'wizardStep must be a number between 1 and 6.';
    } else {
      proposal.wizardStep = body.wizardStep;
    }
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      errors.status = `status must be one of: ${VALID_STATUSES.join(', ')}.`;
    } else {
      proposal.status = body.status;
    }
  }

  if (body.currentPortfolio !== undefined) {
    proposal.currentPortfolio = body.currentPortfolio;
  }

  if (body.riskProfile !== undefined) {
    proposal.riskProfile = body.riskProfile;
  }

  if (body.proposedModelId !== undefined) {
    const model = getModelById(body.proposedModelId);
    if (!model) {
      errors.proposedModelId = `Investment model "${body.proposedModelId}" not found.`;
    } else {
      proposal.proposedModel = model;
    }
  }

  if (body.customAllocations !== undefined) {
    proposal.customAllocations = body.customAllocations;
  }

  if (body.sections !== undefined) {
    proposal.sections = body.sections;
  }

  if (body.templateId !== undefined) {
    proposal.templateId = body.templateId;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse('VALIDATION_ERROR', 'One or more fields failed validation.', 400, errors);
  }

  // ---------- Persist ----------
  proposal.updatedAt = new Date().toISOString();
  proposalStore.upsertProposal(proposal);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'scenario.update',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      updatedFields: Object.keys(body),
      action: 'proposal.update',
    },
  });

  return NextResponse.json(proposal);
}

// ==================== DELETE ====================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:write')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to delete proposals.', 403, { requiredPermission: 'households:write' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // ---------- Delete ----------
  proposalStore.deleteProposal(id);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'scenario.delete',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      clientName: proposal.clientName,
      action: 'proposal.delete',
    },
  });

  return NextResponse.json({ deleted: true, proposalId: id });
}
