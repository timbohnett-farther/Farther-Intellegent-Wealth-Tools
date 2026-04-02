// =============================================================================
// Rollover Engine — Citations Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  getRegulatoryCitations,
  getCitationsByRegulation,
  STANDARD_DISCLAIMERS,
} from '../narrative/citations';

describe('getRegulatoryCitations', () => {
  it('returns all regulatory citations', () => {
    const citations = getRegulatoryCitations();
    expect(citations.length).toBeGreaterThanOrEqual(5);
  });

  it('includes Reg BI citation', () => {
    const citations = getRegulatoryCitations();
    const regBI = citations.find((c) => c.regulation === 'REG_BI');
    expect(regBI).toBeDefined();
    expect(regBI!.title).toContain('Regulation Best Interest');
  });

  it('includes ERISA citation', () => {
    const citations = getRegulatoryCitations();
    const erisa = citations.find((c) => c.regulation === 'ERISA_404A');
    expect(erisa).toBeDefined();
  });

  it('includes IRC 402(c) citation', () => {
    const citations = getRegulatoryCitations();
    const irc = citations.find((c) => c.regulation === 'IRC_402C');
    expect(irc).toBeDefined();
  });
});

describe('getCitationsByRegulation', () => {
  it('filters by regulation type', () => {
    const regBI = getCitationsByRegulation('REG_BI');
    expect(regBI.length).toBeGreaterThan(0);
    expect(regBI.every((c) => c.regulation === 'REG_BI')).toBe(true);
  });
});

describe('STANDARD_DISCLAIMERS', () => {
  it('has at least 5 disclaimers', () => {
    expect(STANDARD_DISCLAIMERS.length).toBeGreaterThanOrEqual(5);
  });

  it('disclaimers are non-empty strings', () => {
    for (const d of STANDARD_DISCLAIMERS) {
      expect(d.length).toBeGreaterThan(10);
    }
  });
});
