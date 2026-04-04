/**
 * Computation Result Cache
 * Stores and retrieves computation results with input fingerprinting.
 * Enables re-run by storing the exact inputs that produced a result.
 */

import { createHash } from 'crypto';

// ==================== Types ====================

type ComputationType =
  | 'RISK_SCORE'
  | 'FEE_ANALYSIS'
  | 'MONTE_CARLO'
  | 'STRESS_TEST'
  | 'SIDE_BY_SIDE'
  | 'NARRATIVE';

type EntityType = 'PROPOSAL' | 'SCENARIO' | 'ROLLOVER';

interface CacheResultParams {
  computationType: ComputationType;
  entityType: EntityType;
  entityId: string;
  firmId: string;
  inputParams: Record<string, unknown>;
  resultData: Record<string, unknown>;
  resultSummary?: string;
  durationMs?: number;
  provider?: string;
}

export interface CachedResult {
  resultId: string;
  computationType: ComputationType;
  entityType: EntityType;
  entityId: string;
  inputParams: Record<string, unknown>;
  inputHash: string;
  resultData: Record<string, unknown>;
  resultSummary?: string;
  createdAt: Date;
  durationMs?: number;
  provider?: string;
}

interface GetCachedResultParams {
  computationType: ComputationType;
  entityType: EntityType;
  entityId: string;
  inputHash?: string;
}

interface GetResultHistoryParams {
  entityType: EntityType;
  entityId: string;
  computationType?: ComputationType;
}

interface InvalidateResultsParams {
  entityType: EntityType;
  entityId: string;
}

// ==================== In-Memory Cache Store ====================
// TODO: Migrate to Prisma ComputationResult model

const cache = new Map<string, CachedResult>();

// ==================== Helpers ====================

/**
 * Compute SHA-256 hash of input params for fingerprinting
 */
function computeInputHash(params: Record<string, unknown>): string {
  const normalized = JSON.stringify(params, Object.keys(params).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate cache key for in-memory storage
 */
function cacheKey(
  entityType: EntityType,
  entityId: string,
  computationType: ComputationType,
  inputHash: string
): string {
  return `${entityType}:${entityId}:${computationType}:${inputHash}`;
}

// ==================== Public API ====================

/**
 * Store a computation result with input fingerprinting
 * @returns resultId
 */
export async function cacheResult(params: CacheResultParams): Promise<string> {
  const {
    computationType,
    entityType,
    entityId,
    firmId,
    inputParams,
    resultData,
    resultSummary,
    durationMs,
    provider,
  } = params;

  const inputHash = computeInputHash(inputParams);
  const resultId = crypto.randomUUID();
  const createdAt = new Date();

  const result: CachedResult = {
    resultId,
    computationType,
    entityType,
    entityId,
    inputParams,
    inputHash,
    resultData,
    resultSummary,
    createdAt,
    durationMs,
    provider,
  };

  const key = cacheKey(entityType, entityId, computationType, inputHash);
  cache.set(key, result);

  console.log('[result-cache] Cached result', {
    resultId,
    entityType,
    entityId,
    computationType,
    inputHash,
    firmId,
  });

  return resultId;
}

/**
 * Get cached result by exact input hash or most recent for entity+type
 * @returns CachedResult or null
 */
export async function getCachedResult(
  params: GetCachedResultParams
): Promise<CachedResult | null> {
  const { computationType, entityType, entityId, inputHash } = params;

  // If inputHash provided, look for exact match (cache hit)
  if (inputHash) {
    const key = cacheKey(entityType, entityId, computationType, inputHash);
    const result = cache.get(key);
    if (result) {
      console.log('[result-cache] Cache hit', {
        entityType,
        entityId,
        computationType,
        inputHash,
      });
      return result;
    }
    console.log('[result-cache] Cache miss', {
      entityType,
      entityId,
      computationType,
      inputHash,
    });
    return null;
  }

  // Otherwise return most recent result for that entity+type
  const results = Array.from(cache.values())
    .filter(
      r =>
        r.entityType === entityType &&
        r.entityId === entityId &&
        r.computationType === computationType
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (results.length > 0) {
    console.log('[result-cache] Most recent result', {
      entityType,
      entityId,
      computationType,
      resultId: results[0].resultId,
    });
    return results[0];
  }

  return null;
}

/**
 * Get all results for an entity, sorted by date desc
 */
export async function getResultHistory(
  params: GetResultHistoryParams
): Promise<CachedResult[]> {
  const { entityType, entityId, computationType } = params;

  const results = Array.from(cache.values())
    .filter(r => {
      if (r.entityType !== entityType || r.entityId !== entityId) return false;
      if (computationType && r.computationType !== computationType) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  console.log('[result-cache] Retrieved history', {
    entityType,
    entityId,
    computationType,
    count: results.length,
  });

  return results;
}

/**
 * Remove all cached results for an entity (when underlying data changes)
 * @returns number of invalidated results
 */
export async function invalidateResults(
  params: InvalidateResultsParams
): Promise<number> {
  const { entityType, entityId } = params;

  const keysToDelete: string[] = [];

  for (const [key, result] of cache.entries()) {
    if (result.entityType === entityType && result.entityId === entityId) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    cache.delete(key);
  }

  console.log('[result-cache] Invalidated results', {
    entityType,
    entityId,
    count: keysToDelete.length,
  });

  return keysToDelete.length;
}

// ==================== Exports ====================

export type {
  ComputationType,
  EntityType,
  CacheResultParams,
  GetCachedResultParams,
  GetResultHistoryParams,
  InvalidateResultsParams,
};
