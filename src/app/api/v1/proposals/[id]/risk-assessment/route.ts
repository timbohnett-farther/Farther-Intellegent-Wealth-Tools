// =============================================================================
// POST /api/v1/proposals/:id/risk-assessment  - Submit risk questionnaire
// GET  /api/v1/proposals/:id/risk-assessment  - Get existing risk profile
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  RiskAssessmentRequest,
  ErrorEnvelope,
} from '@/lib/proposal-engine/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { scoreRiskProfile } from '@/lib/proposal-engine/risk-scorer';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type { MoneyCents } from '@/lib/tax-planning/types';
import { cents } from '@/lib/tax-planning/types';

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
    return errorResponse('FORBIDDEN', 'You do not have permission to view risk profiles.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  const riskProfile = proposalStore.getRiskProfile(id);
  if (!riskProfile) {
    return errorResponse('NOT_FOUND', `Risk profile not found for proposal "${id}".`, 404, { resource: 'RiskProfile', proposalId: id });
  }

  return NextResponse.json(riskProfile);
}

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
    return errorResponse('FORBIDDEN', 'You do not have permission to submit risk assessments.', 403, { requiredPermission: 'households:write' });
  }

  // ---------- Fetch proposal ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  // ---------- Parse body ----------
  let body: RiskAssessmentRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.responses || !Array.isArray(body.responses) || body.responses.length === 0) {
    errors.responses = 'responses is required and must be a non-empty array.';
  } else {
    for (let i = 0; i < body.responses.length; i++) {
      const r = body.responses[i];
      if (!r.questionId || typeof r.questionId !== 'string') {
        errors[`responses[${i}].questionId`] = 'questionId is required.';
      }
      if (typeof r.score !== 'number' || r.score < 1 || r.score > 100) {
        errors[`responses[${i}].score`] = 'score must be a number between 1 and 100.';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse('VALIDATION_ERROR', 'One or more fields failed validation.', 400, errors);
  }

  // ---------- Compute risk profile using the service ----------
  // Map the request format to the risk-scorer's expected format
  const assetsInScope = proposal.assetsInScope as number;
  const annualIncome = assetsInScope * 0.05; // rough heuristic
  const emergencyFundMonths = 6;

  const fullProfile = scoreRiskProfile({
    responses: body.responses.map(r => ({
      questionId: r.questionId,
      questionText: r.questionText ?? r.questionId,
      answer: r.answer ?? r.score,
      score: r.score,
    })),
    timeHorizon: body.capacityOverrides?.timeHorizon ?? 10,
    annualIncome: cents(annualIncome / 100) as MoneyCents,
    portfolioValue: proposal.assetsInScope,
    emergencyFundMonths,
    totalDebt: cents(0) as MoneyCents,
    totalAssets: proposal.assetsInScope,
    goalFundingNeeded: proposal.assetsInScope,
    currentSavings: cents(assetsInScope * 0.3 / 100) as MoneyCents,
    yearsToGoal: body.capacityOverrides?.timeHorizon ?? 10,
    currentPortfolioRisk: 50, // Placeholder -- would be computed from current holdings
  });

  // Override profileId with a proper UUID
  (fullProfile as { profileId: string }).profileId = crypto.randomUUID();

  // Apply capacity overrides if provided
  if (body.capacityOverrides) {
    if (body.capacityOverrides.timeHorizon !== undefined) {
      fullProfile.capacityFactors.timeHorizon = body.capacityOverrides.timeHorizon;
    }
    if (body.capacityOverrides.incomeStability !== undefined) {
      fullProfile.capacityFactors.incomeStability = body.capacityOverrides.incomeStability;
    }
    if (body.capacityOverrides.liquidityRatio !== undefined) {
      fullProfile.capacityFactors.liquidityRatio = body.capacityOverrides.liquidityRatio;
    }
    if (body.capacityOverrides.debtRatio !== undefined) {
      fullProfile.capacityFactors.debtRatio = body.capacityOverrides.debtRatio;
    }
    if (body.capacityOverrides.humanCapitalValue !== undefined) {
      fullProfile.capacityFactors.humanCapitalValue = body.capacityOverrides.humanCapitalValue;
    }
  }

  // ---------- Store ----------
  proposalStore.setRiskProfile(id, fullProfile);

  // Also update the proposal entity
  proposal.riskProfile = fullProfile;
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
      profileId: fullProfile.profileId,
      compositeScore: fullProfile.compositeScore,
      compositeLabel: fullProfile.compositeLabel,
      responseCount: body.responses.length,
      action: 'proposal.risk_assessment',
    },
  });

  return NextResponse.json(fullProfile, { status: 201 });
}
