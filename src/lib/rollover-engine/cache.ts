// =============================================================================
// Rollover Engine — TTL Cache Layer
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expires_at: number;
}

class TTLCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTLMs: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    this.defaultTTLMs = defaultTTLMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires_at) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, {
      value,
      expires_at: Date.now() + (ttlMs ?? this.defaultTTLMs),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.evictExpired();
    return this.cache.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires_at) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton caches for different data types
export const planSearchCache = new TTLCache(10 * 60 * 1000); // 10 min
export const benchmarkCache = new TTLCache(60 * 60 * 1000);  // 1 hour
export const scoreCache = new TTLCache(5 * 60 * 1000);       // 5 min
