/**
 * Farther Unified Platform — Multi-Tier Data Resolver
 *
 * Implements a three-tier caching strategy:
 *   Tier 1: In-memory cache (LRU, TTL-based) — hot data
 *   Tier 2: Redis cache (simulated in Stage 1) — warm data
 *   Tier 3: Cloud SQL / BigQuery — cold data / source of truth
 *
 * The resolver transparently serves data from the fastest available tier.
 *
 * Features:
 *   - LRU eviction when the cache exceeds maxSize
 *   - TTL-based expiration (entries removed after ttlMs)
 *   - Stale-while-revalidate (serve stale data while fetching fresh)
 *   - Cache warming for bulk preloading
 *   - Hit / miss / stale statistics
 *   - Pattern-based invalidation (e.g., 'household:hh_*')
 *
 * This module is self-contained and does not depend on React, Next.js,
 * Prisma, or any external caching library.
 *
 * Monetary values are in cents. Rates are in basis points (1 bp = 0.01%).
 */

import type {
  Household,
  HouseholdId,
  Household360View,
  HouseholdSearchParams,
  HouseholdSearchResult,
} from '../household/types';

// ============================================================================
// Cache Tier Enum
// ============================================================================

/** Identifies which tier served a particular cache lookup. */
export enum CacheTier {
  /** In-memory LRU cache — sub-millisecond access. */
  MEMORY = 'MEMORY',
  /** Redis (simulated in Stage 1) — single-digit millisecond access. */
  REDIS = 'REDIS',
  /** Cloud SQL or BigQuery — source of truth, tens to hundreds of ms. */
  ORIGIN = 'ORIGIN',
}

// ============================================================================
// Cache Entry
// ============================================================================

/**
 * A single entry in the in-memory LRU cache.
 *
 * The doubly-linked-list pointers (`prev`, `next`) are managed
 * internally by the LRU data structure and are not part of the
 * public API.
 */
export interface CacheEntry<T = unknown> {
  /** Cache key. */
  key: string;
  /** Cached value. */
  value: T;
  /** Epoch-ms when this entry was written. */
  createdAt: number;
  /** Epoch-ms when this entry expires (hard TTL). */
  expiresAt: number;
  /**
   * Epoch-ms when this entry becomes "stale" but still servable
   * while a background revalidation fetches fresh data.
   */
  staleAt: number;
  /** Which tier produced this entry. */
  tier: CacheTier;
}

// ============================================================================
// Cache Configuration
// ============================================================================

/** Configuration for the in-memory LRU cache layer. */
export interface CacheConfig {
  /** Maximum number of entries the cache may hold. Default: 1000. */
  maxSize: number;
  /** Time-to-live in milliseconds before hard expiration. Default: 5 minutes. */
  ttlMs: number;
  /**
   * Time-to-stale in milliseconds. After this period the entry is still
   * served but a background revalidation is triggered. Should be <= ttlMs.
   * Default: 60 000 (1 minute).
   */
  staleTtlMs: number;
}

/** Default cache configuration values. */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1_000,
  ttlMs: 5 * 60 * 1_000,      // 5 minutes
  staleTtlMs: 60 * 1_000,     // 1 minute
};

// ============================================================================
// Cache Statistics
// ============================================================================

/** Observability counters for the cache. */
export interface CacheStats {
  /** Total number of cache hits (including stale hits). */
  hits: number;
  /** Total number of cache misses (entry absent or expired). */
  misses: number;
  /** Total number of stale hits that triggered background revalidation. */
  staleHits: number;
  /** Current number of entries in the cache. */
  size: number;
  /** Hit rate as a ratio 0.0 - 1.0. Returns 0 if no lookups have occurred. */
  hitRate: number;
  /** Total number of LRU evictions. */
  evictions: number;
}

// ============================================================================
// LRU Doubly-Linked-List Node
// ============================================================================

/**
 * Internal node for the doubly-linked list that powers LRU ordering.
 * The head of the list is the most-recently-used entry; the tail is
 * the least-recently-used and will be evicted first.
 */
