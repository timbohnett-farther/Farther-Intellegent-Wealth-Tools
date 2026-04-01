// =============================================================================
// AI Copilot & Citation Layer — Citation Builders & Validation
// =============================================================================
//
// Functions to build typed citations from various sources and validate
// AI-generated citations against the approved knowledge base.
// =============================================================================

import type { MoneyCents, TaxLineRef } from '../types';
import type {
  CopilotCitation,
  FactCitation,
  CalcCitation,
  OpportunityCitation,
  ScenarioCitation,
  AuthorityCitation,
  CitationType,
} from './types';

// =====================================================================
// Tax Knowledge Base (re-exported for copilot use)
// =====================================================================

/**
 * Curated IRS publications for citation validation.
 * Only references from this list are allowed in AI responses.
 */
export const TAX_KNOWLEDGE_BASE = [
  {
    id: 'pub_590a',
    title: 'IRS Publication 590-A',
    subtitle: 'Contributions to Individual Retirement Arrangements (IRAs)',
    url: 'https://www.irs.gov/publications/p590a',
    topics: ['Roth conversion', 'Traditional IRA', 'Contribution limits', 'Income limits'],
  },
  {
    id: 'pub_590b',
    title: 'IRS Publication 590-B',
    subtitle: 'Distributions from Individual Retirement Arrangements (IRAs)',
    url: 'https://www.irs.gov/publications/p590b',
    topics: ['RMD', 'Roth distributions', 'Early withdrawal penalty', 'Rollovers'],
  },
  {
    id: 'pub_554',
    title: 'IRS Publication 554',
    subtitle: 'Tax Guide for Seniors',
    url: 'https://www.irs.gov/publications/p554',
    topics: ['IRMAA', 'Medicare premiums', 'Social Security', 'Senior tax benefits'],
  },
  {
    id: 'pub_505',
    title: 'IRS Publication 505',
    subtitle: 'Tax Withholding and Estimated Tax',
    url: 'https://www.irs.gov/publications/p505',
    topics: ['Withholding', 'Estimated payments', 'Underpayment penalty', 'Safe harbor'],
  },
  {
    id: 'pub_550',
    title: 'IRS Publication 550',
    subtitle: 'Investment Income and Expenses',
    url: 'https://www.irs.gov/publications/p550',
    topics: ['Capital gains', 'Dividends', 'Interest', 'Investment expenses', 'NIIT'],
  },
  {
    id: 'pub_526',
    title: 'IRS Publication 526',
    subtitle: 'Charitable Contributions',
    url: 'https://www.irs.gov/publications/p526',
    topics: ['Charitable deductions', 'Donor-advised funds', 'QCD', 'Bunching'],
  },
  {
    id: 'pub_535',
    title: 'IRS Publication 535',
    subtitle: 'Business Expenses',
    url: 'https://www.irs.gov/publications/p535',
    topics: ['QBI deduction', 'Section 199A', 'Business deductions'],
  },
  {
    id: 'pub_969',
    title: 'IRS Publication 969',
    subtitle: 'Health Savings Accounts and Other Tax-Favored Health Plans',
    url: 'https://www.irs.gov/publications/p969',
    topics: ['HSA', 'Health savings', 'HDHP', 'FSA'],
  },
  {
    id: 'pub_970',
    title: 'IRS Publication 970',
    subtitle: 'Tax Benefits for Education',
    url: 'https://www.irs.gov/publications/p970',
    topics: ['529 plans', 'Education credits', 'Student loan interest', 'Coverdell'],
  },
] as const;

// =====================================================================
// Citation ID Generator
// =====================================================================

let citationCounter = 0;

function generateCitationId(): string {
  citationCounter++;
  return `cite_${Date.now().toString(36)}_${citationCounter.toString(36)}`;
}

/** Reset counter for testing. */
export function resetCitationCounter(): void {
  citationCounter = 0;
}

// =====================================================================
// Citation Builders
// =====================================================================

