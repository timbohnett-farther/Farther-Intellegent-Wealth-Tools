/**
 * Tests for copilot/admin.ts — config CRUD.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCopilotConfig,
  updateCopilotConfig,
  resetCopilotConfig,
  isFamilyEnabled,
  isAudienceEnabled,
} from '../admin';

beforeEach(() => {
  resetCopilotConfig('test-firm');
});

describe('getCopilotConfig()', () => {
  it('returns default config for unconfigured firm', () => {
    const config = getCopilotConfig('new-firm');
    expect(config.enabled_families).toHaveLength(7);
    expect(config.enabled_audiences).toHaveLength(5);
    expect(config.retention_days).toBe(365);
    expect(config.require_review_before_use).toBe(false);
  });

  it('returns a copy (not a mutable reference)', () => {
    const config1 = getCopilotConfig('test-firm');
    config1.retention_days = 1;
    const config2 = getCopilotConfig('test-firm');
    expect(config2.retention_days).toBe(365);
  });
});

describe('updateCopilotConfig()', () => {
  it('updates retention days', () => {
    const updated = updateCopilotConfig('test-firm', { retention_days: 90 });
    expect(updated.retention_days).toBe(90);
    // Other fields unchanged
    expect(updated.enabled_families).toHaveLength(7);
  });

  it('updates require_review_before_use', () => {
    const updated = updateCopilotConfig('test-firm', { require_review_before_use: true });
    expect(updated.require_review_before_use).toBe(true);
  });

  it('updates enabled families', () => {
    const updated = updateCopilotConfig('test-firm', {
      enabled_families: ['explain_line_item', 'explain_opportunity'],
    });
    expect(updated.enabled_families).toHaveLength(2);
  });

  it('persists updates across calls', () => {
    updateCopilotConfig('test-firm', { retention_days: 30 });
    const config = getCopilotConfig('test-firm');
    expect(config.retention_days).toBe(30);
  });
});

describe('resetCopilotConfig()', () => {
  it('resets to defaults', () => {
    updateCopilotConfig('test-firm', { retention_days: 7 });
    resetCopilotConfig('test-firm');
    const config = getCopilotConfig('test-firm');
    expect(config.retention_days).toBe(365);
  });
});

describe('isFamilyEnabled()', () => {
  it('returns true for enabled families', () => {
    expect(isFamilyEnabled('test-firm', 'explain_line_item')).toBe(true);
  });

  it('returns false for disabled families', () => {
    updateCopilotConfig('test-firm', { enabled_families: ['explain_line_item'] });
    expect(isFamilyEnabled('test-firm', 'draft_client_email')).toBe(false);
  });
});

describe('isAudienceEnabled()', () => {
  it('returns true for enabled audiences', () => {
    expect(isAudienceEnabled('test-firm', 'advisor_internal')).toBe(true);
  });

  it('returns false for disabled audiences', () => {
    updateCopilotConfig('test-firm', { enabled_audiences: ['advisor_internal'] });
    expect(isAudienceEnabled('test-firm', 'cpa_technical')).toBe(false);
  });
});
