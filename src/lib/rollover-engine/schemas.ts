// =============================================================================
// Rollover Insight Engine — Zod Validation Schemas
// =============================================================================

import { z } from 'zod';
import {
  PlanType,
  AnalysisStatus,
  NarrativeTemplate,
  PlanSizeTier,
} from './types';

// ==================== Shared Validators ====================

const einSchema = z.string().regex(/^\d{2}-\d{7}$/, 'EIN must be in XX-XXXXXXX format');

const stateSchema = z.string().length(2, 'State must be a 2-letter code').toUpperCase();

// ==================== Analysis Schemas ====================

export const CreateAnalysisSchema = z.object({
  household_id: z.string().min(1, 'household_id is required'),
  client_name: z.string().min(1, 'client_name is required').max(200),
  plan_id: z.string().optional(),
  plan_ein: einSchema.optional(),
  plan_name: z.string().max(300).optional(),
  participant_balance_cents: z.number().int().min(0),
  participant_age: z.number().int().min(18).max(120),
  years_of_service: z.number().int().min(0).max(80),
  retirement_target_age: z.number().int().min(50).max(120).optional(),
  state_of_residence: stateSchema,
  has_outstanding_loan: z.boolean().optional().default(false),
  outstanding_loan_cents: z.number().int().min(0).optional().default(0),
  has_employer_stock: z.boolean().optional().default(false),
  employer_stock_cost_basis_cents: z.number().int().min(0).optional().default(0),
  narrative_template: z.nativeEnum(NarrativeTemplate).optional(),
  notes: z.string().max(2000).optional().default(''),
});

export type CreateAnalysisInput = z.infer<typeof CreateAnalysisSchema>;

export const UpdateAnalysisSchema = z.object({
  status: z.nativeEnum(AnalysisStatus).optional(),
  participant_balance_cents: z.number().int().min(0).optional(),
  participant_age: z.number().int().min(18).max(120).optional(),
  years_of_service: z.number().int().min(0).max(80).optional(),
  retirement_target_age: z.number().int().min(50).max(120).optional(),
  state_of_residence: stateSchema.optional(),
  has_outstanding_loan: z.boolean().optional(),
  outstanding_loan_cents: z.number().int().min(0).optional(),
  has_employer_stock: z.boolean().optional(),
  employer_stock_cost_basis_cents: z.number().int().min(0).optional(),
  narrative_template: z.nativeEnum(NarrativeTemplate).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateAnalysisInput = z.infer<typeof UpdateAnalysisSchema>;

// ==================== List Query Schemas ====================

export const AnalysisListQuerySchema = z.object({
  household_id: z.string().optional(),
  status: z.nativeEnum(AnalysisStatus).optional(),
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

// ==================== Plan Search Schema ====================

export const PlanSearchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(200),
  plan_type: z.nativeEnum(PlanType).optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(50))
    .optional(),
});

// ==================== Benchmark Schemas ====================

export const BenchmarkUpsertSchema = z.object({
  plan_size_tier: z.nativeEnum(PlanSizeTier),
  metric_name: z.string().min(1).max(100),
  percentile_25: z.number().min(0),
  percentile_50: z.number().min(0),
  percentile_75: z.number().min(0),
  percentile_90: z.number().min(0),
  source: z.string().min(1).max(200),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export type BenchmarkUpsertInput = z.infer<typeof BenchmarkUpsertSchema>;

export const BenchmarkListQuerySchema = z.object({
  plan_size_tier: z.nativeEnum(PlanSizeTier).optional(),
  metric_name: z.string().optional(),
});