/**
 * Build a fact citation referencing an extracted field value.
 */
export function buildFactCitation(params: {
  field_id: string;
  tax_line_ref: TaxLineRef;
  value_cents: MoneyCents;
  label?: string;
}): FactCitation {
  return {
    citation_id: generateCitationId(),
    type: 'fact',
    label: params.label ?? `Extracted: ${params.tax_line_ref}`,
    verified: true,
    field_id: params.field_id,
    tax_line_ref: params.tax_line_ref,
    value_cents: params.value_cents,
  };
}

/**
 * Build a calc citation referencing a computation result.
 */
export function buildCalcCitation(params: {
  calc_run_id: string;
  metric_id: string;
  value_cents: MoneyCents;
  label?: string;
}): CalcCitation {
  return {
    citation_id: generateCitationId(),
    type: 'calc',
    label: params.label ?? `Computed: ${params.metric_id}`,
    verified: true,
    calc_run_id: params.calc_run_id,
    metric_id: params.metric_id,
    value_cents: params.value_cents,
  };
}

/**
 * Build an opportunity citation referencing a detected opportunity.
 */
export function buildOpportunityCitation(params: {
  opportunity_id: string;
  category: string;
  estimated_value?: number;
  label?: string;
}): OpportunityCitation {
  return {
    citation_id: generateCitationId(),
    type: 'opportunity',
    label: params.label ?? `Opportunity: ${params.category}`,
    verified: true,
    opportunity_id: params.opportunity_id,
    category: params.category,
    estimated_value: params.estimated_value,
  };
}

/**
 * Build a scenario citation referencing a scenario's metric.
 */
export function buildScenarioCitation(params: {
  scenario_id: string;
  scenario_name: string;
  metric_id: string;
  value_cents: MoneyCents;
  label?: string;
}): ScenarioCitation {
  return {
    citation_id: generateCitationId(),
    type: 'scenario',
    label: params.label ?? `Scenario "${params.scenario_name}": ${params.metric_id}`,
    verified: true,
    scenario_id: params.scenario_id,
    scenario_name: params.scenario_name,
    metric_id: params.metric_id,
    value_cents: params.value_cents,
  };
}

/**
 * Build an authority citation referencing an IRS publication or other source.
 */
export function buildAuthorityCitation(params: {
  source_id: string;
  source_title: string;
  section?: string;
  url?: string;
  quote?: string;
  label?: string;
}): AuthorityCitation {
  return {
    citation_id: generateCitationId(),
    type: 'authority',
    label: params.label ?? params.source_title,
    verified: isKnownSource(params.source_title, params.url),
    source_id: params.source_id,
    source_title: params.source_title,
    section: params.section,
    url: params.url,
    quote: params.quote,
  };
}

// =====================================================================
// Citation Validation
// =====================================================================

/**
 * Check if a source title or URL matches a known knowledge base entry.
 */
function isKnownSource(sourceTitle: string, url?: string): boolean {
  return TAX_KNOWLEDGE_BASE.some(
    (doc) =>
      sourceTitle.includes(doc.title) ||
      sourceTitle.includes(doc.subtitle) ||
      (url != null && url === doc.url),
  );
}

/**
 * Validate an array of AI-generated raw citations against the knowledge base.
 * Returns validated typed citations and a list of hallucination warnings.
 *
 * @param rawCitations - Raw citation objects from the AI response.
 * @param sourcePackage - The source package used for fact/calc validation.
 * @returns Object with validated citations and hallucination messages.
 */
