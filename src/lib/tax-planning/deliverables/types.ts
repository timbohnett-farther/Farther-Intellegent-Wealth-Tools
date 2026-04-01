// =============================================================================
// Deliverables & Reporting Engine — Type Definitions
// =============================================================================
//
// Core types for the deliverables system: templates, section blocks, source
// packages, deliverable lifecycle, export formats, and validation rules.
// =============================================================================

import type { MoneyCents, TaxYear, FilingStatus, CalcRunStatus } from '../types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * Deliverable types define the kind of report or document being generated.
 * Each type has its own template, section blueprint, and audience modifiers.
 */
export type DeliverableType =
  | 'client_tax_summary'
  | 'scenario_comparison'
  | 'annual_tax_letter'
  | 'cpa_memo'
  | 'advisor_internal_summary'
  | 'meeting_prep_brief'
  | 'implementation_checklist'
  | 'executive_summary';

/**
 * Audience modes control the tone, complexity, and section selection.
 * The same underlying data is formatted differently for different readers.
 */
export type DeliverableAudienceMode =
  | 'client'
  | 'advisor'
  | 'cpa'
  | 'compliance'
  | 'executive';

/**
 * Status lifecycle for a deliverable.
 * Deliverables progress through states with human review gates.
 */
export type DeliverableStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'exported'
  | 'archived'
  | 'superseded';

/**
 * Section block types define the structure of a deliverable section.
 * Each block type has its own builder function and rendering template.
 */
export type DeliverableBlockType =
  | 'summary'
  | 'comparison_table'
  | 'opportunity'
  | 'recommendation'
  | 'narrative'
  | 'assumptions'
  | 'warnings'
  | 'disclaimer'
  | 'implementation_steps'
  | 'appendix';

// =====================================================================
// Section Blocks
// =====================================================================

/**
 * A section block is a structural unit within a deliverable.
 * Multiple blocks are assembled to create the final document.
 */
export interface DeliverableSectionBlock {
  /** Unique identifier for this block. */
  blockId: string;
  /** Type of this block (determines rendering template). */
  blockType: DeliverableBlockType;
  /** Optional heading for this section. */
  title?: string;
  /** Structured content for this block (type varies by blockType). */
  content: Record<string, unknown>;
  /** Source object references this block depends on (for staleness detection). */
  sourceRefs: string[];
  /** Display order within the deliverable. */
  order: number;
}

/**
 * A section blueprint defines how a section block should be built.
 * Templates contain arrays of blueprints that drive assembly.
 */
export interface DeliverableSectionBlueprint {
  /** Type of block to generate. */
  blockType: DeliverableBlockType;
  /** Optional title for this section (can be overridden by builder). */
  title?: string;
  /** Whether this section is required for the deliverable to be valid. */
  required: boolean;
  /** Priority order of source types when building this block. */
  sourcePriority: string[];
  /** Optional audience-specific rendering mode. */
  audienceRenderingMode?: 'simplified' | 'technical' | 'executive';
}

// =====================================================================
// Templates
// =====================================================================

/**
 * A deliverable template defines the structure and assembly rules for a
 * specific deliverable type + audience combination.
 */
export interface DeliverableTemplate {
  /** Unique template identifier. */
  templateId: string;
  /** Deliverable type this template generates. */
  deliverableType: DeliverableType;
  /** Target audience mode. */
  audienceMode: DeliverableAudienceMode;
  /** Human-readable template name. */
  name: string;
  /** Template version string (semver). */
  version: string;
  /** Description of this template's purpose. */
  description: string;
  /** Source types required to assemble this deliverable. */
  requiredSourceTypes: string[];
  /** Section blueprints in display order. */
  sectionBlueprints: DeliverableSectionBlueprint[];
  /** Disclaimer policy for this template. */
  disclaimerPolicy: 'always_include' | 'conditional' | 'never';
  /** Appendix policy for this template. */
  appendixPolicy: 'always_include' | 'conditional' | 'never';
  /** Whether this template is currently enabled. */
  enabled: boolean;
}

// =====================================================================
// Deliverable
// =====================================================================

/**
 * A deliverable is a generated report or document assembled from source data.
 * It contains section blocks, metadata, and lifecycle state.
 */
export interface Deliverable {
  /** UUID v4 primary key. */
  deliverableId: string;
  /** FK to Household this deliverable pertains to. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Type of deliverable. */
  deliverableType: DeliverableType;
  /** Audience mode used for assembly. */
  audienceMode: DeliverableAudienceMode;
  /** Human-readable title for this deliverable. */
  title: string;
  /** FK to Template used for assembly. */
  templateId: string;
  /** Template version at time of assembly. */
  templateVersion: string;
  /** Source object references (facts, calcs, opportunities, scenarios). */
  sourceObjectRefs: string[];
  /** Assembled section blocks in display order. */
  sectionBlocks: DeliverableSectionBlock[];
  /** Current lifecycle status. */
  status: DeliverableStatus;
  /** Version number (incremented on update). */
  version: number;
  /** User who approved this deliverable. */
  approvedBy?: string;
  /** ISO 8601 timestamp of approval. */
  approvedAt?: string;
  /** Reviewer notes. */
  reviewNote?: string;
  /** User who created this deliverable. */
  createdBy: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
}

