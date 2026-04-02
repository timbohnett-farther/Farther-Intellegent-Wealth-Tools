// =============================================================================
// Rollover Engine — Admin Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import { seedRolloverData } from './seed';

seedRolloverData();

export interface EngineStats {
  total_analyses: number;
  by_status: Record<string, number>;
  total_scored: number;
  total_narratives: number;
  total_reports: number;
  total_hubspot_syncs: number;
  total_plans: number;
  total_benchmarks: number;
  average_score: number | null;
  recommendation_distribution: Record<string, number>;
}

/**
 * Gets engine-wide statistics for the admin panel.
 */
export function getEngineStats(auth: AuthContext): EngineStats {
  if (!hasPermission(auth.role, 'rollover:admin')) {
    throw new Error('Authorization denied: rollover:admin required.');
  }

  const { analyses, total } = store.listRolloverAnalyses({
    firmId: auth.firmId,
    limit: 10000,
  });

  const byStatus: Record<string, number> = {};
  const recDist: Record<string, number> = {};
  let scoredCount = 0;
  let totalScore = 0;

  for (const a of analyses) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    if (a.composite_score != null) {
      scoredCount++;
      totalScore += a.composite_score;
    }
    if (a.recommendation_tier) {
      recDist[a.recommendation_tier] = (recDist[a.recommendation_tier] ?? 0) + 1;
    }
  }

  const plans = store.listRolloverPlans({});
  const benchmarks = store.listRolloverBenchmarks({});

  return {
    total_analyses: total,
    by_status: byStatus,
    total_scored: scoredCount,
    total_narratives: analyses.filter((a) => a.narrative_id).length,
    total_reports: analyses.filter((a) => a.report_id).length,
    total_hubspot_syncs: analyses.filter((a) => a.hubspot_deal_id).length,
    total_plans: plans.length,
    total_benchmarks: benchmarks.length,
    average_score: scoredCount > 0 ? Math.round(totalScore / scoredCount) : null,
    recommendation_distribution: recDist,
  };
}

/**
 * Gets recent audit events for the rollover engine.
 */
export function getRolloverAuditLog(
  auth: AuthContext,
  limit: number = 50,
): ReturnType<typeof auditService.query> {
  if (!hasPermission(auth.role, 'rollover:admin')) {
    throw new Error('Authorization denied: rollover:admin required.');
  }

  return auditService.query({
    firmId: auth.firmId,
    eventKey: 'rollover',
    limit,
  });
}
