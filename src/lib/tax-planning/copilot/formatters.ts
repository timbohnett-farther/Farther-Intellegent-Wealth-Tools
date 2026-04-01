// =============================================================================
// AI Copilot & Citation Layer — Draft Formatters
// =============================================================================
//
// Transforms raw AI output into structured draft objects (email, CPA note,
// meeting prep, missing data report) with consistent formatting and
// required compliance disclaimers.
// =============================================================================

import type {
  CopilotAnswer,
  EmailDraft,
  CpaNote,
  MeetingPrep,
  MissingDataReport,
  SourcePackage,
} from './types';
import { toDollars } from '../types';

// =====================================================================
// Standard Disclaimer
// =====================================================================

const STANDARD_DISCLAIMER =
  'This analysis is for educational and informational purposes only and does not constitute tax, legal, or investment advice. Consult a qualified tax professional before making any tax-related decisions.';

// =====================================================================
// Email Draft Formatter
// =====================================================================

/**
 * Format an email draft from a copilot answer.
 * Ensures all required sections are present with proper formatting.
 */
export function formatEmailDraft(
  answer: CopilotAnswer,
  sourcePackage: SourcePackage,
): EmailDraft {
  // If the AI already produced a structured email, validate and return
  if (answer.formatted_output?.kind === 'email_draft') {
    const draft = answer.formatted_output as EmailDraft;
    return {
      kind: 'email_draft',
      subject: draft.subject || `Tax Planning Update — ${sourcePackage.household.display_name}`,
      greeting: draft.greeting || `Dear ${getClientName(sourcePackage)},`,
      body: draft.body || answer.answer_text,
      closing: draft.closing || 'Please don\'t hesitate to reach out if you have any questions.\n\nBest regards,\nYour Advisory Team',
      disclaimer: draft.disclaimer || STANDARD_DISCLAIMER,
    };
  }

  // Build from answer text
  return {
    kind: 'email_draft',
    subject: `Tax Planning Update — ${sourcePackage.household.display_name}`,
    greeting: `Dear ${getClientName(sourcePackage)},`,
    body: answer.answer_text,
    closing: 'Please don\'t hesitate to reach out if you have any questions. We\'re here to help you make the most of your tax planning opportunities.\n\nBest regards,\nYour Advisory Team',
    disclaimer: STANDARD_DISCLAIMER,
  };
}

// =====================================================================
// CPA Note Formatter
// =====================================================================

/**
 * Format a CPA note from a copilot answer.
 * Includes key figures with sources and action items.
 */
export function formatCpaNote(
  answer: CopilotAnswer,
  sourcePackage: SourcePackage,
): CpaNote {
  // If the AI already produced a structured note, validate and return
  if (answer.formatted_output?.kind === 'cpa_note') {
    const note = answer.formatted_output as CpaNote;
    return {
      kind: 'cpa_note',
      subject: note.subject || `Tax Planning Coordination — ${sourcePackage.household.display_name} (TY ${sourcePackage.household.tax_year})`,
      context: note.context || `Household: ${sourcePackage.household.display_name}, Filing Status: ${sourcePackage.household.filing_status ?? 'Unknown'}`,
      key_figures: Array.isArray(note.key_figures) ? note.key_figures : buildKeyFigures(sourcePackage),
      action_items: Array.isArray(note.action_items) ? note.action_items : [],
      technical_notes: note.technical_notes || answer.answer_text,
    };
  }

  // Build from answer text and source data
  return {
    kind: 'cpa_note',
    subject: `Tax Planning Coordination — ${sourcePackage.household.display_name} (TY ${sourcePackage.household.tax_year})`,
    context: `Household: ${sourcePackage.household.display_name}\nFiling Status: ${sourcePackage.household.filing_status ?? 'Unknown'}\nState: ${sourcePackage.household.primary_state ?? 'Unknown'}`,
    key_figures: buildKeyFigures(sourcePackage),
    action_items: ['Review attached tax planning analysis', 'Confirm figures match filed return', 'Coordinate on identified planning opportunities'],
    technical_notes: answer.answer_text,
  };
}

// =====================================================================
// Meeting Prep Formatter
// =====================================================================

/**
 * Format a meeting preparation document from a copilot answer.
 */
export function formatMeetingPrep(
  answer: CopilotAnswer,
  sourcePackage: SourcePackage,
): MeetingPrep {
  // If the AI already produced a structured prep, validate and return
  if (answer.formatted_output?.kind === 'meeting_prep') {
    const prep = answer.formatted_output as MeetingPrep;
    return {
      kind: 'meeting_prep',
      meeting_title: prep.meeting_title || `Tax Planning Review — ${sourcePackage.household.display_name}`,
      agenda_items: Array.isArray(prep.agenda_items) ? prep.agenda_items : buildDefaultAgenda(sourcePackage),
      talking_points: Array.isArray(prep.talking_points) ? prep.talking_points : [],
      key_numbers: Array.isArray(prep.key_numbers) ? prep.key_numbers : buildKeyNumbers(sourcePackage),
      open_questions: Array.isArray(prep.open_questions) ? prep.open_questions : [],
    };
  }

  // Build from answer text and source data
  return {
    kind: 'meeting_prep',
    meeting_title: `Tax Planning Review — ${sourcePackage.household.display_name}`,
    agenda_items: buildDefaultAgenda(sourcePackage),
    talking_points: [
      { topic: 'Tax Planning Overview', detail: answer.answer_text },
    ],
    key_numbers: buildKeyNumbers(sourcePackage),
    open_questions: [],
  };
}

