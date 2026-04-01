// =============================================================================
// Deliverables & Reporting Engine — Template Registry
// =============================================================================
//
// Built-in template definitions for all 8 deliverable types.
// Each template defines section blueprints, required sources, and policies.
// =============================================================================

import type {
  DeliverableTemplate,
  DeliverableType,
  DeliverableAudienceMode,
} from './types';

// =====================================================================
// Template Registry
// =====================================================================

const TEMPLATES: DeliverableTemplate[] = [
  // ---- Client Tax Summary ----
  {
    templateId: 'client-tax-summary-v1',
    deliverableType: 'client_tax_summary',
    audienceMode: 'client',
    name: 'Client Tax Summary (Client-Friendly)',
    version: '1.0.0',
    description: 'Simplified tax summary for client review and planning discussions.',
    requiredSourceTypes: ['facts', 'calculations'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Your Tax Situation at a Glance',
        required: true,
        sourcePriority: ['calculations', 'facts'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'narrative',
        title: 'Understanding Your Tax Return',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'opportunity',
        title: 'Potential Tax-Saving Opportunities',
        required: false,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'assumptions',
        title: 'Key Assumptions',
        required: true,
        sourcePriority: ['facts'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'disclaimer',
        required: true,
        sourcePriority: [],
      },
    ],
    disclaimerPolicy: 'always_include',
    appendixPolicy: 'conditional',
    enabled: true,
  },

  // ---- Scenario Comparison ----
  {
    templateId: 'scenario-comparison-v1',
    deliverableType: 'scenario_comparison',
    audienceMode: 'advisor',
    name: 'Scenario Comparison (Advisor Internal)',
    version: '1.0.0',
    description: 'Side-by-side comparison of multiple tax scenarios with detailed metrics.',
    requiredSourceTypes: ['scenarios', 'calculations'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Scenario Overview',
        required: true,
        sourcePriority: ['scenarios'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'comparison_table',
        title: 'Side-by-Side Comparison',
        required: true,
        sourcePriority: ['scenarios', 'calculations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'narrative',
        title: 'Analysis & Insights',
        required: true,
        sourcePriority: ['scenarios', 'calculations', 'approved_ai_answers'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'recommendation',
        title: 'Recommendation',
        required: false,
        sourcePriority: ['scenarios', 'opportunities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'assumptions',
        title: 'Assumptions & Limitations',
        required: true,
        sourcePriority: ['scenarios', 'facts'],
        audienceRenderingMode: 'technical',
      },
    ],
    disclaimerPolicy: 'conditional',
    appendixPolicy: 'always_include',
    enabled: true,
  },

  // ---- Annual Tax Letter ----
  {
    templateId: 'annual-tax-letter-v1',
    deliverableType: 'annual_tax_letter',
    audienceMode: 'client',
    name: 'Annual Tax Letter (Client)',
    version: '1.0.0',
    description: 'Year-end tax planning letter for clients with action items and planning opportunities.',
    requiredSourceTypes: ['facts', 'opportunities'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Executive Summary',
        required: true,
        sourcePriority: ['calculations', 'facts'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'narrative',
        title: 'Your Tax Year in Review',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'opportunity',
        title: 'Year-End Tax Planning Opportunities',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'implementation_steps',
        title: 'Recommended Actions',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'warnings',
        title: 'Important Considerations',
        required: false,
        sourcePriority: ['warnings'],
        audienceRenderingMode: 'simplified',
      },
      {
        blockType: 'disclaimer',
        required: true,
        sourcePriority: [],
      },
    ],
    disclaimerPolicy: 'always_include',
    appendixPolicy: 'never',
    enabled: true,
  },

  // ---- CPA Memo ----
  {
    templateId: 'cpa-memo-v1',
    deliverableType: 'cpa_memo',
    audienceMode: 'cpa',
    name: 'CPA Memo (Technical)',
    version: '1.0.0',
    description: 'Technical tax memo for CPA coordination with detailed calculations and assumptions.',
    requiredSourceTypes: ['facts', 'calculations'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Memo Summary',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'narrative',
        title: 'Tax Situation & Analysis',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'comparison_table',
        title: 'Key Figures',
        required: true,
        sourcePriority: ['calculations', 'facts'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'assumptions',
        title: 'Assumptions & Data Sources',
        required: true,
        sourcePriority: ['facts', 'authorities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'warnings',
        title: 'Data Limitations',
        required: false,
        sourcePriority: ['warnings', 'limitations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'appendix',
        title: 'Supporting Documentation',
        required: false,
        sourcePriority: ['authorities', 'calculations'],
        audienceRenderingMode: 'technical',
      },
    ],
    disclaimerPolicy: 'conditional',
    appendixPolicy: 'conditional',
    enabled: true,
  },

  // ---- Advisor Internal Summary ----
  {
    templateId: 'advisor-internal-summary-v1',
    deliverableType: 'advisor_internal_summary',
    audienceMode: 'advisor',
    name: 'Advisor Internal Summary',
    version: '1.0.0',
    description: 'Comprehensive internal summary with all analysis, opportunities, and action items.',
    requiredSourceTypes: ['facts', 'calculations', 'opportunities'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Household Tax Profile',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'narrative',
        title: 'Detailed Analysis',
        required: true,
        sourcePriority: ['facts', 'calculations', 'approved_ai_answers'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'opportunity',
        title: 'Planning Opportunities',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'recommendation',
        title: 'Strategic Recommendations',
        required: true,
        sourcePriority: ['opportunities', 'scenarios'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'implementation_steps',
        title: 'Implementation Roadmap',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'warnings',
        title: 'Risks & Limitations',
        required: false,
        sourcePriority: ['warnings', 'limitations'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'appendix',
        title: 'Technical Appendix',
        required: false,
        sourcePriority: ['calculations', 'authorities'],
        audienceRenderingMode: 'technical',
      },
    ],
    disclaimerPolicy: 'never',
    appendixPolicy: 'always_include',
    enabled: true,
  },

  // ---- Meeting Prep Brief ----
  {
    templateId: 'meeting-prep-brief-v1',
    deliverableType: 'meeting_prep_brief',
    audienceMode: 'advisor',
    name: 'Meeting Prep Brief (Advisor)',
    version: '1.0.0',
    description: 'Quick reference guide for client meetings with talking points and key numbers.',
    requiredSourceTypes: ['facts', 'calculations'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Meeting Overview',
        required: true,
        sourcePriority: ['facts', 'calculations'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'narrative',
        title: 'Key Discussion Points',
        required: true,
        sourcePriority: ['opportunities', 'approved_ai_answers'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'comparison_table',
        title: 'Quick Reference Numbers',
        required: true,
        sourcePriority: ['calculations', 'facts'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'implementation_steps',
        title: 'Action Items for Discussion',
        required: false,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'executive',
      },
    ],
    disclaimerPolicy: 'never',
    appendixPolicy: 'never',
    enabled: true,
  },

  // ---- Implementation Checklist ----
  {
    templateId: 'implementation-checklist-v1',
    deliverableType: 'implementation_checklist',
    audienceMode: 'advisor',
    name: 'Implementation Checklist (Advisor)',
    version: '1.0.0',
    description: 'Step-by-step implementation checklist for approved tax strategies.',
    requiredSourceTypes: ['opportunities'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Implementation Overview',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'implementation_steps',
        title: 'Implementation Steps',
        required: true,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'technical',
      },
      {
        blockType: 'warnings',
        title: 'Key Considerations',
        required: false,
        sourcePriority: ['warnings'],
        audienceRenderingMode: 'technical',
      },
    ],
    disclaimerPolicy: 'never',
    appendixPolicy: 'never',
    enabled: true,
  },

  // ---- Executive Summary ----
  {
    templateId: 'executive-summary-v1',
    deliverableType: 'executive_summary',
    audienceMode: 'executive',
    name: 'Executive Summary (High-Level)',
    version: '1.0.0',
    description: 'High-level executive summary for firm leadership and compliance review.',
    requiredSourceTypes: ['facts', 'calculations'],
    sectionBlueprints: [
      {
        blockType: 'summary',
        title: 'Executive Overview',
        required: true,
        sourcePriority: ['calculations', 'facts'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'narrative',
        title: 'Key Insights',
        required: true,
        sourcePriority: ['opportunities', 'approved_ai_answers'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'comparison_table',
        title: 'Key Metrics',
        required: true,
        sourcePriority: ['calculations'],
        audienceRenderingMode: 'executive',
      },
      {
        blockType: 'recommendation',
        title: 'Strategic Recommendations',
        required: false,
        sourcePriority: ['opportunities'],
        audienceRenderingMode: 'executive',
      },
    ],
    disclaimerPolicy: 'conditional',
    appendixPolicy: 'never',
    enabled: true,
  },
];

// =====================================================================
// Template Lookup Helpers
// =====================================================================

/**
 * Retrieves a template by its unique ID.
 */
export function getTemplate(templateId: string): DeliverableTemplate | undefined {
  return TEMPLATES.find((t) => t.templateId === templateId);
}

/**
 * Retrieves the active template for a given deliverable type + audience mode.
 * Returns the first enabled template matching the criteria.
 */
export function getActiveTemplate(
  deliverableType: DeliverableType,
  audienceMode: DeliverableAudienceMode
): DeliverableTemplate | undefined {
  return TEMPLATES.find(
    (t) => t.deliverableType === deliverableType && t.audienceMode === audienceMode && t.enabled
  );
}

/**
 * Lists all registered templates, optionally filtered by enabled status.
 */
export function listTemplates(filters?: {
  deliverableType?: DeliverableType;
  audienceMode?: DeliverableAudienceMode;
  enabledOnly?: boolean;
}): DeliverableTemplate[] {
  let result = TEMPLATES;

  if (filters?.deliverableType) {
    result = result.filter((t) => t.deliverableType === filters.deliverableType);
  }

  if (filters?.audienceMode) {
    result = result.filter((t) => t.audienceMode === filters.audienceMode);
  }

  if (filters?.enabledOnly) {
    result = result.filter((t) => t.enabled);
  }

  return result;
}

/**
 * Registers a new custom template (for advanced use cases).
 * Throws if a template with the same ID already exists.
 */
export function registerTemplate(template: DeliverableTemplate): void {
  const existing = getTemplate(template.templateId);
  if (existing) {
    throw new Error(`Template with ID "${template.templateId}" already exists.`);
  }
  TEMPLATES.push(template);
}
