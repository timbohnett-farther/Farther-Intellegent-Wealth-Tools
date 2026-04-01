// =============================================================================
// AI Copilot & Citation Layer — Type Definitions
// =============================================================================
//
// Core types for the copilot system: answers, citations, prompt families,
// audience modes, confidence levels, review states, and source packages.
// =============================================================================

import type { MoneyCents, TaxLineRef, TaxYear, FilingStatus, CalcRunStatus } from '../types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * Prompt families define the type of copilot interaction.
 * Each family has its own system prompt, output schema, and audience modifiers.
 */
export type PromptFamily =
  | 'explain_line_item'
  | 'explain_opportunity'
  | 'compare_scenarios'
  | 'draft_client_email'
  | 'draft_cpa_note'
  | 'draft_meeting_prep'
  | 'missing_data_review';

/**
 * Audience modes control the tone and complexity of copilot output.
 * The same underlying analysis is adjusted for different readers.
 */
export type AudienceMode =
  | 'advisor_internal'
  | 'client_friendly'
  | 'cpa_technical'
  | 'compliance_formal'
  | 'executive_summary';

/**
 * Confidence level of a copilot answer.
 * Determined by data completeness, blocker count, and interpretation level.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Review state machine for copilot answers.
 * Answers progress through states with human review gates.
 */
export type ReviewState =
  | 'draft'
  | 'reviewed'
  | 'approved_for_use'
  | 'discarded'
  | 'superseded';

/**
 * Type of citation source for grounding copilot output.
 */
export type CitationType =
  | 'fact'
  | 'calc'
  | 'opportunity'
  | 'scenario'
  | 'authority';

// =====================================================================
// Citation Types
// =====================================================================

/**
 * Base citation interface shared by all citation types.
 */
interface BaseCitation {
  /** Unique identifier for this citation. */
  citation_id: string;
  /** Type of citation source. */
  type: CitationType;
  /** Human-readable label for the citation (displayed in footnotes). */
  label: string;
  /** Whether this citation was validated against known sources. */
  verified: boolean;
}

/**
 * Citation referencing a household fact (extracted field value).
 */
export interface FactCitation extends BaseCitation {
  type: 'fact';
  /** The extracted field value being cited. */
  field_id: string;
  /** Tax line reference for the cited field. */
  tax_line_ref: TaxLineRef;
  /** The value being cited (in cents). */
  value_cents: MoneyCents;
}

/**
 * Citation referencing a computation result (calc run metric).
 */
export interface CalcCitation extends BaseCitation {
  type: 'calc';
  /** CalcRun that produced this value. */
  calc_run_id: string;
  /** Metric identifier within the calc run. */
  metric_id: string;
  /** The computed value (in cents). */
  value_cents: MoneyCents;
}

/**
 * Citation referencing a detected opportunity.
 */
export interface OpportunityCitation extends BaseCitation {
  type: 'opportunity';
  /** Opportunity ID being cited. */
  opportunity_id: string;
  /** Opportunity category. */
  category: string;
  /** Estimated value (in dollars). */
  estimated_value?: number;
}

/**
 * Citation referencing a scenario comparison.
 */
export interface ScenarioCitation extends BaseCitation {
  type: 'scenario';
  /** Scenario ID being cited. */
  scenario_id: string;
  /** Scenario name. */
  scenario_name: string;
  /** Key metric being compared. */
  metric_id: string;
  /** Value in the cited scenario (in cents). */
  value_cents: MoneyCents;
}

/**
 * Citation referencing an authoritative tax source (IRS publication, etc.).
 */
export interface AuthorityCitation extends BaseCitation {
  type: 'authority';
  /** Source identifier from the knowledge base. */
  source_id: string;
  /** Full title of the source (e.g., "IRS Publication 590-A"). */
  source_title: string;
  /** Section or chapter within the source. */
  section?: string;
  /** URL for the authoritative source. */
  url?: string;
  /** Direct quote from the source. */
  quote?: string;
}

/** Union of all citation types. */
export type CopilotCitation =
  | FactCitation
  | CalcCitation
  | OpportunityCitation
  | ScenarioCitation
  | AuthorityCitation;

// =====================================================================
// Confidence Factors
// =====================================================================

/**
 * Factors used to compute confidence level for a copilot answer.
 */
export interface ConfidenceFactors {
  /** Percentage of expected data fields that are present (0-100). */
  data_completeness_pct: number;
  /** Number of blocking issues (missing critical fields, stale data). */
  blocker_count: number;
  /** How much interpretation was required beyond simple data reporting. */
  interpretation_level: 'factual' | 'analytical' | 'speculative';
  /** Whether all citations were validated against known sources. */
  all_citations_verified: boolean;
  /** Number of hallucinations detected and removed. */
  hallucination_count: number;
}

// =====================================================================
// Source Package
// =====================================================================

/**
 * Assembled context package passed to the AI model.
 * Contains all relevant data for generating a copilot answer.
 */
export interface SourcePackage {
  /** Household facts (extracted field values). */
  household: {
    household_id: string;
    display_name: string;
    primary_state?: string;
    tax_year: TaxYear;
    filing_status?: FilingStatus;
    persons: Array<{
      person_id: string;
      first_name: string;
      last_name: string;
      dob?: string;
    }>;
  };
  /** Extracted field values keyed by tax line ref. */
  extracted_fields: Array<{
    field_id: string;
    tax_line_ref: TaxLineRef;
    value_cents?: MoneyCents;
    value_text?: string;
    confidence: number;
  }>;
  /** Most recent calc run metrics. */
  calc_metrics?: {
    calc_run_id: string;
    scenario_id: string;
    status: CalcRunStatus;
    metrics: Record<string, MoneyCents>;
  };
  /** Detected opportunities for this household. */
  opportunities: Array<{
    opportunity_id: string;
    category: string;
    title: string;
    summary: string;
    estimated_value?: number;
    confidence: string;
    priority: string;
  }>;
  /** Available scenarios with key metrics. */
  scenarios: Array<{
    scenario_id: string;
    name: string;
    is_baseline: boolean;
    metrics?: Record<string, MoneyCents>;
  }>;
  /** Policy data for the tax year. */
  policy_summary?: {
    tax_year: TaxYear;
    standard_deduction?: Record<string, MoneyCents>;
  };
  /** SHA-256 hash of this package for staleness detection. */
  upstream_hash: string;
}

