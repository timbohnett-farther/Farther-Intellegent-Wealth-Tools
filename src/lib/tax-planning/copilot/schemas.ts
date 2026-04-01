// =============================================================================
// AI Copilot & Citation Layer — Zod Validation Schemas
// =============================================================================
//
// Request/response validation schemas for all copilot API endpoints.
// Uses Zod v4 for runtime type checking.
// =============================================================================

import { z } from 'zod';

// =====================================================================
// Enum Schemas
// =====================================================================

const PromptFamilySchema = z.enum([
  'explain_line_item',
  'explain_opportunity',
  'compare_scenarios',
  'draft_client_email',
  'draft_cpa_note',
  'draft_meeting_prep',
  'missing_data_review',
]);

const AudienceModeSchema = z.enum([
  'advisor_internal',
  'client_friendly',
  'cpa_technical',
  'compliance_formal',
  'executive_summary',
]);

const ReviewStateSchema = z.enum([
  'draft',
  'reviewed',
  'approved_for_use',
  'discarded',
  'superseded',
]);

// =====================================================================
// Request Schemas
// =====================================================================

/**
 * Schema for POST /api/v1/copilot/ask
 */
export const CopilotAskRequestSchema = z.object({
  household_id: z.string().min(1, 'household_id is required'),
  tax_year: z.number().int().min(2020).max(2030),
  prompt_family: PromptFamilySchema,
  audience: AudienceModeSchema,
  user_query: z.string().min(1, 'user_query is required').max(2000),
  scenario_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  tax_line_ref: z.string().optional(),
});

/**
 * Schema for PATCH /api/v1/copilot/answers/:id
 */
export const CopilotAnswerUpdateSchema = z.object({
  review_state: ReviewStateSchema,
  review_notes: z.string().max(2000).optional(),
});

/**
 * Schema for GET /api/v1/copilot/answers query parameters
 */
export const CopilotListQuerySchema = z.object({
  household_id: z.string().optional(),
  prompt_family: PromptFamilySchema.optional(),
  review_state: ReviewStateSchema.optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0))
    .optional(),
});

/**
 * Schema for GET/PATCH /api/v1/copilot/admin
 */
export const CopilotAdminConfigSchema = z.object({
  enabled_families: z.array(PromptFamilySchema).optional(),
  enabled_audiences: z.array(AudienceModeSchema).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
  require_review_before_use: z.boolean().optional(),
});

export type CopilotAskRequestInput = z.infer<typeof CopilotAskRequestSchema>;
export type CopilotAnswerUpdateInput = z.infer<typeof CopilotAnswerUpdateSchema>;
export type CopilotListQueryInput = z.infer<typeof CopilotListQuerySchema>;
export type CopilotAdminConfigInput = z.infer<typeof CopilotAdminConfigSchema>;
