// =============================================================================
// Analytics — Value Engine
// =============================================================================
//
// Computes value attribution and value-of-advice metrics. Estimates proposed,
// accepted, and implemented value from scenario deltas and recommendation
// execution status.
// =============================================================================

import { store as storeImport } from '../store';

// Cast store to any to avoid Prisma type mismatches
const store = storeImport as any;
import type { ValueAttribution, ValueOfAdvice, ScopeType } from './types';
import type { TaxYear } from '../types';

// ==================== Value Attribution ====================

/**
 * Computes value attribution records for a household and tax year.
 *
 * Creates attribution records by linking scenarios to recommendations
 * and calculating value deltas.
 *
 * @param householdId - The household ID.
 * @param taxYear - The tax year.
 * @returns Array of value attribution records.
 */
export function computeValueAttribution(householdId: string, taxYear: TaxYear): ValueAttribution[] {
  const attributions: ValueAttribution[] = [];

  // Get all scenarios for the household
  const scenarios = store.scenarios.findAll().filter(
    (s: any) => s.householdId === householdId && s.tax_year === taxYear
  );

  // Get baseline scenario
  const baseline = scenarios.find((s: any) => s.scenario_type === 'baseline');
  if (!baseline) {
    return []; // Cannot compute value without baseline
  }

  // Get baseline calc run
  const baselineCalcRun = store.calcRuns.findByScenario(baseline.scenarioId);
  if (!baselineCalcRun || baselineCalcRun.status !== 'completed') {
    return [];
  }

  // Get baseline total tax
  const baselineTax = baselineCalcRun.total_tax_cents;

  // For each recommended scenario, compute value delta
  for (const scenario of scenarios) {
    if (scenario.scenario_type === 'baseline' || scenario.status !== 'recommended') {
      continue;
    }

    const calcRun = store.calcRuns.findByScenario(scenario.scenarioId);
    if (!calcRun || calcRun.status !== 'completed') {
      continue;
    }

    const scenarioTax = calcRun.total_tax_cents;
    const valueDelta = baselineTax - scenarioTax; // Positive = tax savings

    // Get recommendation status
    const recStatus = store.recommendationStatuses.findAll().find((r: any) => r.scenarioId === scenario.scenarioId);

    let acceptedValueCents: number | undefined;
    let implementedValueCents: number | undefined;
    let status: 'proposed' | 'accepted' | 'implemented' | 'superseded' = 'proposed';

    if (recStatus) {
      if (['accepted', 'in_implementation'].includes(recStatus.status)) {
        acceptedValueCents = valueDelta;
        status = 'accepted';
      }
      if (recStatus.status === 'implemented') {
        acceptedValueCents = valueDelta;
        implementedValueCents = valueDelta;
        status = 'implemented';
      }
      if (recStatus.status === 'superseded') {
        status = 'superseded';
      }
    }

    attributions.push({
      attributionId: `attr_${scenario.scenarioId}_${Date.now()}`,
      householdId,
      taxYear,
      recommendationId: scenario.scenarioId,
      opportunityCategory: scenario.scenario_type,
      scenarioId: scenario.scenarioId,
      proposedValueCents: valueDelta,
      acceptedValueCents,
      implementedValueCents,
      attributionModel: 'scenario_delta',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return attributions;
}

// ==================== Value-of-Advice Dashboard ====================

/**
 * Computes a value-of-advice dashboard for a scope and period.
 *
 * Aggregates value attribution records and calculates key ROI metrics.
 *
 * @param scopeType - The scope type.
 * @param scopeRefId - The ID of the scope entity.
 * @param periodStart - Start of measurement period (ISO 8601).
 * @param periodEnd - End of measurement period (ISO 8601).
 * @returns The value-of-advice dashboard.
 */
export function computeValueOfAdvice(
  scopeType: ScopeType,
  scopeRefId: string,
  periodStart: string,
  periodEnd: string
): ValueOfAdvice {
  let attributions = store.valueAttributions.findAll();

  // Apply scope filters
  if (scopeType === 'household') {
    attributions = attributions.filter((a: any) => a.householdId === scopeRefId);
  } else if (scopeType === 'advisor') {
    const households = store.households.findAll().filter((h: any) => h.advisorId === scopeRefId);
    const householdIds = new Set(households.map((h: any) => h.householdId));
    attributions = attributions.filter((a: any) => householdIds.has(a.householdId));
  } else if (scopeType === 'firm') {
    // All attributions for firm
  }

  // Apply time filter
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  attributions = attributions.filter((a: any) => {
    const created = new Date(a.createdAt);
    return created >= startDate && created <= endDate;
  });

  // Compute aggregates
  const proposedValueCents = attributions.reduce((sum: number, a: any) => sum + a.proposedValueCents, 0);
  const acceptedValueCents = attributions.reduce((sum: number, a: any) => sum + (a.acceptedValueCents ?? 0), 0);
  const implementedValueCents = attributions.reduce((sum: number, a: any) => sum + (a.implementedValueCents ?? 0), 0);

  // Value by category
  const valueByCategory: Record<string, number> = {};
  for (const attr of attributions) {
    if (!valueByCategory[attr.opportunityCategory]) {
      valueByCategory[attr.opportunityCategory] = 0;
    }
    valueByCategory[attr.opportunityCategory] += attr.proposedValueCents;
  }

  // Implementation rate
  const accepted = attributions.filter((a: any) => a.status === 'accepted').length;
  const implemented = attributions.filter((a: any) => a.status === 'implemented').length;
  const implementationRate = accepted > 0 ? implemented / accepted : 0;

  // Planning coverage (households with plans / total households)
  const allHouseholds = store.households.findAll();
  const householdsWithScenarios = allHouseholds.filter((h: any) => {
    const scenarios = store.scenarios.findAll().filter((s: any) => s.householdId === h.householdId);
    return scenarios.length > 0;
  });
  const planningCoverage = allHouseholds.length > 0 ? householdsWithScenarios.length / allHouseholds.length : 0;

  // Advisor productivity score (simple heuristic: deliverables per advisor)
  const deliverables = store.deliverables.findAll();
  const advisors = store.users.findAll().filter((u: any) => ['ADVISOR', 'PARAPLANNER'].includes(u.role));
  const deliverablesPerAdvisor = advisors.length > 0 ? deliverables.length / advisors.length : 0;
  const advisorProductivityScore = Math.min(100, deliverablesPerAdvisor * 10); // Simple scaling

  return {
    scopeType,
    scopeRefId,
    periodStart,
    periodEnd,
    proposedValueCents,
    acceptedValueCents,
    implementedValueCents,
    valueByCategory,
    implementationRate,
    planningCoverage,
    advisorProductivityScore,
    generatedAt: new Date().toISOString(),
  };
}
