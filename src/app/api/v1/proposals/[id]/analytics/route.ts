// =============================================================================
// POST /api/v1/proposals/:id/analytics  - Compute analytics for proposal
// GET  /api/v1/proposals/:id/analytics  - Get cached analytics results
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ComputeAnalyticsRequest,
  ErrorEnvelope,
  Holding,
  ModelAllocation,
} from '@/lib/proposal-engine/types';
import type { MoneyCents } from '@/lib/tax-planning/types';
import { proposalStore } from '@/lib/proposal-engine/store';
import { computeComparisonAnalytics } from '@/lib/proposal-engine/analytics-engine';
import { analyzeTaxTransition } from '@/lib/proposal-engine/tax-transition';
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

/**
 * Convert model allocations to mock Holding objects for analytics computation.
 * Uses the proposal's total value to compute per-holding market values.
 */
function modelToHoldings(
  modelAllocations: ModelAllocation[],
  totalValue: number,
): Holding[] {
  return modelAllocations.map((alloc) => {
    const pct = alloc.targetPct ?? (alloc.targetWeight ? alloc.targetWeight * 100 : 0);
    const marketValue = Math.round(totalValue * (pct / 100));
    // Use reasonable mock prices for shares calculation
    const price = 10000; // $100 per share in cents
    const quantity = Math.round((marketValue / price) * 100) / 100;

    return {
      ticker: alloc.ticker,
      cusip: null,
      description: `${alloc.ticker} (Model Allocation)`,
      assetClass: alloc.assetClass,
      quantity,
      price: price as MoneyCents,
      marketValue: marketValue as MoneyCents,
      costBasis: marketValue as MoneyCents, // Proposed has no gain/loss
      unrealizedGain: 0 as MoneyCents,
      gainPct: 0,
      holdingPeriod: null,
      expenseRatio: alloc.expenseRatio ?? 0.0005,
      dividendYield: 0.015,
      accountType: 'TAXABLE' as const,
      accountName: 'Proposed Portfolio',
    };
  });
}

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
    return errorResponse('FORBIDDEN', 'You do not have permission to view analytics.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Fetch ----------
  const proposal = proposalStore.getProposal(id);
  if (!proposal) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }
  if (proposal.firmId !== auth.firmId) {
    return errorResponse('NOT_FOUND', `Proposal "${id}" not found.`, 404, { resource: 'Proposal', id });
  }

  const analytics = proposalStore.getAnalytics(id);
  if (!analytics) {
    return errorResponse('NOT_FOUND', `Analytics not yet computed for proposal "${id}".`, 404, {
      resource: 'Analytics',
      proposalId: id,
    });
  }

  return NextResponse.json({
    proposalId: id,
    analytics,
    feeAnalysis: proposal.feeAnalysis,
    taxTransition: proposal.taxTransition,
    stressTests: proposal.stressTests,
    computedAt: proposal.updatedAt,
  });
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
  if (!hasPermission(auth.role, 'compute:run')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to run analytics.', 403, { requiredPermission: 'compute:run' });
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
  let body: ComputeAnalyticsRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400);
  }

  // ---------- Validate prerequisites ----------
  if (!proposal.currentPortfolio || proposal.currentPortfolio.holdings.length === 0) {
    return errorResponse('PRECONDITION_FAILED', 'Current portfolio must be captured before computing analytics.', 400, {
      missingStep: 'currentPortfolio',
    });
  }

  if (!proposal.proposedModel || !proposal.proposedModel.allocation) {
    return errorResponse('PRECONDITION_FAILED', 'A proposed investment model must be selected before computing analytics.', 400, {
      missingStep: 'proposedModel',
    });
  }

  // ---------- Compute analytics using comparison engine ----------
  const currentHoldings = proposal.currentPortfolio.holdings;

  // Build proposed holdings from the selected model's allocation
  let totalValue = 0;
  for (const h of currentHoldings) {
    totalValue += h.marketValue as number;
  }
  const proposedHoldings = modelToHoldings(proposal.proposedModel.allocation!, totalValue);

  // Use the comparison analytics engine which produces full PortfolioAnalytics
  const analyticsResult = computeComparisonAnalytics(currentHoldings, proposedHoldings);

  // ---------- Run optional analyses ----------
  let taxTransitionResult = null;
  if (body.includeTaxTransition !== false) {
    taxTransitionResult = analyzeTaxTransition(currentHoldings);
  }

  // ---------- Store results ----------
  proposal.analytics = analyticsResult;

  if (taxTransitionResult) {
    proposal.taxTransition = taxTransitionResult;
  }

  proposal.updatedAt = new Date().toISOString();
  proposalStore.upsertProposal(proposal);
  proposalStore.setAnalytics(id, analyticsResult);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'calc.run',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      proposalId: id,
      currentHoldingCount: currentHoldings.length,
      proposedHoldingCount: proposedHoldings.length,
      includedStressTests: body.includeStressTests !== false,
      includedTaxTransition: body.includeTaxTransition !== false,
      includedFeeAnalysis: body.includeFeeAnalysis !== false,
      action: 'proposal.analytics',
    },
  });

  return NextResponse.json({
    proposalId: id,
    analytics: analyticsResult,
    taxTransition: taxTransitionResult,
    computedAt: proposal.updatedAt,
  }, { status: 201 });
}
