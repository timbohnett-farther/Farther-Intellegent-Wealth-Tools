/**
 * Farther Unified Platform — Data Resolver Tests
 *
 * Tests for the multi-tier data resolver / cache covering:
 * - Cache hits and misses
 * - TTL expiration
 * - LRU eviction
 * - Stale-while-revalidate
 * - Cache invalidation
 * - Pattern invalidation
 * - Cache stats
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataResolver,
  CacheTier,
} from '../data-resolver';

// =============================================================================
// Setup
// =============================================================================

let resolver: DataResolver;

beforeEach(() => {
  resolver = new DataResolver({
    maxSize: 5,
    ttlMs: 1000,
    staleTtlMs: 500,
  });
});

// =============================================================================
// Cache Hits and Misses
// =============================================================================

describe('Cache hits and misses', () => {
  it('fetches from origin on cache miss', async () => {
    const fetcher = vi.fn().mockResolvedValue({ name: 'The Johnsons' });
    const result = await resolver.resolve('nonexistent-key', fetcher);
    expect(result).toEqual({ name: 'The Johnsons' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns cached value for cache hit', async () => {
    const fetcher = vi.fn().mockResolvedValue({ name: 'The Johnsons' });
    await resolver.resolve('household:hh-001', fetcher);
    const result = await resolver.resolve('household:hh-001', fetcher);
    expect(result).toEqual({ name: 'The Johnsons' });
    // The fetcher should only have been called once (first was a miss, second was a hit)
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('tracks hit and miss counts', async () => {
    const fetcher1 = vi.fn().mockResolvedValue('value-1');
    const fetcher2 = vi.fn().mockResolvedValue('value-2');

    await resolver.resolve('key-1', fetcher1); // miss
    await resolver.resolve('key-1', fetcher1); // hit
    await resolver.resolve('key-1', fetcher1); // hit
    await resolver.resolve('key-2', fetcher2); // miss

    const stats = resolver.getCacheStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
  });

  it('computes hit rate correctly', async () => {
    const fetcher1 = vi.fn().mockResolvedValue('value-1');
    const fetcher2 = vi.fn().mockResolvedValue('value-2');
    const fetcher3 = vi.fn().mockResolvedValue('value-3');

    await resolver.resolve('key-1', fetcher1); // miss
    await resolver.resolve('key-1', fetcher1); // hit
    await resolver.resolve('key-1', fetcher1); // hit
    await resolver.resolve('key-2', fetcher2); // miss

    const stats = resolver.getCacheStats();
    expect(stats.hitRate).toBeCloseTo(0.5, 2);
  });

  it('stores and retrieves complex objects', async () => {
    const household = {
      id: 'hh-001',
      name: 'Test',
      members: [{ firstName: 'John', lastName: 'Doe' }],
      accounts: [{ balance: 100000 }],
    };

    const fetcher = vi.fn().mockResolvedValue(household);
    await resolver.resolve('household:hh-001', fetcher);
    const result = await resolver.resolve('household:hh-001', fetcher);
    expect(result).toEqual(household);
  });
});

// =============================================================================
// TTL Expiration
// =============================================================================

describe('TTL expiration', () => {
  it('returns value before TTL expires', async () => {
    const fetcher = vi.fn().mockResolvedValue('value');
    await resolver.resolve('ttl-key', fetcher, { ttl: 5000 });
    const result = await resolver.resolve('ttl-key', fetcher);
    expect(result).toBe('value');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fetches from origin after TTL expires', async () => {
    resolver = new DataResolver({
      maxSize: 10,
      ttlMs: 50, // Very short TTL
      staleTtlMs: 0,
    });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return `value-${callCount}`;
    });

    await resolver.resolve('ttl-key', fetcher);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 80));

    const result = await resolver.resolve('ttl-key', fetcher);
    // The fetcher should have been called again after expiration
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses custom TTL when provided', async () => {
    const fetcher = vi.fn().mockResolvedValue('value');
    // staleTtl must be >= ttl so the entry is fresh for the full TTL period
    await resolver.resolve('custom-ttl', fetcher, { ttl: 50, staleTtl: 50 });

    // Should still be valid from cache
    const result1 = await resolver.resolve('custom-ttl', fetcher);
    expect(result1).toBe('value');
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Should refetch
    await resolver.resolve('custom-ttl', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refreshes TTL on re-resolve', async () => {
    resolver = new DataResolver({
      maxSize: 10,
      ttlMs: 200,
      staleTtlMs: 200, // staleTtl matches ttl so entries stay fresh until TTL expires
    });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return `value-${callCount}`;
    });

    await resolver.resolve('refresh-key', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Invalidate and re-resolve to refresh the entry
    resolver.invalidate('refresh-key');
    await resolver.resolve('refresh-key', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should still be valid because TTL was refreshed on second resolve
    const result = await resolver.resolve('refresh-key', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// LRU Eviction
// =============================================================================

describe('LRU eviction', () => {
  it('evicts least recently used entry when cache is full', async () => {
    // Max size is 5
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('key-1', makeFetcher('val-1'));
    await resolver.resolve('key-2', makeFetcher('val-2'));
    await resolver.resolve('key-3', makeFetcher('val-3'));
    await resolver.resolve('key-4', makeFetcher('val-4'));
    await resolver.resolve('key-5', makeFetcher('val-5'));

    // Cache is now full. Adding another should evict key-1.
    await resolver.resolve('key-6', makeFetcher('val-6'));

    // key-1 was evicted, so fetching it should cause a new fetch
    const f1 = makeFetcher('val-1-new');
    await resolver.resolve('key-1', f1);
    expect(f1).toHaveBeenCalledTimes(1); // Had to re-fetch

    // key-6 is in cache
    const f6 = makeFetcher('val-6-new');
    const result6 = await resolver.resolve('key-6', f6);
    expect(result6).toBe('val-6'); // Got cached value
    expect(f6).not.toHaveBeenCalled();
  });

  it('accessing an entry makes it recently used', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('key-1', makeFetcher('val-1'));
    await resolver.resolve('key-2', makeFetcher('val-2'));
    await resolver.resolve('key-3', makeFetcher('val-3'));
    await resolver.resolve('key-4', makeFetcher('val-4'));
    await resolver.resolve('key-5', makeFetcher('val-5'));

    // Access key-1 to make it recently used
    await resolver.resolve('key-1', makeFetcher('val-1'));

    // Add a new entry — should evict key-2 (now least recently used)
    await resolver.resolve('key-6', makeFetcher('val-6'));

    // key-1 should still be in cache
    const f1 = makeFetcher('val-1-new');
    const result1 = await resolver.resolve('key-1', f1);
    expect(result1).toBe('val-1');
    expect(f1).not.toHaveBeenCalled();

    // key-2 was evicted, so fetcher should be called
    const f2 = makeFetcher('val-2-new');
    await resolver.resolve('key-2', f2);
    expect(f2).toHaveBeenCalledTimes(1);
  });

  it('reports current cache size', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('key-1', makeFetcher('val-1'));
    await resolver.resolve('key-2', makeFetcher('val-2'));
    await resolver.resolve('key-3', makeFetcher('val-3'));

    const stats = resolver.getCacheStats();
    expect(stats.size).toBe(3);
  });

  it('does not exceed max size', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    for (let i = 0; i < 20; i++) {
      await resolver.resolve(`key-${i}`, makeFetcher(`val-${i}`));
    }

    const stats = resolver.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Stale-While-Revalidate
// =============================================================================

describe('Stale-while-revalidate', () => {
  it('returns stale value during revalidation window', async () => {
    resolver = new DataResolver({
      maxSize: 10,
      ttlMs: 200,
      staleTtlMs: 50,
    });

    const fetcher = vi.fn().mockResolvedValue('original-value');
    await resolver.resolve('swr-key', fetcher);

    // Wait past stale time but within TTL
    await new Promise((resolve) => setTimeout(resolve, 80));

    const result = await resolver.resolve('swr-key', fetcher);
    // Should return the stale cached value
    expect(result).toBe('original-value');
  });

  it('tracks stale hits in stats', async () => {
    resolver = new DataResolver({
      maxSize: 10,
      ttlMs: 200,
      staleTtlMs: 50,
    });

    const fetcher = vi.fn().mockResolvedValue('value');
    await resolver.resolve('swr-key', fetcher);

    await new Promise((resolve) => setTimeout(resolve, 80));

    await resolver.resolve('swr-key', fetcher);

    const stats = resolver.getCacheStats();
    expect(stats.staleHits).toBeGreaterThanOrEqual(1);
  });

  it('fetches from origin after hard TTL expires', async () => {
    resolver = new DataResolver({
      maxSize: 10,
      ttlMs: 30,
      staleTtlMs: 10,
    });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      callCount++;
      return `value-${callCount}`;
    });

    await resolver.resolve('swr-key', fetcher);

    // Wait past both stale and hard TTL
    await new Promise((resolve) => setTimeout(resolve, 100));

    await resolver.resolve('swr-key', fetcher);
    // Should have fetched again
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Cache Invalidation
// =============================================================================

describe('Cache invalidation', () => {
  it('invalidates a specific key', async () => {
    const fetcher1 = vi.fn().mockResolvedValue('val-1');
    const fetcher2 = vi.fn().mockResolvedValue('val-2');

    await resolver.resolve('key-1', fetcher1);
    await resolver.resolve('key-2', fetcher2);

    resolver.invalidate('key-1');

    // key-1 was invalidated, so resolving should re-fetch
    const f1 = vi.fn().mockResolvedValue('val-1-new');
    await resolver.resolve('key-1', f1);
    expect(f1).toHaveBeenCalledTimes(1);

    // key-2 is still cached
    const f2 = vi.fn().mockResolvedValue('val-2-new');
    const result2 = await resolver.resolve('key-2', f2);
    expect(result2).toBe('val-2');
    expect(f2).not.toHaveBeenCalled();
  });

  it('invalidates all keys via clearCache', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('key-1', makeFetcher('val-1'));
    await resolver.resolve('key-2', makeFetcher('val-2'));
    await resolver.resolve('key-3', makeFetcher('val-3'));

    resolver.clearCache();

    const stats = resolver.getCacheStats();
    expect(stats.size).toBe(0);

    // All keys re-fetch
    const f1 = vi.fn().mockResolvedValue('new-1');
    await resolver.resolve('key-1', f1);
    expect(f1).toHaveBeenCalledTimes(1);
  });

  it('reduces cache size when invalidating existing key', async () => {
    const fetcher = vi.fn().mockResolvedValue('val-1');
    await resolver.resolve('key-1', fetcher);

    const before = resolver.getCacheStats().size;
    resolver.invalidate('key-1');
    const after = resolver.getCacheStats().size;
    expect(after).toBe(before - 1);
  });

  it('is a no-op when invalidating non-existent key', () => {
    const before = resolver.getCacheStats().size;
    resolver.invalidate('nonexistent');
    const after = resolver.getCacheStats().size;
    expect(after).toBe(before);
  });
});

// =============================================================================
// Pattern Invalidation
// =============================================================================

describe('Pattern invalidation', () => {
  it('invalidates keys matching a prefix pattern', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('household:hh-001', makeFetcher('data-1'));
    await resolver.resolve('household:hh-002', makeFetcher('data-2'));
    await resolver.resolve('account:acc-001', makeFetcher('data-3'));

    resolver.invalidatePattern('household:*');

    // household keys were invalidated
    const fh1 = vi.fn().mockResolvedValue('new-data-1');
    await resolver.resolve('household:hh-001', fh1);
    expect(fh1).toHaveBeenCalledTimes(1);

    const fh2 = vi.fn().mockResolvedValue('new-data-2');
    await resolver.resolve('household:hh-002', fh2);
    expect(fh2).toHaveBeenCalledTimes(1);

    // account key is still cached
    const fa = vi.fn().mockResolvedValue('new-data-3');
    const result = await resolver.resolve('account:acc-001', fa);
    expect(result).toBe('data-3');
    expect(fa).not.toHaveBeenCalled();
  });

  it('invalidates keys matching a glob-like pattern', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('household:hh-001:members', makeFetcher('data-1'));
    await resolver.resolve('household:hh-001:accounts', makeFetcher('data-2'));
    await resolver.resolve('household:hh-002:members', makeFetcher('data-3'));

    resolver.invalidatePattern('household:hh-001:*');

    // hh-001 keys invalidated
    const f1 = vi.fn().mockResolvedValue('new-1');
    await resolver.resolve('household:hh-001:members', f1);
    expect(f1).toHaveBeenCalledTimes(1);

    const f2 = vi.fn().mockResolvedValue('new-2');
    await resolver.resolve('household:hh-001:accounts', f2);
    expect(f2).toHaveBeenCalledTimes(1);

    // hh-002 key is still cached
    const f3 = vi.fn().mockResolvedValue('new-3');
    const result3 = await resolver.resolve('household:hh-002:members', f3);
    expect(result3).toBe('data-3');
    expect(f3).not.toHaveBeenCalled();
  });

  it('returns count of invalidated keys', async () => {
    const makeFetcher = (val: string) => vi.fn().mockResolvedValue(val);

    await resolver.resolve('prefix:a', makeFetcher('val'));
    await resolver.resolve('prefix:b', makeFetcher('val'));
    await resolver.resolve('other:c', makeFetcher('val'));

    const count = resolver.invalidatePattern('prefix:*');
    expect(count).toBe(2);
  });
});

// =============================================================================
// Cache Stats
// =============================================================================

describe('Cache stats', () => {
  it('returns complete stats object', () => {
    const stats = resolver.getCacheStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('evictions');
    expect(stats).toHaveProperty('staleHits');
  });

  it('starts with zero hits and misses', () => {
    const stats = resolver.getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('resets stats when cache is cleared', async () => {
    const fetcher = vi.fn().mockResolvedValue('val-1');
    await resolver.resolve('key-1', fetcher);
    await resolver.resolve('key-1', fetcher); // hit
    await resolver.resolve('key-2', vi.fn().mockResolvedValue('miss')); // miss

    resolver.clearCache();

    const stats = resolver.getCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.evictions).toBe(0);
  });
});

// =============================================================================
// Constructor / Factory
// =============================================================================

describe('DataResolver constructor', () => {
  it('creates a resolver with custom settings', () => {
    const custom = new DataResolver({
      maxSize: 100,
      ttlMs: 60000,
      staleTtlMs: 10000,
    });

    const stats = custom.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
  });

  it('creates independent resolver instances', async () => {
    const r1 = new DataResolver({ maxSize: 10, ttlMs: 1000, staleTtlMs: 0 });
    const r2 = new DataResolver({ maxSize: 10, ttlMs: 1000, staleTtlMs: 0 });

    await r1.resolve('key', async () => 'value-1');
    await r2.resolve('key', async () => 'value-2');

    const result1 = await r1.resolve('key', async () => 'should-not-fetch');
    const result2 = await r2.resolve('key', async () => 'should-not-fetch');

    expect(result1).toBe('value-1');
    expect(result2).toBe('value-2');
  });
});