// =====================================================================
// Copilot Answer
// =====================================================================

/**
 * A copilot answer is the core output of the AI copilot system.
 * It contains the AI-generated text, citations, confidence, and review state.
 */
export interface CopilotAnswer {
  /** UUID v4 primary key. */
  answer_id: string;
  /** FK to Firm. */
  firm_id: string;
  /** FK to Household this answer pertains to. */
  household_id: string;
  /** Tax year context. */
  tax_year: TaxYear;
  /** Prompt family that generated this answer. */
  prompt_family: PromptFamily;
  /** Audience mode used for tone/complexity. */
  audience: AudienceMode;
  /** The user's original question or request. */
  user_query: string;
  /** AI-generated answer text (markdown). */
  answer_text: string;
  /** Citations grounding the answer in real data. */
  citations: CopilotCitation[];
  /** Confidence level of the answer. */
  confidence: ConfidenceLevel;
  /** Detailed confidence factors. */
  confidence_factors: ConfidenceFactors;
  /** Current review state. */
  review_state: ReviewState;
  /** User who last reviewed this answer. */
  reviewed_by?: string;
  /** ISO 8601 timestamp of last review. */
  reviewed_at?: string;
  /** Reviewer notes. */
  review_notes?: string;
  /** Formatted output for draft families. */
  formatted_output?: EmailDraft | CpaNote | MeetingPrep | MissingDataReport;
  /** SHA-256 hash of the upstream source package at generation time. */
  upstream_hash: string;
  /** Whether this answer is stale (upstream data changed). */
  is_stale: boolean;
  /** Version of the prompt template used. */
  prompt_version: string;
  /** AI model used for generation. */
  model_id: string;
  /** Token usage for this generation. */
  token_usage: {
    input_tokens: number;
    output_tokens: number;
  };
  /** User who requested this answer. */
  created_by: string;
  /** ISO 8601 timestamp of creation. */
  created_at: string;
  /** ISO 8601 timestamp of last update. */
  updated_at: string;
}

// =====================================================================
// Draft Output Types
// =====================================================================

/**
 * Formatted email draft for client communication.
 */
export interface EmailDraft {
  kind: 'email_draft';
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  disclaimer: string;
}

/**
 * Formatted CPA note for professional communication.
 */
export interface CpaNote {
  kind: 'cpa_note';
  subject: string;
  context: string;
  key_figures: Array<{ label: string; value: string; source: string }>;
  action_items: string[];
  technical_notes: string;
}

/**
 * Formatted meeting preparation document.
 */
export interface MeetingPrep {
  kind: 'meeting_prep';
  meeting_title: string;
  agenda_items: string[];
  talking_points: Array<{ topic: string; detail: string; key_number?: string }>;
  key_numbers: Array<{ label: string; value: string }>;
  open_questions: string[];
}

/**
 * Missing data report identifying gaps in household data.
 */
export interface MissingDataReport {
  kind: 'missing_data_report';
  completeness_pct: number;
  critical_gaps: Array<{
    field: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    suggested_source: string;
  }>;
  optional_gaps: Array<{
    field: string;
    description: string;
    benefit: string;
  }>;
  recommendations: string[];
}

// =====================================================================
// Request / Response Types
// =====================================================================

/**
 * Request to ask the copilot a question or generate a draft.
 */
export interface CopilotAskRequest {
  /** Household to generate answer for. */
  household_id: string;
  /** Tax year context. */
  tax_year: number;
  /** Prompt family to use. */
  prompt_family: PromptFamily;
  /** Target audience for output tone. */
  audience: AudienceMode;
  /** User's question or request. */
  user_query: string;
  /** Optional: specific scenario ID for comparison prompts. */
  scenario_id?: string;
  /** Optional: specific opportunity ID for explain prompts. */
  opportunity_id?: string;
  /** Optional: specific calc line ref for line item explains. */
  tax_line_ref?: string;
}

/**
 * Response from the copilot ask endpoint.
 */
export type CopilotAskResponse = CopilotAnswer;

/**
 * Request to update the review state of an answer.
 */
export interface CopilotAnswerUpdateRequest {
  /** New review state. */
  review_state: ReviewState;
  /** Reviewer notes (required for some transitions). */
  review_notes?: string;
}

/**
 * Query parameters for listing copilot answers.
 */
export interface CopilotListQuery {
  /** Filter by household. */
  household_id?: string;
  /** Filter by prompt family. */
  prompt_family?: PromptFamily;
  /** Filter by review state. */
  review_state?: ReviewState;
  /** Maximum results to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}

// =====================================================================
// AI Client Types
// =====================================================================

/**
 * Raw response from the AI model.
 */
export interface CopilotAiResponse {
  /** Parsed JSON output from the model. */
  content: {
    answer_text: string;
    citations: Array<{
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
    }>;
    formatted_output?: Record<string, unknown>;
  };
  /** Model used for generation. */
  model_id: string;
  /** Token usage. */
  token_usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
