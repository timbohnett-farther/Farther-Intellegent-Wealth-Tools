/**
 * Zod Schemas for Scenario Planning API
 *
 * Type-safe validation for all API requests and responses
 */

import { z } from 'zod';

// ==================== SCENARIO OVERRIDE ====================

export const ScenarioOverrideSchema = z.object({
  field: z.string(),
  operator: z.enum(['replace', 'add', 'subtract', 'toggle']),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  reason: z.string(),
  sourceType: z.enum(['manual', 'template', 'opportunity_seed']),
  createdBy: z.string(),
  createdAt: z.string(),
});

// ==================== SCENARIO ASSUMPTION ====================

export const ScenarioAssumptionSchema = z.object({
  assumptionId: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  units: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

// ==================== CREATE SCENARIO ====================

export const CreateScenarioRequestSchema = z.object({
  householdId: z.string(),
  taxYear: z.number().int().min(2020).max(2030),
  baselineSnapshotId: z.string(),
  baselineRunId: z.string(),
  scenarioType: z.enum([
    'roth_conversion',
    'charitable',
    'capital_gains',
    'payments',
    'retirement_income',
    'transition',
    'custom',
  ]),
  originatingOpportunityId: z.string().optional(),
  overrides: z.array(ScenarioOverrideSchema),
  assumptions: z.array(ScenarioAssumptionSchema).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateScenarioRequestSchemaType = z.infer<typeof CreateScenarioRequestSchema>;

// ==================== UPDATE SCENARIO ====================

export const UpdateScenarioRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  overrides: z.array(ScenarioOverrideSchema).optional(),
  assumptions: z.array(ScenarioAssumptionSchema).optional(),
  status: z.enum([
    'draft',
    'ready_for_review',
    'reviewed',
    'recommended',
    'presented',
    'archived',
    'superseded',
  ]).optional(),
});

export type UpdateScenarioRequestSchemaType = z.infer<typeof UpdateScenarioRequestSchema>;

// ==================== COMPARE SCENARIOS ====================

export const CompareScenariosRequestSchema = z.object({
  householdId: z.string(),
  taxYear: z.number().int().min(2020).max(2030),
  baselineScenarioId: z.string(),
  comparisonScenarioIds: z.array(z.string()).min(1).max(5),
});

export type CompareScenariosRequestSchemaType = z.infer<typeof CompareScenariosRequestSchema>;

// ==================== RECOMMEND SCENARIO ====================

export const RecommendScenarioRequestSchema = z.object({
  reason: z.string().optional(),
});

export type RecommendScenarioRequestSchemaType = z.infer<typeof RecommendScenarioRequestSchema>;

// ==================== ARCHIVE SCENARIO ====================

export const ArchiveScenarioRequestSchema = z.object({
  reason: z.string(),
});

export type ArchiveScenarioRequestSchemaType = z.infer<typeof ArchiveScenarioRequestSchema>;

// ==================== CREATE FROM TEMPLATE ====================

export const CreateScenarioFromTemplateRequestSchema = z.object({
  householdId: z.string(),
  taxYear: z.number().int().min(2020).max(2030),
  baselineSnapshotId: z.string(),
  baselineRunId: z.string(),
  templateId: z.string(),
  templateInputs: z.record(z.string(), z.any()),
  originatingOpportunityId: z.string().optional(),
});

export type CreateScenarioFromTemplateRequestSchemaType = z.infer<typeof CreateScenarioFromTemplateRequestSchema>;

// ==================== API ERROR ====================

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
