// =============================================================================
// Analytics, ROI, and Value-of-Advice Dashboard — Zod Schemas
// =============================================================================
//
// Validation schemas for KPI queries, funnel queries, drilldown queries,
// and value-of-advice queries. Used in API routes for input validation.
// =============================================================================

import { z } from 'zod';

// =====================================================================
// KPI Query Schema
// =====================================================================

/**
 * Schema for KPI query parameters.
 * Used to validate GET /api/v1/analytics/kpis requests.
 */
export const kpiQuerySchema = z.object({
  metricId: z.string().min(1, 'metricId required'),
  scopeType: z.enum(['household', 'advisor', 'team', 'office', 'firm']),
  scopeRefId: z.string().min(1, 'scopeRefId required'),
  periodStart: z.string().datetime({ message: 'periodStart must be ISO 8601' }),
  periodEnd: z.string().datetime({ message: 'periodEnd must be ISO 8601' }),
});

export type KPIQueryInput = z.infer<typeof kpiQuerySchema>;

// =====================================================================
// Funnel Query Schema
// =====================================================================

/**
 * Schema for recommendation funnel query parameters.
 * Used to validate GET /api/v1/analytics/funnels/recommendations requests.
 */
export const funnelQuerySchema = z.object({
  firmId: z.string().min(1, 'firmId required'),
  taxYear: z.number().int().min(2000).max(2100),
  periodStart: z.string().datetime({ message: 'periodStart must be ISO 8601' }),
  periodEnd: z.string().datetime({ message: 'periodEnd must be ISO 8601' }),
  householdId: z.string().optional(),
  advisorId: z.string().optional(),
  teamId: z.string().optional(),
  officeId: z.string().optional(),
});

export type FunnelQueryInput = z.infer<typeof funnelQuerySchema>;

// =====================================================================
// Drilldown Query Schema
// =====================================================================

/**
 * Schema for drilldown query parameters.
 * Used to validate GET /api/v1/analytics/drilldown requests.
 */
export const drilldownQuerySchema = z.object({
  metricId: z.string().min(1, 'metricId required'),
  scopeType: z.enum(['household', 'advisor', 'team', 'office', 'firm']),
  scopeRefId: z.string().min(1, 'scopeRefId required'),
  periodStart: z.string().datetime({ message: 'periodStart must be ISO 8601' }),
  periodEnd: z.string().datetime({ message: 'periodEnd must be ISO 8601' }),
  filters: z.record(z.string(), z.unknown()).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

export type DrilldownQueryInput = z.infer<typeof drilldownQuerySchema>;

// =====================================================================
// Value-of-Advice Query Schema
// =====================================================================

/**
 * Schema for value-of-advice query parameters.
 * Used to validate GET /api/v1/analytics/value-of-advice requests.
 */
export const valueQuerySchema = z.object({
  scopeType: z.enum(['household', 'advisor', 'team', 'office', 'firm']),
  scopeRefId: z.string().min(1, 'scopeRefId required'),
  periodStart: z.string().datetime({ message: 'periodStart must be ISO 8601' }),
  periodEnd: z.string().datetime({ message: 'periodEnd must be ISO 8601' }),
});

export type ValueQueryInput = z.infer<typeof valueQuerySchema>;

// =====================================================================
// Workflow Bottleneck Query Schema
// =====================================================================

/**
 * Schema for workflow bottleneck query parameters.
 * Used to validate GET /api/v1/analytics/workflows/bottlenecks requests.
 */
export const bottleneckQuerySchema = z.object({
  scopeType: z.enum(['household', 'advisor', 'team', 'office', 'firm']).optional(),
  scopeRefId: z.string().optional(),
});

export type BottleneckQueryInput = z.infer<typeof bottleneckQuerySchema>;

// =====================================================================
// Dashboard Query Schema
// =====================================================================

/**
 * Schema for dashboard query parameters (advisor, team, firm).
 * Used to validate GET /api/v1/analytics/advisors/[id] etc.
 */
export const dashboardQuerySchema = z.object({
  periodStart: z.string().datetime({ message: 'periodStart must be ISO 8601' }),
  periodEnd: z.string().datetime({ message: 'periodEnd must be ISO 8601' }),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
