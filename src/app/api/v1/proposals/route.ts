// =============================================================================
// GET  /api/v1/proposals    - List proposals for firm
// POST /api/v1/proposals    - Create a new proposal
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  Proposal,
  CreateProposalRequest,
  ProposalType,
  ProposalOccasion,
  RelationshipTier,
  ErrorEnvelope,
  DEFAULT_PROPOSAL_SECTIONS,
} from '@/lib/proposal-engine/types';
import { cents, DEFAULT_PROPOSAL_SECTIONS as SECTIONS } from '@/lib/proposal-engine/types';
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

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to list proposals.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Query params ----------
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? undefined;
  const type = url.searchParams.get('type') ?? undefined;
  const q = url.searchParams.get('q') ?? undefined;

  // ---------- Fetch ----------
  const items = proposalStore.listProposals(auth.firmId, {
    status,
    type,
    q,
  });

  return NextResponse.json(items);
}

// ==================== POST ====================

const VALID_PROPOSAL_TYPES: ProposalType[] = [
  'NEW_RELATIONSHIP', 'ACCOUNT_REVIEW', 'ASSET_TRANSFER',
  'SPECIFIC_GOAL', 'ALTERNATIVE_INVESTMENT', 'ROTH_CONVERSION', 'IPS_UPDATE',
];

const VALID_OCCASIONS: ProposalOccasion[] = [
  'INITIAL_MEETING', 'FOLLOW_UP', 'ANNUAL_REVIEW', 'CLIENT_INQUIRY', 'PROACTIVE_OUTREACH',
];

const VALID_TIERS: RelationshipTier[] = [
  'MASS_AFFLUENT', 'HNW', 'VHNW', 'UHNW',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:write')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to create proposals.', 403, { requiredPermission: 'households:write' });
  }

  // ---------- Parse body ----------
  let body: CreateProposalRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.clientId || typeof body.clientId !== 'string') {
    errors.clientId = 'clientId is required.';
  }

  if (!body.clientName || typeof body.clientName !== 'string') {
    errors.clientName = 'clientName is required.';
  } else if (body.clientName.length < 1 || body.clientName.length > 200) {
    errors.clientName = 'clientName must be between 1 and 200 characters.';
  }

  if (!body.proposalType || !VALID_PROPOSAL_TYPES.includes(body.proposalType)) {
    errors.proposalType = `proposalType must be one of: ${VALID_PROPOSAL_TYPES.join(', ')}.`;
  }

  if (!body.occasion || !VALID_OCCASIONS.includes(body.occasion)) {
    errors.occasion = `occasion must be one of: ${VALID_OCCASIONS.join(', ')}.`;
  }

  if (body.assetsInScope === undefined || typeof body.assetsInScope !== 'number' || body.assetsInScope < 0) {
    errors.assetsInScope = 'assetsInScope is required and must be a non-negative number (in whole dollars).';
  }

  if (!body.relationshipTier || !VALID_TIERS.includes(body.relationshipTier)) {
    errors.relationshipTier = `relationshipTier must be one of: ${VALID_TIERS.join(', ')}.`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse('VALIDATION_ERROR', 'One or more fields failed validation.', 400, errors);
  }

  // ---------- Create ----------
  const now = new Date().toISOString();
  const proposal: Proposal = {
    proposalId: crypto.randomUUID(),
    firmId: auth.firmId,
    advisorId: auth.userId,
    clientId: body.clientId,
    clientName: body.clientName,

    // Step 1: Context
    proposalType: body.proposalType,
    occasion: body.occasion,
    assetsInScope: cents(body.assetsInScope),
    relationshipTier: body.relationshipTier,
    notes: body.notes ?? '',

    // Step 2: Current Portfolio
    currentPortfolio: null,

    // Step 3: Risk Profile
    riskProfile: null,

    // Step 4: Proposed Portfolio
    proposedModel: null,
    customAllocations: null,

    // Step 5: Analysis
    analytics: { current: null, proposed: null },
    taxTransition: null,
    feeAnalysis: null,
    stressTests: [],

    // Step 6: Output
    sections: SECTIONS.map(s => ({ ...s })),
    templateId: 'default',

    // Compliance
    ipsGenerated: false,
    regBIGenerated: false,

    // Metadata
    status: 'DRAFT',
    wizardStep: 1,
    createdAt: now,
    updatedAt: now,
    sentAt: null,

    // Tracking
    tracking: null,
  };

  proposalStore.upsertProposal(proposal);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'scenario.create',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: proposal.proposalId,
      clientId: body.clientId,
      clientName: body.clientName,
      proposalType: body.proposalType,
      action: 'proposal.create',
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
