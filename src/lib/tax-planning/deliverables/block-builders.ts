// =============================================================================
// Deliverables & Reporting Engine — Section Block Builders
// =============================================================================
//
// Builder functions for each block type. Each builder takes a source package
// and section blueprint, then returns a fully assembled section block.
// =============================================================================

import type {
  DeliverableSectionBlock,
  DeliverableSectionBlueprint,
  DeliverableSourcePackage,
} from './types';
import { randomUUID } from 'crypto';

/**
 * Builds a summary block with key highlights and top-level metrics.
 */
export function buildSummaryBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    householdName: `Household ${sourcePackage.householdId}`,
    taxYear: sourcePackage.taxYear,
    keyMetrics: [],
    highlights: [],
  };

  const sourceRefs: string[] = [];

  // Extract key metrics from calculations
  for (const calc of sourcePackage.calculations) {
    if (calc.metrics['f1040:l11:agi']) {
      content.keyMetrics = [
        ...(content.keyMetrics as unknown[]),
        {
          label: 'Adjusted Gross Income',
          value: calc.metrics['f1040:l11:agi'],
          scenarioId: calc.scenarioId,
        },
      ];
      sourceRefs.push(calc.calcRunId);
    }
    if (calc.metrics['f1040:l16:tax']) {
      content.keyMetrics = [
        ...(content.keyMetrics as unknown[]),
        {
          label: 'Total Tax',
          value: calc.metrics['f1040:l16:tax'],
          scenarioId: calc.scenarioId,
        },
      ];
      sourceRefs.push(calc.calcRunId);
    }
  }

  // Extract highlights from opportunities
  for (const opp of sourcePackage.opportunities.slice(0, 3)) {
    content.highlights = [
      ...(content.highlights as unknown[]),
      {
        opportunityId: opp.opportunityId,
        title: opp.title,
        estimatedValue: opp.estimatedValue,
      },
    ];
    sourceRefs.push(opp.opportunityId);
  }

  return {
    blockId: randomUUID(),
    blockType: 'summary',
    title: blueprint.title ?? 'Summary',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds a comparison table block showing scenarios side-by-side.
 */
export function buildComparisonTableBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    scenarios: [],
    metrics: [],
  };

  const sourceRefs: string[] = [];

  // Build scenario columns
  for (const scenario of sourcePackage.scenarios) {
    content.scenarios = [
      ...(content.scenarios as unknown[]),
      {
        scenarioId: scenario.scenarioId,
        name: scenario.name,
        isBaseline: scenario.isBaseline,
      },
    ];
    sourceRefs.push(scenario.scenarioId);
  }

  // Build metric rows
  const metricKeys = ['f1040:l11:agi', 'f1040:l15:taxable_income', 'f1040:l16:tax'];
  const metricLabels = ['Adjusted Gross Income', 'Taxable Income', 'Total Tax'];

  for (let i = 0; i < metricKeys.length; i++) {
    const key = metricKeys[i];
    const label = metricLabels[i];
    const row: Record<string, unknown> = { metric: label };

    for (const scenario of sourcePackage.scenarios) {
      const calc = sourcePackage.calculations.find((c) => c.scenarioId === scenario.scenarioId);
      row[scenario.scenarioId] = calc?.metrics[key] ?? null;
    }

    content.metrics = [...(content.metrics as unknown[]), row];
  }

  return {
    blockId: randomUUID(),
    blockType: 'comparison_table',
    title: blueprint.title ?? 'Comparison Table',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds an opportunity block highlighting tax-saving opportunities.
 */
export function buildOpportunityBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    opportunities: [],
  };

  const sourceRefs: string[] = [];

  // List all opportunities with details
  for (const opp of sourcePackage.opportunities) {
    content.opportunities = [
      ...(content.opportunities as unknown[]),
      {
        opportunityId: opp.opportunityId,
        category: opp.category,
        title: opp.title,
        summary: opp.summary,
        estimatedValue: opp.estimatedValue,
        confidence: opp.confidence,
        priority: opp.priority,
      },
    ];
    sourceRefs.push(opp.opportunityId);
  }

  return {
    blockId: randomUUID(),
    blockType: 'opportunity',
    title: blueprint.title ?? 'Opportunities',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds a recommendation block with strategic guidance.
 */
export function buildRecommendationBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    recommendations: [],
  };

  const sourceRefs: string[] = [];

  // Convert high-priority opportunities into recommendations
  const highPriorityOpps = sourcePackage.opportunities.filter((o) => o.priority === 'high');

  for (const opp of highPriorityOpps) {
    content.recommendations = [
      ...(content.recommendations as unknown[]),
      {
        opportunityId: opp.opportunityId,
        title: opp.title,
        rationale: opp.summary,
        estimatedBenefit: opp.estimatedValue,
        confidence: opp.confidence,
      },
    ];
    sourceRefs.push(opp.opportunityId);
  }

  // If no high-priority opportunities, generate a generic recommendation
  if (highPriorityOpps.length === 0) {
    content.recommendations = [
      {
        title: 'Continue Current Strategy',
        rationale:
          'No high-priority tax planning opportunities were identified for this tax year. Continue monitoring for future optimization opportunities.',
        estimatedBenefit: null,
        confidence: 'medium',
      },
    ];
  }

  return {
    blockId: randomUUID(),
    blockType: 'recommendation',
    title: blueprint.title ?? 'Recommendations',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds a narrative block with prose explanation.
 */
export function buildNarrativeBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    sections: [],
  };

  const sourceRefs: string[] = [];

  // Include approved AI answers if available
  for (const answer of sourcePackage.approvedAiAnswers) {
    content.sections = [
      ...(content.sections as unknown[]),
      {
        heading: `AI Insight: ${answer.promptFamily}`,
        body: answer.answerText,
        confidence: answer.confidence,
      },
    ];
    sourceRefs.push(answer.answerId);
  }

  // If no AI answers, generate placeholder text
  if (sourcePackage.approvedAiAnswers.length === 0) {
    content.sections = [
      {
        heading: 'Tax Year Overview',
        body: `This deliverable provides a comprehensive analysis of your ${sourcePackage.taxYear} tax situation. Detailed insights and recommendations are provided in the sections below.`,
        confidence: 'n/a',
      },
    ];
  }

  return {
    blockId: randomUUID(),
    blockType: 'narrative',
    title: blueprint.title ?? 'Narrative',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds an assumptions block listing key assumptions.
 */
export function buildAssumptionsBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    assumptions: [],
  };

  const sourceRefs: string[] = [];

  // List data sources
  content.assumptions = [
    {
      category: 'Data Sources',
      items: [
        `Extracted field data from ${sourcePackage.facts.length} tax return line items`,
        `Calculation results from ${sourcePackage.calculations.length} scenario runs`,
      ],
    },
  ];

  // List calculation assumptions
  if (sourcePackage.scenarios.length > 0) {
    content.assumptions = [
      ...(content.assumptions as unknown[]),
      {
        category: 'Calculation Assumptions',
        items: [`Analysis based on ${sourcePackage.scenarios.length} defined scenarios`],
      },
    ];
  }

  // List limitations
  if (sourcePackage.limitations.length > 0) {
    content.assumptions = [
      ...(content.assumptions as unknown[]),
      {
        category: 'Known Limitations',
        items: sourcePackage.limitations,
      },
    ];
  }

  return {
    blockId: randomUUID(),
    blockType: 'assumptions',
    title: blueprint.title ?? 'Assumptions',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds a warnings block highlighting risks and considerations.
 */
export function buildWarningsBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    warnings: sourcePackage.warnings,
  };

  return {
    blockId: randomUUID(),
    blockType: 'warnings',
    title: blueprint.title ?? 'Warnings',
    content,
    sourceRefs: [],
    order,
  };
}

