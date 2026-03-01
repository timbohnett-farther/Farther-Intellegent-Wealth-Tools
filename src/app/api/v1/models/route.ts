// =============================================================================
// GET /api/v1/models  - List all investment models
// =============================================================================
// Supports optional query parameters:
//   ?riskScore=N   - Filter models within range of the given risk score
//   ?category=X    - Filter models by category (e.g., STRATEGIC, ESG)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { ModelCategory, ErrorEnvelope } from '@/lib/proposal-engine/types';
import { getAllModels, getModelsForRiskScore, getModelsByCategory } from '@/lib/proposal-engine/model-library';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';

// ==================== Helpers ====================

function errorResponse(code: string, message: string, status: number, details: Record<string, unknown> = {}): NextResponse {
  const err: ErrorEnvelope = {
    error: { code, message, details, correlationId: crypto.randomUUID() },
  };
  return NextResponse.json(err, { status });
}

const VALID_CATEGORIES: ModelCategory[] = [
  'STRATEGIC', 'TACTICAL', 'FACTOR', 'ESG', 'TAX_EFFICIENT', 'INCOME', 'ALTERNATIVES', 'CUSTOM',
];

// ==================== GET ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header.', 401);
  if (!hasPermission(auth.role, 'households:read')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to view investment models.', 403, { requiredPermission: 'households:read' });
  }

  // ---------- Query params ----------
  const { searchParams } = new URL(request.url);
  const riskScoreParam = searchParams.get('riskScore');
  const categoryParam = searchParams.get('category');

  // ---------- Validate ----------
  let riskScore: number | undefined;
  if (riskScoreParam !== null) {
    riskScore = parseInt(riskScoreParam, 10);
    if (isNaN(riskScore) || riskScore < 1 || riskScore > 100) {
      return errorResponse('VALIDATION_ERROR', 'riskScore must be a number between 1 and 100.', 400, { field: 'riskScore', value: riskScoreParam });
    }
  }

  let category: ModelCategory | undefined;
  if (categoryParam !== null) {
    if (!VALID_CATEGORIES.includes(categoryParam as ModelCategory)) {
      return errorResponse('VALIDATION_ERROR', `category must be one of: ${VALID_CATEGORIES.join(', ')}.`, 400, { field: 'category', value: categoryParam });
    }
    category = categoryParam as ModelCategory;
  }

  // ---------- Fetch ----------
  let models;
  if (riskScore !== undefined && category !== undefined) {
    // Both filters: intersect results
    const byRisk = new Set(getModelsForRiskScore(riskScore).map(m => m.modelId));
    models = getModelsByCategory(category).filter(m => byRisk.has(m.modelId));
  } else if (riskScore !== undefined) {
    models = getModelsForRiskScore(riskScore);
  } else if (category !== undefined) {
    models = getModelsByCategory(category);
  } else {
    models = getAllModels();
  }

  return NextResponse.json(models);
}