interface LRUNode<T = unknown> {
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

// ============================================================================
// Logger
// ============================================================================

/** Simple logger matching the BigQuery client convention. */
function logResolver(method: string, detail: string): void {
  console.log(`[DataResolver:${method}] ${detail}`);
}

// ============================================================================
// DataResolver Class
// ============================================================================

/**
 * Multi-tier data resolver with a fully functional LRU + TTL in-memory cache.
 *
 * Usage:
 * ```ts
 * const resolver = new DataResolver();
 * const household = await resolver.resolve(
 *   `household:${id}`,
 *   () => fetchFromDatabase(id),
 *   { ttl: 120_000 },
 * );
 * ```
 */
export class DataResolver {
  // ---- Configuration ----
  private readonly config: CacheConfig;

  // ---- LRU data structures ----
  /** Fast O(1) key -> node lookup. */
  private readonly map: Map<string, LRUNode>;
  /** Sentinel head node (most recently used). */
  private head: LRUNode | null;
  /** Sentinel tail node (least recently used). */
  private tail: LRUNode | null;

  // ---- Statistics ----
  private _hits: number;
  private _misses: number;
  private _staleHits: number;
  private _evictions: number;

  // ---- In-flight revalidation deduplication ----
  /**
   * Tracks in-flight background revalidation promises so that
   * concurrent stale-while-revalidate calls for the same key
   * do not spawn duplicate fetches.
   */
  private readonly inflightRevalidations: Map<string, Promise<unknown>>;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.map = new Map();
    this.head = null;
    this.tail = null;
    this._hits = 0;
    this._misses = 0;
    this._staleHits = 0;
    this._evictions = 0;
    this.inflightRevalidations = new Map();

    logResolver('constructor', `Initialized with maxSize=${this.config.maxSize}, ttl=${this.config.ttlMs}ms, staleTtl=${this.config.staleTtlMs}ms`);
  }

  // ==========================================================================
  // Core resolve() — Generic multi-tier resolver
  // ==========================================================================

