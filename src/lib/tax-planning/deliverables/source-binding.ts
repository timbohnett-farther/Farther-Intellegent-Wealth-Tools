// =============================================================================
// Deliverables & Reporting Engine — Source Binding
// =============================================================================
//
// Assembles all source data needed to build a deliverable.
// Queries the store for facts, calculations, opportunities, scenarios, and
// approved AI answers, then packages them into a DeliverableSourcePackage.
// =============================================================================

import { store } from '../store';
import type { MoneyCents } from '../types';
import type {
  DeliverableSourcePackage,
  DeliverableType,
  DeliverableAudienceMode,
} from './types';
import type { TaxYear } from '../types';
import { randomUUID } from 'crypto';

/**
 * Builds a complete source package for a deliverable.
 *
 * This function:
 * 1. Gathers all extracted fields (facts) for the household + tax year
 * 2. Retrieves the most recent calc run for each scenario
 * 3. Fetches all detected opportunities
 * 4. Lists all available scenarios
 * 5. Filters for approved AI answers relevant to the deliverable type
 * 6. Includes authoritative tax sources (from copilot citations)
 * 7. Collects warnings and limitations from the data
 *
 * @param householdId - The household to build the package for.
 * @param taxYear - The tax year context.
 * @param deliverableType - The deliverable type being generated.
 * @param audienceMode - The target audience mode.
 * @returns A complete source package ready for assembly.
 */
export function buildDeliverableSourcePackage(
  householdId: string,
  taxYear: TaxYear,
  deliverableType: DeliverableType,
  audienceMode: DeliverableAudienceMode
): DeliverableSourcePackage {
  // ---- 1. Gather facts (extracted fields) ----
  const allTaxReturns = store.listTaxReturns(householdId);
  const taxReturn = allTaxReturns.find((r) => r.tax_year === taxYear);
  const facts: DeliverableSourcePackage['facts'] = [];

  if (taxReturn) {
    const extractedFields = store.listExtractedFieldsByReturn(taxReturn.return_id);
    for (const field of extractedFields) {
      facts.push({
        fieldId: field.field_id,
        taxLineRef: field.tax_line_ref,
        valueCents: field.value_cents,
        valueText: field.value_text,
        confidence: field.confidence,
      });
    }
  }

  // ---- 2. Gather calculations (most recent calc run per scenario) ----
  const calculations: DeliverableSourcePackage['calculations'] = [];
  const scenarios = store.listScenarios(taxReturn?.return_id);

  for (const scenario of scenarios) {
    const calcRuns = store.listCalcRuns(scenario.scenario_id);
    // Sort by computed_at desc, take most recent
    const sortedRuns = [...calcRuns].sort(
      (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
    );
    const latestRun = sortedRuns[0];

    if (latestRun) {
      const calcLines = store.listCalcLines(latestRun.calc_run_id);
      const metrics: Record<string, MoneyCents> = {};
      for (const line of calcLines) {
        metrics[line.metric_id] = line.value_cents;
      }

      calculations.push({
        calcRunId: latestRun.calc_run_id,
        scenarioId: scenario.scenario_id,
        status: latestRun.status,
        metrics,
      });
    }
  }

  // ---- 3. Gather opportunities ----
  // (In real implementation, this would query an opportunities store)
  // For now, return empty array as opportunities aren't implemented yet
  const opportunities: DeliverableSourcePackage['opportunities'] = [];

  // ---- 4. Gather scenarios ----
  const scenariosList: DeliverableSourcePackage['scenarios'] = [];
  for (const scenario of scenarios) {
    const calcRun = calculations.find((c) => c.scenarioId === scenario.scenario_id);
    scenariosList.push({
      scenarioId: scenario.scenario_id,
      name: scenario.name,
      isBaseline: scenario.is_baseline,
      metrics: calcRun?.metrics,
    });
  }

  // ---- 5. Gather approved AI answers ----
  const approvedAiAnswers: DeliverableSourcePackage['approvedAiAnswers'] = [];
  const allAnswers = store.listCopilotAnswers({
    householdId,
    reviewState: 'approved_for_use',
  });

  for (const answer of allAnswers.answers) {
    // Filter relevant prompt families for the deliverable type
    const isRelevant = isAnswerRelevantForDeliverable(answer.prompt_family, deliverableType);
    if (isRelevant) {
      approvedAiAnswers.push({
        answerId: answer.answer_id,
        promptFamily: answer.prompt_family,
        answerText: answer.answer_text,
        confidence: answer.confidence,
      });
    }
  }

  // ---- 6. Gather authoritative sources ----
  const authorities: DeliverableSourcePackage['authorities'] = [];
  for (const answer of allAnswers.answers) {
    for (const citation of answer.citations) {
      if (citation.type === 'authority') {
        authorities.push({
          sourceId: citation.source_id,
          sourceTitle: citation.source_title,
          section: citation.section,
          url: citation.url,
        });
      }
    }
  }

  // ---- 7. Gather warnings and limitations ----
  const warnings: string[] = [];
  const limitations: string[] = [];

  // Check for data completeness issues
  if (facts.length === 0) {
    warnings.push('No extracted field data available for this tax year.');
  }
  if (calculations.length === 0) {
    warnings.push('No calculation runs available for this household.');
  }
  if (scenariosList.length === 0) {
    warnings.push('No scenarios defined for this tax return.');
  }

  // Check for low-confidence extracted fields
  const lowConfidenceFields = facts.filter((f) => f.confidence < 0.8);
  if (lowConfidenceFields.length > 0) {
    limitations.push(
      `${lowConfidenceFields.length} extracted fields have confidence below 80% and should be manually verified.`
    );
  }

  // Check for error calculations
  const errorCalcs = calculations.filter((c) => c.status === 'ERROR');
  if (errorCalcs.length > 0) {
    warnings.push(
      `${errorCalcs.length} calculation runs have errors and should be re-run before finalizing this deliverable.`
    );
  }

  return {
    packageId: randomUUID(),
    householdId,
    taxYear,
    deliverableType,
    audienceMode,
    facts,
    calculations,
    opportunities,
    scenarios: scenariosList,
    approvedAiAnswers,
    authorities,
    warnings,
    limitations,
  };
}

/**
 * Determines if a copilot answer is relevant for a given deliverable type.
 */
function isAnswerRelevantForDeliverable(
  promptFamily: string,
  deliverableType: DeliverableType
): boolean {
  // Map prompt families to relevant deliverable types
  const relevanceMap: Record<string, DeliverableType[]> = {
    explain_line_item: [
      'client_tax_summary',
      'advisor_internal_summary',
      'cpa_memo',
      'meeting_prep_brief',
    ],
    explain_opportunity: [
      'client_tax_summary',
      'annual_tax_letter',
      'advisor_internal_summary',
    ],
    compare_scenarios: ['scenario_comparison', 'advisor_internal_summary'],
    draft_client_email: [],
    draft_cpa_note: ['cpa_memo'],
    draft_meeting_prep: ['meeting_prep_brief'],
    missing_data_review: ['advisor_internal_summary', 'cpa_memo'],
  };

  const relevantTypes = relevanceMap[promptFamily] ?? [];
  return relevantTypes.includes(deliverableType);
}
