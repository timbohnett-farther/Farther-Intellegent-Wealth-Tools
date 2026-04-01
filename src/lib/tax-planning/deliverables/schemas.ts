// =============================================================================
// Deliverables & Reporting Engine — Zod Validation Schemas
// =============================================================================
//
// Request/response validation schemas for all deliverable API endpoints.
// Uses Zod v4 for runtime type checking.
// =============================================================================

import { z } from 'zod';

// =====================================================================
// Enum Schemas
// =====================================================================

const DeliverableTypeSchema = z.enum([
  'client_tax_summary',
  'scenario_comparison',
  'annual_tax_letter',
  'cpa_memo',
  'advisor_internal_summary',
  'meeting_prep_brief',
  'implementation_checklist',
  'executive_summary',
]);

const DeliverableAudienceModeSchema = z.enum([
  'client',
  'advisor',
  'cpa',
  'compliance',
  'executive',
]);

const DeliverableStatusSchema = z.enum([
  'draft',
  'reviewed',
  'approved',
  'exported',
  'archived',
  'superseded',
]);

const DeliverableExportTypeSchema = z.enum([
  'pdf',
  'docx',
  'email_draft',
  'crm_note',
  'archive',
]);

// =====================================================================
// Request Schemas
// =====================================================================

/**
 * Schema for POST /api/v1/deliverables
 */
export const DeliverableCreateRequestSchema = z.object({
  householdId: z.string().min(1, 'householdId is required'),
  taxYear: z.number().int().min(2020).max(2030),
  deliverableType: DeliverableTypeSchema,
  audienceMode: DeliverableAudienceModeSchema,
  templateId: z.string().optional(),
  title: z.string().max(200).optional(),
});

/**
 * Schema for PATCH /api/v1/deliverables/:id
 */
export const DeliverableUpdateRequestSchema = z.object({
  title: z.string().max(200).optional(),
  sectionBlocks: z
    .array(
      z.object({
        blockId: z.string(),
        blockType: z.string(),
        title: z.string().optional(),
        content: z.record(z.string(), z.unknown()),
        sourceRefs: z.array(z.string()),
        order: z.number().int().min(0),
      })
    )
    .optional(),
  reviewNote: z.string().max(2000).optional(),
});

/**
 * Schema for POST /api/v1/deliverables/:id/approve
 */
export const DeliverableApproveRequestSchema = z.object({
  approvalNotes: z.string().max(2000).optional(),
});

/**
 * Schema for POST /api/v1/deliverables/:id/export
 */
export const DeliverableExportRequestSchema = z.object({
  exportType: DeliverableExportTypeSchema,
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for POST /api/v1/deliverables/:id/duplicate
 */
export const DeliverableDuplicateRequestSchema = z.object({
  title: z.string().max(200).optional(),
  audienceMode: DeliverableAudienceModeSchema.optional(),
});

/**
 * Schema for GET /api/v1/deliverables query parameters
 */
export const DeliverableListQuerySchema = z.object({
  householdId: z.string().optional(),
  taxYear: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(2020).max(2030).optional()),
  deliverableType: DeliverableTypeSchema.optional(),
  status: DeliverableStatusSchema.optional(),
  audienceMode: DeliverableAudienceModeSchema.optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(100).optional()),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).optional()),
});

export type DeliverableCreateRequestInput = z.infer<typeof DeliverableCreateRequestSchema>;
export type DeliverableUpdateRequestInput = z.infer<typeof DeliverableUpdateRequestSchema>;
export type DeliverableApproveRequestInput = z.infer<typeof DeliverableApproveRequestSchema>;
export type DeliverableExportRequestInput = z.infer<typeof DeliverableExportRequestSchema>;
export type DeliverableDuplicateRequestInput = z.infer<typeof DeliverableDuplicateRequestSchema>;
export type DeliverableListQueryInput = z.infer<typeof DeliverableListQuerySchema>;
