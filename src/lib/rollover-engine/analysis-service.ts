// =============================================================================
// Rollover Insight Engine — Analysis Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type {
  RolloverAnalysis,
  AnalysisStatus,
  AnalysisListItem,
  AmountCents,
  EIN,
  NarrativeTemplate,
} from './types';
import type { CreateAnalysisInput, UpdateAnalysisInput } from './schemas';
import { seedRolloverData } from './seed';

// Ensure mock data is loaded
seedRolloverData();

// ==================== Create Analysis ====================

export function createAnalysis(
  input: CreateAnalysisInput,
  auth: AuthContext,
  ip?: string,
): RolloverAnalysis {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const now = new Date().toISOString();
  const analysisId = `ra-${crypto.randomUUID().slice(0, 8)}`;

  // If plan_id provided, look up the plan
  let planName = input.plan_name ?? '';
  let planEin = (input.plan_ein ?? '') as EIN;
  if (input.plan_id) {
    const plan = store.getRolloverPlan(input.plan_id);
    if (plan) {
      planName = planName || plan.plan_name;
      planEin = planEin || plan.ein;
    }
  }

  const analysis: RolloverAnalysis = {
    analysis_id: analysisId,
    firm_id: auth.firmId,
    advisor_id: auth.userId,
    household_id: input.household_id,
    client_name: input.client_name,
    plan_id: input.plan_id ?? '',
    plan_name: planName,
    plan_ein: planEin,
    participant_balance_cents: input.participant_balance_cents as AmountCents,
    participant_age: input.participant_age,
    years_of_service: input.years_of_service,
    retirement_target_age: input.retirement_target_age ?? 65,
    state_of_residence: input.state_of_residence,
    has_outstanding_loan: input.has_outstanding_loan ?? false,
    outstanding_loan_cents: (input.outstanding_loan_cents ?? 0) as AmountCents,
    has_employer_stock: input.has_employer_stock ?? false,
    employer_stock_cost_basis_cents: (input.employer_stock_cost_basis_cents ?? 0) as AmountCents,
    status: 'DRAFT',
    narrative_template: (input.narrative_template ?? 'STANDARD') as NarrativeTemplate,
    notes: input.notes ?? '',
    created_at: now,
    updated_at: now,
    created_by: auth.userId,
    last_modified_by: auth.userId,
  };

  const saved = store.upsertRolloverAnalysis(analysis);

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.analysis.created',
    ip,
    payload: { analysisId, clientName: input.client_name, planEin },
  });

  return saved;
}

// ==================== Get Analysis ====================

export function getAnalysis(
  analysisId: string,
  auth: AuthContext,
): RolloverAnalysis {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  const analysis = store.getRolloverAnalysis(analysisId);
  if (!analysis) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }

  // Firm-scoped access
  if (analysis.firm_id !== auth.firmId) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }

  return analysis;
}

// ==================== List Analyses ====================

export function listAnalyses(
  auth: AuthContext,
  filters?: {
    householdId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): { analyses: AnalysisListItem[]; total: number } {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  const { analyses, total } = store.listRolloverAnalyses({
    firmId: auth.firmId,
    householdId: filters?.householdId,
    status: filters?.status,
    limit: filters?.limit,
    offset: filters?.offset,
  });

  const items: AnalysisListItem[] = analyses.map((a) => ({
    analysis_id: a.analysis_id,
    client_name: a.client_name,
    plan_name: a.plan_name,
    plan_ein: a.plan_ein,
    participant_balance_cents: a.participant_balance_cents,
    status: a.status,
    composite_score: a.composite_score,
    recommendation_tier: a.recommendation_tier,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }));

  return { analyses: items, total };
}

// ==================== Update Analysis ====================

export function updateAnalysis(
  analysisId: string,
  input: UpdateAnalysisInput,
  auth: AuthContext,
  ip?: string,
): RolloverAnalysis {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const existing = store.getRolloverAnalysis(analysisId);
  if (!existing) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }
  if (existing.firm_id !== auth.firmId) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }

  const now = new Date().toISOString();
  const updated: RolloverAnalysis = {
    ...existing,
    ...(input.status !== undefined && { status: input.status as AnalysisStatus }),
    ...(input.participant_balance_cents !== undefined && {
      participant_balance_cents: input.participant_balance_cents as AmountCents,
    }),
    ...(input.participant_age !== undefined && { participant_age: input.participant_age }),
    ...(input.years_of_service !== undefined && { years_of_service: input.years_of_service }),
    ...(input.retirement_target_age !== undefined && {
      retirement_target_age: input.retirement_target_age,
    }),
    ...(input.state_of_residence !== undefined && {
      state_of_residence: input.state_of_residence,
    }),
    ...(input.has_outstanding_loan !== undefined && {
      has_outstanding_loan: input.has_outstanding_loan,
    }),
    ...(input.outstanding_loan_cents !== undefined && {
      outstanding_loan_cents: input.outstanding_loan_cents as AmountCents,
    }),
    ...(input.has_employer_stock !== undefined && {
      has_employer_stock: input.has_employer_stock,
    }),
    ...(input.employer_stock_cost_basis_cents !== undefined && {
      employer_stock_cost_basis_cents: input.employer_stock_cost_basis_cents as AmountCents,
    }),
    ...(input.narrative_template !== undefined && {
      narrative_template: input.narrative_template as NarrativeTemplate,
    }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updated_at: now,
    last_modified_by: auth.userId,
  };

  const saved = store.upsertRolloverAnalysis(updated);

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.analysis.updated',
    ip,
    payload: { analysisId, changes: Object.keys(input) },
  });

  return saved;
}

// ==================== Delete Analysis ====================

export function deleteAnalysis(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): void {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const existing = store.getRolloverAnalysis(analysisId);
  if (!existing) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }
  if (existing.firm_id !== auth.firmId) {
    throw new Error(`Rollover analysis not found: ${analysisId}`);
  }

  // Prevent deleting approved/delivered analyses unless admin
  if (
    (existing.status === 'APPROVED' || existing.status === 'DELIVERED') &&
    !hasPermission(auth.role, 'rollover:admin')
  ) {
    throw new Error('Cannot delete an approved or delivered analysis without admin permission.');
  }

  store.deleteRolloverAnalysis(analysisId);

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.analysis.deleted',
    ip,
    payload: { analysisId, clientName: existing.client_name },
  });
}
