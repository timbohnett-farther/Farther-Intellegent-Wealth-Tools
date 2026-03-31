/**
 * Zod Validation Schemas for Opportunity Engine API
 *
 * Defines request/response validation schemas for all API endpoints.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const OpportunityCategorySchema = z.enum([
  'roth_conversion',
  'irmaa',
  'withholding',
  'capital_gains',
  'charitable',
  'qbi',
]);

export const OpportunityStatusSchema = z.enum([
  'detected',
  'reviewed',
  'recommended',
  'in_progress',
  'implemented',
  'dismissed',
]);

export const OpportunityPrioritySchema = z.enum(['high', 'medium', 'low']);

export const OpportunityConfidenceSchema = z.enum(['high', 'medium', 'low']);

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * POST /api/opportunities/detect
 *
 * Detect opportunities for a household based on a calculation run
 */
export const DetectOpportunitiesRequestSchema = z.object({
  calculationRunId: z.string().min(1, 'Calculation run ID is required'),
  options: z
    .object({
      minPriority: z.number().min(0).max(100).optional(),
      maxOpportunities: z.number().int().positive().optional(),
      categories: z.array(OpportunityCategorySchema).optional(),
      sortBy: z
        .array(
          z.object({
            field: z.enum(['finalScore', 'estimatedValue', 'priority', 'detectedAt']),
            direction: z.enum(['asc', 'desc']),
          })
        )
        .optional(),
    })
    .optional(),
});

export type DetectOpportunitiesRequest = z.infer<typeof DetectOpportunitiesRequestSchema>;

/**
 * PATCH /api/opportunities/:id/status
 *
 * Update opportunity status
 */
export const UpdateOpportunityStatusRequestSchema = z.object({
  status: OpportunityStatusSchema,
  notes: z.string().optional(),
  updatedBy: z.string().min(1, 'Updated by user ID is required'),
});

export type UpdateOpportunityStatusRequest = z.infer<typeof UpdateOpportunityStatusRequestSchema>;

/**
 * POST /api/opportunities/:id/ai-summary
 *
 * Generate AI-powered summary for an opportunity
 */
export const GenerateAiSummaryRequestSchema = z.object({
  regenerate: z.boolean().optional().default(false),
  includeComparisons: z.boolean().optional().default(true),
  includeCitations: z.boolean().optional().default(true),
});

export type GenerateAiSummaryRequest = z.infer<typeof GenerateAiSummaryRequestSchema>;

/**
 * GET /api/opportunities
 *
 * List opportunities with filters
 */
export const ListOpportunitiesQuerySchema = z.object({
  householdId: z.string().optional(),
  taxYear: z.coerce.number().int().min(2020).max(2030).optional(),
  category: OpportunityCategorySchema.optional(),
  status: OpportunityStatusSchema.optional(),
  priority: OpportunityPrioritySchema.optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.enum(['finalScore', 'estimatedValue', 'detectedAt', 'priority']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListOpportunitiesQuery = z.infer<typeof ListOpportunitiesQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Evidence Schema
 */
export const EvidenceSchema = z.object({
  type: z.enum(['threshold', 'flag', 'composite', 'calculated']),
  field: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  displayValue: z.string(),
  weight: z.number().min(0).max(1),
  source: z.enum(['tax_output', 'signals', 'household_metadata', 'calculated']),
});

/**
 * Composite Score Schema
 */
export const CompositeScoreSchema = z.object({
  impactScore: z.number().min(0).max(100),
  urgencyScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  complexityScore: z.number().min(0).max(100),
  weights: z.object({
    impact: z.number().min(0).max(1),
    urgency: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    complexity: z.number().min(0).max(1),
  }),
  finalScore: z.number().min(0).max(100),
});

/**
 * Opportunity Schema
 */
export const OpportunitySchema = z.object({
  id: z.string(),
  detectionRunId: z.string(),
  householdId: z.string(),
  taxYear: z.number().int(),
  ruleName: z.string(),
  ruleVersion: z.string(),
  category: OpportunityCategorySchema,
  priority: OpportunityPrioritySchema,
  rank: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  estimatedValue: z.number().optional(),
  confidence: OpportunityConfidenceSchema,
  evidence: z.array(EvidenceSchema),
  score: CompositeScoreSchema,
  finalScore: z.number().min(0).max(100),
  context: z.record(z.any()),
  isDuplicate: z.boolean(),
  duplicateOfId: z.string().optional(),
  suppressionReason: z.string().optional(),
  status: OpportunityStatusSchema,
  statusHistory: z
    .array(
      z.object({
        status: OpportunityStatusSchema,
        timestamp: z.date(),
        updatedBy: z.string(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  detectedAt: z.date(),
  reviewedAt: z.date().optional(),
  implementedAt: z.date().optional(),
  dismissedAt: z.date().optional(),
  dismissedReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Detection Run Schema
 */
export const OpportunityDetectionRunSchema = z.object({
  id: z.string(),
  calculationRunId: z.string(),
  householdId: z.string(),
  taxYear: z.number().int(),
  rulesVersion: z.string(),
  totalRulesEvaluated: z.number().int(),
  totalRulesPassed: z.number().int(),
  opportunitiesDetected: z.number().int(),
  highPriorityCount: z.number().int(),
  totalEstimatedValue: z.number(),
  computeTimeMs: z.number().int(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  error: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
});

/**
 * POST /api/opportunities/detect Response
 */
export const DetectOpportunitiesResponseSchema = z.object({
  detectionRun: OpportunityDetectionRunSchema,
  opportunities: z.array(OpportunitySchema),
});

export type DetectOpportunitiesResponse = z.infer<typeof DetectOpportunitiesResponseSchema>;

/**
 * GET /api/opportunities/:id Response
 */
export const GetOpportunityResponseSchema = z.object({
  opportunity: OpportunitySchema,
});

export type GetOpportunityResponse = z.infer<typeof GetOpportunityResponseSchema>;

/**
 * PATCH /api/opportunities/:id/status Response
 */
export const UpdateOpportunityStatusResponseSchema = z.object({
  opportunity: OpportunitySchema,
});

export type UpdateOpportunityStatusResponse = z.infer<typeof UpdateOpportunityStatusResponseSchema>;

/**
 * POST /api/opportunities/:id/ai-summary Response
 */
export const GenerateAiSummaryResponseSchema = z.object({
  opportunityId: z.string(),
  summary: z.string(),
  citations: z
    .array(
      z.object({
        source: z.string(),
        section: z.string().optional(),
        url: z.string().url().optional(),
      })
    )
    .optional(),
  generatedAt: z.date(),
});

export type GenerateAiSummaryResponse = z.infer<typeof GenerateAiSummaryResponseSchema>;

/**
 * GET /api/opportunities/runs/:runId Response
 */
export const GetDetectionRunResponseSchema = z.object({
  detectionRun: OpportunityDetectionRunSchema,
  opportunities: z.array(OpportunitySchema),
});

export type GetDetectionRunResponse = z.infer<typeof GetDetectionRunResponseSchema>;

/**
 * GET /api/households/:id/opportunities Response
 */
export const ListHouseholdOpportunitiesResponseSchema = z.object({
  opportunities: z.array(OpportunitySchema),
  total: z.number().int(),
  hasMore: z.boolean(),
});

export type ListHouseholdOpportunitiesResponse = z.infer<
  typeof ListHouseholdOpportunitiesResponseSchema
>;

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
  details: z.any().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