// =====================================================================
// Export
// =====================================================================

/**
 * Export types define the output format for a deliverable.
 */
export type DeliverableExportType =
  | 'pdf'
  | 'docx'
  | 'email_draft'
  | 'crm_note'
  | 'archive';

/**
 * A deliverable export represents a single export event with metadata.
 */
export interface DeliverableExport {
  /** UUID v4 primary key. */
  exportId: string;
  /** FK to Deliverable being exported. */
  deliverableId: string;
  /** Export format. */
  exportType: DeliverableExportType;
  /** User who triggered this export. */
  exportedBy: string;
  /** ISO 8601 timestamp of export. */
  exportedAt: string;
  /** Export-specific metadata (file path, email recipient, etc.). */
  exportMetadata: Record<string, unknown>;
}

// =====================================================================
// Source Package
// =====================================================================

/**
 * A source package assembles all the data needed to build a deliverable.
 * It contains facts, calculations, opportunities, scenarios, and AI answers.
 */
export interface DeliverableSourcePackage {
  /** Unique package identifier. */
  packageId: string;
  /** FK to Household. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Deliverable type this package is for. */
  deliverableType: DeliverableType;
  /** Audience mode this package is for. */
  audienceMode: DeliverableAudienceMode;
  /** Extracted field values (facts). */
  facts: Array<{
    fieldId: string;
    taxLineRef: string;
    valueCents?: MoneyCents;
    valueText?: string;
    confidence: number;
  }>;
  /** Calculation run outputs. */
  calculations: Array<{
    calcRunId: string;
    scenarioId: string;
    status: CalcRunStatus;
    metrics: Record<string, MoneyCents>;
  }>;
  /** Detected opportunities. */
  opportunities: Array<{
    opportunityId: string;
    category: string;
    title: string;
    summary: string;
    estimatedValue?: number;
    confidence: string;
    priority: string;
  }>;
  /** Available scenarios. */
  scenarios: Array<{
    scenarioId: string;
    name: string;
    isBaseline: boolean;
    metrics?: Record<string, MoneyCents>;
  }>;
  /** Approved AI copilot answers. */
  approvedAiAnswers: Array<{
    answerId: string;
    promptFamily: string;
    answerText: string;
    confidence: string;
  }>;
  /** Authoritative tax sources. */
  authorities: Array<{
    sourceId: string;
    sourceTitle: string;
    section?: string;
    url?: string;
  }>;
  /** Warnings and limitations. */
  warnings: string[];
  /** Known data limitations. */
  limitations: string[];
}

// =====================================================================
// Validation
// =====================================================================

/**
 * Validation result status codes.
 */
export type DeliverableValidationStatus =
  | 'pass'
  | 'pass_with_warning'
  | 'soft_fail_requires_review'
  | 'hard_fail_block_creation';

/**
 * Validation result for a deliverable or source package.
 */
export interface DeliverableValidationResult {
  /** Overall validation status. */
  status: DeliverableValidationStatus;
  /** Non-blocking warnings (e.g. missing optional sections). */
  warnings: string[];
  /** Blocking errors (e.g. missing required sections). */
  blockers: string[];
}

// =====================================================================
// Request / Response Types
// =====================================================================

/**
 * Request to create a new deliverable.
 */
export interface DeliverableCreateRequest {
  /** Household to create deliverable for. */
  householdId: string;
  /** Tax year context. */
  taxYear: number;
  /** Deliverable type to generate. */
  deliverableType: DeliverableType;
  /** Target audience mode. */
  audienceMode: DeliverableAudienceMode;
  /** Optional: specific template ID (auto-selected if omitted). */
  templateId?: string;
  /** Optional: human-readable title (auto-generated if omitted). */
  title?: string;
}

/**
 * Request to update an existing deliverable.
 */
export interface DeliverableUpdateRequest {
  /** New title (optional). */
  title?: string;
  /** New section blocks (replaces existing). */
  sectionBlocks?: DeliverableSectionBlock[];
  /** New review note. */
  reviewNote?: string;
}

/**
 * Request to approve a deliverable.
 */
export interface DeliverableApproveRequest {
  /** Approval notes. */
  approvalNotes?: string;
}

/**
 * Request to export a deliverable.
 */
export interface DeliverableExportRequest {
  /** Export format. */
  exportType: DeliverableExportType;
  /** Export options (email recipient, file path, etc.). */
  options?: Record<string, unknown>;
}

/**
 * Request to duplicate a deliverable.
 */
export interface DeliverableDuplicateRequest {
  /** New title for the duplicate. */
  title?: string;
  /** New audience mode (optional). */
  audienceMode?: DeliverableAudienceMode;
}

/**
 * Query parameters for listing deliverables.
 */
export interface DeliverableListQuery {
  /** Filter by household. */
  householdId?: string;
  /** Filter by tax year. */
  taxYear?: number;
  /** Filter by deliverable type. */
  deliverableType?: DeliverableType;
  /** Filter by status. */
  status?: DeliverableStatus;
  /** Filter by audience mode. */
  audienceMode?: DeliverableAudienceMode;
  /** Maximum results to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}