  /**
   * Resolve a value by key, using the cache when possible and falling
   * back to the provided `fetcher` function on cache miss.
   *
   * @param key     Unique cache key (e.g. `household:hh_abc123`).
   * @param fetcher Async function that produces the value from the origin.
   * @param opts    Optional overrides: `ttl` (ms), `staleTtl` (ms).
   * @returns       The resolved value, from cache or origin.
   */
  async resolve<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts?: { ttl?: number; staleTtl?: number },
  ): Promise<T> {
    const now = Date.now();
    const node = this.map.get(key) as LRUNode<T> | undefined;

    // ---- Tier 1: Memory cache hit ----
    if (node) {
      const entry = node.entry as CacheEntry<T>;

      // Hard-expired — treat as miss.
      if (now >= entry.expiresAt) {
        this.removeNode(node);
        this.map.delete(key);
        // fall through to miss
      } else if (now >= entry.staleAt) {
        // Stale but still within hard TTL — serve stale, revalidate in background.
        this._hits++;
        this._staleHits++;
        this.moveToHead(node);

        logResolver('resolve', `STALE HIT key=${key} tier=${CacheTier.MEMORY}`);

        // Background revalidation (fire-and-forget, deduplicated).
        if (!this.inflightRevalidations.has(key)) {
          const revalidation = fetcher()
            .then((freshValue) => {
              this.put(key, freshValue, opts);
              logResolver('resolve', `REVALIDATED key=${key}`);
            })
            .catch((err) => {
              logResolver('resolve', `REVALIDATION FAILED key=${key}: ${String(err)}`);
            })
            .finally(() => {
              this.inflightRevalidations.delete(key);
            });
          this.inflightRevalidations.set(key, revalidation);
        }

        return entry.value;
      } else {
        // Fresh cache hit.
        this._hits++;
        this.moveToHead(node);
        logResolver('resolve', `HIT key=${key} tier=${CacheTier.MEMORY}`);
        return entry.value;
      }
    }

    // ---- Tier 2: Redis (simulated — always misses in Stage 1) ----
    // In Stage 2 this would call redis.get(key) and deserialize.
    logResolver('resolve', `REDIS MISS key=${key} (simulated)`);

    // ---- Tier 3: Origin fetch ----
    this._misses++;
    logResolver('resolve', `MISS key=${key} — fetching from origin`);

    const value = await fetcher();
    this.put(key, value, opts);

    return value;
  }

  // ==========================================================================
  // Domain-Specific Resolvers
  // ==========================================================================

  /**
   * Resolve a Household by its ID.
   *
   * In Stage 1 the origin fetcher is a stub that logs and returns null.
   * Wire a real data source by supplying a fetcher or overriding this method.
   */
  async resolveHousehold(
    id: HouseholdId,
    fetcher?: () => Promise<Household | null>,
  ): Promise<Household | null> {
    const key = `household:${id}`;
    const origin = fetcher ?? (async () => {
      logResolver('resolveHousehold', `[STUB] Would fetch household id=${id} from Cloud SQL`);
      return null;
    });
    return this.resolve<Household | null>(key, origin);
  }

  /**
   * Resolve the 360-degree view for a household.
   *
   * The 360 view aggregates data from multiple tables and is more
   * expensive to compute, so it receives a longer TTL by default.
   */
  async resolveHousehold360(
    id: HouseholdId,
    fetcher?: () => Promise<Household360View | null>,
  ): Promise<Household360View | null> {
    const key = `household360:${id}`;
    const origin = fetcher ?? (async () => {
      logResolver('resolveHousehold360', `[STUB] Would fetch 360 view for household id=${id}`);
      return null;
    });
    return this.resolve<Household360View | null>(key, origin, {
      ttl: 10 * 60 * 1_000,     // 10 minutes for 360 views
      staleTtl: 2 * 60 * 1_000, // 2 minutes stale window
    });
  }

  /**
   * Resolve a household search. Search results are cached with a short
   * TTL since the result set changes frequently.
   */
  async resolveHouseholdSearch(
    params: HouseholdSearchParams,
    fetcher?: () => Promise<HouseholdSearchResult>,
  ): Promise<HouseholdSearchResult> {
    // Build a deterministic cache key from the search parameters.
    const key = `search:${this.hashSearchParams(params)}`;
    const origin = fetcher ?? (async () => {
      logResolver('resolveHouseholdSearch', `[STUB] Would execute search query`);
      return {
        households: [],
        total: 0,
        limit: 50,
        offset: 0,
      } as HouseholdSearchResult;
    });
    return this.resolve<HouseholdSearchResult>(key, origin, {
      ttl: 30 * 1_000,     // 30 seconds for search results
      staleTtl: 10 * 1_000, // 10 seconds stale window
    });
  }

  // ==========================================================================
  // Invalidation
  // ==========================================================================

  /**
   * Invalidate (remove) a single cache entry by exact key.
   *
   * @param key The cache key to invalidate.
   */
  invalidate(key: string): void {
    const node = this.map.get(key);
    if (node) {
      this.removeNode(node);
      this.map.delete(key);
      logResolver('invalidate', `Removed key=${key}`);
    }
  }

  /**
   * Invalidate all cache entries whose keys match a glob-like pattern.
   *
   * Supported patterns:
   * - `household:hh_*`  — matches keys starting with `household:hh_`
   * - `*:hh_abc123`     — matches keys ending with `:hh_abc123`
   * - `search:*`        — matches all search cache entries
   *
   * This is an O(n) scan of the key space. For very large caches
   * (> 10 000 keys) consider maintaining a prefix index.
   *
   * @param pattern Glob pattern with `*` wildcards.
   * @returns Number of entries invalidated.
   */
  invalidatePattern(pattern: string): number {
    const regex = this.globToRegex(pattern);
    const keysToRemove: string[] = [];

    for (const key of this.map.keys()) {
      if (regex.test(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.invalidate(key);
    }

    logResolver('invalidatePattern', `Pattern="${pattern}" matched ${keysToRemove.length} key(s)`);
    return keysToRemove.length;
  }

  // ==========================================================================
  // Cache Warming
  // ==========================================================================

  /**
   * Pre-populate the cache with data for the specified household IDs.
   *
   * This is useful at application startup or before a batch operation
   * to avoid a thundering-herd of cache misses.
   *
   * @param householdIds Array of household IDs to warm.
   * @param fetcher      Optional batch fetcher. Defaults to individual stubs.
   */
  async warmCache(
    householdIds: HouseholdId[],
    fetcher?: (ids: HouseholdId[]) => Promise<Map<HouseholdId, Household>>,
  ): Promise<void> {
    logResolver('warmCache', `Warming cache for ${householdIds.length} household(s)`);

    if (fetcher) {
      const results = await fetcher(householdIds);
      for (const [id, household] of results.entries()) {
        this.put(`household:${id}`, household);
      }
      logResolver('warmCache', `Loaded ${results.size} household(s) into cache`);
    } else {
      // Stage 1 stub: just log, no real data to load.
      for (const id of householdIds) {
        logResolver('warmCache', `[STUB] Would warm household id=${id}`);
      }
    }
  }

  // ==========================================================================
  // Cache Statistics
  // ==========================================================================

  /**
   * Returns current cache statistics.
   *
   * The hit rate is calculated as `hits / (hits + misses)`.
   * A hit rate above 0.90 indicates a healthy cache; below 0.70
   * suggests the TTL or maxSize may need tuning.
   */
  getCacheStats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      staleHits: this._staleHits,
      size: this.map.size,
      hitRate: total > 0 ? this._hits / total : 0,
      evictions: this._evictions,
    };
  }

  /**
   * Clear the entire cache, resetting all entries and statistics.
   */
  clearCache(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this._hits = 0;
    this._misses = 0;
    this._staleHits = 0;
    this._evictions = 0;
    this.inflightRevalidations.clear();
    logResolver('clearCache', 'Cache cleared');
  }

  // ==========================================================================
  // Internal — LRU Operations
  // ==========================================================================

  /**
   * Insert or update a cache entry and maintain LRU ordering.
   * If the cache exceeds `maxSize`, the least-recently-used entry is evicted.
   */
  private put<T>(key: string, value: T, opts?: { ttl?: number; staleTtl?: number }): void {
    const now = Date.now();
    const ttl = opts?.ttl ?? this.config.ttlMs;
    const staleTtl = opts?.staleTtl ?? this.config.staleTtlMs;

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      staleAt: now + staleTtl,
      tier: CacheTier.MEMORY,
    };

    const existing = this.map.get(key);
    if (existing) {
      // Update in place and promote to head.
      existing.entry = entry as CacheEntry;
      this.moveToHead(existing);
    } else {
      // Insert new node at head.
      const node: LRUNode = { entry: entry as CacheEntry, prev: null, next: null };
      this.addToHead(node);
      this.map.set(key, node);

      // Evict if over capacity.
      if (this.map.size > this.config.maxSize) {
        this.evictLRU();
      }
    }
  }

  /**
   * Add a node to the head of the doubly-linked list (most recently used).
   */
  private addToHead(node: LRUNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from wherever it sits in the doubly-linked list.
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // node is head
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // node is tail
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * Move an existing node to the head (most recently used position).
   */
  private moveToHead(node: LRUNode): void {
    if (this.head === node) {
      return; // Already at head.
    }
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Evict the least-recently-used entry (the tail of the list).
   */
  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const evicted = this.tail;
    this.removeNode(evicted);
    this.map.delete(evicted.entry.key);
    this._evictions++;

    logResolver('evictLRU', `Evicted key=${evicted.entry.key} (size=${this.map.size})`);
  }

  // ==========================================================================
  // Internal — Utilities
  // ==========================================================================

  /**
   * Convert a glob pattern (with `*` wildcards) to a RegExp.
   *
   * @example
   *   globToRegex('household:hh_*')  => /^household:hh_.*$/
   *   globToRegex('*:hh_abc')        => /^.*:hh_abc$/
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexStr}$`);
  }

  /**
   * Produce a deterministic hash string for search parameters
   * so that identical searches share the same cache key.
   */
  private hashSearchParams(params: HouseholdSearchParams): string {
    // Use a simple JSON-based fingerprint. In production this would
    // use a proper hash function (e.g., xxhash) for performance.
    const sorted = JSON.stringify(params, Object.keys(params as unknown as Record<string, unknown>).sort());
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0; // 32-bit integer hash
    }
    return hash.toString(36);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default singleton DataResolver instance.
 *
 * Applications should import this singleton rather than creating
 * multiple instances, to share the cache across modules.
 */
let _instance: DataResolver | null = null;

/**
 * Returns the singleton DataResolver. Creates it on first call.
 *
 * @param config Optional configuration override (only applied on first call).
 */
export function getDataResolver(config?: Partial<CacheConfig>): DataResolver {
  if (!_instance) {
    _instance = new DataResolver(config);
  }
  return _instance;
}

/**
 * Reset the singleton instance. Primarily used in tests.
 */
export function resetDataResolver(): void {
  if (_instance) {
    _instance.clearCache();
    _instance = null;
    logResolver('resetDataResolver', 'Singleton instance reset');
  }
}
