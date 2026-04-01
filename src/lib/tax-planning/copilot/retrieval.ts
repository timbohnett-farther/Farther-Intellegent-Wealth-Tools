// =============================================================================
// AI Copilot & Citation Layer — Source Package Retrieval
// =============================================================================
//
// Assembles the SourcePackage from the in-memory store, combining household
// facts, calc outputs, opportunities, scenarios, and policy data.
// Computes an upstream hash for staleness detection.
// =============================================================================

import { createHash } from 'crypto';
import type { TaxYear, MoneyCents } from '../types';
import { store } from '../store';
import { policyRegistry } from '../policy-registry';
import type { SourcePackage } from './types';

// =====================================================================
// Source Package Assembly
// =====================================================================

/**
 * Build a complete source package for a given household and tax year.
 * Assembles all relevant data from the store for copilot prompt construction.
 *
 * @param householdId - The household to assemble data for.
 * @param taxYear - The tax year context.
 * @returns The assembled SourcePackage, or null if the household doesn't exist.
 */
export function buildSourcePackage(
  householdId: string,
  taxYear: TaxYear,
): SourcePackage | null {
  // Look up household
  const household = store.getHousehold(householdId);
  if (!household) return null;

  // Look up persons
  const persons = store.listPersons(householdId);

  // Look up tax return for this household + year
  const taxReturns = store.listTaxReturns(householdId);
  const taxReturn = taxReturns.find((r) => r.tax_year === taxYear);

  // Look up extracted fields (via documents for this household + year)
  const docs = store.listDocuments(householdId).filter(
    (d) => d.tax_year === taxYear,
  );
  const extractedFields: SourcePackage['extracted_fields'] = [];
  for (const doc of docs) {
    const fields = store.listExtractedFields(doc.doc_id);
    for (const field of fields) {
      extractedFields.push({
        field_id: field.field_id,
        tax_line_ref: field.tax_line_ref,
        value_cents: field.value_cents,
        value_text: field.value_text,
        confidence: field.confidence,
      });
    }
  }

  // Look up calc metrics (most recent calc run for baseline scenario)
  let calcMetrics: SourcePackage['calc_metrics'] = undefined;
  if (taxReturn) {
    const scenarios = store.listScenarios(taxReturn.return_id);
    const baseline = scenarios.find((s) => s.is_baseline);
    if (baseline) {
      const calcRuns = store.listCalcRuns(baseline.scenario_id);
      const latestRun = calcRuns.sort(
        (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime(),
      )[0];
      if (latestRun) {
        calcMetrics = {
          calc_run_id: latestRun.calc_run_id,
          scenario_id: latestRun.scenario_id,
          status: latestRun.status,
          metrics: latestRun.metrics,
        };
      }
    }
  }

  // Look up scenarios with their latest calc metrics
  const scenariosList: SourcePackage['scenarios'] = [];
  if (taxReturn) {
    const scenarios = store.listScenarios(taxReturn.return_id);
    for (const scenario of scenarios) {
      const calcRuns = store.listCalcRuns(scenario.scenario_id);
      const latestRun = calcRuns.sort(
        (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime(),
      )[0];
      scenariosList.push({
        scenario_id: scenario.scenario_id,
        name: scenario.name,
        is_baseline: scenario.is_baseline,
        metrics: latestRun?.metrics,
      });
    }
  }

  // Look up policy summary
  let policySummary: SourcePackage['policy_summary'] = undefined;
  try {
    const policy = policyRegistry.getPolicy(taxYear);
    if (policy) {
      policySummary = {
        tax_year: taxYear,
        standard_deduction: policy.standardDeduction as Record<string, MoneyCents>,
      };
    }
  } catch {
    // Policy not available for this year — that's OK
  }

  // Build the package
  const packageData: Omit<SourcePackage, 'upstream_hash'> = {
    household: {
      household_id: household.household_id,
      display_name: household.display_name,
      primary_state: household.primary_state,
      tax_year: taxYear,
      filing_status: taxReturn?.filing_status,
      persons: persons.map((p) => ({
        person_id: p.person_id,
        first_name: p.first_name,
        last_name: p.last_name,
        dob: p.dob,
      })),
    },
    extracted_fields: extractedFields,
    calc_metrics: calcMetrics,
    opportunities: [], // Populated by caller if opportunity store is available
    scenarios: scenariosList,
    policy_summary: policySummary,
  };

  const upstreamHash = computeUpstreamHash(packageData);

  return {
    ...packageData,
    upstream_hash: upstreamHash,
  };
}

// =====================================================================
// Upstream Hash Computation
// =====================================================================

/**
 * Compute a SHA-256 hash of the source package for staleness detection.
 * When upstream data changes, the hash changes, marking answers as stale.
 *
 * @param packageData - The source package data (without the hash itself).
 * @returns A hex-encoded SHA-256 hash string.
 */
export function computeUpstreamHash(
  packageData: Omit<SourcePackage, 'upstream_hash'>,
): string {
  // Create a deterministic JSON representation with deep key sorting
  const canonical = JSON.stringify(packageData, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  });
  return createHash('sha256').update(canonical).digest('hex');
}
