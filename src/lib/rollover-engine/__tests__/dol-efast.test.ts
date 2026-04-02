// =============================================================================
// Rollover Engine — DOL EFAST Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { searchEFAST, getPlanFiling, extractPlanData } from '../scraper/dol-efast';

describe('searchEFAST', () => {
  it('returns filings for known EIN', async () => {
    const filings = await searchEFAST('12-3456789');
    expect(filings.length).toBeGreaterThan(0);
    expect(filings[0].ein).toBe('12-3456789');
    expect(filings[0].plan_name).toBe('Acme Corp 401(k) Plan');
  });

  it('returns empty for unknown EIN', async () => {
    const filings = await searchEFAST('00-0000000');
    expect(filings).toHaveLength(0);
  });
});

describe('getPlanFiling', () => {
  it('returns filing for known EIN', async () => {
    const filing = await getPlanFiling('12-3456789');
    expect(filing).not.toBeNull();
    expect(filing!.total_assets).toBeGreaterThan(0);
  });

  it('returns null for unknown EIN', async () => {
    const filing = await getPlanFiling('00-0000000');
    expect(filing).toBeNull();
  });
});

describe('extractPlanData', () => {
  it('extracts data for known EIN', async () => {
    const result = await extractPlanData('12-3456789');
    expect(result.success).toBe(true);
    expect(result.source).toBe('DOL_EFAST');
    expect(result.data_points).toBeGreaterThan(0);
    expect(result.data).toHaveProperty('filing');
  });

  it('fails for unknown EIN', async () => {
    const result = await extractPlanData('00-0000000');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
