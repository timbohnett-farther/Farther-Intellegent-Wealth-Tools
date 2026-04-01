/**
 * Tests for copilot/retrieval.ts — source package assembly and hash computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildSourcePackage, computeUpstreamHash } from '../retrieval';
import { store } from '../../store';
import type { TaxYear, MoneyCents, TaxLineRef } from '../../types';

// Reset store before each test
beforeEach(() => {
  // Re-seed store for clean state
  (store as any).households = new Map();
  (store as any).persons = new Map();
  (store as any).documents = new Map();
  (store as any).extractedFields = new Map();
  (store as any).taxReturns = new Map();
  (store as any).scenarios = new Map();
  (store as any).calcRuns = new Map();
  (store as any).calcLines = new Map();
  store.seed();
});

describe('buildSourcePackage()', () => {
  it('returns null for non-existent household', () => {
    const result = buildSourcePackage('non-existent', 2025 as TaxYear);
    expect(result).toBeNull();
  });

  it('assembles household data for an existing household', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result).not.toBeNull();
    expect(result!.household.household_id).toBe('hh-001');
    expect(result!.household.display_name).toBe('Smith Family');
    expect(result!.household.primary_state).toBe('AZ');
    expect(result!.household.tax_year).toBe(2025);
  });

  it('includes persons in the source package', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.household.persons).toHaveLength(2);
    expect(result!.household.persons[0].first_name).toBe('John');
    expect(result!.household.persons[1].first_name).toBe('Jane');
  });

  it('includes extracted fields from documents', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.extracted_fields.length).toBeGreaterThan(0);
    // Smith family has 6 extracted fields
    expect(result!.extracted_fields).toHaveLength(6);
  });

  it('includes filing status from tax return', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.household.filing_status).toBe('MFJ');
  });

  it('includes scenarios', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.scenarios.length).toBeGreaterThan(0);
    expect(result!.scenarios[0].name).toBe('Baseline (Actuals)');
    expect(result!.scenarios[0].is_baseline).toBe(true);
  });

  it('handles household with no documents for the given year', () => {
    const result = buildSourcePackage('hh-001', 2026 as TaxYear);
    expect(result).not.toBeNull();
    expect(result!.extracted_fields).toHaveLength(0);
  });

  it('computes an upstream hash', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.upstream_hash).toBeTruthy();
    expect(result!.upstream_hash.length).toBe(64); // SHA-256 hex
  });

  it('opportunities array is empty by default (populated by caller)', () => {
    const result = buildSourcePackage('hh-001', 2025 as TaxYear);
    expect(result!.opportunities).toEqual([]);
  });
});

describe('computeUpstreamHash()', () => {
  it('produces consistent hashes for the same data', () => {
    const data = {
      household: {
        household_id: 'test',
        display_name: 'Test',
        tax_year: 2025 as TaxYear,
        persons: [],
      },
      extracted_fields: [],
      opportunities: [],
      scenarios: [],
    } as any;

    const hash1 = computeUpstreamHash(data);
    const hash2 = computeUpstreamHash(data);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different data', () => {
    const data1 = {
      household: { household_id: 'a', display_name: 'A', tax_year: 2025, persons: [] },
      extracted_fields: [],
      opportunities: [],
      scenarios: [],
    } as any;

    const data2 = {
      household: { household_id: 'b', display_name: 'B', tax_year: 2025, persons: [] },
      extracted_fields: [],
      opportunities: [],
      scenarios: [],
    } as any;

    const hash1 = computeUpstreamHash(data1);
    const hash2 = computeUpstreamHash(data2);
    expect(hash1).not.toBe(hash2);
  });

  it('is 64-character hex string (SHA-256)', () => {
    const hash = computeUpstreamHash({
      household: { household_id: 'x', display_name: 'X', tax_year: 2025, persons: [] },
      extracted_fields: [],
      opportunities: [],
      scenarios: [],
    } as any);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
