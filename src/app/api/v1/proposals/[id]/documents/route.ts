export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/proposals/:id/documents  - Generate IPS and/or Reg BI documents
// GET  /api/v1/proposals/:id/documents  - Get cached document results
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ErrorEnvelope } from '@/lib/proposal-engine/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { generateIPS } from '@/lib/proposal-engine/documents/ips-generator';
import { generateRegBI } from '@/lib/proposal-engine/documents/regbi-generator';
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

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view documents.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  if (proposal.firmId !== auth.firmId) return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });

  return NextResponse.json({
    proposalId: id,
    ips: proposal.ips ?? null,
    regBI: proposal.regBI ?? null,
    ipsGenerated: proposal.ipsGenerated,
    regBIGenerated: proposal.regBIGenerated,
  });
}

// ==================== POST ====================

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'compute:run')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to generate documents.', 403, { requiredPermission: 'compute:run' });
  }

  // ---------- Fetch proposal ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  if (proposal.firmId !== auth.firmId) return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });

  // ---------- Parse body ----------
  let body: { includeIPS?: boolean; includeRegBI?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  const results: { ips?: any; regBI?: any } = {};

  // ---------- Generate IPS ----------
  if (body.includeIPS !== false) {
    if (!proposal.riskProfile) {
      return errorResponse('PRECONDITION_FAILED', 'Risk profile required to generate IPS.', 400, { missingStep: 'riskProfile' });
    }

    const ips = await generateIPS({
      proposalId: id,
      clientName: proposal.clientName,
      riskProfile: proposal.riskProfile,
      currentPortfolio: proposal.currentPortfolio ?? undefined,
      proposedModel: proposal.proposedModel ?? undefined,
    });

    proposal.ips = ips;
    proposal.ipsGenerated = true;
    results.ips = ips;
  }

  // ---------- Generate Reg BI ----------
  if (body.includeRegBI !== false) {
    if (!proposal.proposedModel) {
      return errorResponse('PRECONDITION_FAILED', 'Proposed model required to generate Reg BI disclosure.', 400, { missingStep: 'proposedModel' });
    }

    const regBI = await generateRegBI({
      proposalId: id,
      proposal,
      feeAnalysis: proposal.feeAnalysis ?? undefined,
      proposedModel: proposal.proposedModel,
    });

    proposal.regBI = regBI;
    proposal.regBIGenerated = true;
    results.regBI = regBI;
  }

  // ---------- Store results ----------
  proposal.updatedAt = new Date().toISOString();
  proposalStore.upsertProposal(proposal);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'calc.run',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      generatedIPS: !!results.ips,
      generatedRegBI: !!results.regBI,
      action: 'proposal.documents',
    },
  });

  return NextResponse.json({
    proposalId: id,
    ...results,
    generatedAt: proposal.updatedAt,
  }, { status: 201 });
}