// =====================================================================
// Missing Data Report Formatter
// =====================================================================

/**
 * Format a missing data report from a copilot answer.
 */
export function formatMissingDataReport(
  answer: CopilotAnswer,
  sourcePackage: SourcePackage,
): MissingDataReport {
  // If the AI already produced a structured report, validate and return
  if (answer.formatted_output?.kind === 'missing_data_report') {
    const report = answer.formatted_output as MissingDataReport;
    return {
      kind: 'missing_data_report',
      completeness_pct: typeof report.completeness_pct === 'number'
        ? report.completeness_pct
        : answer.confidence_factors.data_completeness_pct,
      critical_gaps: Array.isArray(report.critical_gaps) ? report.critical_gaps : [],
      optional_gaps: Array.isArray(report.optional_gaps) ? report.optional_gaps : [],
      recommendations: Array.isArray(report.recommendations) ? report.recommendations : [],
    };
  }

  // Build from confidence factors
  return {
    kind: 'missing_data_report',
    completeness_pct: answer.confidence_factors.data_completeness_pct,
    critical_gaps: buildCriticalGaps(sourcePackage),
    optional_gaps: [],
    recommendations: [
      'Request missing tax documents from the client',
      'Coordinate with CPA for any items from prior year returns',
    ],
  };
}

// =====================================================================
// Helpers
// =====================================================================

function getClientName(sourcePackage: SourcePackage): string {
  const primary = sourcePackage.household.persons[0];
  if (primary) {
    return `${primary.first_name} ${primary.last_name}`;
  }
  return sourcePackage.household.display_name;
}

function buildKeyFigures(
  sourcePackage: SourcePackage,
): CpaNote['key_figures'] {
  const figures: CpaNote['key_figures'] = [];

  for (const field of sourcePackage.extracted_fields) {
    if (field.value_cents != null) {
      figures.push({
        label: field.tax_line_ref as string,
        value: `$${toDollars(field.value_cents).toLocaleString()}`,
        source: `Extracted (confidence: ${(field.confidence * 100).toFixed(0)}%)`,
      });
    }
  }

  if (sourcePackage.calc_metrics) {
    for (const [key, val] of Object.entries(sourcePackage.calc_metrics.metrics)) {
      figures.push({
        label: key,
        value: `$${toDollars(val).toLocaleString()}`,
        source: 'Computed',
      });
    }
  }

  return figures;
}

function buildKeyNumbers(
  sourcePackage: SourcePackage,
): MeetingPrep['key_numbers'] {
  const numbers: MeetingPrep['key_numbers'] = [];

  for (const field of sourcePackage.extracted_fields.slice(0, 6)) {
    if (field.value_cents != null) {
      numbers.push({
        label: field.tax_line_ref as string,
        value: `$${toDollars(field.value_cents).toLocaleString()}`,
      });
    }
  }

  return numbers;
}

function buildDefaultAgenda(sourcePackage: SourcePackage): string[] {
  const items = [
    'Welcome and overview',
    `Review ${sourcePackage.household.tax_year} tax situation`,
  ];

  if (sourcePackage.opportunities.length > 0) {
    items.push(`Discuss ${sourcePackage.opportunities.length} planning opportunities`);
  }

  if (sourcePackage.scenarios.length > 1) {
    items.push('Compare scenario options');
  }

  items.push('Next steps and action items');
  return items;
}

function buildCriticalGaps(
  sourcePackage: SourcePackage,
): MissingDataReport['critical_gaps'] {
  const gaps: MissingDataReport['critical_gaps'] = [];

  if (!sourcePackage.household.filing_status) {
    gaps.push({
      field: 'filing_status',
      description: 'Filing status is not set. Required for all tax calculations.',
      impact: 'high',
      suggested_source: 'Client or prior year return',
    });
  }

  if (sourcePackage.extracted_fields.length === 0) {
    gaps.push({
      field: 'extracted_fields',
      description: 'No tax return data has been extracted. Upload and process a Form 1040.',
      impact: 'high',
      suggested_source: 'Client tax return (Form 1040)',
    });
  }

  if (!sourcePackage.calc_metrics) {
    gaps.push({
      field: 'calc_metrics',
      description: 'No computation has been run. Run the tax engine to generate projections.',
      impact: 'medium',
      suggested_source: 'Run computation engine',
    });
  }

  return gaps;
}
