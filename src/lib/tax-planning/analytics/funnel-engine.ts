// =============================================================================
// Analytics — Funnel Engine
// =============================================================================
//
// Computes recommendation funnels showing lifecycle progression from surfaced
// through implemented. Calculates stage counts and conversion rates.
// =============================================================================

import { store as storeImport } from '../store';

// Cast store to any to avoid Prisma type mismatches
const store = storeImport as any;
import type { RecommendationFunnel, FunnelMetric, FunnelStage } from './types';
import type { TaxYear } from '../types';

// ==================== Funnel Computation ====================

/**
 * Computes a recommendation funnel for a given scope and period.
 *
 * @param filters - Funnel filter parameters.
 * @returns The computed funnel with stage counts and conversion rates.
 */
export function computeRecommendationFunnel(filters: {
  firmId: string;
  taxYear: TaxYear;
  periodStart: string;
  periodEnd: string;
  householdId?: string;
  advisorId?: string;
  teamId?: string;
  officeId?: string;
}): RecommendationFunnel {
  const { firmId, taxYear, periodStart, periodEnd, householdId, advisorId, teamId, officeId } = filters;

  // Get all recommendation statuses
  let statuses = store.recommendationStatuses.findAll();

  // Apply scope filters
  if (householdId) {
    statuses = statuses.filter((s: any) => s.householdId === householdId);
  }
  if (advisorId) {
    const households = store.households.findAll().filter((h: any) => h.advisorId === advisorId);
    const householdIds = new Set(households.map((h: any) => h.householdId));
    statuses = statuses.filter((s: any) => householdIds.has(s.householdId));
  }
  if (teamId) {
    // Filter by team (requires team assignment logic — stub for now)
  }
  if (officeId) {
    // Filter by office (requires office assignment logic — stub for now)
  }

  // Apply time filter
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  statuses = statuses.filter((s: any) => {
    const updated = new Date(s.updatedAt);
    return updated >= startDate && updated <= endDate;
  });

  // Count by stage
  const stages: FunnelStage[] = [
    'surfaced',
    'reviewed',
    'presented',
    'accepted',
    'deferred',
    'rejected',
    'in_implementation',
    'implemented',
    'superseded',
  ];

  const stageCounts: Record<FunnelStage, number> = {
    surfaced: 0,
    reviewed: 0,
    presented: 0,
    accepted: 0,
    deferred: 0,
    rejected: 0,
    in_implementation: 0,
    implemented: 0,
    superseded: 0,
  };

  for (const status of statuses) {
    (stageCounts as any)[status.status]++;
  }

  // Build funnel metrics with conversion rates
  const funnelMetrics: FunnelMetric[] = [];
  let previousCount: number | undefined = undefined;

  for (const stage of stages) {
    const count = stageCounts[stage];
    const conversionRate = previousCount !== undefined && previousCount > 0 ? count / previousCount : undefined;

    funnelMetrics.push({
      stage,
      count,
      conversionRate,
      previousStageCount: previousCount,
    });

    previousCount = count;
  }

  return {
    householdId,
    advisorId,
    teamId,
    officeId,
    firmId,
    taxYear,
    periodStart,
    periodEnd,
    stages: funnelMetrics,
    generatedAt: new Date().toISOString(),
  };
}