export function validateCitations(
  rawCitations: Array<{
    type: CitationType;
    label: string;
    source_id?: string;
    source_title?: string;
    section?: string;
    url?: string;
    quote?: string;
    field_id?: string;
    tax_line_ref?: string;
    value_cents?: number;
    calc_run_id?: string;
    metric_id?: string;
    opportunity_id?: string;
    category?: string;
    estimated_value?: number;
    scenario_id?: string;
    scenario_name?: string;
  }>,
  sourcePackage?: {
    extracted_fields?: Array<{ field_id: string; tax_line_ref: TaxLineRef }>;
    calc_metrics?: { calc_run_id: string };
    opportunities?: Array<{ opportunity_id: string }>;
    scenarios?: Array<{ scenario_id: string }>;
  },
): {
  validCitations: CopilotCitation[];
  hallucinations: string[];
} {
  const validCitations: CopilotCitation[] = [];
  const hallucinations: string[] = [];

  for (const raw of rawCitations) {
    switch (raw.type) {
      case 'authority': {
        const title = raw.source_title ?? raw.label;
        if (isKnownSource(title, raw.url)) {
          validCitations.push(
            buildAuthorityCitation({
              source_id: raw.source_id ?? 'unknown',
              source_title: title,
              section: raw.section,
              url: raw.url,
              quote: raw.quote,
              label: raw.label,
            }),
          );
        } else {
          hallucinations.push(
            `Hallucinated authority source: "${title}" — not found in knowledge base`,
          );
        }
        break;
      }

      case 'fact': {
        // Validate that the field exists in the source package
        const fieldExists = sourcePackage?.extracted_fields?.some(
          (f) => f.field_id === raw.field_id,
        );
        if (fieldExists || !sourcePackage) {
          validCitations.push(
            buildFactCitation({
              field_id: raw.field_id ?? 'unknown',
              tax_line_ref: (raw.tax_line_ref ?? 'unknown') as TaxLineRef,
              value_cents: (raw.value_cents ?? 0) as MoneyCents,
              label: raw.label,
            }),
          );
        } else {
          hallucinations.push(
            `Hallucinated fact citation: field "${raw.field_id}" not found in source data`,
          );
        }
        break;
      }

      case 'calc': {
        const calcExists =
          sourcePackage?.calc_metrics?.calc_run_id === raw.calc_run_id;
        if (calcExists || !sourcePackage) {
          validCitations.push(
            buildCalcCitation({
              calc_run_id: raw.calc_run_id ?? 'unknown',
              metric_id: raw.metric_id ?? 'unknown',
              value_cents: (raw.value_cents ?? 0) as MoneyCents,
              label: raw.label,
            }),
          );
        } else {
          hallucinations.push(
            `Hallucinated calc citation: calc_run "${raw.calc_run_id}" not found`,
          );
        }
        break;
      }

      case 'opportunity': {
        const oppExists = sourcePackage?.opportunities?.some(
          (o) => o.opportunity_id === raw.opportunity_id,
        );
        if (oppExists || !sourcePackage) {
          validCitations.push(
            buildOpportunityCitation({
              opportunity_id: raw.opportunity_id ?? 'unknown',
              category: raw.category ?? 'unknown',
              estimated_value: raw.estimated_value,
              label: raw.label,
            }),
          );
        } else {
          hallucinations.push(
            `Hallucinated opportunity citation: "${raw.opportunity_id}" not found`,
          );
        }
        break;
      }

      case 'scenario': {
        const scenarioExists = sourcePackage?.scenarios?.some(
          (s) => s.scenario_id === raw.scenario_id,
        );
        if (scenarioExists || !sourcePackage) {
          validCitations.push(
            buildScenarioCitation({
              scenario_id: raw.scenario_id ?? 'unknown',
              scenario_name: raw.scenario_name ?? 'Unknown Scenario',
              metric_id: raw.metric_id ?? 'unknown',
              value_cents: (raw.value_cents ?? 0) as MoneyCents,
              label: raw.label,
            }),
          );
        } else {
          hallucinations.push(
            `Hallucinated scenario citation: "${raw.scenario_id}" not found`,
          );
        }
        break;
      }

      default:
        hallucinations.push(
          `Unknown citation type: "${raw.type}" for "${raw.label}"`,
        );
    }
  }

  return { validCitations, hallucinations };
}