/**
 * Builds a disclaimer block with legal and compliance language.
 */
export function buildDisclaimerBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    text: `This analysis is provided for informational purposes only and does not constitute tax advice. Please consult with a qualified tax professional before making any tax-related decisions. The information contained herein is based on data current as of ${new Date().toISOString().split('T')[0]} and is subject to change.`,
  };

  return {
    blockId: randomUUID(),
    blockType: 'disclaimer',
    title: blueprint.title,
    content,
    sourceRefs: [],
    order,
  };
}

/**
 * Builds an implementation steps block with actionable checklist.
 */
export function buildImplementationStepsBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    steps: [],
  };

  const sourceRefs: string[] = [];

  // Convert opportunities into implementation steps
  for (const opp of sourcePackage.opportunities) {
    content.steps = [
      ...(content.steps as unknown[]),
      {
        opportunityId: opp.opportunityId,
        title: opp.title,
        description: opp.summary,
        estimatedValue: opp.estimatedValue,
        priority: opp.priority,
        completed: false,
      },
    ];
    sourceRefs.push(opp.opportunityId);
  }

  return {
    blockId: randomUUID(),
    blockType: 'implementation_steps',
    title: blueprint.title ?? 'Implementation Steps',
    content,
    sourceRefs,
    order,
  };
}

/**
 * Builds an appendix block with supporting documentation.
 */
export function buildAppendixBlock(
  blueprint: DeliverableSectionBlueprint,
  sourcePackage: DeliverableSourcePackage,
  order: number
): DeliverableSectionBlock {
  const content: Record<string, unknown> = {
    sections: [],
  };

  const sourceRefs: string[] = [];

  // Include authoritative sources
  if (sourcePackage.authorities.length > 0) {
    content.sections = [
      {
        heading: 'Authoritative Sources',
        items: sourcePackage.authorities.map((auth) => ({
          sourceId: auth.sourceId,
          title: auth.sourceTitle,
          section: auth.section,
          url: auth.url,
        })),
      },
    ];
    sourceRefs.push(...sourcePackage.authorities.map((a) => a.sourceId));
  }

  // Include calculation details
  if (sourcePackage.calculations.length > 0) {
    content.sections = [
      ...(content.sections as unknown[]),
      {
        heading: 'Calculation Runs',
        items: sourcePackage.calculations.map((calc) => ({
          calcRunId: calc.calcRunId,
          scenarioId: calc.scenarioId,
          status: calc.status,
          metricCount: Object.keys(calc.metrics).length,
        })),
      },
    ];
  }

  return {
    blockId: randomUUID(),
    blockType: 'appendix',
    title: blueprint.title ?? 'Appendix',
    content,
    sourceRefs,
    order,
  };
}
