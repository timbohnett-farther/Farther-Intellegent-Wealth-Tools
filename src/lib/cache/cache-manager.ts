// =============================================================================
// Cache Layer — In-Memory Cache Manager
// =============================================================================

// ==================== Cache TTL Configuration ====================

/**
 * Default time-to-live values (in seconds) for various resource types.
 * These values balance freshness requirements against computation cost.
 */
export const CACHE_TTL: Readonly<Record<string, number>> = {
  /** Fully calculated plan results. 1 hour. */
  plan_results: 3600,
  /** Federal/state tax tables (change annually). 7 days. */
  tax_tables: 604800,
  /** Synced account balances. 1 hour. */
  account_balances: 3600,
  /** Market/security prices. 5 minutes. */
  market_prices: 300,
  /** AI-generated insights. 30 minutes. */
  insights: 1800,
  /** Advisor dashboard aggregate data. 5 minutes. */
  advisor_dashboard: 300,
  /** Client portal page data. 10 minutes. */
  client_portal: 600,
};

// ==================== Cache Entry ====================

/**
 * Internal representation of a cached item, including its value,
 * expiration time, and creation time.
 */
interface CacheEntry<T = unknown> {
  /** The cached value. */
  value: T;
  /** Timestamp (ms since epoch) when this entry expires. */
  expiresAt: number;
  /** Timestamp (ms since epoch) when this entry was created. */
  createdAt: number;
}

// ==================== Cache Manager ====================

/**
 * A generic in-memory cache with TTL-based expiration, pattern-based
 * invalidation, and hit/miss statistics.
 *
 * Uses a `Map` as the backing store. Can optionally accept an external
 * Map in the constructor for testing or shared-state scenarios.
 *
 * @example
 * ```ts
 * const cache = new CacheManager();
 *
 * cache.set('plan:abc123:results', planResults, CACHE_TTL.plan_results);
 * const results = cache.get<PlanResultData>('plan:abc123:results');
 *
 * cache.invalidatePlanCache('abc123');
 * ```
 */
export class CacheManager {
  private store: Map<string, CacheEntry>;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Creates a new CacheManager instance.
   *
   * @param store - Optional external Map to use as the backing store.
   *                Defaults to a new empty Map.
   */
  constructor(store?: Map<string, CacheEntry>) {
    this.store = store ?? new Map<string, CacheEntry>();
  }

  /**
   * Retrieves a value from the cache by key.
   *
   * Returns `null` if the key is not found or has expired.
   * Expired entries are automatically cleaned up on access.
   *
   * @param key - The cache key to look up.
   * @returns The cached value, or `null` if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Stores a value in the cache with an optional TTL.
   *
   * If no TTL is provided, the entry defaults to 5 minutes.
   * Setting a TTL of 0 or negative will cause the entry to be
   * immediately expired on next access.
   *
   * @param key - The cache key.
   * @param value - The value to cache.
   * @param ttlSeconds - Time-to-live in seconds. Defaults to 300 (5 minutes).
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    };
    this.store.set(key, entry as CacheEntry);
  }

  /**
   * Removes a specific key from the cache.
   *
   * @param key - The cache key to remove.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidates all cache entries whose keys match a glob-like pattern.
   *
   * Supports `*` as a wildcard matching any sequence of characters.
   * For example, `plan:*:results` would match `plan:abc123:results`
   * and `plan:def456:results`.
   *
   * @param pattern - A glob pattern with `*` wildcards.
   * @returns The number of entries that were invalidated.
   */
  invalidatePattern(pattern: string): number {
    const regex = globToRegex(pattern);
    let invalidated = 0;

    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidates all cache entries associated with a specific financial plan.
   *
   * Removes any key containing the plan ID as a segment. This covers
   * plan results, insights, reports, and any other cached data that
   * includes the plan ID in the key.
   *
   * @param planId - The plan identifier.
   * @returns An array of cache keys that were invalidated.
   */
  invalidatePlanCache(planId: string): string[] {
    const invalidatedKeys: string[] = [];

    for (const key of Array.from(this.store.keys())) {
      if (key.includes(planId)) {
        this.store.delete(key);
        invalidatedKeys.push(key);
      }
    }

    return invalidatedKeys;
  }

  /**
   * Returns cache performance statistics.
   *
   * @returns An object with hit count, miss count, current size,
   *          and hit rate (0-1). Returns 0 hit rate if no accesses.
   */
  getStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const totalAccesses = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: totalAccesses > 0 ? this.hits / totalAccesses : 0,
    };
  }

  /**
   * Removes all expired entries from the cache.
   * This can be called periodically to free memory.
   *
   * @returns The number of expired entries removed.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clears all entries from the cache and resets statistics.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// ==================== Cache Key Builder ====================

/**
 * Builds a standardized cache key from a resource type and
 * additional arguments, joined by colons.
 *
 * @param resource - The resource type (e.g., 'plan', 'tax_tables').
 * @param args - Additional key segments (e.g., plan ID, year).
 * @returns A colon-separated cache key string.
 *
 * @example
 * ```ts
 * buildCacheKey('plan', 'abc123', 'results')
 * // => 'plan:abc123:results'
 *
 * buildCacheKey('tax_tables', '2025', 'federal')
 * // => 'tax_tables:2025:federal'
 * ```
 */
export function buildCacheKey(resource: string, ...args: string[]): string {
  const segments = [resource, ...args].filter((s) => s.length > 0);
  return segments.join(':');
}

// ==================== Utility ====================

/**
 * Converts a simple glob pattern to a regular expression.
 * Only supports `*` as a wildcard matching any characters.
 *
 * @param pattern - The glob pattern.
 * @returns A RegExp that matches the glob pattern.
 */
function globToRegex(pattern: string): RegExp {
  // Escape regex special characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with regex wildcard
  const regexStr = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexStr}$`);
}
